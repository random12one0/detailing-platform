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
import { getAppLocale, t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

const CATEGORIES = ["product", "gas", "equipment", "supplies", "other"];

// **THE CAPITAL LETTER IS IN THE STRING, NOT IN A STYLESHEET — Claude Cowork's
// ruling, 2026-09-12.** `text-transform: capitalize` used to do this, on the
// advanced screen and on these chips, and his two reasons are why it is gone
// rather than adjusted:
//
// **1 · CSS CANNOT TELL WHOSE WORDS IT IS TRANSFORMING.** Choosing *other*
// stores whatever the detailer typed AS the category, so the same rule that
// capitalised our five tokens also rewrote his "microfiber towels (bulk)" into
// "Microfiber Towels (Bulk)". The distinction this product draws everywhere
// else — our copy is ours, his is his — is one the instrument is incapable of
// making. So it is the wrong instrument, not a wrong setting.
//
// **2 · CAPITALISATION IS NOT UNIVERSAL.** Spanish does not capitalise common
// nouns, so forcing "Producto" and "Gasolina" was wrong the moment the toggle
// existed, and no CSS rule can know that either.
//
// **THE FOURTH AXIS THEREFORE HOLDS IN CSS AS WELL AS IN COPY** (CLAUDE.md).
// A token not in this map is the detailer's own word: it misses the map, misses
// the catalogue, and renders exactly as he typed it.
export const CATEGORY_WORDS = {
  product: { en: "Product", es: "producto" },
  gas: { en: "Gas", es: "gasolina" },
  equipment: { en: "Equipment", es: "equipo" },
  supplies: { en: "Supplies", es: "insumos" },
  other: { en: "Other", es: "otro" },
};

// **BOTH LANGUAGES LIVE HERE RATHER THAN IN `appEs.js`, AND THAT IS THE
// COLLISION TALKING.** The catalogue is keyed on the English string, so the
// expense chip and the website form's *Other* chip would have to share one
// entry — and they need different casing: the intake chip stands beside
// *Not on the site at all* and *Either is fine*, where a lowercase `otro`
// would be the odd one out, which is the same fault as `Otro` being the odd
// one out here. One key cannot hold two casings.
//
// `plans.js`'s `priceWords` is the same shape for the same reason and is the
// precedent: a fixed token set whose English is not a sentence gets a table,
// and the table takes `lang` and defaults to English.
//
// **THE COST, SAID OUT LOUD: these five Spanish words are not in `appEs.js`,
// so an audit of that file will not see them.** `FOUND.md` records it.
export const categoryWord = (c, lang) => CATEGORY_WORDS[c]?.[lang === "es" ? "es" : "en"] ?? c;

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
              style={{ minHeight: 44 }}
              onClick={() => setCategory(c)}
            >
              {categoryWord(c, getAppLocale())}
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
