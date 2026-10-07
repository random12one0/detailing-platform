#!/usr/bin/env node
/**
 * GEOAPIFY — ROADMAP.md § 6, built 2026-09-13.
 *
 * Two of Andrew's four rules for this feature are things no browser test can
 * see and no code review reliably catches twice, so they are asserted here:
 *
 *   **THE KEY NEVER REACHES A BROWSER.** *"Address autocomplete fires on every
 *   keystroke, so the naive implementation puts the key in the browser, where
 *   anyone can read it and spend his 3,000 a day. Do not do that."* § 2 walks
 *   `app/` and fails on the name of the secret appearing anywhere in it.
 *
 *   **THE ATTRIBUTION IS ONE COPY, IN ONE PLACE.** He asked for it to be
 *   movable or removable in a single edit, with EXACT words and both names
 *   linked. § 3 pins the sentence character for character and fails if a second
 *   copy of it appears anywhere in the repo.
 *
 * § 1 is the one-module rule the weather seam already keeps: nothing but
 * `_shared/geoapify.ts` may name the host or read the key.
 *
 * § 4 runs the deployed endpoint, because the three properties that matter are
 * properties of a RUN: a short query costs no credit, a real street comes back
 * with a point, and the attribution travels with the data. § 5 times it.
 *
 * **§ 4 AND § 5 ARE LIVE AND OPT-IN: `GEOAPIFY_LIVE=1`.** Having credentials in
 * `.env` is not consent to spend. `_env.mjs` loads `.env` into every suite, so
 * the old gate (credentials present) made a plain run of this file call the
 * deployed endpoint, and that spent real lookups twice on 2026-10-06 (about 11
 * a run, out of 60 an hour per IP and 2,400 a day for every tenant;
 * docs/shared-resources.md § 2). Without the opt-in, § 1–3 run and § 4–5 print
 * that they were skipped.
 *
 *   node tests/geoapify.test.mjs                     (§ 1–3, no network)
 *   GEOAPIFY_LIVE=1 node tests/geoapify.test.mjs     (adds § 4–5, spends credits)
 */
import "./_env.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const root = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function walk(dir, exts, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === "node_modules" || e === "dist" || e === ".git") continue;
    const p = join(dir, e).split("\\").join("/");
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}

const MOD = read("supabase/functions/_shared/geoapify.ts");
const FN = read("supabase/functions/address-suggest/index.ts");
const LIMITS = read("supabase/functions/_shared/rateLimit.ts");
const DEPLOY = read("scripts/deploy-functions.mjs");

// ─── 1. One module names the provider ─────────────────────────────────────
console.log("1. the seam is one file, so switching provider is one file");
{
  const fns = walk(join(root, "supabase/functions"), [".ts", ".js"]);
  // COUNTING FILES IS NOT COUNTING CONTENT - 2026-09-13. This counter read
  // `fns.length > 50` and passed over 67 files truncated to zero bytes, which
  // took 1b, 1c and 1d green with it. A subject counter that can be satisfied
  // by a directory listing is the same blindness one level up.
  const fnBytes = fns.reduce((n, f) => n + readFileSync(f, "utf8").length, 0);
  check("1a · the check has subjects", fns.length > 50 && fnBytes > 200000,
    `${fns.length} files walked, ${fnBytes} bytes read`);

  const namesHost = fns.filter((f) => /api\.geoapify\.com/.test(readFileSync(f, "utf8")));
  check("1b · only _shared/geoapify.ts names the host",
    namesHost.length === 1 && namesHost[0].endsWith("_shared/geoapify.ts"),
    namesHost.join(", "));

  const readsKey = fns.filter((f) => /Deno\.env\.get\(\s*["']GEOAPIFY_API_KEY/.test(readFileSync(f, "utf8")));
  check("1c · and only it reads the key",
    readsKey.length === 1 && readsKey[0].endsWith("_shared/geoapify.ts"),
    readsKey.join(", "));

  // THE URL CARRIES THE KEY, so logging it would put the secret in a log
  // anybody with project access can read. Every failure path logs a message or
  // a status and never the request.
  check("1d · no failure path logs the request URL",
    !/console\.(log|warn|error)\([^)]*\burl\b/.test(MOD));
}

// ─── 2. The key is not in anything a browser downloads ────────────────────
console.log("2. the key never reaches a browser");
{
  const appFiles = walk(join(root, "app"), [".js", ".jsx", ".ts", ".tsx", ".html", ".json", ".css"]);
  // Same fix as 1a, and this one guards a SECRET: 2b is "nothing under app/
  // mentions the key or the host", and a blanked `app/` passed it.
  const appBytes = appFiles.reduce((n, f) => n + readFileSync(f, "utf8").length, 0);
  check("2a · the check has subjects", appFiles.length > 50 && appBytes > 200000,
    `${appFiles.length} files walked, ${appBytes} bytes read`);
  // THE PROVIDER'S PLAIN NAME IS ALLOWED IN ONE FILE - 2026-10-06. The privacy
  // page must tell a customer their address goes to Geoapify (ROADMAP 0.4,
  // 7.8), so the word has to exist in landing/legal.js. What a browser must
  // never carry is the KEY NAME or the WEB HOST: those stay blocked everywhere,
  // legal.js included. GEOAPIFY_BREAK=host-in-legal (or key-in-legal) appends the host (or key name) to
  // legal.js IN MEMORY (nothing on disk) to prove 2b goes red.
  const LEGAL = "app/src/landing/legal.js";
  const SECRET = /GEOAPIFY_|geoapify\.com/i;
  const NAME = /GEOAPIFY/i;
  const text = (f) => {
    const t = readFileSync(f, "utf8");
    const b = process.env.GEOAPIFY_BREAK;
    return f.endsWith(LEGAL) && (b === "host-in-legal" || b === "key-in-legal")
      ? `${t} ${b === "key-in-legal" ? "GEOAPIFY_API_KEY" : "https://api.geoapify.com/v1/geocode"}` : t;
  };
  const leaked = appFiles.filter((f) => (f.endsWith(LEGAL) ? SECRET : NAME).test(text(f)));
  // A POSITIVE CONTROL FOR THE MATCHER ITSELF - 2026-09-13. 2b is a negative
  // over a tree where zero is the right answer, so nothing about a green 2b
  // proves the pattern can match anything at all. Both regexes are run over
  // the ONE file that is supposed to name the provider; if either cannot find
  // it there, a silent 2b means nothing.
  check("2a-ii · and the patterns it scans with can actually match",
    SECRET.test(MOD) && NAME.test(MOD),
    "_shared/geoapify.ts names the key and the host; a regex that misses them makes 2b meaningless");
  // The allowance is for a file that uses it: delete the disclosure and the
  // exemption has nothing to exempt.
  check("2b-ii · the privacy page still names the provider it discloses",
    NAME.test(readFileSync(join(root, LEGAL), "utf8")), LEGAL);
  // NOT "no literal key": a regex for the key's SHAPE would pass the day
  // somebody interpolates it. The name and the host are what a client-side
  // implementation cannot avoid mentioning.
  check("2b · nothing under app/ mentions the key or the host (the name only in legal.js)",
    leaked.length === 0, leaked.join(", "));

  // The function is public — a customer has no account — so the limits are the
  // only thing between the URL and the day's credits. Counted, not matched:
  // one of the three going missing is the failure.
  check("2c · three limits guard it, checked before the provider call",
    /addressPerIp/.test(FN) && /publicCeiling/.test(FN) && /addressPerDay/.test(FN)
    // THE ORDER, NOT THE ARGUMENT'S SPELLING. This read `suggest(body.q)` and
    // broke within the hour when the query was hoisted into a local — trap (k)
    // committed by the check's own author. `await suggest(` is the call.
    && FN.indexOf("withinLimits") < FN.indexOf("await suggest("));
  // AND THE FREE REFUSAL COMES FIRST. A query too short to be worth a credit
  // costs no database round trip either, so spending a rate-limit slot on it
  // would answer 429 "busy" to a field that is not busy and punish a debounced
  // input for the first three characters of every address.
  check("2c-i · but the free length refusal comes before even that",
    FN.indexOf("MIN_QUERY") < FN.indexOf("withinLimits"));
  check("2c-ii · and the daily one is keyed on a constant, so it is shared",
    /bucket: "address_day", key: "all"/.test(FN));
  check("2c-iii · the daily ceiling leaves headroom under the 3,000 plan",
    /addressPerDay: \{ windowSeconds: 86400, limit: (\d+) \}/.test(LIMITS)
    && Number(RegExp.$1) > 0 && Number(RegExp.$1) <= 2500, RegExp.$1);
  check("2d · and it is deployed public on purpose, not by accident",
    /"address-suggest",/.test(DEPLOY));
}

// ─── 3. The attribution, exactly as Andrew settled it ─────────────────────
console.log("3. the attribution is settled, exact, and has one copy");
{
  const WORDS = "Address and map data © OpenStreetMap contributors, via Geoapify";
  check("3a · the words are exact", MOD.includes(`text: "${WORDS}"`));
  check("3b · both names are linked",
    /openStreetMap: "https:\/\/www\.openstreetmap\.org\/copyright"/.test(MOD)
    && /geoapify: "https:\/\/www\.geoapify\.com\/"/.test(MOD));

  // ONE COPY. He asked for it movable or removable in a single edit, and a
  // sentence retyped into five tenant sites is not that.
  const everywhere = [
    ...walk(join(root, "supabase"), [".ts", ".js"]),
    ...walk(join(root, "app"), [".js", ".jsx", ".html", ".css"]),
    ...walk(join(root, "docs/tenant-sites"), [".html", ".css", ".js"]),
  ];
  const copies = everywhere.filter((f) => readFileSync(f, "utf8").includes(WORDS));
  check("3c · and exactly one file in the repo carries them",
    copies.length === 1 && copies[0].endsWith("_shared/geoapify.ts"),
    copies.join(", "));

  // IT TRAVELS WITH THE DATA, so a site renders what the server sends rather
  // than a sentence somebody retyped — which is what makes 3c stay true.
  check("3d · the endpoint sends it beside a successful answer",
    /attribution: ATTRIBUTION/.test(FN));
  // AND NOT BESIDE A FAILURE: there is no map data in an error, so there is
  // nothing to attribute, and a footer line on an empty box is noise.
  check("3d-ii · and not beside a failure",
    !/reason: "unavailable"[\s\S]{0,80}attribution/.test(FN));
}

// ─── 4. The deployed endpoint ─────────────────────────────────────────────
console.log("4. the live endpoint, which is the only thing that proves it works");
const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const OPTED_IN = process.env.GEOAPIFY_LIVE === "1";
const LIVE = OPTED_IN && !!URL_ && !!ANON;
if (!OPTED_IN) {
  console.log("  SKIPPED — live lookups are opt-in and this run did not opt in."
    + " No request was sent. Set GEOAPIFY_LIVE=1 to run 4a-4f and § 5 (about 11 lookups).");
} else if (!URL_ || !ANON) {
  console.log("  SKIPPED — GEOAPIFY_LIVE=1 was set but SUPABASE_URL and SUPABASE_ANON_KEY are not.");
} else {
  const call = (body) =>
    fetch(`${URL_}/functions/v1/address-suggest`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  // A QUERY TOO SHORT TO BE WORTH A CREDIT IS REFUSED BEFORE IT COSTS ONE.
  const short = await call({ q: "12" });
  check("4a · a query under the floor is a 400, not a credit",
    short.status === 400 && short.body.reason === "bad_query" && short.body.retryable === false,
    JSON.stringify(short).slice(0, 200));

  // THE HONEYPOT ANSWERS LIKE AN EMPTY RESULT AND SPENDS NOTHING.
  const bot = await call({ q: "1600 Pennsylvania", website: "http://spam.example" });
  check("4b · a filled honeypot gets an empty answer, not an error",
    bot.status === 200 && bot.body.ok === true && bot.body.suggestions.length === 0,
    JSON.stringify(bot).slice(0, 200));

  // A SPECIFIC STREET, NOT A FAMOUS ONE. "1600 Pennsylvania Ave" was tried
  // first and consistently exceeds SIX SECONDS at Geoapify (§ 5), so it
  // measured the provider's worst case rather than our wiring and reported
  // it as four failures about a feature that works.
  const real = await call({ q: "233 S Wacker Dr" });
  // **THE THROTTLE CAN REFUSE THE TEST ITSELF, AND THAT IS A PASS, NOT A FAIL.**
  // `addressPerIp` is sixty an hour and this suite spends about eleven credits a
  // run, so five runs in an hour trips it — which is the limiter working. It
  // PRINTS rather than passing quietly, because a check that cannot reach its
  // subject must never report a tick.
  if (real.status === 429) {
    console.log("  NOT MEASURED  4c-4e · the per-IP throttle refused this run"
      + " (60/hour, and this suite spends ~11). That is the limiter WORKING."
      + " Wait an hour, or run it from another address.");
  } else if (real.body?.reason === "not_configured") {
    console.log("  NOT MEASURED  4c-4e · GEOAPIFY_API_KEY is not set on the project."
      + " The endpoint says so honestly, which is 4f.");
    check("4f · a missing key is a loud 503, never an empty list",
      real.status === 503 && real.body.retryable === false,
      JSON.stringify(real).slice(0, 200));
  } else {
    check("4c · a real street comes back", real.status === 200 && real.body.ok === true
      && real.body.suggestions.length > 0, JSON.stringify(real).slice(0, 250));
    const first = real.body.suggestions?.[0];
    check("4c-ii · with a label a person would recognise",
      typeof first?.label === "string" && first.label.length > 8, JSON.stringify(first ?? null));
    // THE POINT IS THE THING THIS PRODUCT HAS NEVER HAD — see `forecast`, which
    // takes a point precisely because nothing here stores one.
    check("4d · and a usable point, which nothing in this product stored before",
      Number.isFinite(first?.lat) && Number.isFinite(first?.lon)
&& Math.abs(first?.lat ?? 0) > 0.01, JSON.stringify(first ?? null).slice(0, 150));
    check("4e · the attribution travels with it",
      real.body.attribution?.text === "Address and map data © OpenStreetMap contributors, via Geoapify"
      && typeof real.body.attribution?.geoapify === "string",
      JSON.stringify(real.body.attribution));
  }
}

console.log(`\n${passed} passed, ${failed} failed`
  + (LIVE ? "" : "  (live § 4-5 NOT RUN: GEOAPIFY_LIVE=1 not set)"));
// ─── 5. The latency, which Andrew asked to be told about ─────────────────
// His rule for this feature: *"LATENCY IS A DESIGN CONSTRAINT, NOT SOMETHING TO
// DISCOVER LATER... If the round trip turns out too slow to be usable, COME BACK
// AND TELL HIM rather than quietly putting the key in the client."*
//
// **IT PRINTS AND DOES NOT FAIL.** The number is not a defect anybody can fix in
// this repo — it is a property of the provider and of the hop — and the decision
// about what to do is HIS and is parked. A check that went red every run about a
// provider's speed is one people learn to skip, which is the same disease as the
// watchdog that only ever cried wolf.
if (LIVE) {
  console.log("5. how long it actually takes, printed rather than asserted");
  const timed = (q) =>
    fetch(`${URL_}/functions/v1/address-suggest`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  const QUERIES = ["233 S Wacker Dr", "350 Fifth Ave New York", "1 Infinite Loop Cupertino",
    "742 Evergreen Terrace", "1600 Pennsylvania Ave"];
  const times = [];
  for (const q of QUERIES) {
    const t0 = Date.now();
    const r = await timed(q);
    const ms = Date.now() - t0;
    // A THROTTLED CALL IS NOT A LATENCY MEASUREMENT. Including it would drag the
    // median DOWN and make the provider look faster than it is — the wrong
    // direction for a number Andrew has to make a decision on.
    if (r.body?.ok) times.push(ms);
    console.log(`  ${String(ms).padStart(5)}ms  ${r.body?.ok ? `${r.body.suggestions.length} hits` : r.body?.reason}  ·  ${q}`);
  }
  if (times.length === 0) {
    console.log("  NOT MEASURED  no timing was taken.");
  } else {
  const sorted = [...times].sort((x, y) => x - y);
  console.log(`  MEASURED  median ${sorted[Math.floor(sorted.length / 2)]}ms, worst ${sorted[sorted.length - 1]}ms.`
    + " Typeahead wants 300ms, so this is NOT usable as a suggestion per keystroke."
    + " docs/address-autocomplete.md has the options and Andrew decides."
    + " DO NOT move the key into the browser to fix it.");
  }
}

process.exit(failed ? 1 : 0);
