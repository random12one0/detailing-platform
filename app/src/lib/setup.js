// The seven setup steps and how many of them are done — with no React and no
// browser in it.
//
// WHY IT IS ITS OWN FILE (roadmap 2.11 step 6 stage 7, 2026-09-02): the same
// reason `client-list.js` and `accountant-export.js` are. This number is
// printed in TWO places that must never disagree — the progress rule across
// the top of the setup form and the *"Finish setting up · N of 7 done"* row
// on Business — and it decides whether an established detailer is nagged
// forever. `tests/setup-progress.test.mjs` can only pin that if it can be
// imported without a DOM.

// key · the question the step asks · the two words under the progress rule
// (component inventory §1b: "STEP 3 OF 7 · YOUR SERVICES"). The question is
// the heading; the short name is what the progress line says, because "What
// do you charge for?" is not a name.
//
// SEVEN, AND WHERE THE SEVENTH CAME FROM. Screen designs §13a names SIX areas
// — business info, hours, services, add-ons, booking rules, promo codes — and
// §1b, the phone pass §14 and §13a's own resume row all say seven segments.
// Services and add-ons are one settings screen and two questions, which gets
// to six. The seventh is *Your colour*: the form collects what the BOOKING
// PAGE needs, which is the same test Business's eight rows pass (what a
// CUSTOMER meets), minus the two a detailer cannot answer on their first
// morning — Photo gallery needs photos, Reviews needs customers.
//
// THE ORDER IS §13a's ORDER — what you sell, then when you work, then who you
// are — so a detailer who quits after two steps still has a bookable page.
export const STEPS = [
  ["services", "What do you charge for?", "Your services"],
  ["addons", "Anything you can add to a job?", "Add-ons"],
  ["promos", "Running a discount?", "Promo code"],
  ["hours", "When are you open?", "Your hours"],
  ["where", "Where does the work happen?", "Where you work"],
  ["contact", "How does a customer reach you?", "Your details"],
  // A question like the other six. "Pick your colour." was an imperative in a
  // set of questions, which reads as the one heading somebody forgot.
  ["colour", "What colour is yours?", "Your colour"],
];

// HOW MANY OF THE SEVEN ARE DONE — the one number, read in two places.
//
// §1b's ruling is that a segment fills when a step is COMPLETED, never when
// it is passed, precisely so this figure and Business's "N of 7 done" cannot
// disagree. What that ruling does not say, and what building it made
// obvious: FIVE OF THE SEVEN CAN BE ANSWERED BY THE DATABASE. A business with
// three services has finished the services step whether or not it ever opened
// this form — and every business that existed before this change is in
// exactly that position, including the owner's own. A purely stored count
// would open Business on a fully configured business and tell it "0 of 7
// done", which is both false and insulting.
//
// So completion is DERIVED where the data can say, and the stored list
// (`business_settings.setup.done`) carries only what nothing else can.
//
// `where` is the one that can never be derived, and that is a fact about the
// schema rather than an oversight: `mobile_enabled` and `dropoff_enabled`
// both default to true, so "I do both" and "nobody has been asked" are the
// same two rows. It is the only step that stays open until somebody answers
// it, which is correct — it changes what the booking page asks the customer.
export function setupProgress({ business, branding, settings, counts }) {
  const marked = new Set(settings?.setup?.done ?? []);
  const has = {
    services: (counts?.services ?? 0) > 0,
    addons: (counts?.addOns ?? 0) > 0,
    promos: (counts?.promos ?? 0) > 0,
    hours: !!counts?.hoursOpen,
    where: false,
    contact: !!(business?.contact_phone || business?.contact_email),
    colour: !!branding?.primary_color,
  };
  const done = new Set(STEPS.filter(([k]) => marked.has(k) || has[k]).map(([k]) => k));
  return { done, count: done.size, total: STEPS.length };
}
