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
    ["Card details",
     "We never see them. The card fields on the payment screen belong to Stripe and are served by Stripe; the number goes from the browser to them and never touches this product, this server or any log we keep."],
    ["The four companies involved",
     "Supabase stores the database and runs the code. Netlify serves the pages. Resend sends the email. Stripe takes the payments. Nobody else receives any of it, and none of them is paid to use it for anything of their own."],
    ["Marketing email",
     "The only email a customer can be sent that they did not ask for is one a detailer writes and sends from their own Clients list. Every one of those carries a postal address and a working opt-out, and the opt-out takes two steps — a page, then a button — so a link scanner cannot unsubscribe somebody who never meant to."],
    ["How long",
     "For as long as the account is open. Suspension for non-payment deletes nothing. When an account is closed and asks to be deleted, it is deleted."],
    ["Asking for a copy, or a deletion",
     "Email the address below. If you are a customer of a detailer rather than a detailer, ask them — it is their list, and they can do both from their own dashboard."],
  ],
};
