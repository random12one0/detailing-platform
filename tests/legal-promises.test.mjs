// ROADMAP 0.4 — EVERY PROMISE ON A PUBLIC PAGE NAMES SOMETHING THE PRODUCT DOES.
//
//   node --test tests/legal-promises.test.mjs
//   LEGAL_BREAK=rename   node --test tests/legal-promises.test.mjs   # sabotage 1
//   LEGAL_BREAK=unbacked node --test tests/legal-promises.test.mjs   # sabotage 2
//   LEGAL_BREAK=host     node --test tests/legal-promises.test.mjs   # sabotage 3
//   LEGAL_BREAK=debt     node --test tests/legal-promises.test.mjs   # sabotage 4
//   LEGAL_BREAK=call     node --test tests/legal-promises.test.mjs   # sabotage 5
//   LEGAL_BREAK=notice   node --test tests/legal-promises.test.mjs   # sabotage 6
//   LEGAL_BREAK=injected node --test tests/legal-promises.test.mjs   # sabotage 7  (§ 6, ROADMAP 100.8)
//   LEGAL_BREAK=alias    node --test tests/legal-promises.test.mjs   # sabotage 8  (§ 6)
//   LEGAL_BREAK=dynamic  node --test tests/legal-promises.test.mjs   # sabotage 9  (§ 6)
//
// AN ENV VAR AND NOT A FLAG, and that is not a style choice: `node --test <file>
// --break=x` does NOT pass the flag to the file — node consumes every extra
// argument and the child's argv is just `[node, <file>]`, so a flag-shaped
// switch here is silently switched off and prints the same green a caught
// sabotage prints. `docs/gotchas.md` 104.
//
// Credential-free, no browser, no dev server. Six filesystem reads and one
// dynamic import of `legal.js`, well under a second.
//
// ---------------------------------------------------------------------------
// THE FAULT, AND IT IS MEASURED RATHER THAN FEARED
// ---------------------------------------------------------------------------
// 0.4 is the item that keeps finding sentences on `/terms`, `/privacy`,
// `/pricing` and the home page that read perfectly well and are false. Three
// rounds of it have been done by hand, and **the hand pass does not hold**:
//
//   * On 2026-09-20 the item recorded *"there is no customer export and no photo
//     export"*. Both were built within 24 hours. On 2026-10-08 the item's own
//     entry, a row in `FOR-ANDREW.md`, AND the header of `lib/customer-export.js`
//     were all still saying the photo half was unkept — **eighteen days after
//     `lib/photo-export.js` landed quoting that exact sentence as the thing it
//     closed.** Nothing anywhere asked.
//   * The processor list on `/privacy` ended *"Nobody else receives any of it"*
//     for weeks while six more services did. It was found by listing the hosts
//     the edge functions call, not by reading the prose.
//
// **Both halves of a promise move, and they move in different files on
// different days.** A promise is reworded by somebody editing copy; its backing
// is deleted by somebody refactoring a screen. Neither of them opens the other
// file. So this check holds the PAIRS, and goes red when either half moves.
//
// ---------------------------------------------------------------------------
// WHAT IT ENFORCES
// ---------------------------------------------------------------------------
//   1. The ledger below has exactly `DECLARED_ROWS` rows. An EQUALITY, not a
//      floor — `docs/gotchas.md` 98: this is a declaration of how many promises
//      have been enumerated, so a row appearing or vanishing must be deliberate.
//   2. Every promise phrase is still present, verbatim, in the file that makes
//      it. A reworded promise reddens the run and gets re-verified rather than
//      silently inheriting the old verification.
//   3. Every backed row's backing is still there.
//   4. The UNBACKED rows are exactly `UNBACKED_IDS`. Also an equality, and this
//      is the row that matters: a promise with nothing behind it is **reported by
//      name** rather than folded into a pass, and a SECOND one reddens the run.
//      **`UNBACKED_IDS` HOLDS ONE ROW SINCE 2026-10-12** — both build-start rows
//      were the debt, both were backed on 2026-10-09, and 99.3b-ii unbacked the
//      terms one (button deleted with the old screen) — so § 4 reports the open
//      debt by name, and the next one reddens on arrival.
//   5. Every external host the edge functions name is classified, and every one
//      classified as a processor is named on `/privacy` by the string declared
//      beside it.
//   6. There are exactly `FETCH_SITES` outbound call sites under
//      `supabase/functions/` — calls of `fetch` OR OF ANY NAME HOLDING IT (an
//      injected `fetchImpl`, `const f = fetchImpl ?? globalThis.fetch`), found by
//      `outboundCalls` on the code with comments and strings removed — and exactly
//      `FETCH_REFS` places name `fetch` at all. Until ROADMAP 100.8 this counted
//      the TEXT `fetch(`, and three live calls never spell it. See the blind spot
//      below — this is the only thing standing between § 5 and a processor it
//      structurally cannot see.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT SEE, SAID HERE RATHER THAN DISCOVERED LATER
// ---------------------------------------------------------------------------
//   * **A HOST BUILT FROM A VARIABLE IS INVISIBLE TO § 5, AND THAT IS HOW DEEPL
//     WAS MISSED THE FIRST TIME.** `_shared/translate.ts` picks between
//     `api.deepl.com` and `api-free.deepl.com` by looking at the last three
//     characters of the key, so neither string is in the source. `watch-jobs`
//     POSTs to a URL that arrives entirely from a secret. Both are declared in
//     `NON_LITERAL` below, which pins them; a THIRD one would not be. **§ 6 is
//     the net under that hole**: a new outbound call site reddens the run, and
//     whoever added it has to say what host it reaches.
//   * **§ 6 follows a fetch alias inside one file, not across files.** Handing
//     `fetch` itself to another file names it, so FETCH_REFS moves; handing over
//     an EXISTING alias (`r2.ts`'s `fetchImpl` passed on to a helper elsewhere),
//     or returning one from a function, is not followed. Nor is an HTTP client
//     imported from npm. A computed global lookup, eval, `new Function` and the
//     other network primitives are refused outright (§ 6 `hidden`), because no
//     count can follow them.
//   * **It reads strings, not meaning.** A promise reworded into something
//     weaker but still containing the pinned phrase passes. It is a tripwire on
//     the pair, not a reader.
//   * **It cannot tell a kept promise from one the backing only looks like.**
//     Row `export-photos` is satisfied by `photo-export.js` existing and a
//     button naming it; that the zip contains the right bytes is
//     `tests/photo-export.test.mjs`, which is where that belongs.
//   * **It says nothing about the live site.** Everything here is the checkout,
//     which publishes when Andrew publishes.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE
// ---------------------------------------------------------------------------
//   * Test 7 is a canary run EVERY time, against the same two production
//     functions the real pass uses (`phraseMissing`, `backingMissing`), with a
//     synthetic ledger whose promise is reworded and whose backing is absent.
//     Both must be caught. It is aimed at the functions, not at a copy of them
//     — `docs/gotchas.md` 95.
//   * `LEGAL_BREAK=rename` rewords one real promise in the text before § 2 reads
//     it. `LEGAL_BREAK=unbacked` hides one real backing from § 3 and § 4.
//     `LEGAL_BREAK=host` injects an unclassified host into § 5's input.
//     `LEGAL_BREAK=debt` marks a backed promise unbacked, so § 4's equality has
//     been SEEN to fail — and `LEGAL_BREAK=call` adds one outbound call site, so
//     § 6's has too. `LEGAL_BREAK=notice` hides the build-start email template,
//     which is the half `unbacked` cannot reach and the one that was this item's
//     entire open debt until 2026-10-09. **Every assertion in this file has been watched to go red**,
//     which is the only reason a green run here means anything.
//     **Each was run and each reddened; the counts are in ROADMAP 0.4.**
//   * § 6's sabotages go INTO the source text `outboundCalls` reads (ROADMAP
//     100.8): `call` appends a plain `fetch(`, `injected` a `fetchImpl(` in
//     `r2.ts`, `alias` a two-step alias of `weather.ts`'s `f`, `dynamic` a
//     `globalThis["fet" + "ch"](…)`. Test 6b is the every-run canary aimed at
//     `outboundCalls` itself, one synthetic file per evasion shape.
//     `docs/gotchas.md` 102 — a sabotage is only evidence once you have seen it
//     change the output, so each one prints what it did.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));

const BREAK = process.env.LEGAL_BREAK ?? "";
if (BREAK) console.log(`  SABOTAGE ACTIVE: LEGAL_BREAK=${BREAK}`);

// ═══════════════════════════════════════════════════════════════════════════
// THE SOURCES
// ═══════════════════════════════════════════════════════════════════════════
// Whitespace is collapsed because JSX wraps a sentence over three lines, so a
// phrase in the rendered page is not a substring of the file that makes it.
const flat = (s) => s.replace(/\s+/g, " ");
const read = (p) => flat(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

const legal = await import(pathToFileURL("app/src/landing/legal.js").href);
const TERMS_TEXT = flat(legal.TERMS.sections.map(([h, w]) => `${h}\n${w}`).join("\n"));
const PRIVACY_TEXT = flat(legal.PRIVACY.sections.map(([h, w]) => `${h}\n${w}`).join("\n"));

const SOURCES = {
  terms: TERMS_TEXT,
  privacy: PRIVACY_TEXT,
  pricing: read("app/src/landing/PricingPage.jsx"),
  home: read("app/src/landing/LandingPage.jsx"),
};

// ═══════════════════════════════════════════════════════════════════════════
// THE LEDGER — one row per promise, the page it is on, and what backs it
// ═══════════════════════════════════════════════════════════════════════════
// `where` is the page. `phrase` must appear in it verbatim. `backing` is every
// file-and-needle pair that has to still exist for the promise to be true;
// `unbacked` is a row where nothing does, with the reason in `why`.
const LEDGER = [
  // ── THE EXPORT PROMISE, IN THE THREE PLACES 0.4 ENUMERATES ──────────────
  {
    id: "export-terms", where: "terms",
    phrase: "you can have a copy of them at any time by asking",
    backing: [
      ["app/src/lib/customer-export.js", "export function customersCsv"],
      ["app/src/lib/photo-export.js", "export function photosCsv"],
    ],
  },
  {
    id: "export-pricing", where: "pricing",
    phrase: "You export them and go.",
    backing: [
      ["app/src/screens/Clients.jsx", "Export my customers"],
      ["app/src/screens/more/Gallery.jsx", "Export my photos"],
    ],
  },
  {
    id: "export-home", where: "home",
    phrase: "You export them and go. The list was always yours.",
    backing: [["app/src/screens/Clients.jsx", "Export my customers"]],
  },
  {
    // THE NOUN THAT WAS UNKEPT FOR THE WHOLE LIFE OF THE SENTENCE, and the
    // reason this row is separate from `export-pricing`: "customers, their
    // numbers and your photos" is three nouns, and a check that matched the
    // sentence as a whole went green while one third of it was false.
    id: "export-photos", where: "pricing",
    phrase: "and your photos are yours",
    backing: [
      ["app/src/lib/photo-export.js", "export function photosCsv"],
      ["app/src/screens/more/Gallery.jsx", "Export my photos"],
    ],
  },

  // ── CANCELLING WITHOUT AN EMAIL ─────────────────────────────────────────
  {
    id: "cancel-terms", where: "terms",
    phrase: "It is never behind an email to us.",
    backing: [
      ["app/src/screens/more/Billing.jsx", 'data-billing-cancel=""'],
      ["app/src/screens/more/Billing.jsx", "api.billingCancel"],
    ],
  },
  {
    id: "cancel-pricing", where: "pricing",
    phrase: "No phone call, no email and nobody to talk out of it.",
    backing: [["app/src/screens/more/Billing.jsx", 'data-billing-cancel=""']],
  },

  // ── THE BUILD FEE ───────────────────────────────────────────────────────
  {
    // "charged once, at the start, and is not part of the subscription" is a
    // statement about HOW it is billed, and `add_invoice_items` is that: Stripe
    // appends it to the subscription's first invoice as a one-off rather than
    // folding it into the recurring price.
    id: "buildfee-terms", where: "terms",
    phrase: "It is charged once, at the start, and is not part of the subscription.",
    backing: [["supabase/functions/platform-billing/index.ts", "add_invoice_items"]],
  },
  {
    id: "buildfee-pricing", where: "pricing",
    phrase: "is charged once, at the start, and is not part of the subscription",
    backing: [["supabase/functions/platform-billing/index.ts", "add_invoice_items"]],
  },
  {
    // ── RESOLVED 2026-10-09, AND IT WAS THE ONE WITH NOTHING BEHIND IT ────
    // Found unbacked 2026-10-08: *"`/pricing` and the terms both promise a
    // detailer is told on the day work starts on their website. There is no
    // such day in the product."* No column marked a build as started, no email
    // said it, no screen showed it — and that sentence is what ends their
    // right to a refund on the largest single charge here.
    //
    // **Andrew ruled on 2026-10-09 to make the promise true rather than to
    // delete it**, which is this item's own standing rule about the export
    // clause: *a vague promise is still a promise and would be harder for the
    // next person to spot*, and removing it is not the neutral option either —
    // it would leave a fee that stops being refundable on a day the detailer
    // never hears about.
    //
    // **FOUR HALVES, AND THE PAIR IS WHY THEY ARE ALL LISTED.** The notice is
    // an email template, something has to SEND it, the day has to be WRITTEN
    // DOWN, and the detailer has to be able to find the date again after the
    // email is deleted. Any one of them deleted by somebody refactoring makes
    // the sentence false again, and none of them is in the file the sentence
    // lives in.
    id: "buildfee-notice", where: "pricing",
    phrase: "It stops being refundable once work on your site begins, and you are told on the day that happens.",
    backing: [
      ["supabase/functions/_shared/emailTemplates.ts", "export function buildStartedEmail"],
      ["supabase/functions/platform-admin/index.ts", 'action === "build_start"'],
      ["supabase/functions/platform-admin/index.ts", "buildStartedEmail(platformBrand("],
      ["supabase/migrations/20261008010000_site_build_start.sql", "add column if not exists site_build_started_at"],
      ["app/src/screens/more/Billing.jsx", "data.site_build_started_at"],
    ],
  },
  {
    // The same promise in the terms. One fault, two pages — and now one fix,
    // two pages. The back office's own button was pinned here rather than on
    // the row above so that both rows did not depend on the identical list:
    // a screen with no way to press it is a notice nobody can send.
    // UNBACKED 2026-10-12 (99.3b-ii): the old screen's "Tell them work has
    // started" button went with the deleted AdminPage.jsx, and no screen in the
    // new back office sends `build_start` (DetailerPanel.jsx presses export,
    // resend_invite, impersonate, suspend/restore; the action name survives only
    // as a history label in EVENT_WORDS). Template, server action and migration
    // are intact, so the notice is composable but nothing can send it on the
    // day. Restoring a "tell them work started" control in DetailerPanel
    // re-backs this row; until then § 4 reports it by name every run.
    id: "buildfee-notice-terms", where: "terms",
    phrase: "you are told on the day that happens",
    unbacked: true, why: "no screen sends build_start since the old back office was deleted (99.3b-ii)",
    backing: [
      ["supabase/functions/_shared/emailTemplates.ts", "export function buildStartedEmail"],
      ["supabase/functions/platform-admin/index.ts", 'action === "build_start"'],
      ["supabase/migrations/20261008010000_site_build_start.sql", "add column if not exists site_build_started_at"],
    ],
  },

  // ── SALES TAX — ADDED TO THE TERMS 2026-10-08, ROADMAP 0.4 ──────────────
  {
    id: "tax-pricing", where: "pricing",
    phrase: "plus sales tax in the states that charge it",
    backing: [["supabase/functions/platform-billing/index.ts", "automatic_tax"]],
  },
  {
    // The clause this round added, because `/pricing` had been promising tax in
    // public while the document calling itself "the whole agreement" was silent
    // — the same omission as the build fee and the domain on 2026-09-20.
    id: "tax-terms", where: "terms",
    phrase: "the tax is worked out by Stripe and added to the invoice",
    backing: [["supabase/functions/platform-billing/index.ts", "automatic_tax: { enabled: true }"]],
  },

  // ── THE DOMAIN ──────────────────────────────────────────────────────────
  {
    // **BACKED STRUCTURALLY RATHER THAN BY A FEATURE, which is the strongest
    // kind.** This product cannot hold a domain registration: the only thing
    // `business_domains` stores is a hostname, and `verify-domain` proves it by
    // fetching `/platform-host.txt` from a host the DETAILER already controls.
    // There is no registrar credential anywhere in the repo and nothing that
    // could buy one.
    //
    // The one way the promise still fails is outside the code — Andrew buying a
    // domain for a detailer who has none and registering it on his own account.
    // Nothing here can see that; it is a row in `FOR-ANDREW.md`.
    id: "domain-terms", where: "terms",
    phrase: "The domain is in your name.",
    backing: [
      ["supabase/functions/_shared/domainProof.ts", "platform-host.txt"],
      ["supabase/migrations/20260906000000_custom_domains.sql", "business_domains"],
    ],
  },
  {
    id: "domain-pricing", where: "pricing",
    phrase: "The domain is in your name and leaves with you.",
    backing: [["supabase/functions/_shared/domainProof.ts", "platform-host.txt"]],
  },
  {
    id: "domain-home", where: "home",
    phrase: "It's in your name and it leaves with you.",
    backing: [["supabase/functions/_shared/domainProof.ts", "platform-host.txt"]],
  },

  // ── THE FIGURES ARE COPIED AT SIGNUP AND NEVER READ AGAIN ───────────────
  {
    // **THE CLAIM IS AN ABSENCE, SO THE BACKING IS AN ABSENCE TOO** and this
    // row asserts it the only way that means anything: `planFor` — the one
    // function that turns a price table into money — must not be reachable from
    // the renewal path. `stripe-webhook` is that path, and it contains neither
    // `planFor`, `recurring_cents` nor `PRICES`. A renewal charges the Stripe
    // price created at signup from the snapshot, and nothing re-reads the table.
    id: "figures-terms", where: "terms",
    phrase: "the figures are copied onto your subscription the day you agree to them and are never read again",
    backing: [
      ["supabase/functions/_shared/platformBilling.ts", "export function planFor"],
      ["supabase/functions/platform-billing/index.ts", "const snapshot = planFor("],
    ],
    absent: [["supabase/functions/stripe-webhook/index.ts", ["planFor", "recurring_cents", "PRICES"]]],
  },
];

// Declarations, not derivations. An equality on each — `docs/gotchas.md` 98.
const DECLARED_ROWS = 16;
// ONE ROW SINCE 2026-10-12, AND IT STAYS AN EQUALITY FOR EXACTLY THAT REASON —
// `docs/gotchas.md` 98. The two build-start rows were the debt, both backed on
// 2026-10-09; 99.3b-ii deleted the old screen that held the only button sending
// the notice, so buildfee-notice-terms is unbacked again until a control lands
// in DetailerPanel. § 4 prints it by name, and the NEXT unkept promise reddens
// the run on arrival instead of fitting into a ceiling.
const UNBACKED_IDS = ["buildfee-notice-terms"];
// 9 → 10, ROADMAP 97.13: verify-domain's one marker fetch moved into _shared/domainProof.ts and a second
// call joined it — the DNS-over-HTTPS TXT lookup to cloudflare-dns.com, classified in privacy-processors.
// 10 → 13, ROADMAP 100.8: the count stopped being the TEXT `fetch(` and became every call of fetch or of a
// name holding it. The three it adds were live and invisible: `_shared/mediaCache.ts` `fetchImpl(` (api.cloudflare.com),
// `_shared/r2.ts` `fetchImpl(url, …)` (R2, host built at run time) and `_shared/weather.ts` `f(url, …)`
// (api.weather.gov, through `const f = fetchImpl ?? globalThis.fetch`). Each host was already classified.
const FETCH_SITES = 13;
// Every place the code names `fetch` at all — calls, defaults, hand-offs. A new route to the network has to
// start from one, so a shape the alias-following below does not know still moves this number.
const FETCH_REFS = 18;

// ═══════════════════════════════════════════════════════════════════════════
// THE PROCESSOR LIST — every host the edge functions name, classified
// ═══════════════════════════════════════════════════════════════════════════
// `names` is the string that must appear on `/privacy`. `why` is a host that
// receives nothing about anybody, with the reason — because a host dropped from
// this table silently stops being asked about, which is the whole fault.
const HOSTS = {
  "api.resend.com": { names: "Resend" },
  "api.geoapify.com": { names: "Geoapify" },
  "api.weather.gov": { names: "US National Weather Service" },
  "translation.googleapis.com": { names: "Google's translation service" },
  "api.stripe.com": { names: "Stripe" },
  "connect.stripe.com": { names: "Stripe" },
  // ROADMAP 100.6 — the public-photo cache purge in `_shared/mediaCache.ts`. It is sent our zone id, our
  // token and ONE already-public `business-media` address (`<business id>/<folder>/<random id>.<ext>`) for a
  // file Cloudflare already stores and serves. Nothing about any customer or visitor; named because it is
  // the same company the page already names for photos.
  "api.cloudflare.com": { names: "Cloudflare" },
  // ROADMAP 97.13: verify-domain's DNS-over-HTTPS lookup of a detailer's proof record. It receives the hostname
  // being checked and nothing about a person; Cloudflare is already named on /privacy.
  "cloudflare-dns.com": { names: "Cloudflare" },

  "www.geoapify.com": { why: "the attribution LINK Geoapify's licence requires us to print; this product makes no request to it" },
  "www.openstreetmap.org": { why: "the same attribution line's second link, printed and never fetched" },
  "venmo.com": { why: "the DETAILER's own payment handle, put into a link their customer may tap. Nothing about the customer is in the URL and this product never calls it" },
  "cash.app": { why: "as venmo.com" },
  "paypal.me": { why: "as venmo.com" },
  "esm.sh": { why: "named only inside a comment recording that it is NO LONGER used — `_shared/db.ts` imports from `npm:` since 2026-09-07" },
  "detailingplatform.com": { why: "this product's own site" },
  "book.example.com": { why: "a documentation example" },
  "WWW.Example.com": { why: "a documentation example, in a test of host normalisation" },
};

// THE TWO THE SCAN STRUCTURALLY CANNOT SEE. Declared because § 5 reads string
// literals and these hosts do not exist as literals anywhere.
const NON_LITERAL = {
  "api.deepl.com / api-free.deepl.com": {
    names: "DeepL",
    where: ["supabase/functions/_shared/translate.ts", 'key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com"'],
  },
  "the healthchecks.io ping URL": {
    why: "arrives entirely from a secret and is POSTed an EMPTY body — it learns that a scheduled job ran and nothing about any person",
    where: ["supabase/functions/watch-jobs/index.ts", "async function pingOutside"],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// THE TWO FUNCTIONS THE CANARY IS AIMED AT
// ═══════════════════════════════════════════════════════════════════════════
// Lifted out of their callers on purpose — `docs/gotchas.md` 95: a sabotage
// cannot reach a rule that lives inline in the assertion that uses it.

/** The promise's words, or null if they are still there. */
export function phraseMissing(row, sources) {
  const text = sources[row.where];
  if (typeof text !== "string") return `no such page "${row.where}"`;
  return text.includes(flat(row.phrase)) ? null : `"${row.phrase.slice(0, 64)}…" is no longer in ${row.where}`;
}

/** The first backing that has gone, or null if every one is still there. */
export function backingMissing(row, fileText) {
  for (const [file, needle] of row.backing ?? []) {
    const body = fileText(file);
    if (body === null) return `${file} does not exist`;
    if (!body.includes(flat(needle))) return `${file} no longer contains "${needle}"`;
  }
  for (const [file, needles] of row.absent ?? []) {
    const body = fileText(file);
    if (body === null) return `${file} does not exist`;
    for (const n of needles) {
      if (body.includes(n)) return `${file} now mentions "${n}" — the renewal path must never re-read the price table`;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// § 6's COUNTER — the outbound calls, found by what they CALL, not how they're spelt
// ═══════════════════════════════════════════════════════════════════════════
// ROADMAP 100.8. The old count was the text `fetch(`, so `fetchImpl(` (an injected fetch) and
// `f(` (an aliased one) were invisible to it — and three live call sites already were.

/** Comments, string/template text and regex literals blanked to spaces (newlines kept), so
 *  what is left is code. `${…}` inside a template stays code. Types are stripped first by
 *  node's own TypeScript stripper, which keeps every offset. */
export function codeOnly(ts) {
  const src = stripTypeScriptTypes(ts);
  const out = src.split(""), n = src.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== "\n" && out[k] !== "\r") out[k] = " "; };
  let i = 0, prev = "", word = "", depth = 0;
  const tpl = [];
  const template = () => {
    const s = i;
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") i += 2;
      else if (src[i] === "$" && src[i + 1] === "{") { blank(s, i); tpl.push(depth++); i += 2; prev = "{"; word = ""; return; }
      else i++;
    }
    blank(s, i); i++; prev = "`"; word = "";
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { const e = src.indexOf("\n", i); const end = e < 0 ? n : e; blank(i, end); i = end; continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; blank(i, end); i = end; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      blank(i + 1, j); i = j + 1; prev = '"'; word = ""; continue;
    }
    if (c === "`") { i++; template(); continue; }
    if (c === "/" && (prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev)
        || /^(return|typeof|case|do|else|in|of|void|yield|await|delete|throw|new|instanceof)$/.test(word))) {
      let j = i + 1, cls = false;
      while (j < n && src[j] !== "\n" && (cls || src[j] !== "/")) {
        if (src[j] === "\\") j++; else if (src[j] === "[") cls = true; else if (src[j] === "]") cls = false;
        j++;
      }
      blank(i + 1, j); i = j + 1; prev = ")"; word = ""; continue;
    }
    if (/[\w$]/.test(c)) { word = /[\w$]/.test(src[i - 1] ?? "") ? word + c : c; prev = c; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "{") depth++;
    if (c === "}") {
      if (tpl.length && tpl[tpl.length - 1] === depth - 1) { tpl.pop(); depth--; i++; template(); continue; }
      depth--;
    }
    prev = c; word = ""; i++;
  }
  return out.join("");
}

const IDENT = /[\w$]/;
const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "return", "await", "typeof", "function", "new", "void", "in", "of", "do", "else", "case", "throw", "yield", "delete"]);
const identsIn = (s) => (s.match(/[A-Za-z_$][\w$]*/g) ?? []).filter((w) => !KEYWORDS.has(w));
const esc = (s) => s.replace(/\$/g, "\\$");
const CALLED = /^\s*(?:\?\.\s*)?(?:\.\s*(?:call|apply)\s*)?\(/; // what follows a name that is being CALLED
const OPEN = { ")": "(", "]": "[", "}": "{" };

/** Split a paren group's inside at its top-level commas. */
function topLevel(s) {
  const parts = []; let d = 0, start = 0;
  for (let k = 0; k < s.length; k++) {
    if ("([{".includes(s[k])) d++; else if (")]}".includes(s[k])) d--;
    else if (s[k] === "," && d === 0) { parts.push(s.slice(start, k)); start = k + 1; }
  }
  parts.push(s.slice(start));
  return parts;
}
/** Index just past the bracket matching the opener at `at`. */
function closeOf(code, at) {
  let d = 0;
  for (let k = at; k < code.length; k++) {
    if ("([{".includes(code[k])) d++;
    else if (")]}".includes(code[k]) && --d === 0) return k + 1;
  }
  return code.length;
}

/** Every function this file defines, by name, with each parameter's bound names. */
function definitions(code) {
  const defs = [];
  const shapes = [
    /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g,                       // function name(
    /([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b[^(]*)?\(/g,     // name = (…) => / name = function(
    /(?:^|[\s{,;])([A-Za-z_$][\w$]*)\s*\((?=[^()]*(?:\([^()]*\)[^()]*)*\)\s*\{)/gm, // method name(…) {
  ];
  for (const re of shapes) {
    for (const m of code.matchAll(re)) {
      if (KEYWORDS.has(m[1])) continue;
      const open = m.index + m[0].length - 1;
      const close = closeOf(code, open);
      const after = code.slice(close, close + 40);
      if (re === shapes[1] && !/^\s*=>/.test(after) && !/function/.test(m[0])) continue; // a call, not a definition
      defs.push({ name: m[1], from: open, to: close, params: topLevel(code.slice(open + 1, close - 1)).map((p) => identsIn(p.split("=")[0])) });
    }
  }
  return defs;
}

/** Where a value-use of a fetch-alias at `p` flows: the names it binds, or the call it is an argument of. */
function flowOf(code, p) {
  let k = p - 1, commas = 0;
  while (k >= 0) {
    const c = code[k];
    if (OPEN[c]) { // skip a balanced group backwards
      let d = 0;
      for (; k >= 0; k--) { if (OPEN[code[k]]) d++; else if ("([{".includes(code[k]) && --d === 0) break; }
      k--; continue;
    }
    if (c === ";") return null;
    if (c === "{") return null;
    if (c === ",") { commas++; k--; continue; }
    if (c === "[") { commas = 0; k--; continue; }                       // array literal: keep walking outward
    if (c === "(") {
      let b = k - 1; while (b >= 0 && /\s/.test(code[b])) b--;
      let e = b; while (b >= 0 && IDENT.test(code[b])) b--;
      const callee = code.slice(b + 1, e + 1);
      if (callee && !KEYWORDS.has(callee) && !/^\d/.test(callee)) return { call: callee, arg: commas };
      commas = 0; k--; continue;                                         // a grouping paren
    }
    if (c === ":" && code[k - 1] !== ":") {                               // object property  key: value
      let b = k - 1; while (b >= 0 && /\s/.test(code[b])) b--;
      let e = b; while (b >= 0 && IDENT.test(code[b])) b--;
      return e > b ? { binds: [code.slice(b + 1, e + 1)] } : null;
    }
    if (c === ">" && code[k - 1] === "=") return null;                   // arrow body: a return
    if (c === "=" && !"=!<>".includes(code[k - 1]) && code[k + 1] !== "=") { // an assignment, incl. ??= ||= &&=
      let b = k - 1; while (b >= 0 && /[\s?|&]/.test(code[b])) b--;
      if (OPEN[code[b]]) { // a destructuring pattern: every name in it
        let d = 0, e = b;
        for (; b >= 0; b--) { if (OPEN[code[b]]) d++; else if ("([{".includes(code[b]) && --d === 0) break; }
        return { binds: identsIn(code.slice(b, e + 1)) };
      }
      let e = b; while (b >= 0 && IDENT.test(code[b])) b--;
      return e > b ? { binds: [code.slice(b + 1, e + 1)] } : null;
    }
    if (IDENT.test(c)) { // a keyword ends the walk where it starts a statement
      let b = k; while (b >= 0 && IDENT.test(code[b])) b--;
      if (/^(return|throw|yield|export|default)$/.test(code.slice(b + 1, k + 1))) return null;
      k = b; continue;
    }
    k--;
  }
  return null;
}

const lineOf = (code, at) => code.slice(0, at).split("\n").length;

/**
 * The outbound call sites in `files` ([{ path, text }]): every call of `fetch` or of a name that
 * holds it — a parameter defaulted to it, a variable or property assigned from it, a parameter of a
 * function in the SAME file it is passed into — to a fixpoint. Across files it is not followed: the
 * hand-off site names `fetch` (and moves FETCH_REFS) or hands over an existing alias (not seen).
 * Also returns every reference to the `fetch` name itself, and the shapes that would hide a call
 * from all of this (a computed global lookup, eval, another network primitive), which must be none.
 */
export function outboundCalls(files) {
  const parsed = files.map((f) => ({ path: f.path, raw: f.text, code: codeOnly(f.text) }));
  for (const f of parsed) f.defs = definitions(f.code);
  const alias = new Map(parsed.map((f) => [f.path, new Set(["fetch"])]));

  // Ends: every round adds a name, and a file has finitely many.
  for (let changed = true; changed;) {
    changed = false;
    const add = (path, names) => { for (const nm of names) if (nm && !KEYWORDS.has(nm) && !alias.get(path).has(nm)) { alias.get(path).add(nm); changed = true; } };
    for (const f of parsed) {
      for (const a of [...alias.get(f.path)]) {
        for (const m of f.code.matchAll(new RegExp(`(?<![\\w$])${esc(a)}(?![\\w$])`, "g"))) {
          const rest = f.code.slice(m.index + a.length);
          if (CALLED.test(rest) || /^\s*=(?![=>])/.test(rest)) continue; // called, or being assigned to
          const flow = flowOf(f.code, m.index);
          // Inside a definition's own parameter list only a default (`fetchImpl = fetch`) binds; the list
          // itself is not a call, though it reads like one.
          if (!flow || (flow.call && f.defs.some((d) => m.index > d.from && m.index < d.to))) continue;
          if (flow.binds) add(f.path, flow.binds);
          else for (const d of f.defs.filter((x) => x.name === flow.call)) add(f.path, d.params[flow.arg] ?? []);
        }
      }
    }
  }

  const sites = [], refs = [], hidden = [];
  for (const f of parsed) {
    const lines = f.raw.split("\n");
    const at = (i) => `${f.path}:${lineOf(f.code, i)}: ${lines[lineOf(f.code, i) - 1].trim()}`;
    const names = [...alias.get(f.path)].map(esc).join("|");
    for (const m of f.code.matchAll(new RegExp(`(?<![\\w$])(?<!function\\s+)(?:${names})(?=\\s*(?:\\?\\.\\s*)?(?:\\.\\s*(?:call|apply)\\s*)?\\()`, "g"))) {
      const close = closeOf(f.code, f.code.indexOf("(", m.index));
      if (/^\s*\{/.test(f.code.slice(close))) continue; // a definition  name(…) {  not a call
      sites.push(at(m.index));
    }
    for (const m of f.code.matchAll(new RegExp(`Reflect\\s*\\.\\s*apply\\s*\\(\\s*(?:${names})(?![\\w$])`, "g"))) sites.push(at(m.index));
    for (const m of f.code.matchAll(/(?<![\w$])fetch(?![\w$])/g)) refs.push(at(m.index));
    for (const m of f.code.matchAll(/(?<![\w$])(?:globalThis|self|window)\s*(?:\?\.)?\s*\[|(?<![\w$.])eval\s*\(|(?<![\w$.])Function\s*\(|(?<![\w$])(?:WebSocket|EventSource|XMLHttpRequest|sendBeacon)(?![\w$])|(?<![\w$])Deno\s*\.\s*(?:connect|connectTls|startTls|createHttpClient)(?![\w$])/g)) hidden.push(at(m.index));
  }
  return { sites, refs, hidden, alias };
}

// The reader every real row goes through, with sabotage 2 wired into it so the
// break reaches `backingMissing` rather than a copy of the data.
const fileText = (p) => {
  let body;
  try {
    body = read(p);
  } catch {
    return null;
  }
  if (BREAK === "unbacked" && p.endsWith("photo-export.js")) {
    console.log("  SABOTAGE unbacked: hiding photosCsv from app/src/lib/photo-export.js");
    return body.replace(/export function photosCsv/g, "function hidden");
  }
  // Sabotage 6 is aimed at the pair that was the whole of this item's open debt
  // until 2026-10-09 — the build-start notice. It hides the email template, so
  // § 3 must redden naming the pricing row (the terms row is already reported
  // by § 4 since 99.3b-ii unbacked it): a notice the product cannot compose is
  // the fault those two rows carried for eighteen days, and the reason it is a
  // sabotage of its own is that `unbacked` above cannot reach it.
  if (BREAK === "notice" && p.endsWith("emailTemplates.ts")) {
    console.log("  SABOTAGE notice: hiding buildStartedEmail from _shared/emailTemplates.ts");
    return body.replace(/export function buildStartedEmail/g, "function hidden");
  }
  return body;
};

// Sabotage 4 aims at § 4's EQUALITY, which is the assertion this whole file
// exists for and the one `docs/gotchas.md` 95 is about: an equality relaxed into
// a ceiling, or a flag the sabotage cannot reach, would let the next unkept
// promise land green. It marks one genuinely-backed row as unbacked, so the
// declared list and the real list differ by one in the direction that matters.
const ledger = LEDGER.map((r) => (
  BREAK === "debt" && r.id === "tax-terms" ? { ...r, unbacked: true, why: "SABOTAGE" } : r
));
if (BREAK === "debt") {
  console.log(`  SABOTAGE debt: tax-terms marked unbacked (${ledger.filter((r) => r.unbacked).length} unbacked now, ${UNBACKED_IDS.length} declared)`);
}

const sources = { ...SOURCES };
if (BREAK === "rename") {
  const before = sources.pricing;
  sources.pricing = before.replace("You export them and go.", "You take them with you.");
  console.log(`  SABOTAGE rename: /pricing export phrase reworded (text changed: ${before !== sources.pricing})`);
}

// ═══════════════════════════════════════════════════════════════════════════
test("0.4 · 1 — the ledger holds exactly the declared number of promises", () => {
  assert.equal(LEDGER.length, DECLARED_ROWS,
    `the ledger has ${LEDGER.length} rows and declares ${DECLARED_ROWS}. **This is an equality on purpose** (\`docs/gotchas.md\` 98): a promise added to a public page without a row here is a promise nothing is watching, and a row deleted is a verification quietly dropped. Move the number in the same edit as the row.`);
  const ids = LEDGER.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.filter((v, i) => ids.indexOf(v) !== i).join(", ")}`);
});

test("0.4 · 2 — every promise is still worded the way it was verified", () => {
  const moved = ledger.map((r) => phraseMissing(r, sources)).filter(Boolean);
  assert.deepEqual(moved, [],
    "**A reworded promise inherits the old verification silently, which is the failure this file exists for.** Re-check what the new wording claims against the product, then update the phrase here in the same edit.");
});

test("0.4 · 3 — every backed promise still has its backing", () => {
  const gone = ledger.filter((r) => !r.unbacked)
    .map((r) => [r.id, backingMissing(r, fileText)])
    .filter(([, m]) => m)
    .map(([id, m]) => `${id}: ${m}`);
  assert.deepEqual(gone, [],
    "**A public page is promising something the product no longer does.** Either put the capability back or take the promise off the page — ROADMAP 0.4: do not soften it, a vague promise is still a promise and is harder for the next person to spot.");
});

test("0.4 · 4 — the promises with NOTHING behind them are exactly the declared ones", () => {
  const unbacked = ledger.filter((r) => r.unbacked).map((r) => r.id).sort();
  // Reported by name every run rather than folded into a pass — these are the
  // item's open debt and a reader of a green run must still see them.
  console.log(`  ${unbacked.length} promise(s) with nothing behind them, by name:`);
  for (const r of ledger.filter((x) => x.unbacked)) console.log(`    ${r.id.padEnd(22)} ${r.where.padEnd(8)} ${r.why}`);
  assert.deepEqual(unbacked, [...UNBACKED_IDS].sort(),
    `**An EQUALITY, never a ceiling** — \`docs/gotchas.md\` 98. A ceiling with room in it means the next unkept promise lands with nothing going red. If this list grew, the new one is a live public promise the product cannot keep; if it shrank, say which one was resolved and how.`);
});

test("0.4 · 5 — every external host the edge functions name is classified, and every processor is named on /privacy", () => {
  const listed = execFileSync("git", ["grep", "-hoE", "https?://[A-Za-z0-9._%-]+", "--", "supabase/functions"], { cwd: REPO, encoding: "utf8" });
  const found = new Set(listed.split(/\r?\n/).filter(Boolean).map((u) => u.replace(/^https?:\/\//, "")));
  if (BREAK === "host") {
    found.add("api.unclassified-vendor.example");
    console.log(`  SABOTAGE host: injected api.unclassified-vendor.example (${found.size} hosts now)`);
  }

  // A scan that found nothing reads exactly like a tree with no hosts in it.
  assert.ok(found.size >= 10, `the host scan found ${found.size} hosts under supabase/functions — **too few is a broken scan, not a clean tree.** Check the regex and that git grep is running from the repo root.`);

  const unclassified = [...found].filter((h) => !(h in HOSTS));
  assert.deepEqual(unclassified, [],
    "**A host nothing has classified is a processor nobody has asked about, which is exactly how six of them stayed off /privacy for weeks.** For each one: if it receives anything about a person, name it on /privacy and add `names` here; if it does not, add `why` saying so.");

  const unnamed = Object.entries({ ...HOSTS, ...NON_LITERAL })
    .filter(([, v]) => v.names && !PRIVACY_TEXT.includes(v.names))
    .map(([h, v]) => `${h} → "${v.names}" is not on /privacy`);
  assert.deepEqual(unnamed, [],
    "**/privacy is the list of everywhere a person's information goes, and it does not name this one.**");

  // The non-literal hosts are pinned by the code shape that builds them, since
  // no string in the tree contains them.
  const adrift = Object.entries(NON_LITERAL)
    .filter(([, v]) => !(fileText(v.where[0]) ?? "").includes(flat(v.where[1])))
    .map(([h, v]) => `${h}: ${v.where[0]} no longer contains ${v.where[1]}`);
  assert.deepEqual(adrift, [], "a host the scan cannot see has moved; re-read where it is built and re-pin it");
});

// The sabotages for § 6 go INTO the source text the counter reads, so what reddens is the counter
// finding them — not a line pushed onto its output (`docs/gotchas.md` 95).
const SIX_BREAKS = {
  call: ["supabase/functions/watch-jobs/index.ts", "\nawait fetch(SOMEWHERE_NEW);\n"],
  injected: ["supabase/functions/_shared/r2.ts", "\nexport const again = () => fetchImpl(SOMEWHERE_NEW);\n"],
  alias: ["supabase/functions/_shared/weather.ts", "\nconst g = f;\ng(SOMEWHERE_NEW);\n"],
  dynamic: ["supabase/functions/_shared/r2.ts", '\nglobalThis["fet" + "ch"](SOMEWHERE_NEW);\n'],
};

test("0.4 · 6 — the number of outbound calls has not changed", () => {
  const paths = execFileSync("git", ["ls-files", "--", "supabase/functions"], { cwd: REPO, encoding: "utf8" })
    .split(/\r?\n/).filter((p) => /\.(ts|js|mjs)$/.test(p));
  const files = paths.map((p) => ({ path: p, text: readFileSync(new URL(`../${p}`, import.meta.url), "utf8") }));
  if (SIX_BREAKS[BREAK]) {
    const [p, add] = SIX_BREAKS[BREAK];
    const f = files.find((x) => x.path === p);
    assert.ok(f, `sabotage ${BREAK}: ${p} is gone, so the sabotage did not apply — re-aim it`);
    f.text += add;
    console.log(`  SABOTAGE ${BREAK}: appended ${JSON.stringify(add.trim())} to ${p}`);
  }
  const { sites, refs, hidden } = outboundCalls(files);

  assert.deepEqual(hidden, [],
    "**A call this count cannot follow** — a computed lookup on the global object (`globalThis[\"fet\" + \"ch\"]`), eval, `new Function`, or a network primitive other than fetch. Write the call plainly so it can be counted, or extend `outboundCalls` to see it.");

  // NOT derived from the parse above (`docs/gotchas.md` 116): the old text scan, run independently. Every
  // plain `fetch(` it finds outside a comment must be one of the counted sites, or the parser is losing calls.
  const plain = execFileSync("git", ["grep", "-n", "fetch(", "--", "supabase/functions"], { cwd: REPO, encoding: "utf8" })
    .split(/\r?\n/).filter((l) => l && !/^[^:]+:\d+:\s*(\/\/|\*)/.test(l)).map((l) => l.split(":").slice(0, 2).join(":"));
  const counted = new Set(sites.map((s) => s.split(":").slice(0, 2).join(":")));
  assert.deepEqual(plain.filter((l) => !counted.has(l)), [], "a plain `fetch(` the parser did not count — `codeOnly` or `outboundCalls` is broken");
  assert.ok(plain.length >= 10, `the independent text scan found ${plain.length} \`fetch(\` lines — too few is a broken scan, not a clean tree`);

  const unseen = sites.filter((s) => !plain.includes(s.split(":").slice(0, 2).join(":")));
  console.log(`  ${sites.length} outbound call sites; ${unseen.length} of them never spell \`fetch(\`:`);
  for (const s of unseen) console.log(`    ${s}`);

  const NET = "**THIS IS THE NET UNDER § 5's BLIND SPOT.** A host built from a variable — which is how `api.deepl.com` stayed off /privacy — is invisible to a string scan, so the one thing that can be counted instead is the calls themselves. A new one here means somebody added an outbound request: say what host it reaches and classify it in HOSTS or NON_LITERAL, then move this number in the same edit.";
  assert.equal(sites.length, FETCH_SITES,
    `${sites.length} outbound call sites under supabase/functions (fetch, or a name holding it); ${FETCH_SITES} declared.\n${sites.join("\n")}\n\n${NET}`);
  assert.equal(refs.length, FETCH_REFS,
    `${refs.length} places name \`fetch\` under supabase/functions; ${FETCH_REFS} declared.\n${refs.join("\n")}\n\n`
    + "A new one is a new route to the network even when no new call site shows above — a hand-off to another file, a wrapper. " + NET);
});

test("0.4 · 6b — canary: every way of calling fetch without spelling `fetch(` is still counted", () => {
  // Aimed at `outboundCalls` itself, the function § 6 uses, every run — `docs/gotchas.md` 95.
  const shapes = {
    injected: [`export function mk(c, fetchImpl: typeof fetch = fetch) { return () => fetchImpl(c.url); }`, 1],
    aliased: [`const f = globalThis.fetch;\nconst g = f;\nexport const x = () => g("https://a");`, 1],
    nullish: [`export async function w(fetchImpl?: F) { const f = fetchImpl ?? (globalThis.fetch as F); return f("u"); }`, 1],
    destructured: [`const [h] = [fetch];\nh("https://a");`, 1],
    property: [`const o = { go: fetch };\no.go("https://a");`, 1],
    passed: [`function send(u: string, doer: typeof fetch) { return doer(u); }\nsend("https://a", fetch);`, 1],
    callApply: [`fetch.call(null, "a");\nReflect.apply(fetch, null, ["a"]);`, 2],
    bound: [`const b = fetch.bind(globalThis);\nb("https://a");`, 1],
    quiet: ['// fetch("a")\nconst s = "fetch(x)";\nconst t = `fetch(${1})`;\nconst r = /fetch\\(/;\nconsole.log(s, t, r, "Failed to fetch x");', 0],
  };
  for (const [name, [text, want]] of Object.entries(shapes)) {
    const { sites } = outboundCalls([{ path: `${name}.ts`, text }]);
    assert.equal(sites.length, want, `shape "${name}": ${sites.length} sites counted, ${want} expected\n${sites.join("\n")}`);
  }
  for (const text of ['globalThis["fet" + "ch"]("a");', 'eval("fe" + "tch(1)");', 'new WebSocket("wss://a");']) {
    assert.equal(outboundCalls([{ path: "x.ts", text }]).hidden.length, 1, `not flagged as hidden: ${text}`);
  }
});

test("0.4 · 7 — canary: a reworded promise and a vanished backing are both caught", () => {
  const row = { id: "canary", where: "terms", phrase: "this sentence is not in the terms", backing: [["app/src/lib/customer-export.js", "noSuchSymbolAnywhere"]] };
  assert.ok(phraseMissing(row, SOURCES), "phraseMissing passed a phrase that is NOT on the page — § 2 is testing nothing");
  assert.ok(backingMissing(row, fileText), "backingMissing passed a needle that is in no file — § 3 is testing nothing");

  // And the other direction, which is the half a one-sided canary misses: the
  // same two functions must PASS a pair that is genuinely intact.
  const good = LEDGER.find((r) => r.id === "cancel-terms");
  assert.equal(phraseMissing(good, SOURCES), null, "phraseMissing flagged a phrase that IS on the page");
  assert.equal(BREAK === "unbacked" ? null : backingMissing(good, fileText), null, "backingMissing flagged a backing that IS there");
});
