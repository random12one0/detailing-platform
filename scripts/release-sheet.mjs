// ONE RELEASE SHEET — every database change and program still to go live, in
// the order they must go. ROADMAP 97.91, 2026-10-18.
//
//   node scripts/release-sheet.mjs                     # writes docs/release-sheet.md
//   node scripts/receipt.mjs receipts/release-sheet.json
//   node scripts/release-sheet.mjs --break=drop-step   # forget 97.18's steps: must go red naming 97.18
//   node scripts/release-sheet.mjs --break=drop-line   # delete verify-domain's line from the written sheet
//
// It READS. Credential-free: it never asks the database or the server anything
// itself. Its inputs are the receipts `migration-drift.mjs` and
// `deployed-inventory.mjs` write (run those first, with credentials; both only
// read), `FOR-ANDREW.md`, `supabase/` and git. It applies nothing, deploys
// nothing, pushes nothing.
//
// WHY. FOR-ANDREW.md had thirteen "AT YOUR NEXT RELEASE" rows, each with its
// own ordering rule, and nobody had merged them, so a release meant Andrew
// reconciling thirteen notes by hand.
//
// HOW IT DECIDES THE ORDER. Programs a row needs BEFORE the database go first
// (97.13), then every unapplied database change oldest first, then the
// programs, then the website LAST — because `.githooks/pre-push` refuses the
// website push while any program is not this checkout. Every rule a row states
// is declared below as a before/after pair and then CHECKED against the order
// the written sheet actually prints, by step number, so a rule the grouping
// breaks goes red rather than reading as handled.
//
// WHAT IT CHECKS, ALL ON THE WRITTEN TEXT, NOT ON ITS OWN LIST:
//   - every migration file migration-drift names appears once, in version order
//   - every program deployed-inventory names appears once
//   - every FOR-ANDREW release row has a declaration here, every .sql file and
//     program its own text names is in that declaration, and every step it
//     declares is on the sheet tagged with its number
//   - every declared before/after rule holds
//   - the two input receipts are not older than `supabase/` (else STALE, red)
// A canary row and a canary migration are fed to the same verifier every run
// and must both be reported.
//
// BLIND SPOT, SAID HERE SO NOBODY TRUSTS A GREEN IT DID NOT EARN: migration-drift
// cannot see triggers, constraints or a data-only change, so a migration made
// only of those never reaches its list. A file a FOR-ANDREW row names is put on
// the sheet anyway, marked as such; a file nobody named and drift cannot see is
// not on the sheet at all.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !["drop-step", "drop-line"].includes(BREAK)) {
  console.error(`Unknown --break=${BREAK}. Known: drop-step, drop-line.`);
  process.exit(2);
}
const rd = (p) => readFileSync(join(REPO, p), "utf8");
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();

// ---------------------------------------------------------------------------
// THE DECLARATION: one entry per "## DO, AT YOUR NEXT RELEASE" row, keyed by
// the ROADMAP number in its heading. `before` pairs are "x must happen before
// y"; a node is a migration file, a program name, "website" or a manual id.
// `bundles` picks every not-live program whose changed files include a shared
// module, read from deployed-inventory's own per-program causes.
// ---------------------------------------------------------------------------
const M = {
  lines: "20261017000000_booking_lines_same_business.sql",
  photos: "20261017010000_photos_deadlines_same_business.sql",
  customer: "20261017020000_customer_same_business.sql",
  staff: "20261017030000_staff_cannot_delete_bookings_or_write_customers.sql",
  notes: "20261017130000_set_customer_notes_refuses_support_sessions.sql",
  campaigns: "20261017200000_campaigns_get_a_daily_share.sql",
  forget: "20261017210000_forget_customer_forgets_their_email.sql",
  reminders: "20261017220000_reminders_ignore_marketing_opt_out.sql",
  domains: "20261018010000_domain_claims_need_proof.sql",
  lock: "20261018030645_booking_day_rules_lock.sql",
  google: "20261010040000_google_business_links.sql",
};
const DECLARED = {
  "98.2": {
    functions: "all",
    before: [[M.google, "google-business"]],
    rule: "Full green waits for platform-admin (4.3c) and the Google program (99.1); both are on this sheet, and the Google program's database change comes first.",
    after: ["Have a session run the server check (`node scripts/deployed-inventory.mjs`, then `node scripts/receipt.mjs receipts/deployed-inventory.json`) and keep the receipt; 98.2 is ticked only when both pass."],
  },
  "97.7": {
    website: true, bundles: "_shared/pricing.ts",
    after: ["Optional, ten seconds on your phone: book two cars, put the second on a Saturday, and check \"Weekend rate\" sits under that car on the last step."],
  },
  "97.12": {
    migrations: [M.lines],
    functions: ["get-booking-receipt", "send-invoice", "accept-quote", "respond-to-booking", "booking-ics"],
    rule: "Either order is safe.",
  },
  "97.18": {
    migrations: [M.lock],
    functions: ["create-booking", "reschedule-booking", "update-booking"],
    before: [[M.lock, "create-booking"], [M.lock, "reschedule-booking"], [M.lock, "update-booking"]],
    rule: "The other way round, every booking fails until the database change is in.",
  },
  "97.14": {
    migrations: [M.staff, M.notes], website: true,
    before: [[M.staff, M.notes], [M.notes, "website"]],
    rule: "Both database changes and the website in ONE sitting. Only one half live: the Notes box stops saving (old website, new database) or says \"Your notes were not saved\" (new website, old database).",
  },
  "97.21": { migrations: [M.reminders], rule: "Any order." },
  "97.20": { migrations: [M.forget], rule: "Nothing to publish with it." },
  "97.19": {
    migrations: [M.campaigns], website: true, functions: ["send-email", "send-campaign"],
    before: [[M.campaigns, "send-email"], [M.campaigns, "send-campaign"]],
    rule: "Programs before the database stops promo emails until it is in. The row lists the website before the two programs; this sheet puts the website last because the push gate refuses the website while any program is not live. The hazard the row names (programs before the database) is still kept.",
  },
  "97.13": {
    migrations: [M.domains], functions: ["verify-domain"], website: true,
    before: [["verify-domain", M.domains], ["verify-domain", "website"]],
    rule: "The other way round, nobody can add a web address until the program lands.",
    after: ["The live-database test `owner-writes` turns green only once this database change is in."],
  },
  "97.72": {
    migrations: [M.customer], functions: ["send-owner-reminders", "plan-link"],
    rule: "Either order is safe.",
  },
  "97.71": { migrations: [M.photos], rule: "No program needs publishing." },
  "97.68": {
    functions: ["stripe-webhook"], manual: ["stripe-refund-event"],
    before: [["stripe-refund-event", "stripe-webhook"]],
    waitsOn: ["97.10", "97.11", "97.69"],
    rule: "Skipping the Stripe setting breaks nothing; the refund line just stays until it is on.",
  },
  "99.2a": {
    bundles: "_shared/emailKit.ts", migrations: ["20261011010000_email_sign_as_business.sql"],
    rule: "Publishing the website alone does not update emails; the programs do. Its database change only matters for the \"Sign emails with the business name\" switch; until it is in, turning that one switch on fails and everything else saves.",
    after: ["Have a session check a real booking confirmation's subject, body and plain-text copy."],
  },
};
const MANUAL = {
  "stripe-refund-event": "In Stripe: Developers, Webhooks, open the endpoint for connected accounts and add the event `charge.refunded`. While there, check `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` are on it too.",
};
if (BREAK === "drop-step") delete DECLARED["97.18"];

// ---------------------------------------------------------------------------
// INPUTS
// ---------------------------------------------------------------------------
const failures = [];
const head = git("rev-parse", "HEAD");
function loadReceipt(name, watched) {
  const r = JSON.parse(rd(`receipts/${name}.json`));
  const sab = r.dimensions?.break || r.dimensions?.sabotage || r.dimensions?.broken_on_purpose
    || (r.warnings || []).some((w) => /sabotage, not a result/.test(w));
  if (sab) failures.push(`receipts/${name}.json is a SABOTAGE run, not a result; re-run ${name}.mjs clean.`);
  if (r.canary && r.canary.observed_failure !== true) failures.push(`receipts/${name}.json did not catch its own canary, so its findings prove nothing.`);
  let moved = "";
  try { moved = git("diff", "--name-only", r.git_sha, "HEAD", "--", watched); } catch { moved = `(cannot compare: ${r.git_sha} is not in this repository)`; }
  if (moved) failures.push(`STALE: receipts/${name}.json was taken at ${String(r.git_sha).slice(0, 8)} and ${watched} has changed since (${moved.split("\n").length} file(s)). Re-run ${name}.mjs (read-only, needs credentials) and then this.`);
  return r;
}
const drift = loadReceipt("migration-drift", "supabase/migrations");
const inv = loadReceipt("deployed-inventory", "supabase/functions");

const migFiles = new Set(readdirSync(join(REPO, "supabase/migrations")).filter((f) => f.endsWith(".sql")));
const fnDirs = new Set(readdirSync(join(REPO, "supabase/functions"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name));

const SQL_RE = /\d{14}_[a-z0-9_]+\.sql/g;
const driftMigs = new Set();
for (const f of drift.failures || []) for (const m of f.matchAll(SQL_RE)) if (migFiles.has(m[0])) driftMigs.add(m[0]);
const invFns = [...new Set([...(inv.dimensions?.differing || []), ...(inv.dimensions?.not_deployed || [])])];
const notDeployed = new Set(inv.dimensions?.not_deployed || []);
const causes = inv.dimensions?.causes || {};

// FOR-ANDREW's release rows, each with its own text.
function releaseRows(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  lines.forEach((l, i) => {
    const m = /^## DO, AT YOUR NEXT RELEASE · (.*?) \(ROADMAP ([0-9][0-9.]*[a-z]*)\)\s*$/.exec(l);
    if (!m) return;
    let j = i + 1;
    while (j < lines.length && !/^## /.test(lines[j])) j++;
    rows.push({ id: m[2], title: m[1], line: i + 1, body: lines.slice(i + 1, j).join("\n") });
  });
  return rows;
}
const forAndrew = rd("FOR-ANDREW.md");
const rows = releaseRows(forAndrew);
const headingCount = (forAndrew.match(/^## DO, AT YOUR NEXT RELEASE/gm) || []).length;
if (rows.length !== headingCount) failures.push(`FOR-ANDREW.md has ${headingCount} "AT YOUR NEXT RELEASE" heading(s) but ${rows.length} parsed with a ROADMAP number; a heading has changed shape.`);
if (rows.length === 0) failures.push("ZERO release rows found in FOR-ANDREW.md: the heading parser matched nothing.");

// ROADMAP titles and box states, for naming items in plain words.
const roadmap = rd("ROADMAP.md");
const itemTitle = (id) => {
  const m = new RegExp(`^- \\[(.)\\] \\*\\*${id.replace(/\./g, "\\.")} — (.*?)\\*\\*`, "m").exec(roadmap);
  return m ? { open: m[1] === " ", title: m[2].replace(/\.$/, "").replace(/\s*\([^()]*\)$/, "") } : null;
};
// The item a migration file was built for, from the commit that added it.
const itemOfFile = (file) => {
  const subj = git("log", "--diff-filter=A", "--format=%s", "--", `supabase/migrations/${file}`).split("\n").pop() || "";
  return (/^(\d+\.\d+[a-z]*)\b/.exec(subj) || [])[1] || null;
};

// ---------------------------------------------------------------------------
// RESOLVE each row's declaration, and cross-check it against the row's text.
// ---------------------------------------------------------------------------
const need = { mig: new Map(), fn: new Map(), website: new Set(), manual: new Map() };
const add = (map, k, id) => (map.get(k) || map.set(k, new Set()).get(k)).add(id);
const rowProblems = new Map();
const problem = (row, msg) => (rowProblems.get(row.id) || rowProblems.set(row.id, []).get(row.id)).push(msg);
for (const row of rows) {
  const d = DECLARED[row.id];
  if (!d) { problem(row, "has NO step on the sheet (no declaration in scripts/release-sheet.mjs)"); continue; }
  const fns = d.functions === "all" ? invFns : [...(d.functions || [])];
  if (d.bundles) fns.push(...Object.entries(causes).filter(([, c]) => (c.shared_modules || []).includes(d.bundles) || (c.function_local || []).includes(d.bundles)).map(([n]) => n));
  for (const f of d.migrations || []) { if (!migFiles.has(f)) problem(row, `declares ${f}, which is not in supabase/migrations`); add(need.mig, f, row.id); }
  for (const f of fns) { if (!fnDirs.has(f)) problem(row, `declares program ${f}, which is not in supabase/functions`); add(need.fn, f, row.id); }
  if (d.website) need.website.add(row.id);
  for (const k of d.manual || []) add(need.manual, k, row.id);
  // What the row's own words name must be declared.
  for (const m of row.body.matchAll(SQL_RE)) if (!(d.migrations || []).includes(m[0])) problem(row, `names ${m[0]} but its declaration does not`);
  for (const m of row.body.matchAll(/`([a-z][a-z0-9-]+)`/g)) if (fnDirs.has(m[1]) && d.functions !== "all" && !fns.includes(m[1])) problem(row, `names program ${m[1]} but its declaration does not`);
  if (fns.length === 0 && !(d.migrations || []).length && !d.website && !(d.manual || []).length) problem(row, "declares nothing to do");
}
for (const id of Object.keys(DECLARED)) if (!rows.some((r) => r.id === id)) failures.push(`scripts/release-sheet.mjs declares ${id}, which has no "AT YOUR NEXT RELEASE" row in FOR-ANDREW.md any more; remove it.`);

// ---------------------------------------------------------------------------
// BUILD THE SHEET
// ---------------------------------------------------------------------------
const nodeIsFn = (n) => fnDirs.has(n);
const preFns = new Set(); // programs a rule needs before some database change
for (const d of Object.values(DECLARED)) for (const [a, b] of d.before || []) if (nodeIsFn(a) && migFiles.has(b)) preFns.add(a);
const allMigs = [...new Set([...driftMigs, ...need.mig.keys()])].sort();
const allFns = [...new Set([...invFns, ...need.fn.keys()])].filter((f) => invFns.includes(f)).sort();
const rulesFor = (node) => Object.entries(DECLARED).flatMap(([id, d]) => (d.before || []).filter(([, b]) => b === node).map(([a]) => ({ id, a })));
const tags = (set) => (set && set.size ? ` · for ${[...set].sort().join(", ")}` : "");
const migLabel = (f) => {
  const ids = new Set(need.mig.get(f) || []);
  const fromGit = itemOfFile(f); if (fromGit) ids.add(fromGit);
  return ids;
};

const steps = []; // { key, text }
const out = [];
const stepNo = new Map();
const push = (key, text) => { steps.push({ key, text }); stepNo.set(key, steps.length); out.push(`${steps.length}. ${text}`); };
const ref = (node) => (node === "website" ? "the website step" : `step ${stepNo.get(node) ?? "?"}`);

out.push("# Release sheet — everything still to go live, in order", "");
out.push(`Written by \`node scripts/release-sheet.mjs\` at \`${head.slice(0, 8)}\` from the database check taken at \`${String(drift.git_sha).slice(0, 8)}\` and the server check taken at \`${String(inv.git_sha).slice(0, 8)}\`. Do not edit by hand; re-run it.`, "");
out.push("## In plain words", "");
out.push(`This is one list for your next release, replacing thirteen separate notes. Do it top to bottom, in one sitting. **${allMigs.length} database changes** go into the live database, **${allFns.length} programs** go onto the server, and then **the website** goes out. Where an order matters, the step says so and names the step it must come after. If you stop halfway, stop at the end of a part, never in the middle of one.`, "");
out.push("Nothing here has been done for you. No session applies, publishes or pushes.", "");
out.push("Each step ends with the ROADMAP items it is for. Your own notes for each item are in your list under \"AT YOUR NEXT RELEASE\", and they stay there as the detail.", "");

out.push("## Part 1 — before the database", "");
for (const [k, ids] of [...need.manual]) push(`manual:${k}`, `${MANUAL[k]}${tags(ids)}`);
for (const f of [...preFns].sort()) push(f, `Publish the program \`${f}\` FIRST, before the database changes.${tags(need.fn.get(f))}`);
out.push("");

out.push("## Part 2 — the database changes, oldest first", "");
out.push("Apply each file from `supabase/migrations/` in this order.", "");
for (const f of allMigs) {
  const ids = migLabel(f);
  const after = rulesFor(f).map(({ a }) => `only after ${ref(a)}`);
  const unseen = driftMigs.has(f) ? "" : " (the database check cannot see this kind of change; it is listed because your note says it is not applied)";
  const named = [...ids].map((id) => { const t = itemTitle(id); return t ? `${id} (${t.title})` : id; });
  push(f, `Apply \`${f}\`${after.length ? ` — ${after.join(", ")}` : ""}${unseen}${named.length ? ` · for ${named.join("; ")}` : " · no ROADMAP item found for it"}`);
}
out.push("");

out.push("## Part 3 — the programs", "");
out.push("Publish each of these to the server. They can go in any order among themselves.", "");
for (const f of allFns) {
  if (preFns.has(f)) continue;
  const notes = [];
  const after = rulesFor(f).map(({ a }) => ((a in MANUAL) ? `after ${ref("manual:" + a)}` : `only after ${ref(a)}`));
  if (after.length) notes.push(after.join(", "));
  if (notDeployed.has(f)) notes.push("never published before");
  for (const d of Object.values(DECLARED)) if ((d.functions || []).includes(f) && d.waitsOn) {
    const open = d.waitsOn.filter((w) => itemTitle(w)?.open !== false);
    notes.push(`only once ${d.waitsOn.join(", ")} are finished, because this one program carries all of them${open.length ? ` (still open today: ${open.join(", ")})` : " (all ticked)"}`);
  }
  push(f, `Publish \`${f}\`${notes.length ? ` — ${notes.join("; ")}` : ""}${tags(need.fn.get(f))}`);
}
out.push("");

out.push("## Part 4 — the website, last", "");
push("website", `**Publish the website** (a push to main). It goes last because the push gate refuses it while any program above is not live.${tags(need.website)}`);
out.push("");

out.push("## The rules each note set, and where this sheet keeps them", "");
for (const row of rows) {
  const d = DECLARED[row.id];
  if (!d) continue;
  const kept = (d.before || []).map(([a, b]) => `${(a in MANUAL) ? "the Stripe setting" : a === "website" ? "the website" : a} (${ref((a in MANUAL) ? "manual:" + a : a)}) before ${b === "website" ? "the website" : b} (${ref(b)})`);
  out.push(`- **${row.id} — ${row.title}.** ${d.rule || "No order of its own."}${kept.length ? ` Kept: ${kept.join("; ")}.` : ""}`);
}
out.push("");

out.push("## After the release", "");
for (const row of rows) for (const a of DECLARED[row.id]?.after || []) out.push(`- ${a} · for ${row.id}`);
out.push(`- Have a session re-run the database check and the server check, then this sheet. Anything still listed did not go live.`);
out.push("");
out.push("## What this sheet cannot see", "");
out.push("The database check cannot see a change made only of triggers, constraints or data, so a file like that is on this sheet only if one of your notes names it. Each step's item comes from your notes and from the commit that added the file.", "");

let sheet = out.join("\n");
if (BREAK === "drop-line") sheet = sheet.split("\n").filter((l) => !l.includes("`verify-domain`")).join("\n");

// ---------------------------------------------------------------------------
// VERIFY THE WRITTEN TEXT
// ---------------------------------------------------------------------------
function verify(text, { migs, fns, rowList, decl }) {
  const bad = [];
  const stepLines = text.split("\n").filter((l) => /^\d+\. /.test(l));
  const lineOf = (needle) => stepLines.findIndex((l) => l.includes(needle));
  const count = (needle) => text.split(needle).length - 1;
  const positions = [];
  for (const f of migs) {
    const n = count(`\`${f}\``);
    if (n !== 1) bad.push(`database change ${f} appears ${n} time(s) on the sheet, not once`);
    else positions.push([f, lineOf(`\`${f}\``)]);
  }
  for (let i = 1; i < positions.length; i++) if (positions[i][1] < positions[i - 1][1]) bad.push(`${positions[i][0]} is listed before ${positions[i - 1][0]}; the database changes are out of version order`);
  for (const f of fns) { const n = count(`\`${f}\``); if (n !== 1) bad.push(`program ${f} appears ${n} time(s) on the sheet, not once`); }
  const nodeLine = (n) => (n === "website" ? lineOf("**Publish the website**") : (n in MANUAL) ? lineOf(MANUAL[n].slice(0, 40)) : lineOf(`\`${n}\``));
  const tagged = (i, id) => i >= 0 && new RegExp(`(?:for |; |, )${id.replace(/\./g, "\\.")}\\b`).test(stepLines[i]);
  for (const row of rowList) {
    const d = decl[row.id];
    const name = `FOR-ANDREW.md:${row.line} "${row.id} — ${row.title}"`;
    if (!d) { bad.push(`${name} is not covered by any step`); continue; }
    if (!stepLines.some((l, i) => tagged(i, row.id))) { bad.push(`${name} is not covered by any step`); continue; }
    const nodes = [...(d.migrations || []), ...(d.functions === "all" ? [] : d.functions || []).filter((f) => fns.includes(f)), ...(d.website ? ["website"] : []), ...(d.manual || [])];
    for (const n of nodes) if (!tagged(nodeLine(n), row.id)) bad.push(`${name}: its step "${n}" is not on the sheet tagged ${row.id}`);
    for (const [a, b] of d.before || []) {
      const ia = nodeLine(a), ib = nodeLine(b);
      if (ia < 0 || ib < 0 || ia >= ib) bad.push(`${name}: its rule "${a} before ${b}" does not hold on the sheet (${ia < 0 ? a + " missing" : ib < 0 ? b + " missing" : `step ${ia + 1} is not before step ${ib + 1}`})`);
    }
  }
  if (lineOf("**Publish the website**") !== stepLines.length - 1) bad.push("the website is not the last step");
  return bad;
}
const ctx = { migs: [...driftMigs].sort(), fns: invFns, rowList: rows, decl: DECLARED };
const sheetFindings = verify(sheet, ctx);
for (const [id, ps] of rowProblems) { const row = rows.find((r) => r.id === id); for (const p of ps) sheetFindings.push(`FOR-ANDREW.md:${row.line} "${row.id} — ${row.title}" ${p}`); }
failures.push(...sheetFindings);

// CANARY: an extra row and an extra migration the sheet never heard of must both be reported.
const canaryRow = { id: "0.0", title: "canary row", line: 0, body: "" };
const canaryMig = "20991231000000_canary.sql";
const canaryFindings = verify(sheet, { ...ctx, migs: [...ctx.migs, canaryMig], rowList: [...rows, canaryRow] });
const canaryCaught = canaryFindings.some((f) => f.includes('"0.0 — canary row" is not covered')) && canaryFindings.some((f) => f.includes(canaryMig));

// ---------------------------------------------------------------------------
// WRITE
// ---------------------------------------------------------------------------
const sheetPath = BREAK ? "receipts/release-sheet.sabotage.md" : "docs/release-sheet.md";
writeFileSync(join(REPO, sheetPath), sheet.replace(/\n+$/, "") + "\n");
const targets = ctx.migs.length + invFns.length + rows.length;
const missedTargets = new Set(sheetFindings.map((f) => f.split(" ")[2] || f)).size;
const ok = failures.length === 0 && canaryCaught;
const { path: receiptPath } = writeReceipt({
  check_id: "release-sheet",
  started_at,
  status: ok ? "pass" : "fail",
  expected_targets: targets,
  discovered_targets: ok ? targets : Math.max(1, targets - missedTargets),
  attempted_targets: targets,
  completed_targets: targets,
  skipped_targets: 0,
  assertions_executed: ctx.migs.length * 2 + invFns.length + rows.length * 3,
  min_assertions: 40,
  failures,
  artifacts: ["scripts/release-sheet.mjs", sheetPath],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "Reads only the migration-drift and deployed-inventory RECEIPTS; it is as current as they are, and refuses (STALE) when supabase/ changed since either was taken.",
    "migration-drift cannot see triggers, constraints or data-only migrations; such a file reaches this sheet only when a FOR-ANDREW row names it.",
  ],
  dimensions: {
    ...(BREAK ? { break: BREAK } : {}),
    head,
    drift_receipt_sha: drift.git_sha,
    inventory_receipt_sha: inv.git_sha,
    migrations_from_drift: ctx.migs,
    migrations_from_rows_only: allMigs.filter((f) => !driftMigs.has(f)),
    programs: invFns.length,
    release_rows: rows.map((r) => r.id),
    steps: steps.length,
  },
  canary: {
    id: "a release row and a migration file the sheet never heard of must both be reported",
    observed_failure: canaryCaught,
    findings: canaryFindings.filter((f) => f.includes("0.0") || f.includes(canaryMig)),
  },
});

console.log(`${rows.length} release row(s), ${ctx.migs.length} unapplied database change(s) from the drift check (+${allMigs.length - ctx.migs.length} named only by a row), ${invFns.length} program(s) not live; ${steps.length} step(s).`);
console.log(`canary ${canaryCaught ? "caught" : "NOT CAUGHT"}`);
for (const f of failures) console.log("FAIL — " + f);
console.log(`${ok ? "PASS" : "FAIL"} — sheet ${sheetPath}, receipt ${receiptPath}`);
process.exit(ok ? 0 : 1);
