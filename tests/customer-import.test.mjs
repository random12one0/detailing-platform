// ROADMAP 97.40 - the customer CSV import.
//
//   node --test tests/customer-import.test.mjs   (first half credential-free;
//     the database half needs the belt's test database)
//
// WHAT IT PROVES: the sample CSV (20 rows: 2 duplicates, 1 bad) previews with
// each one named - every accepted customer listed, every rejected row keeping
// its name - and yields exactly the 17 customers a save would create; phone or
// email matching refuses existing customers, with and without the +1 country
// code; the screen preview and the server classify agree row for row. A quoted
// Notes cell with commas, escaped quotes, newlines and a blank line stays one
// customer's complete notes; malformed quoting and missing columns fail visibly.
// Saving and undoing run through the REAL handler code in
// tests/customer-import-edge.test.mjs, against a fake database.

import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IMPORT_HEADER,
  nextBatchAfterSave,
  parseImportCsv,
  previewImport,
  splitImportLine,
} from "../app/src/lib/customer-import.js";
import { setAppLocale, t } from "../app/src/lib/appI18n.js";
import { q } from "../app/src/lib/accountant-export.js";
import { classify as classifyServer, toImportRows } from "../supabase/functions/_shared/importRules.ts";

const SAMPLE = readFileSync("app/public/sample-customer-import.csv", "utf8");

// 1. The sample file is what the acceptance criteria say it is.
test("sample CSV holds 20 rows", () => {
  const { header, rows } = parseImportCsv(SAMPLE);
  assert.deepEqual(header, IMPORT_HEADER);
  assert.equal(rows.length, 20);
});

// 2. The preview names each duplicate and the bad row, and 17 would be saved.
test("preview names 2 duplicates and 1 bad row, leaving 17 valid", () => {
  const { header, rows } = parseImportCsv(SAMPLE);
  const p = previewImport({ rows, header, existing: [] });
  assert.equal(p.total, 20);
  assert.equal(p.valid.length, 17);
  assert.equal(p.duplicates.length, 2);
  assert.equal(p.bad.length, 1);
  assert.match(p.duplicates[0].reason, /Duplicate/);
  assert.match(p.duplicates[1].reason, /Duplicate/);
  assert.equal(p.duplicates[0].name, "Tom Twin");
  assert.equal(p.duplicates[1].name, "Zoe Copy");
  assert.equal(p.bad[0].reason, "Missing phone");
  assert.equal(p.bad[0].name, "No Phone");
});

// 3. A row matching an existing customer is refused, on phone or on email.
test("existing phone or email is a duplicate, and the save shrinks", () => {
  const { header, rows } = parseImportCsv(SAMPLE);
  const existing = [{ phone: "555-0100", email: "nobody@example.com" }];
  const p = previewImport({ rows, header, existing });
  assert.equal(p.valid.length, 16);
  assert.equal(p.duplicates.length, 3);
  assert.ok(p.duplicates.some((d) => d.name === "Marcus Webb" && d.reason === "Already a customer"));
  const byEmail = previewImport({
    rows, header, existing: [{ phone: "555-9999", email: "ZOE@EXAMPLE.COM" }],
  });
  assert.ok(byEmail.duplicates.some((d) => d.name === "Zoe Allen"));
  const intl = parseImportCsv("Name,Phone,Email\nNew Guy,+1 (562) 555-0180,new@x.test");
  const viaCode = previewImport({ rows: intl.rows, header: intl.header, existing: [{ phone: "5625550180", email: "someone@else.test" }] });
  assert.equal(viaCode.duplicates.length, 1);
  assert.equal(viaCode.duplicates[0].name, "New Guy");
  const bare = parseImportCsv("Name,Phone,Email\nOther Guy,5625550180,other@x.test");
  const viaBare = previewImport({ rows: bare.rows, header: bare.header, existing: [{ phone: "+1 (562) 555-0180", email: "else@x.test" }] });
  assert.equal(viaBare.duplicates.length, 1);
});

// 4. Quoted commas do not blow a row apart.
test("a comma inside quotes stays inside the cell", () => {
  assert.deepEqual(splitImportLine('"Shaw, Eve",555-0115'), ["Shaw, Eve", "555-0115"]);
});

// The screen preview and the server classify name the same rows: one rule,
// two call sites, pinned together (same verdicts, same row numbers, same names).
test("screen preview and server classify agree row for row", () => {
  const { header, rows } = parseImportCsv(SAMPLE);
  const p = previewImport({ rows, header, existing: [] });
  const idx = (n) => header.findIndex((h) => h.toLowerCase() === n.toLowerCase());
  const input = rows.map((r) => ({ name: r.cells[idx("name")], phone: r.cells[idx("phone")],
    email: r.cells[idx("email")], address: r.cells[idx("address")], vehicle: r.cells[idx("vehicle")], notes: r.cells[idx("notes")] }));
  const s = classifyServer(input, new Set());
  assert.deepEqual(s.valid.map((v) => v.name), p.valid.map((v) => v.name));
  assert.deepEqual(s.duplicates.map((d) => d.name), p.duplicates.map((d) => d.name));
  assert.deepEqual(s.bad.map((x) => x.row), p.bad.map((x) => x.row));
  assert.deepEqual(s.bad.map((x) => x.name), p.bad.map((x) => x.name));
});

// A save that creates nothing keeps the previous Undo: every proposed customer
// can be added by someone else between preview and pressing Save.
test("a save that creates nothing keeps the previous undo", () => {
  assert.equal(nextBatchAfterSave("old", { batch_id: "new", created: 5 }), "new");
  assert.equal(nextBatchAfterSave("old", { batch_id: null, created: 0 }), "old");
});

// A quoted Notes cell holding a comma, escaped quotes, several lines and an
// interior blank line stays ONE customer's complete notes: one parsed record,
// one valid preview row, and the saved notes re-parse byte-for-byte through
// the same quoting the export uses.
test("multiline quoted notes stay one customer's complete notes", () => {
  const notes = 'Line one, with a comma\n"quoted" line two\n\n(blank line above)\nlast line';
  const csv =
    "Name,Phone,Email,Address,Vehicle,Notes\r\n" +
    '"Quinn, Pat",555-0119,quinn@example.com,9 Elm St,Honda,"' +
    notes.replace(/"/g, '""') +
    '"\r\n';
  const parsed = parseImportCsv(csv);
  assert.equal(parsed.error, null);
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.rows[0].cells[5], notes);
  const p = previewImport({ rows: parsed.rows, header: parsed.header, existing: [] });
  assert.equal(p.valid.length, 1);
  assert.equal(p.valid[0].notes, notes);
  const { row: _drop, ...input } = p.valid[0];
  const server = classifyServer([input], new Set());
  assert.equal(server.valid.length, 1);
  const [saved] = toImportRows(server.valid, "biz", "batch-1");
  assert.ok(saved.notes.includes("Vehicle: Honda"));
  assert.ok(saved.notes.includes('"quoted" line two'));
  const back = parseImportCsv("Notes\n" + q(saved.notes));
  assert.equal(back.error, null);
  assert.equal(back.rows.length, 1);
  assert.equal(back.rows[0].cells[0], saved.notes);
});

// A file whose quote never closes is refused, not guessed: the parser names
// the problem and keeps the content, so the screen can show it with nothing
// to save.
test("an unterminated quote refuses the file instead of guessing rows", () => {
  const parsed = parseImportCsv('Name,Phone\n"Bad,555-0100');
  assert.equal(parsed.error, "Unterminated quote");
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.rows[0].cells, ["Bad,555-0100"]);
});

// A file without a Phone column fails every row visibly and yields nothing to
// save, instead of importing numberless rows.
test("a missing Phone column fails every row visibly", () => {
  const parsed = parseImportCsv("Name,Email\nNo Phone,regular@example.com");
  assert.equal(parsed.error, null);
  const p = previewImport({ rows: parsed.rows, header: parsed.header, existing: [] });
  assert.equal(p.valid.length, 0);
  assert.equal(p.bad.length, 1);
  assert.equal(p.bad[0].reason, "Missing Name or Phone column");
});
// Finding 5 of the paid-review checklist: every sentence this import shows a
// person runs through the REAL dashboard lookup in Spanish, so a missing key
// (which falls back to English silently) fails instead of passing quietly.
test("every import sentence has its Spanish key", () => {
  const sentences = [
    "Import customers",
    "See the sample file",
    "{picked}: {count} new, {dups} duplicates, {bad} need fixing",
    "Row {row}: {name} - {reason}",
    "Save {count} customers",
    "Saved {count} customers",
    "Undo this import",
    "Import undone - {count} removed",
    "We could not read that file. Please try again.",
    "We could not save that import. Please try again.",
    "We could not undo that import. Please try again.",
    "That file has a quote that never closes. Please fix it and try again.",
  ];
  setAppLocale("es");
  try {
    for (const s of sentences) assert.notEqual(t(s), s, s);
    assert.equal(t("Save {count} customers", { count: 5 }), "Guardar 5 clientes");
    assert.equal(t("Row {row}: {name} - {reason}", { row: 2, name: "No Phone", reason: "Missing phone" }), "Fila 2: No Phone - Missing phone");
  } finally {
    setAppLocale("en");
  }
});
