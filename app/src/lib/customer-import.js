// CUSTOMER CSV IMPORT - ROADMAP 97.40. The mirror of `customer-export.js`:
// the export hands a detailer their list; this takes one back in.
//
// Pure parsing/preview rules with no DOM, so `tests/customer-import.test.mjs`
// can pin them without a browser. The screen (Clients) previews with parse and
// previewImport here; the edge handler saves and undoes through the canonical
// rules in `supabase/functions/_shared/importRules.ts`, and a parity test pins
// both sides to the same verdicts on the same rows.

export const IMPORT_HEADER = ["Name", "Phone", "Email", "Address", "Vehicle", "Notes"];

// Split one CSV line honoring quotes (RFC 4180 subset: "" escapes a quote).
export function splitImportLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseImportCsv(text) {
  // Logical records, not physical lines: a quoted Notes cell may hold commas,
  // escaped quotes, newlines and even blank lines, and it is still one
  // customer's cell. Splitting on physical lines tore one such customer into
  // two rows and silently dropped half their notes (found 2026-10-21).
  // Records keep their raw text (quotes included) so splitImportLine below
  // re-parses each one exactly as if it had arrived on a single line.
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  const records = [];
  let cur = "", quoted = false, startLine = 1, lineNo = 1, error = null;
  const endRecord = () => {
    if (cur.trim() !== "") records.push({ line: startLine, text: cur });
    cur = "";
    startLine = lineNo;
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      cur += ch;
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i += 2; continue; }
        quoted = false;
      } else if (ch === "\n") lineNo++;
      i++;
      continue;
    }
    if (ch === '"') { quoted = true; cur += ch; i++; continue; }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      i++;
      lineNo++;
      endRecord();
      continue;
    }
    cur += ch;
    i++;
  }
  if (quoted) {
    // An unterminated quote means the record boundaries cannot be trusted, so
    // the caller must refuse the file rather than guess. The content is kept
    // (nothing silently dropped) and the row keeps its starting line number.
    error = "Unterminated quote";
    endRecord();
  } else if (cur.trim() !== "") records.push({ line: startLine, text: cur });
  if (records.length === 0) return { header: [], rows: [], error };
  const header = splitImportLine(records[0].text).map((h) => h.trim());
  const rows = records.slice(1).map((r, k) => ({ index: k + 2, cells: splitImportLine(r.text) }));
  return { header, rows, error };
}

// A US number arrives with and without its country code (+1 (562) 555-0180
// vs 5625550180): an 11-digit number starting in 1 carries the code, not part
// of the number. Same rule as the edge handler's shared copy.
const normPhone = (p) => {
  const d = String(p ?? "").replace(/\D/g, "");
  return d.length === 11 && d[0] === "1" ? d.slice(1) : d;
};
const normEmail = (e) => String(e ?? "").trim().toLowerCase();

// Preview rows against existing customers (matched on phone or email) and
// within-file duplicates. Returns { valid, duplicates, bad, total } where
// valid rows are the ones a save would create.
export function previewImport({ rows = [], header = [], existing = [] } = {}) {
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iName = idx("Name"), iPhone = idx("Phone"), iEmail = idx("Email");
  const iAddress = idx("Address"), iVehicle = idx("Vehicle"), iNotes = idx("Notes");
  if (iName < 0 || iPhone < 0) {
    return {
      valid: [], duplicates: [], bad: rows.map((r) => ({ row: r.index, name: iName >= 0 && iName < r.cells.length ? r.cells[iName].trim() : "", reason: "Missing Name or Phone column" })),
      total: rows.length,
    };
  }
  const seenExisting = new Set();
  for (const c of existing) {
    const p = normPhone(c.phone);
    if (p) seenExisting.add(`p:${p}`);
    const e = normEmail(c.email);
    if (e) seenExisting.add(`e:${e}`);
  }
  const seenPhones = new Set(), seenEmails = new Set(), seenNames = new Set();
  const valid = [], duplicates = [], bad = [];
  for (const r of rows) {
    const get = (i) => (i >= 0 && i < r.cells.length ? r.cells[i].trim() : "");
    const name = get(iName), phone = get(iPhone), email = get(iEmail);
    const address = get(iAddress), vehicle = get(iVehicle), notes = get(iNotes);
    if (!name || !phone) {
      bad.push({ row: r.index, name, reason: !name ? "Missing name" : "Missing phone" });
      continue;
    }
    // A duplicate on EITHER phone or email: the trade's lists repeat one
    // while changing the other (a new number, same address).
    const p = normPhone(phone), e = normEmail(email);
    const fileKey = p ? `p:${p}` : e ? `e:${e}` : `n:${name.toLowerCase()}`;
    if ((p && seenPhones.has(p)) || (e && seenEmails.has(e)) || seenNames.has(fileKey)) {
      duplicates.push({ row: r.index, name, phone, email, reason: "Duplicate in this file" });
      continue;
    }
    if (p) seenPhones.add(p);
    if (e) seenEmails.add(e);
    seenNames.add(fileKey);
    const pkey = normPhone(phone) ? `p:${normPhone(phone)}` : null;
    const ekey = normEmail(email) ? `e:${normEmail(email)}` : null;
    if ((pkey && seenExisting.has(pkey)) || (ekey && seenExisting.has(ekey))) {
      duplicates.push({ row: r.index, name, phone, email, reason: "Already a customer" });
      continue;
    }
    valid.push({ row: r.index, name, phone, email, address, vehicle, notes });
  }
  return { valid, duplicates, bad, total: rows.length };
}


// The parsed rows as the `import-customers` function takes them, one object
// per record, keyed by the six import columns. Returns null when the Name or
// Phone column is missing: then no row can be judged, and `previewImport`'s
// local answer (every row "Missing Name or Phone column") is what is shown.
export function toImportInput({ rows = [], header = [] } = {}) {
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name);
  if (idx("name") < 0 || idx("phone") < 0) return null;
  const cols = ["name", "phone", "email", "address", "vehicle", "notes"].map((c) => [c, idx(c)]);
  return rows.map((r) => Object.fromEntries(cols.map(([c, i]) => [c, i >= 0 && i < r.cells.length ? r.cells[i] : ""])));
}

// The batch reference survives a save that created nothing: every proposed
// customer can be added by someone else between preview and pressing Save, and
// that empty save must not erase the previous import's Undo.
export const nextBatchAfterSave = (prev, res) => (res && res.batch_id ? res.batch_id : prev);

export const importSampleFilename = "sample-customer-import.csv";
