// ROADMAP 97.40 - the import's REAL paths, run against a fake database.
//
// `tests/customer-import.test.mjs` pins the screen's parse/preview. This file
// runs the exact code the edge handler runs - `existingKeys`, `classify`,
// `commitImportBatch`, `undoImportBatch`, `toImportRows` from
// `supabase/functions/_shared/importRules.ts`, imported directly (node strips
// the types) - against an in-memory fake shaped like the Supabase client.
//
//   node --test tests/customer-import-edge.test.mjs   (credential-free)
//
// WHAT IT PROVES: preview and commit re-validate against ALL existing
// customers (2,500 of them, read in stable `id`-ordered pages with no misses,
// matching past row 1,000); a +1 country-code number matches its bare twin;
// commit saves exactly the valid rows flagged imported under one batch; a
// duplicate is reported and not inserted; undo removes exactly its batch
// while a same-batch flagged fixture and every other sentinel survive;
// repeat and unknown undos remove nothing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
// BREAK=no-guard | no-order | no-prefix-strip | no-email-half | no-member | no-lock: read the shared
// rules, apply the named mutation IN MEMORY and load the result from a data: URL,
// so the suite itself goes red and proves the guard matters. Nothing is written
// to disk (the belt refuses a test that writes files). The module has no runtime
// imports, so it loads the same from memory. Without BREAK the real file is tested.
const BREAK = process.env.BREAK || "";
const loadRules = async () => {
  const real = new URL("../supabase/functions/_shared/importRules.ts", import.meta.url);
  if (!BREAK) return import(real.href);
  const MUTATIONS = {
    "no-guard": ['.eq("is_test", false)', ""],
    "no-order": ['.order("id")', ""],
    "no-prefix-strip": ['return d.length === 11 && d[0] === "1" ? d.slice(1) : d;', "return d;"],
    "no-member": ["if (!member) return json({ error: \"not_found\" }, 404);", ""],
    "no-lock": ["return withImportLock(db, businessId, async () => {", "return ((_d, _b, fn) => fn())(db, businessId, async () => {"],
    "no-email-half": ["if ((p && seenPhones.has(p)) || (e && seenEmails.has(e)) || seenNames.has(fileKey)) {", "if ((p && seenPhones.has(p)) || seenNames.has(fileKey)) {"],
  };
  if (!MUTATIONS[BREAK]) throw new Error("unknown BREAK " + BREAK);
  const src = readFileSync(real, "utf8");
  const [from, to] = MUTATIONS[BREAK];
  if (!src.includes(from)) throw new Error("BREAK mutation did not apply");
  const js = stripTypeScriptTypes(src.replace(from, to));
  return import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
};
const { classify, commitImportBatch, existingKeys, handleImportRequest, LOCK_STALE_MS, toImportRows, undoImportBatch } = await loadRules();
import { parseImportCsv, toImportInput } from "../app/src/lib/customer-import.js";

const SAMPLE = readFileSync("app/public/sample-customer-import.csv", "utf8");
const HEADERS = ["name", "phone", "email", "address", "vehicle", "notes"];
// The screen's own mapping (`toImportInput`), so these handler cases receive
// exactly what Clients sends.
const sampleInput = () => toImportInput(parseImportCsv(SAMPLE));
test("the screen's row mapping: six columns per record, null when Name or Phone is missing", () => {
  const input = sampleInput();
  assert.equal(input.length, 20);
  assert.deepEqual(Object.keys(input[0]), HEADERS);
  assert.equal(input[0].vehicle, "Honda Civic");
  assert.equal(toImportInput(parseImportCsv("Name,Email\nA,a@x.test\n")), null);
});

// In-memory stand-in for the Supabase client: only the chained calls the
// shared module makes, with the same request/response shapes.
class FakeQuery {
  constructor(state, table) {
    this.state = state;
    this.table = table;
    this.filters = [];
    this.ordered = null;
    this.from = 0;
    this.to = Infinity;
    this.mode = "select";
    this.payload = null;
  }
  select() { if (this.mode === "delete") this.mode = "deleteSelect"; return this; }
  delete() { this.mode = "delete"; return this; }
  insert(rows) { this.mode = "insert"; this.payload = rows; return this; }
  eq(col, val) { this.filters.push([col, val]); return this; }
  lt(col, val) { this.below = [col, val]; return this; }
  order(col) { this.state.orderCalls.push(col); this.ordered = col; return this; }
  range(from, to) { this.from = from; this.to = to; return this; }
  then(resolve, reject) {
    try {
      if (this.table === "customer_import_locks") {
        // Primary key on business_id: a second claim answers 23505, like Postgres.
        const L = this.state.locks;
        const match = (l) => this.filters.every(([c, v]) => l[c] === v) && (!this.below || l[this.below[0]] < this.below[1]);
        if (this.mode === "insert") {
          if (L.some((l) => l.business_id === this.payload.business_id)) return resolve({ data: null, error: { code: "23505" } });
          L.push({ locked_at: new Date().toISOString(), ...this.payload });
          return resolve({ data: null, error: null });
        }
        if (this.mode === "delete" || this.mode === "deleteSelect") { this.state.locks = L.filter((l) => !match(l)); return resolve({ data: [], error: null }); }
      }
      if (this.table !== "customers") throw new Error("unexpected table " + this.table);
      const hit = (row) => this.filters.every(([c, v]) => row[c] === v);
      if (this.mode === "insert") {
        // The real columns are NOT NULL DEFAULT false: rows inserted without
        // those flags read them back as false, never undefined.
        for (const r of this.payload) this.state.rows.push({ id: `id-new-${this.state.rows.length}`, is_test: false, imported: false, ...r });
        resolve({ data: null, error: null });
        return;
      }
      if (this.mode === "delete" || this.mode === "deleteSelect") {
        const gone = this.state.rows.filter(hit);
        const ids = new Set(gone.map((r) => r.id));
        this.state.rows = this.state.rows.filter((r) => !ids.has(r.id));
        resolve({ data: gone.map((r) => ({ id: r.id })), error: null });
        return;
      }
      let rows = this.state.rows.filter(hit);
      if (this.ordered) rows = [...rows].sort((a, b) => (a[this.ordered] < b[this.ordered] ? -1 : 1));
      resolve({ data: rows.slice(this.from, this.to + 1), error: null });
    } catch (e) { reject(e); }
  }
}

const makeDb = (seed = []) => {
  const state = { rows: [], orderCalls: [], locks: [] };
  seed.forEach((r, i) => state.rows.push({ id: `id-${String(i).padStart(6, "0")}`, ...r }));
  return { state, from: (table) => new FakeQuery(state, table) };
};

const bigSeed = (n, businessId) => {
  const seed = [];
  for (let i = 0; i < n; i++) {
    seed.push({
      business_id: businessId, name: `C${i}`, phone: String(5550000000 + i),
      email: `u${i}@x.test`, imported: false, import_batch_id: null, is_test: false,
    });
  }
  return seed;
};

// 1. Every existing customer is read, in stable unique-key order.
test("existing customers are all read in stable id order", async () => {
  const db = makeDb(bigSeed(2500, "biz"));
  const keys = await existingKeys(db, "biz");
  assert.ok(db.state.orderCalls.length >= 3);
  assert.ok(db.state.orderCalls.every((c) => c === "id"));
  assert.equal(keys.size, 5000);
  assert.ok(keys.has(`p:${String(5550000000 + 1500)}`));
  assert.ok(keys.has("e:u1999@x.test"));
});

// 2. A twin past the first 1,000 rows is still caught, on phone or on email.
test("a phone or email past row 1,000 still blocks its twin", async () => {
  const db = makeDb(bigSeed(2500, "biz"));
  const res = await commitImportBatch(db, "biz", [
    { name: "Twin", phone: `+1${String(5550000000 + 1500)}`, email: "twin@new.test" },
    { name: "Mail Twin", phone: "5559998888", email: "U1999@X.TEST" },
    { name: "Fresh", phone: "5551112222", email: "fresh@x.test" },
  ]);
  assert.equal(res.created, 1);
  assert.equal(res.duplicates.length, 2);
  assert.ok(res.duplicates.some((d) => d.name === "Twin" && d.reason === "Already a customer"));
  assert.ok(res.duplicates.some((d) => d.name === "Mail Twin" && d.reason === "Already a customer"));
  assert.ok(db.state.rows.some((r) => r.name === "Fresh" && r.imported === true));
  assert.ok(!db.state.rows.some((r) => r.name === "Twin" || r.name === "Mail Twin"));
});

// 3. The sample commits exactly the valid rows, flagged, under one batch.
test("the sample commits 17 flagged customers under one batch", async () => {
  const db = makeDb([{ business_id: "other", name: "Other", phone: "555-0100", email: null, is_test: false }]);
  const res = await commitImportBatch(db, "biz", sampleInput());
  assert.equal(res.created, 17);
  assert.ok(typeof res.batch_id === "string" && res.batch_id.length > 0);
  assert.equal(res.duplicates.length, 2);
  assert.deepEqual(res.duplicates.map((d) => d.name), ["Tom Twin", "Zoe Copy"]);
  assert.equal(res.bad.length, 1);
  assert.equal(res.bad[0].name, "No Phone");
  const saved = db.state.rows.filter((r) => r.business_id === "biz");
  assert.equal(saved.length, 17);
  assert.ok(saved.every((r) => r.imported === true));
  assert.equal(new Set(saved.map((r) => r.import_batch_id)).size, 1);
  assert.ok(saved.every((r) => r.is_test !== true));
  assert.ok(saved.find((r) => r.name === "Marcus Webb").notes.includes("Vehicle: Honda Civic"));
  // The other business's matching phone does not block this business.
  assert.equal(db.state.rows.length, 18);
});

// 4. Nothing valid means no batch and no writes.
test("an empty or all-bad commit writes nothing and reports null", async () => {
  const db = makeDb([]);
  const empty = await commitImportBatch(db, "biz", []);
  assert.equal(empty.batch_id, null);
  assert.equal(empty.created, 0);
  const bad = await commitImportBatch(db, "biz", [{ name: "", phone: "555-0000" }]);
  assert.equal(bad.batch_id, null);
  assert.equal(bad.created, 0);
  assert.equal(bad.bad.length, 1);
  assert.equal(db.state.rows.length, 0);
});

// 5. Rows as saved are flagged imported, batched, vehicles preserved.
test("saved rows are flagged imported with the batch id", () => {
  const batch = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";
  const saved = toImportRows([
    { name: "A", phone: "1", email: null, address: null, notes: "Vehicle: Honda\nLate" },
    { name: "B", phone: "2", email: "b@x.test", address: "9 Elm", notes: null },
  ], "biz", batch);
  assert.equal(saved.length, 2);
  assert.ok(saved.every((r) => r.imported === true && r.import_batch_id === batch && r.business_id === "biz"));
  assert.ok(saved.every((r) => r.is_test !== true));
  assert.equal(saved[0].notes, "Vehicle: Honda\nLate");
});

// 6. Undo removes exactly its batch through the real handler path.
test("undo removes exactly its batch (flag, don't delete)", async () => {
  const db = makeDb([]);
  const res = await commitImportBatch(db, "biz", sampleInput());
  assert.equal(res.created, 17);
  const batch = res.batch_id;
  db.state.rows.push(
    { id: "id-fx", business_id: "biz", name: "Fixture", phone: "555-9002", email: null, imported: true, import_batch_id: batch, is_test: true },
    { id: "id-un", business_id: "biz", name: "Unimported", phone: "555-9003", email: null, imported: false, import_batch_id: batch, is_test: false },
    { id: "id-ha", business_id: "biz", name: "Hand Added", phone: "555-9000", email: null, imported: false, import_batch_id: null, is_test: false },
    { id: "id-ob", business_id: "biz", name: "Old Batch", phone: "555-9001", email: null, imported: true, import_batch_id: "other-batch", is_test: false },
    { id: "id-ob2", business_id: "other", name: "Other Biz", phone: "555-9100", email: null, imported: true, import_batch_id: batch, is_test: false },
  );
  const { removed } = await undoImportBatch(db, "biz", batch);
  assert.equal(removed, 17);
  const left = db.state.rows.filter((r) => r.business_id === "biz").map((r) => r.name).sort();
  assert.deepEqual(left, ["Fixture", "Hand Added", "Old Batch", "Unimported"]);
  const fixture = db.state.rows.find((r) => r.name === "Fixture");
  assert.equal(fixture.phone, "555-9002");
  assert.equal(fixture.imported, true);
  assert.equal(fixture.import_batch_id, batch);
  assert.equal(fixture.is_test, true);
  // Repeat and unknown undos remove nothing; the other business is untouched.
  assert.equal((await undoImportBatch(db, "biz", batch)).removed, 0);
  assert.equal((await undoImportBatch(db, "biz", crypto.randomUUID())).removed, 0);
  assert.deepEqual(db.state.rows.filter((r) => r.business_id === "other").map((r) => r.name), ["Other Biz"]);
});

// 7. A duplicate arriving after preview is reported at save, not inserted.
test("a late duplicate is reported at save, not inserted", async () => {
  const db = makeDb([]);
  const input = sampleInput().slice(0, 2);
  const before = classify(input, new Set());
  assert.equal(before.valid.length, 2);
  db.state.rows.push({
    id: "id-sneak", business_id: "biz", name: "Sneak", phone: "555-0100",
    email: "sneak@x.test", imported: false, import_batch_id: null, is_test: false,
  });
  const res = await commitImportBatch(db, "biz", input);
  assert.equal(res.created, 1);
  assert.ok(res.duplicates.some((d) => d.name === "Marcus Webb" && d.reason === "Already a customer"));
  assert.ok(!db.state.rows.some((r) => r.name === "Marcus Webb" && r.business_id === "biz"));
});

// 7b. Two overlapping saves of the same customer create it ONCE: the second
// waits for the first's claim on the business and then sees the twin.
// BREAK=no-lock runs the save without the claim: both pass the check, two rows.
test("two overlapping saves create each customer once", async () => {
  const db = makeDb([]);
  const input = sampleInput().slice(0, 3);
  const [a, b] = await Promise.all([commitImportBatch(db, "biz", input), commitImportBatch(db, "biz", input)]);
  for (const name of ["Marcus Webb", "Priya Nair", "Tom Becker"]) {
    assert.equal(db.state.rows.filter((r) => r.name === name && r.business_id === "biz").length, 1, name + " stored once");
  }
  assert.equal(a.created + b.created, 3);
  assert.equal(Math.min(a.created, b.created), 0, "the later save found all three already there");
  assert.equal(db.state.locks.length, 0, "every claim released");
});

// 7c. A claim left by a crashed save is cleared once stale, so imports never jam.
test("a stale claim from a crashed save does not block the next save", async () => {
  const db = makeDb([]);
  db.state.locks.push({ business_id: "biz", holder: "crashed", locked_at: new Date(Date.now() - LOCK_STALE_MS - 1000).toISOString() });
  db.state.locks.push({ business_id: "biz2", holder: "busy-elsewhere", locked_at: new Date().toISOString() });
  const res = await commitImportBatch(db, "biz", sampleInput().slice(0, 2));
  assert.equal(res.created, 2);
  assert.deepEqual(db.state.locks.map((l) => l.holder), ["busy-elsewhere"], "only the stale claim was cleared; another business's claim stands");
});

// 8-9. THE HANDLER ITSELF (`handleImportRequest`, what `import-customers/index.ts`
// serves), with a stand-in membership check keyed on the bearer token: the owner
// of "biz" succeeds; a member of another business, and a request with no session,
// are refused with nothing written. BREAK=no-member removes the real refusal line.
const MEMBERS = { "tok-owner": "biz", "tok-other": "biz2" };
const deps = (db) => ({
  db,
  requireMember: async (req, businessId) => {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    return MEMBERS[token] && MEMBERS[token] === businessId ? { userId: token } : null;
  },
  json: (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  preflight: () => new Response(null, { status: 204 }),
});
const call = async (db, token, body) => {
  const headers = { "content-type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await handleImportRequest(new Request("http://local/import-customers", { method: "POST", headers, body: JSON.stringify(body) }), deps(db));
  return { status: res.status, body: await res.json() };
};

test("the handler: the owner previews (every existing customer), saves and undoes", async () => {
  // 1,500 customers, one sharing Gil Hahn's phone at row 1,400: past any
  // screen's loaded list, and still named in the preview.
  const seed = bigSeed(1500, "biz");
  seed[1400].phone = "555-0116";
  const db = makeDb(seed);
  const pre = await call(db, "tok-owner", { action: "preview", business_id: "biz", rows: sampleInput() });
  assert.equal(pre.status, 200);
  assert.equal(pre.body.valid.length, 16);
  assert.ok(pre.body.duplicates.some((d) => d.row === 18 && d.name === "Gil Hahn" && d.reason === "Already a customer"));
  assert.equal(db.state.rows.length, 1500, "preview writes nothing");
  const saved = await call(db, "tok-owner", { action: "commit", business_id: "biz", rows: pre.body.valid });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.created, 16);
  assert.equal(db.state.rows.filter((r) => r.import_batch_id === saved.body.batch_id && r.imported === true).length, 16);
  const undone = await call(db, "tok-owner", { action: "undo", business_id: "biz", batch_id: saved.body.batch_id });
  assert.deepEqual([undone.status, undone.body.removed], [200, 16]);
  assert.equal(db.state.rows.length, 1500);
});

test("the handler refuses another business's member and a missing session, writing nothing", async () => {
  const db = makeDb(bigSeed(3, "biz"));
  const own = await call(db, "tok-owner", { action: "commit", business_id: "biz", rows: sampleInput() });
  assert.equal(own.body.created, 17);
  const snapshot = JSON.stringify(db.state.rows);
  for (const token of ["tok-other", "", "tok-forged"]) {
    for (const body of [
      { action: "preview", business_id: "biz", rows: sampleInput() },
      { action: "commit", business_id: "biz", rows: [{ name: "Intruder", phone: "5550001234" }] },
      { action: "undo", business_id: "biz", batch_id: own.body.batch_id },
    ]) {
      const res = await call(db, token, body);
      assert.equal(res.status, 404, `${token || "no session"} ${body.action} must be refused`);
      assert.deepEqual(res.body, { error: "not_found" });
    }
  }
  assert.equal(JSON.stringify(db.state.rows), snapshot, "a refused request wrote nothing");
  assert.equal(db.state.rows.filter((r) => r.import_batch_id === own.body.batch_id).length, 17);
});