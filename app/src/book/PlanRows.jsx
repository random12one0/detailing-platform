// THE PLANS A DETAILER SELLS, AS A LIST OF ROWS. Two callers: the plans page
// at `/book/:slug/plans`, and the booking flow's own add-ons step.
//
// ---------------------------------------------------------------------------
// WHY IT WAS LIFTED OUT — Andrew, 2026-09-13.
// ---------------------------------------------------------------------------
// The pitch on the booking flow was a CHIP beside the step rail, opening the
// plans page. His correction: *"it should be underneath the add ons, like,
// pretty big and pretty visible… like, just in the whole screen, like, not a
// button to go to the screen, but just the whole screen."*
//
// A second copy of these rows written into the step would be the same offer in
// two dialects, and the one nobody edits goes stale — which is this repo's
// most repeated defect. So the rows moved here and BOTH pages render this.
//
// ---------------------------------------------------------------------------
// EVERY DESIGN DECISION IN THE ROW IS INHERITED, NOT NEW.
// ---------------------------------------------------------------------------
// From `PlansPage.jsx`'s own history, kept because the reasoning is what stops
// somebody rebuilding the rejected version:
//   · A COLLECTION OF RECORDS IS A RULED LIST, NEVER A STACK OF CARDS. Four
//     boxed cards with a full-width button each is the tell
//     `docs/design-knowledge.md` §1 names, every button repeated the name
//     written 40px above it, and cards cost 190px a plan against 96px — which
//     put the page 311px past the bottom of a 1440x900 screen.
//   · THE ROW *IS* THE BUTTON, so there is no interactive element nested
//     inside an interactive one.
//   · THE PRICE IS THE BIGGEST THING ON IT, in the figure face, because it is
//     what a person picks on.
//   · THE CADENCE IS CHIPS, not a run-on grey sentence. His review of
//     2026-09-11 — *"it just feels like a ton of text kind of thrown up on the
//     screen"* — was answered by weight, not by rebuilding into cards.
//
// ---------------------------------------------------------------------------
// A LINK OR A BUTTON, AND THE CALLER DECIDES WHICH.
// ---------------------------------------------------------------------------
// On the plans page a row is a `<Link>` — it is a destination, and a customer
// should be able to open one in a new tab. **Inside the flow it must NOT be a
// link**: navigating to `/book/:slug?plan=<id>` mid-booking throws away every
// answer already given. There it is a `<button>` that attaches the plan in
// place, and the step redraws with the price bar updated.

import { Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { money } from "../lib/format.js";
import { cadenceWords, priceParts, termWords, visitWords } from "../lib/plans.js";
import { t } from "../lib/i18n.js";

/**
 * `plans`  — from the public profile.
 * `lang`   — the customer's locale, for the price and cadence words.
 * `tx`     — the translator for a detailer's OWN words (name, description).
 * `to`     — (plan) => path. Given, each row is a `<Link>`.
 * `onPick` — (id) => void. Given instead, each row is a `<button>`.
 * `chosen` — the id already attached, drawn as chosen rather than offered.
 */
export default function PlanRows({ plans, lang, tx, to, onPick, chosen = null }) {
  return (
    <div className="bk-plans">
      {plans.map((p) => {
        const picked = chosen === p.id;
        const price = priceParts(p.price_kind, p.price_amount, money, lang);
        const inner = (
          <>
            <div className="bk-plan-body">
              <h3>{tx(p.name)}</h3>
              {/* EVERY FACT ITS OWN TOKEN. `.filter(Boolean)` because a plan
                  with no cadence and no term is a bare discount, and an empty
                  chip row is worse than none. */}
              <div className="bk-plan-chips">
                {[
                  cadenceWords(p, lang),
                  p.cadence_unit ? t("{visits} each time", { visits: visitWords(p, lang) }) : null,
                  termWords(p, lang),
                ].filter(Boolean).map((chip) => (
                  <span className="bk-plan-chip" key={chip}>{chip}</span>
                ))}
              </div>
              {p.description && <p className="bk-muted">{tx(p.description)}</p>}
            </div>
            {/* **THE PRICE AND THE ACTION SHARE A LINE**, and that is height as
                much as meaning: on its own row the price cost every plan about
                30px, which took a phone from 1,041px to 1,339px. */}
            <span className="bk-plan-foot">
              <span className="bk-plan-price">
                {/* THE NUMBER IS THE FIGURE AND THE UNIT IS NOT. At title size
                    "$120.00 a month" wrapped onto two lines and read as a
                    broken card. */}
                <span className="amt">{price.big}</span>
                <span className="per">{price.small}</span>
              </span>
              <span className="bk-plan-pick">
                <span className="label-text">{picked ? t("On this plan") : t("Choose this")}</span>
                {picked
                  ? <Check className="bk-plan-go" size={17} strokeWidth={2.5} aria-hidden="true" />
                  : <ChevronRight className="bk-plan-go" size={17} strokeWidth={2.5} aria-hidden="true" />}
              </span>
            </span>
          </>
        );

        if (to) {
          return <Link key={p.id} className="bk-plan-row" to={to(p)}>{inner}</Link>;
        }
        return (
          <button key={p.id} type="button" aria-pressed={picked}
            className={`bk-plan-row${picked ? " picked" : ""}`}
            onClick={() => onPick(picked ? null : p.id)}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
