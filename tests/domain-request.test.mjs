// ROADMAP 97.13 — `verify-domain`'s ADD and CHECK, driven through the real handler.
//
//   node --test tests/domain-request.test.mjs
//
// Credential-free, no network. `handleDomainRequest` (supabase/functions/_shared/domainProof.ts) is everything
// the function does after `requireMember` has answered; it is handed a fake database here (an in-memory
// `business_domains` with the column's UNIQUE on `domain`) and a fake internet. The permission rule is the
// real `can` from `_shared/permissions.ts`, not a copy.
//
// WHAT IT DOES NOT COVER: `requireMember` itself — that a caller who is not a member of `body.business_id`
// gets null (and so 401). That is the shared door every member-gated function uses, and the null → 401 half
// of it is case 4 here.
//
// Sabotage is `BREAK=body-business|no-gate` (an env var, never a flag: docs/gotchas.md 104). Each puts a defect
// into a temporary copy of domainProof.ts and the named case must go red.

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { test, after } from "node:test";
import assert from "node:assert/strict";

const SRC = "supabase/functions/_shared/domainProof.ts";
const BREAK = process.env.BREAK || "";
let modPath = SRC;
if (BREAK) {
  const orig = readFileSync(SRC, "utf8");
  const broken = {
    // the original shape of the hole: trust the business the request names
    "body-business": orig.replace(".insert({ business_id: member.businessId, domain })", ".insert({ business_id: body.business_id ?? member.businessId, domain })"),
    "no-gate": orig.replace(`if (!can(member, "settings")) return`, `if (false) return`),
  }[BREAK];
  assert.ok(broken && broken !== orig, `BREAK=${BREAK} did not apply`);
  modPath = `supabase/functions/_shared/domainProof.break-${BREAK}.tmp.ts`;
  writeFileSync(modPath, broken);
  after(() => rmSync(modPath, { force: true }));
  console.error(`  SABOTAGE ${BREAK} applied to a temporary copy: ${modPath}`);
}
const { handleDomainRequest, MARKER, PROOF_LABEL } = await import(pathToFileURL(modPath).href);

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const ownerA = { userId: "ua", businessId: A, role: "owner", permissions: [] };
const ownerB = { userId: "ub", businessId: B, role: "owner", permissions: [] };
const staffNoSettings = { userId: "us", businessId: A, role: "staff", permissions: ["money", "requests"] };
const staffSettings = { userId: "ut", businessId: A, role: "staff", permissions: ["settings"] };

// An in-memory business_domains with just the query shapes the handler issues.
function fakeDb(rows = []) {
  let n = 0;
  const db = {
    rows,
    from(table) {
      assert.equal(table, "business_domains");
      const filters = [];
      const match = (r) => filters.every(([k, v]) => r[k] === v);
      const q = {
        insert(obj) {
          return { select: () => ({ single: async () => {
            if (rows.some((r) => r.domain === obj.domain)) return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
            const row = { id: `row-${++n}`, verification_token: `${n}`.padStart(32, "c"), verified_at: null, created_at: "2026-10-17T00:00:00Z", ...obj };
            rows.push(row);
            return { data: { id: row.id, domain: row.domain, verification_token: row.verification_token, verified_at: row.verified_at, created_at: row.created_at }, error: null };
          } }) };
        },
        select() { return q; },
        eq(k, v) { filters.push([k, v]); return q; },
        async maybeSingle() { return { data: rows.find(match) ?? null, error: null }; },
        update(patch) {
          const u = { eq(k, v) { filters.push([k, v]); return u; },
            then(res) { rows.filter(match).forEach((r) => Object.assign(r, patch)); return Promise.resolve({ error: null }).then(res); } };
          return u;
        },
      };
      return q;
    },
  };
  return db;
}

// A host that reaches us and publishes `token` in its proof record.
const internet = (host, token) => async (url) => {
  const u = new URL(url);
  if (u.hostname === "cloudflare-dns.com") {
    return Response.json({ Status: 0, Answer: u.searchParams.get("name") === `${PROOF_LABEL}.${host}` ? [{ type: 16, data: `"${token}"` }] : [] });
  }
  if (u.hostname === host) return new Response(MARKER, { status: 200 });
  throw new TypeError("no such host");
};

test("1 · adding works: the row is created on the member's business, unverified, normalised, and its own code is returned", async () => {
  const db = fakeDb();
  const r = await handleDomainRequest({ business_id: A, action: "add", domain: "https://WWW.Book.Mine.test/" }, ownerA, db);
  assert.equal(r.status, 200);
  assert.equal(r.body.added.domain, "book.mine.test");
  assert.match(r.body.added.verification_token, /^[0-9a-z]{32}$/);
  assert.equal(r.body.added.verified_at, null);
  assert.deepEqual(db.rows.map((x) => [x.business_id, x.domain, x.verified_at]), [[A, "book.mine.test", null]]);
});

test("2 · a duplicate is refused with 409 \"taken\" — including one another business holds — and nothing is added", async () => {
  const db = fakeDb([{ id: "held", business_id: B, domain: "book.mine.test", verification_token: "x".repeat(32), verified_at: null }]);
  const r = await handleDomainRequest({ business_id: A, action: "add", domain: "book.mine.test" }, ownerA, db);
  assert.deepEqual([r.status, r.body.error], [409, "taken"]);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].business_id, B, "the other business's row was touched");
});

test("3 · a member without the settings permission is refused (403) and nothing is added; one WITH it may add", async () => {
  const db = fakeDb();
  const r = await handleDomainRequest({ business_id: A, action: "add", domain: "book.mine.test" }, staffNoSettings, db);
  assert.equal(r.status, 403);
  assert.equal(db.rows.length, 0, "a row was added without the settings permission");
  const ok = await handleDomainRequest({ business_id: A, action: "add", domain: "book.mine.test" }, staffSettings, db);
  assert.equal(ok.status, 200, "the settings permission should be enough");
});

test("4 · not a member of the business asked for (requireMember answered null): 401, nothing added", async () => {
  const db = fakeDb();
  const r = await handleDomainRequest({ business_id: A, action: "add", domain: "book.mine.test" }, null, db);
  assert.equal(r.status, 401);
  assert.equal(db.rows.length, 0);
});

test("5 · SECOND ACCOUNT — a member of B naming business A in the body still adds to B, never to A", async () => {
  const db = fakeDb();
  const r = await handleDomainRequest({ business_id: A, action: "add", domain: "book.mine.test" }, ownerB, db);
  assert.equal(r.status, 200);
  assert.deepEqual(db.rows.map((x) => x.business_id), [B], "the row landed on the business the body named");
});

test("6 · SECOND ACCOUNT — a member of B cannot check or stamp A's row, even when A's host serves A's code", async () => {
  const rowA = { id: "row-a", business_id: A, domain: "book.mine.test", verification_token: "a".repeat(32), verified_at: null };
  const db = fakeDb([rowA]);
  const r = await handleDomainRequest({ domain_id: "row-a" }, ownerB, db, internet("book.mine.test", rowA.verification_token));
  assert.equal(r.status, 404);
  assert.equal(rowA.verified_at, null, "B stamped A's row");
});

test("7 · added then checked: passes only when the host publishes THIS row's code", async () => {
  const db = fakeDb();
  const { body } = await handleDomainRequest({ action: "add", domain: "book.mine.test" }, ownerA, db);
  const id = body.added.id;
  const wrong = await handleDomainRequest({ domain_id: id }, ownerA, db, internet("book.mine.test", "f".repeat(32)));
  assert.equal(wrong.body.verified, false);
  assert.equal(db.rows[0].verified_at, null, "stamped on another row's code");
  const right = await handleDomainRequest({ domain_id: id }, ownerA, db, internet("book.mine.test", body.added.verification_token));
  assert.deepEqual(right.body, { verified: true, domain: "book.mine.test" });
  assert.notEqual(db.rows[0].verified_at, null, "the passing check did not stamp the row");
});
