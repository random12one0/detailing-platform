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

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { DurationChoice, Group, HourChoice, Setting, Switch } from "../../components/controls.jsx";

const CUSTOMER_EMAILS = [
  ["email_customer_confirmation", "Booking confirmation",
    "Sent the moment they book, with their receipt and a link to change it."],
  ["email_customer_reminder", "Appointment reminder",
    "One reminder before the job. Timing is set in Booking rules."],
  ["email_customer_followup", "Thank-you and review request",
    "Goes out after you record payment."],
];
const OWNER_EMAILS = [
  ["email_owner_new_booking", "A new booking comes in", "So you know before they do."],
  ["email_owner_reminder", "A job is coming up", "A heads-up the day before."],
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

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setMsg(null); };

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
        blurb="Turning one off does not stop the booking working — it just stops the email.">
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
        <Switch label="Push notifications on your phone"
          help="Needs to be allowed once per device, from the phone you want alerts on."
          checked={form.push_enabled} onChange={(v) => set("push_enabled", v)} />
      </Group>

      <Group title="Where your alerts go">
        <Setting label="Main address" help="From your business info. This one always receives.">
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
        <Setting label="Nudge you before a job starts" stacked
          help="A reminder to get moving.">
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
