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
import { MAX_EDGE, QUALITY, fit } from "./photo-rules.js";

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

// THE FILE GOES UP BEFORE THE ROW GOES IN, and the file is removed again if
// the row fails. The other order leaves a row pointing at nothing — a broken
// image on a job record forever. This order can at worst leave an orphaned
// file, which costs bytes and shows nobody anything.
export async function addPhoto({ file, businessId, bookingId, kind, caption = null }) {
  const { blob, width, height } = await shrink(file);
  const ext = (blob.type || "image/jpeg") === "image/png" ? "png" : "jpg";
  const path = `${businessId}/${bookingId}/${crypto.randomUUID()}.${ext}`;

  const up = await supabase.storage.from("job-photos")
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
  if (up.error) throw up.error;

  const { data, error } = await supabase.from("job_photos").insert({
    business_id: businessId,
    booking_id: bookingId,
    kind,
    path,
    bytes: blob.size,
    width,
    height,
    caption,
  }).select().single();

  if (error) {
    await supabase.storage.from("job-photos").remove([path]);
    throw error;
  }
  return data;
}

export async function removePhoto(photo) {
  const { error } = await supabase.from("job_photos").delete().eq("id", photo.id);
  if (error) throw error;
  await supabase.storage.from("job-photos").remove([photo.path]);
}

// PRIVATE BUCKET, so every displayed photo is a signed URL with an expiry.
// One hour: long enough that a detailer reading a job record never watches an
// image break, short enough that a URL copied out of the page is not a
// permanent public link to a customer's driveway.
export const SIGNED_FOR = 3600;

export async function signedUrls(paths) {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from("job-photos")
    .createSignedUrls(paths, SIGNED_FOR);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((d) => [d.path, d.signedUrl]));
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
  const dl = await supabase.storage.from("job-photos").download(photo.path);
  if (dl.error) throw dl.error;
  const dest = `${businessId}/gallery/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from("business-media")
    .upload(dest, dl.data, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw up.error;

  const { data: pub } = supabase.storage.from("business-media").getPublicUrl(dest);
  const { data, error } = await supabase.from("gallery_images").insert({
    business_id: businessId,
    kind: "single",
    image_url: pub.publicUrl,
    caption: photo.caption ?? null,
  }).select().single();
  if (error) {
    await supabase.storage.from("business-media").remove([dest]);
    throw error;
  }
  await supabase.from("job_photos").update({ gallery_id: data.id }).eq("id", photo.id);
  return data;
}
