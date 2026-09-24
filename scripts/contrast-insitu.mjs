// WHY THIS EXISTS, AND IT IS THE PART THAT DECIDES WHETHER YOU RUN IT.
// Moved here from CLAUDE.md's verification table on 2026-09-20 — the table
// names the trigger, this names the case. Three rows there carried 2,382
// characters of justification between them, which is prose a person only
// needs once they are already looking at this file.
//
// **The four credential-free gates cannot see what this sees**: they measure
// the token PAIRS the system promises, and a pair does not know which surface
// a label lands on. `--fog-2` is the documented floor for small labels and
// holds at 4.90:1 on `--ink-1` — on `--ink-3` the same colour is **4.20:1**,
// and the landing page shipped an 11px label there while every gate printed
// clean. It walks 1,910 strings across 8 screens at 4 widths, plants a label
// nobody can read and prints VOID if its own findings do not contain it, and
// writes a receipt
//
// ROADMAP 8.3 — EVERY STRING ON EVERY SCREEN, MEASURED WHERE IT IS PAINTED.
//
// `tests/design-contrast.test.mjs` measures the token PAIRS the design system
// promises, and it passes. It cannot see this item's defect, and that is not
// a fault in it: a token pair does not know which surface a label ends up on.
// `--fog-2` is the documented floor for 10–13px labels and it holds where it
// was measured — 4.90:1 on `--ink-1`, 4.59:1 on `--ink-2`. On `--ink-3`, the
// highest surface, the same colour is **4.20:1**, under the 4.5 WCAG wants at
// that size. The landing page put an 11px label there and the pairs gate said
// "all pairs pass" the whole time.
//
// So this walks the rendered DOM instead: for every element holding its own
// visible text, it composites the real background (walking ancestors through
// translucency), composites a translucent colour over it, and applies WCAG
// 2.2 — 4.5:1, or 3:1 for large text (≥24px, or ≥18.66px at weight ≥700).
//
// **IT CARRIES A CANARY AND A CENSUS, because a contrast walker that silently
// matches nothing prints exactly the same word as a clean product.** A span
// nobody can read (#585D61 on the ground, 2.92:1) is planted before each walk
// and removed after; if it is not in the findings, the run says VOID and the
// verdict beside it is worthless. The census prints how many strings each
// screen actually offered.
//
// The dashboard tabs are read out of the tab bar rather than guessed at by
// URL: `?tab=` is not how this app switches, and an earlier draft measured
// Today four times while reporting four screens.
//
// **IT WRITES A RECEIPT AND DOES NOT GRADE ITSELF.** `receipt.mjs` recomputes
// the verdict from the counts and ignores the word this file prints — report
// § "Discipline for trusting a check", rule 10. The declared target count is
// the screen/width grid: it is written down here, and a run that walks fewer
// combinations than it promised fails on arithmetic rather than on judgement.
//
// **`sweep-widths.mjs` WAS DELIBERATELY NOT TOUCHED.** The obvious move is to
// fold this walk into the width sweep, which already visits these screens.
// That instrument belongs to another session and was mid-flight on its own
// detectors when this was written, and two sessions editing one measuring
// tool produces a tool neither can vouch for. This stays standalone; whoever
// owns the sweep can fold it in later if they want it.
//
// Usage:  node scripts/contrast-insitu.mjs              (needs dev server + seed)
//         node scripts/contrast-insitu.mjs --break      (sabotage: re-darken
//                                                        the label 8.3 fixed
//                                                        and expect a finding)
//         node scripts/receipt.mjs receipts/contrast-insitu.json

import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("D:/Users/rando/Downloads/claude/detailing-platform/app/node_modules/playwright/index.js");
import { writeReceipt } from "./receipt.mjs";

const BASE = "http://localhost:5173";
const started_at = new Date().toISOString();
// The sabotage: put ROADMAP 8.3's defect back, in the browser, and require
// the walk to find it. `--break` is a receipt of a SABOTAGE and says so.
const BREAK = process.argv.includes("--break");
const WIDTHS = [[1440, 900], [768, 1024], [392, 844], [320, 844]];
// **BOTH LANGUAGES, ADDED 2026-09-23 — it had only ever asked English.**
// 8.3's whole argument is that a check measuring one thing cannot speak for
// another, and this file was making that mistake about the dashboard's second
// language: 32 combinations, every one of them English, while the item it
// serves says "everywhere".
//
// **TWO KEYS, NOT ONE, AND THAT IS THE TRAP.** The dashboard reads
// `dp.lang.app` (`lib/appI18n.js`) and the public pages read `dp.lang`
// (`lib/i18n.js`). Setting one switches five screens and leaves the booking
// page, the landing page and pricing in English — which would print `es` on
// every line while measuring English on three of the eight screens.
// **Both are set, as PLAIN STRINGS**: `localeStore.js` stores the bare locale,
// so writing JSON leaves the value unrecognised and the page silently falls
// back — the exact bug `calendar-legible.mjs` shipped and caught the same
// night.
const LANGS = ["en", "es"];

const PROBE = () => {
  const px = (v) => parseFloat(v) || 0;
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
  });
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => {
    let stack = [], n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; }
      n = n.parentElement;
    }
    const base = parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    let out = base.a === 1 ? base : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
    return out;
  };
  // CANARY — a span nobody can read, planted before the walk. If the probe
  // does not return it, every "clean" line beside it is void.
  const canary = document.createElement("span");
  canary.textContent = "canary grey on grey";
  canary.setAttribute("data-canary", "1");
  canary.style.cssText = "color:#585d61;font-size:12px;display:block;position:relative;z-index:0;";
  document.body.appendChild(canary);
  const out = [];
  let examined = 0, worstPass = { ratio: 99 };
  for (const el of document.querySelectorAll("body *")) {
    // only elements holding their OWN text
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
    if (!own) continue;
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    const size = px(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const fgRaw = parse(cs.color); if (!fgRaw) continue;
    const bg = bgOf(el);
    const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw;
    // WCAG: large = >=24px, or >=18.66px when bold (>=700)
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const got = ratio(fg, bg);
    examined++;
    if (got >= min && got < worstPass.ratio) {
      worstPass = { ratio: Math.round(got * 100) / 100, text: own.slice(0, 30), size: Math.round(size * 10) / 10, min };
    }
    if (got + 0.005 < min) {
      out.push({
        text: own.slice(0, 48), tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 44),
        size: Math.round(size * 10) / 10, weight, ratio: Math.round(got * 100) / 100, min,
        fg: cs.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
      });
    }
  }
  canary.remove();
  return { rows: out.filter((r) => !r.canary), examined, worstPass,
    canaryCaught: out.some((r) => /canary grey on grey/.test(r.text)) };
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));

await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
await page.fill('input[type=email]', "demo@detailplatform.com");
await page.fill('input[type=password]', "demo123");
await page.click("form button.btn.primary");
await page.waitForSelector(".tabbar", { timeout: 30000 });

const found = new Map();
const census = [];
const canaryMisses = [];
// **THE LANGUAGE PASS HAS TO PROVE IT HAPPENED.** `localeStore.js` stamps the
// rendered locale onto `<html lang>`, so every target records what it actually
// rendered and a pass that fell back to English is a FAILURE rather than a
// line that says `es` beside an English measurement. Without this the second
// language is a claim, not a dimension — which is precisely the fault
// `calendar-legible.mjs` shipped the same night: 55 assertions, half of them
// measuring English twice while printing `es`.
const langMismatch = [];
let checked = 0;

// The dashboard tabs are found by reading the tab bar rather than guessed at
// by URL — `?tab=` is not how this app switches and measuring Today four
// times while calling it four screens is the failure this repo is named for.
const tabNames = await page.$$eval(".tabbar button, .tabbar a", (els) =>
  els.map((e) => e.innerText.trim()).filter(Boolean));
console.log("tabs found in the tab bar:", JSON.stringify(tabNames));
if (tabNames.length < 3) { console.log("VOID — no tab bar to walk"); process.exit(1); }

// DECLARED, NOT DISCOVERED. If the tab bar grows or loses a tab this number
// stops matching and the receipt fails on arithmetic — which is the point.
const TAB_COUNT_EXPECTED = 5;
if (tabNames.length !== TAB_COUNT_EXPECTED) {
  console.log(`tab bar has ${tabNames.length} tabs, this check expects ${TAB_COUNT_EXPECTED}`);
}

// **THE THIRD COLUMN IS "DOES THIS PAGE HAVE A SECOND LANGUAGE AT ALL", AND
// IT WAS FOUND BY THE LANGUAGE GUARD RATHER THAN ASSUMED.** The guard reported
// Landing and Pricing rendering `lang="en"` during the Spanish pass; `?lang=`
// did not move them either. `LandingPage.jsx` and `PricingPage.jsx` carry **no
// `t()` and no i18n import** — they are English-only by design, and `es.js` is
// the booking side's catalogue. So the Spanish pass SKIPS them by declaration
// rather than measuring English twice and calling it Spanish coverage.
const PUBLIC = [["Booking page", `${BASE}/book/demo-detail`, true],
  ["Landing", `${BASE}/`, false], ["Pricing", `${BASE}/pricing`, false]];

for (const lang of LANGS) {
// Set before each pass and read on the next load. Both stores, bare strings.
await page.evaluate((l) => {
  try { localStorage.setItem("dp.lang.app", l); localStorage.setItem("dp.lang", l); }
  catch { /* private mode */ }
}, lang);
for (const [w, h] of WIDTHS) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  // **TABS ARE FOUND BY POSITION AND LABELLED BY THEIR ENGLISH NAME.** The
  // first version filtered by the English word, so the Spanish pass matched
  // nothing — the tab bar reads «Hoy», «Calendario», «Dinero» — and twenty
  // combinations printed NEVER REACHED. Labelling by the English name keeps
  // the census readable across both passes; locating by index is what makes
  // it work in either language.
  for (let ti = 0; ti < tabNames.length; ti++) {
    const tab = tabNames[ti];
    const btn = page.locator(".tabbar button, .tabbar a").nth(ti);
    if (!(await btn.count())) { console.log(`skip ${tab}@${w}/${lang} — tab not present at this width`); continue; }
    await btn.click();
    await page.waitForTimeout(2600);
    await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
    const res = await page.evaluate(PROBE);
    const seen = await page.evaluate(() => document.documentElement.lang || "");
    if (seen !== lang) langMismatch.push(`${tab}@${w}/${lang} rendered lang="${seen}"`);
    checked++;
    census.push({ screen: `${tab}@${w}/${lang}`, examined: res.examined, canaryCaught: res.canaryCaught, worstPass: res.worstPass });
    if (!res.canaryCaught) canaryMisses.push(`${tab}@${w}/${lang}`);
    for (const r of res.rows) {
      const key = `${r.cls}|${r.tag}|${r.size}|${r.ratio}`;
      if (!found.has(key)) found.set(key, { ...r, where: new Set() });
      found.get(key).where.add(`${tab}@${w}/${lang}`);
    }
  }
  for (const [name, url, bilingual] of PUBLIC) {
    if (!bilingual && lang !== "en") continue;   // declared above, not a silent skip
    // **THE PUBLIC PAGES TAKE `?lang=`, NOT THE STORED KEY — measured, after
    // the language guard caught them.** Writing `dp.lang` switched the
    // dashboard and the booking page and left Landing and Pricing rendering
    // `lang="en"` while the census said `/es`: eight of the sixty-four
    // combinations were English measured twice. `?lang=` is the customer's
    // own door (`localeStore.js` § the visit layer) and it is the one that
    // works here.
    await page.goto(`${url}${url.includes("?") ? "&" : "?"}lang=${lang}`,
      { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2800);
    await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
    if (BREAK) await page.addStyleTag({ content: ".ld .bub .t { color: #7B858A !important; }" });
    const res = await page.evaluate(PROBE);
    const seen = await page.evaluate(() => document.documentElement.lang || "");
    if (seen !== lang) langMismatch.push(`${name}@${w}/${lang} rendered lang="${seen}"`);
    checked++;
    census.push({ screen: `${name}@${w}/${lang}`, examined: res.examined, canaryCaught: res.canaryCaught, worstPass: res.worstPass });
    if (!res.canaryCaught) canaryMisses.push(`${name}@${w}/${lang}`);
    for (const r of res.rows) {
      const key = `${r.cls}|${r.tag}|${r.size}|${r.ratio}`;
      if (!found.has(key)) found.set(key, { ...r, where: new Set() });
      found.get(key).where.add(`${name}@${w}/${lang}`);
    }
  }
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
}
}
const list = [...found.values()].sort((a, b) => a.ratio - b.ratio)
  .map((r) => ({ ...r, where: [...r.where].slice(0, 4).join(", ") }));
console.log(`screen/width combinations measured: ${checked}`);
const totalExamined = census.reduce((n, c) => n + c.examined, 0);
console.log(`text elements examined: ${totalExamined}`);
console.log(`canary caught on: ${census.length - canaryMisses.length}/${census.length}` + (canaryMisses.length ? ` — MISSED ON ${canaryMisses.join(", ")}` : ""));
if (canaryMisses.length || totalExamined < 200) { console.log("VOID — the probe did not prove it can see"); }
console.log("census:", JSON.stringify(census.map((c) => ({ s: c.screen, n: c.examined, worst: c.worstPass.ratio })), null, 0));
const real = list.filter((r) => !/canary grey on grey/.test(r.text));
console.log(`distinct failing styles (excluding the canary): ${real.length}`);
console.log(JSON.stringify(real, null, 1));
if (langMismatch.length) {
  console.log(`LANGUAGE NOT APPLIED on ${langMismatch.length} target(s):`);
  for (const m of langMismatch.slice(0, 6)) console.log("    " + m);
}
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();

// ---------------------------------------------------------------------------
// THE RECEIPT. The verdict below is recomputed by `receipt.mjs` from these
// counts; the word this file prints is ignored on purpose.
// ---------------------------------------------------------------------------
// EXPECTED IS WRITTEN DOWN RATHER THAN COUNTED FROM THE RUN. Deriving it from
// `checked` would make the arithmetic true by construction and a run that
// silently visited three screens would still balance — which is the exact
// failure this check exists to catch, applied to itself.
// 5 tabs + 1 bilingual public page, both languages, plus 2 English-only public
// pages once each — per width. Declared, so a page losing its second language
// fails on arithmetic rather than quietly halving the coverage.
const BILINGUAL_PUBLIC = PUBLIC.filter(([, , b]) => b).length;
const EXPECTED_TARGETS = WIDTHS.length
  * ((TAB_COUNT_EXPECTED + BILINGUAL_PUBLIC) * LANGS.length + (PUBLIC.length - BILINGUAL_PUBLIC));
// Every screen/width label this run owes, built from the same rule the walk
// above uses. `tabNames` is what the page offered; the floor is what this
// check DECLARED, so a tab that never rendered shows up as a named absence
// rather than shrinking the question.
const EXPECTED_LABELS = [];
for (const lang of LANGS) for (const [w] of WIDTHS) {
  for (const tab of tabNames) EXPECTED_LABELS.push(`${tab}@${w}/${lang}`);
  for (const [name, , bilingual] of PUBLIC) {
    if (bilingual || lang === "en") EXPECTED_LABELS.push(`${name}@${w}/${lang}`);
  }
}
// **A SHORTFALL WITH NO NAMES IS A SKIP WITH NO PROOF, ONE LEVEL DOWN —
// 2026-09-20, ROADMAP 14.11.** `skipped_targets` here is arithmetic: expected
// minus measured. The number is refusable — when it goes positive the four
// counts stop agreeing and `receipt.mjs` fails the receipt — but it cannot
// say WHICH target vanished, or whether this run DECLINED it or FAILED on it.
// Those are different facts and a bare integer makes them identical.
//
// `SHORTFALL_CANARY=1` drops a real measured row, so this is known to fire
// through the line, the count AND the verdict rather than assumed to.
const nameTheShortfall = (expectedLabels, measuredLabels, what) => {
  const have = new Set(measuredLabels);
  const missing = expectedLabels.filter((l) => !have.has(l));
  if (!missing.length) {
    console.log(`\ncoverage: all ${expectedLabels.length} ${what} were measured — nothing was skipped, declined or lost`);
    return [];
  }
  console.log(`\nSHORTFALL — ${missing.length} of ${expectedLabels.length} ${what} were never measured, `
    + `and NOTHING HERE SAYS WHY. No probe refused these and no reason was`);
  console.log(`  recorded. Treat them as unmeasured, never as clean:`);
  for (const l of missing) console.log(`    NEVER REACHED  ${l}`);
  return missing;
};
// `checked` drops with the row: it is what `skipped_targets` is derived from,
// so a canary that moved only the census would prove the printed line and
// leave the receipt's arithmetic untouched — a canary testing half the chain.
if (process.env.SHORTFALL_CANARY === "1") { census.pop(); checked--; }
const missingLabels = nameTheShortfall(EXPECTED_LABELS, census.map((c) => c.screen), "screen/width combinations");

const canaryCaughtEverywhere = canaryMisses.length === 0;
const failures = [
  ...real.map((r) => `${r.cls || r.tag} "${r.text}" — ${r.ratio}:1 at ${r.size}px, needs ${r.min} (${r.where})`),
  ...(canaryCaughtEverywhere ? [] : [`canary missed on: ${canaryMisses.join(", ")} — every clean line beside it is void`]),
  ...(checked === EXPECTED_TARGETS ? [] : [`walked ${checked} screen/width combinations, expected ${EXPECTED_TARGETS}`]),
  // NAMED, not just counted: which combinations, and that nothing explains them.
  ...missingLabels.map((l) => `NEVER REACHED, no reason recorded: ${l}`),
  ...(errors.length ? [`console errors during the walk: ${errors.slice(0, 3).join(" | ")}`] : []),
  // A pass that did not render the language it claims measured the other
  // one twice. That is no coverage at all, wearing the look of double.
  ...langMismatch.slice(0, 4).map((m) => `LANGUAGE NOT APPLIED: ${m}`),
];
// A SABOTAGE RUN INVERTS THE TEST: finding nothing is the failure.
const sabotageFailures = BREAK && real.length === 0
  ? ["--break put ROADMAP 8.3's defect back and the walk did not find it — this check is blind"]
  : [];
const status = (BREAK ? sabotageFailures.length === 0 : failures.length === 0) && canaryCaughtEverywhere
  ? "pass" : "fail";

const { path: receiptPath } = writeReceipt({
  check_id: "contrast-insitu",
  started_at,
  status,
  expected_targets: EXPECTED_TARGETS,
  discovered_targets: checked,
  attempted_targets: checked,
  completed_targets: checked,
  skipped_targets: EXPECTED_TARGETS - checked,
  assertions_executed: totalExamined,
  min_assertions: 600,
  failures: BREAK ? sabotageFailures : failures,
  artifacts: ["scripts/contrast-insitu.mjs"],
  warnings: BREAK
    ? ["run with --break; this receipt is a sabotage, not a result"]
    : [],
  dimensions: {
    widths: WIDTHS.map(([w]) => w),
    screens: [...new Set(census.map((c) => c.screen.split("@")[0]))],
    text_elements: totalExamined,
    wcag: "4.5:1 normal, 3:1 large (>=24px, or >=18.66px at weight >=700)",
    sweep_widths_touched: false,
  },
  canary: {
    id: "contrast_insitu_canary · #585D61 on the ground, 2.92:1 at 12px",
    observed_failure: canaryCaughtEverywhere,
    caught_by: canaryCaughtEverywhere ? ["walk"] : [],
    findings: canaryCaughtEverywhere
      ? [`caught on ${census.length}/${census.length} screen/width combinations`]
      : [`MISSED on ${canaryMisses.join(", ")}`],
  },
});
console.log(`receipt -> ${receiptPath}`);
