// WHY THIS EXISTS, AND IT IS THE PART THAT DECIDES WHETHER YOU RUN IT.
// Moved here from CLAUDE.md's verification table on 2026-09-20 — the table
// names the trigger, this names the case. Three rows there carried 2,382
// characters of justification between them, which is prose a person only
// needs once they are already looking at this file.
//
// **American English is a rule no other gate can see.** On 2026-09-20 a
// person reading the five example sites found **36 British spellings in 17
// words** — nine "bonnet", four "wing", four "microfibre" — reaching
// visitors, in alt text a screen reader says out loud, in a control the build
// injects, and inside a JavaScript array that only renders when a tab is
// opened. Every other check here measures structure, contrast, routes or
// counts, and a word spelled correctly but wrong for the audience passes all
// of them. It reads the FINISHED page, not the source — the source scan
// printed clean over "Aluminium tanks". **The two documented exceptions are
// allowed by WHERE they appear, never by how they are spelled**:
// `"cancelled"` passes as the bare status value, not inside a sentence. It
// found a 37th on its first run, on `/pricing`
//
// AMERICAN ENGLISH, READ OFF THE FINISHED PAGE.
//
//   npm run dev --prefix app            # the pages must be served
//   node scripts/build-examples.mjs --dev
//   node scripts/american-english.mjs
//   node scripts/american-english.mjs --break=mute    # the canary must be missed
//   node scripts/american-english.mjs --break=lax     # the exception must over-fire
//   node scripts/receipt.mjs receipts/american-english.json
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// On 2026-09-20 a person reading the five example sites found **36 British
// spellings in 17 different words** reaching a visitor: nine "bonnet", four
// "wing", four "microfibre", three "saloon", and one each of kerb, grey,
// aluminium, windscreen, boot lid, fortnightly and at weekends. `CLAUDE.md`
// names "hood" by name.
//
// **NOTHING THIS REPO RUNS WOULD HAVE CAUGHT ONE OF THEM.** Every other gate
// measures structure, contrast, routes, widths or counts. A word that is
// spelled correctly and is wrong for the audience passes all of them, and it
// would have come back the next time somebody wrote a page. ROADMAP 7.13.
//
// ---------------------------------------------------------------------------
// IT READS THE FINISHED PAGE, NOT THE SOURCE, AND THAT WAS LEARNED THE HARD WAY
// ---------------------------------------------------------------------------
// The first attempt scanned the HTML with `<script>` blocks stripped out. It
// printed clean over "Aluminium tanks and wheels polished" and "Windscreen
// polished", because on /ex5 those are service bullets living inside a
// JavaScript array. A rendered scan that read one tab then found those and
// missed others. **Each instrument printed clean over words the other found.**
//
// So this walks the DOM after the page's own script has run, over EVERY text
// node — including the seven vehicle panels /ex5 builds and hides, which are
// 32,779 characters of text against 7,551 visible. `innerText` would have
// returned the visible eighth. It also reads the strings a screen reader says
// out loud: alt, aria-label, placeholder, title and the tab title. Alt text is
// not decoration — a blind visitor was being told about a bonnet.
//
// ---------------------------------------------------------------------------
// THE TWO EXCEPTIONS ARE ALLOWED BY WHERE THEY APPEAR, NEVER BY HOW THEY ARE
// SPELLED
// ---------------------------------------------------------------------------
// `CLAUDE.md` exempts two words because they are DATA rather than prose:
// "cancelled" is the database's own value across five tables, and "colour" is
// a setup-step key stored on every business. Renaming either breaks live data.
//
// **An exception written as "allow the word cancelled" would have passed the
// sentence this check was built to catch** — /ex5's "A slot cancelled late
// cannot be refilled", which is prose, and was fixed. So the rule is
// positional:
//
//   · `cancelled` passes ONLY as the bare status token ("Cancelled" standing
//     alone, or carried in an attribute). In a sentence it is a finding.
//   · `colour` passes ONLY inside a key-ish attribute. Anywhere a person
//     reads it, it is a finding.
//
// `--break=lax` turns both back into spelling exceptions, and the canary must
// then be missed. A rule nobody has watched fail is a word list, not a check.

import { createRequire } from "node:module";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const require_ = createRequire(import.meta.url);
const { chromium } = require_("./../app/node_modules/playwright/index.js");

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.EXAMPLES_BASE || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const started_at = new Date().toISOString();

// EVERY PAGE A STRANGER CAN REACH WITHOUT SIGNING IN. Declared, so a page
// that stops existing is a discovered-vs-expected mismatch the receipt
// refuses, rather than a quietly shorter list.
const PAGES = [
  ["home", "/"],
  ["pricing", "/pricing"],
  ["examples", "/examples/"],
  ["ex1", "/ex1/"],
  ["ex1-prices", "/ex1/prices.html"],
  ["ex1-work", "/ex1/work.html"],
  ["ex2", "/ex2/"],
  ["ex3", "/ex3/"],
  ["ex3-prices", "/ex3/prices.html"],
  ["ex4", "/ex4/"],
  ["ex5", "/ex5/"],
];

// THE LIST. Only words that are unambiguously British in a detailing context.
// Deliberately NOT here: bare "wing" (a wing is a real part of an American
// car), bare "boot", "torch", "queue", "hire", "post". Each of those needs a
// person, and a check that cries wolf gets turned off. Bare "wing" was one of
// the 36 found by hand and this check would not have found it — said out loud
// rather than papered over.
const WORDS = [
  ["bonnet", "hood"], ["boot lid", "trunk lid"], ["wing mirror", "side mirror"],
  ["windscreen", "windshield"], ["number plate", "license plate"],
  ["tyre", "tire"], ["tyres", "tires"], ["petrol", "gas"], ["kerb", "curb"],
  ["kerbside", "curbside"], ["saloon", "sedan"], ["estate car", "station wagon"],
  ["aluminium", "aluminum"], ["microfibre", "microfiber"], ["lorry", "truck"],
  ["colour", "color"], ["colours", "colors"], ["coloured", "colored"],
  ["colourway", "colorway"], ["colourways", "colorways"],
  ["favourite", "favorite"], ["flavour", "flavor"], ["behaviour", "behavior"],
  ["neighbour", "neighbor"], ["neighbours", "neighbors"], ["labour", "labor"],
  ["centre", "center"], ["centres", "centers"], ["centred", "centered"],
  ["licence", "license"], ["defence", "defense"], ["programme", "program"],
  ["grey", "gray"], ["mould", "mold"], ["litre", "liter"], ["litres", "liters"],
  ["metre", "meter"], ["metres", "meters"], ["judgement", "judgment"],
  ["travelling", "traveling"], ["travelled", "traveled"],
  ["cancelling", "canceling"], ["cancelled", "canceled"],
  ["enquiry", "inquiry"], ["enquiries", "inquiries"],
  ["organise", "organize"], ["organised", "organized"],
  ["recognise", "recognize"], ["recognised", "recognized"],
  ["realise", "realize"], ["realised", "realized"],
  ["apologise", "apologize"], ["specialise", "specialize"],
  ["specialised", "specialized"], ["customise", "customize"],
  ["customised", "customized"], ["optimise", "optimize"],
  ["prioritise", "prioritize"], ["summarise", "summarize"],
  ["analyse", "analyze"], ["analysed", "analyzed"],
  ["fortnightly", "every two weeks"], ["whilst", "while"], ["amongst", "among"],
  ["at weekends", "on weekends"], ["car park", "parking lot"],
];
const MUTED = new Set(["bonnet", "grey", "colour"]);   // --break=mute only
const RX = new RegExp("\\b(" + WORDS.map(([b]) => b.replace(/ /g, "\\s+")).join("|") + ")\\b", "gi");
const FIX = new Map(WORDS);

/**
 * THE CLASSIFIER. `bucket` is "prose" (anything a person reads or a screen
 * reader says) or "key" (a data-*, name, value, id or class attribute, which
 * is a database key rather than English). `bareStatus` marks a string that is
 * the status value itself rather than a sentence containing it.
 *
 * The two exceptions live HERE, and they are about position, not spelling.
 */
function findings(text, bucket, bareStatus) {
  const out = [];
  for (const m of String(text).matchAll(RX)) {
    const word = m[0].toLowerCase().replace(/\s+/g, " ");
    if (BREAK === "mute" && MUTED.has(word)) continue;

    if (word === "colour") {
      if (bucket === "key") continue;              // a setup-step key on every business
      if (BREAK === "lax") continue;               // the spelling-shaped rule, on purpose
    }
    if (word === "cancelled") {
      if (bucket === "key" || bareStatus) continue;  // the database's own status value
      if (BREAK === "lax") continue;
    }
    out.push({ word, should: FIX.get(word) ?? "?", text: String(text).trim().slice(0, 120) });
  }
  return out;
}

/** Pull every string off a rendered page, each tagged with where it came
 *  from. This function is evaluated inside the browser. */
const HARVEST = () => {
  const out = [];
  const READ_ALOUD = ["alt", "aria-label", "placeholder", "title"];
  const KEYISH = ["name", "value", "id", "class"];
  out.push({ where: "document.title", bucket: "prose", text: document.title, bare: false });

  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement;
    if (!p || p.tagName === "SCRIPT" || p.tagName === "STYLE") continue;   // code, not prose
    const t = n.nodeValue;
    if (!t || !t.trim()) continue;
    // A STATUS CHIP IS THE DATABASE'S OWN VALUE BEING SHOWN. The bare token,
    // or an element carrying it as an attribute, is data rather than English.
    const bare = /^cancelled$/i.test(t.trim())
      || [...p.attributes].some((a) => a.value.toLowerCase() === "cancelled");
    out.push({
      where: p.tagName.toLowerCase() + (p.className ? "." + String(p.className).split(" ")[0] : ""),
      bucket: "prose", text: t, bare,
    });
  }
  for (const el of document.querySelectorAll("*")) {
    for (const a of READ_ALOUD) {
      const v = el.getAttribute(a);
      // a data: URI is a payload, never prose — "grey" turns up inside base64
      if (v && !v.startsWith("data:")) {
        out.push({ where: el.tagName.toLowerCase() + "[" + a + "]", bucket: "prose", text: v, bare: false });
      }
    }
    for (const a of el.getAttributeNames()) {
      if (a.startsWith("data-") || KEYISH.includes(a)) {
        const v = el.getAttribute(a);
        if (v && !v.startsWith("data:")) {
          out.push({ where: el.tagName.toLowerCase() + "[" + a + "]", bucket: "key", text: v, bare: false });
        }
      }
    }
  }
  return out;
};

// ═══ THE CANARY ══════════════════════════════════════════════════════════
// A real page, really loaded, with real British prose injected into its real
// DOM, read by the real harvester and judged by the real classifier. Not a
// flag that pretends: this repo has shipped six checks that tested nothing,
// and a simulated sabotage is how that keeps happening.
//
// BOTH DIRECTIONS, because a check that flags everything is as useless as one
// that flags nothing:
//   MUST CATCH    British words planted in prose, in alt text and in the title
//   MUST CATCH    "cancelled" inside a sentence — the exact string this check
//                 was built for, and the one a spelling-shaped exception would
//                 have waved through
//   MUST NOT FIRE the bare "Cancelled" status token, or data-step="colour"
const PLANT = () => {
  const prose = document.createElement("p");
  prose.textContent = "The bonnet was a lovely grey colour.";
  document.body.appendChild(prose);

  const im = document.createElement("img");
  im.setAttribute("alt", "A microfibre cloth on the windscreen.");
  document.body.appendChild(im);

  document.title += " — kerbside";

  const sentence = document.createElement("p");
  sentence.textContent = "A slot cancelled late cannot be refilled.";
  document.body.appendChild(sentence);

  const chip = document.createElement("span");          // must NOT fire
  chip.setAttribute("data-status", "cancelled");
  chip.textContent = "Cancelled";
  document.body.appendChild(chip);

  const key = document.createElement("div");            // must NOT fire
  key.setAttribute("data-step", "colour");
  document.body.appendChild(key);
};

// ═══ THE RUN ═════════════════════════════════════════════════════════════
const browser = await chromium.launch();
const failures = [];
const rows = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0, skipped = 0;

console.log("American English, read off the finished page");
console.log(PAGES.length + " pages, " + WORDS.length + " words, exceptions by position\n");

const scan = async (url, plant) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(900);
    // `/ex1/prices` without the .html is a 404 PAGE THAT RENDERS FINE. Two
    // scans reported three sub-pages clean while reading the error page.
    const is404 = await page.evaluate(() => /That page does not exist/.test(document.body.innerText));
    if (is404) return { error: "the 404 page — this URL does not exist" };
    if (plant) await page.evaluate(plant);
    return { strings: await page.evaluate(HARVEST) };
  } catch (e) {
    return { error: String(e.message).slice(0, 90) };
  } finally {
    await page.close();
  }
};

for (const [name, url] of PAGES) {
  attempted++;
  const r = await scan(url, null);
  if (r.error) {
    skipped++;
    failures.push(name + " (" + url + "): NOT SCANNED — " + r.error);
    console.log("  " + name.padEnd(11) + " NOT SCANNED — " + r.error);
    continue;
  }
  discovered++;
  const hits = [];
  for (const s of r.strings) {
    assertions++;
    for (const f of findings(s.text, s.bucket, s.bare)) hits.push({ ...f, where: s.where });
  }
  completed++;
  rows.push({ page: name, strings: r.strings.length, hits: hits.length });
  for (const h of hits) {
    failures.push(name + ': "' + h.word + '" should be "' + h.should + '" — in '
      + h.where + ": " + JSON.stringify(h.text));
  }
  console.log("  " + name.padEnd(11) + (hits.length
    ? String(hits.length).padStart(3) + " British — " + [...new Set(hits.map((h) => h.word))].join(", ")
    : "  0   (" + r.strings.length + " strings read)"));
}

// ── the canary, on a real page
const c = await scan("/ex1/", PLANT);
const cf = [];
if (c.error) {
  failures.push("the canary page would not load: " + c.error);
} else {
  for (const s of c.strings) {
    assertions++;
    for (const f of findings(s.text, s.bucket, s.bare)) cf.push({ ...f, where: s.where });
  }
}
const caught = new Set(cf.map((x) => x.word));
const mustCatch = ["bonnet", "grey", "colour", "microfibre", "windscreen", "kerbside", "cancelled"];
const missed = mustCatch.filter((w) => !caught.has(w));
// The must-NOT-fire half. The planted sentence is the only legitimate
// "cancelled" finding and "lovely grey colour" the only legitimate "colour"
// one; anything else means the exception is being read as a spelling.
const overFired = cf.filter((x) => x.word === "cancelled" && !/cannot be refilled/.test(x.text))
  .concat(cf.filter((x) => x.word === "colour" && !/lovely grey/.test(x.text)));
assertions += mustCatch.length + 1;

const canaryOk = missed.length === 0 && overFired.length === 0;
const canary = {
  id: "a real page with British prose planted in its live DOM, tested both directions",
  observed_failure: canaryOk,
  caught_by: canaryOk ? ["rendered-text", "read-aloud-attributes", "positional-exception"] : [],
  findings: [
    missed.length === 0
      ? "[rendered-text] all " + mustCatch.length + " planted words were caught, including "
        + '"cancelled" inside a sentence'
      : "[rendered-text] NOT CAUGHT: " + missed.join(", ") + " — the check cannot see a word it was handed",
    overFired.length === 0
      ? '[positional-exception] the bare "Cancelled" status token and data-step="colour" were NOT '
        + "flagged, so the exception is about position and not spelling"
      : "[positional-exception] OVER-FIRED on " + overFired.length + " exempt string(s) — it is "
        + "flagging the database's own values: " + JSON.stringify(overFired.slice(0, 2)),
  ],
};

// THE STATUS IS ALWAYS THE TRUTH ABOUT THE RUN, never a verdict on the
// sabotage. Under --break the canary is supposed to stop firing, which makes
// this receipt one that `receipt.mjs` MUST REFUSE — and that refusal is the
// proof. A script printing PASS here while the grader printed FAIL would be
// two tools disagreeing about the same run.
const status = failures.length === 0 && canaryOk ? "pass" : "fail";
const sabotageWorked = BREAK !== "" && !canaryOk;

// SOMETHING FOR A PERSON TO LOOK AT. A receipt with no artifact is a number
// with nothing behind it, and `receipt.mjs` refuses one — correctly.
const REPORT = path.join(ROOT, "receipts", "american-english-report.txt");
writeFileSync(REPORT, [
  "American English, read off the finished page — " + started_at,
  BREAK ? "RUN WITH --break=" + BREAK + ": this is a sabotage, not a result." : "",
  "",
  ...rows.map((r) => "  " + r.page.padEnd(12) + String(r.strings).padStart(5)
    + " strings read, " + r.hits + " British"),
  "",
  "  canary: " + canary.findings.join("\n          "),
  "",
  failures.length ? "FINDINGS:" : "No British spellings on any page.",
  ...failures.map((f) => "  - " + f),
  "",
  "Words checked (" + WORDS.length + "): " + WORDS.map(([x]) => x).join(", "),
].join("\n") + "\n", "utf8");

const { path: receiptPath } = writeReceipt({
  check_id: "american-english",
  started_at,
  status,
  expected_targets: PAGES.length,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: skipped,
  assertions_executed: assertions,
  min_assertions: 2500,
  failures: BREAK ? [] : failures,
  artifacts: ["receipts/american-english-report.txt"],
  warnings: [
    ...(BREAK ? ["run with --break=" + BREAK + "; this receipt is a sabotage, not a result"] : []),
    'bare "wing" is NOT in the word list — a wing is a real part of an American car — and one of '
    + "the 36 instances found by hand was exactly that. This check would not have found it.",
    "written 2026-09-20 because 36 British spellings were found by a person READING the five "
    + "example sites, and nothing this repo runs would have caught one of them. ROADMAP 7.13.",
  ],
  dimensions: {
    pages: PAGES.length,
    words: WORDS.length,
    strings_read: rows.reduce((a, b) => a + b.strings, 0),
  },
  canary,
});

console.log("\n  canary: " + canary.findings.join("\n          "));
console.log("\n" + status.toUpperCase() + " — " + completed + "/" + PAGES.length + " pages, "
  + assertions + " assertions, " + failures.length + " British spelling(s).");
console.log("Receipt " + receiptPath + "\nReport  " + REPORT);
for (const f of failures.slice(0, 40)) console.log("  · " + f);
if (failures.length > 40) console.log("  … and " + (failures.length - 40) + " more");

if (BREAK) {
  console.log(sabotageWorked
    ? "\n--break=" + BREAK + " WORKED: the canary stopped firing, so this receipt is one that\n"
      + "  `node scripts/receipt.mjs receipts/american-english.json` must now REFUSE.\n"
      + "  That refusal is the result. A PASS there would mean the canary is decoration."
    : "\n--break=" + BREAK + " DID NOTHING: the canary still fired, so this sabotage tests\n"
      + "  nothing, and the control it was meant to certify is still uncertified.");
}
await browser.close();
// A sabotage run exits 0 when the sabotage SUCCEEDED in breaking the control.
process.exit(BREAK ? (sabotageWorked ? 0 : 1) : (status === "pass" ? 0 : 1));
