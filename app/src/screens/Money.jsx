// Money — one lead figure, a signed bar chart on a zero line, and a paired-
// cell sunken ledger. The only chart in the product (law 1's register).
//
// REBUILT IN ROADMAP 2.11 STEP 6, STAGE 4, against
// docs/dashboard-screen-designs-2026-08-31.md §7 (the shape) and
// docs/dashboard-phone-pass-2026-08-31.md §8 (the phone, which overrides it
// wherever the two disagree). What changed and why:
//
//   THE ZERO LINE  `.bars` was `align-items: flex-end` with `height: |value|`,
//              so -$114 and +$114 drew THE IDENTICAL BAR and only the colour
//              told them apart. Roadmap 2.4 made a losing bar red, which was
//              right and was not enough — colour alone is the WCAG 1.4.1
//              problem the calendar marks were rewritten to remove. A loss
//              now hangs BELOW a rule; a win stands on it. One scale for both
//              directions, asymmetric room (60% above, 40% below), because
//              losses are rarer and shallower than wins.
//   THE PERIOD  Three stacked rows for one question became a segmented
//              control and a stepper. One line at a desk; on a phone the
//              five chips are 388px of content in a 356px column, so they
//              wrap 3+2 as a full-width segmented control rather than
//              orphaning "Lifetime" (phone pass §8, and the same answer the
//              calendar's filter chips got in stage 3).
//   THE EXPORT  Row 40, his Q4 — "jobs and expenses, nothing more". It uses
//              the period already chosen, so it needs no control of its own.
//              lib/accountant-export.js, tests/money-export.test.mjs.
//   THE SPLIT   1.2 / 1 at --wrap. The trade treats this as two destinations
//              (Housecall Pro carries My Money and Reporting separately) and
//              a sixth tab is forbidden, so the split the trade makes across
//              two tabs is the split this screen makes across two columns:
//              what did I make, and who owes me and what went out.
//   THE EMPTIES  Two dashed boxes are gone (Part B row 11). A section with
//              nothing in it is not drawn; a screen with nothing on it says
//              so once, under a $0.00 that is CORRECT rather than empty.
//   THE CAP     Expenses were silently cut at 12. A silent truncation reads
//              as a complete list, so the cap states itself and expands.
//
// The numbers themselves are unchanged and were ported from the reference
// admin: NET AFTER EXPENSES as the lead figure (revenue is a vanity number
// when you buy your own supplies), QUOTED vs ADDED ON SITE off
// booking_line_items, and TIPS.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings, withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import { useWide } from "../hooks/useWide.js";
import { money, todayLocal } from "../lib/format.js";
import { PERIOD_KINDS, bucketsFor, inPeriod, periodAt } from "../lib/periods.js";
import { accountantCsv, accountantFilename } from "../lib/accountant-export.js";
import { api } from "../lib/api.js";
import ExpenseModal from "../components/ExpenseModal.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import { Segmented } from "../components/controls.jsx";
import RecordHost from "../components/RecordHost.jsx";

// What to call a period in a sentence: "Net this week", "vs last 6 months".
const NOUN = { week: "week", month: "month", "6m": "6 months", year: "year", all: "all time" };

// Line-item categories that represent money sold at the job rather than
// through the booking page. A discount is negative and belongs on the same
// side of the ledger, so it nets against the upsell rather than hiding.
const ON_SITE = new Set(["upgrade", "add_on", "custom", "travel_fee", "discount"]);

// The chart's two halves, as percentages of a 120px box. A −$114 against a
// +$455 has to be visibly below the line without giving half the chart to the
// half that is usually empty (phone pass §8: 120px tall, the zero line at 60%
// of it).
//
// AND THE BOTTOM HALF ONLY EXISTS WHEN SOMETHING IS IN IT. A period with no
// losing bucket draws 72px with the rule along its floor — the same chart,
// with the zero line where zero actually is — because 48px of reserved empty
// space under six winning bars is the "not enough content to fill it" shape
// one level down, and it made the rule read as a gap rather than as an axis.
// The chart grows when a loss appears, which is the one moment its height is
// worth spending.
const UP = 60, DOWN = 40;

// Twelve rows, then it says how many it is not showing. The number is the
// grid the swatch row already uses and it fills a column without becoming
// the screen.
const EXPENSE_CAP = 12;

export default function Money() {
  const { business } = useBusiness();
  const today = todayLocal(business.timezone);
  // W6 — the screen was month-only. He asked for week / month / six months /
  // year / lifetime, "whatever is the standard online", so the conventions
  // live in lib/periods.js and nothing on this screen invents its own.
  const [kind, setKind] = useState("month");
  // How many periods back we are looking. Doing last month's books at the
  // start of a month is the reason this exists; the same is true of last
  // week's on a Monday.
  const [offset, setOffset] = useState(0);
  const wide = useWide();
  // IS THIS CHART BEING REPLACED, OR DRAWN FOR THE FIRST TIME? The bars grow
  // on arrival (`bar-rise`, --t-reveal) and that is right the first time and
  // wrong on a switch: measured 2026-09-04, a period change left the chart
  // drawing at 620ms while every figure beside it had settled at 340ms, which
  // is the "half the screen moving" the owner called a page refresh, inverted
  // rather than removed. The figures are inside a keyed `.swap`, so the whole
  // subtree remounts either way and NO SELECTOR CAN SEE THE DIFFERENCE — this
  // ref is what can. `theme.css` claimed a month switch snapped since the
  // chart was written; this is what finally makes that true.
  // A REF AND NOT `useState`, because knowing this must not cause a render.
  // Compared against the PERIOD rather than set once on mount: this screen
  // paints a spinner first, so a mount flag would already be spent by the time
  // the chart existed and the first chart would never rise.
  //
  // AND THE VERDICT IS LATCHED PER PERIOD, WHICH IS THE HALF THAT WAS WRONG
  // FIRST AND MEASURED WRONG BEFORE IT WAS BELIEVED. Written as a plain
  // comparison updated in `useEffect`, it was true on the render that changed
  // the period and FALSE on the very next one — the reload finishing sets
  // `refreshing`, which re-renders. The class went on and straight back off,
  // and REMOVING `animation: none` FROM A LIVE ELEMENT STARTS THE ANIMATION,
  // so the chart re-rose exactly as before while the code looked correct.
  // `getAnimations()` is what caught it; the class was already gone by then, so
  // even reading the DOM afterwards would have shown nothing wrong.
  // Latched during render rather than in an effect, which is React's own
  // adjust-state-while-rendering pattern and is idempotent here.
  const periodKey = `${kind}|${offset}`;
  const drawn = useRef({ key: null, replacing: false });
  if (drawn.current.key !== periodKey) {
    drawn.current = { key: periodKey, replacing: drawn.current.key !== null };
  }
  const replacing = drawn.current.replacing;
  const period = periodAt(kind, today, offset);
  const previous = periodAt(kind, today, offset - 1);
  const buckets = useMemo(() => bucketsFor(kind, today, offset), [kind, today, offset]);
  // Enough range to cover the chart AND the comparison, which is one bucket
  // further back than the leftmost bar when the chart is only one wide.
  // ponytail: Lifetime pulls ten years of bookings into the phone in one go.
  // Fine at a detailer's volume (a few hundred jobs a year) and it is the
  // same shape the Calendar's "Everything" filter already has; if a busy shop
  // ever makes this slow, the fix is a server-side monthly rollup, not a
  // shorter lifetime.
  const from = [buckets[0]?.start, previous.start].filter(Boolean).sort()[0];
  const to = period.end > today ? today : period.end;
  const { bookings, loading, refreshing, error, reload } = useBookings(from, to);
  const [expenses, setExpenses] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [unpaid, setUnpaid] = useState([]);
  const [extrasError, setExtrasError] = useState("");
  const [adding, setAdding] = useState(false);
  const [allExpenses, setAllExpenses] = useState(false);
  const [selected, setSelected] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [sent, setSent] = useState("");

  const loadExtras = useCallback(async () => {
    const [e, li, up] = await Promise.all([
      // TO THE END OF THE PERIOD, NOT TO TODAY. `to` is clamped to today so
      // that the chart does not read a month that has not happened; an
      // EXPENSE can legitimately be dated forward inside the current one (a
      // supply order, an insurance payment), and clamping this read too made
      // it invisible on the screen that exists to list it.
      supabase.from("expenses").select("*").eq("business_id", business.id)
        .gte("date", from).lte("date", period.end).order("date", { ascending: false }),
      supabase.from("booking_line_items").select("booking_id, category, amount, quantity")
        .eq("business_id", business.id),
      // WHO OWES ME IS NOT A PERIOD QUESTION, and it used to be read as one:
      // the unpaid list was filtered out of the same window the chart uses,
      // so switching from Month to Week changed who owed you money and last
      // month's unpaid job disappeared from the one screen that exists to
      // chase it. It is its own read now, with no dates on it.
      supabase.from("bookings").select(BOOKING_SELECT)
        .eq("business_id", business.id).is("deleted_at", null)
        .eq("status", "completed").in("payment_status", ["pending", "partial"])
        .order("start_at", { ascending: false }),
    ]);
    // A FAILED READ MUST NOT LOOK LIKE AN EMPTY MONTH. `data ?? []` on all
    // three of these turned a dropped connection into "no expenses, nothing
    // outstanding, nothing sold on site" — the same defect useBookings
    // carried until stage 3, one file over. The last good figures stay drawn
    // and the message goes above them.
    const failed = [e.error, li.error, up.error].find(Boolean);
    setExtrasError(failed ? (failed.message || "Could not load your expenses.") : "");
    if (e.data) setExpenses(e.data);
    if (li.data) setLineItems(li.data);
    if (up.data) setUnpaid(up.data.map((b) => withLocal(b, business.timezone)));
  }, [business.id, business.timezone, from, to, period.end]);

  useEffect(() => { loadExtras(); }, [loadExtras]);
  // A new period is a new list; leaving it expanded carries one period's
  // decision onto the next one.
  useEffect(() => { setAllExpenses(false); setSent(""); }, [kind, offset]);

  const stats = useMemo(() => {
    const done = bookings.filter((b) => b.status === "completed");
    // Every figure below is "money in THIS period", so there is one filter
    // and nothing on the screen slices the data its own way.
    const jobsIn = (p) => done.filter((b) => inPeriod(b.booking_date, p));

    const revenueIn = (p) => jobsIn(p).reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
    const spentIn = (p) => expenses.filter((e) => inPeriod(e.date, p))
      .reduce((s, e) => s + Number(e.amount), 0);

    // Line items joined back to the bookings of the period in question.
    const itemsFor = (p) => {
      const ids = new Set(jobsIn(p).map((b) => b.id));
      return lineItems.filter((li) => ids.has(li.booking_id));
    };
    const sumItems = (items, pred) => items
      .filter(pred)
      .reduce((s, li) => s + Number(li.amount) * Number(li.quantity ?? 1), 0);

    const items = itemsFor(period);
    const onSite = sumItems(items, (li) => ON_SITE.has(li.category));
    const tipTotal = sumItems(items, (li) => li.category === "tip");
    const tippedJobs = new Set(items.filter((li) => li.category === "tip").map((li) => li.booking_id)).size;

    const inNow = revenueIn(period), inPrev = revenueIn(previous);
    const outNow = spentIn(period), outPrev = spentIn(previous);
    const jobsNow = jobsIn(period).length, jobsPrev = jobsIn(previous).length;

    // Everything that wasn't sold on site was quoted up front. Tips are not
    // sales, so they sit outside the split rather than inflating it.
    const quoted = Math.max(0, inNow - onSite - tipTotal);

    const chart = buckets.map((b) => ({
      key: b.start, label: b.tick, offset: b.offset,
      value: revenueIn(b) - spentIn(b),
    }));

    return {
      inNow, outNow, jobsNow,
      netNow: inNow - outNow, netPrev: inPrev - outPrev,
      avgJob: jobsNow > 0 ? inNow / jobsNow : 0,
      avgJobPrev: jobsPrev > 0 ? inPrev / jobsPrev : 0,
      quoted, onSite, tipTotal, tippedJobs,
      avgTip: tippedJobs > 0 ? tipTotal / tippedJobs : 0,
      chart,
      jobsDone: jobsIn(period),
    };
  }, [bookings, expenses, lineItems, period, previous, buckets]);

  const markPaid = async (b) => {
    setMarkingPaid(b.id);
    try {
      await api.updateBooking(business.id, {
        booking_id: b.id,
        payment_status: "paid",
        final_amount: Number(b.final_amount ?? b.total_price),
        finalized_at: b.finalized_at ?? new Date().toISOString(),
      });
      reload();
      // The unpaid list is its own read now, so the row that was just paid
      // only leaves the screen if this runs too.
      loadExtras();
    } finally {
      setMarkingPaid(null);
    }
  };

  if (loading) return <div className="center"><div className="spinner" /></div>;

  const periodExpenses = expenses.filter((e) => inPeriod(e.date, period));
  const unpaidTotal = unpaid.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  // ONE SCALE FOR BOTH DIRECTIONS — the larger of the two extremes — so a
  // single bad week does not flatten five good ones and a loss cannot draw
  // past the bottom of the chart.
  const peak = Math.max(1, ...stats.chart.map((c) => Math.abs(c.value)));
  const signed = stats.chart.some((c) => c.value < 0);
  // Two different questions. `anything` is "does this SCREEN have something to
  // draw" — the chart reaches back six buckets, so a quiet month inside a busy
  // half-year is not an empty screen. `exportable` is "is there anything in
  // the FILE", and there is no point handing an accountant a header row.
  const anything = stats.jobsNow > 0 || periodExpenses.length > 0
    || stats.chart.some((c) => c.value !== 0);
  const exportable = stats.jobsNow > 0 || periodExpenses.length > 0;
  const shownExpenses = allExpenses ? periodExpenses : periodExpenses.slice(0, EXPENSE_CAP);

  // Jobs and expenses, nothing more. The file is built from exactly the two
  // lists the figures above it were computed from, so it cannot disagree
  // with the screen.
  const sendToAccountant = async () => {
    const csv = accountantCsv({ jobs: stats.jobsDone, expenses: periodExpenses });
    const name = accountantFilename(business.name, period.label);
    const file = new File([csv], name, { type: "text/csv" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${business.name} — ${period.label}` });
        setSent("");
        return;
      } catch (err) {
        // Cancelling the share sheet is an answer, not a failure. Anything
        // else falls through to the file, which always works.
        if (err?.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    // A download on a desk is invisible — this says where it went, which is a
    // fact the button does not carry.
    setSent(`Saved as ${name}`);
  };

  // ─── WHAT DID I MAKE ────────────────────────────────────────────────────
  const left = (
    <>
      <h1 className="display">Money</h1>

      {/* Above the figures, and the last good period stays drawn. */}
      {(error || extrasError) && <div className="error-box">{error || extrasError}</div>}

      {/* ONE LINE AT A DESK. The segmented control chooses the LENGTH and the
          stepper chooses WHICH one — two questions, two controls, which is
          what every dashboard that does this does. Changing the length keeps
          you on the current one rather than trying to map "three months ago"
          onto weeks. */}
      <div className="moneyhead">
        <Segmented label="Time range" value={kind} options={PERIOD_KINDS}
          onChange={(k) => { setKind(k); setOffset(0); }} />
        {/* Lifetime does not step: there is only one of it. */}
        <div className="moneyhead-when">
          {kind === "all" ? null : (
            <button className="btn ghost icon" aria-label="Previous period"
              onClick={() => setOffset(offset - 1)}>
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
          )}
          <span className="strong">{period.label}</span>
          {kind === "all" ? null : (
            <button className="btn ghost icon" aria-label="Next period"
              disabled={offset >= 0}
              onClick={() => setOffset(offset + 1)}>
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          )}
          {/* "EXPORT FOR MY ACCOUNTANT" WAS THE WHOLE ROW AND THREE WORDS TOO
              LONG — the owner, 2026-09-02: "they may go by a different name.
              Maybe they're not even exporting for the accountant… it's weird
              to have a button that says exclusively export for my accountant.
              And it takes up an entire line, which, screen space is valuable."
              The label is what the button DOES; who the file is for is the
              detailer's business. It rides the period line, which had room to
              spare at every width, and it says which period it takes to
              anyone listening to the screen rather than looking at it. */}
          {exportable && (
            <button className="btn sm inline export" onClick={sendToAccountant}
              aria-label={`Export ${period.label}`}>
              <Download strokeWidth={2} /> Export
            </button>
          )}
        </div>
        {sent && <span className="quiet sent" aria-live="polite">{sent}</span>}
      </div>

      {/* CHANGING THE PERIOD IS A SWAP — the owner, 2026-09-03: "when I switch
          between year, month, six months, year, lifetime, it kinda does that
          page refresh thing." Measured: the only thing running 120ms after the
          click was `bar-rise` re-firing on the chart, so the chart re-animated
          while every FIGURE beside it changed with no motion at all — half the
          screen moving is what reads as a refresh.
          EVERYTHING FROM HERE DOWN IS THE PERIOD'S, and the control that
          chooses it is above the swap: a segmented control that moves as you
          press it reads as a glitch. Keyed on kind + offset, because
          stepping to last week is the same kind of change as switching to Year.
          See theme.css § A CONTENT SWAP. */}
      {/* One lead figure. Net, not revenue — revenue is a vanity number when
          you buy your own supplies. $0.00 is a correct answer, not an empty
          state, so it is drawn the same way at every size. */}
      {/* The OUTER div keeps this block's place in the screen's arrival; the
          inner one is the swap. See theme.css § A CONTENT SWAP for why it is
          nested rather than given a higher specificity. */}
      <div>
      <div className="swap" key={`${kind}|${offset}`}>
        <span className="label">
          {kind === "all" ? "Net, all time" : offset === 0 ? `Net this ${NOUN[kind]}` : `Net that ${NOUN[kind]}`}
        </span>
        <div className="figure lead" style={{ marginTop: 4 }}>{money(stats.netNow)}</div>
        <Delta now={stats.netNow} prev={stats.netPrev} noun={NOUN[kind]} hide={kind === "all"} />

        {!anything ? (
          <p className="body" style={{ marginTop: 10 }}>
            Nothing recorded {kind === "all" ? "yet" : `in ${period.label}`}.
          </p>
        ) : (<>
          {/* A LOSS MUST NOT LOOK LIKE A WIN. The bar hangs below the rule
              rather than standing on it, so the difference is a POSITION and
              the red only agrees — the same thing .delta does with its
              arrow, and what keeps this readable in greyscale. --bad is
              fixed for every tenant: money moving is meaning, not identity
              (law 11b). The whole column is the target, not just the bar. */}
          <div className={`bars${signed ? " signed" : ""}${replacing ? " replacing" : ""}`} style={{ marginTop: 14 }}>
            {/* A SWITCH REALLY DOES SNAP NOW, which is what theme.css has
                claimed since this chart was written and what was never true.
                `bar-rise` is --t-reveal and is right the FIRST time the chart
                is drawn; on a period change it ran 280ms past everything
                beside it — the owner's own "half the screen moving" with the
                halves swapped over. `replacing` above is the fact no selector
                can see, and `.bars.replacing button::before` is where it
                lands. The chart still MOVES on a switch: `.bars` is a `.swap`
                part and takes its beat with the figures. What stops is the
                second animation on top of the first. */}
            {stats.chart.map((c, i) => (
              <button key={c.key} type="button"
                className={`${c.value < 0 ? "neg " : ""}${c.value === 0 ? "zero " : ""}${c.key === period.start ? "on" : ""}`}
                // THE VALUE IS IN THE NAME. The bar says win or loss by where
                // it hangs and agrees in colour; this is the same fact for
                // somebody who is listening to the screen instead.
                aria-label={`${c.label}, ${money(c.value)}`}
                disabled={c.offset === null}
                onClick={() => c.offset !== null && setOffset(c.offset)}
                style={{
                  "--i": i,
                  "--h": `${(Math.abs(c.value) / peak) * (c.value < 0 ? DOWN : signed ? UP : 100)}%`,
                }} />
            ))}
          </div>
          <div className="barlabels">
            {stats.chart.map((c) => (
              <span key={c.key} className={c.key === period.start ? "on" : undefined}>{c.label}</span>
            ))}
          </div>
        </>)}
      </div>
      </div>

      {/* Context, not content: one sunken block instead of eight cards.
          Same swap and the same key as the figures above — this block is the
          same period's numbers and must not resolve a beat after them. */}
      {anything && (
        <div>
        <div className="sunken swap" key={`ctx-${kind}|${offset}`}>
          <div className="paircells">
            <Cell label="Collected" value={money(stats.inNow)} />
            <Cell label="Expenses" value={money(stats.outNow)} />
            <Cell label="Avg job" value={money(stats.avgJob)} />
            <Cell label="Jobs done" value={String(stats.jobsNow)} />
          </div>

          <hr className="rule" />

          {/* The split the old screen had and this one didn't. */}
          <div className="paircells tight-rows">
            <Cell label="Quoted up front" value={money(stats.quoted)} />
            <Cell label="Added on site"
              value={`${stats.onSite >= 0 ? "+" : "−"}${money(Math.abs(stats.onSite))}`}
              tone={stats.onSite > 0 ? "good" : undefined} />
          </div>
          {stats.inNow > 0 && stats.onSite > 0 && (
            <p className="quiet" style={{ marginTop: 8 }}>
              {Math.round((stats.onSite / stats.inNow) * 100)}% of what you collected was sold at the job.
            </p>
          )}

          {stats.tipTotal > 0 && (
            <>
              <hr className="rule" />
              <div className="paircells three tight-rows">
                <Cell label="Tips" value={money(stats.tipTotal)} />
                <Cell label="Avg tip" value={money(stats.avgTip)} />
                <Cell label="Tipped"
                  value={stats.jobsNow ? `${Math.round((stats.tippedJobs / stats.jobsNow) * 100)}%` : "—"} />
              </div>
            </>
          )}
        </div>
        </div>
      )}
    </>
  );

  // ─── WHO OWES ME, AND WHAT WENT OUT ─────────────────────────────────────
  const right = (
    <>
      {/* A SECTION WITH NOTHING IN IT IS NOT DRAWN — no dashed box saying
          "Nothing outstanding", which was Part B row 11 and is the one thing
          §1a is most explicit about. Nothing outstanding is good news and it
          does not need a container. */}
      {unpaid.length > 0 && (
        <div className="tight">
          <span className="label">Waiting on payment · {money(unpaidTotal)}</span>
          {unpaid.map((b) => (
            <div className="card" key={b.id}>
              {/* No status stripe. Every row here is waiting on payment, so a
                  status colour down the edge carried nothing — and inside a
                  card it was the named never-default, an accent bar on a
                  rounded card. See docs/dashboard-skeletons.md §5a. */}
              <div role="button" tabIndex={0}
                onClick={() => setSelected(b)} style={{ cursor: "pointer" }}
                onKeyDown={(e) => { if (e.key === "Enter") setSelected(b); }}>
                <div className="row top between">
                  <div>
                    <div className="strong">{b.customer_name}</div>
                    <div className="quiet" style={{ marginTop: 2 }}>
                      {new Date(`${b.booking_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {(b.services ?? []).length ? ` · ${b.services.map((s) => s.name_at_booking).join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="strong num">{money(b.final_amount ?? b.total_price)}</div>
                </div>
              </div>
              <hr className="rule" />
              <button className="btn primary" disabled={markingPaid === b.id} onClick={() => markPaid(b)}>
                {markingPaid === b.id ? "Marking paid…" : "Mark paid"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="tight">
        <div className="row between">
          <span className="label">Expenses · {period.label}</span>
          <button className="btn sm inline filled" onClick={() => setAdding(true)}>
            <Plus strokeWidth={2} /> Add
          </button>
        </div>
        {periodExpenses.length > 0 && (
          <div className="sunken">
            {shownExpenses.map((e, i) => (
              <div key={e.id}>
                {i > 0 && <hr className="rule tight" />}
                <div className="row top between">
                  <div>
                    <div className="body">{e.description}</div>
                    <div className="quiet" style={{ marginTop: 2 }}>
                      {new Date(`${e.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {e.category}
                    </div>
                  </div>
                  <div className="body num">{money(e.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* A SILENT TRUNCATION READS AS A COMPLETE LIST. Twelve rows and then
            the count of what is not on the screen. */}
        {periodExpenses.length > EXPENSE_CAP && (
          <button className="btn sm" onClick={() => setAllExpenses((v) => !v)}>
            {allExpenses
              ? "Show fewer"
              : `+${periodExpenses.length - EXPENSE_CAP} more in ${period.label}`}
          </button>
        )}
      </div>
    </>
  );

  const modals = (
    <>
      {adding && (
        <ExpenseModal onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); loadExtras(); }} />
      )}
      {/* A job is a RECORD: beside its list at a desk, a sheet below --wrap
          (§1d). It was a <Sheet> at every width here, which made the same
          object open two different ways depending on which screen you
          reached it from — and a modal over the figures you are reading it
          against is the thing RecordHost exists to stop. At a desk it takes
          the second column, which is where its list is. */}
      {selected && (
        <RecordHost onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => { setSelected(null); reload(); loadExtras(); }} />
        </RecordHost>
      )}
    </>
  );

  return wide ? (
    <div className={`split money${refreshing ? " refreshing" : ""}`} aria-busy={refreshing || undefined}>
      <div className="group col-1">{left}</div>
      {!selected && <div className="group col-2">{right}</div>}
      {modals}
    </div>
  ) : (
    <div className={`group${refreshing ? " refreshing" : ""}`} aria-busy={refreshing || undefined}>
      {left}
      {right}
      {modals}
    </div>
  );
}

// tone="good" is money the detailer earned, so it is the fixed house green and
// NOT the tenant's accent — theme.css § THE ACCENT, the owner's rule of
// 2026-08-30: "money green is all kind of cohesive."
function Cell({ label, value, tone }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="strong num" style={{ marginTop: 4, color: tone === "good" ? "var(--ac)" : undefined }}>
        {value}
      </div>
    </div>
  );
}

// Change against the SAME period, one step back — this week vs last week,
// this year vs last year (W6). The arrow carries it and the colour agrees:
// green up, red down, fixed for every tenant.
//
// Lifetime has nothing to compare against, so it says nothing rather than
// inventing a previous lifetime.
function Delta({ now, prev, noun, hide }) {
  if (hide) return null;
  if (!prev) return <p className="quiet" style={{ marginTop: 6 }}>No comparison yet</p>;
  const diff = now - prev;
  if (Math.abs(diff) < 0.005) return <p className="quiet" style={{ marginTop: 6 }}>Same as last {noun}</p>;
  const up = diff > 0;
  const pct = Math.round(Math.abs(diff / prev) * 100);
  return (
    <div className="row" style={{ gap: 8, marginTop: 6 }}>
      <span className={`delta ${up ? "up" : "down"}`}>{up ? "▲" : "▼"} {pct}%</span>
      <span className="quiet">vs {money(prev)} last {noun}</span>
    </div>
  );
}
