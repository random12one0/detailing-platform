// Business identity + branding. Every value here feeds the public site and
// the emails — nothing about the business is hardcoded anywhere. Logo and
// hero are REAL file uploads to Supabase Storage (no more pasting URLs).

import { useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { uploadBusinessPhoto } from "../../lib/upload.js";

export default function BusinessInfo() {
  const { business, branding, settings, reload } = useBusiness();
  const [biz, setBiz] = useState({
    name: business.name,
    contact_email: business.contact_email || "",
    contact_phone: business.contact_phone || "",
    dropoff_address: business.dropoff_address || "",
    service_area: business.service_area || "",
    timezone: business.timezone,
  });
  const [brand, setBrand] = useState({
    primary_color: branding?.primary_color || "#0f172a",
    secondary_color: branding?.secondary_color || "#0ea5e9",
    tagline: branding?.tagline || "",
    about_copy: branding?.about_copy || "",
    logo_url: branding?.logo_url || "",
    hero_image_url: branding?.hero_image_url || "",
    social_instagram: branding?.social_instagram || "",
    social_google: branding?.social_google || "",
    social_yelp: branding?.social_yelp || "",
  });
  const [reviews, setReviews] = useState({
    google_review_url: settings?.google_review_url || "",
    yelp_review_url: settings?.yelp_review_url || "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const nn = (v) => (v.trim() === "" ? null : v.trim());
    const [r1, r2, r3] = await Promise.all([
      supabase.from("businesses").update({
        name: biz.name.trim(),
        contact_email: nn(biz.contact_email),
        contact_phone: nn(biz.contact_phone),
        dropoff_address: nn(biz.dropoff_address),
        service_area: nn(biz.service_area),
        timezone: biz.timezone.trim(),
      }).eq("id", business.id),
      supabase.from("business_branding").upsert({
        business_id: business.id,
        primary_color: brand.primary_color,
        secondary_color: brand.secondary_color,
        tagline: nn(brand.tagline),
        about_copy: nn(brand.about_copy),
        logo_url: nn(brand.logo_url),
        hero_image_url: nn(brand.hero_image_url),
        social_instagram: nn(brand.social_instagram),
        social_google: nn(brand.social_google),
        social_yelp: nn(brand.social_yelp),
      }),
      supabase.from("business_settings").update({
        google_review_url: nn(reviews.google_review_url),
        yelp_review_url: nn(reviews.yelp_review_url),
      }).eq("business_id", business.id),
    ]);
    const err = r1.error || r2.error || r3.error;
    setMsg(err ? { ok: false, text: err.message } : { ok: true, text: "Saved." });
    if (!err) reload();
    setBusy(false);
  };

  const upload = async (e, field, folder) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await uploadBusinessPhoto(business.id, file, folder);
      setBrand((b) => ({ ...b, [field]: url }));
      setMsg({ ok: true, text: "Photo uploaded — press Save to keep it." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    setBusy(false);
  };

  return (
    <div className="card">
      <label className="field"><span>Business name</span>
        <input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} /></label>
      <div className="grid2">
        <label className="field"><span>Contact email (gets notifications)</span>
          <input value={biz.contact_email} onChange={(e) => setBiz({ ...biz, contact_email: e.target.value })} /></label>
        <label className="field"><span>Phone</span>
          <input value={biz.contact_phone} onChange={(e) => setBiz({ ...biz, contact_phone: e.target.value })} /></label>
      </div>
      <label className="field"><span>Drop-off address</span>
        <input value={biz.dropoff_address} onChange={(e) => setBiz({ ...biz, dropoff_address: e.target.value })} /></label>
      <div className="grid2">
        <label className="field"><span>Service area (shown on your site)</span>
          <input value={biz.service_area} onChange={(e) => setBiz({ ...biz, service_area: e.target.value })} placeholder="e.g. Lakewood, California" /></label>
        <label className="field"><span>Timezone</span>
          <input value={biz.timezone} onChange={(e) => setBiz({ ...biz, timezone: e.target.value })} placeholder="America/Los_Angeles" /></label>
      </div>

      <div className="section-title">Branding</div>
      <div className="grid2">
        <label className="field"><span>Primary color</span>
          <input type="color" value={brand.primary_color} onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })} /></label>
        <label className="field"><span>Accent color</span>
          <input type="color" value={brand.secondary_color} onChange={(e) => setBrand({ ...brand, secondary_color: e.target.value })} /></label>
      </div>
      <label className="field"><span>Tagline</span>
        <input value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} /></label>
      <label className="field"><span>About / owner bio</span>
        <textarea value={brand.about_copy} onChange={(e) => setBrand({ ...brand, about_copy: e.target.value })} /></label>

      <div className="grid2">
        <label className="field"><span>Logo</span>
          {brand.logo_url && <img src={brand.logo_url} alt="logo" style={{ height: 48, marginBottom: 6, borderRadius: 8 }} />}
          <input type="file" accept="image/*" onChange={(e) => upload(e, "logo_url", "branding")} /></label>
        <label className="field"><span>Hero photo</span>
          {brand.hero_image_url && <img src={brand.hero_image_url} alt="hero" style={{ height: 48, marginBottom: 6, borderRadius: 8, objectFit: "cover" }} />}
          <input type="file" accept="image/*" onChange={(e) => upload(e, "hero_image_url", "branding")} /></label>
      </div>

      <div className="section-title">Links</div>
      <label className="field"><span>Instagram URL</span>
        <input value={brand.social_instagram} onChange={(e) => setBrand({ ...brand, social_instagram: e.target.value })} /></label>
      <div className="grid2">
        <label className="field"><span>Google review link</span>
          <input value={reviews.google_review_url} onChange={(e) => setReviews({ ...reviews, google_review_url: e.target.value })} /></label>
        <label className="field"><span>Yelp review link</span>
          <input value={reviews.yelp_review_url} onChange={(e) => setReviews({ ...reviews, yelp_review_url: e.target.value })} /></label>
      </div>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
    </div>
  );
}
