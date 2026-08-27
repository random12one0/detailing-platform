// Real photo upload (the old gallery made the admin paste a Cloudinary URL).
// Files go to the business-media bucket under this business's own folder —
// storage RLS rejects writes into any other business's folder.

import { supabase } from "./supabase.js";

export async function uploadBusinessPhoto(businessId, file, folder = "gallery") {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const key = `${businessId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("business-media").upload(key, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("business-media").getPublicUrl(key);
  return data.publicUrl;
}
