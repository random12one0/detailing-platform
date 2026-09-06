// Campaign links — the eighteenth settings screen. Roadmap 4.2.
//
// A working feature the rebuild lost. On the old site this was live end to
// end: `App.js:54` called `trackVisit()` on every page load, `lib/campaign.js`
// stored the campaign and auto-applied its promo code, and `MoreScreen.jsx:82`
// was the **Campaign Links** screen that read the numbers back. The tables
// survived the conversion and nothing called them — *a surviving table is not
// a surviving feature*, which is how three empty tables got counted as kept.
//
// WHAT IT IS FOR, in the detailer's own case: a QR code on a flyer at a golf
// course. Somebody scans it, lands on the booking page with the discount
// ALREADY APPLIED, and the detailer can later see that the flyer produced
// forty scans and three bookings. **The auto-apply is the feature and the
// counting is the report on it** — a code somebody has to remember off a sign
// is a code nobody uses.
//
// TWO NUMBERS PER ROW AND NO CHART. Scans and bookings. With fewer than ten
// customers every trend line is noise, and the question a detailer actually
// has is "was the flyer worth it", which is two integers.
//
// THE PROMO CODE IS A CODE THEY ALREADY HAVE, chosen from Promo codes rather
// than typed here. A campaign that invented its own would be a second place
// discounts are defined, and the one that is not on the Promo codes screen is
// the one nobody remembers to turn off.

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import BookingLink from "../../components/BookingLink.jsx";

// The same shape the database's own check constraint allows
// (`slug ~ '^[a-z0-9][a-z0-9-]*$'`), applied while they type so the refusal is
// never a database error message.
const slugify = (v) => String(v || "").toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const BLANK = { name: "", slug: "", promo_code: "" };

export default function Campaigns() {
  const { business, siteOrigin } = useBusiness();
  const [rows, setRows] = useState([]);
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState({ visits: {}, bookings: {} });
  const [form, setForm] = useState(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState(null);
  const [open, setOpen] = useState(null);   // which row is showing its link

  const load = useCallback(async () => {
    setBusy(true);
    // NOT `const { data } = await` with the error dropped — an empty list and
    // a failed read look identical and mean opposite things.
    const [c, p, v, b] = await Promise.all([
      supabase.from("campaigns").select("id, slug, name, promo_code, is_active, created_at")
        .eq("business_id", business.id).order("created_at", { ascending: false }),
      supabase.from("promo_codes").select("code").eq("business_id", business.id).eq("is_active", true).order("code"),
      // COUNTED IN THE BROWSER because the numbers are small and a detailer
      // has a handful of campaigns. A view or an RPC would be the right answer
      // at a thousand, and this screen would be the wrong place to find that
      // out — the row count is what tells us, not a guess now.
      supabase.from("campaign_visits").select("campaign_id").eq("business_id", business.id),
      supabase.from("bookings").select("campaign_id").eq("business_id", business.id)
        .not("campaign_id", "is", null).neq("status", "cancelled").is("deleted_at", null),
    ]);
    setError(c.error ? (c.error.message || "Could not load your campaign links.") : "");
    if (c.data) setRows(c.data);
    if (p.data) setCodes(p.data.map((x) => x.code));
    const tally = (list) => (list ?? []).reduce((a, r) => {
      if (r.campaign_id) a[r.campaign_id] = (a[r.campaign_id] || 0) + 1;
      return a;
    }, {});
    setStats({ visits: tally(v.data), bookings: tally(b.data) });
    setBusy(false);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const slug = slugify(slugTouched ? form.slug : form.name);
    if (!form.name.trim() || !slug) return;
    setNote(null);
    const { error: err } = await supabase.from("campaigns").insert({
      business_id: business.id,
      name: form.name.trim(),
      slug,
      promo_code: form.promo_code || null,
    });
    if (err) {
      // The (business_id, slug) pair is unique, and "duplicate key" tells a
      // detailer nothing about what to do next.
      setNote({ ok: false, text: /duplicate|unique/i.test(err.message)
        ? `You already have a link called ${slug}.` : err.message });
      return;
    }
    setForm(BLANK);
    setSlugTouched(false);
    load();
  };

  const toggle = async (r) => {
    await supabase.from("campaigns").update({ is_active: !r.is_active })
      .eq("id", r.id).eq("business_id", business.id);
    load();
  };

  // TURNED OFF, NEVER DELETED, unless they insist. The visits and the bookings
  // point at the row; deleting it sets those to null and the flyer's whole
  // history becomes "organic". `on delete set null` is what makes that quiet
  // rather than an error, which is exactly why the screen has to say it.
  const remove = async (r) => {
    if (!confirm(`Delete ${r.name} for good? Its scans and bookings stop being counted against it. Turning it off keeps the numbers.`)) return;
    await supabase.from("campaigns").delete().eq("id", r.id).eq("business_id", business.id);
    load();
  };

  const previewSlug = slugify(slugTouched ? form.slug : form.name);

  return (
    <div className="card">
      <div className="thoughts">
        {/* THE FACT THE LABEL DOES NOT CARRY: what the link DOES when somebody
            opens it. "Campaign link" reads as tracking; the half that earns
            its place is that the discount is already on. */}
        <p className="quiet" style={{ marginTop: 0 }}>
          A booking link of its own for a flyer, a QR code or a post. Whoever
          opens it gets your discount applied already, and you can see how many
          came that way.
        </p>

        <label className="field"><span>What is it for</span>
          <input value={form.name} placeholder="e.g. Golf course flyer"
            onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>

        <div className="grid2">
          <label className="field"><span>The bit on the end of the link</span>
            <input value={slugTouched ? form.slug : previewSlug}
              placeholder="golf-course-flyer"
              onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }} /></label>
          {/* CHOSEN, NOT TYPED. A campaign that invented its own code would be
              a second place discounts are defined, and the one not on the
              Promo codes screen is the one nobody remembers to turn off.
              Mapped, so it is a list of unknown length rather than a
              two-to-four choice — the case a drop-down is for. */}
          <label className="field"><span>Discount to apply (optional)</span>
            <select value={form.promo_code}
              onChange={(e) => setForm({ ...form, promo_code: e.target.value })}>
              <option value="">No discount</option>
              {codes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
        </div>
        {codes.length === 0 && (
          <p className="muted" style={{ marginTop: "calc(-1 * var(--sp-2))" }}>
            You have no active discount codes yet — make one on Promo codes &amp; sale
            and it will show up here.
          </p>
        )}

        <div className="btnrow">
          <button className="btn primary" disabled={!form.name.trim() || !previewSlug} onClick={add}>
            Make the link
          </button>
        </div>

        {note && <div className={note.ok ? "ok-box" : "error-box"}>{note.text}</div>}
        {error && <div className="error-box">{error}</div>}

        {/* AN EMPTY SCREEN IS ONE SENTENCE, IN THE DETAILER'S TERMS. */}
        {!busy && rows.length === 0 && !error && (
          <p className="body">Nothing here yet — every booking you get is counted as somebody who just found you.</p>
        )}

        <div className={`rows rows-stack${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          {rows.map((r) => {
            const scans = stats.visits[r.id] || 0;
            const booked = stats.bookings[r.id] || 0;
            return (
              <div className="row-item" key={r.id}
                style={{ cursor: "default", opacity: r.is_active ? 1 : 0.5 }}>
                <button className="txt"
                  style={{ background: "none", border: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
                  onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <span className="nm">{r.name}</span>
                  {/* THE TWO NUMBERS, IN WORDS. "40 / 3" is a ratio somebody
                      has to decode; the detailer's question is whether the
                      flyer worked. A campaign nobody has scanned says so
                      rather than printing two zeros. */}
                  <span className="sub">
                    {scans === 0
                      ? "Nobody has opened it yet"
                      : `${scans} opened it · ${booked} booked`}
                    {r.promo_code ? ` · ${r.promo_code}` : ""}
                  </span>
                </button>
                <button className="btn sm inline ghost" onClick={() => toggle(r)}>
                  {r.is_active ? "Turn off" : "Turn on"}
                </button>
                <button className="btn sm inline icon ghost" aria-label={`Delete ${r.name}`}
                  onClick={() => remove(r)}><X strokeWidth={2} /></button>
              </div>
            );
          })}
        </div>

        {/* THE LINK ITSELF, AND ITS QR CODE, FROM THE COMPONENT THAT ALREADY
            OWNS BOTH. A second way to draw a booking link is a second thing to
            keep in step with the detailer's own domain — `BookingLink` already
            knows about that, and a QR is the whole point of this feature. */}
        {open && rows.some((r) => r.id === open) && (
          <div style={{ marginTop: "var(--sp-4)" }}>
            <BookingLink slug={business.slug} origin={siteOrigin}
              path={`?c=${rows.find((r) => r.id === open).slug}`} />
          </div>
        )}
      </div>
    </div>
  );
}
