// THE RESTORE DRILL — ROADMAP 6.1, and the one item on this roadmap nobody
// can fake: either the data comes back or it does not.
//
//   set -a; . ./.env; set +a
//   node scripts/restore-drill.mjs
//   node scripts/receipt.mjs receipts/restore-drill.json
//
// ---------------------------------------------------------------------------
// THE SENTENCE THIS EXISTS TO DELETE
// ---------------------------------------------------------------------------
// **Nobody knows whether this database can be restored, and the roadmap
// records that as an absence rather than as a measurement.** 6.1 says "no
// restore test, restore date, recovery target or outage history exists", which
// is a true statement about paperwork and says nothing about the data. Turning
// that absence into a date and a result — **even a bad result** — is the whole
// value here.
//
// ---------------------------------------------------------------------------
// WHAT THE PLATFORM ITSELF PROVIDES, MEASURED FIRST
// ---------------------------------------------------------------------------
// Section 1 reads the posture rather than assuming it, because the answer
// decides whether a drill of Supabase's own backups is even possible. On
// 2026-09-20 it was not: the organisation is on the **free** plan,
// `pitr_enabled` is **false**, and the backup list is **empty**. WAL archiving
// IS running — 8,399 segments, zero failures — but that is Supabase's own
// infrastructure, not a restore point a customer can reach.
//
// **SO THERE IS NOTHING OF THEIRS TO DRILL.** That is the finding, and this
// script prints it every run rather than letting it become folklore.
//
// ---------------------------------------------------------------------------
// WHAT IS DRILLED INSTEAD, AND WHAT THAT IS AND IS NOT WORTH
// ---------------------------------------------------------------------------
// A logical round trip that a person could actually perform today:
//
//   export every table in `public` to a FILE  ->  restore it into a
//   throwaway schema FROM THAT FILE  ->  compare every row back
//
// **IT PROVES:** the business's records can be taken out, written down, put
// back, and come back byte-identical — and it produces the artifact and the
// date 6.1 asks for.
//
// **IT DOES NOT PROVE** that Supabase's backups work, because there are none
// to test. It also does not cover two things a real disaster would need, and
// both are named in the procedure rather than quietly omitted:
//   * **`auth.users` is not in `public`.** 44 logins live in the `auth` schema.
//     A copy of `public` restores the business and not the ability to sign in.
//   * **Storage FILES are not in the database.** 146 objects; the rows are in
//     `storage.objects`, the bytes are in object storage.
//
// ---------------------------------------------------------------------------
// THE CANARY — THE VERIFIER MUST BE SHOWN ABLE TO SEE A BAD RESTORE
// ---------------------------------------------------------------------------
// "Every table matched" is exactly what a comparison that is looking at the
// wrong thing also says. So after the intact restore is verified, **one row in
// the restored copy is deliberately altered and the comparison is run again.**
// It must fail, and it must name that table. If it does not, the drill proved
// nothing and the receipt refuses the run.
//
// ---------------------------------------------------------------------------
// WHAT IT WRITES
// ---------------------------------------------------------------------------
// One schema, `restore_drill`, in the platform's own database
// (`kguqylyzgyzfktkfnhjb`), created and dropped inside the run. **No existing
// table is read-modified or written.** The export lands in
// `artifacts/restore-drill/` as a real file somebody could keep.

import { mkdirSync, writeFileSync, readFileSync, statSync, readdirSync } from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const KEEP = process.argv.includes("--keep");

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  console.error("SKIPPED — needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  console.error("          Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}
// This script CREATES AND DROPS A SCHEMA. CLAUDE.md § Hard rules: stop on any
// project that is not the platform's own, so the allowed ref is named in the
// file that does the writing.
// ROADMAP 6.1 gaps (2) and (3): the logins and the stored files. Both go to a
// folder OUTSIDE the repository, because what they hold is people's emails and
// photographs, and both are read back from that folder rather than trusted.
const URL_ = process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SRK) {
  console.error("SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the logins and files.");
  process.exit(1);
}
const RECOVERY = path.resolve(process.env.RECOVERY_DIR
  || path.join(os.homedir(), "detailing-platform-recovery", started_at.slice(0, 10)));
if ((RECOVERY + path.sep).toLowerCase().startsWith((path.resolve(ROOT) + path.sep).toLowerCase())) {
  console.error(`REFUSING — ${RECOVERY} is inside the repository. Logins and photos never go under git.`);
  process.exit(2);
}
const HA = { apikey: SRK, Authorization: `Bearer ${SRK}` };
const md5 = (buf) => createHash("md5").update(buf).digest("hex");

const ALLOWED = "kguqylyzgyzfktkfnhjb";
if (REF !== ALLOWED) {
  console.error(`REFUSING — this creates a schema and ${REF} is not ${ALLOWED}.`);
  process.exit(2);
}

const api = async (p) => {
  const r = await fetch(`https://api.supabase.com/v1${p}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return r.json();
};
const sql = async (text) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : [];
};

const failures = [];
const warnings = [];
const rows = [];
let assertions = 0;

// **THE EXPECTATION COMES FROM THE MIGRATIONS, NOT FROM THE DATABASE -
// 2026-09-21, Andrew's manager's ruling, correcting this file's first version
// the same day.** Until today all four target counts were `rows.length`, the
// number of STAGES this script happened to finish: a drill over the whole
// `public` schema declaring it had **2 targets**.
//
// The first fix replaced that with a constant measured off the LIVE database,
// and that was the same fault one level up: **if a table is dropped in the
// live database the count follows it down and the check cannot fail** - a gate
// following the data wearing a constant's clothes.
//
// `supabase/migrations/` is declared, append-only and in the repo, so it is
// the thing the live database is supposed to MATCH. This reads it every run
// and compares the two by NAME, not by count, so a disagreement says WHICH
// table rather than how many. Measured 2026-09-21: 53 created minus
// `monthly_plans` dropped = **52**, set-identical to live, no renames.
//
// **A PARSE THAT FINDS NOTHING IS A FAILURE, NOT AN EMPTY EXPECTATION** - that
// is how this check would go back to proving nothing.
const declaredTables = () => {
  const dir = path.join(ROOT, "supabase", "migrations");
  const created = new Set();
  const dropped = new Set();
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".sql")) continue;
    const src = readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
      created.add(m[1].toLowerCase());
    }
    for (const m of src.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
      dropped.add(m[1].toLowerCase());
    }
  }
  for (const t of dropped) created.delete(t);
  return created;
};
const DECLARED = declaredTables();
let discovered = 0;
let attempted = 0;
let completed = 0;
const say = (m) => failures.push(m);

const SCHEMA = "restore_drill";
let schemaMade = false;
const canaryDetectors = [];
let posture = {};
let fx = null;
const auth = {};
const store = {};

/** A content fingerprint of one table: row count plus an order-independent
 *  hash of every row's JSON. Two tables match only if every value matches. */
const fingerprint = async (schema, table) => {
  const r = await sql(`select count(*)::int as n,
      coalesce(md5(string_agg(h, '' order by h)), '') as h
    from (select md5(to_jsonb(t)::text) as h from ${schema}.${table} t) s`);
  return { n: r[0]?.n ?? 0, h: r[0]?.h ?? "" };
};

try {
  // -------------------------------------------------------------------------
  console.log("1 · what does the platform actually give us?");
  const org = await api(`/organizations`);
  const orgSlug = org[0]?.slug;
  const orgInfo = orgSlug ? await api(`/organizations/${orgSlug}`) : {};
  const bk = await api(`/projects/${REF}/database/backups`);
  const arch = (await sql(`select archived_count, last_archived_time, failed_count from pg_stat_archiver`))[0] ?? {};

  posture = {
    plan: orgInfo.plan ?? "unknown",
    pitr_enabled: bk.pitr_enabled === true,
    listed_backups: Array.isArray(bk.backups) ? bk.backups.length : 0,
    walg_enabled: bk.walg_enabled === true,
    wal_archived_count: Number(arch.archived_count ?? 0),
    wal_last_archived: arch.last_archived_time ?? null,
    wal_failed_count: Number(arch.failed_count ?? 0),
  };
  console.log(`    plan                 ${posture.plan}`);
  console.log(`    point-in-time recovery ${posture.pitr_enabled ? "ON" : "OFF"}`);
  console.log(`    restorable backups listed ${posture.listed_backups}`);
  console.log(`    WAL archiving        ${posture.walg_enabled ? "on" : "off"}, `
    + `${posture.wal_archived_count} segments, ${posture.wal_failed_count} failures, `
    + `last ${posture.wal_last_archived}`);

  // **THE FINDING, STATED EVERY RUN.** Not a warning that scrolls past — a
  // failure, because a product whose own platform holds no restore point is not
  // a healthy one and this check exists to say so until it is fixed.
  //
  // **AND IT SAYS WHAT IT LOOKED AT — CORRECTED 2026-09-21.** This line used to
  // read *"THERE IS NO RESTORE POINT A CUSTOMER CAN REACH... nothing the
  // platform holds would bring it back."* **That was false, and it is the exact
  // sentence `docs/recovery.md` opened with before Andrew corrected it:** a
  // nightly backup pipeline had been running the whole time in a separate
  // private repository, and this check looked only at Supabase. **A measurement
  // of one place written down as a fact about everywhere** — the same mistake,
  // in the same words, about the same subject, and hardcoded here it would have
  // repeated itself on every run for ever. The Supabase half was always
  // correct; the scope was not, and nothing in the wording admitted a scope.
  // `docs/MANAGER-CLOSE-2026-09-21.md` § 3 has the correction.
  assertions++;
  if (posture.listed_backups === 0 && !posture.pitr_enabled) {
    say(`SUPABASE HOLDS NO RESTORE POINT. Plan is "${posture.plan}", point-in-time `
      + `recovery is off and the backup list is empty. WAL archiving is running `
      + `(${posture.wal_archived_count} segments, ${posture.wal_failed_count} failures) but that `
      + `is Supabase's own infrastructure, not something Andrew can restore from. `
      + `THIS IS A FACT ABOUT SUPABASE ONLY - the restore path that does exist is `
      + `github.com/random12one0/detailing-platform-backups (private): nightly 02:10 `
      + `Pacific, pg_dump custom format, refuses a dump under 50 KB, age-encrypted, `
      + `published as a release asset, 30-day retention keeping the 1st of each month. `
      + `Its two real gaps: nobody has ever restored one, and nobody has confirmed the `
      + `age private key is where it was meant to go (Andrew's password manager). See docs/recovery.md - do not re-measure it here.`);
  }

  // -------------------------------------------------------------------------
  // ── 1b · a fixture to lose on purpose ────────────────────────────────
  // A business, its owner, a customer, a booking and a photo — created now so
  // every export below carries them, and DESTROYED in § 8 so the restore is of
  // something that was really gone. The owner has NO PASSWORD at all: the only
  // way back in is the reset link § 8 generates, which is the worst-day path.
  console.log("\n1b · a fixture business to lose and bring back");
  fx = { tag: Math.random().toString(36).slice(2, 8) };
  fx.email = `restore-fixture-${fx.tag}@fixture.test`;
  const made = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: { ...HA, "Content-Type": "application/json" },
    body: JSON.stringify({ email: fx.email, email_confirm: true }),
  }).then((r) => r.json());
  fx.userId = made?.id ?? null;
  fx.biz = (await sql(`insert into public.businesses (slug, name, timezone, contact_email, is_demo)
    values ('restore-fixture-${fx.tag}', 'Restore Fixture ${fx.tag}', 'America/Los_Angeles', '${fx.email}', true)
    returning id`))[0]?.id ?? null;
  if (fx.biz && fx.userId) {
    await sql(`insert into public.business_users (business_id, user_id, role) values ('${fx.biz}', '${fx.userId}', 'owner')`);
    const cust = (await sql(`insert into public.customers (business_id, name, phone, email)
      values ('${fx.biz}', 'Drill Customer', '5550199', 'drill-customer-${fx.tag}@fixture.test') returning id`))[0].id;
    await sql(`insert into public.bookings (business_id, customer_id, customer_name, customer_phone,
        start_at, end_at, service_type, status, total_price)
      values ('${fx.biz}', '${cust}', 'Drill Customer', '5550199',
        now() + interval '30 days', now() + interval '30 days 2 hours', 'dropoff', 'confirmed', 180)`);
    fx.photo = `${fx.biz}/restore-drill-${fx.tag}.png`;
    // A real 1x1 PNG, so "it opens" is a question with a true answer.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const up = await fetch(`${URL_}/storage/v1/object/business-media/${fx.photo}`, {
      method: "POST", headers: { ...HA, "Content-Type": "image/png" }, body: png,
    });
    if (!up.ok) fx.photo = null;
  }
  assertions++;
  if (!fx.biz || !fx.userId || !fx.photo) say("the fixture business, owner or photo could not be created, so § 8 has nothing to restore");
  else console.log(`    restore-fixture-${fx.tag}: business, owner (no password), customer, booking, photo`);

  console.log("\n2 · export — every table in public, to a file");
  const tables = (await sql(`
    select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' order by 1`)).map((r) => r.t);
  assertions++;
  // **THE SABOTAGE THAT PROVES THE EXPECTATION IS A FLOOR AND NOT A MIRROR.**
  // `--break=fewer` hides one table from the walk. If the declared count were
  // still produced by the run, this would pass silently with one table never
  // restored and never compared - which is exactly what the old
  // `expected = rows.length` did. It must now fail and name the gap.
  if (BREAK === "fewer") tables.pop();
  // `--break=none` proves the other half: that the outcome which proves NOTHING
  // now leaves a receipt behind to grade, instead of throwing past writeReceipt.
  if (BREAK === "none") tables.length = 0;
  discovered = tables.length;
  // **ZERO DISCOVERED IS A FAILURE, AND IT USED TO BE A CRASH.** `throw` here
  // skipped `writeReceipt` entirely, so the one outcome that proves nothing at
  // all left NO receipt to grade - an ungraded crash reads, to anyone looking
  // at the receipts directory, exactly like a run that never happened.
  if (!tables.length) {
    say("ZERO TABLES were discovered in `public`. Nothing was exported, nothing was "
      + "restored and nothing was proved. This is NOT a clean drill.");
  }
  // The live count is judged against the number declared at the top, so a
  // schema that gained or lost a table cannot pass quietly.
  // A parse that finds nothing would be an empty expectation nothing can fail.
  assertions++;
  // `--break=nodeclared` empties the parsed expectation, which is what a broken
  // parser or an unreadable migrations directory would produce.
  if (BREAK === "nodeclared") DECLARED.clear();
  if (DECLARED.size === 0) {
    say("THE MIGRATIONS DECLARED NO TABLES. Either `supabase/migrations/` is unreadable or "
      + "the parser stopped matching, and either way there is no expectation to judge "
      + "anything against. This is NOT a clean drill.");
  } else {
    // Compared by NAME, so a disagreement says WHICH table rather than how many.
    const live = new Set(tables.map((t) => t.toLowerCase()));
    const missing = [...DECLARED].filter((t) => !live.has(t)).sort();
    const extra = [...live].filter((t) => !DECLARED.has(t)).sort();
    if (missing.length) {
      say(`${missing.length} table(s) the migrations declare are NOT in \`public\`: `
        + `${missing.join(", ")}. The live database does not match the repo.`);
    }
    if (extra.length) {
      say(`${extra.length} table(s) exist in \`public\` that no migration declares: `
        + `${extra.join(", ")}. Either a migration is missing or something was created by hand.`);
    }
  }
  if (!tables.length) throw new Error("no tables");

  // **THE FINGERPRINT IS TAKEN AT EXPORT TIME, IN THE SAME BREATH AS THE ROWS
  // — AND THE FIRST VERSION TOOK IT AT VERIFY TIME.** That version reported
  // `bookings` and `job_heartbeats` as FAILED RESTORES, with matching row
  // counts and different content. They had not failed: `job_heartbeats` is
  // written by the cron sweeps every fifteen minutes, so the live table moved
  // between the export and the comparison. **A restore drill that compares the
  // restored copy against the LIVE source is comparing against a moving
  // target**, and it reports somebody else's write as data loss — which is the
  // most alarming possible way to be wrong.
  //
  // What was restored is the FILE. So the file is what it is checked against.
  const dump = {};
  const atExport = {};
  let total = 0;
  for (const t of tables) {
    const r = await sql(`select coalesce(json_agg(x), '[]'::json)::text as j,
        (select coalesce(md5(string_agg(h, '' order by h)), '')
           from (select md5(to_jsonb(y)::text) as h from public.${t} y) z) as fp
      from (select * from public.${t}) x`);
    const arr = JSON.parse(r[0]?.j ?? "[]");
    dump[t] = arr;
    atExport[t] = { n: arr.length, h: r[0]?.fp ?? "" };
    total += arr.length;
  }
  mkdirSync(path.join(ROOT, "artifacts", "restore-drill"), { recursive: true });
  const art = "artifacts/restore-drill/public-export.json";
  writeFileSync(path.join(ROOT, art), JSON.stringify(dump, null, 1), "utf8");
  const bytes = statSync(path.join(ROOT, art)).size;
  console.log(`    ${tables.length} tables, ${total} rows -> ${art} (${(bytes / 1024).toFixed(0)} kB)`);
  assertions++;
  if (total === 0) say("the export contains zero rows, so the restore below would compare nothing");

  // -------------------------------------------------------------------------
  console.log("\n3 · restore — from the file, into a throwaway schema");
  // **FROM THE FILE, NOT FROM THE DATABASE.** Copying table to table inside one
  // database would prove that Postgres can copy a table. The claim being
  // tested is that the written-down artifact is sufficient to rebuild the
  // business, so the file is re-read from disk and the rows come out of it.
  const onDisk = JSON.parse(readFileSync(path.join(ROOT, art), "utf8"));
  await sql(`drop schema if exists ${SCHEMA} cascade`);
  await sql(`create schema ${SCHEMA}`);
  schemaMade = true;

  let restored = 0;
  attempted = tables.length;
  const failedTables = [];
  for (const t of tables) {
    // `LIKE ... INCLUDING ALL` copies columns, types, defaults and checks —
    // and deliberately NOT foreign keys, which is what makes the restore
    // order-independent. A real recovery would rebuild them from the
    // migrations; this is testing the DATA, not the constraint graph.
    await sql(`create table ${SCHEMA}.${t} (like public.${t} including defaults including constraints)`);
    const arr = onDisk[t] ?? [];
    if (!arr.length) continue;
    for (let i = 0; i < arr.length; i += 200) {
      const chunk = arr.slice(i, i + 200);
      const tag = `rd${Date.now()}${i}`;
      try {
        await sql(`insert into ${SCHEMA}.${t}
          select * from json_populate_recordset(null::${SCHEMA}.${t}, $${tag}$${JSON.stringify(chunk)}$${tag}$)`);
      } catch (e) {
        failedTables.push(`${t}: ${String(e.message).slice(0, 120)}`);
        break;
      }
    }
    restored += arr.length;
  }
  console.log(`    restored ${restored} rows into ${SCHEMA}`
    + (failedTables.length ? `; ${failedTables.length} table(s) would not load` : ""));
  for (const f of failedTables) say(`restore: ${f}`);

  // -------------------------------------------------------------------------
  console.log("\n4 · verify — every row, compared back");
  const mismatches = [];
  const drifted = [];
  for (const t of tables) {
    const want = atExport[t];
    const got = await fingerprint(SCHEMA, t);
    assertions++;
    // COMPLETED counts the tables actually compared back, so a verify loop that
    // stops early can no longer report the same number as one that finished.
    completed++;
    if (want.n !== got.n || want.h !== got.h) {
      mismatches.push(`${t}: exported ${want.n} rows/${want.h.slice(0, 8)}, `
        + `restored ${got.n}/${got.h.slice(0, 8)}`);
    }
    // **DRIFT IS INFORMATION, NOT A FAILURE.** A live table that moved during
    // the run says nothing about whether the restore worked, and conflating
    // the two is what produced the false data-loss report. It is still worth
    // printing: a recovery procedure written against a moving database needs
    // to know which tables move.
    const live = await fingerprint("public", t);
    if (live.h !== want.h) drifted.push(`${t} (${want.n} -> ${live.n} rows)`);
  }
  for (const m of mismatches) say(`restore mismatch — ${m}`);
  if (drifted.length) {
    warnings.push(`these tables changed in the live database DURING the drill, which is normal `
      + `on a running system and is NOT a restore failure: ${drifted.join(", ")}`);
    console.log(`    (live drift during the run, not a failure: ${drifted.join(", ")})`);
  }
  rows.push({ what: "intact restore", verdict: mismatches.length ? "MISMATCH" : "every table matched",
    detail: `${tables.length} tables, ${total} rows` });
  console.log(`    ${mismatches.length === 0 ? `all ${tables.length} tables matched, ${total} rows` : `${mismatches.length} MISMATCH`}`);

  // -------------------------------------------------------------------------
  console.log("\n5 · the canary — break one row and the comparison must see it");
  // Pick the biggest table that actually has rows, so the alteration lands
  // somewhere the comparison is definitely looking.
  const victim = tables.filter((t) => (onDisk[t] ?? []).length > 0)
    .sort((x, y) => (onDisk[y].length - onDisk[x].length))[0];
  assertions++;
  if (!victim) {
    say("no restored table had any rows, so the canary could not be planted and the "
      + "verification above compared nothing");
  } else {
    const col = (await sql(`select a.attname from pg_attribute a
        join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = '${SCHEMA}' and c.relname = '${victim}'
         and a.attnum > 0 and not a.attisdropped
         and format_type(a.atttypid, null) in ('text','character varying')
       limit 1`))[0]?.attname;
    if (!col) {
      warnings.push(`canary: ${victim} has no text column to alter; the negative control was not planted`);
      say(`the canary could not be planted in ${victim} — no text column — so this run did not `
        + `demonstrate that the comparison can see a bad restore`);
    } else {
      const before = await fingerprint(SCHEMA, victim);
      if (BREAK !== "canary") {
        await sql(`update ${SCHEMA}.${victim} set ${col} = coalesce(${col}, '') || '-DRILL-CANARY'
                    where ctid = (select ctid from ${SCHEMA}.${victim} limit 1)`);
      }
      const after = await fingerprint(SCHEMA, victim);
      const src = atExport[victim];
      assertions++;
      const caught = after.h !== src.h;
      if (caught) canaryDetectors.push("row-compare");
      rows.push({ what: `canary · one row altered in ${victim}.${col}`,
        verdict: caught ? "caught (canary)" : "MISSED (canary)",
        detail: `${before.h.slice(0, 8)} -> ${after.h.slice(0, 8)}, source ${src.h.slice(0, 8)}` });
      console.log(`    altered one row of ${victim}.${col} — `
        + (caught ? "the comparison caught it" : "THE COMPARISON DID NOT SEE IT"));
    }
  }


  // ── 6 · THE LOGINS ───────────────────────────────────────────────────────
  // ANDREW'S RULING, 2026-10-06: NO PASSWORD HASH AND NO TOKEN LEAVES THE
  // DATABASE, not even to a file outside git. What comes back is the ACCOUNT —
  // id, email, created date, whether the email was confirmed, how they sign in
  // — and each person gets back in through a password-reset email. So the
  // select names its five columns and nothing else, and the file is checked
  // for anything shaped like a secret before it counts.
  console.log("\n6 · the logins — accounts and memberships, never passwords");
  mkdirSync(RECOVERY, { recursive: true });
  const ACCOUNTS = `select u.id, u.email, u.created_at, u.email_confirmed_at,
      coalesce((select array_agg(i.provider order by i.provider) from auth.identities i where i.user_id = u.id), '{}') as providers
    from auth.users u`;
  const accounts = await sql(`${ACCOUNTS} order by u.id`);
  const authFp = (await sql(`select count(*)::int as n,
      coalesce(md5(string_agg(h, '' order by h)), '') as h
    from (select md5(to_jsonb(s)::text) as h from (${ACCOUNTS}) s) z`))[0];
  const authFile = path.join(RECOVERY, "auth-accounts.json");
  writeFileSync(authFile, JSON.stringify(accounts, null, 1), "utf8");
  const authText = readFileSync(authFile, "utf8");
  auth.count = accounts.length;
  assertions++;
  const keys = [...new Set(accounts.flatMap((a) => Object.keys(a)))].sort().join(",");
  if (keys !== "created_at,email,email_confirmed_at,id,providers") say(`the account export carries columns it must not: ${keys}`);
  assertions++;
  // --break=secret-shape plants a hash-shaped string in what is SCANNED (never
  // in the file) to prove this guard can fire.
  const scanned = BREAK === "secret-shape" ? authText + ' "$2a$10$drillcanarynotarealhash"' : authText;
  if (/\$2[aby]\$|encrypted_password|_token|refresh|eyJ[A-Za-z0-9_-]{10,}/.test(scanned)) {
    say("THE ACCOUNT EXPORT CONTAINS SOMETHING SHAPED LIKE A PASSWORD HASH OR A TOKEN. It must not exist; delete " + authFile);
  }
  console.log(`    ${accounts.length} accounts -> ${authFile} (no passwords, no tokens)`);

  const onDiskAccounts = JSON.parse(authText);
  await sql(`create table ${SCHEMA}.auth_accounts (id uuid, email varchar(255), created_at timestamptz,
    email_confirmed_at timestamptz, providers text[])`);
  const tagA = `ra${Date.now()}`;
  await sql(`insert into ${SCHEMA}.auth_accounts select * from
    json_populate_recordset(null::${SCHEMA}.auth_accounts, $${tagA}$${JSON.stringify(onDiskAccounts)}$${tagA}$)`);
  const gotA = await fingerprint(SCHEMA, "auth_accounts");
  assertions++;
  if (gotA.n !== authFp.n || gotA.h !== authFp.h) {
    say(`account restore mismatch — exported ${authFp.n}/${authFp.h.slice(0, 8)}, restored ${gotA.n}/${gotA.h.slice(0, 8)}`);
  }
  // Every membership in the restored business data has an account to belong to.
  const orphans = (await sql(`select count(*)::int as n from ${SCHEMA}.business_users m
    where not exists (select 1 from ${SCHEMA}.auth_accounts a where a.id = m.user_id)`))[0]?.n;
  const members = (await sql(`select count(*)::int as n from ${SCHEMA}.business_users`))[0]?.n;
  assertions++;
  if (orphans !== 0) say(`${orphans} restored membership(s) point at an account the restore does not have`);
  auth.memberships = members;
  rows.push({ what: "logins", verdict: gotA.h === authFp.h && orphans === 0 ? "accounts and memberships matched" : "MISMATCH",
    detail: `${accounts.length} accounts, ${members} memberships, ${orphans} orphaned` });
  console.log(`    restored ${gotA.n} accounts; ${members} memberships, ${orphans} without an account`);
  // canary: change one restored email; the comparison must notice.
  if (BREAK !== "canary") {
    await sql(`update ${SCHEMA}.auth_accounts set email = email || '.canary' where id = (select id from ${SCHEMA}.auth_accounts limit 1)`);
  }
  assertions++;
  if ((await fingerprint(SCHEMA, "auth_accounts")).h !== authFp.h) canaryDetectors.push("account-compare");

  // ── 7 · THE FILES ────────────────────────────────────────────────────────
  // Every object in every bucket, downloaded to disk, then judged OFF DISK:
  // the size storage reports, the MD5 storage reports as its eTag, and the
  // first bytes of a real PNG or JPEG. "Opens" means it is the kind of file it
  // says it is and every byte is the byte that was stored.
  console.log("\n7 · the files — every stored object, to disk, checked");
  const objs = await sql(`select bucket_id as b, name as n, metadata->>'size' as size,
      metadata->>'mimetype' as mime, metadata->>'eTag' as etag from storage.objects order by 1, 2`);
  const opens = (buf, o) => {
    const p = [];
    if (o.size != null && buf.length !== Number(o.size)) p.push(`size ${buf.length}, storage says ${o.size}`);
    const tagMd5 = String(o.etag || "").replace(/"/g, "");
    if (/^[0-9a-f]{32}$/.test(tagMd5) && md5(buf) !== tagMd5) p.push("bytes differ from the checksum storage holds");
    const head = buf.subarray(0, 12);
    const kind = head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? "image/png"
      : head.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? "image/jpeg"
      : head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP" ? "image/webp"
      : head.subarray(0, 4).toString() === "%PDF" ? "application/pdf" : null;
    if (/^image\/(png|jpeg|webp)$|pdf$/.test(o.mime || "") && kind !== o.mime) p.push(`does not open as ${o.mime} (looks like ${kind ?? "nothing known"})`);
    return p;
  };
  const manifest = [];
  const bad = [];
  let firstGood = null;
  for (const o of objs) {
    const r = await fetch(`${URL_}/storage/v1/object/authenticated/${o.b}/${o.n.split("/").map(encodeURIComponent).join("/")}`, { headers: HA });
    const buf = Buffer.from(await r.arrayBuffer());
    const file = path.join(RECOVERY, "storage", o.b, ...o.n.split("/"));
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, buf);
    const back = readFileSync(file);
    const p = r.ok ? opens(back, o) : [`download refused ${r.status}`];
    assertions++;
    if (p.length) bad.push(`${o.b}/${o.n}: ${p.join("; ")}`);
    else firstGood ??= { buf: back, o };
    manifest.push({ bucket: o.b, name: o.n, size: back.length, mime: o.mime, md5: md5(back) });
  }
  writeFileSync(path.join(RECOVERY, "storage-manifest.json"), JSON.stringify(manifest, null, 1), "utf8");
  store.count = objs.length;
  store.bytes = manifest.reduce((a, m) => a + m.size, 0);
  assertions++;
  if (!objs.length) say("storage.objects is empty, so no file was downloaded or checked");
  for (const b of bad) say(`file — ${b}`);
  rows.push({ what: "stored files", verdict: bad.length ? `${bad.length} BAD` : "every file opened and matched",
    detail: `${objs.length} files, ${store.bytes} bytes` });
  console.log(`    ${objs.length - bad.length} of ${objs.length} files downloaded, opened and matched (${store.bytes} bytes) -> ${path.join(RECOVERY, "storage")}`);
  // canary: one flipped byte in a copy must fail the same judgement.
  if (firstGood) {
    const copy = Buffer.from(firstGood.buf);
    if (BREAK !== "canary") copy[copy.length - 1] ^= 0xff;
    assertions++;
    if (opens(copy, firstGood.o).length) canaryDetectors.push("file-check");
  }

  // ── 8 · THE WORST DAY, ON ONE BUSINESS ────────────────────────────────────
  // Destroy the fixture — rows, login and photo — then put it back from the
  // three things on disk and nothing else: the public export, the account
  // file and the downloaded photo. Then ask the only question that matters to
  // the person who owns it: can they get back in?
  console.log("\n8 · lose the fixture business, then bring it back from disk");
  if (fx?.biz && fx?.userId && fx?.photo) {
    const withBiz = (await sql(`select c.table_name as t from information_schema.columns c
        join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name
       where c.table_schema = 'public' and c.column_name = 'business_id' and x.table_type = 'BASE TABLE'`)).map((r) => r.t);
    const scope = (t) => t === "businesses" ? `id = '${fx.biz}'` : `business_id = '${fx.biz}'`;
    const fxTables = ["businesses", ...withBiz.filter((t) => tables.includes(t))];
    const fpOf = async (t, schema = "public") => (await sql(`select count(*)::int as n, coalesce(md5(string_agg(h, '' order by h)), '') as h
      from (select md5(to_jsonb(y)::text) as h from ${schema}.${t} y where ${scope(t)}) z`))[0];
    // "BEFORE" IS WHAT THE EXPORT HOLDS, NOT THE LIVE ROWS. A cron job wrote an
    // `owner_daily_digest_state` row for the fixture between the export and the
    // disaster (measured 2026-10-06), and no restore can return a row its
    // backup never had — the same is true on the real worst day. So the
    // restore is judged against the throwaway copy (proved identical to the
    // export in § 4), and anything written later is reported, not failed.
    const before = {};
    const late = [];
    for (const t of fxTables) {
      before[t] = await fpOf(t, SCHEMA);
      const live = await fpOf(t);
      if (live.h !== before[t].h) late.push(`${t} (${before[t].n} in the export, ${live.n} live)`);
    }
    if (late.length) {
      warnings.push(`written for the fixture AFTER the export, so not in it and not restored — as on a real worst day: ${late.join(", ")}`);
      console.log(`    (written after the export, so lost by any restore: ${late.join(", ")})`);
    }
    const acctBefore = (await sql(`${ACCOUNTS} where u.id = '${fx.userId}'`))[0];

    // CONTROL: the same reset-link call for the same owner BEFORE anything is
    // lost, so a failure after the restore is the restore's and not the call's.
    const resetLink = async () => {
      const r = await fetch(`${URL_}/auth/v1/admin/generate_link`, {
        method: "POST", headers: { ...HA, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "recovery", email: fx.email }),
      });
      const j = await r.json().catch(() => ({}));
      const l = j?.action_link ?? j?.properties?.action_link ?? "";
      // A live credential: judged for shape and dropped, never printed or kept.
      return { status: r.status, ok: r.ok && typeof l === "string" && /type=recovery/.test(l) };
    };
    const control = await resetLink();
    assertions++;
    if (!control.ok) say(`CONTROL: a reset link could not be generated even BEFORE the disaster (${control.status}), so the check below means nothing`);

    // THE DISASTER — the photo, the business (its rows cascade) and the login.
    await fetch(`${URL_}/storage/v1/object/business-media/${fx.photo}`, { method: "DELETE", headers: HA });
    await sql(`delete from public.businesses where id = '${fx.biz}'`);
    await fetch(`${URL_}/auth/v1/admin/users/${fx.userId}`, { method: "DELETE", headers: HA });
    const gone = (await sql(`select (select count(*) from public.businesses where id = '${fx.biz}')
        + (select count(*) from auth.users where id = '${fx.userId}')
        + (select count(*) from storage.objects where bucket_id = 'business-media' and name = '${fx.photo}') as n`))[0].n;
    assertions++;
    if (Number(gone) !== 0) say(`the fixture was not fully destroyed (${gone} pieces left), so the restore below proves less than it says`);
    console.log(`    destroyed: business and its rows, the owner's login, the photo`);

    // THE RESTORE — from disk only. Triggers and foreign-key checks are paused
    // for the one transaction, as pg_restore --disable-triggers does, so rows
    // go back exactly as exported rather than as a trigger would rewrite them.
    const acct = onDiskAccounts.find((a) => a.id === fx.userId);
    const lit = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
    const providers = (Array.isArray(acct?.providers) ? acct.providers
      : String(acct?.providers ?? "").replace(/[{}]/g, "").split(",").filter(Boolean));
    if (!providers.length) providers.push("email");
    let tx = `begin; set local session_replication_role = replica;
      -- The six text columns below are EMPTY STRINGS, not values: the sign-in
      -- service reads them as strings and answers 500 to a reset request when
      -- they are null (measured on the first run of this section). No
      -- password is written; encrypted_password stays null, so a reset is the
      -- only way in, which is the point.
      insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change,
          email_change_token_new, email_change_token_current, reauthentication_token)
        values ('00000000-0000-0000-0000-000000000000', ${lit(acct?.id)}, 'authenticated', 'authenticated',
          ${lit(acct?.email)}, ${lit(acct?.email_confirmed_at)}, ${lit(acct?.created_at)}, now(),
          ${lit(JSON.stringify({ provider: providers[0], providers }))}::jsonb, '{}'::jsonb, '', '', '', '', '', '');
      insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
        values (${lit(acct?.id)}, ${lit(acct?.id)},
          ${lit(JSON.stringify({ sub: acct?.id, email: acct?.email, email_verified: true }))}::jsonb, 'email', now(), now());`;
    for (const t of fxTables) {
      const mine = (onDisk[t] ?? []).filter((r) => (t === "businesses" ? r.id : r.business_id) === fx.biz);
      if (!mine.length) continue;
      // --break=fixture-rows leaves the bookings out, and the comparison
      // against the export must say so.
      if (BREAK === "fixture-rows" && t === "bookings") continue;
      const tg = `fx${t.replace(/_/g, "")}`;
      tx += `\n insert into public.${t} select * from json_populate_recordset(null::public.${t}, $${tg}$${JSON.stringify(mine)}$${tg}$);`;
    }
    await sql(tx + "\ncommit;");
    if (BREAK !== "fixture-photo") {
      await fetch(`${URL_}/storage/v1/object/business-media/${fx.photo}`, {
        method: "POST", headers: { ...HA, "Content-Type": "image/png" },
        body: readFileSync(path.join(RECOVERY, "storage", "business-media", ...fx.photo.split("/"))),
      });
    }

    // THE COMPARISON.
    const diff = [];
    for (const t of fxTables) {
      const now = await fpOf(t);
      if (now.n !== before[t].n || now.h !== before[t].h) diff.push(`${t} (${before[t].n} rows before, ${now.n} after)`);
    }
    assertions++;
    if (diff.length) say(`the fixture business did not come back identical: ${diff.join(", ")}`);
    const acctAfter = (await sql(`${ACCOUNTS} where u.id = '${fx.userId}'`))[0];
    assertions++;
    if (JSON.stringify(acctAfter) !== JSON.stringify(acctBefore)) {
      say(`the owner's account came back different — before ${JSON.stringify(acctBefore)}, after ${JSON.stringify(acctAfter)}`);
    }
    const member = (await sql(`select role from public.business_users where business_id = '${fx.biz}' and user_id = '${fx.userId}'`))[0];
    assertions++;
    if (member?.role !== "owner") say("the owner's membership did not come back");
    const photo = await fetch(`${URL_}/storage/v1/object/authenticated/business-media/${fx.photo}`, { headers: HA });
    const photoBuf = Buffer.from(await photo.arrayBuffer());
    const photoMeta = manifest.find((m) => m.bucket === "business-media" && m.name === fx.photo);
    assertions++;
    const photoOk = photo.ok && photoMeta && md5(photoBuf) === photoMeta.md5
      && opens(photoBuf, { mime: "image/png", size: photoMeta.size }).length === 0;
    if (!photoOk) say(`the fixture's photo did not come back (${photo.status}), so a restored row points at nothing`);

    // CAN THEY GET BACK IN? A reset link is GENERATED and not sent: the admin
    // endpoint returns it without mailing anybody. It is a live credential,
    // so it is checked for shape and dropped — never printed, never written.
    const link = await resetLink();
    const linkOk = link.ok;
    assertions++;
    if (!linkOk) say(`a password-reset link could NOT be generated for the restored owner (${link.status}) — the account is back and nobody can get into it`);
    rows.push({ what: "fixture lost and restored from disk",
      verdict: !diff.length && JSON.stringify(acctAfter) === JSON.stringify(acctBefore) && member?.role === "owner" && photoOk && linkOk
        ? "business, login, membership and photo back; reset link generates" : "INCOMPLETE",
      detail: `${fxTables.filter((t) => before[t].n).length} tables with rows; reset link ${linkOk ? "generated and discarded, not sent" : "FAILED"}` });
    console.log(`    business ${diff.length ? "DIFFERS" : "identical"} · account ${JSON.stringify(acctAfter) === JSON.stringify(acctBefore) ? "identical (id, email, created date)" : "DIFFERS"}`
      + ` · membership ${member?.role === "owner" ? "back" : "MISSING"} · photo ${photoOk ? "opens, same bytes" : "MISSING"}`
      + ` · reset link ${linkOk ? "generated (not sent, not kept)" : "FAILED"}`);
  }
} catch (e) {
  // **A CRASH USED TO LEAVE NO RECEIPT AT ALL.** The only `try` here had a
  // `finally` and no `catch`, so any throw - including the deliberate one for
  // zero tables - killed the process before `writeReceipt`, and the outcome
  // that proves least left nothing behind to grade. Now it is recorded and the
  // receipt is still written, with the counts as far as the run actually got.
  say(`THE DRILL DID NOT FINISH: ${e.message}. The counts below are how far it got, `
    + `not a result.`);
} finally {
  if (fx?.photo) await fetch(`${URL_}/storage/v1/object/business-media/${fx.photo}`, { method: "DELETE", headers: HA }).catch(() => {});
  if (fx?.biz) await sql(`delete from public.businesses where id = '${fx.biz}'`).catch((e) => say("could not delete the fixture business: " + e.message));
  if (fx?.userId) {
    await fetch(`${URL_}/auth/v1/admin/users/${fx.userId}`, { method: "DELETE", headers: HA }).catch(() => {});
    // THE ADMIN DELETE CAN FAIL QUIETLY on an account this drill restored by
    // hand — it did on 2026-10-06, before the empty-string columns, and left a
    // login behind for the next run to count. So: delete directly, then prove
    // nothing of the fixture is left.
    await sql(`delete from auth.users where id = '${fx.userId}'`).catch(() => {});
    const left = (await sql(`select (select count(*) from auth.users where id = '${fx.userId}')
        + (select count(*) from public.businesses where id = '${fx.biz ?? fx.userId}') as n`).catch(() => [{ n: -1 }]))[0].n;
    assertions++;
    if (Number(left) !== 0) say(`the fixture was not cleaned up (${left} piece(s) left) — delete restore-fixture-${fx.tag} by hand`);
  }
  if (schemaMade && !KEEP) {
    await sql(`drop schema if exists ${SCHEMA} cascade`).catch((e) =>
      say("could not drop the drill schema: " + e.message));
  }
}

// ---------------------------------------------------------------------------

const canary = {
  id: "one row altered in the restored copy · the row comparison must see it",
  // ALL THREE must see their planted defect: a row, an account, a file byte.
  observed_failure: ["row-compare", "account-compare", "file-check"].every((d) => canaryDetectors.includes(d)),
  caught_by: canaryDetectors,
  findings: canaryDetectors.includes("row-compare")
    ? ["[row-compare] altering a single text value in one restored row changed that table's "
      + "fingerprint, so 'every table matched' above is a comparison that can fail"]
    : ["[row-compare] NOT CAUGHT — the comparison did not notice an altered row, so it cannot "
      + "tell a good restore from a bad one and every match above is void"],
  detectors_required: ["row-compare", "account-compare", "file-check"],
};

const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path: receiptPath } = writeReceipt({
  check_id: "restore-drill",
  started_at,
  status,
  // Four numbers from four different places, so they can disagree - which is
  // the whole point of the receipt rule that they must agree.
  expected_targets: DECLARED.size,    // from supabase/migrations/, not from the database
  discovered_targets: discovered,     // what `public` actually holds
  attempted_targets: attempted,       // tables we tried to restore
  completed_targets: completed,       // tables compared back
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 40,
  failures,
  artifacts: ["artifacts/restore-drill/public-export.json"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "THIS DRILLS A LOGICAL ROUND TRIP, NOT SUPABASE'S BACKUPS — there are none to test. "
    + "Since 2026-10-06 it carries the logins as ACCOUNTS (no password, no token — people "
    + "get back in by a reset email) and the stored files as bytes, both to a folder "
    + "outside the repository. It does not restore the nightly encrypted dump. See docs/recovery.md.",
    ...warnings,
  ],
  dimensions: {
    project: REF, posture, schema: SCHEMA,
    recovery_dir: path.relative(os.homedir(), RECOVERY).split(path.sep).join("/") + " (under the home folder, outside git)",
    accounts: auth.count ?? null, memberships: auth.memberships ?? null,
    files: store.count ?? null, file_bytes: store.bytes ?? null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failure(s). `
  + `Receipt ${receiptPath}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
