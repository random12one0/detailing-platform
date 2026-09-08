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
import { TriangleAlert, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { addDays, money, todayLocal } from "../../lib/format.js";
import Sheet from "../../components/Sheet.jsx";
import { DurationChoice, Group, MoneyField, Segmented, Setting, Stepper, Switch } from "../../components/controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// Presets are phrased the way someone says them out loud. The stored value
// is still the raw number in the unit the column expects.
const BUFFER = [[0, "None"], [15, "15 min"], [30, "30 min"], [45, "45 min"], [60, "1 hour"]];
const NOTICE = [[0, "Any time"], [120, "2 hours"], [240, "4 hours"], [1440, "1 day"], [2880, "2 days"]];
const WINDOW = [[30, "1 month"], [60, "2 months"], [90, "3 months"], [180, "6 months"], [365, "1 year"]];
const SLOT = [[15, "15 min"], [20, "20 min"], [30, "30 min"], [60, "1 hour"]];
// ROADMAP 8.10 — the setup a detailer does once however many cars are in the
// driveway. "None" is a real answer and it is the one that makes a second car
// cost exactly as long as the first, which is what the owner said it should
// NOT be — so it is offered rather than assumed, and 15 is where the column
// starts everybody.
const SETUP = [[0, "None"], [10, "10 min"], [15, "15 min"], [30, "30 min"], [45, "45 min"]];
const CANCEL = [[0, "Any time"], [2, "2 hours"], [12, "12 hours"], [24, "1 day"], [48, "2 days"]];
const REMIND = [[60, "1 hour"], [180, "3 hours"], [720, "12 hours"], [1440, "1 day"], [2880, "2 days"]];
// Roadmap 2.12 follow-up. Hours, not minutes, because this one is measured
// from when the REQUEST ARRIVED rather than from the appointment, and the unit
// a detailer thinks in there is "sometime today".
const CHASE = [[0, "Never"], [2, "2 hours"], [6, "6 hours"], [12, "12 hours"], [24, "1 day"]];
// Roadmap 2.8c — the surcharge editor's own shapes.
const RULE_DOW = [["S", 0], ["M", 1], ["T", 2], ["W", 3], ["T", 4], ["F", 5], ["S", 6]];
const EMPTY_RULE = {
  label: "", kind: "time", weekdays: [], timed: false,
  start_time: "17:00", end_time: "20:00", within_hours: 24,
  amount: "", is_percent: false,
};
const ruleToForm = (r) => ({
  label: r.label ?? "",
  kind: r.kind === "lead_time" ? "lead_time" : "time",
  weekdays: Array.isArray(r.weekdays) ? r.weekdays : [],
  timed: !!(r.start_time && r.end_time),
  start_time: r.start_time ?? "17:00",
  end_time: r.end_time ?? "20:00",
  within_hours: r.within_hours ?? 24,
  amount: String(r.amount ?? ""),
  is_percent: !!r.is_percent,
});
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// The rule read back as a sentence, so the list says what it does rather than
// what it is made of. Same principle as this screen's presets.
const ruleSentence = (r) => {
  const amt = r.is_percent ? `+${r.amount}%` : `+$${Number(r.amount).toFixed(2)}`;
  if (r.kind === "lead_time") return `${amt} when booked within ${r.within_hours} hours`;
  const days = Array.isArray(r.weekdays) && r.weekdays.length
    ? r.weekdays.map((d) => DAY_NAMES[d]).join(", ")
    : "every day";
  const hours = r.start_time && r.end_time ? `, ${r.start_time}–${r.end_time}` : "";
  return `${amt} on ${days}${hours}`;
};

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
  useAppLocale();
  const { business, settings, reload } = useBusiness();
  const [form, setForm] = useState(() => ({
    buffer_minutes: settings?.buffer_minutes ?? 0,
    min_advance_minutes: settings?.min_advance_minutes ?? 0,
    max_advance_days: settings?.max_advance_days ?? null,
    slot_interval_minutes: settings?.slot_interval_minutes ?? 30,
    max_bookings_per_day: settings?.max_bookings_per_day ?? null,
    cancellation_window_hours: settings?.cancellation_window_hours ?? 0,
    customer_reminder_lead_minutes: settings?.customer_reminder_lead_minutes ?? 1440,
    customer_reminder_2_enabled: settings?.customer_reminder_2_enabled ?? false,
    customer_reminder_2_lead_minutes: settings?.customer_reminder_2_lead_minutes ?? 120,
    // **NOT `?? true` — roadmap 8.4.** Every other fallback on this form is a
    // sensible default for a value nobody has an opinion about; these two are
    // the one question where "no value" is an ANSWER, and defaulting them
    // would show both switches on for a business that has never been asked —
    // the assumption put back one layer under the migration that removed it.
    // `null` stays null, so `mode` below has nothing selected.
    mobile_enabled: settings?.mobile_enabled ?? null,
    dropoff_enabled: settings?.dropoff_enabled ?? null,
    ask_water_electric: settings?.ask_water_electric ?? true,
    water_requirement: settings?.water_requirement ?? "ask",
    power_requirement: settings?.power_requirement ?? "ask",
    ask_vehicle_condition: settings?.ask_vehicle_condition ?? true,
    evening_before_enabled: settings?.evening_before_enabled ?? true,
    travel_fee: settings?.travel_fee ?? "",
    travel_radius_miles: settings?.travel_radius_miles ?? "",
    // Roadmap 2.8c. Both are the detailer's own ordered lists, edited in the
    // sheets below rather than in this form's fields.
    travel_zones: Array.isArray(settings?.travel_zones) ? settings.travel_zones : [],
    price_rules: Array.isArray(settings?.price_rules) ? settings.price_rules : [],
    // Roadmap 2.12. 'reserve' is the fallback as well as the schema default:
    // an unreadable value must never quietly downgrade what a business has
    // been promising its customers.
    booking_mode: settings?.booking_mode === "request" ? "request" : "reserve",
    request_nudge_hours: settings?.request_nudge_hours ?? 12,
    // ROADMAP 8.10. 1 is the schema default and the answer for every business
    // that has never been asked, and at 1 the customer never sees a count
    // control at all — the whole feature is off until this moves.
    // ROADMAP 8.13 — these two live on `businesses`, not `business_settings`,
    // so the save below writes two tables. They are in this form rather than
    // on a control of their own because a detailer going away on Friday
    // should not have to learn a second way of saving.
    closed_until: business?.closed_until ? String(business.closed_until).slice(0, 10) : "",
    closed_note: business?.closed_note ?? "",
    max_vehicles_per_booking: settings?.max_vehicles_per_booking ?? 1,
    extra_vehicle_minutes_saved: settings?.extra_vehicle_minutes_saved ?? 15,
  }));
  const [editing, setEditing] = useState(null);   // {kind:"zone"|"rule", index?, form}
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
  // **AND `null` IS A FOURTH READING, NOT A FOURTH OPTION — roadmap 8.4.** A
  // business that has never answered gets no selection at all rather than a
  // guess; the control still offers exactly three, because "I have not
  // decided" is not something a detailer should be able to choose ON PURPOSE.
  // It is a state you arrive in and leave, never one you pick.
  const mode = form.mobile_enabled == null && form.dropoff_enabled == null ? null
    : form.mobile_enabled && form.dropoff_enabled ? "both"
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

  // Both lists are edited in a sheet and saved into the form; the Save button
  // at the foot of the screen is what writes them, like every other setting
  // here. A key is generated once and never changes — it is what a customer's
  // stored booking points at.
  const saveZone = () => {
    const f = editing.form;
    const name = f.name.trim();
    if (!name) return;
    const zones = [...form.travel_zones];
    const key = editing.index != null ? zones[editing.index].key
      : (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "area") + "-" + zones.length;
    const row = { key, name, fee: Number(f.fee) || 0 };
    if (editing.index != null) zones[editing.index] = row; else zones.push(row);
    set("travel_zones", zones);
    setEditing(null);
  };

  const saveRule = () => {
    const f = editing.form;
    const label = f.label.trim();
    if (!label || !Number(f.amount)) return;
    const row = f.kind === "lead_time"
      ? { label, kind: "lead_time", within_hours: Number(f.within_hours) || 24,
          amount: Number(f.amount), is_percent: !!f.is_percent }
      : { label, kind: "time",
          weekdays: f.weekdays.length ? f.weekdays : null,
          start_time: f.timed ? f.start_time : null,
          end_time: f.timed ? f.end_time : null,
          amount: Number(f.amount), is_percent: !!f.is_percent };
    const rules = [...form.price_rules];
    if (editing.index != null) rules[editing.index] = row; else rules.push(row);
    set("price_rules", rules);
    setEditing(null);
  };

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
      customer_reminder_2_enabled: !!form.customer_reminder_2_enabled,
      customer_reminder_2_lead_minutes: Number(form.customer_reminder_2_lead_minutes) || 0,
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
      travel_zones: form.travel_zones,
      price_rules: form.price_rules,
      booking_mode: form.booking_mode,
      request_nudge_hours: Number(form.request_nudge_hours) || 0,
      max_vehicles_per_booking: Number(form.max_vehicles_per_booking) || 1,
      extra_vehicle_minutes_saved: Number(form.extra_vehicle_minutes_saved) || 0,
    }).eq("business_id", business.id);

    // ROADMAP 8.13 — the second table. `businesses` is where the pause lives,
    // deliberately NOT `status`: that column is billing's suspension, and one
    // column with two meanings would let a detailer switch their own page back
    // on while their subscription was unpaid.
    const { error: bizErr } = await supabase.from("businesses").update({
      closed_until: form.closed_until || null,
      // An empty note is null, not "", so the booking page's `&&` draws
      // nothing rather than an empty paragraph.
      closed_note: form.closed_note?.trim() || null,
    }).eq("id", business.id);
    const failed = error ?? bizErr;
    setMsg(failed ? { ok: false, text: failed.message } : { ok: true, text: "Saved." });
    if (!error) { reload(); refreshSlotCount(); }
    setBusy(false);
  };

  return (
    <>
      {/* The consequence, before the controls: this is the number that
          answers "did that do what I wanted". */}
      <div className="sunken flush row between" style={{ marginBottom: "var(--sp-5)" }}>
        <span className="quiet">{t("Open slots in the next 7 days")}</span>
        <span className="strong num">{slotCount === null ? "—" : slotCount}</span>
      </div>

      {/* ROADMAP 2.12 — THE OWNER'S OWN QUESTION, AND IT IS FIRST BECAUSE IT
          CHANGES WHAT EVERY OTHER RULE ON THIS SCREEN MEANS. His words: "when
          you book, you're pretty confident that's gonna be your day… whereas
          other detailers might want it that they just put in a request".
          Both keep the slot — see the help text, which is the one thing here
          a detailer cannot work out from the labels. */}
      <Group title={t("When someone books")}>
        <Setting label="What a booking means" stacked
          help={form.booking_mode === "request"
            ? "The time is held for them and nobody else can take it, but they're told it's a request until you accept it. Requests wait on your Today screen."
            : "The time is theirs the moment they book it. Nothing waits on you."}>
          <Segmented value={form.booking_mode} onChange={(v) => set("booking_mode", v)} options={[
            ["reserve", "They're booked"], ["request", "They've asked"],
          ]} />
        </Setting>
      </Group>

      <Group title={t("What you offer")}>
        <Setting label="Where you work"
          stacked>
          <Segmented value={mode} onChange={setMode} options={[
            ["mobile", "I go to them"], ["dropoff", "They come to me"], ["both", "Both"],
          ]} />
        </Setting>

        {form.mobile_enabled && (
          <>
            {/* ROADMAP 2.8c — AND THIS FEE NOW ACTUALLY REACHES THE CUSTOMER'S
                TOTAL. It was printed on the booking page ("+$25" on the "We
                come to you" card) and `computeQuote` had no travel input at
                all, so the Estimated total never contained it. */}
            {/* A FIELD THAT IS DEAD IN ONE CONFIGURATION IS NOT A DEAD FIELD.
                Step 4 proposed deleting this outright and was CORRECTED at
                step 6: `pricing.ts:135` returns it and `computeQuote` adds it,
                which is what roadmap 2.8c fixed — deleting it would take a
                live money path out. It is superseded only WHILE travel areas
                exist, and that is exactly when it stops being editable: an
                editable box holding $25 that nothing charges is the same lie
                as a switch that delivers nothing, one screen over. Add an area
                and it becomes a sentence; remove them all and it is a field
                again, still holding the number it always held. */}
            {form.travel_zones.length ? (
              <Setting label="Travel fee"
                help="Each area below sets its own, so this one is not charged while you have areas.">
                <span className="quiet">{Number(form.travel_fee) > 0 ? `${money(Number(form.travel_fee))}, not charged` : "Not set"}</span>
              </Setting>
            ) : (
              <Setting label="Travel fee"
                help="Added to every mobile booking, and included in the price the customer is quoted. Leave blank for none.">
                <MoneyField value={form.travel_fee} onChange={(v) => set("travel_fee", v)} />
              </Setting>
            )}

            {/* Not geocoded distance — we cannot measure one. These are the
                detailer's own areas in their own words, which is how a small
                mobile business quotes travel anyway. The customer picks theirs
                on the booking page. */}
            <Setting label="Travel areas"
              help={form.travel_zones.length
                ? "The customer picks one on your booking page and its fee is added."
                : "Optional. Add areas if you charge different amounts for different distances."}
              stacked>
              {/* RULED ROWS, NOT CARDS. This list already sits inside a
                  Setting, which is a card — a card holding cards is boxes in
                  boxes at one surface value, which is the same note Catalog's
                  own container carries. `tests/composition.test.mjs` test 1
                  caught it, and it was right. */}
              <div>
                {form.travel_zones.map((z, i) => (
                  <div className="row-item" key={z.key} style={{ cursor: "default" }}>
                    <button className="txt" style={{ background: "none", border: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
                      onClick={() => setEditing({ kind: "zone", index: i, form: { name: z.name, fee: String(z.fee ?? 0) } })}>
                      <span className="nm">{z.name}</span>
                      <span className="quiet">{Number(z.fee) > 0 ? `+${money(Number(z.fee))}` : "No extra charge"}</span>
                    </button>
                    <button className="btn sm inline icon" aria-label={`Remove ${z.name}`}
                      onClick={() => set("travel_zones", form.travel_zones.filter((_, n) => n !== i))}>
                      <X strokeWidth={2} />
                    </button>
                  </div>
                ))}
                <button className="btn inline" style={{ marginTop: "var(--sp-3)" }}
                  onClick={() => setEditing({ kind: "zone", form: { name: "", fee: "" } })}>
                  + Add an area
                </button>
              </div>
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

        {/* ROADMAP 8.10 — MORE THAN ONE CAR IN ONE BOOKING. The owner:
            *"have that in a setting: how many cars can someone book in one
            booking."* It sits in *What you offer* rather than in *When you
            can be booked*, because it is a thing a customer is allowed to
            buy — the time it takes is a consequence of it, which is exactly
            why the second row only exists once the first is above one. */}
        <Setting label="Cars in one booking"
          help="Above ten is a phone call, not a booking form.">
          {/* "1 cars" — found by looking at the screen, not by a check. */}
          <Stepper value={form.max_vehicles_per_booking} min={1} max={10}
            suffix={Number(form.max_vehicles_per_booking) === 1 ? "car" : "cars"}
            onChange={(v) => set("max_vehicles_per_booking", v)} />
        </Setting>

        {Number(form.max_vehicles_per_booking) > 1 && (
          <Setting label="Setup you only do once"
            help="Taken off every car after the first, because you unpack once. It never changes the price."
            stacked>
            <DurationChoice value={form.extra_vehicle_minutes_saved} presets={SETUP}
              onChange={(v) => set("extra_vehicle_minutes_saved", v)} unit="minutes"
              customMax={480} />
          </Setting>
        )}
      </Group>

      <Group title={t("When you can be booked")}>
        {/* ROADMAP 8.13 — CLOSED UNTIL I SAY IT'S OPEN, and it is FIRST in
            this group because when you are away nothing else in it applies.

            **A DATE, NOT A SWITCH, and that is the whole design.** *"Says when
            they are back"* was the ask, and a date does two things a flag
            cannot: the customer is told when to come back instead of meeting
            a page that reads as *gone*, and **the detailer is reopened
            automatically** — a date in the past is not closed, so a holiday
            ends by itself rather than waiting to be remembered.

            IT IS NOT `businesses.status`. That column is billing's
            suspension; one column with two meanings would let a detailer
            reopen a page the platform had darkened for non-payment. */}
        <Setting label="Closed until"
          help={form.closed_until
            ? "Your page stays up and tells customers when you're back. It reopens itself on the day."
            : "Going away? Pick the day you're back and the page says so instead of taking bookings."}
          stacked>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <input type="date" value={form.closed_until}
              min={todayLocal(business.timezone)}
              onChange={(e) => set("closed_until", e.target.value)} />
            {form.closed_until && (
              <button className="btn sm" onClick={() => {
                set("closed_until", "");
                set("closed_note", "");
              }}>{t("Open now")}</button>
            )}
          </div>
        </Setting>

        {/* Only once there is something to say it about. A note field on a
            business that is open is a question nobody has an answer to. */}
        {form.closed_until && (
          <Setting label="Anything to tell them" stacked>
            <input value={form.closed_note} maxLength={200}
              placeholder={t("Back on the 14th — call for anything urgent")}
              onChange={(e) => set("closed_note", e.target.value)} />
          </Setting>
        )}

        <Setting label="Gap between jobs"
          help="Held after every booking, to pack up and drive."
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

      <Group title={t("Changes and reminders")}>
        <Setting label="They can change or cancel until"
          help="Closer than this and they have to call you."
          stacked>
          <DurationChoice value={form.cancellation_window_hours} presets={CANCEL}
            onChange={(v) => set("cancellation_window_hours", v)} unit="hours" customMax={720} />
        </Setting>

        <Setting label="Remind them before the job"
          help="This far ahead of the appointment."
          stacked>
          <DurationChoice value={form.customer_reminder_lead_minutes} presets={REMIND}
            onChange={(v) => set("customer_reminder_lead_minutes", v)} unit="minutes" customMax={10080} />
        </Setting>

        {/* ROADMAP 2.18 — THE SECOND REMINDER, OFF BY DEFAULT. Two is the
            trade's ceiling rather than its floor: Jobber caps there and
            nobody in the six-product sweep offers three. The help text
            carries the fact the label cannot — the pair that actually works
            is one the day before and one a couple of hours out, and the
            second one only sends after the first has. */}
        <Switch label="Send a second reminder"
          help="For the pair that works: one the day before, one a couple of hours out."
          checked={form.customer_reminder_2_enabled}
          onChange={(v) => set("customer_reminder_2_enabled", v)} />

        {form.customer_reminder_2_enabled && (
          <Setting label="Second reminder" help="Never sends before the first one." stacked>
            <DurationChoice value={form.customer_reminder_2_lead_minutes} presets={REMIND}
              onChange={(v) => set("customer_reminder_2_lead_minutes", v)} unit="minutes" customMax={10080} />
          </Setting>
        )}

        {/* ROADMAP 2.12 FOLLOW-UP, and only for a business that takes requests
            — a reserve-mode detailer can never have one, so the row would be a
            control that can never do anything. The help text carries the one
            fact the label does not: the slot is held the whole time, so a
            forgotten request costs a bookable time as well as a customer. */}
        {form.booking_mode === "request" && (
          <Setting label="Chase me about a request I haven't answered"
            help="Their time stays held until you answer, so a forgotten request holds a slot too."
            stacked>
            <DurationChoice value={form.request_nudge_hours} presets={CHASE}
              onChange={(v) => set("request_nudge_hours", v)} unit="hours" customMax={168} />
          </Setting>
        )}

        <Switch label="Ask how dirty the vehicle is"
          help="Light, moderate, heavy or extreme. Never changes the price."
          checked={form.ask_vehicle_condition}
          onChange={(v) => set("ask_vehicle_condition", v)} />

        <Switch label="Remind the night before for early jobs"
          help="Sent the evening before instead."
          checked={form.evening_before_enabled}
          onChange={(v) => set("evening_before_enabled", v)} />
      </Group>

      {/* ROADMAP 2.8c — SURCHARGES. The research found the trade's own booking
          software sells exactly these two: by day and time (a weekend or
          evening rate) and by how little notice a job was booked with (a rush
          fee). They are worked out on the server and printed on the customer's
          receipt under the name written here — never a silent number. */}
      <Group title={t("Surcharges")}
        blurb="Optional. Extra charged on top for jobs that cost you more to take.">
        <div className="card">
          {form.price_rules.map((r, i) => (
            <div className="row-item" key={i} style={{ cursor: "default" }}>
              <button className="txt" style={{ background: "none", border: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
                onClick={() => setEditing({ kind: "rule", index: i, form: ruleToForm(r) })}>
                <span className="nm">{r.label}</span>
                <span className="quiet">{ruleSentence(r)}</span>
              </button>
              <button className="btn sm inline icon" aria-label={`Remove ${r.label}`}
                onClick={() => set("price_rules", form.price_rules.filter((_, n) => n !== i))}>
                <X strokeWidth={2} />
              </button>
            </div>
          ))}
          {form.price_rules.length === 0 && (
            <p className="quiet">{t("None. Every job is priced the same whenever it is booked.")}</p>
          )}
          <button className="btn inline" style={{ marginTop: "var(--sp-3)" }}
            onClick={() => setEditing({ kind: "rule", form: { ...EMPTY_RULE } })}>
            + Add a surcharge
          </button>
        </div>
      </Group>

      {warnings.map((w) => (
        <div className="warn-box" key={w.key}>
          <TriangleAlert strokeWidth={2} />
          <span>{w.text}</span>
          <span className="actions">
            <button onClick={() => dismiss(w.key, false)}>{t("Dismiss")}</button>
            <button onClick={() => dismiss(w.key, true)}>{t("Never")}</button>
          </span>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      {/* Warnings never block: Save is always available. */}
      <button className="btn primary" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save booking rules"}
      </button>

      {editing && (
        <Sheet onClose={() => setEditing(null)}
          title={`${editing.index != null ? "Edit" : "New"} ${editing.kind === "zone" ? "travel area" : "surcharge"}`}>
          {editing.kind === "zone" ? (
            <>
              <label className="field"><span>{t("Area name")}</span>
                <input value={editing.form.name} placeholder={t("e.g. Within 10 miles")}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} /></label>
              <Setting label="Extra for this area" help="Added to the customer's total when they pick it.">
                <MoneyField value={editing.form.fee}
                  onChange={(v) => setEditing({ ...editing, form: { ...editing.form, fee: v } })} />
              </Setting>
              <button className="btn primary" onClick={saveZone}>{t("Save area")}</button>
            </>
          ) : (
            <>
              <label className="field"><span>{t("What the customer sees")}</span>
                <input value={editing.form.label} placeholder={t("e.g. Weekend rate")}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, label: e.target.value } })} /></label>
              <Setting label="When it applies" stacked
                help={editing.form.kind === "lead_time"
                  ? "Charged when a job is booked with less notice than you set below."
                  : "Charged on the days — and, if you set them, the hours — you choose below."}>
                <Segmented value={editing.form.kind}
                  onChange={(v) => setEditing({ ...editing, form: { ...editing.form, kind: v } })}
                  options={[["time", "Certain days"], ["lead_time", "Short notice"]]} />
              </Setting>

              {editing.form.kind === "time" ? (
                <>
                  <Setting label="Days" stacked
                    help={editing.form.weekdays.length ? "Only the days you pick." : "Every day."}>
                    <div className="row wrap" style={{ gap: 6 }}>
                      {RULE_DOW.map(([label, n], i) => {
                        const on = editing.form.weekdays.includes(n);
                        return (
                          <button key={i} className={`chip ${on ? "active" : ""}`} aria-pressed={on}
                            onClick={() => setEditing({ ...editing, form: { ...editing.form,
                              weekdays: on ? editing.form.weekdays.filter((x) => x !== n)
                                : [...editing.form.weekdays, n].sort() } })}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </Setting>
                  <Switch label="Only between certain hours"
                    help="Leave off to charge it all day on those days."
                    checked={editing.form.timed}
                    onChange={(v) => setEditing({ ...editing, form: { ...editing.form, timed: v } })} />
                  {editing.form.timed && (
                    <div className="grid2">
                      <label className="field"><span>{t("From")}</span>
                        <input type="time" value={editing.form.start_time}
                          onChange={(e) => setEditing({ ...editing, form: { ...editing.form, start_time: e.target.value } })} /></label>
                      <label className="field"><span>{t("Until")}</span>
                        <input type="time" value={editing.form.end_time}
                          onChange={(e) => setEditing({ ...editing, form: { ...editing.form, end_time: e.target.value } })} /></label>
                    </div>
                  )}
                </>
              ) : (
                <Setting label="Booked with less notice than" stacked
                  help="A job booked closer than this gets the surcharge.">
                  <DurationChoice value={Number(editing.form.within_hours) || 0}
                    presets={[[2, "2 hours"], [6, "6 hours"], [12, "12 hours"], [24, "1 day"], [48, "2 days"]]}
                    onChange={(v) => setEditing({ ...editing, form: { ...editing.form, within_hours: v } })}
                    unit="hours" customMax={720} />
                </Setting>
              )}

              <Setting label="How much" stacked
                help={editing.form.is_percent
                  ? "A percentage of the job's price before any discount."
                  : "A flat amount added to the job."}>
                <Segmented value={editing.form.is_percent ? "pct" : "amt"}
                  onChange={(v) => setEditing({ ...editing, form: { ...editing.form, is_percent: v === "pct" } })}
                  options={[["amt", "Dollars"], ["pct", "Percent"]]} />
              </Setting>
              <label className="field"><span>{editing.form.is_percent ? "Percent (%)" : "Amount ($)"}</span>
                <input type="number" inputMode="decimal" value={editing.form.amount}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, amount: e.target.value } })} /></label>

              <button className="btn primary" onClick={saveRule}>{t("Save surcharge")}</button>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
