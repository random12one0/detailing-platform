// ROADMAP 6.1 — PUTS THE DATE OF THE LAST PROVED RESTORE WHERE THE BACK OFFICE
// CAN SEE IT. Its "done when" asks for that date in the back office, and until
// 2026-10-10 the entry said it was "done on disk and switched off until
// launch". It was not: no line of it existed anywhere. That sentence came from
// a blanket rewrite of eleven entries on 2026-09-24.
//
//   node scripts/restore-date.mjs                    # record the last receipt, if it proves a restore
//   node scripts/restore-date.mjs --check            # say whether it would, write nothing
//   node scripts/restore-date.mjs --break=mismatch   # sabotage: a restore mismatch is planted; must refuse
//
// Needs `.env` loaded for the write (`set -a; . ./.env; set +a`); `--check`
// needs nothing.
//
// WHERE IT GOES. One upserted row in `job_heartbeats`, job `restore-drill`,
// `ran_at` = when the drill FINISHED (the receipt's date, never now()). That
// table is already sent to the back office by `platform-admin`, so the date
// reaches the screen with no new table, no column, no deploy. The screen draws
// it as its own line, not as a job — it is not one.
//
// IT MUST NEVER ALARM. `watch-jobs` emails Andrew about any row older than its
// `stale_after_seconds`, and a restore test is something a person runs, not a
// schedule. So the window is the column's maximum (about 68 years). Whether a
// restore test is getting OLD is said in words on the screen instead.
//
// WHAT COUNTS AS PROVED. Read off the receipt the drill itself wrote, never
// taken on trust from its status: the drill's status is "fail" on every run
// until Supabase holds a restore point (a paid plan), which is a fact about
// Supabase and not about whether the copy came back. So a receipt proves a
// restore when every one of these holds — and a failure this list does not
// recognise REFUSES, so a re-worded message fails safe (no date) rather than
// open (a false one).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO } from "./receipt.mjs";

export const RESTORE_JOB = "restore-drill";
export const PROJECT = "kguqylyzgyzfktkfnhjb";
// Postgres `integer` max: the row can never go stale, so it can never email.
export const NEVER_STALE = 2147483647;

// The ONLY failures that are not about the restore. Both are printed by
// `restore-drill.mjs`: the posture line (Supabase's own backups) and the
// migration-drift line (a table the repo declares and the database lacks).
const NOT_ABOUT_THE_RESTORE = [
  /^SUPABASE HOLDS NO RESTORE POINT\b/,
  /^\d+ table\(s\) the migrations declare are NOT in `public`/,
  /^\d+ table\(s\) exist in `public` that no migration declares/,
];

/** Why this receipt does NOT prove a restore. Empty means it does. */
export function whyNotProved(r) {
  const no = [];
  if (r?.check_id !== "restore-drill") no.push(`not a restore-drill receipt (${r?.check_id})`);
  if (r?.dimensions?.project !== PROJECT) no.push(`drilled project ${r?.dimensions?.project}, not ${PROJECT}`);
  if ((r?.warnings ?? []).some((w) => /^run with --break=/.test(w))) no.push("it is a sabotage run");
  if (r?.canary?.observed_failure !== true) no.push("the canary was not caught, so a match proves nothing");
  const d = r?.discovered_targets;
  if (!(d > 0) || r?.attempted_targets !== d || r?.completed_targets !== d) {
    no.push(`tables found ${d}, restored ${r?.attempted_targets}, compared ${r?.completed_targets}`);
  }
  if (r?.skipped_targets) no.push(`${r.skipped_targets} table(s) skipped`);
  if (!Date.parse(r?.finished_at ?? "")) no.push("no finish date");
  for (const f of r?.failures ?? []) {
    if (!NOT_ABOUT_THE_RESTORE.some((re) => re.test(f))) no.push(`failure: ${f.slice(0, 140)}`);
  }
  return no;
}

/** The row the back office reads. Counts come from the receipt, never typed. */
export const restoreRow = (r) => ({
  job: RESTORE_JOB,
  ran_at: r.finished_at,
  stale_after_seconds: NEVER_STALE,
  alerted_at: null,
  detail: {
    tables: r.completed_targets,
    accounts: r.dimensions?.accounts ?? null,
    files: r.dimensions?.files ?? null,
    at_commit: r.git_sha ?? null,
  },
});

export async function recordRestore(r, url, key) {
  const res = await fetch(`${url}/rest/v1/job_heartbeats?on_conflict=job`, {
    method: "POST",
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(restoreRow(r)),
  });
  if (!res.ok) throw new Error(`job_heartbeats upsert ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())[0];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const BREAK = (args.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
  const r = JSON.parse(readFileSync(join(REPO, "receipts", "restore-drill.json"), "utf8"));
  if (BREAK === "mismatch") r.failures = [...(r.failures ?? []), "restore mismatch — bookings: 12 rows, expected 13"];
  const no = whyNotProved(r);
  console.log(`receipt: restore-drill finished ${r.finished_at} at ${String(r.git_sha).slice(0, 8)}`);
  if (no.length) {
    console.log("REFUSED — this receipt does not prove a restore, so no date is recorded:");
    for (const n of no) console.log("  · " + n);
    process.exit(1);
  }
  const row = restoreRow(r);
  console.log(`proves a restore: ${row.detail.tables} tables, ${row.detail.accounts} accounts, ${row.detail.files} files`);
  if (args.includes("--check")) { console.log("--check: nothing written"); process.exit(0); }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — NOTHING WAS WRITTEN."); process.exit(2); }
  if (!url.includes(PROJECT)) { console.error(`SUPABASE_URL is not ${PROJECT} — refusing to write.`); process.exit(2); }
  const got = await recordRestore(r, url, key);
  console.log(`written: job_heartbeats.${got.job} ran_at ${got.ran_at}`);
}
