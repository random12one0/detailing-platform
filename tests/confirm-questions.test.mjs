// ROADMAP 4.1, GAP 7 — THE SWEEP'S PROOF COULD NOT BE RE-RUN.
//
//   node --test tests/confirm-questions.test.mjs
//   CONFIRM_BREAK=<case> node --test tests/confirm-questions.test.mjs   (see BREAKS)
//
// The 2026-10-06 sweep put a step in front of cancel, no-show, remove and waive, pressed it
// in a browser, and committed **no file under `tests/`**: the press script was scratch, so
// nothing pinned the five questions' wording or their Spanish. DP Cowork2's fresh-eyes review
// named that as gap 7. This is the pin.
//
// **WHAT IT CAN SEE, AND WHAT IT CANNOT — read this before trusting a green.** It reads SOURCE
// text. It can tell you that a consequential control is wired through `ConfirmTap`, that its
// question names the record, and that every English question has a Spanish entry. It cannot
// tell you that the question is ever drawn, that focus actually lands on it, or that the
// answer writes what it says — all three are browser facts, and the runs recorded in ROADMAP
// 4.1 are where they live. **A green here is "the wiring is still as it was left", not "the
// screen is right".**
//
// Credential-free: four filesystem reads, no network, no database, no `.env`.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

// **IT IS AN ENV VAR AND NOT A `--break=` FLAG, AND THAT IS NOT A STYLE CHOICE.** Written as a flag
// first, like this repo's scripts: `node --test` keeps its own arguments and runs the file in a CHILD
// process, so `process.argv` never carried it. **All five sabotages ran and all five printed 6 pass,
// 0 fail** — a canary that cannot fire, reporting green over a defect, which is `docs/gotchas.md` 95
// exactly. An env var crosses the process boundary; the loud line below is how you know it arrived.
const BREAK = process.env.CONFIRM_BREAK || "";
// Each sabotage is applied to the TEXT this check reads, never to a file on disk, so a killed
// run cannot leave one behind in `app/src` (ROADMAP 14.34 learned that the hard way).
const BREAKS = {
  "no-ask": "the cancel control writes straight from its onClick again",
  "nameless": "a question stops naming the record",
  "no-spanish": "an English answer loses its Spanish entry",
  "gendered": "the Spanish phrase forces an article in front of the detailer's own word",
  "no-focus": "ConfirmTap stops moving focus to the question",
};
if (BREAK && !BREAKS[BREAK]) throw new Error(`CONFIRM_BREAK must be one of: ${Object.keys(BREAKS).join(", ")}`);
if (BREAK) console.log(`SABOTAGE ON: ${BREAK} — ${BREAKS[BREAK]}. This run MUST go red.`);

const read = (p) => readFileSync(new URL(`../app/src/${p}`, import.meta.url), "utf8");
let detail = read("components/BookingDetail.jsx");
let confirm = read("components/ConfirmTap.jsx");
let finalize = read("components/FinalizeModal.jsx");
let spanish = read("lib/strings/appEs.js");

if (BREAK === "no-ask") {
  detail = detail.replace(/<ConfirmTap\s+className="btn ghost"[\s\S]*?onConfirm=\{\(\) => setStatus\("cancelled"\)\}\s*\/>/,
    `<button className="btn ghost" onClick={() => setStatus("cancelled")}>{t("Cancel the job")}</button>`);
}
if (BREAK === "nameless") detail = detail.replace('t("Cancel {job}?", { job })', 't("Cancel this job?")');
if (BREAK === "no-spanish") spanish = spanish.replace(/\n\s*"Yes, cancel it": "[^"]*",/, "");
if (BREAK === "gendered") {
  spanish = spanish.replace('"{name}’s {service} at {time}": "{service} de {name}, {time}",',
    '"{name}’s {service} at {time}": "el {service} de {name} de las {time}",');
}
if (BREAK === "no-focus") confirm = confirm.replace("if (asking) said.current?.focus();", "if (false) said.current?.focus();");

// EVERY `t("…")` IN THE THREE FILES, NOT ONLY THE ONES AN ATTRIBUTE MATCHER CAN REACH. The first
// version of this check matched `question={t("…")}` and silently missed three of the five: the
// completion question (composed in `jobDoneQuestion`), the email-free cancel and waive (both
// inside ternaries, whose braces ended the match early). It reported "only 7 strings found", and
// with a floor one lower it would have reported a confident green over three unchecked questions
// — the matcher-shaped blind spot this repo keeps meeting.
const asked = [...`${detail}\n${finalize}\n${confirm}`.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
const spanishKeys = new Set([...spanish.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) => m[1]));

// THE WORDING, DECLARED. The shapes below catch a control that stops asking; only a list catches
// a question quietly reworded into something that no longer says what it does.
const QUESTIONS = [
  "Mark {name}’s {service} at {time} as done?",
  "Mark {name}’s job at {time} as done?",
  "Mark {job} as a no-show?",
  "Cancel {job}? The customer is emailed.",
  "Cancel {job}?",
  "Remove {job} from your records?",
  "Waive {job}? Nothing will be collected for it.",
];
const ANSWERS = ["Yes, it’s done", "Yes, they didn’t show", "Yes, cancel it", "Yes, remove it", "Not yet"];

test("1 · the consequential actions ask before they act", () => {
  // A DISCOVERY FLOOR, which stays a floor: more strings than this is the repo growing, and that
  // is never a fault. Fewer means the matcher has stopped reaching these files at all.
  assert.ok(asked.length >= 40, `only ${asked.length} t() strings found — the matcher has lost the files`);
  for (const [what, onConfirm] of [
    ["no-show", 'setStatus("no_show")'],
    ["cancel", 'setStatus("cancelled")'],
    ["remove", "softDelete"],
  ]) {
    const esc = onConfirm.replace(/[()]/g, "\\$&");
    assert.ok(new RegExp(`onConfirm=\\{(?:\\(\\) => )?${esc}`).test(detail),
      `${what} is not wired through a ConfirmTap onConfirm`);
    assert.ok(!new RegExp(`onClick=\\{\\(\\) => ${esc}`).test(detail),
      `${what} still writes straight from an onClick`);
  }
});

test("2 · every question names the record it is about, and is still on a screen", () => {
  for (const q of QUESTIONS) {
    assert.match(q, /\{job\}|\{name\}/,
      `this question names no record, so it could be asked about anything: "${q}"`);
    assert.ok(asked.includes(q), `this wording is gone from the screens: "${q}"`);
  }
  for (const a of ANSWERS) assert.ok(asked.includes(a), `this answer is gone from the screens: "${a}"`);
});

test("3 · every English question and answer has a Spanish entry", () => {
  for (const s of [...QUESTIONS, ...ANSWERS]) {
    assert.ok(spanishKeys.has(s), `no Spanish entry for: "${s}"`);
  }
});

test("4 · the Spanish phrase guesses neither a gender nor an hour", () => {
  // The service is the DETAILER'S OWN WORD and the hour is a formatted string, so an article in
  // front of one and "de las" in front of the other are wrong for feminine services and for one
  // o'clock. Measured before the fix: "¿Cancelar el Limpieza de motor … de las 1:00 PM?".
  const phrase = /"\{name\}’s \{service\} at \{time\}":\s*"([^"]*)"/.exec(spanish)?.[1];
  assert.ok(phrase, "the job phrase has no Spanish entry at all");
  assert.doesNotMatch(phrase, /^(el|la|los|las)\s/, `an article is forced in front of the service: "${phrase}"`);
  assert.doesNotMatch(phrase, /de las \{time\}/, `"de las" is forced in front of the hour: "${phrase}"`);
  assert.match(phrase, /\{service\}/, `the phrase stopped naming the service: "${phrase}"`);
});

test("5 · the question takes focus when it opens, and hands it back", () => {
  assert.match(confirm, /if \(asking\) said\.current\?\.focus\(\)/,
    "nothing moves focus to the question, so a keyboard user is left on the page body");
  assert.match(confirm, /opener\.current\?\.focus\(\)/,
    '"Not yet" does not hand focus back to the button that asked');
  assert.match(confirm, /role="alert"[^>]*tabIndex=\{-1\}|tabIndex=\{-1\}[^>]*role="alert"/,
    "the question is not focusable, so focusing it would do nothing");
});

test("6 · the cancel question only promises an email when one will be sent", () => {
  // `update-booking` emails only a booking that carries an address, so the sentence has to ask.
  assert.match(detail, /question=\{booking\.customer_email\s*\n?\s*\?\s*t\("Cancel \{job\}\? The customer is emailed\."/,
    "the cancel question does not depend on the booking having an email address");
  assert.ok(asked.includes("Cancel {job}?"), "there is no email-free form of the cancel question");
});
