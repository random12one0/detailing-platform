// THE PHOTO EXPORT — the second half of "your photos are yours".
//
// What this has to prove is not the same as the customer export's job. That
// file goes into a spreadsheet, so its tests are about columns and quoting.
// This one hands over BYTES, and the two things that can go wrong with bytes
// are worse: an archive nobody can open, and **a photo belonging to somebody
// else**. So the checks here are, in order of how much they matter:
//
//   3 · the tenant guard fires, proved by feeding it a foreign row
//   4 · the zip is a zip — checked against the format, and the CRC against
//       the published check value rather than against my own reader
//   1,2 · the manifest, which is the ordinary spreadsheet work
//
//   node tests/photo-export.test.mjs      (credential-free)

import {
  PHOTO_HEADER, photoRows, photosCsv, photosFilename, photoFilename,
  assertOwned, assertPathOwned, buildZip, crc32, exportedPhotoCount,
} from "../app/src/lib/photo-export.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

const TZ = "America/Los_Angeles";
const BIZ = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

const photo = (o = {}) => ({
  id: "aaaaaaaa-0000-0000-0000-000000000001", business_id: BIZ,
  booking_id: "bbbb-1", kind: "before", path: `${BIZ}/bbbb-1/f1.jpg`,
  bytes: 240_000, width: 1600, height: 1200, caption: "",
  created_at: "2026-09-04T18:00:00Z", ...o,
});
const bookings = new Map([["bbbb-1", {
  customer_name: "Marcus Webb", start_at: "2026-09-04T17:00:00Z", service_name: "Wash & Wax",
}]]);

// ─── 1 · the manifest ─────────────────────────────────────────────────────
console.log("\n1. the manifest");
{
  const rows = photoRows({ photos: [photo(), photo({ id: "a2", kind: "after", path: `${BIZ}/bbbb-1/f2.jpg` })], bookings, timezone: TZ });
  check("1a · one row per photo", rows.length === 2, `got ${rows.length}`);
  check("1b · the job's customer and service reach the row",
    rows[0].customer === "Marcus Webb" && rows[0].service === "Wash & Wax");
  check("1c · the file name carries date, customer and kind",
    /2026-09-04-marcus-webb-before-/.test(rows[0].file), rows[0].file);
  const lines = photosCsv({ photos: [photo()], bookings, timezone: TZ }).trim().split("\r\n");
  check(`1d · every row has ${PHOTO_HEADER.length} columns, same as the header`,
    lines.every((l) => splitCsv(l).length === PHOTO_HEADER.length),
    lines.map((l) => splitCsv(l).length).join(", "));
  check("1e · CRLF and a trailing newline", photosCsv({ photos: [photo()], bookings }).endsWith("\r\n"));
}

// ─── 2 · the marketing gallery is in it, and a pair is two files ──────────
// The promise is "your photos", not "your job photos". A before/after gallery
// entry is two images and has to be two rows or the manifest names a file
// that is not there.
console.log("\n2. the gallery half of the promise");
{
  const gallery = [
    { id: "g1", image_url: "https://x/y/one.jpg", caption: "Blue truck", created_at: "2026-08-01T00:00:00Z" },
    { id: "g2", kind: "before_after", before_url: "https://x/y/b.jpg", after_url: "https://x/y/a.webp", caption: "" },
  ];
  const rows = photoRows({ photos: [], gallery, timezone: TZ });
  check("2a · a single image is one row, a pair is two", rows.length === 3, `got ${rows.length}`);
  check("2b · the pair keeps before and after apart",
    rows.some((r) => r.kind === "gallery-before") && rows.some((r) => r.kind === "gallery-after"));
  check("2c · the file extension follows the url, not a guess",
    rows.find((r) => r.kind === "gallery-after").file.endsWith(".webp"));
  check("2d · job photos and gallery are counted together",
    exportedPhotoCount({ photos: [photo()], gallery, timezone: TZ }) === 4);
}

// ─── 3 · THE ONE THAT MATTERS: a foreign photo cannot get into the file ────
// Proved by feeding the guard a row it must refuse, not by reading it.
console.log("\n3. the tenant guard");
{
  check("3a · rows that all belong pass through",
    assertOwned([photo(), photo({ id: "a2" })], BIZ).length === 2);
  check("3b · ONE foreign row THROWS — it is not filtered out quietly",
    throws(() => assertOwned([photo(), photo({ id: "a3", business_id: OTHER })], BIZ)));
  check("3c · a foreign row throws even when it is the only row",
    throws(() => assertOwned([photo({ business_id: OTHER })], BIZ)));
  check("3d · no business id at all is refused, never treated as 'any'",
    throws(() => assertOwned([photo()], null)) && throws(() => assertOwned([photo()], "")));
  // THE PATH IS A SECOND, INDEPENDENT ANSWER TO THE SAME QUESTION, because it
  // is the string handed to storage.download. A row whose business_id is right
  // and whose path points somewhere else is exactly the shape of a bug that
  // gets past a row check.
  check("3e · a path inside the business is accepted",
    assertPathOwned(`${BIZ}/job/one.jpg`, BIZ) === `${BIZ}/job/one.jpg`);
  check("3f · a path in ANOTHER business throws",
    throws(() => assertPathOwned(`${OTHER}/job/one.jpg`, BIZ)));
  check("3g · a path with no folder at all throws",
    throws(() => assertPathOwned("one.jpg", BIZ)));
  check("3h · a traversal-looking path throws",
    throws(() => assertPathOwned(`../${OTHER}/one.jpg`, BIZ)));
  // The error must not carry the other tenant's id out with it.
  let msg = "";
  try { assertOwned([photo({ business_id: OTHER })], BIZ); } catch (e) { msg = e.message; }
  check("3i · the error names the business asked for, never the one found",
    msg.includes(BIZ) && !msg.includes(OTHER), msg);
}

// ─── 4 · it is really a zip ───────────────────────────────────────────────
console.log("\n4. the archive");
{
  // CHECKED AGAINST THE OUTSIDE WORLD, not against my own reader: 0xCBF43926
  // is the published CRC-32 check value for the string "123456789". If this
  // line is right the checksums in the archive are right too.
  check("4a · crc32 matches the published check value",
    crc32(new TextEncoder().encode("123456789")) === 0xCBF43926,
    "0x" + crc32(new TextEncoder().encode("123456789")).toString(16));

  const files = [
    { name: "manifest.csv", bytes: new TextEncoder().encode("a,b\r\n1,2\r\n") },
    { name: "job-photos/one.jpg", bytes: Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3]) },
  ];
  const zip = buildZip(files);
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  check("4b · starts with a local file header", dv.getUint32(0, true) === 0x04034b50);
  // End of central directory is the last 22 bytes when there is no comment.
  const eocdAt = zip.length - 22;
  check("4c · ends with an end-of-central-directory record",
    dv.getUint32(eocdAt, true) === 0x06054b50);
  check("4d · the directory counts every file", dv.getUint16(eocdAt + 10, true) === files.length,
    String(dv.getUint16(eocdAt + 10, true)));
  // Walk the central directory and read each entry back out of the archive.
  const dirAt = dv.getUint32(eocdAt + 16, true);
  let at = dirAt, seen = [], crcOk = true;
  for (let i = 0; i < files.length; i++) {
    if (dv.getUint32(at, true) !== 0x02014b50) { crcOk = false; break; }
    const nameLen = dv.getUint16(at + 28, true);
    const size = dv.getUint32(at + 24, true);
    const storedCrc = dv.getUint32(at + 16, true);
    const localAt = dv.getUint32(at + 42, true);
    const name = new TextDecoder().decode(zip.slice(at + 46, at + 46 + nameLen));
    seen.push(name);
    const lNameLen = dv.getUint16(localAt + 26, true);
    const lExtra = dv.getUint16(localAt + 28, true);
    const dataAt = localAt + 30 + lNameLen + lExtra;
    const body = zip.slice(dataAt, dataAt + size);
    if (crc32(body) !== storedCrc) crcOk = false;
    at += 46 + nameLen;
  }
  check("4e · every name round-trips", seen.join("|") === files.map((f) => f.name).join("|"), seen.join("|"));
  check("4f · every stored CRC matches the bytes actually in the archive", crcOk);
  check("4g · an empty archive is still a valid zip", (() => {
    const z = buildZip([]);
    const d = new DataView(z.buffer, z.byteOffset, z.byteLength);
    return z.length === 22 && d.getUint32(0, true) === 0x06054b50;
  })());
  // THE CANARY. If buildZip silently dropped a file, 4d and 4e would both go
  // red — proved here by building an archive that is deliberately one short.
  const short = buildZip(files.slice(0, 1));
  const sdv = new DataView(short.buffer, short.byteOffset, short.byteLength);
  check("4h · canary — a one-file archive reports one file, so 4d can fail",
    sdv.getUint16(short.length - 22 + 10, true) === 1);
}

// ─── 5 · the name on the download ─────────────────────────────────────────
console.log("\n5. the file name");
{
  const n = photosFilename("Coastline Auto Detailing", new Date("2026-09-21T12:00:00Z"));
  check("5a · business and date, ending .zip", n === "coastline-auto-detailing-photos-2026-09-21.zip", n);
  check("5b · a business with no name still gets a file", photosFilename("", new Date("2026-09-21T12:00:00Z")).startsWith("business-photos-"));
  check("5c · a photo with no booking still gets a name",
    /no-date-customer-damage-/.test(photoFilename({ id: "zz999999", kind: "damage", path: "b/x/y.jpg" }, {})));
}

function splitCsv(line) {
  const out = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
