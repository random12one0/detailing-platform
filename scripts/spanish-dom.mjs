// WHAT IS STILL ENGLISH ON A SPANISH DASHBOARD — roadmap 8.17 stage 2b.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN `i18n-survey.mjs` ALREADY REPORTS ZERO
// ---------------------------------------------------------------------------
// That script answers two questions about the SOURCE and both reached zero:
// nothing is unwrapped, and every wrapped key has a translation. The dashboard
// was still part English, and **nothing in the source was wrong**:
//
//   · `RequestCard` drew a date at a hard-coded locale — no string to wrap.
//   · A word sat raw beside two wrapped siblings, and its spelling happened to
//     be a catalogue key for a DIFFERENT screen, so the survey read it as
//     handled.
//   · A tag was assembled from two pieces neither of which is a sentence.
//
// Every one of those was found by pressing ES in a browser and READING THE
// PAGE. This is that, as a script, so the next session does not have to
// remember to look — and so it can look at fifty screens instead of four.
//
// ---------------------------------------------------------------------------
// HOW IT DECIDES SOMETHING IS ENGLISH
// ---------------------------------------------------------------------------
// **It compares the page against the CATALOGUE'S OWN KEYS.** Every English
// string the dashboard can draw is a key in `appEs.js`, so any visible text
// that equals a key — while the language is `es` and that key's Spanish is
// something else — is English that reached the screen. No language detection,
// no word lists, no guessing: the answer is already written down.
//
// It reports the ELEMENT too, because "Quote" on its own is not findable and
// `button.btn.sm` in the request card is.
//
//   node scripts/spanish-dom.mjs            # every dashboard screen
//   node scripts/spanish-dom.mjs --keep     # leave the browser open
//   node scripts/spanish-dom.mjs --prove    # the instrument breaking itself
//
// Against a frozen build (lane C's rig), point BOTH at the SAME tree:
//
//   BASE=http://127.0.0.1:4173 \
//   CATALOGUE=<that tree>/app/src/lib/strings/appEs.js \
//   node scripts/spanish-dom.mjs
//
// Needs a server and the demo login, like every other browser script. **Lane C
// serves its own bundle on 4173 and never touches 5173** — `docs/START-HERE.md`
// § 1.
//
// ===========================================================================
// 2026-09-13 — THREE BLINDNESSES, ALL FOUND BY BREAKING THIS ON PURPOSE
// ===========================================================================
// Six "are you sure?" delete warnings were rendering in ENGLISH to a Spanish
// detailer and **not one instrument in this repo could see them.** Chasing that
// turned up two more faults in this script that had nothing to do with dialogs.
//
// **(1) THE CATALOGUE WAS REGEX-PARSED AND LOST A FIFTH OF ITSELF.** The old
// loader matched `"key": "value",` on ONE line. A long English sentence wraps,
// so its value sits on the next line, the value came back empty, and the key
// was then filtered out of `TELLS` for having no Spanish. **415 of 1,973 keys
// — 21% of the catalogue — were strings this check could not have detected in
// English if they had been painted across the screen.** `appEs.js` has no
// imports of its own, so Node can `import()` it: the parser is deleted and the
// object is the object. **A second reader of a file is a second chance to read
// it wrong**, which is the same argument `scripts/site-brief.mjs` makes about
// importing `siteIntake.js` rather than copying its questions.
//
// **(2) AN INTERPOLATED SENTENCE COULD NEVER MATCH.** `"Delete {name} for
// good?"` is a key; what reaches the screen is `Delete Summer Special for
// good?`, which equals no key at all. Every sentence with a placeholder in it —
// and the dialogs are mostly those — was outside the check by construction.
// Keys with holes are compiled to patterns now, with two guards against a
// pattern that matches anything: at least twelve characters of LITERAL text,
// and the key's own Spanish must NOT match the same pattern.
//
// **(3) IT COUNTED NOTHING, SO EVERY SCREEN COULD PRINT `ok` OVER A BLANK
// PAGE.** This is a FINDER, and `docs/START-HERE.md` § 4 is about exactly this
// shape: no elements means no findings means a green word. The blind-bundle run
// of 2026-09-13 recorded that this script exits 1 on an empty page **only
// because a blank page has no sign-in form** — an accident, not an anchor. So
// every screen now counts the Spanish it SAW, and a screen showing none is
// `NOT MEASURED` and red, whatever else it did or did not find.
//
// ---------------------------------------------------------------------------
// AND THE CLASS THAT HAD NEVER BEEN CHECKED AT ALL: TEXT THAT ONLY EXISTS
// AFTER AN ACTION
// ---------------------------------------------------------------------------
// A native `confirm()` paints in browser chrome, OUTSIDE `document`. A tree
// walker over `document.body` is looking in the wrong window, so the six
// English warnings were not missed — they were unreachable. Same for anything
// that mounts only when something is pressed.
//
// **The method is Andrew's, recorded in `CLAUDE.md` trap (l): stub
// `window.confirm` BEFORE the click, return `false`, and record the argument.**
// A native dialog halts the page, so a script that clicks and then looks has
// nothing to look at; returning `false` means the test costs nothing, because
// the control stays as it was.
//
// **THREE THINGS MAKE THE PRESS PASS SAFE TO RUN AGAINST A REAL DATABASE, and
// the third is the one that matters:**
//
//   · every `confirm` answers NO, so a guarded action is abandoned;
//   · the buttons pressed are chosen by a PREDICATE ON THE RENDERED LABEL, not
//     a list of files — a list names two instances and invites fixing two;
//   · **every write is blocked at the network.** `DELETE`/`PATCH`/`PUT`/`POST`
//     to `/rest/v1/` and `/functions/v1/` is aborted for the whole press pass,
//     and the count of aborted writes is printed. Without this, a delete that
//     has NO confirm in front of it would really delete — and lane B may be
//     looking at the same rows on 5173.
//
// **THE STUB IS ASSERTED, NOT ASSUMED.** If anything later replaced
// `window.confirm`, this would capture nothing and print a clean run over an
// untested class — the precise failure it was built to end. `dialogs · the
// stub is live` is checked on the page before a single press.
import { createRequire } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { watchSource, reportSourceMoved } from "./source-guard.mjs";

// Playwright lives in `app/node_modules`, and every browser script in this
// repo reaches it the same way — there is no dependency at the repo root.
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || "http://localhost:5173";
const EMAIL = "demo@detailplatform.com";  // mail-sink: a dashboard login, never a recipient
const PASSWORD = "demo123";
const ROOT = fileURLToPath(new URL("../", import.meta.url));

// THE CATALOGUE, IMPORTED RATHER THAN PARSED. See blindness (1) in the header:
// the regex that used to live here silently dropped every key whose Spanish was
// on the following line — 415 of them.
//
// **AND IT MUST COME FROM THE SAME TREE AS THE BUNDLE BEING SERVED — 2026-09-13,
// found by the count MOVING on a frozen subject.** Two runs against one
// unchanged build reported 46 findings and then 35. Nothing about the page had
// changed; lane B had added Spanish entries to the repo's `appEs.js` between
// them, and this script reads the repo while `BASE` serves a worktree. **A
// finding is then neither the build's nor the catalogue's**, and the number
// drifts with somebody else's unrelated work.
//
// `CATALOGUE=<path>` points it at the tree that was actually built. The path is
// printed on every run, because a silent default is how the two came apart.
const CATALOGUE = process.env.CATALOGUE
  ? pathToFileURL(path.resolve(process.env.CATALOGUE)).href
  : new URL("../app/src/lib/strings/appEs.js", import.meta.url).href;
const { appEs: catalogue } = await import(CATALOGUE);

// **A KEY WHOSE SPANISH IS THE SAME WORD PROVES NOTHING.** `Zelle`, `Plan`,
// `Logo`, `15 min` are identical in both, so seeing them on a Spanish page is
// not evidence of anything. Comparing them would be the vacuous half of this
// check — a finding that is true whatever the code does.
// **AND ROWS THAT CAME OUT OF THE DATABASE ARE NOT A FINDING.** The five
// message-template names are SEEDED — in whatever language the detailer was
// reading when they first opened that screen — and are theirs to edit from
// then on. A business seeded before this item has English ones, which is
// correct: they are that detailer's own words now, and re-translating them
// would overwrite something a person may have edited.
//
// Nothing in the DOM says where a string came from, so the five are NAMED —
// the same shape as `db-audit`'s allowlists. A SIXTH is a finding.
const FROM_THE_DATABASE = new Set([
  "On my way", "Running late", "Confirm tomorrow", "Job finished",
  "Ask about access",
]);

const usable = Object.entries(catalogue)
  .filter(([k, v]) => typeof v === "string" && v && v !== k && !FROM_THE_DATABASE.has(k));

/** Exact English → the Spanish it should have been. */
const TELLS = new Map(usable.filter(([k]) => !k.includes("{")));

/** Interpolated keys, compiled. See blindness (2) in the header.
 *
 *  A hole becomes `.{1,80}?` rather than `.+?` so a pattern cannot swallow a
 *  paragraph, and the two guards below are what stop a short key like
 *  `"{n} left"` matching half the page. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compile = (key) => {
  const literal = key.split(/\{[a-zA-Z]\w*\}/g);
  if (literal.join("").replace(/\s+/g, " ").trim().length < 12) return null;
  return new RegExp(`^${literal.map(esc).join(".{1,80}?")}$`);
};
const PATTERNS = usable
  .filter(([k]) => k.includes("{"))
  .map(([k, v]) => ({ key: k, es: v, re: compile(k) }))
  // **A PATTERN THAT ALSO MATCHES ITS OWN SPANISH IS A PATTERN THAT PROVES
  // NOTHING** — it would report a correctly translated sentence as English.
  .filter((p) => p.re && !p.re.test(p.es));

/** The Spanish this check can positively recognise, used as the subject count
 *  rather than as a finding. A screen that shows none of it was not measured. */
const SPANISH = new Set(usable.map(([, v]) => v).filter((v) => v.replace(/\s+/g, " ").trim().length >= 6));

// ---------------------------------------------------------------------------
// THE SOURCE CENSUS — which files can raise a native dialog at all.
// The press pass reports which of them it actually REACHED, because a class
// that is never reached must say so rather than pass quietly.
// ---------------------------------------------------------------------------
const walk = (d, o = []) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p, o);
    else if (/\.(jsx|js)$/.test(f)) o.push(p);
  }
  return o;
};
const DIALOG_FILES = ["app/src/screens", "app/src/components"]
  .flatMap((d) => walk(path.join(ROOT, d)))
  .filter((p) => {
    const src = readFileSync(p, "utf8").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    return /(?<![.\w])(?:window\.)?(?:confirm|alert|prompt)\s*\(/.test(src)
      && !/(?:async\s+)?function\s+(?:confirm|alert|prompt)\s*\(/.test(src);
  })
  .map((p) => path.relative(path.join(ROOT, "app/src"), p).split(path.sep).join("/"));

const settle = async (page, cap = 2500) => {
  const until = Date.now() + cap;
  let quiet = 0;
  let last = "";
  while (Date.now() < until && quiet < 130) {
    const now = await page.evaluate(() => document.body.innerHTML.length).catch(() => "");
    if (now === last) quiet += 40; else { quiet = 0; last = now; }
    await page.waitForTimeout(40);
  }
};

/** Every visible text node on the page that is a catalogue key — exactly, or
 *  through an interpolated key's pattern. Returns the Spanish it saw too, which
 *  is this check's subject count. */
async function readPage(page) {
  return page.evaluate(({ tells, patterns, spanish }) => {
    const exact = new Map(tells);
    const pats = patterns.map((p) => ({ key: p.key, re: new RegExp(p.src) }));
    const es = new Set(spanish);
    const found = [];
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const el = n.parentElement;
      if (!el || !el.offsetParent) continue;   // not drawn
      if (es.has(text)) { seen.add(text); continue; }
      let key = exact.has(text) ? text : null;
      if (!key) key = pats.find((p) => p.re.test(text))?.key ?? null;
      if (!key) continue;
      const where = `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).trim().split(/\s+/).join(".")}` : ""}`;
      found.push({ text, where, key });
    }
    return { found, spanishSeen: seen.size };
  }, {
    tells: [...TELLS].map(([k, v]) => [k, v]),
    patterns: PATTERNS.map((p) => ({ key: p.key, src: p.re.source })),
    spanish: [...SPANISH],
  });
}

/** A captured dialog, classified THREE ways rather than two.
 *
 *  **THE THIRD ANSWER IS THE ONE WORTH HAVING.** `Faq.jsx` raises `Delete
 *  "Do you need my water?"?` — plain English a Spanish detailer reads — and
 *  this returned "not English" for it on the first run, because the string
 *  never reached `t()` and therefore has NO KEY for a key-based detector to
 *  match. Reporting that as `es` would be a false all-clear on the exact class
 *  this pass was built for.
 *
 *  So: `en` matched an English key, `es` matched a known Spanish value, and
 *  **`?` matched neither and is UNCLASSIFIABLE.** A `?` is either a detailer's
 *  own words (legitimate — § 6 of `docs/START-HERE.md`) or a string that never
 *  reached the translator, and nothing in the DOM can tell those apart. It is
 *  counted and printed, and it does not fail: **`tests/spanish.test.mjs` § 11
 *  is what fails on it**, from the source, where the difference is visible.
 *  The two halves do not overlap and neither is sufficient alone. */
/** The Spanish side of every interpolated key, so a correctly translated dialog
 *  with a customer's name in it reads as Spanish rather than unclassifiable. */
const SPANISH_PATTERNS = PATTERNS.map((p) => compile(p.es)).filter(Boolean);

const classify = (text) => {
  const t = text.replace(/\s+/g, " ").trim();
  if (TELLS.has(t)) return { verdict: "en", key: t };
  const pat = PATTERNS.find((p) => p.re.test(t));
  if (pat) return { verdict: "en", key: pat.key };
  if (SPANISH.has(t) || SPANISH_PATTERNS.some((re) => re.test(t))) return { verdict: "es", key: null };
  return { verdict: "?", key: null };
};

// **THE VERBS, IN BOTH LANGUAGES.** A predicate on the rendered label rather
// than a list of files, so a new destructive control is pressed without anybody
// remembering to add it. Both languages because this runs in Spanish and a
// correctly translated button must still be found.
const DANGEROUS = /(^|\s)(delete|remove|disconnect|stop using|forget|revoke|unlink|borrar|eliminar|quitar|desconectar|dejar de|olvidar|revocar|desvincular)(\s|$)/i;

const changedSince = watchSource();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// The stub, installed before any script on any document this context loads, so
// it survives the reload that sets the language. See trap (l).
await page.addInitScript(() => {
  window.__dpDialogs = [];
  const answer = { confirm: false, alert: undefined, prompt: null };
  for (const fn of ["confirm", "alert", "prompt"]) {
    const stub = (msg) => { window.__dpDialogs.push({ fn, text: String(msg ?? "") }); return answer[fn]; };
    stub.__dpStub = true;
    window[fn] = stub;
  }
});

const problems = [];
const notMeasured = [];
const dialogsSeen = [];
let blockedWrites = 0;
const say = (screen, { found, spanishSeen }) => {
  if (spanishSeen === 0) {
    notMeasured.push(screen);
    console.log(`  NOT MEASURED  ${screen} — no Spanish on the page, so a clean result means nothing`);
    return;
  }
  if (found.length === 0) { console.log(`  ok    ${screen}  (${spanishSeen} Spanish strings seen)`); return; }
  problems.push(...found.map((h) => ({ screen, ...h })));
  console.log(`  FOUND ${screen} — ${found.length}  (${spanishSeen} Spanish strings seen)`);
  for (const h of found.slice(0, 8)) console.log(`          ${JSON.stringify(h.text)}  in  ${h.where}`);
  if (found.length > 8) console.log(`          … and ${found.length - 8} more`);
};

/** Open every fold, press every destructive-looking control, drain the dialogs
 *  they raised, and report what the screen looked like afterwards. */
async function pressPass(page, screen) {
  await page.$$eval("details:not([open])", (els) => els.forEach((e) => { e.open = true; })).catch(() => {});
  await settle(page, 900);

  const buttons = await page.$$("button:not([disabled]), [role=button]:not([aria-disabled=true])");
  let pressed = 0;
  for (const b of buttons) {
    const label = ((await b.textContent().catch(() => "")) || (await b.getAttribute("aria-label").catch(() => "")) || "")
      .replace(/\s+/g, " ").trim();
    if (!label || !DANGEROUS.test(label)) continue;
    if (!(await b.isVisible().catch(() => false))) continue;
    // By the element handle, not `el.click()` — trap (l): a synthetic click on
    // a control React owns can leave the handler unfired.
    await b.click({ timeout: 1200 }).catch(() => {});
    pressed++;
    await page.waitForTimeout(120);
  }

  const raised = await page.evaluate(() => { const d = window.__dpDialogs; window.__dpDialogs = []; return d; });
  for (const d of raised) {
    const { verdict, key } = classify(d.text);
    dialogsSeen.push({ screen, ...d, verdict, key });
    if (verdict === "en") {
      problems.push({ screen: `${screen} · ${d.fn}()`, text: d.text, where: `window.${d.fn}`, key });
      console.log(`  FOUND ${screen} · ${d.fn}() — ENGLISH  ${JSON.stringify(d.text.slice(0, 90))}`);
    }
  }
  return { pressed, raised: raised.length };
}

try {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  // **THE LANGUAGE IS SET AND THEN THE PAGE IS RELOADED, AND THE RELOAD IS
  // THE WHOLE POINT.** `makeLocale` reads the key ONCE at module scope, so
  // writing `localStorage` on a page that has already booted changes nothing
  // — the store keeps the value it detected. The first run of this script
  // did exactly that and reported 368 pieces of English, every one of them
  // the check measuring an English dashboard and calling it a finding.
  //
  // Setting it before the first render (rather than pressing the picker) is
  // still right: the picker is one control, and this is about the fifty
  // screens behind it.
  // **`--prove` IS THE INSTRUMENT'S OWN BREAK, AND IT LIVES IN THE SCRIPT SO
  // NOBODY HAS TO REMEMBER HOW TO DO IT.** `docs/ECONOMY.md` § 7 says break the
  // instrument on purpose before trusting it; a break that needs the product
  // edited is a break nobody performs twice. This leaves the dashboard in
  // ENGLISH, which must make every screen report `NOT MEASURED` and the run
  // exit 1. **A clean `--prove` run means this check cannot see English at
  // all** — which is what a blank subject count was letting it get away with
  // until 2026-09-13.
  const PROVE = process.argv.includes("--prove");
  if (PROVE) console.log("  --prove: the dashboard stays in ENGLISH. A clean run here means this check is blind.\n");
  await page.evaluate((es) => localStorage.setItem("dp.lang.app", es ? "es" : "en"), !PROVE);
  await page.reload({ waitUntil: "domcontentloaded" });

  // THE STUB'S OWN ANCHOR. Without this the whole dialog class could go
  // untested behind a clean report — the exact failure this pass exists to end.
  const stubLive = await page.evaluate(() =>
    ["confirm", "alert", "prompt"].every((f) => window[f] && window[f].__dpStub === true));
  console.log(stubLive
    ? "  ok    dialogs · the stub is live on confirm, alert and prompt"
    : "  FAIL  dialogs · the stub was replaced — every dialog below is unmeasured");
  if (!stubLive) problems.push({ screen: "dialogs", text: "the stub was replaced", where: "window", key: "-" });

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click("form button.btn.primary");
  await page.waitForTimeout(2500);
  await settle(page);

  // **NOTHING THIS PASS PRESSES MAY REACH THE DATABASE.** Installed after the
  // sign-in, which is the one POST that has to land.
  await page.route("**/*", (route) => {
    const r = route.request();
    const url = r.url();
    const writes = r.method() !== "GET" && r.method() !== "OPTIONS";
    if (writes && /\/(rest|functions|storage)\/v1\//.test(url)) { blockedWrites++; return route.abort(); }
    return route.continue();
  });

  let totalPressed = 0, totalRaised = 0;
  for (const [label, tab] of [
    ["Today", "today"], ["Calendar", "calendar"], ["Money", "money"],
    ["Clients", "clients"], ["Business", "business"],
  ]) {
    await page.click(`.tabbar button[data-tour="${tab}"]`).catch(() => {});
    await settle(page);
    say(label, await readPage(page));
    const p = await pressPass(page, label);
    totalPressed += p.pressed; totalRaised += p.raised;
    say(`${label} · after pressing`, await readPage(page));
  }

  // ─── THE SETTINGS SCREENS, AND THERE ARE TWO SETS OF THEM ────────────────
  //
  // **THE GEAR WAS NEVER OPENED IN SPANISH, WHICH IS THE WHOLE POINT OF THIS
  // SCRIPT — found 2026-09-13 by counting subjects.** The old line clicked
  // `button[aria-label*="ettings"]`. In Spanish that label reads **`Ajustes`**,
  // so the selector matched nothing, the `.catch(() => {})` swallowed it, and
  // the script carried on measuring the **Business tab** — which carries
  // `[data-settings-key]` rows of its own — a second time, under the heading
  // `the gear`. **Eight settings screens behind it had never been read in
  // Spanish at all**: notifications, templates, team, billing, password,
  // preferences, report and tour.
  //
  // It is trap (c) wearing a new coat: a navigation that does not navigate,
  // and every screen behind it reported fine. The English-only `--prove` run
  // was what exposed it — in English the selector DOES match, so the two runs
  // walked two disjoint lists, and a list that changes with the language is
  // not a list of screens.
  //
  // **SO THE CONTROL IS ADDRESSED BY `data-tour`, WHICH IS NOT PROSE**, and
  // both sets are walked by name with a count each. A silent `.catch` on a
  // navigation is the same sin as a guard that skips without printing.
  const walkRows = async (group) => {
    const rows = await page.$$eval("[data-settings-key]", (els) => els.map((e) => e.dataset.settingsKey));
    console.log(`\n  ${group}: ${rows.length} settings screens — ${rows.join(", ")}\n`);
    if (rows.length === 0) {
      problems.push({ screen: group, text: "no settings rows", where: "[data-settings-key]", key: "-" });
      console.log(`  FAIL  ${group} · no settings rows found — nothing behind this was measured`);
      return rows;
    }
    for (const key of rows) {
      const row = page.locator(`[data-settings-key="${key}"]`).first();
      if (!(await row.count())) { console.log(`  SKIPPED ${group} · ${key} — the row vanished`); continue; }
      await row.click().catch(() => {});
      await settle(page);
      say(`${group} · ${key}`, await readPage(page));
      const p = await pressPass(page, `${group} · ${key}`);
      totalPressed += p.pressed; totalRaised += p.raised;
      if (p.raised) say(`${group} · ${key} · after pressing`, await readPage(page));
      await page.keyboard.press("Escape");
      await settle(page, 900);
    }
    return rows;
  };

  // The Business tab is still showing, from the loop above.
  const businessRows = await walkRows("business");

  const gear = page.locator('button[data-tour="gear"]').first();
  const gearThere = await gear.count();
  if (!gearThere) {
    problems.push({ screen: "the gear", text: "no gear control", where: 'button[data-tour="gear"]', key: "-" });
    console.log('  FAIL  the gear · button[data-tour="gear"] does not exist — everything behind it is unmeasured');
  } else {
    await gear.click();
    await settle(page);
    // **THE ANCHOR THAT WOULD HAVE CAUGHT THE OLD BUG ON ITS FIRST RUN.** If
    // the gear's rows are the Business tab's rows, the click did nothing and
    // every `ok` printed below is about a screen this run never opened.
    const after = await page.$$eval("[data-settings-key]", (els) => els.map((e) => e.dataset.settingsKey));
    const moved = after.length > 0 && after.some((k) => !businessRows.includes(k));
    if (!moved) {
      problems.push({ screen: "the gear", text: "the gear did not open", where: "[data-settings-key]", key: "-" });
      console.log(`  FAIL  the gear · pressing it did not change the settings list (${after.length} rows, all of them the Business tab's) — it never opened`);
    } else {
      console.log("  ok    the gear · pressing it opened a different set of screens");
    }
    say("the gear", await readPage(page));
    await walkRows("gear");
  }

  // ─── THE SUBJECT COUNTS, PRINTED WHETHER OR NOT ANYTHING WAS FOUND ───────
  console.log(`\n  catalogue read from: ${CATALOGUE.replace(/^file:\/\/\//, "")}`);
  console.log(`  serving: ${BASE} — these MUST be the same tree, or a finding is neither one's`);
  console.log(`  ${Object.keys(catalogue).length} keys · ${TELLS.size} exact tells · ${PATTERNS.length} interpolated patterns`);
  console.log(`  press pass: ${totalPressed} destructive controls pressed, ${totalRaised} dialogs raised, ${blockedWrites} writes blocked at the network`);

  const reached = new Set(dialogsSeen.map((d) => d.screen));
  const tally = (v) => dialogsSeen.filter((d) => d.verdict === v).length;
  console.log(`  dialogs captured: ${dialogsSeen.length} — ${tally("en")} English, ${tally("es")} Spanish, ${tally("?")} unclassifiable`);
  for (const d of dialogsSeen) {
    console.log(`      ${d.verdict === "en" ? "EN" : d.verdict === "es" ? "es" : " ?"}  ${d.screen} · ${d.fn}()  ${JSON.stringify(d.text.slice(0, 80))}`);
  }
  if (tally("?")) {
    console.log(`  ${tally("?")} dialog(s) matched NO catalogue key in either language. That is either a`);
    console.log(`  detailer's own words or a string that never reached t() — nothing in the DOM`);
    console.log(`  can tell those apart. tests/spanish.test.mjs § 11 decides it, from the source.`);
  }

  // **A CLASS THAT WAS NEVER REACHED HAS TO SAY SO.** Source says these files
  // can raise a dialog; if the press pass raised none at all, the run proved
  // nothing about them and a green verdict would be the sixth blind check.
  console.log(`\n  source says ${DIALOG_FILES.length} files can raise a dialog: ${DIALOG_FILES.join(", ")}`);
  if (totalRaised === 0 && DIALOG_FILES.length > 0) {
    problems.push({ screen: "press pass", text: "no dialog was raised anywhere", where: "the press pass", key: "-" });
    console.log("  FAIL  press pass · not one dialog was raised — the pass reached nothing, so its silence is not evidence");
  }
  if (reached.size) console.log(`  screens that raised one: ${[...reached].join(", ")}`);
  // ponytail: the press pass proves the dialogs it RAISED and says nothing
  // about the rest. Nothing in the DOM names the file a dialog came from, so
  // this cannot be a per-file tick — it is a floor, and the floor has to be
  // printed or a partial run reads as a complete one. Raising the floor means
  // reaching the controls behind a record (a booking's Delete, a day sheet's
  // block, a job photo's remove), which needs a row opened first; that is the
  // next rung, not a missing feature. `tests/spanish.test.mjs` § 11 covers all
  // eleven files from the source in the meantime.
  console.log(`  FLOOR: ${reached.size} of ${DIALOG_FILES.length} dialog-raising files were reached by a press.`);
  console.log("  The rest are unproven AT RUNTIME — spanish.test.mjs § 11 covers all of them from the source.");
} finally {
  if (!process.argv.includes("--keep")) await browser.close();
}

await reportSourceMoved(changedSince, problems.length === 0);
if (notMeasured.length) console.log(`\n${notMeasured.length} screens NOT MEASURED: ${notMeasured.join(", ")}`);
const bad = problems.length + notMeasured.length;
console.log(bad === 0
  ? "\nclean — no English on any Spanish screen, resting or after a press"
  : `\n${problems.length} pieces of English on a Spanish dashboard, ${notMeasured.length} screens not measured`);
if (process.argv.includes("--prove")) {
  console.log(bad === 0
    ? "\n--prove FAILED: the dashboard was in English and this check called it clean. It is blind."
    : "\n--prove passed: the check goes red on an English dashboard, so its silence is evidence.");
  process.exit(bad === 0 ? 1 : 0);
}
process.exit(bad === 0 ? 0 : 1);
