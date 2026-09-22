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
import { DurationChoice, Folded, Group, HourChoice, Setting, Switch } from "../../components/controls.jsx";
// The folded row states the hour the way the control inside it does.
import { duration } from "../../lib/format.js";
import { disablePush, enablePush, pushState } from "../../lib/push.js";
import { cleanMessages, MESSAGE_KINDS, MESSAGE_MAX } from "../../lib/emailMessages.js";
// "1 other emails" — same plural helper Business, Clients and AdvancedMoney
// each keep a copy of.
const n = (v, one, many) => t(v === 1 ? one : many, { count: v });
// The same 12-hour label `HourChoice` shows, so the row and the control it
// opens can never disagree about what time the summary goes out.
const hourWords = (h) => {
  const n24 = Math.min(23, Math.max(0, Number(h) ?? 7));
  const ampm = n24 < 12 ? "AM" : "PM";
  return `${n24 % 12 === 0 ? 12 : n24 % 12}:00 ${ampm}`;
};
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
  // THE SECOND SENTENCE IS NOT A WARNING AND IS NOT CONDITIONAL, 2026-09-21.
  // This switch reads "Thank-you and review request · on" by default, and the
  // review half is silently left out unless a Google or Yelp link has been
  // added — true for 15 of the 16 businesses on the system. So the screen was
  // asserting something untrue for almost everybody.
  //
  // It says what a person needs to know and nothing more. **No badge, no red
  // mark, no error state**: nothing is broken, the thank-you goes out either
  // way, and a warning drawn on a working feature teaches a detailer to
  // distrust the screen. **And it is unconditional** — a line that appears
  // only while the boxes are empty is a line nobody ever learns, and the
  // sentence is worth reading even once the links are in, because it is the
  // only place that says which screen they live on.
  ["email_customer_followup", "Thank-you and review request",
    "Goes out after you record payment. The review ask inside it only appears once you add a Google or Yelp link on Business info."],
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
        text: t("Sent to {to} · two emails: the one your customer gets, and the one you get.", { to: (r.to || []).join(", ") }),
      });
    } catch (e) {
      setPreview({ ok: false, text: e.message });
    }
    setPreviewing(false);
  };

  return (
    <>
      {/* HIS REVIEW, 2026-09-10: *"the turn on push notifications should be
          its own big button, more visible."* It was the last row of "What you
          get", a switch among four switches, which is the one shape that
          makes it invisible: every other row there is a preference somebody
          may or may not want, and this one is a PERMISSION the phone has to
          be asked for once before any of them can reach it. So it is first,
          it is alone, and it is the screen's only accent fill.
          A BUTTON RATHER THAN A SWITCH, and that is the honest control: a
          switch says the state is mine to set, and it is the browser's — the
          tap opens a system prompt that can be refused.

          THE SWITCH THAT DELIVERED NOTHING, REBUILT (roadmap 2.11 step 6
          stage 6). It wrote `push_enabled` and there was no service worker
          anywhere in the app, so no device was ever registered and nothing
          was ever sent. It now registers THIS browser, and it draws itself
          from that registration rather than from the saved boolean.
          EACH REFUSAL GETS ITS OWN SENTENCE. "Off", "this browser cannot"
          and "you denied it and only browser settings can undo that" look
          identical on a control and are three different problems — the last
          one especially, because tapping harder will never fix it. */}
      <Group title={t("Push notifications")}
        blurb={t("Get an alert on your phone when a booking comes in. It works when the dashboard is closed.")}>
        {device === "unsupported" ? (
          <Setting label={t("Not available in this browser")} stacked
            help={t("On an iPhone, add this dashboard to your home screen first. Safari only allows it there.")} />
        ) : device === "blocked" ? (
          <Setting label={t("Blocked for this site")} stacked
            help={t("Turn notifications back on for this site in your browser settings, then come back here.")}>
            <button className="btn" disabled>{t("Turn on push notifications")}</button>
          </Setting>
        ) : device === "on" ? (
          <Setting label={t("On for this device")} stacked
            help={t("Turn it on again on any other phone or computer you want the alerts on.")}>
            <button className="btn ghost" disabled={pushBusy} onClick={() => togglePush(false)}>
              {pushBusy ? t("Saving…") : t("Turn off on this device")}
            </button>
          </Setting>
        ) : (
          <Setting label={t("Off for this device")} stacked
            help={t("Allowed once per device. Your browser will ask you first.")}>
            <button className="btn primary" disabled={pushBusy || device === null}
              onClick={() => togglePush(true)}>
              {pushBusy ? t("Saving…") : t("Turn on push notifications")}
            </button>
          </Setting>
        )}
        {pushErr && <div className="error-box">{pushErr}</div>}
      </Group>

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
        {/* `.setting.stacked` RATHER THAN A BARE `.btnrow`, and it is a repair
            rather than a style choice. `.setting-card` is `padding: 0` on
            purpose — every row carries its own — so a child that is not a row
            is flush to the card's edges with nothing under it. At 1440 that put
            this note's text ACROSS the card's bottom hairline, which is the
            defect class `sweep-widths` cannot see (every check it owns asks
            about an edge, and text on a border is inside every edge it should
            be inside). `.setting.stacked` is the padding and the column, and
            `.setting + .setting` draws the divider from the switch above for
            free — no new CSS, and the same shape every other row here has. */}
        <div className="setting stacked">
          <button className="btn" disabled={previewing} onClick={sendPreview}>
            {previewing ? t("Sending…") : t("Send me a sample")}
          </button>
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
        </div>
      </Group>

      <Group title={t("What you get")} blurb={t("Email you when…")}>
        {OWNER_EMAILS.map(([k, label, help]) => (
          <Switch key={k} label={t(label)} help={help ? t(help) : undefined}
            checked={form[k]} onChange={(v) => set(k, v)} />
        ))}
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
        {/* **THREE SETTINGS NOBODY CHANGES TWICE, FOLDED — 2026-09-12.** Each
            has a sensible default and each is about when a nudge reaches YOU,
            which is the least urgent thing on this screen. The row states all
            three, so nothing is hidden — only put away. */}
        <Folded name={t("When these reach you")}
          now={[
            t("nudge {mins}", { mins: duration(form.owner_nudge_lead_minutes) }),
            t("payment reminder after {mins}", { mins: duration(form.finalize_nudge_delay_minutes) }),
            t("summary at {time}", { time: hourWords(form.daily_digest_hour) }),
          ].join(" · ")}>
        <Setting label={t("Nudge you before a job starts")} stacked>
          <DurationChoice value={form.owner_nudge_lead_minutes} presets={OWNER_NUDGE}
            onChange={(v) => set("owner_nudge_lead_minutes", v)} unit="minutes" customMax={720} />
        </Setting>
        <Setting label={t("Remind you to record payment")} stacked
          help={t("After a job is marked complete, if you haven't finalized it yet.")}>
          <DurationChoice value={form.finalize_nudge_delay_minutes} presets={FINALIZE}
            onChange={(v) => set("finalize_nudge_delay_minutes", v)} unit="minutes" customMax={1440} />
        </Setting>
        <Setting label={t("Morning summary")} help={t("Your day's jobs, sent once each morning.")}>
          <HourChoice value={form.daily_digest_hour} onChange={(v) => set("daily_digest_hour", v)} />
        </Setting>
        </Folded>
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
      {/* **ROADMAP 3.4b — WHAT THE BOX IS NOT FOR, SAID ONCE, WHERE IT IS
          TYPED. 2026-09-21.**
          The 3.4 email review found that `ownWords()` drops this paragraph into
          nine call sites across seven of the sixteen templates — confirmations,
          both reminders, the receipt, the invoice, quotes, cancellations and
          reschedules. It is escaped for HTML and **unchecked for content**, so
          a detailer can put a sales pitch inside a transactional email that
          carries no unsubscribe link, on our sending domain.
          **ANDREW'S RULING WAS A WARNING, NOT A FILTER**, and the distinction
          is the whole of it: their words stay theirs. Nothing scans this text,
          nothing blocks a send, nothing rewrites it. We say what the box is
          for and what it is not for, once, and then trust them — which is also
          the only version that works, because the seller is the tenant and a
          filter would be us reading a detailer's mail and deciding what it
          meant.
          **A SECOND STRING RATHER THAN A LONGER FIRST ONE**, deliberately: the
          sentence above was written to his note of 2026-09-10 (*"I feel like
          it's not explained enough"*) and reviewed then. Editing it would
          churn its Spanish key and put a reviewed sentence back in play to add
          a fact that is not about what the box does. Two keys, one paragraph,
          `Group` unchanged. */}
      <Group title={t("Your own words")}
        blurb={`${t("Your own sentence at the bottom of one of these emails, in a panel of its own under everything we write. The customer reads it exactly as you type it: a gate code, where to park, that you will text when you are on the way. Leave one blank and that email goes out as it always did.")} ${t("Keep anything that sells out of it. These emails are receipts and reminders, and a customer cannot unsubscribe from them. An offer or a discount belongs in a text message instead.")}`}>
        {/* **TWELVE IDENTICAL ROWS, ELEVEN OF THEM EMPTY — 2026-09-12.**
            Every one of these rendered the same *Add a line* button under the
            same two lines of text, so the block was twelve repetitions of one
            shape and a detailer had to read all of them to find the one they
            had written. The ones with a line in them are the content; the rest
            are a menu, and a menu belongs behind one control.
            `.disclose` is the product's own disclosure (native `<details>`,
            § Composition) and is already used elsewhere — nothing new here.
            **THE SPLIT IS RE-READ ON EVERY RENDER ON PURPOSE**, so a line you
            have just written moves up out of the drawer the moment you save
            it, rather than sitting in "the ones you have not used". */}
        {MESSAGE_KINDS.filter((k) => (messages[k.key] ?? "") || openKind === k.key).map((k) => {
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
        {/* The rest: named, counted, and one press away. An empty drawer is
            not rendered at all — a detailer who has written all twelve should
            not meet a control that opens onto nothing. */}
        {MESSAGE_KINDS.some((k) => !(messages[k.key] ?? "") && openKind !== k.key) && (
          <details className="disclose">
            <summary>
              {n(MESSAGE_KINDS.filter((k) => !(messages[k.key] ?? "") && openKind !== k.key).length,
                "{count} other email you can add a line to",
                "{count} other emails you can add a line to")}
            </summary>
            {MESSAGE_KINDS.filter((k) => !(messages[k.key] ?? "") && openKind !== k.key).map((k) => (
              <Setting key={k.key} label={t(k.label)} help={t(k.when)} stacked>
                <button className="btn sm inline ghost" onClick={() => setOpenKind(k.key)}>
                  {t("Add a line")}
                </button>
              </Setting>
            ))}
          </details>
        )}
      </Group>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>
        {busy ? t("Saving…") : t("Save notifications")}
      </button>
    </>
  );
}
