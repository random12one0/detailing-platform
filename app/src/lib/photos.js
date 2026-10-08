// Job photos — the half that talks to storage.
//
// `docs/detailer-dashboard-audit-2026-09-06.md` §3.1, the biggest gap in the
// detailer's dashboard. `gallery_images` is the MARKETING gallery for the
// public site; there has never been anywhere to put the car in front of you.
//
// The rules — how big a photo may be, and how much allowance is gone — are in
// `photo-rules.js` so a test can run them with no browser. This file is
// deliberately thin: resize, upload, insert, sign.

import { supabase } from "./supabase.js";
import { api } from "./api.js";
import { MAX_EDGE, QUALITY, fit, firstFolder, storagePath } from "./photo-rules.js";
import {
  DOOR_BATCH, DOOR_WORDS, doorError, readFinish, readRemoved, readStart, readUrls,
} from "./photo-door.js";
import { removeBusinessPhoto, uploadBusinessPhoto } from "./upload.js";

export * from "./photo-rules.js";

// EXIF ORIENTATION IS WHY THIS USES createImageBitmap. A photo taken in
// portrait on a phone is very often stored landscape with a rotation flag, and
// a canvas drawn from a plain <img> ignores that flag — which would silently
// rotate a large share of every detailer's photos onto their side. Asking for
// `imageOrientation: "from-image"` makes the browser apply it before we draw.
export async function shrink(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fit(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  // A CANVAS CAN MAKE A FILE BIGGER, and a screenshot is the ordinary way it
  // happens: re-encoding a flat-colour PNG as JPEG can grow it. Never send up
  // more bytes than we were handed.
  if (!blob || blob.size >= file.size) return { blob: file, width, height };
  return { blob, width, height };
}

// ROADMAP 0.11, SLICE 1 — JOB PHOTOS GO THROUGH THE PHOTO DOOR, and nowhere
// else. `photo-door.js` holds the contract; the server half is not built yet,
// so every call below fails in words until it is. There is no fallback to
// Supabase Storage on purpose: a second door is how a cap stops meaning
// anything.
const door = async (businessId, body) => {
  try { return await api.photoDoor(businessId, body); } catch (e) { throw doorError(e); }
};

// THE SERVER WRITES THE ROW, AND THE SIZE IT WRITES IS R2's, NOT OURS. The
// order is: ask the door (it checks the business and the room), put the file,
// ask the door to finish (it measures what landed and inserts the row in the
// same step). A file with no row costs bytes and shows nobody anything; a row
// with no file is a broken image on a job record forever, and this order never
// makes one. `blob.size` goes up only as a CLAIM, to refuse early — the client
// is the thing being limited, so what it says about its own size is never what
// is recorded.
export async function addPhoto({ file, businessId, bookingId, kind, caption = null }) {
  const { blob, width, height } = await shrink(file);
  const type = blob.type || "image/jpeg";
  const photoId = crypto.randomUUID();
  // The shape is `photo-rules.js`'s, and `readStart` refuses to go on unless the
  // server agrees with it to the character.
  const want = { businessId, bookingId, photoId, type: blob.type };
  const { uploadUrl, key } = readStart(await door(businessId, {
    action: "start", booking_id: bookingId, photo_id: photoId, kind,
    content_type: type, claimed_bytes: blob.size, width, height,
  }), want);

  let put;
  try { put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": type }, body: blob }); }
  catch (e) { throw doorError(e); }
  if (!put.ok) throw new Error(DOOR_WORDS.putFailed);

  return readFinish(await door(businessId, {
    action: "finish", booking_id: bookingId, photo_id: photoId, kind, width, height, caption,
  }), { photoId, key });
}

export async function removePhoto(photo) {
  readRemoved(await door(photo.business_id, { action: "remove", photo_id: photo.id }));
}

// PRIVATE BUCKET, so every displayed photo is a signed URL with an expiry.
// One hour: long enough that a detailer reading a job record never watches an
// image break, short enough that a URL copied out of the page is not a
// permanent public link to a customer's driveway.
export const SIGNED_FOR = 3600;

// THE BUSINESS IS READ OFF THE KEYS, so no caller changes: the first folder of
// a key is its business, and the door checks that the session belongs to it. A
// batch that spans two businesses is refused here rather than sent.
export async function signedUrls(paths) {
  if (!paths.length) return {};
  const businessId = firstFolder(paths[0]);
  if (paths.some((p) => firstFolder(p) !== businessId)) {
    throw new Error("signedUrls: keys from more than one business in one call");
  }
  const out = {};
  for (let i = 0; i < paths.length; i += DOOR_BATCH) {
    Object.assign(out, readUrls(await door(businessId, {
      action: "urls", keys: paths.slice(i, i + DOOR_BATCH),
    })));
  }
  return out;
}

export async function budgetFor(businessId) {
  const { data, error } = await supabase.rpc("job_photo_budget", { p_business: businessId });
  if (error) throw error;
  return data?.[0] ?? null;
}

// PUBLISHING COPIES rather than making the private file public. `business-media`
// is public-read because a logo is on the booking page; this bucket is not,
// because a before-photo is a stranger's car outside their own house. Copying
// keeps that line: one photo, chosen by a person, becomes public — and the
// original stays private even after the gallery copy is deleted.
export async function publishToGallery(photo, businessId) {
  const read = (await signedUrls([photo.path]))[photo.path];
  if (!read) throw new Error(DOOR_WORDS.unreadable);
  const dl = await fetch(read);
  if (!dl.ok) throw new Error(DOOR_WORDS.unreadable);
  // ROADMAP 0.11 SLICE 4 — THROUGH `upload.js`, WHICH IS WHERE THE FLAG LIVES.
  // This used to build the destination path and call the bucket itself: a
  // second copy of `uploadBusinessPhoto`'s body, which would have needed a
  // second copy of the door branch too. One upload path, one flag, read once.
  //
  // IT ALSO FIXES A SMALL OLD INCONSISTENCY ON THE WAY: the destination was
  // always named `.jpg` and always declared `image/jpeg`, so a PNG job photo
  // was published as a JPEG that was not one. The blob carries its own type now
  // and the extension follows it.
  const { url, key: dest } = await uploadBusinessPhoto(businessId, await dl.blob(), "gallery");

  const { data, error } = await supabase.from("gallery_images").insert({
    business_id: businessId,
    kind: "single",
    image_url: url,
    caption: photo.caption ?? null,
  }).select().single();
  if (error) {
    // THE OBJECT GOES WHEN THE ROW DOES NOT LAND, which is the one thing this
    // function needed the key back for. Already-gone is success on both paths.
    await removeBusinessPhoto(businessId, dest).catch(() => {});
    throw error;
  }
  await supabase.from("job_photos").update({ gallery_id: data.id }).eq("id", photo.id);
  return data;
}
