// Before and after, on the job.
//
// `docs/detailer-dashboard-audit-2026-09-06.md` §3.1 — the biggest gap in the
// detailer's dashboard, and the owner said build it. The marketing gallery
// (`gallery_images`) is for the public site; this is the car in front of you.
//
// WHY IT IS ITS OWN COMPONENT rather than another block inside
// `BookingDetail.jsx`: that file is already 500 lines and every section in it
// is text the product knows. This one owns a file input, a resize, an upload,
// an expiring URL and a budget — five things with their own failure modes,
// none of which the job record should have to hold.

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import {
  KINDS, addPhoto, budgetFor, budgetWords, mb, publishToGallery, removePhoto,
  roomFor, signedUrls,
} from "../lib/photos.js";

export default function JobPhotos({ booking }) {
  const { business, can } = useBusiness();
  const [photos, setPhotos] = useState(null);      // null = not read yet
  const [urls, setUrls] = useState({});
  const [budget, setBudget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const pick = useRef(null);
  const kindRef = useRef("before");

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("job_photos")
      .select("*").eq("booking_id", booking.id).order("created_at");
    // THE ERROR IS NOT AN EMPTY LIST. `const { data } = await q` turning a
    // dropped connection into "no photos yet" is the exact defect this repo
    // has now found four times — and here it would tell a detailer their
    // evidence is gone.
    if (e) { setError(e.message); setPhotos([]); return; }
    setPhotos(data ?? []);
    try {
      if (data?.length) setUrls(await signedUrls(data.map((p) => p.path)));
      setBudget(await budgetFor(business.id));
    } catch (err) { setError(String(err.message ?? err)); }
  }, [booking.id, business.id]);

  useEffect(() => { load(); }, [load]);

  async function onFiles(files) {
    setError("");
    setBusy(true);
    try {
      for (const file of [...files]) {
        // THE GUARD IS BEFORE THE UPLOAD, not after: an upload that succeeds
        // and is then rejected has already spent the bytes. It uses the file's
        // ORIGINAL size, which is the pessimistic end — the resize will land
        // it far lower, so this never lets somebody through who should not be.
        if (!roomFor(file.size, budget)) {
          setError("Photo storage is full. Remove some photos to add more.");
          break;
        }
        await addPhoto({ file, businessId: business.id, bookingId: booking.id, kind: kindRef.current });
      }
      await load();
    } catch (err) {
      setError(String(err.message ?? err));
    } finally {
      setBusy(false);
      if (pick.current) pick.current.value = "";
    }
  }

  async function drop(photo) {
    if (!confirm("Delete this photo? A before-photo is what settles an argument about a scratch.")) return;
    setBusy(true);
    try { await removePhoto(photo); await load(); }
    catch (err) { setError(String(err.message ?? err)); }
    finally { setBusy(false); }
  }

  async function publish(photo) {
    setBusy(true);
    try { await publishToGallery(photo, business.id); await load(); }
    catch (err) { setError(String(err.message ?? err)); }
    finally { setBusy(false); }
  }

  // A SECTION WITH NOTHING IN IT IS NOT DRAWN (screen designs §1a) — but the
  // ADD control is not "nothing in it", it is the whole point on a job that has
  // no photos yet. So the heading is always here and only the groups are
  // conditional.
  const warn = budgetWords(budget);

  return (
    <>
      <h3 className="section-title" data-tour="photos">Photos</h3>
      <div className="card tight">
        {error && <p className="error-box">{error}</p>}
        {warn && <p className="quiet">{warn}</p>}

        {photos === null ? (
          <p className="quiet">Loading…</p>
        ) : (
          KINDS.map(([kind, word]) => {
            const mine = photos.filter((p) => p.kind === kind);
            return (
              <div key={kind} className="tight">
                <div className="photo-head">
                  <span className="label">{word}{mine.length > 0 ? ` · ${mine.length}` : ""}</span>
                  <button className="btn small" disabled={busy}
                    onClick={() => { kindRef.current = kind; pick.current?.click(); }}>
                    <Camera size={16} strokeWidth={2} /> Add
                  </button>
                </div>
                {mine.length > 0 && (
                  <div className="photo-strip">
                    {mine.map((p) => (
                      <button key={p.id} className="photo-thumb" onClick={() => setOpen(p)}>
                        {urls[p.path]
                          ? <img src={urls[p.path]} alt={`${word} — ${booking.customer_name}`} loading="lazy" />
                          : <span className="quiet">…</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* `capture="environment"` asks a phone for the BACK camera rather
            than the gallery, which is what somebody standing beside the car
            wants. A desktop ignores it and offers files, which is what
            somebody at a laptop wants. One attribute, both behaviours. */}
        <input ref={pick} type="file" accept="image/*" capture="environment" multiple
          hidden onChange={(e) => e.target.files?.length && onFiles(e.target.files)} />

        {photos?.length > 0 && budget && (
          <p className="quiet">{photos.length} on this job · {mb(budget.used_bytes)} of {mb(budget.cap_bytes)} used</p>
        )}
      </div>

      {open && (
        <div className="photo-view" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <img src={urls[open.path]} alt={open.kind} onClick={(e) => e.stopPropagation()} />
          <div className="row" style={{ gap: 8 }} onClick={(e) => e.stopPropagation()}>
            {can("settings") && !open.gallery_id && (
              <button className="btn small" disabled={busy} onClick={() => publish(open).then(() => setOpen(null))}>
                <Upload size={16} strokeWidth={2} /> Put on my website
              </button>
            )}
            {open.gallery_id && <span className="quiet"><ImageIcon size={15} /> On your website</span>}
            {can("settings") && (
              <button className="btn small warn" disabled={busy}
                onClick={() => drop(open).then(() => setOpen(null))}>
                <Trash2 size={16} strokeWidth={2} /> Delete
              </button>
            )}
            <button className="btn small" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
