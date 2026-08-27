// Which emails send, when reminders go out, where owner alerts go
// (multiple recipients), and push on/off.

import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";

const EMAIL_TOGGLES = [
  ["email_customer_confirmation", "Booking confirmation to the customer"],
  ["email_customer_reminder", "Appointment reminder to the customer"],
  ["email_customer_followup", "Thank-you and review request after payment"],
  ["email_owner_new_booking", "New booking alert to you"],
  ["email_owner_reminder", "Upcoming job reminder to you"],
];

export default function Notifications() {
  const { business, settings, reload } = useBusiness();
  const [form, setForm] = useState(() => {
    const f = {};
    for (const [k] of EMAIL_TOGGLES) f[k] = settings?.[k] ?? true;
    f.push_enabled = settings?.push_enabled ?? true;
    f.customer_reminder_lead_minutes = settings?.customer_reminder_lead_minutes ?? 120;
    f.evening_before_enabled = settings?.evening_before_enabled ?? true;
    f.owner_nudge_lead_minutes = settings?.owner_nudge_lead_minutes ?? 30;
    f.finalize_nudge_delay_minutes = settings?.finalize_nudge_delay_minutes ?? 120;
    f.daily_digest_hour = settings?.daily_digest_hour ?? 7;
    return f;
  });
  const [recipients, setRecipients] = useState(settings?.notification_emails ?? []);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const addRecipient = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e.includes("@") || recipients.includes(e)) return;
    setRecipients([...recipients, e]);
    setNewEmail("");
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("business_settings").update({
      ...Object.fromEntries(EMAIL_TOGGLES.map(([k]) => [k, !!form[k]])),
      push_enabled: !!form.push_enabled,
      customer_reminder_lead_minutes: Number(form.customer_reminder_lead_minutes) || 0,
      evening_before_enabled: !!form.evening_before_enabled,
      owner_nudge_lead_minutes: Number(form.owner_nudge_lead_minutes) || 0,
      finalize_nudge_delay_minutes: Number(form.finalize_nudge_delay_minutes) || 0,
      daily_digest_hour: Math.min(23, Math.max(0, Number(form.daily_digest_hour) || 0)),
      notification_emails: recipients,
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) reload();
    setBusy(false);
  };

  const Toggle = ({ k, label }) => (
    <label className="field row" style={{ alignItems: "center", gap: 10 }}>
      <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} style={{ width: 22 }} />
      <span style={{ margin: 0 }}>{label}</span>
    </label>
  );

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>Emails that send</div>
      {EMAIL_TOGGLES.map(([k, label]) => <Toggle key={k} k={k} label={label} />)}

      <div className="section-title">Where your alerts go</div>
      <p className="muted" style={{ marginBottom: 10 }}>
        Add as many addresses as you need. If you leave this empty, alerts go
        to your business contact address ({business.contact_email || "not set"}).
      </p>
      {recipients.map((e) => (
        <div className="card row between" key={e}>
          <span>{e}</span>
          <button className="btn ghost inline" aria-label="Remove"
            onClick={() => setRecipients(recipients.filter((x) => x !== e))}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <div className="row" style={{ gap: 8 }}>
        <input type="email" placeholder="name@example.com" value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }} />
        <button className="btn inline" onClick={addRecipient}>Add</button>
      </div>

      <div className="section-title">Timing</div>
      <label className="field"><span>Remind the customer this many minutes before</span>
        <input type="number" inputMode="numeric" value={form.customer_reminder_lead_minutes}
          onChange={(e) => setForm({ ...form, customer_reminder_lead_minutes: e.target.value })} /></label>
      <Toggle k="evening_before_enabled" label="For early-morning jobs, remind the evening before instead" />
      <div className="grid2">
        <label className="field"><span>Nudge you before a job starts (min)</span>
          <input type="number" inputMode="numeric" value={form.owner_nudge_lead_minutes}
            onChange={(e) => setForm({ ...form, owner_nudge_lead_minutes: e.target.value })} /></label>
        <label className="field"><span>Remind you to finalize payment after (min)</span>
          <input type="number" inputMode="numeric" value={form.finalize_nudge_delay_minutes}
            onChange={(e) => setForm({ ...form, finalize_nudge_delay_minutes: e.target.value })} /></label>
      </div>
      <label className="field"><span>Send your morning summary at (hour, 0–23)</span>
        <input type="number" inputMode="numeric" min={0} max={23} value={form.daily_digest_hour}
          onChange={(e) => setForm({ ...form, daily_digest_hour: e.target.value })} /></label>

      <div className="section-title">Push notifications</div>
      <Toggle k="push_enabled" label="Send push notifications to your phone" />

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving" : "Save"}</button>
    </div>
  );
}
