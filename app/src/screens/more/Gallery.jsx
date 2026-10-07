// Photo gallery for the public site. REAL uploads: pick a photo on your
// phone, it goes to Supabase Storage under this business's folder. (The old
// gallery made the admin paste a Cloudinary URL into a text box.)

import { useCallback, useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { uploadBusinessPhoto } from "../../lib/upload.js";
import { signedUrls } from "../../lib/photos.js";
import {
  assertOwned, assertPathOwned, buildZip, photoRows, photosCsv, photosFilename,
} from "../../lib/photo-export.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

export default function Gallery() {
  useAppLocale();
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
      setMsg({ ok: true, text: t(files.length === 1 ? "{count} photo added." : "{count} photos added.", { count: files.length }) });
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
    if (!confirm(t("Remove this photo from the gallery?"))) return;
    await supabase.from("gallery_images").delete().eq("id", img.id).eq("business_id", business.id);
    load();
  };

  // ── "YOUR PHOTOS ARE YOURS. YOU EXPORT THEM AND GO" — MADE TRUE ─────────
  // Andrew's yes, 2026-09-21. `lib/customer-export.js` shipped the customers
  // half and named this half as still unkept, in its own words.
  //
  // **IT READS BOTH STORES, because the promise is "your photos".** The job
  // photos in the private `job-photos` bucket AND the marketing gallery in
  // `business-media`. A zip with only one of them would satisfy the sentence
  // and not the promise.
  //
  // **ITS OWN READ, NOT THE SCREEN'S.** `images` above holds the gallery and
  // nothing else, and no job photo has ever been on this screen. Exporting
  // what the screen holds would ship a fraction of the promise.
  //
  // **AND IT PAGES.** PostgREST caps a response at 1,000 rows. A detailer two
  // years in is past that on `job_photos` alone, and the 1,001st photo would
  // simply not be in the file.
  //
  // **WHY WHAT COMES OUT BELONGS ONLY TO THIS BUSINESS, THREE WAYS.** The
  // rows: every select is `.eq("business_id", business.id)` on the ordinary
  // authenticated browser client, and `job_photos` is RLS'd on
  // `business_id in (select public.current_business_ids())`. The files: the
  // `job-photos` bucket is PRIVATE and its storage policy requires the first
  // folder of the object path to be one of your business ids, which
  // `addPhoto` writes structurally as `${businessId}/${bookingId}/…`. And
  // then this code checks both again itself — `assertOwned` on every set and
  // `assertPathOwned` on every path — because this is the layer that decides
  // which bytes land in somebody's Downloads folder, and a future refactor
  // will read this file long before it reads a migration.
  const [exporting, setExporting] = useState("");
  const exportPhotos = async () => {
    setExporting("Reading…");
    setMsg(null);
    const readAll = async (build) => {
      const out = [];
      const SIZE = 1000;
      for (let from = 0; ; from += SIZE) {
        const r = await build().range(from, from + SIZE - 1);
        if (r.error) throw new Error(r.error.message);
        out.push(...(r.data ?? []));
        if ((r.data?.length ?? 0) < SIZE) return out;
      }
    };
    // A URL has a length limit, so `in(...)` is chunked rather than hopeful.
    const readIn = async (table, cols, ids) => {
      const out = [];
      for (let i = 0; i < ids.length; i += 200) {
        const r = await supabase.from(table).select(cols)
          .eq("business_id", business.id).in("id", ids.slice(i, i + 200));
        if (r.error) throw new Error(r.error.message);
        out.push(...(r.data ?? []));
      }
      return out;
    };
    try {
      const [photos, gallery] = await Promise.all([
        readAll(() => supabase.from("job_photos").select("*")
          .eq("business_id", business.id).order("created_at", { ascending: true })),
        readAll(() => supabase.from("gallery_images").select("*")
          .eq("business_id", business.id).order("sort_order")),
      ]);
      assertOwned(photos, business.id, "job photo");
      assertOwned(gallery, business.id, "gallery image");

      const bookingIds = [...new Set(photos.map((p) => p.booking_id).filter(Boolean))];
      const bks = bookingIds.length
        ? await readIn("bookings", "id, customer_name, start_at", bookingIds) : [];
      assertOwned(bks.map((b) => ({ ...b, business_id: business.id })), business.id, "booking");
      // The service NAME AS BOOKED, so a photo from two years ago is filed
      // under what the job was called then rather than what it is called now.
      const svc = new Map();
      if (bookingIds.length) {
        for (let i = 0; i < bookingIds.length; i += 200) {
          const r = await supabase.from("booking_services").select("booking_id, name_at_booking")
            .eq("business_id", business.id).in("booking_id", bookingIds.slice(i, i + 200));
          if (r.error) throw new Error(r.error.message);
          for (const row of r.data ?? []) {
            svc.set(row.booking_id, [...(svc.get(row.booking_id) ?? []), row.name_at_booking]);
          }
        }
      }
      const bookings = new Map(bks.map((b) => [b.id, {
        customer_name: b.customer_name, start_at: b.start_at,
        service_name: (svc.get(b.id) ?? []).join(" + "),
      }]));

      const rows = photoRows({ photos, bookings, gallery, timezone: business.timezone });
      // ROADMAP 0.11, SLICE 1 — the private job photos are read through the
      // photo door, signed for the hour in one pass up front. A refusal here
      // stops the whole export in words, never a zip that is quietly empty.
      const signed = await signedUrls(rows.filter((r) => r._path).map((r) => r._path));
      const files = [];
      const missed = [];
      let n = 0;
      for (const r of rows) {
        n++;
        setExporting(t("Packing {n} of {total}…", { n, total: rows.length }));
        try {
          let bytes;
          if (r._path) {
            assertPathOwned(r._path, business.id);
            if (!signed[r._path]) throw new Error("no link for this photo");
            const res = await fetch(signed[r._path]);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            bytes = new Uint8Array(await res.arrayBuffer());
          } else {
            const res = await fetch(r._url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            bytes = new Uint8Array(await res.arrayBuffer());
          }
          files.push({ name: r.file, bytes });
        } catch (err) {
          // **A FILE THAT DID NOT COME DOWN IS NAMED, NEVER DROPPED.** A zip
          // quietly one photo short is the same defect as a CSV quietly one
          // customer short, and nobody checks an archive against a database.
          missed.push(`${r.file}  —  ${String(err.message || err).slice(0, 120)}`);
        }
      }
      files.push({
        name: "manifest.csv",
        bytes: new TextEncoder().encode(photosCsv({ photos, bookings, gallery, timezone: business.timezone })),
      });
      if (missed.length) {
        files.push({
          name: "could-not-download.txt",
          bytes: new TextEncoder().encode(
            `${missed.length} file(s) in the manifest could not be downloaded:\n\n${missed.join("\n")}\n`),
        });
      }
      const name = photosFilename(business.name);
      const blob = new Blob([buildZip(files)], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMsg({
        ok: missed.length === 0,
        text: missed.length
          ? t("{n} photos saved. {m} could not be downloaded and are listed in the zip.",
            { n: files.length - 2, m: missed.length })
          : t("{n} photos saved.", { n: rows.length }),
      });
    } catch (err) {
      setMsg({ ok: false, text: t("That didn't save. {reason}", { reason: String(err.message || err) }) });
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="card">
      <label className="btn primary" style={{ cursor: "pointer" }}>
        {busy ? "Uploading…" : <><Camera size={18} strokeWidth={2} /> {t("Add photos")}</>}
        <input type="file" accept="image/*" multiple hidden onChange={addPhotos} disabled={busy} />
      </label>
      <button className="btn sm" style={{ marginLeft: 8 }} onClick={exportPhotos} disabled={!!exporting || busy}>
        {exporting || t("Export my photos")}
      </button>
      {/* SURVEY FINDING 7 — see the note in Clients.jsx. Each export names
          the other, so "you export them and go" is findable from either. */}
      <p className="quiet" style={{ margin: "6px 0 0" }}>
        {t("Your customer list exports separately, from the Clients screen.")}
      </p>
      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <div className="gallery-grid" style={{ marginTop: 12 }}>
        {images.map((img) => (
          <div key={img.id} style={{ position: "relative", opacity: img.is_active ? 1 : 0.4 }}>
            <img src={img.image_url || img.after_url} alt={img.caption || ""} onClick={() => toggle(img)} />
            <button className="btn ghost inline" style={{ position: "absolute", top: 2, right: 2, minHeight: 32, padding: "0 8px" }}
              onClick={() => remove(img)} aria-label={t("Remove")}><X size={16} strokeWidth={2} /></button>
          </div>
        ))}
      </div>
      {/* **IT TOLD YOU TO TAP A PHOTO WHEN THERE WERE NONE — 2026-09-12.** One
          sentence was doing two jobs: saying the shelf is empty, and
          explaining a gesture that only exists once something is on it. Split,
          so each is true when it is shown. */}
      {images.length === 0
        ? <p className="muted" style={{ marginTop: 8 }}>{t("No photos yet.")}</p>
        : <p className="muted" style={{ marginTop: 8 }}>{t("Choose a photo to hide it from your site.")}</p>}
    </div>
  );
}
