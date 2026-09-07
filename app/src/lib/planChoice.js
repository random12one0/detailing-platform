// WHICH PLAN SOMEBODY PICKED ON `/pricing`, CARRIED THROUGH TO THE SCREEN
// THAT CHARGES FOR IT — roadmap 8.3.
//
// **THE OWNER'S COMPLAINT WAS ABOUT ROUTING AND THE DEFECT UNDERNEATH IT WAS
// ABOUT MONEY.** `/pricing` writes `?plan=`, `?term=` and `?offer=` from four
// buttons. `CreateBusiness` read two of the three, and only redirected when
// `term` was present — so `/app?plan=booking`, which has no term because the
// booking plan has no term, arrived at a plain dashboard with the choice gone.
// And `Billing.jsx` called `subscribe` with a **hardcoded `"website"`**, so a
// detailer who chose the $35 booking plan would have been signed up to the $60
// one with a $999 build fee attached. *A number PRINTED is not a number
// CHARGED* — this repo's oldest rule, with the two numbers three screens apart.
//
// **THE SERVER WAS ALREADY RIGHT ABOUT ALL OF IT**, which is why this is a
// browser-only change: `planFor` takes `"booking"`, `subscribe` validates the
// plan with `isPlan` and defaults safely, and `summary` has returned a
// `quotes.booking` the screen never drew.
//
// **IT RETURNS ONE STRING, AND THAT IS THE WHOLE DESIGN.** The server keys its
// quotes by `annual-upfront | annual-monthly | monthly | booking`, and the
// billing screen's `chosen` state is already a key in that space — so a
// choice made on the marketing page, a choice restored after signup and a
// choice made by pressing a row are the same value, and there is nothing to
// convert. A second shape here is how the marketing page and the checkout
// start to disagree about what was bought.
//
// **AND IT VALIDATES RATHER THAN TRUSTS.** These come out of a URL anybody can
// type. An unknown value is `null` — nothing selected — never a default: a
// default here is a pre-selected plan arriving from a query string, which is
// the one thing `/pricing`'s whole shape exists to refuse (AB 2863, and the
// FTC's Adobe complaint). `?offer=founding` is deliberately NOT read for
// price: the database decides who is founding, and `create-business` already
// refuses to believe that parameter.

const TERMS = ["annual-upfront", "annual-monthly", "monthly"];

/** The `quotes` key a URL asks for, or null. `search` is a query string. */
export function planChoice(search) {
  const p = new URLSearchParams(search || "");
  const plan = p.get("plan");
  const term = p.get("term");
  if (plan === "booking") return "booking";
  // A term with no plan still means the website plan: `/pricing`'s three rungs
  // are ways to pay for it, and that is the shape the URL has always had.
  if (TERMS.includes(term)) return term;
  return null;
}

/** What `subscribe` has to be called with for a given key. */
export function planAndTerm(key) {
  return key === "booking"
    ? { plan: "booking", term: "monthly" }
    : { plan: "website", term: TERMS.includes(key) ? key : "annual-monthly" };
}

/** The query string that carries a choice to the next screen, or "". */
export function planQuery(key) {
  if (key === "booking") return "plan=booking";
  return TERMS.includes(key) ? `plan=website&term=${key}` : "";
}
