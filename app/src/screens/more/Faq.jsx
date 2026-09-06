// FAQ — the sixteenth settings screen, and the one the settings index has
// been carrying a note about since roadmap 2.11 step 6 stage 6.
//
// Its storage landed then (`20260902001000_faq_storage.sql`, "no writer and
// no reader on purpose") and its screen waited, which was the owner's own
// split. **What made it a gap rather than a plan is roadmap 3.2**: contract
// §6b, a tenant site draws an FAQ section, and until 3.2(b) the RPC did not
// publish the column either. So both halves close together — the site can now
// read it and the detailer can now write it. A stored column nobody can fill
// in is the same defect as a row that opens nothing.
//
// A LIST, NOT A FORM. It shares the settings skeleton and looks like Reviews
// rather than Notifications for the same reason: a question is a record, not
// a setting. Compose block, then the rows it has made.
//
// THE SWITCH IS SEPARATE FROM THE LIST BEING EMPTY, and the migration's own
// comment is why: "I have not written any yet" and "I do not want this
// section on my page" are two different answers, and a site that infers the
// second from the first deletes a section its owner is halfway through.
//
// ONE jsonb COLUMN, so this screen reads and writes the WHOLE list every
// time. That is the shape `travel_zones`, `vehicle_sizes` and `faqs` all
// chose, and at three to ten questions it costs nothing. The one thing it
// does mean: two people editing the FAQ at once, one overwrites the other —
// acceptable for a setting a business changes twice a year, and stated here
// rather than discovered.

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { Switch } from "../../components/controls.jsx";

const BLANK = { q: "", a: "" };

// A local id per row so React's keys survive a reorder. It is never stored —
// nothing points at a question, which is the whole reason `faqs` is jsonb and
// not a table.
const withKeys = (list) =>
  (Array.isArray(list) ? list : []).map((f, i) => ({
    key: `${i}-${String(f?.q ?? "").slice(0, 12)}`,
    q: String(f?.q ?? ""),
    a: String(f?.a ?? ""),
  }));

export default function Faq() {
  const { business, settings, reload } = useBusiness();
  const [rows, setRows] = useState(() => withKeys(settings?.faqs));
  const [enabled, setEnabled] = useState(settings?.faq_enabled ?? false);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState(null);   // index, or null when composing
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The context is the source of truth and it reloads after every write, so
  // this screen never holds a list the database disagrees with.
  useEffect(() => {
    setRows(withKeys(settings?.faqs));
    setEnabled(settings?.faq_enabled ?? false);
  }, [settings?.faqs, settings?.faq_enabled]);

  const persist = useCallback(async (nextRows, nextEnabled) => {
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("business_settings").update({
      faqs: nextRows.map(({ q, a }) => ({ q: q.trim(), a: a.trim() })),
      faq_enabled: nextEnabled,
    }).eq("business_id", business.id);
    // NOT `const { error } = await` and then ignored — a failed save that
    // leaves the screen looking saved is how a detailer loses an afternoon's
    // typing and never finds out.
    if (err) setError(err.message || "Could not save your questions.");
    else await reload();
    setBusy(false);
    return !err;
  }, [business.id, reload]);

  const save = async () => {
    if (!form.q.trim() || !form.a.trim()) return;
    const entry = { key: `n${Date.now()}`, q: form.q.trim(), a: form.a.trim() };
    const next = editing === null
      ? [...rows, entry]
      : rows.map((r, i) => (i === editing ? { ...r, q: entry.q, a: entry.a } : r));
    if (await persist(next, enabled)) {
      setForm(BLANK);
      setEditing(null);
    }
  };

  const remove = async (i) => {
    if (!confirm(`Delete "${rows[i].q}"?`)) return;
    if (editing === i) { setEditing(null); setForm(BLANK); }
    await persist(rows.filter((_, j) => j !== i), enabled);
  };

  // THE ORDER IS THE DETAILER'S, and it is the list's own order rather than a
  // `sort_order` field — which is the other thing jsonb buys. The most-asked
  // question belongs at the top and only they know which one that is.
  const move = async (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    if (editing === i) setEditing(j); else if (editing === j) setEditing(i);
    await persist(next, enabled);
  };

  return (
    <div className="card">
      <div className="thoughts">
        {/* THE DESTINATION IS THE NON-OBVIOUS FACT, so it keeps its sentence —
            the same call Reviews made, for the same reason. These appear
            nowhere in this product: the booking page's steps are on a measured
            height budget and a block of questions cannot go on one. */}
        <p className="quiet" style={{ marginTop: 0 }}>
          The questions customers actually ask you. They go on your website —
          that part is still being built.
        </p>

        {/* The help line is not a restatement of the label: it answers the
            question the switch raises, which is what happens to the words you
            already typed when you turn it off. */}
        <Switch
          label="Show this on your website"
          help="Off keeps what you have written, and just hides the section."
          checked={enabled}
          disabled={busy}
          onChange={(v) => { setEnabled(v); persist(rows, v); }}
        />

        <label className="field"><span>The question</span>
          <input value={form.q} placeholder="e.g. Do you need my water?"
            onChange={(e) => setForm({ ...form, q: e.target.value })} /></label>

        <label className="field"><span>Your answer</span>
          <textarea value={form.a} rows={3}
            placeholder="In your own words. Nothing here is written for you."
            onChange={(e) => setForm({ ...form, a: e.target.value })} /></label>

        <div className="btnrow">
          <button className="btn primary" disabled={busy || !form.q.trim() || !form.a.trim()} onClick={save}>
            {editing === null ? "Add question" : "Save changes"}
          </button>
          {editing !== null && (
            <button className="btn" onClick={() => { setEditing(null); setForm(BLANK); }}>Cancel</button>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* AN EMPTY SCREEN IS ONE SENTENCE, NAMED IN THE CUSTOMER'S TERMS
            (§11's state rule) — never "No records." */}
        {rows.length === 0 && !error && (
          <p className="body">Nothing here yet — your website has no questions section.</p>
        )}

        <div className={`rows rows-stack${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          {rows.map((r, i) => (
            <div className="row-item" key={r.key} style={{ cursor: "default", opacity: enabled ? 1 : 0.5 }}>
              <button className="txt"
                style={{ background: "none", border: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
                onClick={() => { setEditing(i); setForm({ q: r.q, a: r.a }); }}>
                <span className="nm">{r.q}</span>
                {/* A QUESTION IS THE ANSWER. One ellipsised line is the thing
                    this row must not be, so it takes two before it clips. */}
                <span className="sub clamp2">{r.a}</span>
              </button>
              <button className="btn sm inline icon ghost" aria-label={`Move "${r.q}" up`}
                disabled={i === 0 || busy} onClick={() => move(i, -1)}><ChevronUp strokeWidth={2} /></button>
              <button className="btn sm inline icon ghost" aria-label={`Move "${r.q}" down`}
                disabled={i === rows.length - 1 || busy} onClick={() => move(i, 1)}><ChevronDown strokeWidth={2} /></button>
              <button className="btn sm inline icon ghost" aria-label={`Delete "${r.q}"`}
                disabled={busy} onClick={() => remove(i)}><X strokeWidth={2} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
