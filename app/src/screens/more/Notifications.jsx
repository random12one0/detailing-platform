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
import { useBusiness } from "../../context/BusinessContext.jsx";
import { DurationChoice, Group, HourChoice, Setting, Switch } from "../../components/controls.jsx";
import { disablePush, enablePush, pushState } from "../../lib/push.js";

const CUSTOMER_EMAILS = [
  ["email_customer_confirmation", "Booking confirmation",
    "Sent the moment they book, with their receipt and a link to change it."],
  ["email_customer_reminder", "Appointment reminder",
    "One reminder before the job. Timing is set in Booking rules."],
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
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
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
      setPushErr(e.message || "Could not change that.");
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
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) reload();
    setBusy(false);
  };

  // The address on the business record always receives; extras are additions
  // to it, which the old copy did not make clear.
  const primary = business.contact_email;

  return (
    <>
      <Group title="What your customers get"
        blurb="Turning one off stops the email, not the booking.">
        {CUSTOMER_EMAILS.map(([k, label, help]) => (
          <Switch key={k} label={label} help={help}
            checked={form[k]} onChange={(v) => set(k, v)} />
        ))}
      </Group>

      <Group title="What you get" blurb="Email you when…">
        {OWNER_EMAILS.map(([k, label, help]) => (
          <Switch key={k} label={label} help={help}
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
          <Setting label="Push notifications"
            help="On an iPhone, add this dashboard to your home screen first — Safari only allows it there.">
            <span className="quiet">Not available in this browser</span>
          </Setting>
        ) : (
          <Switch label="Push notifications on this device"
            help={device === "blocked"
              ? "Blocked for this site. Turn notifications back on in your browser settings, then try again."
              : "Allowed once per device, on the phone or computer you want the alerts on."}
            disabled={pushBusy || device === null || device === "blocked"}
            checked={device === "on"} onChange={togglePush} />
        )}
        {pushErr && <div className="error-box">{pushErr}</div>}
      </Group>

      <Group title="Where your alerts go">
        <Setting label="Main address" help="From your business info. Always receives.">
          <span className="quiet">{primary || "Not set"}</span>
        </Setting>
        <Setting label="Also send to" stacked
          help="A partner, a second inbox, whoever else needs to know.">
          <div className="tight">
            {recipients.length === 0 && <p className="quiet">Nobody else.</p>}
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
              <input type="email" inputMode="email" placeholder="name@example.com"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }} />
              <button className="btn sm inline" onClick={addEmail}>Add</button>
            </div>
          </div>
        </Setting>
      </Group>

      <Group title="Timing" blurb="Only affects nudges to you, not your customers.">
        <Setting label="Nudge you before a job starts" stacked>
          <DurationChoice value={form.owner_nudge_lead_minutes} presets={OWNER_NUDGE}
            onChange={(v) => set("owner_nudge_lead_minutes", v)} unit="minutes" customMax={720} />
        </Setting>
        <Setting label="Remind you to record payment" stacked
          help="After a job is marked complete, if you haven't finalised it yet.">
          <DurationChoice value={form.finalize_nudge_delay_minutes} presets={FINALIZE}
            onChange={(v) => set("finalize_nudge_delay_minutes", v)} unit="minutes" customMax={1440} />
        </Setting>
        <Setting label="Morning summary" help="Your day's jobs, sent once each morning.">
          <HourChoice value={form.daily_digest_hour} onChange={(v) => set("daily_digest_hour", v)} />
        </Setting>
      </Group>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save notifications"}
      </button>
    </>
  );
}
