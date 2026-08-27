// Photo gallery for the public site. REAL uploads: pick a photo on your
// phone, it goes to Supabase Storage under this business's folder. (The old
// gallery made the admin paste a Cloudinary URL into a text box.)

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { uploadBusinessPhoto } from "../../lib/upload.js";

export default function Gallery() {
  const { business } = useBusiness();
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order")
      .order("created_at", { ascending: false });
    setImages(data ?? []);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    setMsg(null);
    try {
      for (const file of files) {
        const url = await uploadBusinessPhoto(business.id, file, "gallery");
        const { error } = await supabase.from("gallery_images").insert({
          business_id: business.id,
          kind: "single",
          image_url: url,
        });
        if (error) throw new Error(error.message);
      }
      setMsg({ ok: true, text: `${files.length} photo${files.length > 1 ? "s" : ""} added.` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    setBusy(false);
    load();
  };

  const toggle = async (img) => {
    await supabase.from("gallery_images").update({ is_active: !img.is_active }).eq("id", img.id).eq("business_id", business.id);
    load();
  };

  const remove = async (img) => {
    if (!confirm("Remove this photo from the gallery?")) return;
    await supabase.from("gallery_images").delete().eq("id", img.id).eq("business_id", business.id);
    load();
  };

  return (
    <div className="card">
      <label className="btn primary" style={{ cursor: "pointer" }}>
        {busy ? "Uploading…" : "📷 Add photos"}
        <input type="file" accept="image/*" multiple hidden onChange={addPhotos} disabled={busy} />
      </label>
      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <div className="gallery-grid" style={{ marginTop: 12 }}>
        {images.map((img) => (
          <div key={img.id} style={{ position: "relative", opacity: img.is_active ? 1 : 0.4 }}>
            <img src={img.image_url || img.after_url} alt={img.caption || ""} onClick={() => toggle(img)} />
            <button className="btn ghost inline" style={{ position: "absolute", top: 2, right: 2, minHeight: 32, padding: "0 8px" }}
              onClick={() => remove(img)}>✕</button>
          </div>
        ))}
      </div>
      {images.length === 0 && <p className="muted" style={{ marginTop: 8 }}>No photos yet. Tap a photo to hide/show it on your site.</p>}
    </div>
  );
}
