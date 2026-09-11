// Three-tap expense entry, per the spec: amount, category, done.
//
// Tap 1 is the amount (the keypad is already focused when the sheet opens).
// Tap 2 is a category chip. Tap 3 is Save. Description defaults to the
// category name, and the date defaults to today — both editable behind a
// "More" disclosure for the rare case, so the common case stays at three
// taps.
//
// THE SIXTH CATEGORY IS THE DETAILER'S OWN — his review, 2026-09-10: *"no way
// to add a custom name."* This comment used to end "the five categories are
// fixed; there are no custom ones", which was true and was the defect. The
// column is free text with no constraint, and `moneyAdvanced.js` groups on
// whatever string it finds, so a typed name needs no migration and shows up
// in the breakdown and the accountant export on its own.
//
// IT IS BEHIND "Other" RATHER THAN A SIXTH CHIP, so the three-tap path is
// untouched for everybody who does not want it — and an empty box still
// saves as "other", because a field that BLOCKS Save would turn the fastest
// category into the slowest one.

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { todayLocal } from "../lib/format.js";
import Sheet from "./Sheet.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

const CATEGORIES = ["product", "gas", "equipment", "supplies", "other"];

export default function ExpenseModal({ onClose, onSaved }) {
  useAppLocale();
  const { business } = useBusiness();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(null);
  const [customName, setCustomName] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayLocal(business.timezone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amountRef = useRef(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  // What actually gets stored. A typed name IS the category — that is what
  // puts it in the ledger row, the "where it went" bars and the export
  // without a second column anywhere.
  const named = category === "other" ? customName.trim() : "";
  const finalCategory = named || category;

  const save = async () => {
    if (!Number(amount) || !category) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("expenses").insert({
      business_id: business.id,
      date,
      category: finalCategory,
      description: description.trim() || finalCategory,
      amount: Number(amount),
      payment_method: "unspecified",
    });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    onSaved?.();
  };

  return (
    <Sheet onClose={onClose} title={t("Add expense")} peek={62}>

        <label className="field">
          <span>{t("Amount")}</span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: "1.6rem", fontWeight: 700, minHeight: 60 }}
          />
        </label>

        <div className="section-title" style={{ marginTop: 4 }}>{t("Category")}</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? "active" : ""}`}
              style={{ minHeight: 44, textTransform: "capitalize" }}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {category === "other" && (
          <label className="field" style={{ marginTop: 12 }}>
            <span>{t("Name")}</span>
            <input
              value={customName}
              placeholder={t("e.g. car wash membership")}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
        )}

        {!showMore ? (
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setShowMore(true)}>
            {t("Add a note or change the date")}
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <label className="field"><span>{t("Note")}</span>
              <input value={description} placeholder={finalCategory || "Description"}
                onChange={(e) => setDescription(e.target.value)} /></label>
            <label className="field"><span>{t("Date")}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" style={{ marginTop: 12 }}
          disabled={busy || !Number(amount) || !category} onClick={save}>
          {busy ? "Saving" : "Save expense"}
        </button>
    </Sheet>
  );
}
