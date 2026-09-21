// ROADMAP 3.4 finding A — the "your coating is due" email is off where git can
// see it. 2026-09-21.
//
// **WHAT THIS TEST IS, AND WHAT IT IS NOT.** It reads SOURCE. It cannot prove
// an email does not send — only a press against a real tenant can do that, and
// that press is queued. What it can do is stop the rule being quietly undone:
// the gate deleted, the default flipped, the two switches folded back into
// one, or a second sender added that never learned about the first.
//
// **AND IT IS DELIBERATELY NOT A PLAIN `includes()` SWEEP.** CLAUDE.md warns
// about a check coupled to a spelling rather than a behaviour, and a test that
// only asked "does the string appear" would pass on a gate sitting AFTER the
// send, or on a second call site nobody gated. So this asserts ORDER — the
// guard's index against the send's — and asserts the call site is unique.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");

const COLUMN = "email_customer_maintenance_due";
const SENDER = "supabase/functions/send-owner-reminders/index.ts";
const MIGRATIONS = "supabase/migrations";

test("the column is added by exactly ONE migration, and it defaults false", () => {
  const files = readdirSync(path.join(ROOT, MIGRATIONS)).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length > 0, "the check has subjects — migrations were found");

  const adding = files.filter((f) => {
    const sql = read(`${MIGRATIONS}/${f}`);
    return new RegExp(`add column[^;]*\\b${COLUMN}\\b`, "is").test(sql);
  });
  // **MIGRATIONS ARE APPEND-ONLY HERE.** Two files adding the same column
  // means somebody edited an old one or duplicated it; one means the rule was
  // added the way this repo requires.
  assert.equal(adding.length, 1, `exactly one migration adds ${COLUMN}: ${adding.join(", ")}`);

  const sql = read(`${MIGRATIONS}/${adding[0]}`);
  const decl = new RegExp(`${COLUMN}\\s+boolean\\s+not\\s+null\\s+default\\s+false`, "i");
  assert.match(sql, decl, "the column defaults FALSE in the schema");
  assert.ok(
    !new RegExp(`${COLUMN}\\s+boolean\\s+not\\s+null\\s+default\\s+true`, "i").test(sql),
    "and never true",
  );
});

test("the code fallback also defaults false — the case where no settings row exists", () => {
  // This is the one that answers for a business whose `business_settings` row
  // was never written. A `true` here would send the sales email to exactly
  // the tenants nobody has ever looked at.
  const tenant = read("supabase/functions/_shared/tenant.ts");
  assert.match(
    tenant,
    new RegExp(`${COLUMN}:\\s*false`),
    "getSettings' fallback defaults it off",
  );
  assert.ok(
    !new RegExp(`${COLUMN}:\\s*true`).test(tenant),
    "and nothing in tenant.ts defaults it on",
  );
  assert.match(tenant, new RegExp(`${COLUMN}:\\s*boolean`), "and it is declared on the type");
});

test("the send is gated, and the gate comes BEFORE it — order, not presence", () => {
  const src = read(SENDER);

  const gate = src.indexOf(`if (!settings.${COLUMN}) continue;`);
  assert.notEqual(gate, -1, "the maintenance-due switch is checked");

  const send = src.indexOf("maintenanceDueEmail(brand,");
  assert.notEqual(send, -1, "the check has a subject — the send exists");

  // The whole point. A guard after the send is not a guard.
  assert.ok(gate < send, "the switch is checked before the email is composed");

  // The parent switch still silences it: turning customer email off must stop
  // everything, including this. What it may no longer do is turn it ON.
  const parent = src.indexOf("if (!settings.email_customer_reminder) continue;");
  assert.notEqual(parent, -1, "the parent reminder switch is still checked");
  assert.ok(parent < send, "and it too comes before the send");
});

test("there is exactly ONE place that sends it — a second sender would bypass the gate", () => {
  // The failure this guards against is not someone deleting the gate; it is
  // someone adding a second call site somewhere else and never learning the
  // first one existed.
  const fns = path.join(ROOT, "supabase/functions");
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".ts")) {
        const src = readFileSync(p, "utf8");
        // The DECLARATION is not a send. `export function
        // maintenanceDueEmail(brand: TenantBrand, …)` matches a naive
        // "name followed by (brand" just as well as a call does — it is what
        // the first version of this test flagged. Excluded by shape rather
        // than by hard-coding the template file's path, so the test survives
        // that file being renamed or the template moving.
        if (/(?<!function\s)maintenanceDueEmail\s*\(\s*brand/.test(src)) {
          hits.push(path.relative(ROOT, p));
        }
      }
    }
  };
  walk(fns);
  assert.deepEqual(
    hits.map((h) => h.replace(/\\/g, "/")),
    [SENDER],
    "exactly one sender, and it is the gated one",
  );
});

test("no dashboard control writes the column — the ruling is not handed back by a toggle", () => {
  // Deliberate, and narrow: this asserts the CURRENT state, which is that
  // nothing in the product can switch this on. If Andrew later rules that a
  // detailer may enable it, this test is the thing that should be changed in
  // the same edit as the toggle — so the decision is visible rather than
  // arriving as a side effect.
  const appDir = path.join(ROOT, "app/src");
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.jsx?$/.test(e.name) && readFileSync(p, "utf8").includes(COLUMN)) {
        hits.push(path.relative(ROOT, p));
      }
    }
  };
  walk(appDir);
  assert.deepEqual(hits, [], `nothing in app/src references ${COLUMN}`);
});
