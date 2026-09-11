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
// REBUILT 2026-09-10 — SETUP IS A WALK THROUGH THE REAL SETTINGS SCREENS.
//
// His instruction, said three times in one message: *"everything in the admin
// dashboard should be completely filled out just from that initial first-run
// setup."* And he said how: *"you could just completely reuse basically every
// single GUI that's already in the admin dashboard, but have it as a form
// layout where you settle a stuff, then press continue, going to every single
// page."*
//
// **THE FOURTH COLUMN IS A KEY INTO `screens/more/index.js`, and that is the
// whole rebuild.** The seven bespoke editors this form used to carry are gone.
// They were small copies of screens that already existed, which is why setup
// asked for ONE open and close time for the whole week while the real Hours
// screen has always done days properly — his complaint, and the kind of drift
// a second copy guarantees. A step now renders the settings screen itself, so
// there is one editor per thing in this product and setup cannot fall behind
// it again.
//
// **THE ORDER IS STILL §13a's ORDER** — what you sell, then when you work, then
// who you are — so a detailer who quits after two steps still has a bookable
// page. What follows those is what a WEBSITE needs, which is why photos,
// reviews and the FAQ are here at all: they were unreachable from setup, and a
// detailer who never opened the gear never had them.
//
// **THE FOUR OLD KEYS THAT SURVIVE KEEP THEIR NAMES** — `hours`, `where`,
// `promos`, `colour`. They are stored in `business_settings.setup.done` on
// every business that has run setup, and renaming one silently un-does a step
// somebody finished. `services` and `addons` merge into `catalog` because one
// screen answers both; `contact` becomes `info` for the same reason.
// **THE FIFTH COLUMN IS WHAT THE STEP IS FOR — his review, 2026-09-10:
// *"have some more explaining on what they are filling out."*** A step used to
// be a question and then a settings screen, and the question is a HEADING: it
// names the step and says nothing about what answering it changes. The
// sentence does the other job — what this one setting decides, out in the
// world, for a customer.
//
// **IT MUST NOT RESTATE THE HEADING** (his rule, 2026-09-01, on finding
// *"Mobile — we go to them"* on a job record: *"no duh… it feels the need to
// explain literally every single thing"*). The test each of these has to pass
// is the same one: does it add a fact the heading does not already carry? So
// none of them says "here you set your hours"; each says what happens if you
// do, or what a customer sees afterwards.
//
// **AND THE PHOTO STEP IS GONE — the other half of the same note: *"remove the
// image upload step."*** It was the one step a detailer cannot finish on their
// first morning: it needs photographs of finished cars, which are on a phone
// somewhere or do not exist yet. A step nobody can answer is a hole in the
// progress rule that never fills, and the rule's whole purpose is to be an
// instruction to come back. **The screen is not gone** — Photo gallery is
// still on Business, and `SCREENS.gallery` still opens it; it is only no
// longer asked for before a detailer has taken a single booking.
//
// `gallery` may still be in `business_settings.setup.done` on a business that
// finished it before today. That is harmless: `setupProgress` counts what is
// IN `STEPS`, so the extra key is ignored rather than counted, and the total
// falls from twelve to eleven for everybody at the same moment.
export const STEPS = [
  ["catalog", "What do you charge for?", "Services", "catalog"],
  ["hours", "When are you open?", "Hours", "hours"],
  ["where", "Where does the work happen?", "Where you work", "rules"],
  ["info", "Who are you?", "Your details", "info"],
  ["colour", "What color is yours?", "Your color", "appearance"],
  ["reviews", "What people say about you", "Reviews", "reviews"],
  ["faq", "Questions customers ask", "FAQ", "faq"],
  ["payments", "How you get paid", "Getting paid", "payments"],
  ["promos", "Running a discount?", "Promo code", "promos"],
  ["plans", "Monthly plans", "Plans", "plans"],
  ["templates", "Messages you send", "Messages", "templates"],
];

// WHY IT IS A MAP AND NOT A FIFTH COLUMN OF `STEPS`. A step is four strings —
// key, question, short name, screen — and `tests/setup-progress.test.mjs` § 1
// asserts exactly that shape, because the fourth column is what makes a step
// render anything at all. A sentence is not part of that shape: it is copy,
// and a step with no sentence is a step rather than a broken one. Keyed on the
// step key, so the two lists cannot drift out of order the way two parallel
// arrays would.
export const WHY = {
  catalog:
    "Every service you add becomes a choice on your booking page, at the price you set here. Add-ons are the extras a customer can tick on top.",
  hours:
    "A customer can only pick a time inside these hours. Close a day here and nobody can book it.",
  where:
    "Mobile means you drive to them, drop-off means they come to you. You can offer both — this is the first thing your booking page asks a customer.",
  info:
    "Your name, your phone number and how to reach you. It sits at the top of your booking page and at the bottom of every email a customer gets.",
  colour:
    "One color, used on your booking page and through this dashboard. The one already on your van or your cards is usually the right answer.",
  reviews:
    "Type in what customers have already told you elsewhere. Nothing is imported and nothing is checked — these are yours to keep and to use.",
  faq:
    "The three or four you answer by text every week. Answering them here is what stops the texts.",
  payments:
    "Turn on the ways you actually take money. A customer sees them on their booking, so they know what to bring.",
  promos:
    "A code somebody types while booking to take money off. Skip this if you are not running one — you can add one any time.",
  plans:
    "A set price each month for a customer who wants you back on a rhythm. Leave it empty if you only do one-off jobs.",
  templates:
    "The texts you fire off from a job — on my way, running late, all done. Write them once here and it is one tap on the day.",
};

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
// **TWO OF THE SEVEN STOPPED DERIVING ON 2026-09-06, AND THE OWNER ASKED FOR
// IT DIRECTLY** after `docs/final-pass.md` finding 5: a business ten seconds
// old read *2 of 7 done*. The two were `hours` and `contact`, and the reason
// they were wrong is the same reason and it is structural rather than a
// miscount:
//
// **BOTH ARE SEEDED AT BIRTH, so derivation cannot tell ANSWERED from BORN.**
// `newBusiness.ts` gives every business weekdays 09:00-17:00 so its booking
// page can be booked from the first second, and `contact_email` arrives with
// the invite. Reading the database therefore says *yes* about a question
// nobody has been asked. The other five cannot be seeded — a service, an
// add-on, a promo code and a colour only exist because somebody made one —
// so they still derive, which is the whole point of deriving.
//
// **A COUNT CANNOT RESCUE IT EITHER**, which is why the fix is not "compare
// against the default": `platform-admin`'s LIST view has only the number of
// open days, not the times, and Tue-Sat is five days exactly as Mon-Fri is.
// A rule that needs the times would be answerable in three of the four places
// that ask, and three of four is how the two figures start disagreeing.
//
// **THE BUSINESSES THAT PREDATE THE TRACKING ARE BACKFILLED**
// (`20260906009000_backfill_setup_marks.sql`) rather than told they are at
// zero. That is the same objection this file already records against a purely
// stored count, and it applies to a rule change exactly as it applied to the
// original: telling a configured business it has done nothing is both false
// and insulting.
export function setupProgress({ business, branding, settings, counts }) {
  const marked = new Set(settings?.setup?.done ?? []);
  // **THE NEW STEPS DERIVE NOTHING, and that is deliberate rather than lazy.**
  // The note above is the reason: derivation cannot tell ANSWERED from BORN,
  // and every one of the new steps has a seeded or empty-by-default state that
  // would answer for somebody. An empty gallery is what a new business has AND
  // what a detailer who has not got round to photos has. Only the three that
  // cannot exist without somebody making them still derive.
  const has = {
    catalog: (counts?.services ?? 0) > 0,
    promos: (counts?.promos ?? 0) > 0,
    colour: !!branding?.primary_color,
  };
  const done = new Set(STEPS.filter(([k]) => marked.has(k) || has[k]).map(([k]) => k));
  return { done, count: done.size, total: STEPS.length };
}
