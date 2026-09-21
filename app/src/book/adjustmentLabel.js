// ROADMAP 2.1c — what a money line is CALLED, in the reader's language.
//
// `_shared/pricing.ts` composes every adjustment line's `label` in English,
// server-side, where `t()` does not exist. Two of the three kinds put OUR
// English in that string — "plan rate", "included", "{n}% off", "2nd vehicle"
// — so a Spanish receipt read them in English. Since 2026-09-21 each line also
// carries `parts`: the same facts as values rather than as a finished
// sentence, which is what lets this file rebuild the label in any language.
//
// **THE THIRD KIND IS NOT OURS AND IS NOT TOUCHED.** A `rule` line's label is
// the DETAILER'S own text out of `business_settings.price_rules` — "Weekend
// rate" is something they typed. It is printed exactly as written, like a
// service name or a travel-zone name, and it carries no `parts` precisely so
// nobody is tempted. The settings screen that collects it translates only its
// placeholder ("e.g. Weekend rate" → "ej. Tarifa de fin de semana").
//
// **AND A LINE WITH NO `parts` FALLS BACK TO `label`.** That is not defensive
// programming, it is the deploy freeze: edge functions are published by Andrew,
// so until `calculate-booking` and `create-booking` are deployed the live
// answer has no `parts` at all, and every booking stored before that date never
// will. Both must keep rendering exactly as they do today.
import { getLocale, t } from "../lib/i18n.js";

// Ten is the ceiling `max_vehicles_per_booking` enforces, so the English list
// is complete rather than clever — no ordinal-suffix arithmetic to get wrong.
// It matches `_shared/pricing.ts`'s own ORDINALS, deliberately: the English
// this produces has to be byte-identical to the `label` the server wrote, or
// the same booking would read one way on this page and another in its email.
const EN_ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

/**
 * The ordinal as the reader's own language spells it.
 *
 * **WHY THE CALLER COMPUTES THIS INSTEAD OF `t()` DOING IT.** `t()` keys on
 * the English string and `tests/spanish.test.mjs` compares the PLACEHOLDER SETS
 * of every pair — a Spanish value may not introduce or drop one. So a template
 * cannot say `{ord} vehicle` in English and `Vehículo {n}` in Spanish. Handing
 * both languages the same `{ord}` placeholder, already spelled correctly, is
 * the one shape that satisfies that check AND leaves English untouched.
 *
 * Spanish takes the masculine ordinal indicator because the noun is
 * `vehículo`; if this is ever reused for a feminine noun it needs `.ª`, which
 * is exactly why it lives here beside its one caller rather than in
 * `format.js` pretending to be general.
 */
function ordinal(n) {
  if (getLocale() === "es") return `${n}.º`;
  return EN_ORDINALS[n - 1] ?? `#${n}`;
}

/** The displayed name for one `quote.adjustments` / `price_adjustments` row. */
export function adjustmentLabel(line) {
  const parts = line?.parts;
  if (!parts) return line?.label ?? "";

  if (parts.of === "vehicle") {
    // "2nd vehicle · Large · Ford F-150" — the size and the model are the
    // detailer's and the customer's own words and pass straight through.
    const head = t("{ord} vehicle", { ord: ordinal(parts.ordinal) });
    return [head, parts.size, parts.model].filter(Boolean).join(" · ");
  }

  if (parts.of === "plan") {
    // The plan's NAME is the detailer's; only what it DOES is ours.
    const what = parts.benefit === "percent_off"
      ? t("{n}% off", { n: parts.percent })
      : parts.benefit === "plan_rate"
        ? t("plan rate")
        : t("included");
    return [parts.planName, what].filter(Boolean).join(" · ");
  }

  return line.label ?? "";
}
