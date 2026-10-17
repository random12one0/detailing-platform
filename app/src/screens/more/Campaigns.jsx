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
// **REFRAMED 2026-09-13, AND THE ASK WAS THAT IT IS NOT ENOUGH OF A FEATURE.**
// His words: he wants links he posts on Yelp or Google or an ad, and then *"you
// could see where your bookings come from... which one has the highest
// conversion rate or which one gets the most clicks"*, so that if he runs an ad
// he can tell what came specifically from that ad. His verdict on what was
// here: it is *"just a tracking link"* and it should be *"more of a feature"*.
//
// THREE THINGS CHANGED AND NONE OF THEM IS A NEW NUMBER.
//
//   THE ORDER      The screen opened with a three-field FORM, so the first
//                  thing a detailer met was work rather than an answer. The
//                  links and their figures lead now; the maker is a
//                  `details.disclose` fold at the bottom, which is the job
//                  record's own control rather than a fourth idea.
//   THE SENTENCE   It led with *"Make a separate booking link"* and put the
//                  discount second. The discount is the optional extra, so it
//                  is stated beside its own field inside the fold.
//   THE COUNTING   `whereFrom` in `lib/moneyAdvanced.js` does it, for this
//                  screen AND for Money's Booking sources block. It was
//                  written, tested and had no live caller. Two tallies of the
//                  same rows is how one screen says 34 and the other says 21 —
//                  this file counted page loads and `whereFrom` counts PEOPLE,
//                  which is what the sentence at the top has always claimed.
//
// **AND THIS SCREEN IS THE ALL-TIME VIEW, MONEY IS THE PERIOD VIEW.** Same
// arithmetic, two scopes, both labelled. That is not the two-copies failure;
// two COUNTS would have been.
//
// THE PROMO CODE IS A CODE THEY ALREADY HAVE, chosen from Promo codes rather
// than typed here. A campaign that invented its own would be a second place
// discounts are defined, and the one that is not on the Promo codes screen is
// the one nobody remembers to turn off.

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { dateLong, localDate, money } from "../../lib/format.js";
// ROADMAP 4.2 — ONE ARITHMETIC, TWO SCREENS. Money's Booking sources block
// and this list are the same figures at two scopes, and until 2026-09-13 this
// screen counted them itself. Two tallies of the same rows is how one screen
// says a flyer was opened 34 times and the other says 21 — this one counted
// page loads and `whereFrom` counts PEOPLE, which is what the sentence at the
// top of this screen has always claimed to be printing.
import { whereFrom } from "../../lib/moneyAdvanced.js";
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

// THIS SCREEN IS THE ALL-TIME VIEW. Money is the period view of the same
// rows: a flyer's lifetime total is what tells you whether printing it was
// worth it, and what it did in September is a different question that the
// screen with a period control on it already answers.
const ALL_TIME = { start: "0000-01-01", end: "9999-12-31" };

export default function Campaigns() {
  useAppLocale();
  const { business, siteOrigin } = useBusiness();
  const [rows, setRows] = useState([]);
  const [codes, setCodes] = useState([]);
  const [visits, setVisits] = useState([]);
  const [booked, setBooked] = useState([]);
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
      supabase.from("campaign_visits").select("campaign_id, visitor_id, created_at").eq("business_id", business.id),
      // The three refund columns are what `whereFrom` needs to value a job by what it KEPT (97.83).
      supabase.from("bookings").select("campaign_id, status, total_price, final_amount, payment_status, stripe_payment_intent, payment_problem")
        .eq("business_id", business.id)
        .not("campaign_id", "is", null).neq("status", "cancelled").is("deleted_at", null),
    ]);
    setError(c.error ? (c.error.message || "Could not load your campaign links.") : "");
    if (c.data) setRows(c.data);
    if (p.data) setCodes(p.data.map((x) => x.code));
    // NO TALLYING HERE ANY MORE. The counting is `whereFrom`'s, so this screen
    // and Money cannot print two different numbers for the same flyer. All this
    // does is hand it the rows with a local date on each visit, because
    // `created_at` is UTC and `moneyAdvanced.js` may not know a timezone.
    if (v.data) setVisits(v.data.map((x) => ({ ...x, date: localDate(x.created_at, business.timezone) })));
    if (b.data) setBooked(b.data);
    setBusy(false);
  }, [business.id, business.timezone]);

  useEffect(() => { load(); }, [load]);

  const stats = whereFrom({ campaigns: rows, visits, bookings: booked, period: ALL_TIME });
  const byId = Object.fromEntries(stats.links.map((l) => [l.id, l]));
  // WHEN IT WAS LAST USED is the number that tells a detailer a flyer has gone
  // quiet, which none of the totals can: forty opens is the same forty whether
  // the last one was yesterday or in March. It is a maximum rather than a
  // count, so there is nothing here that Money could disagree with.
  const lastOpen = visits.reduce((a, r) => {
    if (!r.campaign_id) return a;
    if (!a[r.campaign_id] || r.created_at > a[r.campaign_id]) a[r.campaign_id] = r.created_at;
    return a;
  }, {});

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
        ? t("You already have a link called {slug}.", { slug }) : err.message });
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
    if (!confirm(t("Delete {name} for good? Its scans and bookings stop being counted against it. Turning it off keeps the numbers.", { name: r.name }))) return;
    await supabase.from("campaigns").delete().eq("id", r.id).eq("business_id", business.id);
    load();
  };

  const previewSlug = slugify(slugTouched ? form.slug : form.name);

  return (
    <div className="card">
      <div className="thoughts">
        {/* LEAD WITH THE ANSWER, NOT THE PLUMBING — his ask, 2026-09-13.
            The sentence used to open with *"Make a separate booking link"*,
            which is the work, and it put the discount second, which is the
            optional extra. His words for what this screen is for: *"you could
            see where your bookings come from... which one has the highest
            conversion rate or which one gets the most clicks"*.
            THE DISCOUNT IS NOT DELETED, IT IS DEMOTED - it lives beside its
            own field inside the fold at the bottom, which is where somebody
            who is setting one up is looking. A fact stated where the control
            is not is a fact read twice and acted on nowhere.
            VOICE: short declarative sentences, one fact each, no dash holding
            two clauses together. See docs/sessions/product.md § THE COPY
            RULES, which cost two rewrites of one paragraph on Monthly plans. */}
        <p className="quiet" style={{ marginTop: 0 }}>
          {t("Each link counts how many people opened it and how many of them booked. Make one for every place you advertise, then post that link instead of your normal booking link.")}
        </p>

        {error && <div className="error-box">{error}</div>}

        {/* AN EMPTY SCREEN IS ONE SENTENCE, IN THE DETAILER'S TERMS. */}
        {!busy && rows.length === 0 && !error && (
          <p className="body">{t("Nothing here yet. Every booking you get is counted as somebody who just found you.")}</p>
        )}

        <div className={`rows rows-stack${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          {rows.map((r) => {
            // ONE ARITHMETIC. `whereFrom` counts PEOPLE rather than page
            // loads, which is what this screen's own sentence has always said
            // it prints, and it is the same count Money's Booking sources
            // block draws - so the two cannot disagree about a flyer.
            const l = byId[r.id] || { people: 0, bookings: 0, earned: 0, rate: 0 };
            const scans = l.people;
            const booked = l.bookings;
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
                      {/* BOTH NUMBERS, ALWAYS, once anybody has opened it.
                          The detailer's question is whether the flyer WORKED,
                          and opens alone cannot answer it — twenty opens and
                          no bookings is a different result from twenty opens
                          and three, and the old row could not tell them
                          apart. Money earned rides with them where there is
                          any, because that is the number the flyer was
                          printed for. */}
                      {scans === 0
                        ? t("Nobody has opened it yet")
                        : [
                          t("{n} opened", { n: scans }),
                          t("{n} booked", { n: booked }),
                          l.earned ? t("{amount} earned", { amount: money(l.earned) }) : null,
                        ].filter(Boolean).join(" · ")}
                      {/* THE CODE IS NOT ON THE ROW ANY MORE. The panel one
                          tap down already says *"Everyone who opens it gets
                          SUMMER10"*, which is the same fact in a sentence
                          that explains it; and in Spanish the fourth part
                          pushed the row past 392 and ellipsised the code to
                          "SUM…", which is worse than not printing it. The
                          discount is the optional extra on this screen now,
                          not a column. */}
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
                        <span className="camp-n">{scans ? `${Math.round(l.rate * 100)}%` : "—"}</span>
                        <span className="camp-l">{t("booking rate")}</span>
                      </div>
                      <div className="camp-stat">
                        <span className="camp-n">{money(l.earned)}</span>
                        <span className="camp-l">{t("earned")}</span>
                      </div>
                    </div>
                    <p className="quiet">
                      {lastOpen[r.id]
                        ? t("Last opened {when}. Earned counts finished jobs only.", {
                          when: dateLong(localDate(lastOpen[r.id], business.timezone), getAppLocale()),
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

        {/* ── MAKING ONE IS THE PLUMBING, SO IT GOES LAST AND IT FOLDS ─────
            **HIS ASK, 2026-09-13:** lead with the answer, not the plumbing.
            This screen opened with a three-field form and put the numbers
            under it, so the first thing a detailer met was work rather than
            an answer. The form is unchanged; only its position and its lid
            are. `details.disclose` is the product's own fold — the job
            record's delete drawer is the same control — so this is not a
            fourth idea about how a section hides itself.
            AND IT IS THE ONLY MAKER. Money links here rather than carrying a
            second one: two places to make a link is two places the rules
            about slugs and discounts have to agree. */}
        <details className="disclose">
          <summary>{t("Make a link")}</summary>
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
          <label className="field"><span>{t("Discount to apply (optional)")}</span>
            <select value={form.promo_code}
              onChange={(e) => setForm({ ...form, promo_code: e.target.value })}>
              <option value="">{t("No discount")}</option>
              {codes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
        </div>
        {!busy && codes.length === 0 && (
          <p className="muted" style={{ marginTop: "calc(-1 * var(--sp-2))" }}>
            {/* TWO FIXES IN ONE LINE, both of them standing rules this line
                predates: it never went through `t()`, so it sat in English on
                a Spanish dashboard, and the em dash was a SENTENCE JOINT,
                which CLAUDE.md says dies and becomes a full stop. */}
            {t("You have no active discount codes yet. Make one on Promo codes and sale and it will show up here.")}
          </p>
        )}

        <div className="btnrow">
          <button className="btn primary" disabled={!form.name.trim() || !previewSlug} onClick={add}>
            {t("Make the link")}
          </button>
        </div>

        {note && <div className={note.ok ? "ok-box" : "error-box"}>{note.text}</div>}
        </details>
      </div>
    </div>
  );
}
