// TRANSLATE-ON-SAVE, CHECKED BY RUNNING IT — roadmap item 3, 2026-09-13.
//
// Every section here exists because something in this feature can be wrong while
// looking right, which is `FOUND.md`'s finding for this whole run: the failure
// mode of an instrument is silence, and silence is also what success looks like.
//
// WHAT EACH SECTION IS PROTECTING, and none of it is "the code compiles":
//
//   § 1  The provider ladder, RUN with a stubbed `fetch`. There is no Deno on
//        this machine, so without this the failure ladder would be a guess.
//   § 2  The JS hash and the Postgres hash AGREE. They are the cache key; if
//        they ever disagree the feature still "works" and re-bills every save
//        for ever.
//   § 3  The database refuses what it must — a wrong hash, a business NAME, a
//        blank — and a HUMAN EDIT SURVIVES a later machine pass.
//   § 4  The classifier's lists are complete against the REAL payload, and an
//        unclassified field is LOUD. Andrew's 2026-09-13 condition.
//   § 5  The gauge rolls its month and cannot report a stale one.
//   § 6  The privileges, ASKED OF THE DATABASE WITH THE ANON KEY. § 6 is here
//        because the first version of the migration revoked from `anon` and not
//        from `public`, which took nothing away — and a check that grepped the
//        migration for the word `revoke` would have passed on it.
//   § 7  Neither API key name appears anywhere under `app/`.
//
//   node tests/translations.test.mjs    (§ 1, § 4b-e and § 7 are credential-free)

import "./_env.mjs";           // root .env -> process.env, before anything reads it
import { readFileSync, readdirSync, statSync } from "node:fs";
import { BATCH, sha256hex, translateBatch, unescapeEntities } from "../supabase/functions/_shared/translate.ts";
import { classify, REVIEW_PATHS, SKIP, TRANSLATE } from "../supabase/functions/_shared/translatable.ts";

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

let passed = 0, failed = 0, skipped = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
// A SKIPPED CHECK MUST NOT READ LIKE A PASSING ONE. This repo's most repeated
// failure; `CLAUDE.md` § Verification rule 1.
const skip = (name, why) => { skipped++; console.log(`  SKIP  ${name} — ${why}`); };
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await r.json().catch(() => null);
  return { status: r.status, ok: r.status < 300, body };
};
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ───────────────────────────────────────────────────────────────────────────
// § 1 · The provider ladder, actually run
// ───────────────────────────────────────────────────────────────────────────
// `translate.ts` imports nothing so this can load and RUN it. 1a is what keeps
// that true: an import added there disarms this entire section, which is the
// `retryRead.ts` lesson applied before it happens.
console.log("\n§ 1 · the provider ladder, run with a stubbed fetch");

for (const f of ["translate.ts", "translatable.ts"]) {
  const src = read(`supabase/functions/_shared/${f}`);
  const imports = src.split(/\r?\n/).filter((l) => /^\s*import\s|require\(/.test(l));
  ok(`1a · _shared/${f} has no imports, so this suite can run it`, imports.length === 0, imports.join(" | "));
}

const realFetch = globalThis.fetch;
const calls = [];
/** Stub both providers. `deepl` / `google` describe what each one does to the
 *  request it is given. */
const stub = ({ deepl, google }, keys = { DEEPL_API_KEY: "key:fx", GOOGLE_TRANSLATE_API_KEY: "gkey" }) => {
  calls.length = 0;
  globalThis.Deno = { env: { get: (n) => keys[n] } };
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    calls.push(u);
    const body = JSON.parse(init.body);
    const texts = body.text ?? body.q;
    const h = u.includes("deepl") ? deepl : google;
    if (!h) return new Response("no handler", { status: 500 });
    return h(texts, u, init);
  };
};
const restore = () => { globalThis.fetch = realFetch; delete globalThis.Deno; };

const deeplOk = (texts) =>
  new Response(JSON.stringify({ translations: texts.map((t) => ({ text: `ES(${t})` })) }), { status: 200 });
const googleOk = (texts) =>
  new Response(JSON.stringify({ data: { translations: texts.map((t) => ({ translatedText: `G(${t})` })) } }), { status: 200 });
const status = (code) => () => new Response("{}", { status: code });

{
  stub({ deepl: deeplOk });
  const r = await translateBatch(["Express Wash", "Wash & Wax"]);
  ok("1b · DeepL answers and is used first", r.by === "deepl" && r.texts[0] === "ES(Express Wash)", JSON.stringify(r));
  ok("1b-ii · characters counted from what was sent", r.chars === "Express Wash".length + "Wash & Wax".length, String(r.chars));
  ok("1b-iii · a free-tier key (:fx) goes to the free host", calls[0].includes("api-free.deepl.com"), calls[0]);
  restore();
}
{
  stub({ deepl: deeplOk }, { DEEPL_API_KEY: "prokey", GOOGLE_TRANSLATE_API_KEY: "gkey" });
  await translateBatch(["x"]);
  ok("1c · a pro key goes to the pro host", calls[0] === "https://api.deepl.com/v2/translate", calls[0]);
  restore();
}
{
  stub({ deepl: status(456), google: googleOk });
  const r = await translateBatch(["Engine bay clean"]);
  ok("1d · DeepL 456 (quota) hands over to Google, invisibly", r.by === "google" && r.texts[0] === "G(Engine bay clean)", JSON.stringify(r));
  ok("1d-ii · and the handover is REPORTED, not swallowed",
    r.tried.length === 1 && r.tried[0].provider === "deepl" && r.tried[0].reason === "exhausted", JSON.stringify(r.tried));
  restore();
}
{
  stub({ deepl: status(503), google: googleOk });
  const r = await translateBatch(["a"]);
  ok("1e · a DeepL 5xx also falls through, marked transient",
    r.by === "google" && r.tried[0].reason === "transient", JSON.stringify(r.tried));
  restore();
}
{
  stub({ deepl: status(456), google: status(403) });
  const r = await translateBatch(["Pet hair removal", "Clay bar"]);
  ok("1f · both refused: no translation, no throw", r.by === null && r.texts.every((t) => t === null), JSON.stringify(r));
  ok("1f-ii · chars 0, so nothing is billed against a call that did not happen", r.chars === 0);
  ok("1f-iii · both refusals reported", r.tried.length === 2, JSON.stringify(r.tried));
  restore();
}
{
  // ONE echo is a word that is the same in Spanish. "Exterior", "Interior" and
  // "Long Beach" are the three on the demo business, and the first version of
  // this feature discarded them — so they were re-sent on every save and
  // reported as permanently "showing in English". Keeping them is the fix.
  stub({
    deepl: (texts) =>
      new Response(JSON.stringify({ translations: texts.map((t) => ({ text: t === "Exterior" ? t : `ES(${t})` })) }), { status: 200 }),
  });
  const r = await translateBatch(["Exterior", "Wash & Wax", "Clay bar"]);
  ok("1g · an answer identical to the source is KEPT, so an unchanged word stops costing money",
    r.texts[0] === "Exterior" && r.texts[1] === "ES(Wash & Wax)", JSON.stringify(r.texts));
  restore();
}
{
  // EVERY answer echoed is a broken provider, and that IS caught — at the batch
  // level, which is the only place the two cases can be told apart.
  stub({
    deepl: (texts) => new Response(JSON.stringify({ translations: texts.map((t) => ({ text: t })) }), { status: 200 }),
    google: googleOk,
  });
  const r = await translateBatch(["one", "two", "three", "four", "five", "six", "seven", "eight"]);
  ok("1g-iii · a batch where EVERY answer is its own input is bad_response and falls through",
    r.by === "google" && r.tried[0].reason === "bad_response", JSON.stringify(r.tried));
  restore();
}
{
  // Below three, an all-echo batch cannot be told from short identical words, so
  // the guard must NOT fire and strand a working provider.
  stub({ deepl: (texts) => new Response(JSON.stringify({ translations: texts.map((t) => ({ text: t })) }), { status: 200 }) });
  const r = await translateBatch(["Exterior", "Interior", "Long Beach"]);
  ok("1g-iv · a short tail batch of unchanged words does NOT trip the guard — the live run that cost 'Long Beach'",
    r.by === "deepl" && r.texts[0] === "Exterior" && r.texts[2] === "Long Beach", JSON.stringify(r));
  restore();
}
{
  stub({ deepl: (texts) => new Response(JSON.stringify({ translations: texts.map((t) => ({ text: "   " })) }), { status: 200 }) });
  const r = await translateBatch(["Express Wash"]);
  ok("1g-ii · whitespace is not a translation either", r.texts[0] === null);
  restore();
}
{
  // A 200 whose array is the wrong length cannot be paired by index: one
  // service's Spanish would land under another's name.
  stub({ deepl: () => new Response(JSON.stringify({ translations: [{ text: "uno" }] }), { status: 200 }), google: googleOk });
  const r = await translateBatch(["one", "two"]);
  ok("1h · a short array is bad_response and falls through, never mis-paired",
    r.by === "google" && r.tried[0].reason === "bad_response", JSON.stringify(r.tried));
  restore();
}
{
  stub({ google: googleOk }, { GOOGLE_TRANSLATE_API_KEY: "gkey" });
  const r = await translateBatch(["a"]);
  ok("1i · a missing key is 'missing_key', not 'exhausted'",
    r.tried[0].provider === "deepl" && r.tried[0].reason === "missing_key", JSON.stringify(r.tried));
  restore();
}
{
  stub({ deepl: () => { throw new Error("network down"); }, google: googleOk });
  const r = await translateBatch(["a"]);
  ok("1j · a thrown fetch is transient and never escapes", r.by === "google" && r.tried[0].reason === "transient");
  restore();
}
{
  stub({}, {});
  const r = await translateBatch([]);
  ok("1k · an empty batch makes no call at all", r.by === null && calls.length === 0);
  restore();
}
ok("1l · BATCH is at or under DeepL's 50-text limit", BATCH <= 50 && BATCH > 0, String(BATCH));

// Google HTML-escapes even with format:text. React would render `&#39;`
// literally, and nothing downstream would flag a perfectly valid string.
ok("1m · Google's entities are decoded", unescapeEntities("the car&#39;s interior") === "the car's interior");
ok("1m-ii · and &amp; is decoded LAST, so &amp;#39; stays literal",
  unescapeEntities("A &amp;#39; B") === "A &#39; B", unescapeEntities("A &amp;#39; B"));
ok("1m-iii · hex entities too", unescapeEntities("&#x27;") === "'");

// ───────────────────────────────────────────────────────────────────────────
// § 2 · The two hashes agree
// ───────────────────────────────────────────────────────────────────────────
console.log("\n§ 2 · the JS hash and the Postgres hash are the same hash");
const HASH_CASES = ["Express Wash", "Lavado exprés", "Ceramic Pro — 2 year", "emoji 🚗 and ñ", ""];
if (!TOKEN || !REF) {
  skip("2 · hash agreement", "no SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF — this section proved NOTHING");
} else {
  for (const s of HASH_CASES) {
    const mine = await sha256hex(s);
    const r = await sql(`select encode(sha256(convert_to(${lit(s)}, 'UTF8')), 'hex') as h`);
    const theirs = r.body?.[0]?.h;
    ok(`2 · ${JSON.stringify(s).slice(0, 24)} hashes the same in JS and Postgres`, mine === theirs, `${mine} vs ${theirs}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// § 3 · What the database refuses, and what it protects
// ───────────────────────────────────────────────────────────────────────────
console.log("\n§ 3 · the database refuses a wrong hash, a NAME and a blank — and keeps a human edit");
if (!TOKEN || !REF) {
  skip("3 · database guards", "no management credentials — this section proved NOTHING");
} else {
  const biz = (await sql(`select id, name from businesses where slug = 'demo-detail'`)).body?.[0];
  if (!biz) {
    skip("3 · database guards", "no demo-detail business in this project");
  } else {
    const B = biz.id;
    const SRC = "Translate test — a sentence no screen shows";
    const H = await sha256hex(SRC);
    const put = (hash, source, machine, by = "deepl") =>
      sql(`select public.translation_put(${lit(B)}::uuid, 'es', ${lit(hash)}, ${lit(source)}, ${lit(machine)}, ${lit(by)})`);

    await sql(`delete from translations where business_id = ${lit(B)}::uuid and source_text = ${lit(SRC)}`);

    const bad = await put("0".repeat(64), SRC, "irrelevante");
    ok("3a · a hash that does not match its source is REFUSED",
      !bad.ok && /does not match/.test(JSON.stringify(bad.body)), JSON.stringify(bad.body).slice(0, 120));

    const name = await put(await sha256hex(biz.name), biz.name, "Detallado Automotriz Costero");
    ok("3b · the BUSINESS NAME is refused — we translate what a business says, never what it is called",
      !name.ok && /is a NAME/.test(JSON.stringify(name.body)), JSON.stringify(name.body).slice(0, 140));

    const slug = await put(await sha256hex("demo-detail"), "demo-detail", "demo-detalle");
    ok("3b-ii · the slug is refused too", !slug.ok && /is a NAME/.test(JSON.stringify(slug.body)));

    const blank = await put(H, SRC, "   ");
    ok("3c · a blank translation cannot be stored, so a customer can never meet an empty field",
      !blank.ok, JSON.stringify(blank.body).slice(0, 120));

    const good = await put(H, SRC, "Primera máquina");
    ok("3d · a real row writes", good.ok, JSON.stringify(good.body).slice(0, 120));

    // THE REQUIREMENT. A person corrects the Spanish; a later automatic pass
    // runs over the same string with different machine text.
    await sql(`update translations set human_text = 'Lo que escribió una persona' where business_id = ${lit(B)}::uuid and source_hash = ${lit(H)}`);
    await put(H, SRC, "Segunda máquina");
    const after = (await sql(`select machine_text, human_text from translations where business_id = ${lit(B)}::uuid and source_hash = ${lit(H)}`)).body?.[0];
    ok("3e · a HUMAN EDIT SURVIVES a later automatic pass",
      after?.human_text === "Lo que escribió una persona", JSON.stringify(after));
    ok("3e-ii · and the machine column did update, so the pass was real and not a no-op",
      after?.machine_text === "Segunda máquina", JSON.stringify(after));

    const map = (await sql(`select public.get_business_translations('demo-detail', 'es') as m`)).body?.[0]?.m;
    ok("3f · the public read prefers the human text", map?.[SRC] === "Lo que escribió una persona", JSON.stringify(map?.[SRC]));
    ok("3f-ii · a string with no row is simply ABSENT — which IS the English fallback",
      map?.["A sentence nobody has ever translated"] === undefined);

    // Changing the English changes the hash, so a correction can never be
    // stale-but-live: it stays attached to the bytes it was written for.
    const H2 = await sha256hex(SRC + " (edited)");
    await put(H2, SRC + " (edited)", "Máquina nueva");
    const map2 = (await sql(`select public.get_business_translations('demo-detail', 'es') as m`)).body?.[0]?.m;
    ok("3g · edited English gets a NEW row, and the old human edit does not leak onto it",
      map2?.[SRC + " (edited)"] === "Máquina nueva" && map2?.[SRC] === "Lo que escribió una persona");

    // ── 3i · A STANDING AUDIT, NOT A CLEANUP, AND IT EARNED ITSELF THE HOUR IT
    // WAS WRITTEN. 3b and 3b-ii both passed while the live table held
    // "Coastline Auto Detailing" -> "Detallado Automotriz Costero" and
    // "demo-detail" -> "demo-detalle": those rows were written minutes earlier
    // by 3b itself, during a deliberate baselining run with the trigger dropped,
    // and nothing deleted them. `get_business_translations` was serving a
    // translated business NAME to any Spanish customer — the exact thing Andrew
    // forbade — under two green checks.
    //
    // So a check that the guard REFUSES is not the same check as a check that
    // the table is CLEAN. This is the second one, it covers every business
    // rather than the demo, and it catches rows written before the trigger
    // existed, written while it was dropped, or written by any future path.
    const residue = await sql(`
      select t.source_text
      from translations t
      join businesses b on b.id = t.business_id
      where lower(btrim(t.source_text)) in (lower(btrim(b.name)), lower(btrim(b.slug)))
      limit 5`);
    ok("3i · NO row anywhere in the table is a translation of a business name or slug",
      Array.isArray(residue.body) && residue.body.length === 0,
      JSON.stringify(residue.body));

    await sql(`delete from translations where business_id = ${lit(B)}::uuid and source_text in (${lit(SRC)}, ${lit(SRC + " (edited)")}, ${lit(biz.name)}, 'demo-detail')`);
    const gone = (await sql(`select count(*)::int as n from translations where business_id = ${lit(B)}::uuid and source_text = ${lit(SRC)}`)).body?.[0]?.n;
    ok("3h · the suite cleaned up after itself", gone === 0, String(gone));
  }
}

// ───────────────────────────────────────────────────────────────────────────
// § 4 · The classifier, and the loud unknown
// ───────────────────────────────────────────────────────────────────────────
console.log("\n§ 4 · the classifier is complete against the real payload, and says so when it is not");

ok("4a · TRANSLATE and SKIP do not overlap", [...TRANSLATE].every((p) => !SKIP.has(p)),
  [...TRANSLATE].filter((p) => SKIP.has(p)).join(", "));
ok("4b · the business name is on the SKIP list", SKIP.has("business.name"));
ok("4c · every review path is something we translate", REVIEW_PATHS.every((p) => TRANSLATE.has(p)),
  REVIEW_PATHS.filter((p) => !TRANSLATE.has(p)).join(", "));

// Breaking the instrument on purpose: a field nobody classified must be LOUD.
{
  const c = classify({ business: { name: "X" }, services: [{ name: "Wash", mystery_field: "some prose" }] });
  ok("4d · an unclassified string is returned as unknown, not silently skipped",
    c.unknown.includes("services[].mystery_field"), JSON.stringify(c.unknown));
  ok("4d-ii · and the name is not in the texts", !c.texts.includes("X"), JSON.stringify(c.texts));
}
{
  const c = classify({ services: [{ name: "Wash" }, { name: "Wash" }, { name: "$45" }] });
  ok("4e · duplicates collapse to one API call", c.texts.length === 1 && c.texts[0] === "Wash", JSON.stringify(c.texts));
  ok("4e-ii · a string with no letters is never sent", !c.texts.includes("$45"));
}

if (!URL_ || !ANON) {
  skip("4f · zero unknown paths against the LIVE payload", "no SUPABASE_URL / SUPABASE_ANON_KEY — this check proved NOTHING");
} else {
  const r = await fetch(`${URL_}/rest/v1/rpc/get_public_business_profile`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: "demo-detail" }),
  });
  const payload = await r.json().catch(() => null);
  if (!r.ok || !payload) {
    skip("4f · zero unknown paths against the LIVE payload", `profile read returned ${r.status} — this check proved NOTHING`);
  } else {
    const c = classify(payload);
    // THIS is the check that keeps the two lists honest. A publishable column
    // added to the RPC reaches the customer's page; if nobody classifies it,
    // this fails rather than the feature quietly not translating it.
    ok("4f · the live payload has ZERO unclassified strings", c.unknown.length === 0, c.unknown.join(", "));
    ok("4f-ii · and it found real prose to translate", c.texts.length > 20, String(c.texts.length));
    ok("4f-iii · the business's own name is not among them", !c.texts.includes(payload.business?.name),
      payload.business?.name);
    ok("4f-iv · nor is a payment handle", !c.texts.includes(payload.settings?.pay_venmo));
    ok("4f-v · nor a customer's quoted review", !c.texts.includes(payload.testimonials?.[0]?.quote));
  }
}

// ───────────────────────────────────────────────────────────────────────────
// § 5 · The gauge
// ───────────────────────────────────────────────────────────────────────────
console.log("\n§ 5 · the gauge rolls its own month and refuses an unknown provider");
if (!TOKEN || !REF) {
  skip("5 · the gauge", "no management credentials — this section proved NOTHING");
} else {
  const before = (await sql(`select provider, period, chars_used, chars_limit, rolls from translation_usage order by provider`)).body;
  ok("5a · both providers are seeded with the limits Andrew was given",
    before?.length === 2 &&
    before.find((r) => r.provider === "deepl")?.chars_limit === 1000000 &&
    before.find((r) => r.provider === "google")?.chars_limit === 500000, JSON.stringify(before));
  ok("5a-ii · DeepL does not roll (its million is a lifetime) and Google does",
    before.find((r) => r.provider === "deepl")?.rolls === false &&
    before.find((r) => r.provider === "google")?.rolls === true);

  const bad = await sql(`select public.translation_spend('bing', 0)`);
  ok("5b · an unknown provider RAISES rather than reporting a full allowance",
    !bad.ok && /unknown provider/.test(JSON.stringify(bad.body)), JSON.stringify(bad.body).slice(0, 120));

  const g0 = before.find((r) => r.provider === "google");
  const up = (await sql(`select public.translation_spend('google', 7) as u`)).body?.[0]?.u;
  ok("5c · spending adds characters and reports what is left",
    up?.used === g0.chars_used + 7 && up?.remaining === 500000 - (g0.chars_used + 7), JSON.stringify(up));

  // A stale month must not be spendable. Forced, then checked, then restored.
  await sql(`update translation_usage set period = '2000-01', chars_used = 999 where provider = 'google'`);
  const rolled = (await sql(`select public.translation_spend('google', 5) as u`)).body?.[0]?.u;
  const thisMonth = (await sql(`select to_char(now() at time zone 'utc', 'YYYY-MM') as p`)).body?.[0]?.p;
  ok("5d · a stale month rolls INSIDE the increment, so 999 old characters do not carry over",
    rolled?.period === thisMonth && rolled?.used === 5, JSON.stringify(rolled));
  await sql(`update translation_usage set period = ${lit(g0.period)}, chars_used = ${g0.chars_used} where provider = 'google'`);
  const restored = (await sql(`select chars_used, period from translation_usage where provider = 'google'`)).body?.[0];
  ok("5e · the suite put the counter back",
    restored?.chars_used === g0.chars_used && restored?.period === g0.period, JSON.stringify(restored));
}

// ───────────────────────────────────────────────────────────────────────────
// § 6 · The privileges, asked of the database with the anon key
// ───────────────────────────────────────────────────────────────────────────
// THIS SECTION EXISTS BECAUSE THE FIRST VERSION OF THE MIGRATION WAS WRONG.
// `revoke all on function … from anon, authenticated` takes nothing away when
// `create function` has already granted EXECUTE to PUBLIC — and the live probe
// is the only thing that can tell. Reading the migration for the word `revoke`
// would have passed the broken version.
console.log("\n§ 6 · a visitor with the anon key cannot reach the writers");
if (!URL_ || !ANON) {
  skip("6 · anon privileges", "no SUPABASE_URL / SUPABASE_ANON_KEY — this section proved NOTHING");
} else {
  const rpc = (fn, body) => fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const denied = async (r) => /42501|permission denied/.test(await r.text());

  ok("6a · anon cannot execute translation_spend (it could otherwise report the allowance spent)",
    await denied(await rpc("translation_spend", { p_provider: "deepl", p_chars: 0 })));
  ok("6b · anon cannot execute translation_put (a security-definer writer)",
    await denied(await rpc("translation_put", {
      p_business: "00000000-0000-0000-0000-000000000000", p_lang: "es",
      p_hash: "0".repeat(64), p_source: "probe", p_machine: "sonda", p_by: "deepl",
    })));

  const tbl = await fetch(`${URL_}/rest/v1/translations?select=source_text&limit=1`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const tblBody = await tbl.text();
  ok("6c · anon cannot read the translations table directly", tbl.status >= 400 || tblBody === "[]",
    `${tbl.status} ${tblBody.slice(0, 80)}`);

  const pub = await rpc("get_business_translations", { p_slug: "demo-detail", p_lang: "es" });
  ok("6d · but the PUBLIC read works without a session — that is the customer's path", pub.status === 200,
    String(pub.status));
}

// ───────────────────────────────────────────────────────────────────────────
// § 7 · The secrets stay out of the browser bundle
// ───────────────────────────────────────────────────────────────────────────
console.log("\n§ 7 · neither key name appears under app/");
const SECRETS = ["DEEPL_API_KEY", "GOOGLE_TRANSLATE_API_KEY"];
const walk = (dir, hits) => {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === "dist" || e === ".vite") continue;
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) { walk(p, hits); continue; }
    if (!/\.(js|jsx|ts|tsx|html|css|json|env|mjs)$/.test(e)) continue;
    const src = readFileSync(p, "utf8");
    for (const s of SECRETS) if (src.includes(s)) hits.push(`${p} (${s})`);
  }
  return hits;
};
const appDir = new URL("../app", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const hits = walk(appDir, []);
ok("7a · no key name anywhere under app/", hits.length === 0, hits.join(", "));

const tsrc = read("supabase/functions/_shared/translate.ts");
ok("7b · both are read through Deno.env.get and nowhere else",
  SECRETS.every((s) => tsrc.includes(`secret("${s}")`)) && /d\?\.env\?\.get\(name\)/.test(tsrc));
ok("7c · nothing in the seam logs or returns a key",
  !/console\.(log|warn|error)/.test(tsrc), "a key would reach the edge logs");

// `translate-content` writes, and is called with a detailer's session. It must
// not be on the no-JWT list.
const deploy = read("scripts/deploy-functions.mjs");
const publicBlock = deploy.slice(deploy.indexOf("PUBLIC_FUNCTIONS"), deploy.indexOf("]);", deploy.indexOf("PUBLIC_FUNCTIONS")));
ok("7d · translate-content is NOT deployed without a JWT", !publicBlock.includes('"translate-content"'));

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);
