// THE PHOTO EXPORT — Andrew's "yes", relayed 2026-09-21, and the second half
// of a promise `lib/customer-export.js` already names as unkept:
// *"Photos are NOT in it, and there is still no photo export anywhere in this
// product; `/pricing` promises those too and that half remains unkept."*
//
// **WHAT THE PAGES ACTUALLY PROMISE, WHICH IS MORE THAN ONE TABLE.**
// `/pricing` and `legal.js` both say *"Your customers, their numbers and your
// photos are yours. You export them and go."* A detailer's photos live in TWO
// places, and a file containing only one of them would be the subset that
// satisfies the sentence without keeping the promise:
//
//   `job_photos`      before / after / damage shots of a real car on a real
//                     job, in the PRIVATE `job-photos` bucket
//   `gallery_images`  the marketing gallery on their public site, in the
//                     PUBLIC `business-media` bucket
//
// Both are in the zip. The manifest says which is which, because a folder of
// 300 anonymous JPEGs is not an export of anything.
//
// ── HOW THIS FILE KNOWS THE PHOTOS BELONG TO THE BUSINESS ASKING ─────────
// **IT DOES NOT TRUST THE CALLER, AND THAT IS THE WHOLE POINT OF `assertOwned`.**
// The database already refuses cross-tenant reads twice over — `job_photos` is
// RLS'd on `business_id in (select public.current_business_ids())`, and the
// `job-photos` bucket is private with a storage policy requiring the FIRST
// FOLDER of the object path to be one of your business ids
// (`20260906010000_job_photos.sql`). `addPhoto` writes
// `${businessId}/${bookingId}/${uuid}.jpg`, so that folder is structural
// rather than conventional.
//
// **Two gates is not a reason to have no third.** Those gates live in the
// database and in a bucket policy; this file is what actually decides which
// bytes land in somebody's Downloads folder, and it is the layer a future
// refactor is most likely to change without reading a migration. So every row
// is checked HERE against the id the export was asked for, and a mismatch
// THROWS rather than being filtered out quietly: a photo that should not be
// in this file means a read went wrong somewhere upstream, and silently
// dropping it would hide exactly the bug worth shouting about.
//
// `tests/photo-export.test.mjs` proves the guard fires by feeding it a
// foreign row on purpose.

import { localDate } from "./format.js";
import { q, slug } from "./accountant-export.js";

export const PHOTO_HEADER = [
  "File", "Kind", "Taken", "Customer", "Job date", "Service", "Caption", "Width", "Height", "Bytes",
];

/**
 * The tenant check, kept separate so a test can aim at it directly.
 * Throws on the first row that does not belong to `businessId`.
 */
export function assertOwned(rows, businessId, what = "photo") {
  if (!businessId) throw new Error("photo export: no business id was given");
  for (const r of rows ?? []) {
    if (String(r.business_id) !== String(businessId)) {
      // The message names the kind and the id asked for, never the id found:
      // an error string is a place data leaks out of a tenant boundary too.
      throw new Error(`photo export: a ${what} row did not belong to business ${businessId}`);
    }
  }
  return rows ?? [];
}

/**
 * The path check. `job_photos.path` must start with the business's own folder,
 * which is the same thing the storage policy tests. Belt and braces, because
 * this is the string that gets handed to `storage.download`.
 */
export function assertPathOwned(path, businessId) {
  const first = String(path ?? "").split("/")[0];
  if (!first || first !== String(businessId)) {
    throw new Error(`photo export: a file path was not inside business ${businessId}`);
  }
  return path;
}

// A name a human can read in a folder, and one that cannot collide: the job
// date and the customer put the two photos of the same car next to each other,
// and the row id on the end makes it unique without being the whole name.
export function photoFilename(row, { booking, timezone } = {}) {
  const when = booking?.start_at ? localDate(booking.start_at, timezone) : "no-date";
  const who = slug(booking?.customer_name || "") || "customer";
  const ext = String(row.path ?? "").split(".").pop() || "jpg";
  const id = String(row.id ?? "").slice(0, 8) || "photo";
  return `${when}-${who}-${row.kind}-${id}.${ext}`;
}

/** Manifest rows, before they are text, so a test can assert without CSV. */
export function photoRows({ photos = [], bookings = new Map(), gallery = [], timezone } = {}) {
  const job = photos.map((p) => {
    const b = bookings.get(p.booking_id) ?? null;
    return {
      file: `job-photos/${photoFilename(p, { booking: b, timezone })}`,
      kind: p.kind ?? "",
      taken: p.created_at ? localDate(p.created_at, timezone) : "",
      customer: b?.customer_name ?? "",
      jobDate: b?.start_at ? localDate(b.start_at, timezone) : "",
      service: b?.service_name ?? "",
      caption: p.caption ?? "",
      width: p.width ?? "",
      height: p.height ?? "",
      bytes: p.bytes ?? "",
      _path: p.path,
    };
  });
  // The marketing gallery. A before/after pair is TWO files and is listed as
  // two rows, because one row naming two files is a row a spreadsheet cannot
  // use and a person cannot follow.
  const gal = [];
  for (const g of gallery) {
    for (const [field, kind] of [["image_url", "gallery"], ["before_url", "gallery-before"], ["after_url", "gallery-after"]]) {
      const url = g[field];
      if (!url) continue;
      const ext = String(url).split("?")[0].split(".").pop() || "jpg";
      gal.push({
        file: `gallery/${kind}-${String(g.id ?? "").slice(0, 8)}.${ext}`,
        kind,
        taken: g.created_at ? localDate(g.created_at, timezone) : "",
        customer: "", jobDate: "", service: "",
        caption: g.caption ?? "",
        width: "", height: "", bytes: "",
        _url: url,
      });
    }
  }
  return [...job, ...gal];
}

export function photosCsv(input) {
  const rows = photoRows(input);
  return [
    PHOTO_HEADER.join(","),
    ...rows.map((r) => [
      q(r.file), q(r.kind), r.taken, q(r.customer), r.jobDate,
      q(r.service), q(r.caption), r.width, r.height, r.bytes,
    ].join(",")),
  ].join("\r\n") + "\r\n";
}

export const exportedPhotoCount = (input) => photoRows(input).length;

export const photosFilename = (businessName, today = new Date()) =>
  `${slug(businessName) || "business"}-photos-${today.toISOString().slice(0, 10)}.zip`;

// ── THE ZIP ───────────────────────────────────────────────────────────────
// **STORE, NOT DEFLATE, AND NO NEW DEPENDENCY.** Every file going in is
// already a compressed JPEG, PNG or WebP; deflating them again buys a couple
// of percent for a compression library this app does not have and does not
// otherwise need. A store-only writer is the format's own simplest case and
// is about sixty lines. The manifest CSV is the one compressible thing in
// there and it is a few kilobytes.
//
// ponytail: store-only zip, no central-directory-64. A detailer with more
// than 65,535 photos or a 4GB archive needs zip64 — add it then, and the cap
// in `photo-rules.js` makes both a long way off.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const enc = (s) => new TextEncoder().encode(s);

/**
 * `files` is [{ name, bytes: Uint8Array }]. Returns a Uint8Array holding a
 * valid store-method zip. Deterministic apart from nothing — the DOS
 * timestamp is fixed, so the same input gives the same archive and a test can
 * compare bytes.
 */
export function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const u32 = (n) => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  const u16 = (n) => [n & 0xFF, (n >>> 8) & 0xFF];

  for (const f of files) {
    const name = enc(f.name);
    const data = f.bytes;
    const crc = crc32(data);
    const local = Uint8Array.from([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0x21),                 // fixed date/time, see above
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0), ...name,
    ]);
    chunks.push(local, data);
    central.push(Uint8Array.from([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(offset), ...name,
    ]));
    offset += local.length + data.length;
  }

  const dir = central.reduce((n, c) => n + c.length, 0);
  const end = Uint8Array.from([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(central.length), ...u16(central.length),
    ...u32(dir), ...u32(offset), ...u16(0),
  ]);

  const total = chunks.reduce((n, c) => n + c.length, 0) + dir + end.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of [...chunks, ...central, end]) { out.set(c, at); at += c.length; }
  return out;
}
