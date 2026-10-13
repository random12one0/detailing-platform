// Real photo upload (the old gallery made the admin paste a Cloudinary URL).
// Files go to the business-media bucket under this business's own folder —
// storage RLS rejects writes into any other business's folder.
//
// ROADMAP 0.11 SLICE 4 — AND BEHIND `MEDIA_VIA_DOOR` IT GOES THROUGH THE PHOTO
// DOOR INSTEAD, WHICH IS THE SAME BUCKET NAME ON CLOUDFLARE R2.
//
// **THE SENTENCE ABOVE IS THE WHOLE RISK OF THIS SLICE.** "storage RLS rejects
// writes into any other business's folder" is a DATABASE guarantee, and R2 has
// no database. On the door path that check is
// `_shared/photoKey.ts`'s — the key is minted from the member's own business id
// and nothing in the request can steer the first folder. On this path it is
// Postgres's. Exactly one of the two is reachable, chosen by the flag, which is
// why there is no fallback from one to the other: a second way in is how a
// guard stops meaning anything.
//
// **AND ONE THING IS DIFFERENT IN A WAY A READER WILL NOT GUESS: WHAT THE
// RETURNED URL IS.** Today it is Supabase's public url for the object. On the
// door path it is `R2_MEDIA_BASE` plus the key. Both are absolute, both get
// written into a row (`gallery_images.image_url`, the brand's `logo_url`), and
// **rows written before the switch keep working afterwards** — the old bucket
// stays public and the old urls still point at it. Nothing migrates, and
// nothing needs to.

import { supabase } from "./supabase.js";
import { api } from "./api.js";
import { mediaExtForType, storedMediaAt } from "./photo-rules.js";
import { DOOR_WORDS, MEDIA_VIA_DOOR, doorError, readMediaStart, readRemoved } from "./photo-door.js";

// ONE LINE, DELIBERATELY NOT SHARED WITH `photos.js`'s COPY. The rule worth
// sharing is `doorError`'s mapping of a status to a sentence, and that IS
// shared. This is the transport, and `photo-door.js` cannot hold it: that file
// imports nothing but `photo-rules.js` so its test runs with no browser and no
// environment, which is the property that makes the contract checkable at all.
const door = async (businessId, body) => {
  try { return await api.photoDoor(businessId, body); } catch (e) { throw doorError(e); }
};

/**
 * Upload one business image. Returns **`{ url, key }`**.
 *
 * **IT RETURNED THE URL ALONE UNTIL SLICE 4, AND THE KEY IS NOT A
 * CONVENIENCE.** `publishToGallery` has always had to be able to UNDO its own
 * upload when the `gallery_images` row fails to insert, and it could only do
 * that because it built the path itself and kept a second copy of this
 * function's body. Handing the key back deletes that copy — so there is one
 * place a business image is uploaded, and the flag is read once.
 *
 * `file` may be a `File` or a plain `Blob`: the gallery copy is a Blob off a
 * download and has no `name`.
 */
export async function uploadBusinessPhoto(businessId, file, folder = "gallery") {
  // `file.type || "image/jpeg"` on both paths, unchanged: an empty type is what
  // some browsers hand back for a perfectly ordinary JPEG, and defaulting is
  // what this function has always done.
  const type = file.type || "image/jpeg";

  if (MEDIA_VIA_DOOR) {
    // REFUSED HERE RATHER THAN AT THE DOOR, because the file is on the person's
    // phone and they can choose another one. The sentence names the five types
    // that work instead of the one that did not.
    if (!mediaExtForType(type)) throw new Error(DOOR_WORDS.badImageType);
    const fileId = crypto.randomUUID();
    const { uploadUrl, key, publicUrl } = readMediaStart(await door(businessId, {
      action: "start", store: "media", folder, file_id: fileId,
      content_type: type, claimed_bytes: file.size,
    }), { businessId, folder, fileId, type });

    // THE SIZE IS BINDING. The door signed `content-length: file.size` into
    // this URL, and a browser fills that header in from the body itself, so
    // sending a different file than the one measured fails at R2 rather than
    // landing uncounted.
    let put;
    try { put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": type }, body: file }); }
    catch (e) { throw doorError(e); }
    if (!put.ok) throw new Error(DOOR_WORDS.putFailed);
    return { url: publicUrl, key };
  }

  // `file.name` is absent on a plain Blob — the gallery copy is one — and
  // `undefined.split` would throw here rather than anywhere a reader is
  // looking. The extension off the name is this path's own habit; the door
  // path takes it off the content type instead.
  const ext = ((file.name ?? "").split(".").pop() || "jpg").toLowerCase();
  const key = `${businessId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("business-media").upload(key, file, {
    contentType: type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("business-media").getPublicUrl(key);
  return { url: data.publicUrl, key };
}

/**
 * Remove one business image. ROADMAP 0.11 slice 4.
 *
 * **IT TAKES A KEY, NOT A URL**, and follows the flag: `publishToGallery` uses
 * it to undo its own fresh upload when the `gallery_images` row fails. The
 * gallery's Remove uses `removeBusinessPhotoAt` below, which follows the
 * stored address instead (ROADMAP 0.11be).
 */
export async function removeBusinessPhoto(businessId, key) {
  if (MEDIA_VIA_DOOR) {
    const resp = await door(businessId, { action: "remove", store: "media", key });
    if (resp?.removed !== true) throw new Error(DOOR_WORDS.unreadable);
    return;
  }
  const { error } = await supabase.storage.from("business-media").remove([key]);
  if (error) throw new Error(error.message);
}

/**
 * ROADMAP 0.11be — remove the file behind one stored ADDRESS (a gallery row's
 * `image_url`, `before_url` or `after_url`). **The address decides the
 * store, not the flag:** rows written before the switch point at Supabase
 * Storage and keep doing so. Only this business's own objects are ever
 * removed — an external address or another business's file is left alone and
 * never guessed into a key (the door also refuses a foreign key on its side).
 * It throws on a refusal, so the caller can keep the row, and with it the
 * address a retry needs. Removing an old Supabase object is not a second
 * upload door: it only frees bytes. Already-gone is success on both stores.
 */
export async function removeBusinessPhotoAt(businessId, url) {
  // The old bucket's public prefix, from the client itself (no network).
  const oldBase = supabase.storage.from("business-media").getPublicUrl("").data.publicUrl;
  const at = storedMediaAt(url, { businessId, oldBase });
  if (at.kind === "r2") {
    readRemoved(await door(businessId, { action: "remove", store: "media", key: at.key }));
  } else if (at.kind === "supabase") {
    const { error } = await supabase.storage.from("business-media").remove([at.key]);
    if (error) throw new Error(error.message);
  }
}
