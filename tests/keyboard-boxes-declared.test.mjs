// ROADMAP 2.15 — HOW MANY BOXES ON THE BOOKING FLOW RAISE A KEYBOARD, AND DOES
// THE PHONE WALK ASK ABOUT ALL OF THEM.
//
//   node --test tests/keyboard-boxes-declared.test.mjs
//   BREAK=new-box   node --test tests/keyboard-boxes-declared.test.mjs
//   BREAK=walk-step node --test tests/keyboard-boxes-declared.test.mjs
//   BREAK=label     node --test tests/keyboard-boxes-declared.test.mjs
//
// **THE SABOTAGE IS AN ENV VAR AND NOT A FLAG, AND THAT IS NOT A STYLE
// CHOICE.** `node --test <file> --break=x` does NOT forward the flag: node
// spawns the file as a child process with argv `[node, <file>]` and nothing
// else — measured on Node v24.18.0, 2026-10-08, by printing `process.argv`
// from inside a test. So all three sabotages below printed **pass 6, fail 0**
// with the defect switched on, which is `docs/gotchas.md` 102 exactly: the
// edit never landed and a clean run wore a caught sabotage's clothes. An env
// var crosses the process boundary. The flag is still read, because
// `node tests/<file> --break=x` (no `--test`) runs the tests in-process and
// argv does arrive that way — both forms work, and the env form works in both.
//
// Credential-free, no dev server, no browser, no quote spent: eleven
// filesystem reads, ~0.3s.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS, AND IT IS NOT A HYPOTHETICAL — IT HAD ALREADY HAPPENED
// TWICE BEFORE THIS FILE WAS WRITTEN
// ---------------------------------------------------------------------------
// 2.15 closes on twenty minutes of Andrew's time on a real phone, following
// § 5 of `docs/testing/phones-we-do-not-own.md`, because a keyboard shrinks
// the VISUAL viewport and leaves the LAYOUT viewport alone — no window size
// here reproduces it. **The walk therefore decides what the twenty minutes
// covers, and the walk was scoped from a sentence rather than from a count.**
//
// It declared the address step and the details step *"the two steps in the
// whole flow with a text box above the fold"*, and ROADMAP 2.15's `Done when`
// was written from that sentence. **Counted 2026-10-08: four of the seven
// steps carry one, and they hold eight boxes.** The two the walk had missed
// were the two with the most at stake — the vehicle step, which is where this
// item's ONLY reproduced fault was measured, and the review step, which
// carries the tallest bar in the flow. Inside the two it did name it
// undercounted, missing the notes textarea.
//
// That correction was prose. **Prose is what went stale the first time.** So:
// the population is declared here, by hand, the same way `CEILINGS` in
// `scripts/bk-bar-clearance.mjs` is — a check that derives its own
// expectation from what it finds agrees with whatever it finds. A ninth box
// means somebody adds a row below AND says so in the walk, or this goes red.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT SEE, SAID SO A GREEN IS NOT MISTAKEN FOR AN ANSWER
// ---------------------------------------------------------------------------
// **This says nothing whatever about the keyboard.** It asks only whether the
// walk's population still matches the product's. 2.15's own half — does the
// pinned bar ride up over the field, or sit behind the keyboard with the next
// button unreachable — is answerable on hardware and nowhere else, and Andrew's
// ruling of 2026-09-20 governs: *"A box ticked on an untestable claim is the
// same lie as a check that prints clean having tested nothing."*
//
// It also reads SOURCE, not pixels, so it cannot tell which branch renders.
// `renders` below carries that, measured in a browser rather than reasoned:
// 392x844 on `demo-detail`, 2026-10-08, one walk of all seven steps, console
// clean — **8 boxes on 4 of 7 steps**, with the multi-vehicle field the only
// declared row that did not appear (the single-vehicle branch was taken).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// Comments in this repo quote code and quote labels — `docs/gotchas.md` #75 is
// about exactly that fooling a count — so every scan below reads the file with
// its comments stripped first.
const code = (p) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
/* A SABOTAGE THAT SILENTLY DOES NOT LAND IS AN ORDINARY CLEAN RUN —
   `docs/gotchas.md` 102, written the same day as this file after exactly that.
   So every injection below goes through `sabotage()`, which THROWS if its
   anchor is not in the text. A `--break=` that cannot find its anchor fails
   loudly instead of printing the same green a caught sabotage prints. */
const sabotage = (src, anchor, replacement, what) => {
  assert.ok(src.includes(anchor),
    `SABOTAGE --break=${BREAK} did not land: its anchor (${what}) is no longer in the file, so `
    + "this run would have been an ordinary clean one wearing a sabotage's name");
  /* EVERY OCCURRENCE, NOT THE FIRST, AND THE FIRST VERSION DID THE LATTER AND
     ONE SABOTAGE SILENTLY DID NOT BITE. `StepLocation.jsx` writes the address
     label TWICE — once as the visible `<span>` and once as the field's
     `label` prop — so renaming the first left the second standing and the run
     went green with the defect switched on. The anchor assertion above had
     passed, which is the dangerous part: the edit DID land, and was not
     enough. */
  return src.split(anchor).join(replacement);
};

const STEPS = "app/src/book/steps/";
const FLOW = ["StepServices", "StepExtras", "StepVehicle", "StepLocation", "StepWhen", "StepDetails", "StepReview"];
const WALK = "docs/testing/phones-we-do-not-own.md";

/* THE DECLARED POPULATION. `where` is the flow step a box reaches the screen
   through — which is not always the file it is written in, because two of the
   eight live in shared field components. `quoted` is the label the walk tells
   Andrew to tap, VERBATIM off the screen: 45 controls in this repo are
   addressed by the WORDS on them (`scripts/label-guard.mjs`), and a walk
   naming a label the screen does not carry is the same failure one level out —
   he is following it literally, in a driveway, one-handed.
   **Three rows carry `quoted: null` and are reported by name rather than
   folded into a pass**: § 5's details step says *"Tap each of the four in
   turn"* rather than quoting four labels, so name, phone and email are named in
   prose — and "Phone"/"Email" are too generic to assert verbatim against a
   whole document anyway. The notes box IS quoted there, because it is the one
   that had been missed and needed pointing at. */
const DECLARED = [
  { id: "vehicle model, one car", file: "VehicleField.jsx", shared: true, where: "Vehicle",
    needle: "role=\"combobox\"", quoted: "What are you bringing? (optional)", renders: true },
  { id: "vehicle year", file: `${STEPS}StepVehicle.jsx`, where: "Vehicle",
    needle: "form.vehicleYear", quoted: "Year or estimate (optional)", renders: true },
  { id: "address", file: "AddressField.jsx", shared: true, where: "Location",
    needle: "autoComplete=\"street-address\"", quoted: "Where should we come?", renders: true },
  { id: "customer name", file: `${STEPS}StepDetails.jsx`, where: "Details",
    needle: "form.customerName", quoted: null, renders: true },
  { id: "customer phone", file: `${STEPS}StepDetails.jsx`, where: "Details",
    needle: "form.customerPhone", quoted: null, renders: true },
  { id: "customer email", file: `${STEPS}StepDetails.jsx`, where: "Details",
    needle: "form.customerEmail", quoted: null, renders: true },
  { id: "customer notes", file: `${STEPS}StepDetails.jsx`, where: "Details",
    needle: "form.customerNotes", quoted: "Anything we should know? (optional)", renders: true },
  { id: "promo code", file: `${STEPS}StepReview.jsx`, where: "Review",
    needle: "form.promoCode", quoted: "Have a code?", renders: true },
];
/* NOT A KEYBOARD BOX, AND WHY — declared rather than silently filtered, because
   "the scan excluded it" and "the scan never saw it" read identically. */
const EXCLUDED = [
  { id: "spam honeypot", file: `${STEPS}StepDetails.jsx`, needle: "name=\"website\"",
    why: "carries the bare `hidden` attribute, so no person ever focuses it (ROADMAP 2.21)" },
  { id: "faucet / power checkboxes", file: `${STEPS}StepLocation.jsx`, needle: "type=\"checkbox\"",
    why: "a checkbox raises no keyboard" },
];

/* AN ELEMENT, NEVER A LINE, AND NEVER UP TO THE FIRST `>`. Both shared field
   components put `onChange={(e) => …}` inside the element, so slicing to the
   first `>` ends the element inside an arrow function — which is the mistake
   `readCeiling` in `bk-bar-clearance.mjs` was corrected for twice, in both
   directions. Brace depth, so `=>` inside `{}` cannot close the tag. */
const elements = (src) => {
  const out = [];
  for (const tag of ["<input", "<textarea"]) {
    for (let from = 0;;) {
      const open = src.indexOf(tag, from);
      if (open < 0) break;
      from = open + tag.length;
      let depth = 0, end = -1;
      for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ">" && depth === 0) { end = i; break; }
      }
      if (end < 0) continue;
      const el = src.slice(open, end + 1);
      const type = (el.match(/type="([a-z]+)"/) || [, "text"])[1];
      const kbd = tag === "<textarea"
        || (!/\bhidden\b/.test(el) && !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"].includes(type));
      out.push({ el, tag, type, kbd, at: src.slice(0, open).split(/\r?\n/).length });
    }
  }
  return out;
};

const FILES = [...FLOW.map((f) => `${STEPS}${f}.jsx`), "app/src/book/AddressField.jsx", "app/src/book/VehicleField.jsx"];
const sources = new Map();
for (const f of FILES) {
  let src = code(f);
  if (BREAK === "new-box" && f.endsWith("StepExtras.jsx")) {
    // A ninth box, on a step the walk does not visit, written the way this repo
    // writes one. Aimed at the file as READ: `app/src` is another lane's and a
    // sabotage that edits it is a measurement taken while somebody is building.
    src = sabotage(src, "return (", 'return (\n      <input value={form.giftNote} />',
      "the component's `return (`");
  }
  if (BREAK === "label" && f.endsWith("StepLocation.jsx")) {
    src = sabotage(src, "Where should we come?", "Where shall we come?", "the address label");
  }
  sources.set(f, src);
}
/* WHITESPACE-FLATTENED BEFORE ANY MATCH, AND THE FIRST VERSION WAS NOT, WHICH
   COST A FALSE RED. The walk is hard-wrapped at 80 columns, so
   `**"What are you bringing? (optional)"**` is split across a line break and a
   plain substring search cannot see it — this file reported the walk as quoting
   a label it quotes perfectly. **It is the same mechanism as the wrapped-quote
   miscount written up the same day**: a check coupled to where a document
   happens to wrap is a check about the typesetting. */
const flat = (s) => s.replace(/\s+/g, " ");
let walk = read(WALK);
if (BREAK === "walk-step") {
  walk = sabotage(walk, "**The vehicle step", "**The windscreen step",
    "the walk's vehicle-step heading");
}
walk = flat(walk);

const found = [];
for (const [f, src] of sources) for (const e of elements(src)) found.push({ ...e, file: f });

test("0 — the check has subjects: all eleven files read, and the scan found elements", () => {
  for (const f of FILES) {
    assert.ok(read(f).length > 400, `${f} is too small to be the real file (${read(f).length} bytes)`);
  }
  assert.ok(read(WALK).length > 5000, `${WALK} is too small to be the real walk`);
  // A DISCOVERY FLOOR, and it stays a floor: more `<input>`s than expected in
  // the booking flow is not a fault, it is growth. The EQUALITY that declares
  // how much is owed is test 1's, on the keyboard-raising subset.
  assert.ok(found.length >= 10,
    `the element scan found ${found.length} <input>/<textarea> elements across the booking `
    + "flow; under ten means the scan stopped matching, not that the product shrank");
});

test("1 — the eight keyboard-raising boxes are exactly the eight declared", () => {
  const kbd = found.filter((e) => e.kbd);
  const unmatched = [];
  const matched = new Map();
  for (const e of kbd) {
    const row = DECLARED.find((d) => e.file.endsWith(d.file) && e.el.includes(d.needle));
    if (!row) unmatched.push(`${e.file}:${e.at} ${e.tag}[${e.type}]`);
    else matched.set(row.id, e);
  }
  assert.deepEqual(unmatched, [],
    "a box that raises a keyboard is on the booking flow and is not in this file's declared "
    + "population, so § 5 of docs/testing/phones-we-do-not-own.md does not ask about it and "
    + "Andrew's twenty minutes would not cover it. Add a row to DECLARED (or to EXCLUDED with "
    + "the reason) and add the step to the walk");
  const missing = DECLARED.filter((d) => !matched.has(d.id)).map((d) => d.id);
  assert.deepEqual(missing, [],
    "a declared box is gone from the product; the walk still asks Andrew to tap it");
  assert.equal(matched.size, 8,
    `${matched.size} declared boxes matched, not 8 — an equality, not a ceiling, because a `
    + "ceiling with room in it means the next one lands with nothing going red");
});

test("2 — the two excluded elements are still there, and still excluded for the stated reason", () => {
  for (const x of EXCLUDED) {
    const hit = found.find((e) => e.file.endsWith(x.file) && e.el.includes(x.needle));
    assert.ok(hit, `${x.id} is gone from ${x.file}; it was excluded because it ${x.why}`);
    assert.equal(hit.kbd, false,
      `${x.id} now reads as a box that RAISES a keyboard — it was excluded because it ${x.why}, `
      + "so either that stopped being true or the classifier is wrong. Either way the walk's "
      + "population has changed");
  }
});

test("3 — four of the seven flow steps carry one, and they are the four the walk visits", () => {
  const byStep = new Set(DECLARED.filter((d) => d.renders).map((d) => d.where));
  assert.deepEqual([...byStep].sort(), ["Details", "Location", "Review", "Vehicle"],
    "the steps carrying a keyboard box are no longer the four § 5 walks");
  // The shared components reach the screen through exactly one step each. If
  // StepWhen starts rendering an AddressField, `where` above is a fiction.
  for (const d of DECLARED.filter((d) => d.shared)) {
    const users = FLOW.filter((f) => sources.get(`${STEPS}${f}.jsx`).includes(`<${d.file.replace(".jsx", "")}`));
    assert.deepEqual(users, [`Step${d.where}`],
      `${d.file} is rendered by ${JSON.stringify(users)}, not only by Step${d.where} — the step `
      + "mapping this file declares, and the walk is scoped from, is wrong");
  }
  assert.match(walk, /four of the seven steps carry a box that raises the keyboard/,
    `§ 5 of ${WALK} no longer states the count it was scoped from. It said "the two steps in `
    + 'the whole flow with a text box" once, and ROADMAP 2.15\'s Done when was written off that '
    + "sentence; it was four");
  for (const step of ["vehicle step", "address step", "name, phone and email", "review step"]) {
    assert.ok(walk.includes(step),
      `§ 5 no longer names the ${step} — a step with a keyboard box that the walk does not `
      + "visit is twenty minutes of Andrew's time answering half the question");
  }
});

test("4 — every label the walk tells him to tap is the label the screen carries", () => {
  const unquoted = [];
  for (const d of DECLARED) {
    if (d.quoted === null) { unquoted.push(d.id); continue; }
    /* SEARCHED ACROSS THE FLOW, NOT IN THE BOX'S OWN FILE, AND THE FIRST
       VERSION DID THE LATTER AND WAS WRONG ABOUT TWO ROWS. Both shared field
       components take their label as a PROP, so the words a customer reads are
       written in the step that renders them — `VehicleField.jsx` contains
       neither "What are you bringing?" nor anything like it. A per-file lookup
       reported two correct labels as renamed: a false FAILURE, which is the
       honest direction and still wrong. */
    const src = flat([...sources.values()].join("\n"));
    assert.ok(src.includes(d.quoted),
      `the product no longer carries the string "${d.quoted}" that this file declares for `
      + `${d.id}; a rename blinds a check here while every line still reads normally`);
    assert.ok(walk.includes(d.quoted),
      `§ 5 does not quote "${d.quoted}" as the screen spells it, so the walk is sending Andrew `
      + `to tap a label that is not there (${d.id})`);
  }
  // Reported by name, never folded into the pass.
  assert.deepEqual(unquoted, ["customer name", "customer phone", "customer email"],
    "the set of boxes the walk names in prose without quoting a label has changed; whichever "
    + "way it moved, say so here rather than letting it pass quietly");
});

test("5 — ROADMAP 2.15's Done when still asks for all four steps", () => {
  const item = read("ROADMAP.md").split("**2.15 —")[1] || "";
  assert.ok(item.length > 2000, "ROADMAP 2.15 could not be found, or is far shorter than it was");
  const dw = item.slice(item.lastIndexOf("AMENDED `Done when`"));
  assert.ok(dw.length > 200, "2.15's amended `Done when` is gone");
  assert.match(dw, /all\s*\*\*four\*\*|\*\*all\s*four\*\*/,
    "2.15's Done when no longer says four steps. It said two for thirteen days, and the walk "
    + "it closes on would have answered half the question");
  for (const w of ["vehicle", "address", "notes", "promo"]) {
    assert.ok(dw.toLowerCase().includes(w),
      `2.15's Done when no longer names the ${w} step/box, so a run that skipped it would read `
      + "as a close");
  }
});
