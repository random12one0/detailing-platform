// ROADMAP 8.10 — THE DEALERSHIP JOB, WHICH IS MANUAL BY HIS INSTRUCTION.
//
// *"If there's like ten cars or above the limit, that's gonna have to be done
// over a call with the dealership… we need a way that would be easy for the
// detailer to just log a ton of cars down and how much they got from it. And
// there shouldn't be auto calculations, because obviously when they do this
// there's discounts."*
//
// SO NOTHING HERE COMPUTES A PRICE. There is no service list, no vehicle
// sizes, no size fee, no travel, no promo and no rounding — the detailer types
// what they were paid and that is the number. Every other money path in this
// product exists to stop a price being typed; this one exists because the
// price was agreed on the phone at a discount nobody in this codebase knows
// about, and a computed figure would be a wrong figure printed confidently.
//
// IT IS A BOOKING ROW, NOT A TABLE OF ITS OWN. That is what buys Money's
// totals, the accountant export, the day it happened on and the job record
// for free — a `bulk_jobs` table would need every one of them written again
// and one of them would be forgotten. `bulk_vehicle_count` is what makes it
// one, and the exclusion constraint skips those rows: a job being LOGGED
// already happened, so refusing it because that afternoon already has two
// bookings on it would break the feature at the only moment it is used.
//
// IT IS WRITTEN STRAIGHT FROM THE BROWSER, like `ExpenseModal` beside it and
// unlike every customer-facing booking. The rule it looks like it breaks —
// consequential writes go through edge functions — is about a CLIENT naming a
// price for something the SERVER sells. Here there is no customer, no quote
// and no server arithmetic to protect: the detailer is recording their own
// takings, RLS scopes the row to their own business, and an edge function
// would be a round trip that validated nothing.

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { todayLocal } from "../lib/format.js";
import Sheet from "./Sheet.jsx";
import { MoneyField } from "./controls.jsx";
// THE BUSINESS'S CLOCK, NOT THE BROWSER'S — and it is the EDGE FUNCTIONS'
// OWN MODULE rather than a second copy of the arithmetic. `_shared/tz.ts`
// imports nothing at all, so Vite strips its types and bundles it exactly as
// `render-emails.mjs` already loads `_shared/emailTemplates.ts` under Node.
// F-018 was three copies of "which month is this" disagreeing; a fourth copy
// of "which instant is 8am here" is how that happens again.
import { localDateTimeToInstant } from "../../../supabase/functions/_shared/tz.ts";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

export default function BulkJobModal({ onClose, onSaved }) {
  useAppLocale();
  const { business } = useBusiness();
  const [company, setCompany] = useState("");
  const [cars, setCars] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal(business.timezone));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const ready = !!company.trim() && Number(cars) > 0 && Number(amount) > 0;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    setError("");
    // THE DAY, NOT THE HOUR. A bulk job is logged after the fact and nobody
    // remembers it started at 8:12, so it is written as the working day it
    // happened on — 08:00 to 17:00 business-local. It holds no slot (the
    // constraint skips it) and it is not offered to anybody, so the only job
    // these two instants do is put the row on the right DAY in every screen
    // that groups by date.
    const startAt = localDateTimeToInstant(business.timezone, date, "08:00");
    const endAt = localDateTimeToInstant(business.timezone, date, "17:00");
    const n = Math.round(Number(cars));
    const { error: err } = await supabase.from("bookings").insert({
      business_id: business.id,
      customer_name: company.trim(),
      // A dealership deal is a company, not a person, and asking for a mobile
      // number before somebody can write down what they earned is the friction
      // his "just log a ton of cars down" is about. The column is NOT NULL, so
      // an empty string is the honest value for "there isn't one here".
      customer_phone: "",
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      service_type: "dropoff",
      vehicle_size: "bulk",
      vehicle_size_label: `${n} vehicles`,
      bulk_vehicle_count: n,
      // TYPED, AND THE ONLY NUMBER IN THIS FORM THAT IS. `final_amount` is
      // what Money and the export read first (`final_amount ?? total_price`),
      // and both are set so nothing anywhere has to know this row is special.
      subtotal: Number(amount),
      total_price: Number(amount),
      final_amount: Number(amount),
      // It is done and it is paid — that is what logging one MEANS. A row
      // arriving as "confirmed and unpaid" would put a dealership on the
      // unpaid list the moment it was recorded.
      status: "completed",
      payment_status: "paid",
      finalized_at: new Date().toISOString(),
      admin_notes: notes.trim() || null,
    });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    onSaved?.();
  };

  return (
    <Sheet onClose={onClose} title={t("Log a bulk job")} peek={62}>
      <label className="field">
        <span>{t("Who for")}</span>
        <input
          ref={firstRef}
          value={company}
          placeholder={t("e.g. Ridgeline Motors")}
          onChange={(e) => setCompany(e.target.value)}
        />
      </label>

      <div className="grid2">
        <label className="field">
          <span>{t("Cars")}</span>
          <input type="number" inputMode="numeric" min="1" placeholder="10"
            value={cars} onChange={(e) => setCars(e.target.value)} />
        </label>
        {/* THE HOUSE CONTROL FOR MONEY, not a bare number input. The currency
            sits inside the field so the number is what you type, and it drops
            the spinner arrows a bare `type=number` draws — which on the one
            field in this form that matters read as a control rather than as a
            figure. Looked at, not reasoned about. */}
        <label className="field">
          <span>{t("Paid")}</span>
          <MoneyField value={amount} onChange={setAmount} placeholder="0" />
        </label>
      </div>

      {/* NO PER-CAR PRICE AND NO ARITHMETIC ANYWHERE ON THIS FORM. Printing
          "$95 a car" under the two fields above would be a figure nobody
          agreed to, on a deal whose whole point is that it was negotiated. */}
      <label className="field">
        <span>{t("Day")}</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="field">
        <span>Note (optional)</span>
        <input value={notes} placeholder={t("What was included")}
          onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && <div className="error-box">{error}</div>}
      <button className="btn primary" style={{ marginTop: 12 }}
        disabled={busy || !ready} onClick={save}>
        {busy ? "Saving" : "Save job"}
      </button>
    </Sheet>
  );
}
