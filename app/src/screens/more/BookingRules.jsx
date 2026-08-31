// Booking rules — every value that used to be a hardcoded constant.
//
// This screen was the worst offender in the app for asking a detailer to do
// arithmetic. To say "I need a day's notice" you typed 1440, because the
// field wanted minutes. Buffer was minutes, cancellation was hours, the
// booking window was days: four units for one idea, all in bare number
// boxes. Nothing has changed in the database — only what you touch.
//
// Three other changes:
//   - "What you offer" was two independent checkboxes that could both be
//     off, which broke booking entirely and only warned afterwards. It is
//     one three-way choice now, so the broken state cannot be expressed.
//   - Every setting says what it DOES underneath, not just what it is called.
//   - The live slot count sits at the top rather than the bottom, because it
//     is the answer to "did that change do what I wanted".
//
// Out-of-range values still warn and still never block: a detailer who
// genuinely needs a week of notice can set it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { addDays, todayLocal } from "../../lib/format.js";
import { DurationChoice, Group, MoneyField, Segmented, Setting, Stepper, Switch } from "../../components/controls.jsx";

// Presets are phrased the way someone says them out loud. The stored value
// is still the raw number in the unit the column expects.
const BUFFER = [[0, "None"], [15, "15 min"], [30, "30 min"], [45, "45 min"], [60, "1 hour"]];
const NOTICE = [[0, "Any time"], [120, "2 hours"], [240, "4 hours"], [1440, "1 day"], [2880, "2 days"]];
const WINDOW = [[30, "1 month"], [60, "2 months"], [90, "3 months"], [180, "6 months"], [365, "1 year"]];
const SLOT = [[15, "15 min"], [20, "20 min"], [30, "30 min"], [60, "1 hour"]];
const CANCEL = [[0, "Any time"], [2, "2 hours"], [12, "12 hours"], [24, "1 day"], [48, "2 days"]];
const REMIND = [[60, "1 hour"], [180, "3 hours"], [720, "12 hours"], [1440, "1 day"], [2880, "2 days"]];
// W22. Three states, phrased as the detailer would say them out loud.
const RESOURCE = [["not_needed", "I bring it"], ["ask", "Just ask"], ["required", "Must have"]];
const HELP = {
  not_needed: (what) => `You carry your own — the customer is never asked about ${what}.`,
  ask: (what) => `The booking page asks about ${what} and records the answer, so you know what to load.`,
  required: (what) => `The booking page asks about ${what}, and a customer who can't provide it is blocked from booking.`,
};

// Warnings live on the same values as before, but read as sentences.
const WARN = {
  buffer_minutes: (v) => v > 120 &&
    `A ${Math.round(v / 60 * 10) / 10}-hour gap between jobs means very few slots each day.`,
  min_advance_minutes: (v) => v > 2880 &&
    `Nobody will be able to book sooner than ${Math.round(v / 1440 * 10) / 10} days out.`,
  max_advance_days: (v) => v != null && v < 7 &&
    "Customers can only book a few days ahead.",
  slot_interval_minutes: (v) => (v < 15 && "Very fine slot grid — the time picker will be crowded.")
    || (v > 120 && "Very coarse slot grid — few start times will be offered."),
  max_bookings_per_day: (v) => v != null && v > 20 &&
    "That cap is unusual — double-check it's what you want.",
  cancellation_window_hours: (v) => v > 168 &&
    `Anything inside ${Math.round(v / 24)} days needs a phone call to change.`,
};

export default function BookingRules() {
  const { business, settings, reload } = useBusiness();
  const [form, setForm] = useState(() => ({
    buffer_minutes: settings?.buffer_minutes ?? 0,
    min_advance_minutes: settings?.min_advance_minutes ?? 0,
    max_advance_days: settings?.max_advance_days ?? null,
    slot_interval_minutes: settings?.slot_interval_minutes ?? 30,
    max_bookings_per_day: settings?.max_bookings_per_day ?? null,
    cancellation_window_hours: settings?.cancellation_window_hours ?? 0,
    customer_reminder_lead_minutes: settings?.customer_reminder_lead_minutes ?? 1440,
    mobile_enabled: settings?.mobile_enabled ?? true,
    dropoff_enabled: settings?.dropoff_enabled ?? true,
    ask_water_electric: settings?.ask_water_electric ?? true,
    water_requirement: settings?.water_requirement ?? "ask",
    power_requirement: settings?.power_requirement ?? "ask",
    ask_vehicle_condition: settings?.ask_vehicle_condition ?? true,
    evening_before_enabled: settings?.evening_before_enabled ?? true,
    travel_fee: settings?.travel_fee ?? "",
    travel_radius_miles: settings?.travel_radius_miles ?? "",
  }));
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rule-warnings-dismissed") || "{}"); } catch { return {}; }
  });
  const [slotCount, setSlotCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setMsg(null); };

  const dismiss = (key, forever) => {
    const next = { ...dismissed, [key]: true };
    setDismissed(next);
    if (forever) localStorage.setItem("rule-warnings-dismissed", JSON.stringify(next));
  };

  // "What you offer" as one value, so both-off is unrepresentable.
  const mode = form.mobile_enabled && form.dropoff_enabled ? "both"
    : form.mobile_enabled ? "mobile" : "dropoff";
  const setMode = (m) => setForm((f) => ({
    ...f,
    mobile_enabled: m === "mobile" || m === "both",
    dropoff_enabled: m === "dropoff" || m === "both",
    ...(m === "dropoff"
      ? { ask_water_electric: false, water_requirement: "not_needed", power_requirement: "not_needed" }
      : {}),
  }));

  const warnings = useMemo(() => {
    const out = [];
    for (const [key, fn] of Object.entries(WARN)) {
      if (dismissed[key]) continue;
      const raw = form[key];
      if (raw === "" || raw === undefined) continue;
      const text = fn(raw === null ? null : Number(raw));
      if (text) out.push({ key, text });
    }
    // Found by walking the customer's manage page end to end: if you take
    // bookings closer in than you allow changes, every booking is locked the
    // moment it is made and the customer can only phone you.
    const notice = Number(form.min_advance_minutes) / 60;
    const change = Number(form.cancellation_window_hours);
    if (change > 0 && notice > 0 && change > notice && !dismissed.window_exceeds_notice) {
      out.push({
        key: "window_exceeds_notice",
        text: `You take bookings ${notice} hours ahead but close changes ${change} hours ahead, `
          + "so every new booking is locked as soon as it's made.",
      });
    }
    return out;
  }, [form, dismissed]);

  const refreshSlotCount = useCallback(async () => {
    try {
      const today = todayLocal(business.timezone);
      const r = await api.availableSlots(business.slug, {
        start_date: today, end_date: addDays(today, 6), duration_minutes: 120,
      });
      setSlotCount(Object.values(r.days || {}).reduce((s, d) => s + (d.slots?.length || 0), 0));
    } catch { setSlotCount(null); }
  }, [business]);

  useEffect(() => { refreshSlotCount(); }, [refreshSlotCount]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const num = (v) => (v === "" || v === null ? null : Number(v));
    const { error } = await supabase.from("business_settings").update({
      buffer_minutes: Number(form.buffer_minutes) || 0,
      min_advance_minutes: Number(form.min_advance_minutes) || 0,
      max_advance_days: num(form.max_advance_days),
      slot_interval_minutes: Number(form.slot_interval_minutes) || 30,
      max_bookings_per_day: num(form.max_bookings_per_day),
      cancellation_window_hours: Number(form.cancellation_window_hours) || 0,
      customer_reminder_lead_minutes: Number(form.customer_reminder_lead_minutes) || 0,
      mobile_enabled: form.mobile_enabled,
      dropoff_enabled: form.dropoff_enabled,
      // The old boolean is kept in step with the two new settings rather than
      // left to rot: the migration is append-only, so it is still on the row
      // and still read by everything deployed before 2.8b. True when either
      // resource is asked about at all.
      ask_water_electric: form.water_requirement !== "not_needed" || form.power_requirement !== "not_needed",
      water_requirement: form.water_requirement,
      power_requirement: form.power_requirement,
      ask_vehicle_condition: form.ask_vehicle_condition,
      evening_before_enabled: form.evening_before_enabled,
      travel_fee: num(form.travel_fee),
      travel_radius_miles: num(form.travel_radius_miles),
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) { reload(); refreshSlotCount(); }
    setBusy(false);
  };

  return (
    <>
      {/* The consequence, before the controls: this is the number that
          answers "did that do what I wanted". */}
      <div className="sunken flush row between" style={{ marginBottom: "var(--sp-5)" }}>
        <span className="quiet">Open slots in the next 7 days</span>
        <span className="strong num">{slotCount === null ? "—" : slotCount}</span>
      </div>

      <Group title="What you offer"
        blurb="Customers only ever see the options you turn on here.">
        <Setting label="Where you work"
          help={mode === "both" ? "Customers choose which they'd prefer."
            : mode === "mobile" ? "Every job happens at the customer's address."
              : "Every job happens at your place."}
          stacked>
          <Segmented value={mode} onChange={setMode} options={[
            ["mobile", "I go to them"], ["dropoff", "They come to me"], ["both", "Both"],
          ]} />
        </Setting>

        {form.mobile_enabled && (
          <>
            <Setting label="Travel fee"
              help="Added to every mobile booking. Leave blank for none.">
              <MoneyField value={form.travel_fee} onChange={(v) => set("travel_fee", v)} />
            </Setting>
            {/* W22 — two settings, three states each, because water and power
                vary independently: the coating specialist needs power and
                brings water, the rinseless detailer needs neither. "Must have"
                is the one the owner asked for by name — it blocks a booking
                the detailer cannot service, and the block is on the server
                (`_shared/slotValidation.ts`), not just on the page. */}
            <Setting label="Water at the customer's address"
              help={HELP[form.water_requirement]("water")} stacked>
              <Segmented value={form.water_requirement}
                onChange={(v) => set("water_requirement", v)}
                options={RESOURCE} />
            </Setting>
            <Setting label="Power at the customer's address"
              help={HELP[form.power_requirement]("a power outlet")} stacked>
              <Segmented value={form.power_requirement}
                onChange={(v) => set("power_requirement", v)}
                options={RESOURCE} />
            </Setting>
          </>
        )}
      </Group>

      <Group title="When you can be booked"
        blurb="These decide which times show up on your booking page.">
        <Setting label="Gap between jobs"
          help="Time to pack up, drive and set up again. It is held after every booking."
          stacked>
          <DurationChoice value={form.buffer_minutes} presets={BUFFER}
            onChange={(v) => set("buffer_minutes", v)} unit="minutes" customMax={480} />
        </Setting>

        <Setting label="How much notice you need"
          help="The soonest a customer can book from right now."
          stacked>
          <DurationChoice value={form.min_advance_minutes} presets={NOTICE}
            onChange={(v) => set("min_advance_minutes", v)} unit="minutes" customMax={20160} />
        </Setting>

        <Setting label="How far ahead they can book"
          help="Anything past this is not offered yet."
          stacked>
          <DurationChoice value={form.max_advance_days} presets={WINDOW}
            onChange={(v) => set("max_advance_days", v)} unit="days" customMax={1095} />
        </Setting>

        <Setting label="Start times you offer"
          help="On the hour only, or every fifteen minutes — how the time picker is spaced."
          stacked>
          <DurationChoice value={form.slot_interval_minutes} presets={SLOT}
            onChange={(v) => set("slot_interval_minutes", v)} unit="minutes"
            allowCustom={false} />
        </Setting>

        <Setting label="Most jobs in a day"
          help="Once you hit this, the rest of that day stops being offered.">
          <Stepper value={form.max_bookings_per_day} min={1} max={30} suffix="jobs"
            unlimitedLabel="No limit" onChange={(v) => set("max_bookings_per_day", v)} />
        </Setting>
      </Group>

      <Group title="Changes and reminders"
        blurb="What a customer can do on their own, and when they hear from you.">
        <Setting label="They can change or cancel until"
          help="Closer than this and they have to call you. Your booking page says so rather than failing."
          stacked>
          <DurationChoice value={form.cancellation_window_hours} presets={CANCEL}
            onChange={(v) => set("cancellation_window_hours", v)} unit="hours" customMax={720} />
        </Setting>

        <Setting label="Remind them before the job"
          help="One email, this far ahead of the appointment."
          stacked>
          <DurationChoice value={form.customer_reminder_lead_minutes} presets={REMIND}
            onChange={(v) => set("customer_reminder_lead_minutes", v)} unit="minutes" customMax={10080} />
        </Setting>

        <Switch label="Ask how dirty the vehicle is"
          help="Four choices — light, moderate, heavy or extreme — on the booking page. It never changes the price; it tells you what you are driving to."
          checked={form.ask_vehicle_condition}
          onChange={(v) => set("ask_vehicle_condition", v)} />

        <Switch label="Remind the night before for early jobs"
          help="A 7am reminder for a 8am job is no use. This sends it the evening before instead."
          checked={form.evening_before_enabled}
          onChange={(v) => set("evening_before_enabled", v)} />
      </Group>

      {warnings.map((w) => (
        <div className="warn-box" key={w.key}>
          <TriangleAlert strokeWidth={2} />
          <span>{w.text}</span>
          <span className="actions">
            <button onClick={() => dismiss(w.key, false)}>Dismiss</button>
            <button onClick={() => dismiss(w.key, true)}>Never</button>
          </span>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      {/* Warnings never block: Save is always available. */}
      <button className="btn primary" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save booking rules"}
      </button>
    </>
  );
}
