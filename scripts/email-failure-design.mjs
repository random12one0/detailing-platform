// ROADMAP 3.4e — DOES `docs/email-failure-recovery.md` STILL NAME EVERY WAY AN
// EMAIL CAN FAIL IN THIS PRODUCT, AND DOES IT QUOTE THE SCREENS CORRECTLY?
//
//   node scripts/email-failure-design.mjs
//   node scripts/email-failure-design.mjs --break=drop-state   # sabotage: the `complained` row cut from the doc
//   node scripts/email-failure-design.mjs --break=new-status   # sabotage: a status the product grew and the doc did not
//   node scripts/email-failure-design.mjs --break=sentence     # sabotage: the client record's bounced line re-worded
//   BREAK=drop-state node scripts/email-failure-design.mjs     # the same, as an env var (docs/gotchas.md 104)
//
// Credential-free, no dev server, no network: ten filesystem reads.
//
// WHY: the design page is a list of failure states written once, and a list
// written once goes stale the next time somebody adds a state — `docs/gotchas.md`
// 91. So the POPULATION is read from the code that writes each failure, never
// typed here, and the page is asked to name every member of it:
//   * the seven stored statuses — from the table's own CHECK, `emailList.js` and
//     `EmailTrail.jsx`'s MAIL_STATE, which must also agree with each other;
//   * every `record(ctx, …)` exit in `send-email`, its detail sentence, and the
//     `skipped:` / `reason:` codes the relay answers with;
//   * every event `resend-webhook` maps to a status;
//   * every function that inserts its own `email_sends` row;
//   * every function that reads `email_failed_at` to decide not to send;
//   * the sentences the page quotes off a screen, which must be verbatim;
//   * the built-in text templates, and the page's claim that none of them is
//     a booking confirmation;
//   * every state numbered in § 2 has a row in § 4's fallback table.
//
// WHAT IT CANNOT SEE: whether the design is any GOOD, and whether S1–S4 exist —
// they do not yet; building them is 3.4f. Both are printed as UNJUDGEABLE
// rather than folded into the pass.
//
// THREE CANARIES RUN EVERY TIME against in-memory copies, one per sabotage
// above, and each must turn its rule red. A `--break=` applies the same edit to
// the main run, and refuses to run if the edit did not land (docs/gotchas.md 102).

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";

// CRLF IS NORMALIZED ON READ. Half this checkout is CRLF, and the first run of
// this file had two canaries silently fail to land because their anchors ended
// in a bare newline (docs/gotchas.md 118 is the same trap from the other side).
const read = (rel) => readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

export const DOC = "docs/email-failure-recovery.md";
const FILES = {
  migration: "supabase/migrations/20260916010000_every_email_leaves_a_row.sql",
  emailList: "supabase/functions/_shared/emailList.js",
  trail: "app/src/components/EmailTrail.jsx",
  sendEmail: "supabase/functions/send-email/index.ts",
  webhook: "supabase/functions/resend-webhook/index.ts",
  maintenance: "supabase/functions/_shared/maintenance.ts",
  clients: "app/src/screens/Clients.jsx",
  templates: "app/src/lib/templates.js",
};

/** Every rule, in judging order. */
export const RULES = [
  "statuses-agree",
  "doc-names-every-status",
  "doc-draws-every-word",
  "doc-names-every-relay-exit",
  "doc-names-every-webhook-event",
  "doc-names-every-row-writer",
  "doc-names-every-suppressor",
  "doc-quotes-screens-verbatim",
  "doc-lists-every-text-template",
  "every-state-has-a-fallback",
];

// THE ONE RELAY HAS SIX EXITS THAT WRITE A ROW (two skips, one refusal, two
// failures, one send). An EQUALITY, not a floor (docs/gotchas.md 98): a seventh
// exit is a new way to fail, and it must arrive here and in the doc together.
export const EXPECTED_RECORD_SITES = 6;

const ts = (dir) => {
  const out = [];
  for (const e of readdirSync(path.join(REPO, dir))) {
    const rel = dir + "/" + e;
    if (statSync(path.join(REPO, rel)).isDirectory()) out.push(...ts(rel));
    else if (/\.(ts|js)$/.test(e)) out.push(rel);
  }
  return out;
};

/** Read the product, once, into plain data. */
export function readProduct(src, fnFiles) {
  const check = (src.migration.match(/check \(status in \(([^)]*)\)\)/) || [])[1] ?? "";
  const fromCheck = [...check.matchAll(/'(\w+)'/g)].map((m) => m[1]);
  const fromList = [...((src.emailList.match(/EMAIL_STATUSES = \[([^\]]*)\]/) || [])[1] ?? "").matchAll(/"(\w+)"/g)].map((m) => m[1]);
  const block = (src.trail.match(/export const MAIL_STATE = \{([\s\S]*?)\n\};/) || [])[1] ?? "";
  const mailState = [...block.matchAll(/^\s*(\w+): \{ word: "([^"]+)", ok: (true|false|null) \}/gm)]
    .map((m) => ({ status: m[1], word: m[2], ok: m[3] }));
  const records = [...src.sendEmail.matchAll(/record\(ctx, "(\w+)"(?:,\s*"([^"]+)")?/g)]
    .map((m) => ({ status: m[1], detail: m[2] ?? null }));
  const codes = [...src.sendEmail.matchAll(/(?:skipped|reason): "(\w+)"/g)].map((m) => m[1]);
  const outBlock = (src.webhook.match(/const OUTCOME[^{]*\{([\s\S]*?)\n\};/) || [])[1] ?? "";
  const events = [...outBlock.matchAll(/"(email\.\w+)": "(\w+)"/g)].map((m) => m[1]);
  const writers = fnFiles.filter((f) => /from\("email_sends"\)\s*\.insert/.test(f.text)).map((f) => f.rel);
  const suppressors = fnFiles
    .filter((f) => /email_failed_at/.test(f.text) && !/send-email\/|resend-webhook\//.test(f.rel))
    .map((f) => f.rel);
  const noAddress = (src.maintenance.match(/NO_ADDRESS_DETAIL =\s*"([^"]+)"/) || [])[1] ?? null;
  const bounced = (src.clients.match(/t\("(This address bounced\.[^"]+)"\)/) || [])[1] ?? null;
  const templateLabels = [...src.templates.matchAll(/^\s*label: "([^"]+)",/gm)].map((m) => m[1]);
  return { fromCheck, fromList, mailState, records, codes, events, writers, suppressors, noAddress, bounced, templateLabels };
}

/** The doc's § 2 table rows and § 4 table rows, by state id. */
const section = (doc, n) => (doc.split(/\n## /).find((s) => s.startsWith(n + ".")) ?? "");
const rowIds = (text) => [...text.matchAll(/^\| \*\*(F[\w-]+)\*\*/gm)].map((m) => m[1]);

/** Judge one doc against one product. Pure, so the canaries can call it. */
export function judge(doc, p) {
  const out = [];
  let asked = 0;
  const rule = (name, misses, ok, extra = "") => {
    out.push({ rule: name, verdict: misses.length === 0 && ok ? "pass" : "fail",
      says: misses.length ? "missing: " + misses.join("; ") : extra });
  };
  const has = (needle) => { asked++; return doc.includes(needle); };

  // 1. three sources, one list
  const keys = p.mailState.map((m) => m.status);
  const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  asked += 2;
  rule("statuses-agree", [], p.fromCheck.length >= 7 && same(p.fromCheck, p.fromList) && same(p.fromCheck, keys),
    `check=${p.fromCheck.join(",")} list=${p.fromList.join(",")} trail=${keys.join(",")}`);

  // 2. every bad status is a stored-as cell in § 2; good ones are named somewhere
  const s2 = section(doc, "2");
  const s2Cells = [...s2.matchAll(/^\| \*\*F[\w-]+\*\* \| `(\w+)`/gm)].map((m) => m[1]);
  const miss2 = [];
  for (const m of p.mailState) {
    asked++;
    if (m.ok === "false" && !s2Cells.includes(m.status)) miss2.push(`\`${m.status}\` has no row in § 2`);
    if (m.ok !== "false" && !has("`" + m.status + "`")) miss2.push(`\`${m.status}\` is never named`);
  }
  rule("doc-names-every-status", miss2, p.mailState.length >= 7, `${p.mailState.length} statuses, ${s2Cells.length} § 2 rows`);

  // 3. the word each status is drawn as
  rule("doc-draws-every-word",
    p.mailState.filter((m) => !has(`| \`${m.status}\` | ${m.word} |`)).map((m) => `${m.status} → ${m.word}`),
    p.mailState.length >= 7);

  // 4. relay exits
  const miss4 = [];
  for (const r of p.records) if (r.detail && !has(r.detail)) miss4.push(`detail "${r.detail}"`);
  for (const c of p.codes) if (!has(`"${c}"`)) miss4.push(`code "${c}"`);
  rule("doc-names-every-relay-exit", miss4, p.records.length === EXPECTED_RECORD_SITES && p.codes.length >= 3,
    `${p.records.length} record sites (declared ${EXPECTED_RECORD_SITES}), ${p.codes.length} codes`);

  // 5. webhook events
  rule("doc-names-every-webhook-event", p.events.filter((e) => !has("`" + e + "`")), p.events.length >= 4,
    `${p.events.length} events`);

  // 6. row writers, by function folder
  const fn = (rel) => rel.split("/")[2];
  rule("doc-names-every-row-writer", p.writers.filter((w) => !has(fn(w))), p.writers.length >= 2,
    `${p.writers.length} writers: ${p.writers.join(", ")}`);

  // 7. functions that withhold mail because the address is flagged
  const name = (rel) => (fn(rel) === "_shared" ? "_shared/" + path.basename(rel) : fn(rel));
  rule("doc-names-every-suppressor", p.suppressors.filter((s) => !has(name(s))), p.suppressors.length >= 2,
    `${p.suppressors.length} suppressors: ${p.suppressors.join(", ")}`);

  // 8. quoted screen sentences are verbatim
  const miss8 = [];
  if (!p.bounced || !has(p.bounced)) miss8.push("the client record's bounced line" + (p.bounced ? "" : " (not found in Clients.jsx)"));
  if (!p.noAddress || !has(p.noAddress)) miss8.push("the maintenance no-address detail");
  rule("doc-quotes-screens-verbatim", miss8, true);

  // 9. built-in texts, and the claim that none confirms a booking
  const miss9 = p.templateLabels.filter((l) => !has("*" + l + "*"));
  asked++;
  const confirmExists = p.templateLabels.some((l) => /booking confirmed|confirmed/i.test(l));
  // 3.4f built it, so the tripwire now asks the doc to stop saying it is missing.
  if (confirmExists && /There is no\s+text for/.test(doc)) miss9.push("a confirmation text now exists, so § 4's \"There is no text for 'your booking is confirmed'\" is false — update the doc");
  rule("doc-lists-every-text-template", miss9, p.templateLabels.length >= 5, `${p.templateLabels.length} templates`);

  // 10. every numbered state has a fallback row
  const s4 = section(doc, "4");
  const states = rowIds(s2);
  const fallbacks = rowIds(s4);
  asked += states.length;
  const miss10 = states.filter((id) => !fallbacks.includes(id));
  if (!fallbacks.includes("F-own")) miss10.push("F-own");
  rule("every-state-has-a-fallback", miss10, states.length >= 9, `${states.length} states, ${fallbacks.length} fallback rows`);

  return { results: out, asked };
}

// ── SABOTAGE, as edits to in-memory copies ─────────────────────────────────
// Each names the ONE rule it must turn red, so a canary is "caught" only when
// that rule flips from pass to fail — never because something else was red.
export const AIMED = { "drop-state": "doc-names-every-status", "new-status": "statuses-agree", "sentence": "doc-quotes-screens-verbatim" };
export const BREAKS = {
  "drop-state": (doc, src) => ({ doc: doc.replace(/^\| \*\*F4\*\* \| `complained`.*\n/m, ""), src }),
  "new-status": (doc, src) => ({ doc, src: { ...src,
    trail: src.trail.replace(/(export const MAIL_STATE = \{\n)/, '$1  deferred: { word: "Held back", ok: false },\n') } }),
  "sentence": (doc, src) => ({ doc, src: { ...src,
    clients: src.clients.replace("This address bounced. The last email", "This address bounced. The previous email") } }),
};

function main() {
  const started = new Date().toISOString();
  const brk = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
  if (brk && !BREAKS[brk]) { console.error(`unknown --break=${brk}; known: ${Object.keys(BREAKS).join(", ")}`); process.exit(2); }

  const doc0 = read(DOC);
  const src0 = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)]));
  const fnFiles = ts("supabase/functions").map((rel) => ({ rel, text: read(rel) }));

  let doc = doc0, src = src0;
  if (brk) {
    ({ doc, src } = BREAKS[brk](doc0, src0));
    if (doc === doc0 && JSON.stringify(src) === JSON.stringify(src0)) {
      console.error(`SABOTAGE --break=${brk} did not land: its anchor is no longer in the file. Refusing to report.`);
      process.exit(2);
    }
  }

  const { results, asked } = judge(doc, readProduct(src, fnFiles));

  // the canaries, every run, on untouched originals
  const canary = {};
  const base = judge(doc0, readProduct(src0, fnFiles)).results;
  const verdict = (rs, name) => rs.find((r) => r.rule === name)?.verdict;
  for (const [id, f] of Object.entries(BREAKS)) {
    const m = f(doc0, src0);
    const landed = m.doc !== doc0 || JSON.stringify(m.src) !== JSON.stringify(src0);
    const after = judge(m.doc, readProduct(m.src, fnFiles)).results;
    canary[id] = landed && verdict(base, AIMED[id]) === "pass" && verdict(after, AIMED[id]) === "fail";
  }
  const canaryCaught = Object.values(canary).every(Boolean);

  const failures = results.filter((r) => r.verdict === "fail");
  const unjudgeable = [
    "whether the design is right — that is Andrew's call on the three decisions in § 5",
    "S1–S4 and the Booking confirmed text on screen — not built yet; 3.4f builds and proves them",
  ];
  const lines = [
    ...results.map((r) => `${r.verdict.toUpperCase().padEnd(4)} ${r.rule}${r.says ? " — " + r.says : ""}`),
    ...unjudgeable.map((u) => "UNJUDGEABLE " + u),
    `canaries: ${Object.entries(canary).map(([k, v]) => `${k}=${v ? "caught" : "MISSED"}`).join(", ")}`,
    `${results.length} rules, ${asked} assertions, ${failures.length} failed${brk ? `, BROKEN ON PURPOSE: ${brk}` : ""}`,
  ];
  console.log(lines.join("\n"));
  const art = `receipts/email-failure-design${brk ? ".sabotage" : ""}.txt`;
  writeFileSync(path.join(REPO, art), lines.join("\n") + "\n");

  const { path: rp, receipt } = writeReceipt({
    check_id: "email-failure-design",
    started_at: started,
    status: failures.length === 0 && canaryCaught ? "pass" : "fail",
    expected_targets: RULES.length,
    discovered_targets: results.length,
    attempted_targets: results.length,
    completed_targets: results.length,
    skipped_targets: 0,
    assertions_executed: asked,
    // A FLOOR well under today's count, so a rule that stops asking reddens.
    min_assertions: 40,
    failures: failures.map((r) => r.rule + ": " + r.says),
    warnings: unjudgeable.map((u) => "UNJUDGEABLE " + u),
    artifacts: [art],
    dimensions: { rules: results.length, functions_read: fnFiles.length, break: brk || null },
    canary: { id: Object.keys(BREAKS).join(" + "), observed_failure: canaryCaught, ...canary },
  });
  console.log("\nreceipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
  process.exit(failures.length === 0 && canaryCaught ? 0 : 1);
}

main();
