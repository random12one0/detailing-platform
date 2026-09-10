// THE WEBSITE BRIEF — the questions, the steps and the arithmetic, with no
// React and no browser in them.
//
// Same reason `lib/setup.js`, `client-list.js` and `accountant-export.js` are
// their own files: this list is printed in more than one place (the wizard's
// progress line, the "how far did they get" row on Business) and a second copy
// is how two screens come to disagree.
//
// **THE FULL REASONING FOR EVERY QUESTION IS
// `docs/tenant-site-intake-form.md`, and its § REVISED 2026-09-09 is the shape
// this file implements.** Three things from it bind any edit here:
//
//   1. **Nothing the product already knows is asked.** Services, prices,
//      hours, add-ons, promo codes, plans, the accent colour, the gallery,
//      reviews, FAQs and social links are all in the dashboard. Asking again
//      produces two answers and one of them goes stale.
//   2. **The first twelve are the whole brief.** Somebody who gives up after
//      ten minutes has still said enough to build a site, so those come first
//      and nothing else is allowed in front of them.
//   3. **Every question carries its own note box** — the owner's rule,
//      2026-09-06 — because *"we do offer that, but only for regulars"* is an
//      answer to a specific question and is lost if it has to wait for a
//      general box at the end.
//
// A question's `why` is for the detailer and is hidden behind a link on the
// screen. It is not a caption: it says something the question does not.

// OUR OWN WORKED SITES, WHICH ARE REAL PAGES ON THIS DOMAIN. `/examples` is
// the index and every one of these is a route Netlify serves
// (`scripts/build-examples.mjs` writes the rewrites). They open in a new tab,
// because a detailer who navigates away mid-form does not come back.
//
// THEY ARE A RANGE, NOT A MENU. Nobody picks "number 7"; what the answer is
// worth is the PATTERN across three or four favourites — dark or light,
// moving or still, photograph-led or price-led — which is why the question
// asks for several and why the three either/ors in step 8 ask the same thing
// a second way.
export const EXAMPLES = [
  ["/example1", "Northlight Detail", "A photograph as the ground, moderate motion", "photo"],
  ["/example3", "Halo", "Dark made of light, heavy motion", "move"],
  ["/example4", "Rinse City", "Painted ink, the price is the page", "facts"],
  ["/example2", "Holloway & Daughters", "Newsprint, a dense rate card, no animation", "facts"],
  ["/example5", "Meridian Auto Salon", "Warm cream, the quietest motion", "light"],
  ["/example7", "Tidewater", "A dusk sky, per-foot pricing, heavy motion", "move"],
  ["/example8", "Blackline", "Black and paper, the ground flips", "dark"],
  ["/example9", "Vera Interior Care", "Clinical light, one column", "light"],
  ["/example10", "Cedar & Chrome", "Woven earth, staggered masonry", "still"],
  ["/example6", "Rail & Yard", "A blueprint grid, set in mono", "facts"],
  ["/ex1", "Prime Mobile Detailing", "Photograph ground, sticky dock, three pages", "photo"],
  ["/ex3", "Ballantyne Mobile Detailing", "Three colourways, the whole price list", "still"],
];

// The three visual either/ors. **TWO OPTIONS, NEVER THREE OR MORE** —
// `docs/tenant-site-intake-research-2026-09-07.md`: a non-designer cannot see
// a small difference, and past three options people fatigue and pick at
// random. Each pair has to look plainly unalike; `kind` picks which little
// page the screen draws.
export const EITHER = [
  ["H1", "Movement, or stillness?", ["move", "Things move as you scroll"], ["still", "Everything sits still"]],
  ["H2", "Photographs big, or facts big?", ["photo", "The car fills the screen"], ["facts", "The words and numbers lead"]],
  ["H3", "Dark, or light?", ["dark", "Dark"], ["light", "Light"]],
];

const q = (id, question, why, type, options) => ({ id, question, why, type, options });

// STEPS · one screen each. Short screens on purpose: this is a next-next form
// and a screen with eight boxes on it is a page, which is the thing people
// abandon. `kind` marks the three screens that are not a list of questions.
export const STEPS = [
  { key: "hello", name: "What this is", kind: "hello",
    title: "Let's build your website." },

  { key: "looks", name: "The look", kind: "looks",
    title: "Which of these would you rather be?",
    lede: "Open a few. Tick the ones you like — three or four is plenty, and there is no wrong answer." },

  { key: "you", name: "You", title: "First, you.",
    qs: [
      q("A1", "Your business name, exactly as it should appear.",
        "Including whether it is LLC, Detailing or Detail, and any punctuation. It goes in the logo, the browser tab, the footer, every email and on Google — and every site gets it wrong once.", "text"),
      q("A2", "How long have you been doing this, and how did you start?",
        "Two or three sentences in your own words. This becomes your About section, and it is the one thing on a website nobody can convincingly write for you.", "long"),
      q("A5", "Do you want your face and your name on it?",
        "A one-person mobile business sells on the person far more than a shop does. Some detailers want their face on it; some would rather look bigger than one van. Both are right and we cannot guess which.", "one",
        ["My face and my name", "My name, not my face", "Neither"]),
    ] },

  { key: "work", name: "Your work", title: "What you do, and where.",
    qs: [
      q("A3", "In one sentence, what makes yours different from the detailer three towns over?",
        "If you cannot say it, the site cannot claim it — and we will not make something up on your behalf.", "long"),
      q("A4", "Name the towns, suburbs or neighbourhoods you cover — not a radius.",
        "“Within 25 miles” means nothing to somebody who does not know where you start from. Place names are also exactly what people type into Google.", "long"),
      q("A8", "What should somebody be able to do on the very first screen, before scrolling?",
        "There is room for one. Everything else moves down the page.", "one",
        ["Book me in", "Ring me", "Ask for a quote", "See my prices", "See my work"]),
    ] },

  { key: "promise", name: "Promises", title: "What the site is allowed to promise.",
    lede: "Where you leave one of these blank, the site says nothing at all about it — which is safer than a vague sentence a customer later quotes back at you.",
    qs: [
      q("A6", "Are you insured?",
        "We will not print “fully insured” on a website without a yes. It is the most common unearned claim in this trade and it is the one that gets a small business sued.", "one",
        ["Yes", "Not yet", "In progress"]),
      q("A7", "What do you guarantee, exactly?",
        "“Satisfaction guaranteed” means nothing and invites the worst possible reading. A specific promise is both stronger and safer.", "long"),
      q("A12", "Is there anything you must NOT say?",
        "A word you hate, a claim you will not make, a phrase a competitor has worn out.", "long"),
    ] },

  { key: "show", name: "What to show", title: "Photographs and prices.",
    qs: [
      q("A10", "What photographs have you got, and can we use them?",
        "Before-and-after photos are the single most important thing on a detailing site. Nothing else convinces people as well and nothing else is as often missing.", "one",
        ["A phone full of them", "A few good ones", "Almost none", "Some, but they are not mine"]),
      q("A9", "Should your prices be on the site?",
        "Your booking page has them either way. The website is a separate decision and it changes the whole shape of the page — hiding prices brings more enquiries and fewer bookings; showing them does the opposite.", "one",
        ["Yes, all of them", "A “from” price only", "No — quote on request"]),
      q("A11", "Name two or three websites — any trade — that you like the look of.",
        "The fastest and most reliable read on taste there is. They do not have to be detailing sites.", "long"),
    ] },

  { key: "feel", name: "The feel", kind: "either",
    title: "Point at the one you would rather be.",
    qs: [
      q("H6", "Serious and premium, or friendly and local?",
        "Two different websites, and both are correct businesses.", "one",
        ["Serious and premium", "Friendly and local", "Somewhere between"]),
      q("H5", "Do you have brand colours already — from a wrap, a business card, a logo?",
        "You have already picked an accent colour in your dashboard and the site uses it. This is about anything else that is already yours; a van livery is a brand nobody thinks to mention.", "text"),
      q("H7", "Is there wording you use that has to stay?",
        "A tagline, a phrase, the way you describe the work.", "long"),
    ] },

  { key: "where", name: "Where you work", title: "The edges of your patch.",
    qs: [
      q("B3", "Can people bring a car to you — a shop, a unit, your driveway?",
        "This changes the whole site. A mobile-only site should never show an address; a drop-off business must.", "one",
        ["Yes", "No, I go to them", "Both"]),
      q("B4", "When you arrive at a customer, what do you need?",
        "The most-skipped question on any intake and the one that ruins jobs. Somebody in a flat with no outdoor tap needs to know before they book, not when you are standing there.", "many",
        ["Outdoor tap", "Power socket", "A driveway", "Shade", "A parking space", "Nothing, I carry it all"]),
      q("B2", "Do you charge for travel? Past what point, and how much?",
        "If you do, the site has to say so. A travel fee revealed at the end is the most reliable one-star review in this trade.", "text"),
      q("B5", "Will you work in a flat or condo car park? On a public street? In a multi-storey?",
        "A different answer for every detailer, and each one is a booking that either should or should not happen.", "long"),
      q("B6", "Are there local rules that change what you can do?",
        "Water restrictions, HOA rules, a council that bans washing on the street. If you work rinseless because you have to, that is a selling point and the site should say so rather than hide it.", "long"),
      q("B8", "How far ahead are you usually booked?",
        "“Next available Thursday” is a promise. A site that implies same-day when you are three weeks out costs you the call and the goodwill.", "one",
        ["Same day", "A few days", "A week or two", "A month or more", "It swings wildly"]),
      q("B7", "Do you go to businesses — dealerships, fleets, offices?",
        "A completely different page and a completely different customer, and detailers often do it without ever mentioning it.", "one",
        ["Yes", "No", "I would like to"]),
    ] },

  { key: "jobs", name: "The jobs", title: "The work itself.",
    lede: "Your prices and service names are already in your dashboard. This is the words around them, which is a different thing.",
    qs: [
      q("C2", "What is the job you WANT more of?",
        "Decides what goes at the top of the page. It is often not the one you do most.", "long"),
      q("C1", "Is there a job you would rather not take?",
        "A site that quietly filters out the work you hate is worth more than one that brings in more of it.", "long"),
      q("C3", "Do you do any of these?",
        "Each one changes the site structurally — they need their own explanation, their own photographs and their own aftercare promise.", "many",
        ["Ceramic coating", "Paint correction", "PPF", "None of these"]),
      q("C5", "Do you do anything unusual?",
        "Boats, motorbikes, RVs, engine bays, headlight restoration, pet hair, smoke odour. The long tail is where a small detailer wins, and almost none of it ever reaches a services list.", "long"),
      q("C6", "Are there jobs you price only after seeing the car?",
        "If so the site needs a quote path as well as a booking path, or those customers simply leave.", "one",
        ["Yes", "No"]),
      q("C4", "What products do you use, and do you want them named?",
        "Some customers search for a brand. Some detailers do not want to be tied to one.", "text"),
      q("C7", "Should the site push your monthly plans, or keep them quiet?",
        "You have already set the plans up; this is only about how loud they are on the website. A plan is a different sales page from a one-off.", "one",
        ["Push them hard", "Mention them", "Keep them quiet", "I do not offer them"]),
      q("C8", "Is this full-time, or alongside another job?",
        "None of this goes on the site. It decides what the site is allowed to promise about how fast you answer and how soon you can come out.", "one",
        ["Full-time", "Part-time", "Weekends mostly"]),
    ] },

  { key: "proof", name: "Proof", title: "The half that actually sells.",
    lede: "Most of this is free credibility you already have and never thought to mention.",
    qs: [
      q("D1", "Are the photographs yours?",
        "A stock photo of somebody else's Porsche is spotted instantly, and it takes the rest of the page down with it.", "one",
        ["All mine", "Mostly mine", "Some are stock"]),
      q("D2", "Do you have a vehicle worth photographing — a wrapped van, a trailer, a signed truck?",
        "A liveried van is a ready-made brand and often the best photograph a detailer owns. Nobody ever offers it.", "one",
        ["Yes", "No", "Not yet"]),
      q("D3", "How many reviews do you have, and what is the rating?",
        "Decides whether reviews go at the top of the page or halfway down. Three good ones is a section; forty is a headline.", "text"),
      q("D4", "Can we quote reviews by name?", "", "one",
        ["First name and initial", "First name only", "Anonymous", "Do not use them"]),
      q("D5", "Any certifications, training or brand accreditations?",
        "Ceramic installers especially — often a requirement of the warranty, and always worth a badge on the page.", "long"),
      q("D6", "Do you have video? Even phone video.", "", "one",
        ["Yes, plenty", "A bit", "None"]),
      q("D7", "Have you been in a local paper, a club, a car meet, anything?",
        "Detailers never think to mention this and it is free credibility.", "long"),
    ] },

  { key: "awkward", name: "The awkward bit", title: "The questions nobody enjoys.",
    lede: "Every answer here is used literally, and a blank means the site stays silent on it.",
    qs: [
      q("E1", "What happens if something is damaged?",
        "If there is no answer the site says nothing. That is better than a woolly sentence a customer later reads as a promise.", "long"),
      q("E2", "What if the customer is not happy?", "", "one",
        ["I redo it", "Partial refund", "Full refund", "Case by case"]),
      q("E3", "What do you do about rain?",
        "Outdoor work in the open. Every mobile detailer has a policy and almost none of them have ever written it down.", "long"),
      q("E4", "What if the car is much worse than described?",
        "Pet hair, smoke, sand, a spill. The site can set the expectation and save you an argument in a driveway.", "long"),
      q("E6", "Do you work on any of these?",
        "Matte and wrapped paint need different chemicals. A detailer who does not touch them needs the site to say so plainly.", "many",
        ["Brand-new", "Leases", "Wraps", "PPF", "Matte paint", "None of these"]),
      q("E5", "Do you have a minimum charge?", "", "text"),
      q("E7", "Is there a licence, permit or registration number you have to display?",
        "Some states and councils require it on any advertising, and a website counts. Cheap to add, expensive to be missing.", "text"),
    ] },

  { key: "money", name: "Money", title: "Money and policies.",
    lede: "When you get paid is already set in your dashboard. These decide what the site says about it.",
    qs: [
      q("F1", "Your cancellation policy — how much notice, and what happens with less?",
        "Answer this even if you would say you do not have one. Everybody has one in practice, and writing it down is how it starts being honoured.", "long"),
      q("F2", "What happens on a no-show?", "", "long"),
      q("F3", "How can people pay?",
        "Detailers take payments the internet does not know about, and customers ask before they book.", "many",
        ["Card", "Cash", "Venmo", "Zelle", "Cash App", "PayPal", "Invoice", "Cheque"]),
      q("F6", "Any discounts you always honour?",
        "These are rarely in your promo table because they are given verbally — and they are exactly what people search for.", "many",
        ["Military", "First responder", "Senior", "Student", "Repeat customer", "None"]),
      q("F5", "Do you do gift cards?",
        "Almost every detailer says no and then says “actually, at Christmas”.", "one",
        ["Yes", "No", "At Christmas"]),
      q("F4", "Do you take tips? Should the site mention it?", "", "one",
        ["Yes, mention it", "Yes, do not mention it", "No"]),
    ] },

  { key: "reach", name: "Reaching you", title: "How people get hold of you.",
    qs: [
      q("G1", "Whose phone rings?",
        "Yours, a business line, a partner's, or nobody's because you would rather it did not ring at all. It decides how loudly the number appears — or whether it appears.", "text"),
      q("G2", "Should your phone number be on the site, or only the booking form?",
        "A site with a number on every page belongs to somebody who wants calls. Plenty of detailers hate the phone.", "one",
        ["On every page", "Once, in the footer", "Only after booking", "Not at all"]),
      q("G4", "Do you want to be textable?",
        "This trade runs on text. Some detailers want it and some will not give out a personal mobile.", "one",
        ["Yes", "No", "Only after booking"]),
      q("G5", "How fast do you normally reply?",
        "“Usually within an hour” is worth saying if it is true, and a complaint generator if it is not.", "one",
        ["Within the hour", "Same day", "Within a day", "When I can"]),
      q("G3", "Should your email be on the site?", "", "one", ["Yes", "No"]),
      q("G7", "Do you want a contact form as well as booking?",
        "Two different intents: “book me in” and “I have got a question”.", "one", ["Yes", "No"]),
      q("G6", "Which social accounts should be linked — and which exist but should NOT be?",
        "The second half matters more. A dormant Facebook page with one post from 2019 makes a business look closed.", "long"),
      q("G8", "Does any of this need to be in Spanish?",
        "Your booking page already speaks Spanish. The website is a separate decision and it is yours.", "one",
        ["No", "Yes, the whole site", "Yes, the booking part"]),
    ] },

  { key: "launch", name: "The launch", title: "The things that hold a launch up.",
    lede: "None of these is technical. They are all just things somebody has to go and find, and every one of them has delayed a real website.",
    qs: [
      q("I1", "Do you own a web address? Which registrar, and do you have the login?",
        "The single most common thing that stalls a launch.", "text"),
      q("I2", "If not, what would you like it to be? Two or three options.",
        "Your first choice is usually taken.", "text"),
      q("I3", "Is there a site now — what is wrong with it, and who controls it?",
        "An old site nobody can take down will outrank the new one. And what annoys you about it is the most useful thing you can tell us.", "long"),
      q("I7", "Do you have a logo, and in what form?",
        "A vector file is the difference between a crisp mark and a blurry one on a phone. A photograph of a logo is a week of back-and-forth.", "one",
        ["A vector file (.ai .svg .eps)", "A PNG or JPG", "A photo of one", "No logo"]),
      q("I4", "Do you have a business email on that address?",
        "Changing a web address's settings can break email, and that is not a surprise anybody should get.", "one",
        ["Yes", "No", "Do not know"]),
      q("I5", "Is your Google Business Profile claimed and verified?",
        "The most valuable free thing a local business owns, and very often unclaimed.", "one",
        ["Yes", "No", "Do not know"]),
      q("I8", "Do you have anything already written? Flyer text, an Instagram bio, a Facebook description.",
        "Your own words beat ours.", "long"),
      q("I9", "Who else needs to approve this?",
        "Finding out at the end is how a finished site gets rebuilt.", "text"),
    ] },

  { key: "growth", name: "Growth", title: "Where the work comes from.",
    qs: [
      q("J1", "Where do your customers come from today?",
        "Decides what the site is built to be good at.", "many",
        ["Word of mouth", "Instagram", "Google", "Facebook", "A sign on the van", "Ads"]),
      q("J2", "What do you want more of that you are not getting?", "", "long"),
      q("J4", "Is there a season?",
        "A site that says nothing in February when the work is in June is a wasted quarter.", "long"),
      q("J3", "Do you run ads?",
        "Changes whether the site needs a separate landing page from the home page.", "one",
        ["Yes", "No", "I have tried"]),
      q("J5", "Do you want an email list?",
        "The product can run one. Some detailers never will.", "one",
        ["Yes", "No", "Maybe later"]),
    ] },

  { key: "end", name: "Anything else", kind: "end", title: "Anything we missed?",
    qs: [
      q("K1", "Is there anything about your business, your customers or the way you work that we have not asked about and should have?", "", "long"),
      q("K2", "Is there anything on this form you were not sure how to answer?",
        "This is the question that makes the form better. A question people regularly skip is a badly worded question, and it gets rewritten.", "long"),
    ] },
];

// Every question on every step, in order. The either/or trio is not in a
// step's `qs` — the screen draws it from EITHER — so it is added here, or the
// counter below would say a finished form was three short.
export const ALL = STEPS.flatMap((s) =>
  (s.kind === "either" ? EITHER.map(([id]) => ({ id })) : []).concat(s.qs ?? []));

const answered = (v) => (Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim()));

// HOW MUCH OF IT IS DONE. Counted over the QUESTIONS rather than the steps,
// because a step is a container and somebody who answered two of eight on it
// has not finished it — and because the same figure is printed on Business,
// where "step 9 of 16" would mean nothing.
export function intakeProgress(answers) {
  const a = answers ?? {};
  const done = ALL.filter((x) => answered(a[x.id])).length;
  // The looks step is not a question and is counted separately, so a detailer
  // who only ticked examples still sees the bar move.
  return { done, total: ALL.length, picked: (a.looks ?? []).length };
}

// The one thing a caller outside the wizard asks. `null` means nobody has
// opened it, which is different from an empty draft.
export const intakeState = (row) => {
  if (!row) return "none";
  if (row.submitted_at) return "sent";
  if (row.dismissed) return "dismissed";
  return "started";
};
