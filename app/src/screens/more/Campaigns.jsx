// Tracking links — the eighteenth settings screen. Roadmap 4.2.
//
// **THE SCREEN IS CALLED "TRACKING LINKS" AS OF 2026-09-11, AND IT IS THE
// THIRD NAME IT HAS HAD.** His review: *"where customers come from… it just
// feels like an AI title… no title should be a sentence. Figure out what the
// proper name for that is."* The reasoning is cumulative rather than
// circular: **Campaign links** was wrong because a detailer does not think in
// campaigns (his correction, 2026-09-10 — *"the campaign is less of, like, a
// campaign… I want it to be more like a way to know where customers are
// coming from"*); **Where customers come from** was right about the meaning
// and wrong about the form, because it is a SENTENCE doing a title's job.
// **Tracking links** is the trade's own plain name for the object — a link
// that counts who used it — and it is a noun phrase, which is what a row in a
// settings list is.
//
// HIS POINT WAS BROADER THAN THIS SCREEN AND IS DELIBERATELY NOT SWEPT HERE:
// *"a lot of these titles are sentences… like 'how you get paid', that's a
// sentence."* That is review item 16, the product-wide language pass, which
// stays unassigned until the per-screen work is done — a sweep landing while
// five screens are being rewritten is a merge conflict in every one of them.
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
// **AND THE REST OF THE NUMBERS OPEN UNDER THE ROW THEY BELONG TO — his
// review, 2026-09-11.** *"I click on the golf course flyer… and then it gives
// me stats about it, like the conversion rate and how many people have seen.
// All the stats that you'd want from a tracking link… And I think it should
// open underneath the actual name. Not like right now, if I click on it, it
// opens beneath all of them, but if you have a lot, then it'll be so far
// down."*
//
// That was a real defect and not a preference: the panel rendered AFTER the
// whole list, so with eight flyers the thing you opened appeared eight rows
// below the thing you tapped, with nothing tying the two together. It is an
// accordion now — the panel is the tapped row's own next sibling.
//
// THE NO-CHART RULE ABOVE IS NOT CONTRADICTED BY THIS. The row keeps its two
// integers; the panel adds the four a tracking link is actually judged on and
// still draws no trend line, for the same reason as before.
//
// **THE TWO DENOMINATORS ARE DIFFERENT ON PURPOSE AND BOTH ARE LABELLED.**
// *Booked* counts every live booking that came through the link, because that
// is what the link did. *Earned* counts COMPLETED jobs only, because money
// that has not been earned yet is not money — Money and the client record
// both draw the line in that same place, and a fourth definition of revenue
// is how two screens start disagreeing about the same flyer.
//
// THE PROMO CODE IS A CODE THEY ALREADY HAVE, chosen from Promo codes rather
// than typed here. A campaign that invented its own would be a second place
// discounts are defined, and the one that is not on the Promo codes screen is
// the one nobody remembers to turn off.

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { dateLong, localDate, money } from "../../lib/format.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import BookingLink from "../../components/BookingLink.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { getAppLocale, t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// The same shape the database's own check constraint allows
// (`slug ~ '^[a-z0-9][a-z0-9-]*$'`), applied while they type so the refusal is
// never a database error message.
const slugify = (v) => String(v || "").toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const BLANK = { name: "", slug: "", promo_code: "" };

export default function Campaigns() {
  useAppLocale();
  const { business, siteOrigin } = useBusiness();
  const [rows, setRows] = useState([]);
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState({ visits: {}, bookings: {}, lastOpen: {}, earned: {} });
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
      supabase.from("campaign_visits").select("campaign_id, created_at").eq("business_id", business.id),
      supabase.from("bookings").select("campaign_id, status, total_price, final_amount")
        .eq("business_id", business.id)
        .not("campaign_id", "is", null).neq("status", "cancelled").is("deleted_at", null),
    ]);
    setError(c.error ? (c.error.message || "Could not load your campaign links.") : "");
    if (c.data) setRows(c.data);
    if (p.data) setCodes(p.data.map((x) => x.code));
    const tally = (list) => (list ?? []).reduce((a, r) => {
      if (r.campaign_id) a[r.campaign_id] = (a[r.campaign_id] || 0) + 1;
      return a;
    }, {});
    // WHEN IT WAS LAST USED is the number that tells a detailer a flyer has
    // gone quiet, which none of the totals can: forty scans is the same
    // forty whether the last one was yesterday or in March.
    const lastOpen = (v.data ?? []).reduce((a, r) => {
      if (!r.campaign_id) return a;
      if (!a[r.campaign_id] || r.created_at > a[r.campaign_id]) a[r.campaign_id] = r.created_at;
      return a;
    }, {});
    // COMPLETED ONLY, and `final_amount` beats `total_price` because the
    // first is what was actually charged after the job changed on the day.
    const earned = (b.data ?? []).reduce((a, r) => {
      if (!r.campaign_id || r.status !== "completed") return a;
      a[r.campaign_id] = (a[r.campaign_id] || 0) + Number(r.final_amount ?? r.total_price ?? 0);
      return a;
    }, {});
    setStats({ visits: tally(v.data), bookings: tally(b.data), lastOpen, earned });
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
          {t("Make a separate booking link for a flyer, a QR code or a post. Anyone who uses it gets the discount applied automatically. This page shows how many bookings each link brought in.")}
        </p>

        <label className="field"><span>{t("What is it for")}</span>
          <input value={form.name} placeholder={t("e.g. Golf course flyer")}
            onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>

        <div className="grid2">
          <label className="field"><span>{t("The bit on the end of the link")}</span>
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
              <option value="">{t("No discount")}</option>
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
            {t("Make the link")}
          </button>
        </div>

        {note && <div className={note.ok ? "ok-box" : "error-box"}>{note.text}</div>}
        {error && <div className="error-box">{error}</div>}

        {/* AN EMPTY SCREEN IS ONE SENTENCE, IN THE DETAILER'S TERMS. */}
        {!busy && rows.length === 0 && !error && (
          <p className="body">{t("Nothing here yet — every booking you get is counted as somebody who just found you.")}</p>
        )}

        <div className={`rows rows-stack${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          {rows.map((r) => {
            const scans = stats.visits[r.id] || 0;
            const booked = stats.bookings[r.id] || 0;
            const isOpen = open === r.id;
            return (
              // A FRAGMENT, SO `.row-item` STAYS A DIRECT CHILD of the stack.
              // Wrapping the pair in a div instead would put the panel inside
              // the row and break every `.rows-stack > .row-item` rule that
              // draws the separators.
              <Fragment key={r.id}>
                <div className="row-item"
                  style={{ cursor: "default", opacity: r.is_active ? 1 : 0.5 }}>
                  <button className="txt camp-open" aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : r.id)}>
                    {/* THE ARROW HE ASKED FOR, and it is the control's own
                        state rather than decoration: it points down when the
                        panel is shut and up when it is open, so a row that
                        can expand is distinguishable from one that cannot at
                        a glance. */}
                    <span className="nm row" style={{ gap: 6, minWidth: 0 }}>
                      <ChevronDown size={15} strokeWidth={2} aria-hidden="true"
                        className={`camp-chev${isOpen ? " open" : ""}`} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                    </span>
                    {/* THE TWO NUMBERS, IN WORDS. "40 / 3" is a ratio somebody
                        has to decode; the detailer's question is whether the
                        flyer worked. A campaign nobody has scanned says so
                        rather than printing two zeros. */}
                    <span className="sub">
                      {scans === 0
                        ? t("Nobody has opened it yet")
                        : `${scans} opened it · ${booked} booked`}
                      {r.promo_code ? ` · ${r.promo_code}` : ""}
                    </span>
                  </button>
                  <button className="btn sm inline ghost" onClick={() => toggle(r)}>
                    {r.is_active ? t("Turn off") : t("Turn on")}
                  </button>
                  <button className="btn sm inline icon ghost" aria-label={`Delete ${r.name}`}
                    onClick={() => remove(r)}><X strokeWidth={2} /></button>
                </div>
                {isOpen && (
                  <div className="camp-panel">
                    {/* FOUR FIGURES, AND THE RATE IS THE ONE HE NAMED. It is
                        computed here rather than stored because it is two
                        counts divided — a stored rate is a third number that
                        can disagree with the two it came from. */}
                    <div className="camp-stats">
                      <div className="camp-stat">
                        <span className="camp-n">{scans}</span>
                        <span className="camp-l">{t("opened")}</span>
                      </div>
                      <div className="camp-stat">
                        <span className="camp-n">{booked}</span>
                        <span className="camp-l">{t("booked")}</span>
                      </div>
                      <div className="camp-stat">
                        {/* NO RATE WITHOUT A DENOMINATOR. "0%" off zero opens
                            is not a poor conversion rate, it is no data, and
                            the two look identical on a screen. */}
                        <span className="camp-n">{scans ? `${Math.round((booked / scans) * 100)}%` : "—"}</span>
                        <span className="camp-l">{t("booking rate")}</span>
                      </div>
                      <div className="camp-stat">
                        <span className="camp-n">{money(stats.earned[r.id] || 0)}</span>
                        <span className="camp-l">{t("earned")}</span>
                      </div>
                    </div>
                    <p className="quiet">
                      {stats.lastOpen[r.id]
                        ? t("Last opened {when}. Earned counts finished jobs only.", {
                          when: dateLong(localDate(stats.lastOpen[r.id], business.timezone), getAppLocale()),
                        })
                        : t("Nobody has opened this link yet.")}
                      {r.promo_code ? ` ${t("Everyone who opens it gets {code}.", { code: r.promo_code })}` : ""}
                    </p>
                    {/* THE LINK ITSELF, AND ITS QR CODE, FROM THE COMPONENT
                        THAT ALREADY OWNS BOTH. A second way to draw a booking
                        link is a second thing to keep in step with the
                        detailer's own domain — `BookingLink` already knows
                        about that, and a QR is the whole point of this
                        feature. */}
                    <BookingLink slug={business.slug} origin={siteOrigin}
                      path={`?c=${r.slug}`} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
