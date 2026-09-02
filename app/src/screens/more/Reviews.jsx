// Reviews — the twelfth settings screen, and a table that has never had a
// door. Roadmap 2.11 step 6, stage 6.
//
// `testimonials` has existed since the first tenant-data migration
// (20260827000200), `get_public_business_profile` already returns the active
// ones, and `BookingBusinessContext` already puts them on the booking page's
// context. Nothing in the product could ever write one. It is one of four
// tables in that state (architecture audit §2c item 4) and the only one of
// the four the owner named as something Phase 3's websites need.
//
// WHERE THE WORDS ACTUALLY APPEAR TODAY, WHICH THIS SCREEN SAYS OUT LOUD.
// The booking page READS them and does not yet DRAW them — its steps are on
// a measured height budget (W16: a customer never scrolls inside a step, and
// step 1 has 10px spare at 1440x900), so a block of quotes cannot be dropped
// into one. The tenant websites are where they were always going. A screen
// that collected words and implied they were live somewhere would be the
// push switch again one screen over, so the blurb names the destination
// rather than leaving the detailer to assume.
//
// A LIST, NOT A FORM, which is why this file does not look like Notifications
// even though it shares the settings skeleton. The skeleton is "a row per
// setting, its control on the right, a plain sentence underneath"; a review
// is not a setting, it is a record, and the shape it takes is the one Promos
// and Gallery already use — a compose block, then the rows it has made.
//
// HIDE, NEVER DELETE, is the one judgment here. `is_active` is what the
// public read filters on, and a review is somebody else's words about a job
// that happened. Taking one down should not destroy it, and a detailer who
// hides the wrong one has to be able to put it back. Delete stays available
// and asks first, the same as a gallery photo.

import { useCallback, useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { Segmented } from "../../components/controls.jsx";

const BLANK = { author: "", quote: "", rating: 5, source: "" };
const RATINGS = [[5, "5"], [4, "4"], [3, "3"], [2, "2"], [1, "1"]];

export default function Reviews() {
  const { business } = useBusiness();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState(null);   // id, or null when composing
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    // NOT `const { data } = await` — the fourth site of the line that turned a
    // dropped connection into "nothing here yet" (useBookings, Money's
    // loadExtras, the Clients list). An empty reviews screen and a failed
    // read look identical and mean opposite things.
    const { data, error: err } = await supabase
      .from("testimonials")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order")
      .order("created_at", { ascending: false });
    setError(err ? (err.message || "Could not load your reviews.") : "");
    if (data) setRows(data);
    setBusy(false);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.author.trim() || !form.quote.trim()) return;
    setError("");
    const values = {
      business_id: business.id,
      author: form.author.trim(),
      quote: form.quote.trim(),
      rating: Number(form.rating) || 5,
      source: form.source.trim() || null,
    };
    const { error: err } = editing
      ? await supabase.from("testimonials").update(values).eq("id", editing).eq("business_id", business.id)
      : await supabase.from("testimonials").insert(values);
    if (err) { setError(err.message); return; }
    setForm(BLANK);
    setEditing(null);
    load();
  };

  const toggle = async (r) => {
    await supabase.from("testimonials").update({ is_active: !r.is_active })
      .eq("id", r.id).eq("business_id", business.id);
    load();
  };

  const remove = async (r) => {
    if (!confirm(`Delete this review from ${r.author} for good? Hiding it keeps the words.`)) return;
    await supabase.from("testimonials").delete().eq("id", r.id).eq("business_id", business.id);
    if (editing === r.id) { setEditing(null); setForm(BLANK); }
    load();
  };

  return (
    <div className="card">
      <div className="thoughts">
        {/* THE TIMING IS THE NON-OBVIOUS FACT, so it keeps its clause. “These
            go on your website” on its own is a promise the product cannot
            keep yet — the websites are Phase 3 — and a detailer who types in
            three reviews and then goes looking for them has been misled by
            one sentence. The copy rule bans a sentence that repeats the
            label; this one carries a fact nothing else on the screen does. */}
        <p className="quiet" style={{ marginTop: 0 }}>
          What customers have said about your work. They go on your website —
          that part is still being built, so collect them now and they will be
          there when it lands.
        </p>

        <label className="field"><span>Who said it</span>
          <input value={form.author} placeholder="First name and last initial"
            onChange={(e) => setForm({ ...form, author: e.target.value })} /></label>

        <label className="field"><span>What they said</span>
          <textarea value={form.quote} rows={3}
            placeholder="Their words, not yours."
            onChange={(e) => setForm({ ...form, quote: e.target.value })} /></label>

        {/* NOT PAIRED. Measured at 392: a five-cell segmented control beside
            a text field leaves the field 96px wide and wraps its label onto
            two lines, which then pushes the two controls out of line with
            each other. § THE 320 FLOOR already stacks paired fields at 320;
            this pair does not survive 392 either, so it is not a pair. */}
        <label className="field"><span>Stars</span>
            {/* Five options, and a segmented control is what the design
                system asks for at that count. The number is what a website
                draws stars from, so it is stored as one. */}
          <Segmented label="Stars" value={Number(form.rating)} options={RATINGS}
            onChange={(v) => setForm({ ...form, rating: v })} /></label>
        <label className="field"><span>Where it came from</span>
          <input value={form.source} placeholder="Google, in person, a text…"
            onChange={(e) => setForm({ ...form, source: e.target.value })} /></label>

        <div className="btnrow">
          <button className="btn primary" onClick={save}
            disabled={!form.author.trim() || !form.quote.trim()}>
            {editing ? "Save changes" : "Add review"}
          </button>
          {editing && (
            <button className="btn" onClick={() => { setEditing(null); setForm(BLANK); }}>Cancel</button>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* AN EMPTY SCREEN IS ONE SENTENCE, NAMED IN THE CUSTOMER'S TERMS
            (§11's state rule) — never "No records." */}
        {!busy && !error && rows.length === 0 && (
          <p className="body">No reviews yet — your website has nothing from a customer on it.</p>
        )}

        <div className={`rows${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          {rows.map((r) => (
            <div className="row-item" key={r.id} style={{ cursor: "default", opacity: r.is_active ? 1 : 0.5 }}>
              <button className="txt"
                style={{ background: "none", border: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
                onClick={() => { setEditing(r.id); setForm({ author: r.author, quote: r.quote, rating: r.rating, source: r.source || "" }); }}>
                <span className="nm">
                  {r.author}
                  <span className="stars" aria-label={`${r.rating} of 5`}>
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} size={12} strokeWidth={0} fill="currentColor" aria-hidden="true" />
                    ))}
                  </span>
                </span>
                {/* A REVIEW IS THE WORDS. One ellipsised line is the one
                    thing this row must not be, so it takes two before it
                    clips — enough to recognise which review it is without
                    the list becoming a page of prose. */}
                <span className="sub clamp2">{r.quote}</span>
              </button>
              <button className="btn sm inline ghost" onClick={() => toggle(r)}>
                {r.is_active ? "Hide" : "Show"}
              </button>
              <button className="btn sm inline icon ghost" aria-label={`Delete the review from ${r.author}`}
                onClick={() => remove(r)}><X strokeWidth={2} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
