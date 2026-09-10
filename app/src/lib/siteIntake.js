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
  ["/ex3", "Ballantyne Mobile Detailing", "The whole price list on the page. Three colours to pick from.", "facts"],
  ["/ex4", "Kinzie Mobile Detailing", "Light and papery. A real before-and-after slider.", "light"],
  ["/ex5", "Tampa Bay Auto Detail", "One huge photo and one loud red.", "dark"],
];

// WHAT THEY LIKED, IN WORDS WE HAND THEM. Closed word choice — people cannot
// describe visual taste unprompted and produce "clean and modern", which means
// nothing (docs/tenant-site-research-2026-09-10.md § 2a). Ten and nine: enough
// to find the answer in, few enough to read.
export const LIKED = [
  "The whole look", "The colours", "The photos", "The layout",
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

const q = (id, question, type, options, other) => ({ id, question, type, options, other });

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
      q("A1", "Business name, exactly as it should be written", "text"),
      q("A2", "How long have you been doing this, and how did you start?", "long"),
      q("A5", "Your face and name on the site?", "one",
        ["Face and name", "Name only", "Neither"]),
    ] },

  { key: "work", name: "Your work", title: "What you do, and where",
    qs: [
      q("A3", "What makes yours different from the detailer three towns over?", "long"),
      q("A4", "Which towns do you cover?", "long"),
      q("A8", "What should someone be able to do on the first screen?", "one",
        ["Book", "Ring you", "Get a quote", "See prices", "See your work"], true),
    ] },

  { key: "promise", name: "Promises", title: "What the site can promise",
    lede: "Leave one blank and the site says nothing about it.",
    qs: [
      q("A6", "Are you insured?", "one", ["Yes", "Not yet", "In progress"]),
      q("A7", "What do you guarantee?", "long"),
      q("A12", "Anything the site must never say?", "long"),
    ] },

  { key: "show", name: "Photos and prices", title: "Photos and prices",
    qs: [
      q("A10", "Have you got photos of your work?", "photos"),
      q("A9", "Should prices be on the site?", "one",
        ["Yes, all of them", "A “from” price", "No, quote on request"]),
    ] },

  { key: "feel", name: "Look", kind: "either", title: "How it should look",
    qs: [
      q("H6", "Serious and premium, or friendly and local?", "one",
        ["Serious and premium", "Friendly and local", "Somewhere between"], true),
      q("H5", "Your colours", "colour"),
      q("H7", "Any wording that has to stay?", "long"),
    ] },

  { key: "where", name: "Where", title: "Where you work",
    qs: [
      q("B3", "Can people bring a car to you?", "one", ["Yes", "No, I go to them", "Both"]),
      q("B4", "What do you need when you arrive?", "many",
        ["Outdoor tap", "Power socket", "A driveway", "Shade", "A parking space", "Nothing, I carry it all"], true),
      q("B2", "Do you charge for travel? From where, and how much?", "text"),
      q("B5", "Where won't you work?", "many",
        ["Flat or condo car parks", "Public streets", "Multi-storey car parks", "None of these are a problem"], true),
      q("B6", "Any local rules that change what you can do?", "long"),
      q("B8", "How far ahead are you usually booked?", "one",
        ["Same day", "A few days", "A week or two", "A month or more", "It swings"]),
      q("B7", "Do you do businesses — dealerships, fleets, offices?", "one",
        ["Yes", "No", "I'd like to"]),
    ] },

  { key: "jobs", name: "The jobs", title: "The work itself",
    qs: [
      q("C2", "Which job do you want more of?", "long"),
      q("C1", "Which job would you rather not take?", "long"),
      q("C3", "Do you do any of these?", "many",
        ["Ceramic coating", "Paint correction", "PPF", "None of these"], true),
      q("C5", "Anything unusual?", "many",
        ["Boats", "Motorbikes", "RVs", "Engine bays", "Headlight restoration", "Pet hair", "Smoke odour"], true),
      q("C6", "Any jobs you only price after seeing the car?", "one", ["Yes", "No"]),
      q("C4", "Which products do you use, and should we name them?", "text"),
      q("C7", "How loud should your monthly plans be?", "one",
        ["Front and centre", "Mentioned", "Quiet", "I don't offer them"]),
      q("C8", "Full-time, or alongside another job?", "one",
        ["Full-time", "Part-time", "Weekends"]),
    ] },

  { key: "proof", name: "Proof", title: "Proof",
    qs: [
      q("D1", "Are the photos yours?", "one", ["All mine", "Mostly mine", "Some are stock"]),
      q("D2", "A wrapped van, trailer or signed truck worth photographing?", "one",
        ["Yes", "No", "Not yet"]),
      q("D3", "How many reviews, and what rating?", "text"),
      q("D4", "Can we quote reviews by name?", "one",
        ["First name and initial", "First name only", "Anonymous", "Don't use them"]),
      q("D5", "Certifications, training or accreditations?", "long"),
      q("D6", "Any video?", "one", ["Yes, plenty", "A bit", "None"]),
      q("D7", "Been in a local paper, a club, a car meet?", "long"),
    ] },

  { key: "awkward", name: "Policies", title: "The awkward ones",
    lede: "These go on the site as your policy. One site in fifty-two has a rain policy — it is free to be the one that does.",
    qs: [
      q("E1", "If something gets damaged, what happens?", "long"),
      q("E2", "If the customer isn't happy?", "one",
        ["I redo it", "Partial refund", "Full refund", "Case by case"], true),
      q("E3", "What happens if it rains?", "long"),
      q("E4", "If the car is much worse than described?", "long"),
      q("E6", "Do you work on these?", "many",
        ["Brand-new", "Leases", "Wraps", "PPF", "Matte paint", "None of these"], true),
      q("E5", "Minimum charge?", "text"),
      q("E7", "Licence or permit number you have to show?", "text"),
    ] },

  { key: "money", name: "Money", title: "Money",
    qs: [
      q("F1", "Cancellation policy — how much notice, and what happens with less?", "long"),
      q("F2", "No-show?", "long"),
      q("F3", "How can people pay?", "many",
        ["Card", "Cash", "Venmo", "Zelle", "Cash App", "PayPal", "Invoice", "Cheque"], true),
      q("F6", "Discounts you always honour?", "many",
        ["Military", "First responder", "Senior", "Student", "Repeat customer", "None"], true),
      q("F5", "Gift cards?", "one", ["Yes", "No", "At Christmas"]),
    ] },

  { key: "reach", name: "Contact", title: "How people reach you",
    qs: [
      q("G1", "Whose phone rings?", "text"),
      q("G2", "Where should your number go?", "one",
        ["Every page", "Footer only", "Only after booking", "Nowhere"]),
      q("G4", "Text messages?", "one", ["Yes", "No", "Only after booking"]),
      q("G5", "How fast do you normally reply?", "one",
        ["Within the hour", "Same day", "Within a day", "When I can"]),
      q("G3", "Email on the site?", "one", ["Yes", "No"]),
      q("G7", "A contact form as well as booking?", "one", ["Yes", "No"]),
      q("G6", "Which socials should be linked — and which should not?", "long"),
      q("G8", "Any of it in Spanish?", "one",
        ["No", "Whole site", "Booking part only"]),
    ] },

  { key: "launch", name: "Launch", title: "Things that hold a launch up",
    qs: [
      q("I1", "Do you own a web address? Which registrar, and have you got the login?", "text"),
      q("I2", "If not, what would you like it to be?", "text"),
      q("I3", "Is there a site now? What's wrong with it, and who controls it?", "long"),
      q("I7", "Have you got a logo?", "one",
        ["A vector file (.ai .svg .eps)", "A PNG or JPG", "A photo of one", "No logo"]),
      q("I4", "Business email on that address?", "one", ["Yes", "No", "Don't know"]),
      q("I5", "Google Business Profile claimed and verified?", "one", ["Yes", "No", "Don't know"]),
      q("I8", "Anything already written? Flyer text, an Instagram bio.", "long"),
      q("I9", "Anyone else who has to approve this?", "text"),
    ] },

  { key: "growth", name: "Growth", title: "Where the work comes from",
    qs: [
      q("J1", "Where do your customers come from now?", "many",
        ["Word of mouth", "Instagram", "Google", "Facebook", "A sign on the van", "Ads"], true),
      q("J2", "What do you want more of?", "long"),
      q("J4", "Is there a season?", "long"),
      q("J3", "Do you run ads?", "one", ["Yes", "No", "I've tried"]),
      q("J5", "Want an email list?", "one", ["Yes", "No", "Maybe later"]),
    ] },

  { key: "end", name: "Anything else", kind: "end", title: "Anything else",
    qs: [
      q("K3", "Must have on the site", "long"),
      q("K4", "Must not have", "long"),
      q("K1", "Anything about your business we didn't ask about?", "long"),
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

const answered = (v) => {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0 && !!(v.verdict || v.chips?.length || v.note);
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
