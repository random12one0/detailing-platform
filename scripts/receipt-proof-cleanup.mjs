// Recover ONLY orphan attempts named by receipt-door-live's failed proof.
// node scripts/receipt-proof-cleanup.mjs receipts/receipt-door-live.json
// A PUT can land while its CORS reply is lost. Restore the check's missing
// expense temporarily, finish via the real door (which HEADs R2), remove via
// that door, then remove that marked row. Never modify an existing real expense.
// Scrub query strings from the failed browser receipt before it is retained.
import "../tests/_env.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt } from "./receipt.mjs";
const require = createRequire(import.meta.url);
const { createClient } = require("../app/node_modules/@supabase/supabase-js");
const supa = process.env.SUPABASE_URL;
if (new URL(supa).hostname !== "kguqylyzgyzfktkfnhjb.supabase.co") throw new Error("Wrong project");
const input = process.argv[2];
if (input !== "receipts/receipt-door-live.json") throw new Error("Only the local receipt proof is accepted");
if (process.argv.slice(3).some(value => value !== "--break=owner-guard")) throw new Error("Unknown cleanup option");
const broken = process.argv.includes("--break=owner-guard");
const report = JSON.parse(readFileSync(input, "utf8"));
if (report.check_id !== "receipt-door-live" || report.dimensions.base !== "http://localhost:5180") throw new Error("Unexpected proof");
const owner = createClient(supa, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: loginError } = await owner.auth.signInWithPassword(demoOwner());
if (loginError) throw loginError;
const { data: biz, error: bizError } = await owner.from("businesses").select("id").eq("slug", "demo-detail").single();
if (bizError) throw bizError;
const targets = new Map();
const ownDescription = value => broken || (typeof value === "string" && value.startsWith("0.11cc check"));
const canaryCaught = !ownDescription("real expense");
const scrub = text => text.replace(/https?:\/\/[^\s'"<>]+/g, value => {
  try {
    const u = new URL(value);
    const parts = u.pathname.split("/").filter(Boolean);
    if (u.hostname.endsWith(".r2.cloudflarestorage.com") && parts.length === 4
      && parts[0] === "expense-receipts" && parts[1] === biz.id
      && /^[0-9a-f-]{36}$/.test(parts[2]) && /^[0-9a-f-]{36}\.(jpg|png)$/.test(parts[3])) {
      targets.set(parts[2], parts[3].split(".")[0]);
    }
    return u.origin + u.pathname + (u.search ? "?[query omitted]" : "");
  } catch { return "[URL omitted]"; }
});
for (const o of report.dimensions.observations) o.console = o.console.map(scrub);
writeFileSync(input, JSON.stringify(report, null, 2) + "\n");
if (!targets.size) throw new Error("No own receipt attempts found; no cleanup claimed");
let restored = 0, removed = 0, absent = 0;
const failures = [];
const started_at = new Date().toISOString();
if (!canaryCaught) failures.push("Existing real expense guard is disabled; no writes attempted");
for (const [expenseId, fileId] of (canaryCaught ? targets : [])) {
  const old = await owner.from("expenses").select("id,description").eq("id", expenseId).maybeSingle();
  if (old.error) throw old.error;
  if (old.data && !ownDescription(old.data.description)) throw new Error("An existing expense is outside this proof");
  if (!old.data) {
    const added = await owner.from("expenses").insert({ id: expenseId, business_id: biz.id, date: "2026-10-13",
      category: "supplies", description: "0.11cc check recovery", amount: 0.01, payment_method: "unspecified" });
    if (added.error) throw added.error;
    restored++;
  }
  const door = body => owner.functions.invoke("photo-door", { body: { business_id: biz.id, store: "receipt", ...body } });
  const finish = await door({ action: "finish", expense_id: expenseId, file_id: fileId });
  if (finish.data?.expense?.receipt_path) {
    const key = finish.data.expense.receipt_path;
    const links = await door({ action: "urls", keys: [key] });
    const readUrl = links.data?.urls?.[key];
    if (links.error || !readUrl) { failures.push("Could not verify file removal " + expenseId); continue; }
    const gone = await door({ action: "remove", expense_id: expenseId });
    if (gone.error || gone.data?.removed !== true) { failures.push("Door cleanup refused; marked row retained " + expenseId); continue; }
    const missing = await fetch(readUrl); await missing.body?.cancel();
    if (missing.status !== 404) { failures.push("Receipt file remains after removal " + expenseId); continue; }
    removed++;
  } else if (finish.error?.context?.status === 409) absent++;
  else { failures.push("Could not verify receipt; marked row retained " + expenseId); continue; }
  const del = await owner.from("expenses").delete().eq("id", expenseId).select("id");
  if (del.error || del.data?.length !== 1) failures.push("Marked row cleanup failed " + expenseId);
}
const summary = { targets: targets.size, restored, removed, absent, failures };
const artifact = `receipts/receipt-proof-cleanup${broken ? ".sabotage" : ""}.txt`;
writeFileSync(artifact, JSON.stringify(summary, null, 2) + "\n");
writeReceipt({ check_id: "receipt-proof-cleanup", started_at, expected_targets: 7, discovered_targets: targets.size,
  attempted_targets: targets.size, completed_targets: removed + absent, skipped_targets: 0,
  assertions_executed: canaryCaught ? targets.size * 2 : 2, min_assertions: 1, failures, status: failures.length ? "fail" : "pass",
  artifacts: [artifact], dimensions: { ...summary, break: broken ? "owner-guard" : null }, warnings: ["Cleanup report only; no upload success or feature acceptance claimed."],
  canary: { id: "existing-real-expense-refused", observed_failure: canaryCaught } });
console.log(JSON.stringify(summary));
process.exit(failures.length ? 1 : 0);
