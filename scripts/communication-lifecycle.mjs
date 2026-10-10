// ROADMAP 3.4b — DOES `docs/communication-lifecycle.md` STILL NAME EVERY MESSAGE
// THIS PRODUCT SENDS, WITH A COMPLETE ROW AND A DECISION FOR EACH?
//
//   node scripts/communication-lifecycle.mjs
//   node scripts/communication-lifecycle.mjs --break=drop-template   # sabotage: the plan-cancelled row cut from the doc
//   node scripts/communication-lifecycle.mjs --break=new-push        # sabotage: a push the product grew and the doc did not
//   node scripts/communication-lifecycle.mjs --break=blank-cell      # sabotage: the reminder's Timing cell emptied
//   node scripts/communication-lifecycle.mjs --break=flip-switch     # sabotage: the doc claims "Booking cancelled" honors the alerts switch
//   BREAK=new-push node scripts/communication-lifecycle.mjs          # the same, as an env var (docs/gotchas.md 104)
//
// Credential-free, no dev server, no network: filesystem reads only.
//
// WHY: a matrix written once goes stale the next time somebody adds a message
// (`docs/gotchas.md` 91), so the POPULATION is read from the code, never typed
// here, and the page is asked to name every member of it:
//   * every `*Email` function `_shared/emailTemplates.ts` exports;
//   * every title any function passes to `sendOwnerPush`;
//   * every function folder that calls `sendTenantEmail` or `sendOwnerPush`;
//   * every built-in text in `lib/templates.js`;
//   * the Supabase Auth calls in `screens/Auth.jsx`.
// Then the page is held to its own shape: every matrix row has every cell, a
// decision from the six allowed words, and every non-KEEP row is explained in
// § 4. And one CLAIM is checked against the code rather than the list: whether
// each push honors the `push_enabled` master switch.
//
// WHAT IT CANNOT SEE: whether a trigger or timing sentence is TRUE (those are
// prose; only the switch claim is machine-checked), whether the decisions are
// right (Andrew's, and D3 is a DECIDE row in FOR-ANDREW.md), and the wording of
// Supabase's own mail. The first two are printed as UNJUDGEABLE, not folded
// into the pass.
//
// FOUR CANARIES RUN EVERY TIME against in-memory copies, one per sabotage
// above, and each must turn its own rule red. A `--break=` applies the same edit
// to the main run and refuses to report if the edit did not land (gotchas 102).

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";

// CRLF IS NORMALIZED ON READ (docs/gotchas.md 118).
const read = (rel) => readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

export const DOC = "docs/communication-lifecycle.md";
const FILES = {
  emailTemplates: "supabase/functions/_shared/emailTemplates.ts",
  templates: "app/src/lib/templates.js",
  auth: "app/src/screens/Auth.jsx",
};
export const DECISIONS = ["KEEP", "ADD", "CHANGE", "MERGE", "REMOVE", "DEFER"];

export const RULES = [
  "doc-names-every-template",
  "doc-names-every-push-title",
  "doc-names-every-sender",
  "doc-names-every-text",
  "doc-names-every-auth-call",
  "every-row-is-complete",
  "every-change-is-explained",
  "push-switch-claim-is-true",
];

// Columns per matrix: email 9, push 7, text 8. EQUALITIES (docs/gotchas.md 98).
const WIDTH = { C: 9, O: 9, P: 9, N: 7, T: 8 };
// The discovery floor on rows: a parser that stopped matching would read as
// all-clear. A FLOOR, on purpose: more rows is not a fault.
const MIN_ROWS = 40;

const fnFiles = (dir) => {
  const out = [];
  for (const e of readdirSync(path.join(REPO, dir))) {
    const rel = dir + "/" + e;
    if (statSync(path.join(REPO, rel)).isDirectory()) out.push(...fnFiles(rel));
    else if (/\.ts$/.test(e)) out.push(rel);
  }
  return out;
};

/** Read the product, once, into plain data. */
export function readProduct(src, files) {
  const templates = [...src.emailTemplates.matchAll(/^export function (\w+Email)\(/gm)].map((m) => m[1]);
  const pushes = [];
  const senders = new Set();
  for (const f of files) {
    if (/_shared\//.test(f.rel) || /\/send-email\//.test(f.rel)) continue;
    const folder = f.rel.split("/")[2];
    if (/sendTenantEmail\(|sendOwnerPush\(/.test(f.text)) senders.add(folder);
    for (const m of f.text.matchAll(/sendOwnerPush\(/g)) {
      const after = f.text.slice(m.index, m.index + 400);
      const line = (after.match(/title:\s*([^\n]+)/) || [])[1] ?? "";
      // a template literal contributes its text before the first `${`; otherwise
      // every string literal on the title line (a ternary has two)
      const tpl = line.trim().startsWith("`") ? (line.match(/`([^`$]*)/) || [])[1]?.trim() : null;
      const lits = tpl ? [tpl] : [...line.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
      const honors = /push_enabled/.test(f.text.slice(Math.max(0, m.index - 200), m.index));
      if (lits.length) pushes.push({ folder, lits, honors });
    }
  }
  const textLabels = [...src.templates.matchAll(/^\s*label: "([^"]+)",/gm)].map((m) => m[1]);
  const authCalls = ["resetPasswordForEmail", "signUp"].filter((c) => new RegExp("auth\\." + c + "\\(").test(src.auth));
  return { templates, pushes, senders: [...senders].sort(), textLabels, authCalls };
}

/** Matrix rows: `| **C1** | … |` → { id, cells } with cells after the id. */
export function rows(doc) {
  return [...doc.matchAll(/^\| \*\*([A-Z]\d+)\*\* \|(.*)\|\s*$/gm)].map((m) => ({
    id: m[1], cells: m[2].split("|").map((c) => c.trim()),
  }));
}
const section = (doc, n) => (doc.split(/\n## /).find((s) => s.startsWith(n + ".")) ?? "");

/** "N8 to N12" → N8..N12, "C1 to C10" → C1..C10; plain ids pass through. */
export function expand(text) {
  const ids = new Set(text.match(/\b[A-Z]\d+\b/g) ?? []);
  for (const m of text.matchAll(/\b([A-Z])(\d+) to ([A-Z])?(\d+)\b/g)) {
    for (let i = +m[2]; i <= +m[4]; i++) ids.add(m[1] + i);
  }
  return ids;
}

/** Judge one doc against one product. Pure, so the canaries can call it. */
export function judge(doc, p) {
  const out = [];
  let asked = 0;
  const rule = (name, misses, ok, extra = "") =>
    out.push({ rule: name, verdict: misses.length === 0 && ok ? "pass" : "fail",
      says: misses.length ? "missing: " + misses.join("; ") : extra });
  const has = (needle) => { asked++; return doc.includes(needle); };

  rule("doc-names-every-template", p.templates.filter((t) => !has("`" + t + "`")), p.templates.length >= 16,
    `${p.templates.length} templates read from the file`);

  const lits = p.pushes.flatMap((x) => x.lits);
  rule("doc-names-every-push-title", lits.filter((l) => !has(l)), p.pushes.length >= 10,
    `${p.pushes.length} push sites, ${lits.length} titles`);

  rule("doc-names-every-sender", p.senders.filter((s) => !has("`" + s + "`")), p.senders.length >= 15,
    `${p.senders.length} functions send mail or push`);

  rule("doc-names-every-text", p.textLabels.filter((l) => !has("*" + l + "*")), p.textLabels.length >= 5,
    `${p.textLabels.length} built-in texts`);

  rule("doc-names-every-auth-call", p.authCalls.filter((c) => !has("`" + c + "`")), p.authCalls.length === 2,
    `${p.authCalls.length} auth calls`);

  // rows: complete, and a decision from the allowed words
  const rs = rows(doc).filter((r) => WIDTH[r.id[0]]);
  const bad = [];
  for (const r of rs) {
    asked++;
    const want = WIDTH[r.id[0]];
    if (want && r.cells.length !== want - 1) { bad.push(`${r.id} has ${r.cells.length + 1} cells, expected ${want}`); continue; }
    const empty = r.cells.findIndex((c) => c === "");
    if (empty >= 0) bad.push(`${r.id} cell ${empty + 2} is empty`);
    const decision = r.cells[r.cells.length - 1];
    if (!DECISIONS.some((d) => decision.startsWith(d))) bad.push(`${r.id} decision "${decision}" is not one of ${DECISIONS.join("/")}`);
  }
  rule("every-row-is-complete", bad, rs.length >= MIN_ROWS, `${rs.length} rows (floor ${MIN_ROWS})`);

  // every non-KEEP row has an entry in § 4
  const s4 = expand(section(doc, "4").split("### What was considered")[0]);
  const unexplained = rs
    .filter((r) => !r.cells[r.cells.length - 1].startsWith("KEEP"))
    .filter((r) => { asked++; return !s4.has(r.id); })
    .map((r) => r.id);
  rule("every-change-is-explained", unexplained, rs.length >= MIN_ROWS, `${rs.filter((r) => !r.cells[r.cells.length - 1].startsWith("KEEP")).length} non-KEEP rows`);

  // the one machine-checked claim: does each push honor push_enabled?
  const wrong = [];
  let claims = 0;
  for (const r of rs.filter((x) => x.id[0] === "N")) {
    const first = (r.cells[0].match(/"([^"]+)"/) || [])[1];
    const site = p.pushes.find((x) => x.lits.some((l) => l === first || (first && first.startsWith(l.replace(/:.*$/, "")))));
    if (!site) { wrong.push(`${r.id} "${first}" matches no push in the code`); continue; }
    const says = /^\*{0,2}Yes/.test(r.cells[4]) ? true : /^\*{0,2}No/.test(r.cells[4]) ? false : null;
    claims++; asked++;
    if (says !== site.honors) wrong.push(`${r.id} says ${r.cells[4]} but the code ${site.honors ? "asks" : "does not ask"}`);
  }
  rule("push-switch-claim-is-true", wrong, claims >= 10, `${claims} claims checked against the code`);

  return { results: out, asked };
}

// ── SABOTAGE, as edits to in-memory copies ─────────────────────────────────
// Each names the ONE rule it must turn red, so a canary is "caught" only when
// that rule flips from pass to fail — never because something else was red.
export const AIMED = {
  "drop-template": "doc-names-every-template",
  "new-push": "doc-names-every-push-title",
  "blank-cell": "every-row-is-complete",
  "flip-switch": "push-switch-claim-is-true",
};
export const BREAKS = {
  "drop-template": (doc, files) => ({ doc: doc.replace(/`planCancelledEmail`/g, "`planGoneEmail`"), files }),
  "new-push": (doc, files) => ({ doc, files: files.map((f) => f.rel.endsWith("/cancel-booking/index.ts")
    ? { ...f, text: f.text + '\nawait sendOwnerPush(business.id, {\n  title: "Refund due",\n  body: "x",\n});\n' } : f) }),
  "blank-cell": (doc, files) => ({ doc: doc.replace("The evening before at 7 PM if the job starts by noon, otherwise 120 minutes before", " "), files }),
  "flip-switch": (doc, files) => ({ doc: doc.replace(/(\| \*\*N3\*\* .*?\| )\*\*No\*\*( \|)/, "$1Yes$2"), files }),
};

function main() {
  const started = new Date().toISOString();
  const brk = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
  if (brk && !BREAKS[brk]) { console.error(`unknown --break=${brk}; known: ${Object.keys(BREAKS).join(", ")}`); process.exit(2); }

  const doc0 = read(DOC);
  const src = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)]));
  const files0 = fnFiles("supabase/functions").map((rel) => ({ rel, text: read(rel) }));

  let doc = doc0, files = files0;
  if (brk) {
    ({ doc, files } = BREAKS[brk](doc0, files0));
    if (doc === doc0 && files.every((f, i) => f.text === files0[i].text)) {
      console.error(`SABOTAGE --break=${brk} did not land: its anchor is no longer in the file. Refusing to report.`);
      process.exit(2);
    }
  }
  const { results, asked } = judge(doc, readProduct(src, files));

  const canary = {};
  const verdict = (rs, name) => rs.find((r) => r.rule === name)?.verdict;
  const base = judge(doc0, readProduct(src, files0)).results;
  for (const [id, f] of Object.entries(BREAKS)) {
    const m = f(doc0, files0);
    const landed = m.doc !== doc0 || m.files.some((x, i) => x.text !== files0[i].text);
    const after = judge(m.doc, readProduct(src, m.files)).results;
    canary[id] = landed && verdict(base, AIMED[id]) === "pass" && verdict(after, AIMED[id]) === "fail";
  }
  const canaryCaught = Object.values(canary).every(Boolean);

  const failures = results.filter((r) => r.verdict === "fail");
  const unjudgeable = [
    "whether each trigger and timing sentence is true — prose; only the push-switch claim is read against the code",
    "whether the decisions are right — D3 is Andrew's, as a DECIDE row in FOR-ANDREW.md",
    "the wording of Supabase's own sign-in mail — set in its dashboard, not in this repo",
  ];
  const lines = [
    ...results.map((r) => `${r.verdict.toUpperCase().padEnd(4)} ${r.rule}${r.says ? " — " + r.says : ""}`),
    ...unjudgeable.map((u) => "UNJUDGEABLE " + u),
    `canaries: ${Object.entries(canary).map(([k, v]) => `${k}=${v ? "caught" : "MISSED"}`).join(", ")}`,
    `${results.length} rules, ${asked} assertions, ${failures.length} failed${brk ? `, BROKEN ON PURPOSE: ${brk}` : ""}`,
  ];
  console.log(lines.join("\n"));
  const art = `receipts/communication-lifecycle${brk ? ".sabotage" : ""}.txt`;
  writeFileSync(path.join(REPO, art), lines.join("\n") + "\n");

  const { path: rp, receipt } = writeReceipt({
    check_id: "communication-lifecycle",
    started_at: started,
    status: failures.length === 0 && canaryCaught ? "pass" : "fail",
    expected_targets: RULES.length,
    discovered_targets: results.length,
    attempted_targets: results.length,
    completed_targets: results.length,
    skipped_targets: 0,
    assertions_executed: asked,
    // A FLOOR well under today's count, so a rule that stops asking reddens.
    min_assertions: 60,
    failures: failures.map((r) => r.rule + ": " + r.says),
    warnings: unjudgeable.map((u) => "UNJUDGEABLE " + u),
    artifacts: [art],
    dimensions: { rules: results.length, functions_read: files0.length, break: brk || null },
    canary: { id: Object.keys(BREAKS).join(" + "), observed_failure: canaryCaught, ...canary },
  });
  console.log("\nreceipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
  process.exit(failures.length === 0 && canaryCaught ? 0 : 1);
}

main();
