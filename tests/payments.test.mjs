// THE DETAILER'S OWN PAYMENT HANDLES — roadmap 2.20, stage 1.
//
// TWO THINGS ARE PINNED HERE AND THE SECOND IS THE ONE THAT MATTERS.
//
// 1 · WHAT LINKS AND WHAT DOES NOT. Every value in this feature is typed by a
//     detailer into a settings form and printed in an email to their customer,
//     so `_shared/payments.ts` refuses to build a link out of anything that is
//     not plainly a username or an `https:` URL. A WRONG payment link is worse
//     than no link — it sends somebody's money to the wrong person, or 404s and
//     makes the detailer look like they are not a real business — and neither
//     failure is visible from any screen in this product.
//
// 2 · WHICH EMAILS CARRY THE LIST. `invoiceEmail` branches on payment status:
//     paid draws a RECEIPT, unpaid draws an INVOICE. The handles go on the
//     invoice and NEVER on the receipt. That is not a preference — it is the
//     owner's own complaint about his old site, which printed "here's the
//     payments we accept" on a document for money it had already taken:
//     *"which is so weird since they already paid."* Nothing else in the repo
//     can see that branch going wrong, because both branches render perfectly
//     valid emails.
//
//     And the branch NOBODY WOULD THINK TO CHECK: a request-mode tenant's
//     first customer email says "we're holding your time" and charges nothing,
//     so the handles are not on it — the ACCEPTED-request email is that
//     tenant's confirmation and carries them instead. Half of all tenants
//     would otherwise get payment handles on no email at all.
//
// It imports `_shared/payments.ts` and `_shared/emailTemplates.ts` DIRECTLY:
// Node 24 strips the types, so this pins the same files the edge functions run
// rather than a copy. Same trick `tests/campaign.test.mjs` and
// `tests/plans.test.mjs` test 6 use.
//
// Credential-free, no dev server, no browser.
//
//   node tests/payments.test.mjs

import { paymentHandles } from "../supabase/functions/_shared/payments.ts";
import {
  customerConfirmationEmail,
  customerReminderEmail,
  invoiceEmail,
  requestDecisionEmail,
} from "../supabase/functions/_shared/emailTemplates.ts";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const PAID = {
  pay_venmo: "@ridgeline-detail",
  pay_cashapp: "$ridgelinedetail",
  pay_paypal: "https://paypal.me/ridgelinedetail",
  pay_zelle: "(303) 555-0142",
  pay_other: "Apple Pay, or a check",
  pay_cash: true,
};

const brandBase = {
  brandName: "Ridgeline Auto Detail",
  contactEmail: "hello@ridgeline.test",
  contactPhone: "(562) 555-0142",
  siteUrl: "https://detailingplatform.com/book/ridgeline",
  logoUrl: null,
  accent: "#38E08B",
  accentFill: "#38E08B",
  accentInk: "#04150C",
  accentDark: "#38E08B",
  accentFillDark: "#38E08B",
  accentInkDark: "#04150C",
  dropoffAddress: "22 Mill Road",
  googleReviewUrl: null,
  yelpReviewUrl: null,
  messages: {},
};
const withPay = { ...brandBase, payment: paymentHandles(PAID) };
const noPay = { ...brandBase, payment: paymentHandles({}) };

const booking = {
  id: "7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
  customerName: "Dana Ortiz",
  customerPhone: "(720) 555-0188",
  customerEmail: "dana.ortiz@example.com",
  customerAddress: "1420 Larimer St, Denver, CO 80202",
  dateStr: "2026-09-17",
  startTime: "10:00",
  endTime: "13:30",
  serviceType: "mobile",
  vehicleSize: "Mid-size SUV",
  vehicleModel: "2021 Subaru Outback",
  customerNotes: null,
  serviceNames: ["Full Interior + Exterior Detail"],
  addOnNames: [],
  subtotal: 345,
  siteDiscount: 0,
  siteDiscountPercent: 0,
  promoCode: null,
  promoDiscount: 0,
  total: 345,
  receiptUrl: "https://detailingplatform.com/booking/7f3ab210",
};
const rows = [{ label: "Booking total", qty: 1, lineTotal: 345, kind: "charge" }];
const totals = { chargesSubtotal: 345, discountsTotal: 0, tipTotal: 0, totalPaid: 345 };

const has = (mail) => /How to pay/i.test(mail.html);
const find = (list, label) => list.find((r) => r.label === label);

// --- 1 · WHAT THE MODULE MAKES OF WHAT A DETAILER TYPES ---------------------
console.log("\n1 · handles, normalisation and links");
{
  const h = paymentHandles(PAID);
  check("nothing configured yields no rows at all", paymentHandles({}).length === 0);
  check("null settings yield no rows", paymentHandles(null).length === 0);
  check("six configured methods yield six rows", h.length === 6, JSON.stringify(h.map((r) => r.label)));

  // THE ORDER IS AN ANSWER TO "what is easiest right now", not the form's
  // order: the tap-to-pay ones first, cash last because it needs the detailer
  // standing there.
  check("tap-to-pay first, cash last",
    h.map((r) => r.label).join("|") === "Venmo|Cash App|PayPal|Zelle|Other|Cash",
    h.map((r) => r.label).join("|"));

  const venmo = find(h, "Venmo");
  check("a typed @ does not reach the URL", venmo.href === "https://venmo.com/u/ridgeline-detail", venmo.href);
  check("the @ is kept for the customer to read", venmo.handle === "@ridgeline-detail", venmo.handle);

  const cash = find(h, "Cash App");
  check("a typed $ is stripped and Cash App's own $ is kept",
    cash.href === "https://cash.app/$ridgelinedetail", cash.href);

  const paypal = find(h, "PayPal");
  check("a pasted https link is used as typed", paypal.href === "https://paypal.me/ridgelinedetail", paypal.href);
  check("a pasted link is shown without its scheme", paypal.handle === "paypal.me/ridgelinedetail", paypal.handle);

  // ZELLE HAS NO USERNAME TO BUILD A LINK FROM. It is reached by phone number
  // or email inside a bank's own app, so it has no entry in `LINK` at all and
  // a typed handle can never become one.
  check("a typed Zelle handle never links", find(h, "Zelle").href === null);
  check("Zelle prints the number as typed", find(h, "Zelle").handle === "(303) 555-0142");
  // ...BUT A PASTED URL STILL LINKS, AND THAT IS THE SECOND RULE RATHER THAN
  // AN EXCEPTION. The module's header claimed "Zelle never links at all" until
  // a security review ran the code instead of reading the comment; the two
  // cases below are here so the next reader finds the behaviour rather than a
  // claim about it. Both branches of that sentence are now pinned.
  check("a URL pasted into Zelle links, because the detailer chose it",
    paymentHandles({ pay_zelle: "https://enroll.zellepay.com/qr-codes?data=abc" })[0].href
      === "https://enroll.zellepay.com/qr-codes?data=abc");
  check("free text with a pasted URL links too — the rule is who typed it",
    paymentHandles({ pay_other: "https://example.com/pay" })[0].href === "https://example.com/pay");
  check("free text never links", find(h, "Other").href === null);
  check("cash is a row with a fact on it, not an empty label",
    find(h, "Cash").handle === "On the day" && find(h, "Cash").href === null);
}

// --- 2 · A LINK IS ONLY BUILT WHEN IT CAN BE BUILT CORRECTLY ----------------
console.log("\n2 · what refuses to become a link");
{
  // The commonest real mistake: a phone number in the Venmo box. `@(303)
  // 555-0142` is not a handle and `venmo.com/u/(303) 555-0142` is not a page.
  const phone = paymentHandles({ pay_venmo: "(303) 555-0142" })[0];
  check("a phone number in a username box does not link", phone.href === null, String(phone.href));
  check("...and does not get a sigil glued to it", phone.handle === "(303) 555-0142", phone.handle);

  const spaced = paymentHandles({ pay_cashapp: "ridge line" })[0];
  check("a handle with a space does not link", spaced.href === null, String(spaced.href));

  const email = paymentHandles({ pay_paypal: "andrew@example.com" })[0];
  check("an email address does not link", email.href === null, String(email.href));

  check("http:// is not treated as a link",
    paymentHandles({ pay_paypal: "http://paypal.me/x" })[0].href === null);
  check("a javascript: URL is not treated as a link",
    paymentHandles({ pay_paypal: "javascript:alert(1)" })[0].href === null);

  // A handle that could close the attribute it lands in. `payments.ts` refuses
  // it, and `emailTemplates.ts` escapes it — two independent failures needed.
  const hostile = paymentHandles({ pay_venmo: 'x" onmouseover="alert(1)' })[0];
  check("a quote-carrying handle gets no href", hostile.href === null, String(hostile.href));

  check("whitespace-only fields are dropped", paymentHandles({ pay_venmo: "   ", pay_zelle: "\t" }).length === 0);
  check("a bare @ is dropped rather than linked to nothing",
    paymentHandles({ pay_venmo: "@" }).length === 0);
  check("cash off is not a row", paymentHandles({ pay_cash: false }).length === 0);
}

// --- 3 · WHICH EMAILS CARRY IT ---------------------------------------------
console.log("\n3 · where the list prints, and where it must not");
{
  check("the booking confirmation carries it", has(customerConfirmationEmail(withPay, booking, false)));

  // NOT ON A REQUEST. That email's own note says "nothing is charged now" and
  // the job is not accepted yet; telling somebody how to pay for a job nobody
  // has agreed to is the receipt mistake one step earlier.
  check("the request-received email does NOT", !has(customerConfirmationEmail(withPay, booking, true)));

  // ...WHICH IS WHY THIS ONE MUST. In request mode this is the confirmation.
  check("the accepted-request email carries it",
    has(requestDecisionEmail(withPay, booking, "accepted", { manageUrl: booking.receiptUrl })));
  check("a declined request does NOT",
    !has(requestDecisionEmail(withPay, booking, "declined", { manageUrl: booking.receiptUrl })));
  check("a quote does NOT — nothing is agreed yet",
    !has(requestDecisionEmail(withPay, booking, "quote", { manageUrl: booking.receiptUrl, quotedAmount: 395 })));

  check("both reminders carry it",
    has(customerReminderEmail(withPay, booking)) && has(customerReminderEmail(withPay, booking, true)));

  // THE ONE THE WHOLE STAGE TURNS ON.
  check("the UNPAID invoice carries it",
    has(invoiceEmail(withPay, booking, rows, totals, "unpaid", null)));
  check("the PAID receipt does NOT — the owner's own complaint about his old site",
    !has(invoiceEmail(withPay, booking, rows, totals, "paid", null)));
}

// --- 4 · NOTHING CONFIGURED DRAWS NOTHING ----------------------------------
console.log("\n4 · the state every business is in until it fills the form in");
{
  const mails = [
    customerConfirmationEmail(noPay, booking, false),
    requestDecisionEmail(noPay, booking, "accepted", { manageUrl: booking.receiptUrl }),
    customerReminderEmail(noPay, booking),
    invoiceEmail(noPay, booking, rows, totals, "unpaid", null),
  ];
  check("no heading, no empty list, nothing", mails.every((m) => !has(m)));
  // An empty section that renders its own heading is the failure this guards.
  check("and no stray lead sentence either",
    mails.every((m) => !/when the work is done/i.test(m.html)));
}

// --- 5 · THE ESCAPE ---------------------------------------------------------
console.log("\n5 · a detailer's typing cannot become markup");
{
  const nasty = {
    ...brandBase,
    payment: paymentHandles({ pay_other: '<img src=x onerror="alert(1)">' }),
  };
  const html = customerConfirmationEmail(nasty, booking, false).html;
  check("the tag is escaped, not rendered", !/<img src=x/.test(html));
  check("the escaped form is what reaches the page", /&lt;img src=x/.test(html));
  // NOT `!/onerror=/` — the ESCAPED form contains those characters as inert
  // text and always will, so that check fails on correct output. The question
  // is whether any TAG carries the handler, which is what a browser acts on.
  check("no tag anywhere carries the handler", !/<[^>]*onerror/i.test(html));
}

// --- 6 · A REJECTED SEND IS A THIRD WAY TO BE UNREACHABLE ------------------
//
// Roadmap 2.20's other half. Until it shipped, the provider refusing an address
// was a `console.error` inside an edge function and the first symptom was a
// customer saying they never got their confirmation.
//
// WHAT IS PINNED HERE IS THE REACHABILITY RULE, not the storage. Three places
// ask "can we email this person" — the Clients list's count, the compose
// sheet's, and `send-campaign`'s own filter, which is the enforcement — and
// **the number printed has to be the number reached.** The rule is one
// predicate and it is written out here so all three can be checked against the
// same sentence; the alternative is three filters drifting apart, which is how
// `emailable` came to exist in the first place.
//
// AND THE ASYMMETRY IS THE POINT: an opt-out is permanent until a human undoes
// it, a bounce clears itself on the next successful send. A detailer who fixes
// a typo must not be told forever that the address they just corrected is
// broken, or the flag becomes something to ignore.
console.log("\n6 · who a campaign can actually reach");
{
  const has = (p) => String(p.email ?? "").trim();
  const reachable = (p) => Boolean(has(p)) && !p.unsubscribed_at && !p.email_failed_at;

  check("an ordinary customer is reachable",
    reachable({ email: "a@b.test" }));
  check("no address is unreachable",
    !reachable({ email: "  " }));
  check("an opt-out is unreachable",
    !reachable({ email: "a@b.test", unsubscribed_at: "2026-08-01T00:00:00Z" }));
  check("a bounced address is unreachable",
    !reachable({ email: "a@b.test", email_failed_at: "2026-08-30T00:00:00Z" }));

  // THE ONE THAT MAKES IT SELF-HEALING. `send-email` nulls both columns after
  // any successful send, so this is the state a corrected address is in.
  check("a bounce that was cleared is reachable again",
    reachable({ email: "a@b.test", email_failed_at: null, email_failed_reason: null }));

  // NOBODY IS QUIETLY DROPPED — the compose sheet's own rule. A person can be
  // both opted out and bounced, and counting them in two buckets would print
  // more excluded than there are people.
  const people = [
    { id: 1, email: "ok@b.test" },
    { id: 2, email: "" },
    { id: 3, email: "out@b.test", unsubscribed_at: "2026-08-01T00:00:00Z" },
    { id: 4, email: "bad@b.test", email_failed_at: "2026-08-30T00:00:00Z" },
    { id: 5, email: "both@b.test", unsubscribed_at: "2026-08-01T00:00:00Z", email_failed_at: "2026-08-30T00:00:00Z" },
  ];
  const noEmail = people.length - people.filter(has).length;
  const optedOut = people.filter((p) => has(p) && p.unsubscribed_at).length;
  const bounced = people.filter((p) => has(p) && !p.unsubscribed_at && p.email_failed_at).length;
  const sent = people.filter(reachable).length;
  check("the buckets add up to everybody, exactly once",
    sent + noEmail + optedOut + bounced === people.length,
    `${sent}+${noEmail}+${optedOut}+${bounced} vs ${people.length}`);
  check("someone both opted out and bounced is counted once, as opted out",
    optedOut === 2 && bounced === 1, `optedOut ${optedOut}, bounced ${bounced}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
