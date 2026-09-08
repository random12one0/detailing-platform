// ROADMAP 7.1 — what the two legal pages say, and the support line under
// every page on the marketing surface.
//
// IT IS A PLACEHOLDER IN THE ROADMAP'S SENSE AND NOT IN THE USUAL ONE. The
// roadmap says *"OWNER supplies real legal text later"*, and the tempting
// build is two pages of borrowed boilerplate about arbitration and governing
// law — clauses nobody here has decided, on a product with no lawyer yet.
// **Boilerplate is worse than nothing: it is a promise the owner has not
// made, in language he cannot check.**
//
// SO EVERY LINE BELOW IS A FACT ABOUT WHAT THIS PRODUCT ACTUALLY DOES, taken
// from the code and from what `/pricing` already PRINTS — the twelve-month
// term, the exit fee, the two weeks of retries, that nothing is deleted. Those
// are commitments the product has been making in public since 2026-09-05, so
// writing them down here invents nothing. **Anything that would be an
// invention is absent**, and both pages say plainly that a lawyer has not seen
// them yet.
//
// AND THE SUPPORT CONTACT IS THE SECOND COPY OF `_shared/platformBrand.ts`'s,
// for the wall that already forced two price tables: a Deno bundle cannot
// import out of `supabase/`. `tests/landing-pricing.test.mjs` pins them equal.

// MOVED TO `lib/support.js` ON 2026-09-06 (item G) — the dashboard needs the
// same address, and a second copy is a second thing to keep in step with the
// one the emails send from. Re-exported here so the pages that already read
// it from this file keep working.
export { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_LINE } from "../lib/support.js";

// WHO "WE" IS, IN ONE STRING. Both pages print it and nothing else hard-codes
// it, so correcting the legal structure is a one-line change.
//
// **ANDREW HAS NOT CONFIRMED THIS AND IT IS A GUESS AT HIS PAPERWORK.** Sole
// trader, a DBA on his own name, or an LLC are three different legal persons
// and only he knows which one signs. Ask before the first real sign-up; until
// somebody has actually agreed to these, changing it costs nothing.
export const ENTITY = "Andrew Dietrich, doing business as Detailing Platform";

// Printed at the top of both pages. It is the date the WORDS last changed, so
// move it when the words move and not when the file is touched.
export const EFFECTIVE = "8 September 2026";

export const NOT_YET_LAWYERED =
  "Written in plain English by the person who built this, and not yet reviewed by a lawyer. "
  + "It says what the product actually does today. If anything here turns out to conflict with the "
  + "final terms, the version that is better for you is the one that applies.";

export const TERMS = {
  label: "Terms",
  title: ["What you get,", "and what you owe."],
  lede: "The whole agreement in the words it was decided in. Every figure comes from the pricing page, which is the one that counts.",
  sections: [
    ["What this is",
     "A booking system for a detailing business, and — on the website plan — the website in front of it. You run your own business on it: your prices, your hours, your customers. We host it."],
    ["What you pay",
     "Whatever the pricing page said on the day you signed up, and that price stays yours for as long as the account stays open. It cannot be changed underneath you: the figures are copied onto your subscription the day you agree to them and are never read again."],
    ["The twelve-month plan",
     "Only the annual-paid-monthly plan carries a commitment. Leaving it early costs half of the months still to run, charged that day. The other two plans have no term and no exit fee. The exact numbers, and a worked example, are on the pricing page before you are ever asked for a card."],
    ["Renewals",
     "Every plan renews by itself at the price you signed up at, until you cancel. Cancelling is one button in your own settings, one confirmation, and the fee — if there is one — is printed before you press it. It is never behind an email to us."],
    ["If a payment fails",
     "We email you each time a payment is retried, for two weeks. If it still has not gone through, your booking page goes offline until it is paid. Nothing is deleted — your customers, your bookings and your settings are all exactly where you left them, and paying puts the page back."],
    ["Your customers' money",
     "We are not part of it. What your customers pay you is between you and them; we take nothing from it and hold none of it."],
    ["Your data is yours",
     "Your customer list, your bookings and your history belong to you, and you can have a copy of them at any time by asking."],
    ["Ending it",
     "You can close your account whenever you like. Tell us and we will delete your data; until you do, it stays where it is."],
  ],
};

export const PRIVACY = {
  label: "Privacy",
  title: ["What we hold,", "and who else sees it."],
  lede: "There is no advertising in this product and nothing here is sold. This page is the list of everywhere your information actually goes.",
  sections: [
    ["What we hold about you",
     "Your name, your business, your email address and phone number, and everything you set up — services, prices, opening hours, the wording of your emails. If you subscribe, the plan you chose and the invoices you have paid."],
    ["What we hold about your customers",
     "Whatever they type into your booking page: name, phone, email, the address you are going to, the vehicle, and anything they write in the notes. It is their information and it is yours to look after — we hold it for you and we do not use it for anything else."],
    // **THE DISCLOSURE THE OWNER ASKED FOR, 2026-09-06.** He wants his back
    // office to show him everything about a detailer and their clients, and
    // his own condition was that it be said out loud: *"it could be disclosed
    // in like the ToS or on the fine print that I do have the ability to see
    // information about the detailer and their clients."*
    //
    // **IT IS HERE RATHER THAN IN THE TERMS, and immediately after the
    // paragraph above, on purpose.** The sentence before this one says a
    // customer's details are "yours to look after" — which a detailer reads
    // as "and nobody else's". Leaving the correction three screens away in a
    // contract would make that sentence do the misleading. A thing a reader
    // will assume wrongly is disclosed where they assume it.
    //
    // It says WHO, WHAT and WHAT NOT, because a disclosure that only admits
    // access invites the worst reading of it.
    ["Who else can see it — us",
     "We can. Running the platform means we hold the keys to the database it lives in, so the person who runs this service can see what is in your account: your bookings, your figures, and your customers' details. We look when we are fixing something, when you ask us for help, and to keep an eye on whether your booking page is working. **Nothing here is ever sold, rented or handed to an advertiser, and no customer list is used to sell anything to anybody.** If that is not a trade you want, this is the paragraph to read twice before you sign up."],
    ["Card details",
     "We never see them. The card fields on the payment screen belong to Stripe and are served by Stripe; the number goes from the browser to them and never touches this product, this server or any log we keep."],
    // WAS "The four companies involved" UNTIL 2026-09-07, and it had become
    // untrue without anybody editing it: the Google button on the sign-in
    // screen appears by itself the moment the provider is switched on in
    // Supabase (`screens/Auth.jsx` reads /auth/v1/settings), and it was
    // switched on. **A count in a heading is a fact that rots** — so the
    // heading no longer carries one.
    ["The companies involved",
     "Supabase stores the database and runs the code. Netlify serves the pages. Resend sends the email. Stripe takes the payments. Google confirms who you are, but only if you choose the Google button instead of a password. Nobody else receives any of it, and none of them is paid to use it for anything of their own."],
    // ── GOOGLE SIGN-IN, 2026-09-07 ───────────────────────────────────────
    // GOOGLE ASKS FOR THIS IN WRITING before it will let anybody outside the
    // test list sign in, and the Limited Use sentence is the one its reviewer
    // looks for by name. Every line is a fact about the provider AS
    // CONFIGURED TODAY: `signInWithOAuth({ provider: "google" })` in
    // `screens/Auth.jsx` passes no `scopes` option, so Supabase asks for
    // GoTrue's default three — openid, email, profile — and nothing else.
    //
    // ~~**WHAT IS DELIBERATELY ABSENT: the Google Business Profile sync.**
    // It gets its own paragraph the day the sync ships and not a day
    // before.~~ **REVERSED 2026-09-08, and the reasoning that reversed it is
    // worth keeping because it is not obvious.**
    //
    // That rule — never describe what does not exist — is the right rule and
    // it is still the rule everywhere else in this file. It was wrong HERE
    // because of something outside the codebase: **the API application filed
    // with Google on 2026-09-08 (case 6-3052000042070) describes the sync in
    // its own use case**, verbatim — *"Each detailer connects their own Google
    // Business Profile so that photos they upload and opening hours they
    // change in our dashboard stay in sync with Google."*
    //
    // **So a Google reviewer now reads that sentence and then opens this
    // page**, and a privacy policy that never mentions Business Profile data
    // is a mismatch with the application it is being read against. That is a
    // closed support case, not a code defect, and no amount of correctness
    // inside this repo would have caught it.
    //
    // **The honesty rule is kept by SAYING SO IN THE PARAGRAPH.** It opens by
    // stating the feature is not switched on. It describes what will happen,
    // not what does — which is what a disclosure is for, and is why Google
    // wants it BEFORE granting the scope rather than after.
    ["Signing in with Google",
     "The Google button asks Google for three things and nothing else: confirmation that it is really you, your email address, and your name and picture. We use them to make your account, to let you back in, and to put your name in the dashboard. **We never see your Google password.** What we do with anything Google hands us follows the Google API Services User Data Policy, including its Limited Use rules: none of it is used for advertising, none of it is sold, and no person here reads it except to fix something you have asked us to fix, or where the law leaves us no choice. That policy is at https://developers.google.com/terms/api-services-user-data-policy and you can take our access away whenever you like at https://myaccount.google.com/permissions"],
    ["Your Google Business Profile",
     "**This is not switched on yet. It is written here so you know what will happen when it is, and because Google asks to see it before they will allow it at all.** We have asked Google for permission to connect a detailer's own Business Profile to their dashboard, so that the opening hours and the photos you keep here stay the same as the ones people see on Google. If you choose to connect yours, we read and write **your hours and your photos and nothing else.** We do not touch your reviews, your messages, your posts, or anything else on the listing, and we do not touch any other Google service. Nothing is connected unless you connect it yourself from a button in your own dashboard, and you can disconnect it from that same button. The Limited Use rules above cover this too: none of it is used for advertising, none of it is sold, and no person here reads it unless you ask us to, unless security requires it, or unless the law does. You can also take our access away entirely at https://myaccount.google.com/permissions"],
    ["Marketing email",
     "The only email a customer can be sent that they did not ask for is one a detailer writes and sends from their own Clients list. Every one of those carries a postal address and a working opt-out, and the opt-out takes two steps — a page, then a button — so a link scanner cannot unsubscribe somebody who never meant to."],
    ["How long",
     "For as long as the account is open. Suspension for non-payment deletes nothing. When an account is closed and asks to be deleted, it is deleted."],
    ["Asking for a copy, or a deletion",
     "Email the address below. If you are a customer of a detailer rather than a detailer, ask them — it is their list, and they can do both from their own dashboard."],
  ],
};
