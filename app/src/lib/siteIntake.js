// THE WEBSITE BRIEF — the questions and the steps, with no React and no
// browser in them. Same reason `lib/setup.js` is its own file: the count is
// printed in more than one place and a second copy is how two screens come to
// disagree.
//
// REWRITTEN 2026-09-10 to his notes, and five of them change the SHAPE rather
// than the wording:
//
//   1. **No note box on every question.** *"There's just a button in every
//      single one to add a note. We don't really need that."* A multiple-choice
//      question gets an **Other** option instead, which is where the extra
//      answer actually belongs — the note box was a general-purpose escape
//      hatch bolted to questions that mostly did not need one.
//   2. **No "why we ask".** *"We don't need this."* The reasons were written
//      for us; on the screen they turned a form into a lecture, which is his
//      own copy rule. They live in `docs/tenant-site-intake-form.md`.
//   3. **The examples are walked, one per screen**, with a reaction under each
//      — liked / not, what specifically, and a box. Both directions: *"we also
//      need stuff saying here's negatives that I don't like and why."*
//   4. **Only HIS sites are in it.** /ex1 … /ex5. The ten numbered pages are
//      deleted (`scripts/build-examples.mjs`) — they were in this list only
//      because they were the URLs that existed, which is the harm he named.
//   5. **Some answers are not multiple choice.** A colour is a colour picker,
//      photographs are an upload, other people's sites are a list of links.
//      *"Rather than a test they have to take."*
//
// THE COPY RULE HE RESTATED, and it binds every string in this file: *"Who's
// talking like this? Just be like, here's some example websites, choose the
// ones you like."* No reassurance, no explaining what the control already
// says, no telling them what we already know about their own business.

// HIS OWN SITES, AND ONLY HIS. `scripts/build-examples.mjs` serves these at
// /ex1 … /ex5; `kind` picks the little drawn page the card shows before the
// real one loads.
export const EXAMPLES = [
  ["/ex1", "Prime Mobile Detailing", "A big photo up top. Three pages.", "photo"],
  ["/ex2", "Delgado Mobile Detailing", "Dark, with the work drawn out step by step.", "move"],
  ["/ex3", "Ballantyne Mobile Detailing", "The whole price list on the page. Three colors to pick from.", "facts"],
  ["/ex4", "Kinzie Mobile Detailing", "Light and papery. A real before-and-after slider.", "light"],
  ["/ex5", "Tampa Bay Auto Detail", "One huge photo and one loud red.", "dark"],
];

// WHAT THEY LIKED, IN WORDS WE HAND THEM. Closed word choice — people cannot
// describe visual taste unprompted and produce "clean and modern", which means
// nothing (docs/tenant-site-research-2026-09-10.md § 2a). Ten and nine: enough
// to find the answer in, few enough to read.
export const LIKED = [
  "The whole look", "The colors", "The photos", "The layout",
  "The wording", "How it moves", "Easy to read", "Looks expensive",
  "Feels local", "Straight to the point",
];
export const DISLIKED = [
  "Too busy", "Too plain", "Too dark", "Too much movement",
  "Not enough movement", "Hard to read", "Too much text",
  "Couldn't find the price", "Not my kind of business",
];

// The three either/ors, asked in pictures. TWO options, never three — past
// three people fatigue and pick at random.
export const EITHER = [
  ["H1", "Movement, or still?", ["move", "Moves as you scroll"], ["still", "Sits still"]],
  ["H2", "Photos big, or facts big?", ["photo", "The car fills the screen"], ["facts", "Words and numbers lead"]],
  ["H3", "Dark, or light?", ["dark", "Dark"], ["light", "Light"]],
];

const q = (id, question, type, options, other, extra) =>
  ({ id, question, type, options, other, ...extra });

// WHAT THE ANSWER WILL SAY OUT LOUD, on the eight questions whose answer
// becomes a PROMISE. He was right that putting it under all 73 would be
// clutter — the point is to let somebody read a commitment before they make
// it, not to narrate the form back at them.
const SAYS = {
  A6: { Yes: "Fully insured." },
  B8: {
    "Same day": "Often same-day.",
    "A few days": "Usually a few days' wait.",
    "A week or two": "Booking a week or two ahead.",
    "A month or more": "Booking well ahead — plan for a month.",
  },
  E2: {
    "I redo it": "Not happy? We come back and redo it.",
    "Partial refund": "Not happy? We'll refund part of it.",
    "Full refund": "Not happy? Full refund, no argument.",
    "Case by case": "Not happy? Tell us and we'll put it right.",
  },
  F5: { Yes: "Gift cards available.", "At Christmas": "Gift cards at Christmas." },
  G4: { Yes: "Text us any time.", "Only after booking": "We'll text you once you're booked." },
  G5: {
    "Within the hour": "Usually replies within the hour.",
    "Same day": "Usually replies the same day.",
    "Within a day": "Replies within a day.",
    "When I can": "We'll get back to you as soon as we can.",
  },
  D4: {
    "First name and initial": "Reviews shown as “Sarah M.”",
    "First name only": "Reviews shown as “Sarah”",
    Anonymous: "Reviews shown without a name.",
    "Don't use them": "No reviews on the site.",
  },
  C6: { Yes: "Some jobs quoted after we've seen the car." },
};
const says = (id) => (v) => SAYS[id]?.[v] ?? "";

// REAL SENTENCES OFF REAL SITES, for the questions the survey proved nobody
// answers: a rain policy exists on ONE detailer's site in fifty-two, a
// cancellation policy on seven. Nobody objects to having a rain policy —
// writing one from an empty box is just a different task from correcting a
// sentence, and only one of them gets done standing up.
const STARTERS = {
  A7: [
    "If you're not happy with any part of it, we come back and redo it free.",
    "Every job is checked before we leave. Anything missed, we're back within 7 days.",
    "Coatings carry a written warranty. Everything else is covered by our redo promise.",
  ],
  E1: [
    "We're fully insured. Anything we damage, we put right at our cost.",
    "Tell us straight away and we'll sort it — repair, replace or refund.",
  ],
  E3: [
    "We work through light rain. Heavy rain and we move you to the next dry slot, free.",
    "We'll ring the morning of if the weather looks bad and rebook you at no charge.",
    "Interior work goes ahead whatever the weather. Exterior we reschedule.",
  ],
  E4: [
    "If it needs more work than described we'll show you before we start and agree a price.",
    "We'll ring you with a revised quote before touching it.",
    "Heavy pet hair, smoke or sand adds time — we tell you on arrival, never after.",
  ],
  F1: [
    "Cancel more than 24 hours ahead and there's no charge.",
    "48 hours' notice please. Less than that and the deposit is kept.",
    "Just let us know as early as you can and we'll move you.",
  ],
  F2: [
    "A no-show is charged in full.",
    "We wait 15 minutes, then it counts as a cancellation.",
    "First one's free. After that we ask for a deposit.",
  ],
};
const starters = (id) => STARTERS[id];

export const STEPS = [
  { key: "hello", name: "Start", kind: "hello", title: "Let's build your website." },

  // ── the walk. One site per screen, with a reaction under it. ────────────
  ...EXAMPLES.map(([href, name, note, kind], i) => ({
    key: `look${i + 1}`, name: `Site ${i + 1}`, kind: "look",
    site: { href, name, note, kind, n: i + 1 },
    title: name,
  })),

  { key: "others", name: "Other sites", kind: "sites",
    title: "Any other sites you want to show us?",
    lede: "Paste anything — detailing or not. Say what you like or hate about each one." },

  { key: "you", name: "You", title: "You",
    qs: [
      q("A1", "The name as it should appear on the site — punctuation and all", "text", null, false, { req: true }),
      q("A2", "For the About page: how you started, and how long you have been at it", "long"),
      q("A5", "Your face and name on the site?", "one",
        ["Face and name", "Name only", "Neither"], true),
    ] },

  { key: "work", name: "Your work", title: "What you do, and where",
    qs: [
      q("A3", "What should the site say makes you different from the detailer three towns over?", "long"),
      q("A4", "Which towns should the site say you cover?", "long", null, false, { req: true }),
      q("A8", "What should someone be able to do on the first screen?", "one",
        ["Book", "Ring you", "Get a quote", "See prices", "See your work"], true, { req: true }),
    ] },

  { key: "promise", name: "Promises", title: "What the site can promise",
    lede: "Leave one blank and the site says nothing about it.",
    qs: [
      q("A6", "Can the site say you are insured?", "one", ["Yes", "Not yet", "In progress"], true, { req: true, says: says("A6") }),
      q("A7", "What guarantee should the site make?", "long", null, false, { starters: starters("A7") }),
      q("A12", "Anything the site must never say?", "long", null, false, { req: true }),
    ] },

  { key: "show", name: "Photos and prices", title: "Photos and prices",
    qs: [
      q("A10", "Photos of your work, for the site", "photos", null, false, { req: true }),
      q("A9", "Should prices be on the site?", "one",
        ["Yes, all of them", "A “from” price", "No, quote on request"], true, { req: true }),
    ] },

  { key: "feel", name: "Look", kind: "either", title: "How it should look",
    qs: [
      q("H6", "Should the site read serious and premium, or friendly and local?", "one",
        ["Serious and premium", "Friendly and local", "Somewhere between"], true, { req: true }),
      q("H5", "Colors for the site", "color", null, false, { req: true }),
      q("H7", "Any wording the site has to use word for word?", "long"),
    ] },

  { key: "where", name: "Where", title: "Where you work",
    qs: [
      q("B3", "Does the site need an address people can drive to?", "one", ["Yes", "No, I go to them", "Both"], true),
      q("B4", "What should the site tell people to have ready?", "many",
        ["Outdoor tap", "Power socket", "A driveway", "Shade", "A parking space", "Nothing, I carry it all"], true),
      q("B2", "What should the site say about travel charges?", "text"),
      q("B5", "What should the site rule out?", "many",
        ["Apartment or condo lots", "Public streets", "Parking garages", "None of these are a problem"], true),
      q("B6", "Any local rules the site should mention?", "long"),
      q("B8", "How soon should the site suggest you can come out?", "one",
        ["Same day", "A few days", "A week or two", "A month or more", "It swings"], true, { says: says("B8") }),
      q("B7", "Should the site have a section for businesses — dealerships, fleets, offices?", "one",
        ["Yes", "No", "I'd like to"], true),
    ] },

  { key: "jobs", name: "The jobs", title: "The work itself",
    qs: [
      q("C2", "Which job should the site push hardest?", "long"),
      q("C1", "Which job should the site quietly steer people away from?", "long"),
      q("C3", "Which of these should the site give its own section?", "many",
        ["Ceramic coating", "Paint correction", "PPF", "None of these"], true),
      q("C5", "Anything unusual the site should list?", "many",
        ["Boats", "Motorcycles", "RVs", "Engine bays", "Headlight restoration", "Pet hair", "Smoke odor"], true),
      q("C6", "Should the site offer a quote as well as a price?", "one", ["Yes", "No"], false, { says: says("C6") }),
      q("C4", "Should the site name the products you use?", "text"),
      q("C7", "How loud should your monthly plans be?", "one",
        ["Front and center", "Mentioned", "Quiet", "I don't offer them"], true),
      q("C8", "So the site does not over-promise: full-time, or alongside another job?", "one",
        ["Full-time", "Part-time", "Weekends"], true),
    ] },

  { key: "proof", name: "Proof", title: "Proof",
    qs: [
      q("D1", "Will the photos on the site be yours?", "one", ["All mine", "Mostly mine", "Some are stock"], true),
      q("D2", "A wrapped van or signed truck the site could show?", "one",
        ["Yes", "No", "Not yet"], true),
      q("D3", "What rating and how many reviews should the site show?", "text"),
      q("D4", "How should the site credit a review?", "one",
        ["First name and initial", "First name only", "Anonymous", "Don't use them"], true, { says: says("D4") }),
      q("D5", "Certifications the site should show?", "long"),
      q("D6", "Video for the site?", "one", ["Yes, plenty", "A bit", "None"], true),
      q("D7", "Any press or local mentions the site should carry?", "long"),
    ] },

  { key: "awkward", name: "Policies", title: "The awkward ones",
    lede: "These go on the site as your policy. One site in fifty-two has a rain policy — it is free to be the one that does.",
    qs: [
      q("E1", "What should the site say happens if something gets damaged?", "long", null, false, { starters: starters("E1") }),
      q("E2", "What should the site promise if someone is not happy?", "one",
        ["I redo it", "Partial refund", "Full refund", "Case by case"], true, false, { says: says("E2") }),
      q("E3", "What should the site say about rain?", "long", null, false, { starters: starters("E3") }),
      q("E4", "What should the site say if a car is much worse than described?", "long", null, false, { starters: starters("E4") }),
      q("E6", "Which of these should the site say you will work on?", "many",
        ["Brand-new", "Leases", "Wraps", "PPF", "Matte paint", "None of these"], true),
      q("E5", "Minimum charge, if the site should show one", "text"),
      q("E7", "A license or permit number the site has to display?", "text"),
    ] },

  { key: "money", name: "Money", title: "Money",
    qs: [
      q("F1", "What should the site say your cancellation policy is?", "long", null, false, { starters: starters("F1") }),
      q("F2", "And what it says about a no-show", "long", null, false, { starters: starters("F2") }),
      q("F3", "Which ways to pay should the site list?", "many",
        ["Card", "Cash", "Venmo", "Zelle", "Cash App", "PayPal", "Invoice", "Check"], true),
      q("F6", "Which discounts should the site advertise?", "many",
        ["Military", "First responder", "Senior", "Student", "Repeat customer", "None"], true),
      q("F5", "Should the site sell gift cards?", "one", ["Yes", "No", "At Christmas"], true, { says: says("F5") }),
    ] },

  { key: "reach", name: "Contact", title: "How people reach you",
    qs: [
      q("G1", "Which number should the site use?", "text"),
      // POINT AT THE PAGE INSTEAD OF READING A LABEL. A chip that says
      // "Footer only" is a description of a place; this is the place.
      q("G2", "Where on the page should the number go?", "place", ["top", "hero", "foot"]),
      q("G4", "Should the site invite text messages?", "one", ["Yes", "No", "Only after booking"], true, { says: says("G4") }),
      q("G5", "What should the site promise about how fast you reply?", "one",
        ["Within the hour", "Same day", "Within a day", "When I can"], true, { says: says("G5") }),
      q("G3", "Should the site show your email?", "one", ["Yes", "No"], true),
      q("G7", "Should the site have a contact form as well as booking?", "one", ["Yes", "No"], true),
      q("G6", "Which socials should the site link — and which should it leave off?", "long"),
      q("G8", "Should the site be in Spanish too?", "one",
        ["No", "Whole site", "Booking part only"], true),
    ] },

  { key: "launch", name: "Launch", title: "Things that hold a launch up",
    qs: [
      q("I1", "Do you own a web address for it? Which registrar, and have you got the login?", "text"),
      q("I2", "If not, what should the address be?", "text"),
      q("I3", "Is there a site now — what is wrong with it, and who controls it?", "long"),
      q("I7", "Have you got a logo for it?", "one",
        ["A vector file (.ai .svg .eps)", "A PNG or JPG", "A photo of one", "No logo"], true),
      q("I4", "Is there a business email on that address?", "one", ["Yes", "No", "Don't know"], true),
      q("I5", "Is your Google Business Profile claimed and verified?", "one", ["Yes", "No", "Don't know"], true),
      q("I8", "Anything already written the site could use? Flyer text, an Instagram bio.", "long"),
      q("I9", "Anyone else who has to approve the site?", "text"),
    ] },

  { key: "growth", name: "Growth", title: "Where the work comes from",
    qs: [
      q("J1", "Where do people find you today?", "many",
        ["Word of mouth", "Instagram", "Google", "Facebook", "A sign on the van", "Ads"], true),
      q("J2", "What should the site bring you more of?", "long"),
      q("J4", "Any season the site should push?", "long"),
      q("J3", "Will you send ads to the site?", "one", ["Yes", "No", "I've tried"], true),
      q("J5", "Should the site ask people to sign up for offers and reminders?", "one",
        ["Yes", "No", "Maybe later"], true),
    ] },

  { key: "end", name: "Anything else", kind: "end", title: "Anything else",
    qs: [
      q("K3", "Must have on the site", "long"),
      q("K4", "Must not have", "long"),
      q("K1", "Anything about your business the site should say that we did not ask?", "long"),
      q("K2", "Anything on this form you weren't sure how to answer?", "long"),
    ] },
];

// CUT 2026-09-10 and worth recording so nobody re-adds them: **tips** ("do you
// take tips, should the site mention it") — he named it, and it changes no
// word on a page. **F4** is gone with it. Rain and the unhappy customer STAY
// against the same complaint, because both become published policy text and
// 51 of 52 real sites have neither (docs/tenant-site-research-2026-09-10.md
// § 1c) — that is the cheapest way for a detailer's site to look more
// professional than the trade.

// Every question, in order, plus the trio the either/or step draws itself and
// the per-site reactions, or a finished form would count short.
export const ALL = STEPS.flatMap((s) => [
  ...(s.kind === "either" ? EITHER.map(([id]) => ({ id })) : []),
  ...(s.kind === "look" ? [{ id: `look${s.site.n}` }] : []),
  ...(s.qs ?? []),
]);

export const answered = (v) => {
  if (Array.isArray(v)) return v.length > 0;
  // **EVERY OBJECT-SHAPED ANSWER, not just the one this was written for.** It
  // knew about a site reaction (`verdict`) and nothing else, so the photos
  // question — whose answer is `{ have }` — counted as unanswered for ever.
  // With `req` on it that made the step impossible to leave: Continue disabled,
  // Skip hidden, and the only way out was closing the form. Found by walking
  // it; no console error, and the control looked answered on screen.
  if (v && typeof v === "object") {
    return !!(v.verdict || v.have || v.url || v.note || v.chips?.length || v.files?.length);
  }
  return !!(v && String(v).trim());
};

export function intakeProgress(answers) {
  const a = answers ?? {};
  return { done: ALL.filter((x) => answered(a[x.id])).length, total: ALL.length };
}

export const intakeState = (row) => {
  if (!row) return "none";
  if (row.submitted_at) return "sent";
  if (row.dismissed) return "dismissed";
  return "started";
};
