// ROADMAP 7.8 (b), (c) and (d) — the privacy page names every processor the
// code calls, and names nothing it does not.
//
//   node --test tests/privacy-processors.test.mjs
//
// Credential-free. No dev server, no browser, no Geoapify credit, no email
// allowance, no database, nothing written to disk. It reads 237 files as text,
// the way `tests/address-source.test.mjs` and `tests/booking-core.test.mjs` do.
//
// ---------------------------------------------------------------------------
// WHAT 7.8 ASKED FOR, AND WHICH SECTION ANSWERS EACH CLAUSE
// ---------------------------------------------------------------------------
// The COPY half of 7.8 was finished on 2026-09-21 (`2942f6f`). The item stayed
// open on clause (b): *a check that fails by name when the code's host list and
// `/privacy`'s processor list disagree*. The page had been reconciled BY HAND,
// once — which is the thing the item's own "what failing looks like" warns
// about: **a reconciliation is not a mechanism, and the next processor arrives
// without one.** It arrived. See section 3's verdict.
//
//   (b) fails BY NAME on a disagreement, in either direction  -> sections 3, 4
//   (c) the rule for "external host" lives in the CHECK        -> section 2
//   (d) the blind spots are DECLARED, not silently dropped     -> section 5
//
// ---------------------------------------------------------------------------
// CLAUSE (c), WRITTEN DOWN HERE RATHER THAN LEFT IN A REVIEWER'S HEAD
// ---------------------------------------------------------------------------
// **A host is a PROCESSOR when the product sends customer data to it, or
// fetches customer-specific data from it.** Everything else is one of six other
// things, and each one has to be SAID: a host nobody has classified FAILS the
// run rather than being dropped.
//
//   processor    receives customer data, or answers about a customer.
//                MUST be named in the PRIVACY block.
//   platform     the product runs ON it. Supabase and Netlify: they hold
//                everything, but they are the floor the product stands on
//                rather than a third party it hands data to. 7.8 clause (c)
//                names these two as the exception in those words.
//   own          our own domains.
//   credit       a licence-credit hyperlink. NO REQUEST IS EVER MADE.
//                `openstreetmap.org` is the worked example and the reason this
//                kind exists: naming it on the privacy page would be the other
//                half of the fault 7.8 is about.
//   plain-link   a hyperlink to a third party's own page carrying NO customer
//                data — a detailer's own payment handle, a policy page, an
//                account-permissions page. **The line between this and
//                `processor` is the whole of List B findings 2 and 3:** a
//                Directions link is a processor because the customer's address
//                is INSIDE the URL; a Venmo link is not, because the only thing
//                inside it is the detailer's own handle.
//   build        fetched by the runtime at cold start, never with customer data.
//   not-a-request  a string shaped like a hostname that is never fetched: a
//                storage key, an XML namespace, an example in a label.
//
// ---------------------------------------------------------------------------
// HOW THE HOSTS ARE FOUND, AND WHY THERE ARE TWO PASSES
// ---------------------------------------------------------------------------
// **A one-pass `https?://` grep misses the finding this check exists for.**
// Measured, not feared: `_shared/r2.ts:186` builds the photo store's host as
// `${cfg.accountId}.r2.cloudflarestorage.com` and `_shared/translate.ts:125`
// picks DeepL's host as a bare `"api.deepl.com"` / `"api-free.deepl.com"`.
// Neither carries a scheme. **A scheme-only pass reports a clean match over
// both**, which is clause (d)'s whole warning, and one of the two is the only
// processor this check finds missing from the page.
//
// So pass one takes `https?://<literal>`; pass two takes bare hostname literals
// and validates the last label against a declared TLD set. Both run on
// COMMENT-STRIPPED text — `docs/gotchas.md` 75 is about a count fooled by code
// quoted in a comment, and this file's own subjects do it twice: `r2.ts` quotes
// Amazon's example bucket in its header, and `db.ts` quotes the `esm.sh` import
// it removed in 2026-09. Both would otherwise be counted as live hosts.
//
// ---------------------------------------------------------------------------
// WHAT THIS CHECK CANNOT KNOW, AND SAYS SO RATHER THAN GUESSING
// ---------------------------------------------------------------------------
// **It judges THIS CHECKOUT, not the deployed functions.** Whether a function
// is running is `scripts/deployed-inventory.mjs`'s question and needs
// credentials. So a host called only by a function that has never been
// deployed still counts here — and must, because the page becomes wrong the
// moment Andrew publishes, not the moment somebody notices. The page already
// has the right shape for that case: its Google Business Profile section opens
// by saying it is not switched on yet.
//
// ---------------------------------------------------------------------------
// THE CANARIES, AND WHY THEY RUN THROUGH THE PRODUCTION FUNCTIONS
// ---------------------------------------------------------------------------
// `docs/gotchas.md` 95: a canary aimed at a COPY of the rule cannot bite. So
// `hostsIn()`, `classify()` and `reconcile()` are module-level functions, the
// run calls them, and section 6 calls **those same three** with four
// sabotages. ON BY DEFAULT. `PRIVACY_CANARY=off` disables them and section 6
// then fails on purpose, so a run cannot be green with them switched off.
//
// And three sabotages that break the REAL run, in memory, nothing on disk:
//
//   PRIVACY_BREAK=drop-name      strips "Geoapify" out of the page text -> § 3 red
//   PRIVACY_BREAK=new-host       adds api.sentry.io to a real file       -> § 2 red
//   PRIVACY_BREAK=flatten-blind  pretends run-time hosts are judgeable   -> § 5 red
//
// Recorded results are in ROADMAP 7.8.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";

const root = (p) => new URL(`../${p}`, import.meta.url);
const read = (p) => readFileSync(root(p), "utf8");

const BREAK = process.env.PRIVACY_BREAK || "";
const CANARY_ON = process.env.PRIVACY_CANARY !== "off";

const PAGE = "app/src/landing/legal.js";
const SCAN_DIRS = ["supabase/functions", "app/src"];
const SCAN_FILES = ["app/index.html"];
const SCAN_EXT = /\.(ts|tsx|js|jsx|html)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(root(dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(root(rel)).isDirectory()) walk(rel, out);
    else if (SCAN_EXT.test(name)) out.push(rel);
  }
  return out;
}

const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/^\s*\/\/.*$/gm, "");

// --------------------------------------------------------------------------
// THE TWO PASSES. Production code: section 6's canary calls this one.
//
// The bare pass is deliberately BOUNDED — `{1,40}` labels, at most five of
// them — rather than the obvious `(?:[a-z0-9-]+\.)+`. The unbounded form is
// catastrophic on a long base64 or minified run and this scan walks 237 files:
// the first draft of this check ran past 120 seconds and was killed.
// --------------------------------------------------------------------------
const TLDS = new Set(["com", "org", "net", "io", "gov", "app", "me", "dev", "sh", "co", "us", "cloud", "invalid", "test"]);
const SCHEMED = /https?:\/\/([A-Za-z0-9.${}_-]+)/g;
const BARE = /(?<=["'`}./])([A-Za-z0-9-]{1,40}(?:\.[A-Za-z0-9-]{1,40}){1,4})(?=["'`/?:])/g;

/** Every host literal in one file's text. An interpolated one keeps its `${`. */
export function hostsIn(text) {
  const src = stripComments(text);
  const found = new Set();
  for (const m of src.matchAll(SCHEMED)) found.add(m[1]);
  for (const m of src.matchAll(BARE)) {
    const labels = m[1].split(".");
    if (TLDS.has(labels[labels.length - 1].toLowerCase())) found.add(m[1]);
  }
  return found;
}

/** A host whose literal is incomplete in the source: finished at run time. */
export const isRuntimeBuilt = (host) => host.includes("${");

// --------------------------------------------------------------------------
// CLAUSE (c) AS A TABLE. Exact host strings, never patterns: a wildcard is
// slack and `docs/gotchas.md` 98 is about what slack costs. A host missing from
// this table FAILS section 2 — it is not dropped and it is not guessed at.
// --------------------------------------------------------------------------
const KINDS = new Set(["processor", "platform", "own", "credit", "plain-link", "build", "not-a-request"]);

const TABLE = {
  // --- processors: customer data goes out, or comes back about a customer ---
  "api.geoapify.com": { kind: "processor", processor: "Geoapify", why: "partial addresses as the customer types, and every saved address again for coordinates" },
  "api.weather.gov": { kind: "processor", processor: "US National Weather Service", why: "coordinates derived from a customer's address" },
  "api.resend.com": { kind: "processor", processor: "Resend", why: "customer name, email, service address and booking details" },
  "api.stripe.com": { kind: "processor", processor: "Stripe", why: "customer email and booking metadata on a payment" },
  "connect.stripe.com": { kind: "processor", processor: "Stripe", why: "the detailer's own onboarding, same company as the payments" },
  "js.stripe.com": { kind: "processor", processor: "Stripe", why: "loaded into the payer's browser on the payment screen" },
  "api.deepl.com": { kind: "processor", processor: "DeepL", why: "the detailer's own wording; addresses and phones are on a never-send list" },
  "api-free.deepl.com": { kind: "processor", processor: "DeepL", why: "the same provider on a free key" },
  "translation.googleapis.com": { kind: "processor", processor: "Google Translate", why: "the fallback translator, same payload" },
  "fonts.googleapis.com": { kind: "processor", processor: "Google Fonts", why: "every visitor's IP and browser string, on every page, before they type" },
  "fonts.gstatic.com": { kind: "processor", processor: "Google Fonts", why: "the font files themselves, same flow" },
  "www.google.com": { kind: "processor", processor: "Google Maps", why: "the customer's full address inside a Directions URL (the default maps choice)" },
  "maps.apple.com": { kind: "processor", processor: "Apple Maps", why: "the same address, when the detailer's maps preference is Apple" },
  "waze.com": { kind: "processor", processor: "Waze", why: "the same address, when the detailer's maps preference is Waze" },
  "calendar.google.com": { kind: "processor", processor: "Google Calendar", why: "customer name, address, phone AND free-text notes, when the calendar preference is Google" },
  "r2.cloudflarestorage.com": { kind: "processor", processor: "Cloudflare", why: "job photographs — the store `photo-door`, `photo-reconcile` and `delete-customer` sign for" },
  "cloudflare-dns.com": { kind: "processor", processor: "Cloudflare", why: "the DNS-over-HTTPS lookup `verify-domain` makes for a detailer's proof record (ROADMAP 97.13): the hostname being checked and nothing else" },
  "api.cloudflare.com": { kind: "processor", processor: "Cloudflare", why: "the public-photo cache purge (ROADMAP 100.6): one already-public business-media address, business id and random file id only, no customer or visitor data" },

  // --- platform: the floor the product stands on, 7.8 clause (c)'s exception -
  "netlify.app": { kind: "platform", processor: null, why: "a Netlify preview hostname, used to recognise one" },

  // --- our own ------------------------------------------------------------
  "detailingplatform.com": { kind: "own", processor: null, why: "our own domain — the product's own origin, not a third party" },
  "www.detailingplatform.com": { kind: "own", processor: null, why: "the same domain with the www label, redirected to the bare one" },

  // --- licence credit: no request is EVER made ----------------------------
  "www.openstreetmap.org": { kind: "credit", processor: null, why: "a licence credit Geoapify's terms require. NOTHING is ever sent there, and 7.8's audit is explicit that naming it as a processor would be a fault of its own" },
  "www.geoapify.com": { kind: "credit", processor: null, why: "the credit line's link to the provider's own site" },

  // --- plain links: no customer data in the URL ---------------------------
  "venmo.com": { kind: "plain-link", processor: null, why: "built from the DETAILER's own handle only" },
  "cash.app": { kind: "plain-link", processor: null, why: "built from the detailer's own handle only" },
  "paypal.me": { kind: "plain-link", processor: null, why: "built from the detailer's own handle only" },
  "myaccount.google.com": { kind: "plain-link", processor: null, why: "a permissions page the privacy copy tells the reader to visit" },
  "developers.google.com": { kind: "plain-link", processor: null, why: "a link to Google's own published policy, quoted on the page" },

  // --- never fetched ------------------------------------------------------
  "www.w3.org": { kind: "not-a-request", processor: null, why: "the SVG XML namespace. It is an identifier, not a URL anything resolves" },
  "dp.lang.app": { kind: "not-a-request", processor: null, why: "a localStorage key that happens to end in a TLD" },
  "example.com": { kind: "not-a-request", processor: null, why: "a dev fixture's placeholder" },
  "unconfigured.invalid": { kind: "not-a-request", processor: null, why: "the deliberate placeholder for a missing Supabase URL; `.invalid` can never resolve" },
  "yourdetailing.com": { kind: "not-a-request", processor: null, why: "an example web address shown to a detailer while they choose one" },
  "tudetallado.com": { kind: "not-a-request", processor: null, why: "the Spanish copy of that same example" },
};

/** `{kind, processor, why}`, or null when nothing in the table matches. */
export function classify(host) {
  const row = TABLE[host.toLowerCase()];
  if (!row) return null;
  if (!KINDS.has(row.kind)) throw new Error(`the table row for ${host} has an unknown kind: ${row.kind}`);
  return row;
}

// --------------------------------------------------------------------------
// CLAUSE (b), THE PAGE SIDE. A declared vocabulary of processor NAMES, each
// tied to the hosts that earn it. BOTH directions are read off this one list:
// a name the code earns and the page omits, and a name the page states that no
// host earns.
//
// The entries with NO host are the load-bearing half of the second direction.
// 7.8's audit prizes one finding above its four gaps — *"there is no analytics,
// no error reporting, no tag manager and no session recording anywhere in this
// product"* — and a clean negative is exactly the kind of claim that rots
// silently. Naming those vendors here means the page cannot acquire one of them
// without reddening this run.
//
// Supabase and Netlify are deliberately ABSENT from this list. The page names
// both, and should; they are `platform` by clause (c), so they earn no name
// here, and listing them would make section 4 fail for disclosing more than the
// rule requires.
// --------------------------------------------------------------------------
const VOCAB = [
  { name: "Geoapify", hosts: ["api.geoapify.com"], says: ["Geoapify"] },
  { name: "US National Weather Service", hosts: ["api.weather.gov"], says: ["US National Weather Service"] },
  { name: "Resend", hosts: ["api.resend.com"], says: ["Resend"] },
  { name: "Stripe", hosts: ["api.stripe.com", "connect.stripe.com", "js.stripe.com"], says: ["Stripe"] },
  { name: "DeepL", hosts: ["api.deepl.com", "api-free.deepl.com"], says: ["DeepL"] },
  { name: "Google Translate", hosts: ["translation.googleapis.com"], says: ["Google's translation service", "Google Translate"] },
  { name: "Google Fonts", hosts: ["fonts.googleapis.com", "fonts.gstatic.com"], says: ["Google Fonts"] },
  { name: "Google Maps", hosts: ["www.google.com"], says: ["Google Maps"] },
  { name: "Apple Maps", hosts: ["maps.apple.com"], says: ["Apple Maps"] },
  { name: "Waze", hosts: ["waze.com"], says: ["Waze"] },
  { name: "Google Calendar", hosts: ["calendar.google.com"], says: ["Google Calendar"] },
  { name: "Cloudflare", hosts: ["r2.cloudflarestorage.com", "api.cloudflare.com", "cloudflare-dns.com"], says: ["Cloudflare"] },
  // must NEVER be earned, so must never appear on the page
  { name: "OpenStreetMap", hosts: [], says: ["OpenStreetMap"] },
  { name: "Sentry", hosts: [], says: ["Sentry"] },
  { name: "PostHog", hosts: [], says: ["PostHog"] },
  { name: "Google Analytics", hosts: [], says: ["Google Analytics"] },
  { name: "Plausible", hosts: [], says: ["Plausible"] },
  { name: "Mixpanel", hosts: [], says: ["Mixpanel"] },
  { name: "LogRocket", hosts: [], says: ["LogRocket"] },
];
const DECLARED_VOCAB = 19;

/** Both directions of the disagreement, by name. Production code. */
export function reconcile(earned, pageText) {
  const missing = [];
  const extra = [];
  for (const v of VOCAB) {
    const onPage = v.says.some((s) => pageText.includes(s));
    const byCode = earned.has(v.name);
    if (byCode && !onPage) missing.push(v);
    if (!byCode && onPage) extra.push(v);
  }
  return { missing, extra };
}

// --------------------------------------------------------------------------
// CLAUSE (d) — THE UNJUDGEABLE BUCKET, DECLARED. Reported by name on every
// run, pass or fail, and asserted with an EQUALITY: this is a declaration of
// how much is invisible, and `docs/gotchas.md` 98 is about what an inequality
// here would cost. A seventh interpolated host reddens the run.
// --------------------------------------------------------------------------
const DECLARED_RUNTIME = {
  "${PLATFORM_DOMAIN}": "our own domain, from the environment — `invite-user` building an invite link",
  "${String": "`originForHost` — a tenant's own booking host, normalised",
  "${domRes.data": "a tenant's own custom domain, read back from the database",
  "${host}": "two places: DeepL's host chosen from the key's suffix, and the custom domain `verify-domain` fetches",
  "${o.host}${path}": "Cloudflare R2's presigned URL. The host SUFFIX is a literal and is caught; the account id is not",
  "${url}": "a detailer's own web address, typed into the back office",
};

// NOT GREPPABLE AT ALL — no literal of any kind exists in the source, so no
// pass of any check can find these. Declared from reading the code, which is
// the only way, and that is the honest statement of this check's ceiling.
const NO_LITERAL_AT_ALL = [
  { host: "the Supabase project host", why: "read from SUPABASE_URL in the environment; no literal anywhere", verdict: "platform by clause (c), and the page names Supabase anyway" },
  { host: "the browser push endpoints (Google, Mozilla, Apple)", why: "arrive inside the subscription object the browser hands us, and `web-push` posts to whatever is in it", verdict: "processors, and the page names all three" },
  { host: "Stripe's hosted pages (checkout.stripe.com and friends)", why: "the URL is returned BY Stripe's API at run time; the only literal in this repo is in comments", verdict: "Stripe, already named" },
  { host: "a detailer's own custom domain", why: "fetched by `verify-domain` to read a proof file", verdict: "not a processor: no customer data, and it is the detailer's own host" },
  { host: "any host a future environment variable introduces", why: "an env-var host is invisible to a text scan by construction", verdict: "UNJUDGEABLE. This is the ceiling: a processor added purely by configuration will not redden this check" },
];
const DECLARED_NO_LITERAL = 5;

// --------------------------------------------------------------------------
// the run
// --------------------------------------------------------------------------
const FILES = [...SCAN_DIRS.flatMap((d) => walk(d)), ...SCAN_FILES];

const sites = new Map();
for (const f of FILES) {
  let text = read(f);
  if (BREAK === "new-host" && f.endsWith("_shared/geoapify.ts")) {
    text += '\nconst sabotage = await fetch("https://api.sentry.io/envelope");\n';
  }
  const hosts = hostsIn(text);
  if (!hosts.size) continue;
  const lines = stripComments(text).split("\n");
  for (const h of hosts) {
    const at = lines.findIndex((l) => l.includes(h));
    sites.set(h, [...(sites.get(h) || []), `${f}:${at + 1}`]);
  }
}

const ALL = [...sites.keys()].sort();
const RUNTIME = BREAK === "flatten-blind" ? [] : ALL.filter(isRuntimeBuilt);
const LITERAL = ALL.filter((h) => !RUNTIME.includes(h));

const unknown = LITERAL.filter((h) => !classify(h));
const earned = new Set(LITERAL.filter((h) => classify(h)?.kind === "processor").map((h) => classify(h).processor));

// The page text is the PRIVACY block's prose only. Comments inside it are
// editorial notes no visitor ever reads, and two of them name services — one
// names a processor the page deliberately does not carry.
function privacyText() {
  const src = read(PAGE);
  const from = src.indexOf("export const PRIVACY");
  assert.ok(from > 0, `${PAGE} has no PRIVACY export — the page side of this check has no subject`);
  let text = stripComments(src.slice(from));
  if (BREAK === "drop-name") text = text.replace(/Geoapify/g, "the suggestion service");
  return text;
}
const PAGE_TEXT = privacyText();
const { missing, extra } = reconcile(earned, PAGE_TEXT);

// DISCOVERY FLOORS, and they stay floors: finding more hosts or more files than
// expected is not a fault (`docs/gotchas.md` 98). They exist so that a pass
// which has stopped matching fails instead of reading as all-clear.
const FILE_FLOOR = 200;
const HOST_FLOOR = 30;
const PAGE_FLOOR = 6000;

test("0 — the check has subjects, and both passes are still matching", () => {
  assert.ok(FILES.length >= FILE_FLOOR,
    `only ${FILES.length} files scanned, floor ${FILE_FLOOR} — the walk is not reaching the code`);
  assert.ok(PAGE_TEXT.length >= PAGE_FLOOR,
    `the PRIVACY block read as ${PAGE_TEXT.length} characters, floor ${PAGE_FLOOR} — the slice is wrong, `
    + "and a short slice makes every processor look absent");
  assert.ok(ALL.length >= HOST_FLOOR,
    `only ${ALL.length} distinct hosts found, floor ${HOST_FLOOR} — a pass has stopped matching`);
  console.log(`     ${FILES.length} files · ${ALL.length} hosts · ${LITERAL.length} literal · ${RUNTIME.length} run-time`);
  console.log(`     ${earned.size} processors earned by the code · PRIVACY block ${PAGE_TEXT.length} chars`);
});

test("1 — the clause-(c) table and the vocabulary are declared, not drifting", () => {
  assert.equal(VOCAB.length, DECLARED_VOCAB,
    `the vocabulary is ${VOCAB.length} names and declares ${DECLARED_VOCAB}. An equality on purpose: `
    + "this list is a declaration of what the page may and may not say, and a ceiling with room in "
    + "it means the next name lands with nothing going red");
  for (const [host, row] of Object.entries(TABLE)) {
    assert.ok(KINDS.has(row.kind), `${host} has an unknown kind ${row.kind}`);
    assert.ok(row.why && row.why.length > 15, `${host} is classified without a reason worth reading`);
    assert.equal(row.kind === "processor", row.processor !== null,
      `${host} is kind ${row.kind} and ${row.processor === null ? "names no" : "names a"} processor — one of the two is wrong`);
  }
  for (const v of VOCAB) {
    for (const h of v.hosts) {
      assert.equal(classify(h)?.processor, v.name,
        `the vocabulary says ${h} earns "${v.name}" and the table disagrees — the two halves of `
        + "this check are keyed on each other and have come apart");
    }
  }
});

test("2 — (c) every literal host classifies, and one that does not fails by name", () => {
  if (unknown.length) {
    const lines = unknown.map((h) => `    ${h}\n        ${sites.get(h).join(", ")}`).join("\n");
    assert.fail(`${unknown.length} host(s) are not in this check's clause-(c) table, so NOBODY has said `
      + `whether each one is a processor, and the privacy page cannot be judged at all until somebody `
      + `does. Classify each in TABLE:\n${lines}`);
  }
});

test("3 — (b) every processor the code calls is named in the PRIVACY block", () => {
  if (missing.length) {
    const lines = missing.map((v) => {
      const where = v.hosts.flatMap((h) => sites.get(h) || []).join(", ");
      const why = v.hosts.map((h) => classify(h)?.why).filter(Boolean)[0] || "";
      return `    ${v.name}\n        earned by: ${v.hosts.join(", ")}\n        at: ${where}\n        receives: ${why}`;
    }).join("\n");
    assert.fail(`${missing.length} processor(s) receive customer data and are NOT named in the PRIVACY `
      + `block of ${PAGE}. The page is inaccurate, which 7.8's own ruling calls the floor rather than `
      + `the preference:\n${lines}`);
  }
});

test("4 — (b) every processor the page names is one the code calls", () => {
  if (extra.length) {
    const lines = extra.map((v) => `    ${v.name} — nothing in this code calls `
      + `${v.hosts.length ? v.hosts.join(", ") : "any host that would earn this name"}`).join("\n");
    assert.fail(`${extra.length} name(s) in the PRIVACY block are earned by no host this check found. `
      + `Either the code stopped calling them, or the page is claiming a relationship that does not `
      + `exist — and for OpenStreetMap that claim would be a fault of its own:\n${lines}`);
  }
});

test("5 — (d) the blind spots are declared by name, and the declaration is exact", () => {
  assert.deepEqual(RUNTIME.sort(), Object.keys(DECLARED_RUNTIME).sort(),
    "the set of run-time-built hosts in the code is not the set this check declares. A new one is a "
    + "NEW BLIND SPOT and has to be written down with what it is, not absorbed");
  assert.equal(NO_LITERAL_AT_ALL.length, DECLARED_NO_LITERAL,
    `${NO_LITERAL_AT_ALL.length} hosts declared as ungreppable, ${DECLARED_NO_LITERAL} expected`);
  for (const e of NO_LITERAL_AT_ALL) {
    assert.ok(e.why.length > 20 && e.verdict.length > 10, `${e.host} is declared without saying why or what it is`);
  }
  console.log("     UNJUDGEABLE — host completed at run time, this check cannot resolve it:");
  for (const h of RUNTIME) console.log(`       ${h}  —  ${DECLARED_RUNTIME[h]}\n           ${sites.get(h).join(", ")}`);
  console.log("     UNJUDGEABLE — no literal of any kind in the source, declared from reading:");
  for (const e of NO_LITERAL_AT_ALL) console.log(`       ${e.host}\n           ${e.why}\n           -> ${e.verdict}`);
});

test("6 — the canaries bite, through the same three functions the run used", () => {
  if (!CANARY_ON) {
    assert.fail("PRIVACY_CANARY=off — the sabotages are disabled, so this run proves nothing about "
      + "whether sections 2, 3 and 4 are able to fail at all");
  }
  assert.equal(classify("api.sentry.io"), null,
    "classify() answers for api.sentry.io — the table has grown a wildcard and section 2 can no longer "
    + "catch a new processor");
  assert.ok(hostsIn('const h = "api.deepl.com";').has("api.deepl.com"),
    "hostsIn() no longer finds a bare hostname literal — the second pass is dead, and Cloudflare R2 "
    + "and DeepL go back to being invisible");
  assert.ok(reconcile(earned, PAGE_TEXT.replace(/Geoapify/g, "x")).missing.some((v) => v.name === "Geoapify"),
    "reconcile() did not notice Geoapify missing from the page — section 3 is vacuous");
  assert.ok(reconcile(new Set(), PAGE_TEXT).extra.length > 0,
    "reconcile() found nothing extra against an EMPTY code list — section 4 is vacuous");
  console.log("     canary on: 4 sabotages through hostsIn/classify/reconcile, all 4 came back as failures");
});

// A SABOTAGE PROVES A SECTION CAN FAIL. IT PROVES NOTHING ABOUT WHETHER IT CAN
// PASS, and section 3 is red on arrival — so without this, "red for the right
// reason" and "red because the comparison is broken" look identical.
test("7 — positive control: naming a processor is what makes section 3 go green", () => {
  const before = reconcile(earned, PAGE_TEXT).missing.map((v) => v.name);
  const after = reconcile(earned, `${PAGE_TEXT} Cloudflare `).missing.map((v) => v.name);
  assert.deepEqual(after, before.filter((n) => n !== "Cloudflare"),
    "adding the word Cloudflare to the page text did not clear exactly Cloudflare from section 3's "
    + "list and leave the rest alone — the comparison is not doing what its failure message claims");
  console.log(`     section 3 red on: [${before.join(", ")}] · with "Cloudflare" on the page: `
    + `[${after.join(", ") || "nothing"}]`);
});
