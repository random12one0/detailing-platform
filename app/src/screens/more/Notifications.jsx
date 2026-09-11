// Notifications — what gets sent, to whom, and when.
//
// Split into who receives what: the CUSTOMER's emails are a different
// decision from YOUR nudges, and they were interleaved before. The lead
// times were all raw minute boxes; "remind me 30 minutes before a job" now
// takes one tap, and the morning summary is picked off a clock instead of
// typed as an integer between 0 and 23.
//
// The customer reminder timing lives in Booking rules, next to the
// cancellation window it interacts with, rather than in two places.

import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { DurationChoice, Group, HourChoice, Setting, Switch } from "../../components/controls.jsx";
import { disablePush, enablePush, pushState } from "../../lib/push.js";
import { cleanMessages, MESSAGE_KINDS, MESSAGE_MAX } from "../../lib/emailMessages.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

const CUSTOMER_EMAILS = [
  ["email_customer_confirmation", "Booking confirmation",
    "Sent the moment they book, with their receipt and a link to change it."],
  ["email_customer_reminder", "Appointment reminder",
    "Timing, and whether there is a second one, are set in Booking rules."],
  ["email_customer_followup", "Thank-you and review request",
    "Goes out after you record payment."],
];
const OWNER_EMAILS = [
  ["email_owner_new_booking", "A new booking comes in"],
  ["email_owner_reminder", "A job is coming up", "The day before."],
];

const OWNER_NUDGE = [[15, "15 min"], [30, "30 min"], [60, "1 hour"], [120, "2 hours"]];
const FINALIZE = [[30, "30 min"], [60, "1 hour"], [120, "2 hours"], [240, "4 hours"]];

export default function Notifications() {
  useAppLocale();
  const { business, settings, reload } = useBusiness();
  const [form, setForm] = useState(() => {
    const f = {};
    for (const [k] of [...CUSTOMER_EMAILS, ...OWNER_EMAILS]) f[k] = settings?.[k] ?? true;
    f.push_enabled = settings?.push_enabled ?? false;
    f.owner_nudge_lead_minutes = settings?.owner_nudge_lead_minutes ?? 30;
    f.finalize_nudge_delay_minutes = settings?.finalize_nudge_delay_minutes ?? 60;
    f.daily_digest_hour = settings?.daily_digest_hour ?? 7;
    return f;
  });
  const [recipients, setRecipients] = useState(settings?.notification_emails ?? []);
  // The detailer's own paragraph per email kind. Roadmap 2.18.
  const [messages, setMessages] = useState(() => ({ ...(settings?.email_messages ?? {}) }));
  const [openKind, setOpenKind] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  // ROADMAP 4.2 — "what does my customer actually get?"
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);   // {ok, text}
  // THE SWITCH READS THE DEVICE, NOT THE DATABASE — the whole of the repair.
  // `push_enabled` is a business-wide preference (the edge functions read it
  // before they send); whether THIS phone is registered is a fact about this
  // browser, and drawing the second from the first is what made the old
  // switch a lie. Null while we ask.
  const [device, setDevice] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState("");

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setMsg(null); };

  useEffect(() => { pushState().then(setDevice); }, []);

  // ON MEANS TWO THINGS AND BOTH HAVE TO HAPPEN: the browser registers this
  // device, and the business preference is written so the edge functions
  // will actually send. The preference is saved HERE rather than waiting for
  // the Save button, because the browser permission it sits beside is
  // already committed by the time the prompt closes — a switch that has
  // taken a permission and not saved is the two halves disagreeing again.
  const togglePush = async (want) => {
    setPushBusy(true);
    setPushErr("");
    try {
      if (want) await enablePush(business.id); else await disablePush(business.id);
      await supabase.from("business_settings").update({ push_enabled: want })
        .eq("business_id", business.id);
      set("push_enabled", want);
      setDevice(await pushState());
      reload();
    } catch (e) {
      setPushErr(e.message || t("Could not change that."));
      setDevice(await pushState());
    }
    setPushBusy(false);
  };

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e || recipients.includes(e) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return;
    setRecipients([...recipients, e]);
    setNewEmail("");
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("business_settings").update({
      ...Object.fromEntries([...CUSTOMER_EMAILS, ...OWNER_EMAILS].map(([k]) => [k, !!form[k]])),
      push_enabled: !!form.push_enabled,
      owner_nudge_lead_minutes: Number(form.owner_nudge_lead_minutes) || 0,
      finalize_nudge_delay_minutes: Number(form.finalize_nudge_delay_minutes) || 0,
      daily_digest_hour: Math.min(23, Math.max(0, Number(form.daily_digest_hour) || 0)),
      notification_emails: recipients,
      email_messages: cleanMessages(messages),
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) reload();
    setBusy(false);
  };

  // The address on the business record always receives; extras are additions
  // to it, which the old copy did not make clear.
  const primary = business.contact_email;

  // ROADMAP 4.2. THE SERVER PICKS THE RECIPIENTS AND THE PRICES, and nothing
  // about either is decided here: a preview a client could aim is a way to
  // make this platform email a stranger with a real business's branding on
  // it, and a preview priced in the browser would be showing a number this
  // business does not charge.
  const sendPreview = async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const r = await api.previewEmails(business.id);
      setPreview({
        ok: true,
        text: `Sent to ${(r.to || []).join(", ")} — two emails: the one your customer gets, and the one you get.`,
      });
    } catch (e) {
      setPreview({ ok: false, text: e.message });
    }
    setPreviewing(false);
  };

  return (
    <>
      <Group title={t("What your customers get")}
        blurb={t("Turning one off stops the email, not the booking.")}>
        {CUSTOMER_EMAILS.map(([k, label, help]) => (
          <Switch key={k} label={t(label)} help={t(help)}
            checked={form[k]} onChange={(v) => set(k, v)} />
        ))}
        {/* ROADMAP 4.2 — "WHAT DOES MY CUSTOMER ACTUALLY GET?" The old site
            answered it and the rebuild dropped the answer, so until now the
            only way to find out was to make a real booking and delete it —
            leaving a row, an email to a real address and a hole in the
            calendar.
            HERE rather than on Message templates, which is the SMS surface:
            these three switches ARE the emails, and the question arrives
            while somebody is looking at them.
            THE SENTENCE UNDER IT IS NOT A RESTATEMENT OF THE BUTTON. It
            answers the two things a person hesitates over before pressing an
            unfamiliar Send: who receives it, and whether it books anything. */}
        <div className="btnrow" style={{ marginTop: "var(--sp-3)" }}>
          <button className="btn" disabled={previewing} onClick={sendPreview}>
            {previewing ? t("Sending…") : t("Send me a sample")}
          </button>
        </div>
        {/* NO NEGATIVE MARGIN HERE, and that is the correction rather than
            the original. The `calc(-1 * var(--sp-2))` pull-up this repo uses
            to tuck a note under a FIELD is measured against a field's own
            bottom margin; a `.btnrow` does not have one, so the same value
            pulled this sentence straight THROUGH the button. Caught by
            looking — every geometry check printed `clean`, because overlapping
            text is not past an edge, not outside its parent and not two boxes
            touching. */}
        <p className="muted">
          {t("A made-up booking, priced from your own services, sent to you and nobody else. Nothing is saved and no time is taken.")}
        </p>
        {preview && <div className={preview.ok ? "ok-box" : "error-box"}>{preview.text}</div>}
      </Group>

      <Group title={t("What you get")} blurb={t("Email you when…")}>
        {OWNER_EMAILS.map(([k, label, help]) => (
          <Switch key={k} label={t(label)} help={help ? t(help) : undefined}
            checked={form[k]} onChange={(v) => set(k, v)} />
        ))}
        {/* THE SWITCH THAT DELIVERED NOTHING, REBUILT (roadmap 2.11 step 6
            stage 6). It wrote `push_enabled` and there was no service worker
            anywhere in the app, so no device was ever registered and nothing
            was ever sent. It now registers THIS browser, and it draws itself
            from that registration rather than from the saved boolean.
            EACH REFUSAL GETS ITS OWN SENTENCE. "Off", "this browser cannot"
            and "you denied it and only browser settings can undo that" look
            identical on a switch and are three different problems — the last
            one especially, because tapping harder will never fix it. */}
        {device === "unsupported" ? (
          <Setting label={t("Push notifications")}
            help={t("On an iPhone, add this dashboard to your home screen first — Safari only allows it there.")}>
            <span className="quiet">{t("Not available in this browser")}</span>
          </Setting>
        ) : (
          <Switch label={t("Push notifications on this device")}
            help={device === "blocked"
              ? t("Blocked for this site. Turn notifications back on in your browser settings, then try again.")
              : t("Allowed once per device, on the phone or computer you want the alerts on.")}
            disabled={pushBusy || device === null || device === "blocked"}
            checked={device === "on"} onChange={togglePush} />
        )}
        {pushErr && <div className="error-box">{pushErr}</div>}
      </Group>

      <Group title={t("Where your alerts go")}>
        <Setting label={t("Main address")} help={t("From your business info. Always receives.")}>
          <span className="quiet">{primary || t("Not set")}</span>
        </Setting>
        <Setting label={t("Also send to")} stacked
          help={t("A partner, a second inbox, whoever else needs to know.")}>
          <div className="tight">
            {recipients.length === 0 && <p className="quiet">{t("Nobody else.")}</p>}
            {recipients.map((e) => (
              <div className="row between sunken flush" key={e}>
                <span className="row" style={{ gap: 8, minWidth: 0 }}>
                  <Mail size={15} strokeWidth={2} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <span className="body" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e}</span>
                </span>
                <button className="btn sm inline ghost" aria-label={`Remove ${e}`}
                  onClick={() => setRecipients(recipients.filter((x) => x !== e))}>
                  <X strokeWidth={2} />
                </button>
              </div>
            ))}
            <div className="row" style={{ gap: 8 }}>
              <input type="email" inputMode="email" placeholder={t("name@example.com")}
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }} />
              <button className="btn sm inline" onClick={addEmail}>{t("Add")}</button>
            </div>
          </div>
        </Setting>
      </Group>

      <Group title={t("Timing")} blurb={t("Only affects nudges to you, not your customers.")}>
        <Setting label={t("Nudge you before a job starts")} stacked>
          <DurationChoice value={form.owner_nudge_lead_minutes} presets={OWNER_NUDGE}
            onChange={(v) => set("owner_nudge_lead_minutes", v)} unit="minutes" customMax={720} />
        </Setting>
        <Setting label={t("Remind you to record payment")} stacked
          help={t("After a job is marked complete, if you haven't finalised it yet.")}>
          <DurationChoice value={form.finalize_nudge_delay_minutes} presets={FINALIZE}
            onChange={(v) => set("finalize_nudge_delay_minutes", v)} unit="minutes" customMax={1440} />
        </Setting>
        <Setting label={t("Morning summary")} help={t("Your day's jobs, sent once each morning.")}>
          <HourChoice value={form.daily_digest_hour} onChange={(v) => set("daily_digest_hour", v)} />
        </Setting>
      </Group>

      {/* ROADMAP 2.18 — THE DETAILER'S OWN WORDS.
          This is the whole of "email customizability" after the owner scrapped
          the block editor he had asked for one message earlier: the design is
          ours, the words are theirs. One optional paragraph per email, with
          prewritten ones to start from — which is what "premade templates"
          turned out to mean in this trade (not a choice of looks; not one of
          the six products offers that for a transactional email).
          NO PLACEHOLDERS ON PURPOSE: the email already greets the customer by
          name and states their date, vehicle and address, so a second
          "Hi {name}" is the owner's own never-default. Nothing to typo,
          nothing to validate. */}
      {/* **HIS NOTE, 2026-09-10: *"I feel like it's not explained enough on
          what it actually does."*** The old sentence — "Add a line to any
          email, everything else stays as designed" — answered what the CONTROL
          does and left the customer out of it entirely. What a detailer needs
          to know before typing is WHO reads it, WHERE it lands, and that it
          goes out as typed. Three facts, one sentence each, and none of them
          restates a label. */}
      <Group title={t("Your own words")}
        blurb={t("Your own sentence at the bottom of one of these emails, in a panel of its own under everything we write. The customer reads it exactly as you type it — a gate code, where to park, that you will text when you are on the way. Leave one blank and that email goes out as it always did.")}>
        {MESSAGE_KINDS.map((k) => {
          const body = messages[k.key] ?? "";
          const open = openKind === k.key;
          return (
            <Setting key={k.key} label={t(k.label)} help={t(k.when)} stacked>
              {!open && (
                <button className="btn sm inline ghost" onClick={() => setOpenKind(k.key)}>
                  {body ? t("Edit your line") : t("Add a line")}
                </button>
              )}
              {!open && body && <p className="body" style={{ marginTop: 8 }}>{body}</p>}
              {open && (
                <div className="tight">
                  <textarea rows={3} maxLength={MESSAGE_MAX} value={body}
                    placeholder={t("Anything you want them to know.")}
                    onChange={(e) => { setMessages({ ...messages, [k.key]: e.target.value }); setMsg(null); }} />
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {/* ROADMAP 8.17 STAGE 2B — A PRESET IS TRANSLATED AND A
                        LEDGER NOTE IS NOT, and the line between them is who
                        is choosing. This is a sentence OFFERED to a detailer
                        to say to their own customers, so it belongs in the
                        language they are reading; what gets stored is
                        whatever they picked, which is their words either
                        way. `plan_visits.note` is the other case — the
                        SYSTEM writes it, so it stays one language. */}
                    {k.presets.map((preset) => {
                      const said = t(preset);
                      return (
                        <button key={preset} className="btn sm inline ghost"
                          onClick={() => { setMessages({ ...messages, [k.key]: said }); setMsg(null); }}>
                          {said.length > 44 ? `${said.slice(0, 44)}…` : said}
                        </button>
                      );
                    })}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn sm inline" onClick={() => setOpenKind(null)}>{t("Done")}</button>
                    {body && (
                      <button className="btn sm inline ghost"
                        onClick={() => { const m = { ...messages }; delete m[k.key]; setMessages(m); setMsg(null); }}>
                        {t("Clear")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Setting>
          );
        })}
      </Group>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>
        {busy ? t("Saving…") : t("Save notifications")}
      </button>
    </>
  );
}
