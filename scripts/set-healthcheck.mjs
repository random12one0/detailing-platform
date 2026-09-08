// POINT THE DEAD MAN'S SWITCH AT AN OUTSIDE WATCHER — roadmap 8.12's one
// remaining gap, and the only step in it that was ever the owner's.
//
// ---------------------------------------------------------------------------
// WHAT THIS FIXES, IN ONE SENTENCE
// ---------------------------------------------------------------------------
// `watch-jobs` runs every fifteen minutes on `pg_cron` and emails the owner
// when a scheduled job stops. **It runs on the same `pg_cron` it watches**, so
// if pg_cron stops — or the free plan pauses the project after seven quiet
// days — the alarm stops with the jobs and **the silence is identical to
// health**. Nothing inside that function can notice.
//
// So it pings an OUTSIDE service on every healthy run, and that service is what
// shouts when the pings stop. Until `platform_settings.healthcheck_url` is set,
// the back office prints *"NOTHING outside is watching the scheduler itself"* —
// which is a monitor that is switched off, correctly refusing to look like a
// monitor with nothing to report.
//
// ---------------------------------------------------------------------------
// WHY THE URL IS AN ARGUMENT AND IS NOT IN THIS REPO
// ---------------------------------------------------------------------------
// **A Healthchecks ping URL is a CAPABILITY, not an address.** Anyone holding
// it can ping it, and a ping means "everything is fine" — so a copy in a public
// repository is a way for a stranger to keep the owner's outage alarm quiet
// for ever, and he would never learn that it had stopped meaning anything.
//
// `random12one0/detailing-platform` is public. So the URL is typed at the
// command line, lands only in the database, and appears in no file, no commit
// and no log. This script prints a MASKED form back for the same reason.
//
//   node scripts/set-healthcheck.mjs https://hc-ping.com/<uuid>
//   node scripts/set-healthcheck.mjs --show     # what is set now, masked
//   node scripts/set-healthcheck.mjs --clear    # switch the watcher off
//
// Reads `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` from `.env`, like
// every other script here.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  console.error("needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF");
  process.exit(1);
}

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return []; }
}

/** Enough to recognise it, not enough to use it. */
const mask = (u) => (u
  ? String(u).replace(/([0-9a-f-]{8})[0-9a-f-]+$/i, "$1…")
  : "(not set — nothing outside is watching)");

const arg = process.argv[2];

if (!arg || arg === "--show") {
  const [row] = await q("select healthcheck_url from platform_settings limit 1");
  console.log(`healthcheck_url: ${mask(row?.healthcheck_url)}`);
  process.exit(0);
}

if (arg === "--clear") {
  await q("update platform_settings set healthcheck_url = null");
  console.log("cleared — the back office will say nothing is watching the scheduler");
  process.exit(0);
}

// **VALIDATED BEFORE IT IS STORED.** A typo here is not a broken screen, it is
// a monitor that silently never pings — the exact failure this whole feature
// exists to remove, reintroduced one level up.
if (!/^https:\/\/[A-Za-z0-9._~:/?#@!$&*+,;=%()[\]-]{3,300}$/.test(arg)) {
  console.error("that does not look like an https URL — nothing was changed");
  process.exit(1);
}

// The single-quote guard matters because this string goes into SQL text. The
// character class above already refuses one, so this is belt and braces on a
// value the owner pasted from somewhere else.
if (arg.includes("'")) {
  console.error("a URL with a quote in it is refused — nothing was changed");
  process.exit(1);
}

const [before] = await q("select healthcheck_url from platform_settings limit 1");
await q(`update platform_settings set healthcheck_url = '${arg}'`);
const [after] = await q("select healthcheck_url from platform_settings limit 1");

console.log(`was: ${mask(before?.healthcheck_url)}`);
console.log(`now: ${mask(after?.healthcheck_url)}`);
console.log(after?.healthcheck_url === arg
  ? "\nstored. The next healthy watch-jobs run pings it, within 15 minutes."
  : "\nSTORED VALUE DOES NOT MATCH WHAT WAS SENT — do not trust this.");
process.exit(after?.healthcheck_url === arg ? 0 : 1);
