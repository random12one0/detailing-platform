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
import { BarChart3, ChevronLeft, ChevronRight, Download, Link2 as LinkIcon, Plus } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { fetchBooking, useBookings, withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import { useWide } from "../hooks/useWide.js";
import { localDate, money, todayLocal } from "../lib/format.js";
import { PERIOD_KINDS, bucketsFor, inPeriod, periodAt, previousSoFar } from "../lib/periods.js";
import { accountantCsv, accountantFilename } from "../lib/accountant-export.js";
// The floor both money screens obey. See moneyAdvanced.js for why it is one
// number rather than one per screen.
//
// **`ON_SITE` USED TO BE IMPORTED HERE TOO AND IS NOT ANY MORE — ROADMAP
// 14.7, and it is a step further than 14.6a got.** That item ended the second
// COPY of the list by importing the one list. This screen no longer needs the
// list at all: the figure it fed — *Added on site* — comes out of the same
// `advancedMoney` call as every other number on the screen, so there is one
// list, one place that reads it, and nothing here to keep in step.
import { RATE_FLOOR } from "../lib/moneyAdvanced.js";
// ROADMAP 4.2 — the same arithmetic Tracking links runs, so the two screens
// cannot print different numbers for the same flyer. See the block below.
import { whereFrom } from "../lib/moneyAdvanced.js";
import { api } from "../lib/api.js";
import ExpenseModal, { categoryWord } from "../components/ExpenseModal.jsx";
import BulkJobModal from "../components/BulkJobModal.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import { Segmented } from "../components/controls.jsx";
import RecordHost from "../components/RecordHost.jsx";
import AdvancedMoney from "../components/AdvancedMoney.jsx";
// ROADMAP 8.9 — the same arithmetic the advanced screen runs, used here for
// exactly one cell. His own late ask: *"I think you really should add, like,
// our most popular packages... even just on the regular money page."*
import { advancedMoney } from "../lib/moneyAdvanced.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { appIntlLocale, getAppLocale, t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// What to call a period in a sentence.
//
// **ROADMAP 8.17 STAGE 2B — THESE ARE FOUR WHOLE SENTENCES EACH, NOT ONE
// SENTENCE AND A NOUN, AND THAT IS THE TRANSLATION FORCING IT.** English glues
// `"Net this " + noun` and gets away with it because `this` never changes.
// Spanish agrees the demonstrative with the noun's GENDER — *esta semana* but
// *este mes* — so a `{period}` placeholder produces a sentence that is wrong
// half the time, in a language nobody here can check. Four keys apiece is the
// only shape that can be right.
//
// It is the same rule as everywhere else in this file, at the point where it
// actually costs something: *a placeholder is a whole sentence's worth of
// freedom, and a translation has to be free to change the words around it.*
// **THEY SAID "NET" AND A DETAILER READ IT AS "KEPT" — ROADMAP 5.1, SETTLED
// BY 14.7.** The figure is `earned − expenses` and it counts work finished in
// the period whether or not a dollar of it has arrived: measured on the demo
// business on 2026-09-17, *Net, all time* read $3,643 while the cash actually
// received less expenses was $3,348 — overstated by $295, to the dollar the
// amount three customers still owe. The maths is right and stays (the chart,
// the month-on-month delta and the accountant file all count the same way);
// the WORD was the whole defect. "Earned less expenses" cannot be read as
// money in a bank account, and *Collected* and *Still owed* now sit in the
// breakdown under it so the missing part is on the screen rather than implied.
const NET_NOW = {
  week: "Earned less expenses this week", month: "Earned less expenses this month",
  "6m": "Earned less expenses, these 6 months", year: "Earned less expenses this year",
};
const NET_THEN = {
  week: "Earned less expenses that week", month: "Earned less expenses that month",
  "6m": "Earned less expenses, those 6 months", year: "Earned less expenses that year",
};
const SAME_AS_LAST = {
  week: "Same as last week", month: "Same as last month",
  "6m": "Same as the 6 months before", year: "Same as last year",
};
const VS_LAST = {
  week: "vs {amount} last week", month: "vs {amount} last month",
  "6m": "vs {amount} the 6 months before", year: "vs {amount} last year",
};
// **AND THE SAME TWO SENTENCES AGAIN FOR A PERIOD THAT IS STILL RUNNING —
// ROADMAP 5.2.** The comparison is now against the same point in the period
// before (`previousSoFar` in `lib/periods.js`), so it has to say so: "vs $412
// last month" beside seventeen days of September is a claim about the whole of
// August, and the whole of August is not what the figure beside it counted.
// Eight keys rather than a `{when}` placeholder, for the reason the four above
// are four: Spanish agrees the demonstrative with the noun's gender, so a
// placeholder produces a sentence that is wrong half the time.
const SAME_AS_LAST_SO_FAR = {
  week: "Same as this point last week", month: "Same as this point last month",
  "6m": "Same as this point in the 6 months before", year: "Same as this point last year",
};
const VS_LAST_SO_FAR = {
  week: "vs {amount} at this point last week", month: "vs {amount} at this point last month",
  "6m": "vs {amount} at this point in the 6 months before", year: "vs {amount} at this point last year",
};

// Line-item categories that represent money sold at the job rather than
// through the booking page.
//
// **IMPORTED NOW, NOT RE-LISTED, AND THAT IS THE WHOLE POINT.** This file held
// its own copy and `moneyAdvanced.js` held another, with a comment there
// promising the two would "move together". They did not: this one was right and
// that one listed three categories the database refuses outright, so the same
// words — *"Sold at the job"* — meant two different figures on two screens.
// ROADMAP 14.6 found it by putting the first row this product has ever had into
// `booking_line_items`. One list, one import, no second copy to drift.

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

export default function Money({ onGo }) {
  useAppLocale();
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
  // The month and week LABELS come out of `periods.js`, which takes the
  // locale rather than reading it — see that file's header.
  const period = periodAt(kind, today, offset, appIntlLocale());
  // ROADMAP 5.2 — TRIMMED TO THE SAME POINT WHILE THIS PERIOD IS STILL
  // RUNNING, and left whole once it is over. Every comparison on this screen
  // and on the advanced one behind it comes from this one object: `stats`
  // passes it to `advancedMoney`, and `AdvancedMoney` gets the same value as a
  // prop, so the four tiles there cannot compare against a different stretch
  // of time from the headline here. `.partial` is what the label reads.
  const previous = previousSoFar(
    period, periodAt(kind, today, offset - 1, appIntlLocale()), today);
  const buckets = useMemo(() => bucketsFor(kind, today, offset, appIntlLocale()), [kind, today, offset]);
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
  // ROADMAP 4.2 — the links themselves and every open of one. Two small reads;
  // a detailer has a handful of links and a few hundred opens a year.
  const [campaigns, setCampaigns] = useState([]);
  const [visits, setVisits] = useState([]);
  const [extrasError, setExtrasError] = useState("");
  const [adding, setAdding] = useState(false);
  // ROADMAP 8.10 — the dealership job, logged after the fact with no
  // automatic pricing. It lives on Money rather than on Today because what
  // the detailer is recording is what they were PAID; the job itself is
  // already done and nobody is being scheduled.
  const [loggingBulk, setLoggingBulk] = useState(false);
  const [allExpenses, setAllExpenses] = useState(false);
  const [selected, setSelected] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [sent, setSent] = useState("");
  // THE FULL PICTURE, BEHIND A BUTTON — his word for it, twice, and the
  // everyday screen stays four figures because of it. It is a MODE of this
  // screen rather than a route: same rows, same period control above it, and
  // closing it puts the detailer back exactly where they were.
  const [advanced, setAdvanced] = useState(false);

  const loadExtras = useCallback(async () => {
    const [e, li, up, cp, cv] = await Promise.all([
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
      // THE LINKS AND EVERY OPEN OF ONE. Not date-filtered on the server: the
      // period control on this screen moves, and re-reading the whole table on
      // every step of the stepper is more round trips than a detailer's few
      // hundred rows are worth. `whereFrom` does the period filtering.
      supabase.from("campaigns").select("id, name, slug, is_active")
        .eq("business_id", business.id),
      supabase.from("campaign_visits").select("campaign_id, visitor_id, referrer, created_at")
        .eq("business_id", business.id),
    ]);
    // A FAILED READ MUST NOT LOOK LIKE AN EMPTY MONTH. `data ?? []` on all
    // three of these turned a dropped connection into "no expenses, nothing
    // outstanding, nothing sold on site" — the same defect useBookings
    // carried until stage 3, one file over. The last good figures stay drawn
    // and the message goes above them.
    const failed = [e.error, li.error, up.error, cp.error, cv.error].find(Boolean);
    setExtrasError(failed ? (failed.message || t("Could not load your expenses.")) : "");
    if (e.data) setExpenses(e.data);
    if (li.data) setLineItems(li.data);
    if (up.data) setUnpaid(up.data.map((b) => withLocal(b, business.timezone)));
    if (cp.data) setCampaigns(cp.data);
    // A LOCAL DATE, DERIVED HERE. `created_at` is UTC and the period is a run
    // of local dates; `moneyAdvanced.js` may not know a timezone, which is why
    // every caller hands it dates rather than instants.
    if (cv.data) setVisits(cv.data.map((v) => ({ ...v, date: localDate(v.created_at, business.timezone) })));
  }, [business.id, business.timezone, from, to, period.end]);

  useEffect(() => { loadExtras(); }, [loadExtras]);
  // A new period is a new list; leaving it expanded carries one period's
  // decision onto the next one.
  useEffect(() => { setAllExpenses(false); setSent(""); }, [kind, offset]);

  // ─── ONE ARITHMETIC, NOT TWO — ROADMAP 14.7 ─────────────────────────────
  //
  // **THIS BLOCK USED TO ADD THE MONEY UP ITSELF.** It had its own
  // `revenueIn`, its own expense filter, its own net, its own average job and
  // its own quoted/added split — every one of them a second implementation of
  // a figure `lib/moneyAdvanced.js` was already computing for the screen
  // behind "The full picture", from the same rows, on the same period. Two
  // copies of one number, which is ROADMAP 14.6a's defect exactly: *the same
  // figure computed from two copies of one list that had drifted.*
  //
  // THEY HAD ALREADY STARTED TO DIFFER, AND NOT IN THE VALUE. `moneyAdvanced`
  // hardens every amount with `num()` (a non-numeric reads as 0) while this
  // block used a bare `Number()` (a non-numeric turns the WHOLE figure into
  // `NaN`), and it named the accrual total `inNow` where that file named it
  // `collected`. Nobody had to be careless for these to diverge; they only
  // had to be edited on different days.
  //
  // SO THE SCREEN NO LONGER DOES ARITHMETIC. It calls `advancedMoney` — the
  // one this file already called for the most-booked package, widened to keep
  // the rest of what it returns instead of throwing it away — and the six-bar
  // chart calls it once per bucket, so the bar for the selected month and the
  // headline above it cannot disagree about that month. The comment on the old
  // `top` call made this argument and then discarded the answer.
  const stats = useMemo(() => {
    const m = advancedMoney({ bookings, expenses, lineItems, period, previous });

    // THE CHART IS THE SAME FIGURE, SIX TIMES. A bucket is a period, `net` is
    // the one definition of net, and a bar the detailer can tap to land on a
    // headline that reads differently is worse than no chart.
    const chart = buckets.map((b) => ({
      key: b.start, label: b.tick, offset: b.offset,
      value: advancedMoney({ bookings, expenses, lineItems, period: b }).net,
    }));

    return {
      // accrual — work FINISHED in the period, paid for or not
      earned: m.earned, outNow: m.spent, jobsNow: m.jobs,
      netNow: m.net, netPrev: m.prevNet,
      avgJob: m.avgTicket,
      // cash — of that, what has and has not arrived
      collected: m.collected, owed: m.owed,
      quoted: m.quoted, onSite: m.onSite,
      tipTotal: m.tipTotal, tippedJobs: m.tippedJobs, avgTip: m.avgTip,
      top: m.packages[0] ?? null,
      chart,
      // The ROWS, for the accountant file — the only thing on this screen that
      // needs the bookings themselves rather than a total of them.
      jobsDone: bookings.filter((b) => b.status === "completed"
        && inPeriod(b.booking_date, period)),
    };
  }, [bookings, expenses, lineItems, period, previous, buckets]);

  // WHICH PACKAGE SELLS MOST is the only one of the advanced figures that
  // changes what a detailer does TOMORROW, which is why it earns a place
  // beside four that describe today. It comes out of the same call as
  // everything else now rather than out of a second one.
  const top = stats.top;

  // ─── WHERE THE BOOKINGS CAME FROM ──────────────────────────────────────
  //
  // **HIS ASK, MORE THAN ONCE, MOST RECENTLY 2026-09-13:** *"you could see
  // where your bookings come from... which one has the highest conversion rate
  // or which one gets the most clicks"*, so that if he pays for an ad he can
  // tell what came from that ad. His verdict on what was here before: it is
  // *"just a tracking link"* and it should be *"more of a feature"*.
  //
  // **WHAT WAS HERE WAS A ONE-LINE DOOR AND THE NUMBERS WERE TWO TAPS AWAY.**
  // The comment it replaces argued for that on the grounds that a second copy
  // of the figures is how two screens come to disagree. **The argument was
  // right and the conclusion was wrong** — the fix for two copies is ONE
  // ARITHMETIC, not one screen. `whereFrom` in `lib/moneyAdvanced.js` is that
  // arithmetic, it was already written and already tested with no live caller,
  // and Tracking links now reads through it too. Neither screen counts
  // anything itself, so neither can be the one that is wrong.
  //
  // PERIOD-SCOPED, like every other figure on this screen. The control at the
  // top governs the whole page and a lifetime number sitting inside it would
  // be the one thing on Money that ignores the period. Tracking links is the
  // all-time view of the same rows.
  const sources = useMemo(
    () => whereFrom({
      campaigns,
      visits,
      bookings: bookings.filter((b) => inPeriod(b.booking_date, period)),
      period,
    }),
    [campaigns, visits, bookings, period],
  );
  // A LINK THAT DID NOTHING IN THIS PERIOD IS NOT DRAWN. Last spring's
  // postcard on a September screen is a row of dashes that pushes the flyer
  // that is working further down the page.
  // A LINK IS DRAWN IF IT DID SOMETHING IN THIS PERIOD, and a link that is
  // TURNED OFF is drawn only if it still produced a booking. Last spring's
  // postcard picking up one stray open in September is a row of dashes above
  // the flyer that is actually working.
  const active = sources.links.filter((l) => (l.active && l.people > 0) || l.bookings > 0);
  const maxBooked = Math.max(0, ...active.map((l) => l.bookings));

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
        await navigator.share({ files: [file], title: `${business.name} · ${period.label}` });
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
    setSent(t("Saved as {name}", { name }));
  };

  // THE PERIOD CONTROL IS LIFTED OUT OF THE SCREEN'S BODY — roadmap 8.9.
  // **The advanced view renders it too, and rendering it TWICE from two
  // copies is how one of them quietly stops matching the other.** It is the
  // one control that decides every figure on this tab, in both modes, so it
  // has exactly one definition.
  const periodControl = (
        <div className="moneyhead" data-tour="period">
          <Segmented label={t("Time range")} value={kind} options={PERIOD_KINDS}
            onChange={(k) => { setKind(k); setOffset(0); }} />
          {/* Lifetime does not step: there is only one of it. */}
          <div className="moneyhead-when">
            {kind === "all" ? null : (
              <button className="btn ghost icon" aria-label={t("Previous period")}
                onClick={() => setOffset(offset - 1)}>
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
            )}
            <span className="strong">{t(period.label)}</span>
            {kind === "all" ? null : (
              <button className="btn ghost icon" aria-label={t("Next period")}
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
              <button className="btn sm inline export" data-tour="export" onClick={sendToAccountant}
                aria-label={`${t("Export")} ${t(period.label)}`}>
                <Download strokeWidth={2} /> {t("Export")}
              </button>
            )}
          </div>
          {sent && <span className="quiet sent" aria-live="polite">{sent}</span>}
        </div>
  );

  // ─── WHAT DID I MAKE ────────────────────────────────────────────────────
  //
  // **FOUR FRAGMENTS RATHER THAN TWO, BECAUSE THE PHONE'S ORDER IS NOT THE
  // DESK'S — 2026-09-13.** At a desk the two columns are read side by side, so
  // *who owes me* is already in view beside the net figure. On a phone
  // `{left}{right}` put the unpaid list BELOW the chart, the whole breakdown,
  // the most-booked rows and two doors — roughly 900px down, which is the
  // second of this screen's two questions answered last. The pieces are named
  // so the two orders can differ without either one being a copy of the other.
  const lead = (
    <>
      <h1 className="display">{t("Money")}</h1>

      {/* Above the figures, and the last good period stays drawn. */}
      {(error || extrasError) && <div className="error-box">{error || extrasError}</div>}

      {/* ONE LINE AT A DESK. The segmented control chooses the LENGTH and the
          stepper chooses WHICH one — two questions, two controls, which is
          what every dashboard that does this does. Changing the length keeps
          you on the current one rather than trying to map "three months ago"
          onto weeks. */}
      {periodControl}

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
      {/* data-tour on the SWAP's wrapper rather than on the swap itself: the
          swap is keyed and React replaces it on every period change, and an
          attribute on a node that is replaced is one the tour's static lookup
          can miss. The wrapper is always the same element. */}
      <div>
      <div className="swap" key={`${kind}|${offset}`} data-tour="net">
        <span className="label">
          {kind === "all"
            ? t("Earned less expenses, all time")
            : t(offset === 0 ? NET_NOW[kind] : NET_THEN[kind])}
        </span>
        <div className="figure lead" style={{ marginTop: 4 }}>{money(stats.netNow)}</div>
        <Delta now={stats.netNow} prev={stats.netPrev} kind={kind} hide={kind === "all"}
          soFar={previous.partial} />

        {!anything ? (
          <p className="body" style={{ marginTop: 10 }}>
            {kind === "all"
              ? t("Nothing recorded yet.")
              : t("Nothing recorded in {period}.", { period: period.label })}
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
          {/* **A CHART WITH NO NUMBER ON IT — 2026-09-12.** Six bars, month
              names underneath, and nothing anywhere saying how big any of them
              is: the chart could be ranked and not read. Every bar already
              carries its own value in `aria-label`, so a listener had the
              figure and a reader did not.
              ONE LINE RATHER THAN SIX FIGURES. Six money amounts under six
              month names is ~360px of content in the 330px a phone has, and
              `.barlabels` is already the tightest row on this screen. The
              tallest bar plus where zero is turns the drawing into a scale,
              which is what was actually missing.
              THE ZERO RULE ITSELF ALREADY EXISTS — `.bars::after`, moved to
              60% by `.bars.signed`. This names it; it does not draw a second
              one. */}
          <p className="quiet barscale">
            {signed
              ? t("Tallest bar {peak}. The line across is zero.", { peak: money(peak) })
              : t("Tallest bar {peak}.", { peak: money(peak) })}
          </p>
          <div className="barlabels">
            {stats.chart.map((c) => (
              <span key={c.key} className={c.key === period.start ? "on" : undefined}>{c.label}</span>
            ))}
          </div>
        </>)}
      </div>
      </div>

    </>
  );

  // ─── THE SAME PERIOD, BROKEN DOWN ───────────────────────────────────────
  const context = (
    <>
      {/* Context, not content: one sunken block instead of eight cards.
          Same swap and the same key as the figures above — this block is the
          same period's numbers and must not resolve a beat after them. */}
      {anything && (
        <div>
        <div className="sunken swap" key={`ctx-${kind}|${offset}`} data-tour="breakdown">
          <div className="paircells">
            {/* ── THE CONTRADICTION THIS BLOCK USED TO CARRY, AND HOW IT WAS
                SETTLED — ROADMAP 14.7, 2026-09-17 ──────────────────────────
                **WHAT STOOD HERE SAID THE MATHS "HAS TO STAY THAT WAY" AND
                ROADMAP 5.1 SAID TO CHANGE IT. Both could not be right, and
                that unresolved pair is why 14.7 was opened as its own item
                rather than folded into 5.1.**
                THE HISTORY, BECAUSE THE REVERSAL IS THE LOAD-BEARING PART.
                On 2026-09-12 this cell was labelled COLLECTED while counting
                work merely FINISHED: September read COLLECTED $410 with
                WAITING ON PAYMENT · $175 an inch below it, and Today's screen
                said "Nothing collected yet" about the same two jobs. Three
                screens, one number, two claims. The 2026-09-13 fix renamed the
                cell to "Brought in" and argued the arithmetic must not move.
                **THE ARITHMETIC ARGUMENT WAS RIGHT AND THE NEW WORD WAS STILL
                A CASH CLAIM.** "Brought in" is money that came in; $295 of it
                had not. Renaming COLLECTED to BROUGHT IN moved the same false
                promise one word to the left, and the headline above still said
                *Net*, which a detailer reads as *kept*.
                **SO: 5.1 WINS ON THE LABELS, THE OLD COMMENT WINS ON THE
                MATHS** — 14.7's own recommendation, and it is the only reading
                under which nothing on this screen has to lie. One accrual
                figure, kept, because the six-bar chart, the *vs last month*
                delta, the tour step ("what is left after expenses, not what
                came in") and the accountant CSV all count work done in the
                period, and a cash-basis headline would disagree with the chart
                it is drawn on top of. What changes is every word: EARNED for
                the accrual total, EARNED LESS EXPENSES for the headline, and
                the cash pair below put on the screen instead of left implied.
                WHAT 5.1 ASKED FOR AND DID NOT GET, ON PURPOSE: *Expenses paid*
                stays *Expenses*. There is no paid/unpaid on an expense row —
                the table has no such column — so "Expenses paid" would be a
                new unverifiable claim replacing an honest one, which is worse
                than the label it replaces. Recorded rather than silently
                dropped. */}
            <Cell label={t("Earned")} value={money(stats.earned)} />
            <Cell label={t("Expenses")} value={money(stats.outNow)} />
            <Cell label={t("Avg job")} value={money(stats.avgJob)} />
            <Cell label={t("Jobs done")} value={String(stats.jobsNow)} />
          </div>

          {/* ── OF WHAT WAS EARNED, WHAT HAS ACTUALLY ARRIVED ─────────────
              **THE MISSING HALF OF 5.1, AND THE TWO CELLS ADD BACK TO THE ONE
              ABOVE THEM:** earned = collected + still owed, always, because
              `moneyAdvanced.js` computes the third from the other two rather
              than tallying it separately.
              THIS PAIR IS THE PERIOD'S. The *Waiting on payment* list further
              down is every period there has ever been — deliberately, because
              who owes you money is not a period question and switching from
              Month to Week used to make last month's unpaid job disappear off
              the one screen that exists to chase it. Two scopes, and the two
              are given DIFFERENT WORDS for that reason: a "Still owed" that
              meant the period in one place and all time in another is 14.6a's
              defect wearing a new coat.
              NO EXPLANATORY SENTENCE UNDER IT. `docs/screen-rules.md` names
              copy that restates the label as a never-default, and *Collected*
              beside *Still owed* under *Earned* is already the sentence. */}
          <div className="paircells tight-rows" style={{ marginTop: 10 }}>
            <Cell label={t("Collected")} value={money(stats.collected)} />
            <Cell label={t("Still owed")} value={money(stats.owed)}
              tone={stats.owed > 0 ? "bad" : undefined} />
          </div>

          <hr className="rule" />

          {/* The split the old screen had and this one didn't. */}
          {/* ROADMAP 8.9 — *"most popular packages"*, his own addition, on the
              everyday screen as well as the advanced one. The count rides with
              it because "Express Wash" alone does not say whether that is four
              jobs or forty. */}
          {/* **AND THE FLOOR REACHES THIS SCREEN TOO — 2026-09-12.** The
              first pass put it only on the advanced screen, and this summary
              went on printing *MOST BOOKED · Full Interior Detail · TIMES
              BOOKED · 1* at two finished jobs: a superlative over a
              denominator of one, which is the exact figure the floor exists
              to stop. The four cells above are COUNTED and stay — *Jobs done
              2* is a fact. Only the ranking goes, and it says why rather than
              vanishing, or the block simply looks broken in a first month. */}
          {top && (stats.jobsNow >= RATE_FLOOR ? (
            <div className="paircells tight-rows">
              <Cell label={t("Most booked")} value={top.name} wrap />
              <Cell label={t("Times booked")} value={`${top.count} · ${money(top.total)}`} wrap />
            </div>
          ) : (
            <p className="quiet">{t("Too few finished jobs to name a most-booked service.")}</p>
          ))}

          {/* **THE PAIR ABOVE THIS ONE WAS TOUCHING IT — 2026-09-13.**
              `.sunken` gives its children no gap and `.paircells` only spaces
              its own grid rows, so two adjacent pairs sat 8px apart INSIDE
              each grid and 0px between them. In the too-few-jobs case that put
              *"Too few finished jobs to name a most-booked service."* hard
              against QUOTED UP FRONT, where it read as that pair's caption
              rather than as the sentence replacing the pair above. 10px is the
              `tight-rows` row gap plus a hair, so the block still reads as one
              group. */}
          <div className="paircells tight-rows" style={{ marginTop: 10 }}>
            <Cell label={t("Quoted up front")} value={money(stats.quoted)} />
            <Cell label={t("Added on site")}
              value={`${stats.onSite >= 0 ? "+" : "−"}${money(Math.abs(stats.onSite))}`}
              tone={stats.onSite > 0 ? "good" : undefined} />
          </div>
          {stats.jobsNow >= RATE_FLOOR && stats.earned > 0 && stats.onSite > 0 && (
            <p className="quiet" style={{ marginTop: 8 }}>
              {/* **IT WAS A BARE LITERAL — FOUND.md, 2026-09-12.** The only
                  sentence on this screen that never went through `t()`, so it
                  sat in English on a Spanish dashboard while everything around
                  it translated.
                  AND IT SAID "BROUGHT IN" — ROADMAP 14.7. The denominator is
                  the accrual total, so the sentence carried the same cash
                  claim as the cell it sat under. "Earned" is what that
                  denominator is. */}
              {t("{percent}% of what you earned was sold at the job.",
                { percent: Math.round((stats.onSite / stats.earned) * 100) })}
            </p>
          )}

          {stats.tipTotal > 0 && (
            <>
              <hr className="rule" />
              <div className="paircells three tight-rows">
                <Cell label={t("Tips")} value={money(stats.tipTotal)} />
                <Cell label={t("Avg tip")} value={money(stats.avgTip)} />
                <Cell label={t("Tipped")}
                  value={stats.jobsNow ? `${Math.round((stats.tippedJobs / stats.jobsNow) * 100)}%` : "—"} />
              </div>
            </>
          )}
        </div>
        </div>
      )}

      {/* BEHIND A BUTTON — his word for it, twice. The everyday screen
          answers *how am I doing*; this answers *how am I really doing*,
          and putting the second one on the first screen is how four figures
          become eighteen for somebody who only wanted the four. */}
      {/* **IT READ AS A HEADING, NOT AS A DOOR — a 15 Pro Max, 2026-09-13.**
          `.btn.ghost` paints no border and no ground, so this was four
          centred words floating in 72px of air with a real door directly
          under them, and it was reported as "a heading above a large empty
          gap, either something failed to render or the spacing is wrong".
          Nothing had failed to render.
          THE REFERENCE WAS ONE ELEMENT AWAY. "Where your money comes from"
          is the same kind of thing — a door onto another screen — and it
          already says what is behind it, in this product's own vocabulary.
          SCREEN RULES: copy the best screen that already exists here rather
          than designing a second answer. The sentence is what is BEHIND the
          door, because "The full picture" names the control and says nothing
          about why a detailer would open it. */}
      <button className="btn ghost linkdoor" onClick={() => setAdvanced(true)}>
        <BarChart3 strokeWidth={2} />
        <span>
          <b>{t("The full picture")}</b>
          <small>{t("Where the money went, what each service earns, and what is still owed.")}</small>
        </span>
        <ChevronRight strokeWidth={2} className="linkdoor-go" />
      </button>

      {/* ── BOOKING SOURCES ────────────────────────────────────────────
          **HIS CALL, 2026-09-11:** *"the through-your-links thing… should be a
          different tab or more accessible, because right now it's kind of in
          the middle of all this stuff… it should all be one GUI, and it should
          be outside of the advanced pricing. I think that was the wrong call
          by me."* So it is on the everyday screen.
          **AND ON 2026-09-13 HE SAID THE DOOR WAS NOT ENOUGH.** What stood
          here was one line of text leading to a screen with the numbers behind
          it, and his verdict was that the whole thing is *"just a tracking
          link"* when he wants to *"see where your bookings come from… which one
          has the highest conversion rate or which one gets the most clicks"*.
          A door cannot be compared at a glance; two rows of figures can.
          THE OLD COMMENT ARGUED FOR THE DOOR ON THE GROUNDS THAT A SECOND COPY
          OF THE FIGURES IS HOW TWO SCREENS DISAGREE. That was right about the
          risk and wrong about the fix: both screens read `whereFrom` now, so
          there is one arithmetic and two views of it.
          THE BARS ARE THE POINT, AND THEY ARE THE SAME REGISTER AS "WHERE IT
          WENT" ON THE ADVANCED SCREEN — the one block on that page he reads
          fastest. Ranking by eye is the job here; three numbers do not rank. */}
      <div className="tight" data-tour="sources">
        <span className="label">{t("Booking sources")}</span>
        {sources.links.length === 0 ? (
          /* NO LINKS AT ALL. One sentence, and the door under it is the
             action — no dashed box, per Part B row 11. */
          <p className="body">
            {t("You have no links yet. Make one for each place you advertise and this shows which of them brings in work.")}
          </p>
        ) : active.length === 0 ? (
          <p className="body">
            {t("None of your links were opened in this period.")}
          </p>
        ) : (
          <div className="sunken">
            {active.slice(0, 4).map((l) => (
              <div className="advmeter" key={l.id}>
                <span className="advmeter-k">{l.name}</span>
                {/* NO TRACK WHEN NOTHING HAS BEEN BOOKED THROUGH ANY OF THEM.
                    A row of 2%-wide stubs is a chart of nothing, and it reads
                    as four links that all did equally badly rather than as no
                    data yet. */}
                {maxBooked > 0 && (
                  <span className="advmeter-bar" aria-hidden="true">
                    {/* NO STUB AT ZERO. `Math.max(2, …)` is right for an
                        expense category, which cannot be zero and be in the
                        list; here a link with no bookings is exactly the row
                        a detailer needs to see as empty, and a 2% sliver
                        reads as a small amount rather than as none. */}
                    {l.bookings > 0 && (
                      <span style={{ width: `${Math.max(4, Math.round((l.bookings / maxBooked) * 100))}%`,
                        background: "var(--ac)" }} />
                    )}
                  </span>
                )}
                {/* NOT `.num`. That is the tabular face and it is right for a
                    column of money; on "2 booked" it spaces the word away
                    from its own figure. */}
                <span className="advmeter-v">
                  {t("{n} booked", { n: l.bookings })}
                </span>
                {/* THE THREE FIGURES HE NAMED, UNDER THE NAME THEY BELONG TO.
                    A part with no number is dropped rather than printed as a
                    zero: "0%" off no opens is not a poor conversion rate, it
                    is no data, and the two look identical on a screen. */}
                <span className="advmeter-sub">
                  {[
                    l.people ? t("{n} opened", { n: l.people }) : null,
                    l.people ? t("{percent}% booked", { percent: Math.round(l.rate * 100) }) : null,
                    l.earned ? t("{amount} earned", { amount: money(l.earned) }) : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        )}
        {/* HOW MUCH OF THE PICTURE IS ACTUALLY BEING MEASURED. On a dashboard
            with one link it is 3 of 11, which is the honest reading and the
            reason to make more of them. */}
        {sources.bookedAtAll > 0 && (
          <p className="quiet" style={{ marginTop: 8 }}>
            {t("{n} of {m} bookings came through a link. “Earned” only counts jobs you have finished.",
              { n: sources.bookedThroughLink, m: sources.bookedAtAll })}
          </p>
        )}
      </div>

      {/* ONE PLACE TO MAKE A LINK, AND IT IS NOT HERE — his ruling, 2026-09-13.
          A second maker is a second set of rules about slugs and discounts.
          The sentence says what is behind the door rather than naming the
          control, which is the pattern "The full picture" above it follows. */}
      <button className="btn ghost linkdoor" onClick={() => onGo?.("campaigns")}>
        <LinkIcon strokeWidth={2} />
        <span>
          <b>{t("Tracking links")}</b>
          <small>{t("Make a link for a flyer, a post or an ad, get its QR code, and see every link you have.")}</small>
        </span>
        <ChevronRight strokeWidth={2} className="linkdoor-go" />
      </button>
    </>
  );

  // ─── WHO OWES ME ────────────────────────────────────────────────────────
  const owedBlock = (
    <>
      {/* A SECTION WITH NOTHING IN IT IS NOT DRAWN — no dashed box saying
          "Nothing outstanding", which was Part B row 11 and is the one thing
          §1a is most explicit about. Nothing outstanding is good news and it
          does not need a container. */}
      {unpaid.length > 0 && (
        <div className="tight" data-tour="unpaid">
          <span className="label">{t("Waiting on payment")} · {money(unpaidTotal)}</span>
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
                      {new Date(`${b.booking_date}T12:00:00`).toLocaleDateString(appIntlLocale(), { month: "short", day: "numeric" })}
                      {(b.services ?? []).length ? ` · ${b.services.map((s) => s.name_at_booking).join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="strong num">{money(b.final_amount ?? b.total_price)}</div>
                </div>
              </div>
              <hr className="rule" />
              {/* **IT WAS `.btn.primary` AND THAT BROKE ITS OWN RULE ONCE THIS
                  BLOCK MOVED — 2026-09-13.** theme.css calls primary *"one
                  accent, spent on the single action that moves the screen
                  forward"*, and a LIST hands out one per row: two unpaid jobs
                  drew two full-width accent bars, three drew three. Below the
                  fold that was merely against the rule; directly under the net
                  figure it made them the loudest thing on a screen whose whole
                  job is that one figure being unmistakable.
                  Small and outlined, so the row still reads as a thing you can
                  act on and the accent goes back to being rare. `.btn.sm` is
                  38 painted and 44 reachable through its own `::after`. */}
              <button className="btn sm inline" disabled={markingPaid === b.id} onClick={() => markPaid(b)}>
                {markingPaid === b.id ? t("Marking paid…") : t("Mark paid")}
              </button>
            </div>
          ))}
        </div>
      )}

    </>
  );

  // ─── WHAT WENT OUT ──────────────────────────────────────────────────────
  const outgoings = (
    <>
      <div className="tight" data-tour="expenses">
        <div className="row between">
          <span className="label">{t("Expenses")} · {period.label}</span>
          <button className="btn sm inline filled" onClick={() => setAdding(true)}>
            <Plus strokeWidth={2} /> {t("Add")}
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
                      {new Date(`${e.date}T12:00:00`).toLocaleDateString(appIntlLocale(), { month: "short", day: "numeric" })} · {categoryWord(e.category, getAppLocale())}
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
              ? t("Show fewer")
              : t("+{count} more in {period}", {
                count: periodExpenses.length - EXPENSE_CAP, period: period.label })}
          </button>
        )}
      </div>

      {/* ROADMAP 8.10 — THE DEALERSHIP JOB. His instruction was that above the
          vehicle limit it is a phone call, so what the product owes him is a
          way to WRITE DOWN what he did and what he got: *"log a ton of cars
          down and how much they got from it."*

          It is a plain row rather than a figure, and it sits at the bottom
          because it is the rarest thing on this screen — a detailer does this
          a few times a year, and putting it beside Collected would give it
          the weight of something they read every day. */}
      <button className="btn ghost" style={{ marginTop: 12 }}
        onClick={() => setLoggingBulk(true)}>
        <Plus strokeWidth={2} /> {t("Add a fleet job")}
      </button>
    </>
  );

  const modals = (
    <>
      {adding && (
        <ExpenseModal onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); loadExtras(); }} />
      )}
      {loggingBulk && (
        <BulkJobModal onClose={() => setLoggingBulk(false)}
          onSaved={() => { setLoggingBulk(false); reload(); }} />
      )}
      {/* A job is a RECORD: beside its list at a desk, a sheet below --wrap
          (§1d). It was a <Sheet> at every width here, which made the same
          object open two different ways depending on which screen you
          reached it from — and a modal over the figures you are reading it
          against is the thing RecordHost exists to stop. At a desk it takes
          the second column, which is where its list is. */}
      {selected && (
        <RecordHost onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          {/* ROADMAP 4.1 / DECISIONS.md "the record stays open on a status
              change" — see Today.jsx for the fuller note; same fix, same
              reason: `selected` is a snapshot neither reload touches. */}
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => {
              reload(); loadExtras();
              fetchBooking(selected.id, business.id, business.timezone).then(setSelected);
            }} />
        </RecordHost>
      )}
    </>
  );

  // THE FULL PICTURE TAKES THE WHOLE AREA, at every width. It is eighteen
  // figures in six groups — a second column beside that is a second thing to
  // read at the same time, and the one on the right would be the unpaid list,
  // which this screen answers properly two groups down. One `.group` under
  // `.app-main` also means it arrives with the screen's own stagger and needs
  // no entrance of its own (CLAUDE.md § ANYTHING THAT OPENS).
  if (advanced) {
    return (
      <div className={`group${refreshing ? " refreshing" : ""}`} aria-busy={refreshing || undefined}>
        <h1 className="display">{t("Money")}</h1>
        {(error || extrasError) && <div className="error-box">{error || extrasError}</div>}
        {periodControl}
        <AdvancedMoney bookings={bookings} expenses={expenses} lineItems={lineItems}
          period={period} previous={previous} onClose={() => setAdvanced(false)}
          />
        {modals}
      </div>
    );
  }

  return wide ? (
    <div className={`split money${refreshing ? " refreshing" : ""}`} aria-busy={refreshing || undefined}>
      <div className="group col-1">{lead}{context}</div>
      {!selected && <div className="group col-2">{owedBlock}{outgoings}</div>}
      {modals}
    </div>
  ) : (
    // WHO OWES ME COMES SECOND ON A PHONE, straight after the net figure and
    // the chart. It is the other half of the one question this screen exists
    // to answer, and it is the half that has something to DO about it.
    <div className={`group${refreshing ? " refreshing" : ""}`} aria-busy={refreshing || undefined}>
      {lead}
      {owedBlock}
      {context}
      {outgoings}
      {modals}
    </div>
  );
}

// tone="good" is money the detailer earned, so it is the fixed house green and
// NOT the tenant's accent — theme.css § THE ACCENT, the owner's rule of
// 2026-08-30: "money green is all kind of cohesive."
// `wrap` IS A 320 FIX AND IT IS ABOUT WHAT THE VALUE *IS* — found by the width
// sweep, 2026-09-11, at 360 and 320: *Times booked* was 26px past its own cell
// at 360 and 66px past it at 320, and at 320 it dragged the whole Money screen
// sideways.
//
// The cause is that this component puts `.num` on EVERY value, and `.num` is
// `white-space: nowrap` — correct for one figure, which must never break in
// half, and wrong for the two values here that are not one figure: *Most
// booked* is a service NAME, and *Times booked* is a count AND a total with a
// separator between them. A nowrap cell in a `1fr 1fr` grid cannot shrink, so
// the TRACK grows instead and takes the page with it.
//
// So the two of them may wrap, and everything else still cannot. They keep
// `.num` — the figures inside them are still tabular — and only the one
// property that was wrong for them is changed.
function Cell({ label, value, tone, wrap }) {
  return (
    <div>
      <span className="label">{label}</span>
      {/* `bad` is the product's fixed red and never the tenant's accent —
          law 11b, money moving is meaning rather than identity. The same two
          tones `Kpi` on the advanced screen already takes, so *Still owed*
          reads the same on both. */}
      <div className="strong num" style={{
        marginTop: 4,
        color: tone === "good" ? "var(--ac)" : tone === "bad" ? "var(--bad)" : undefined,
        whiteSpace: wrap ? "normal" : undefined,
      }}>
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
//
// **`soFar` IS ROADMAP 5.2 AND IT CHANGES ONLY THE WORDS — the arithmetic was
// already right about the wrong two stretches of time.** `prev` now arrives
// cut to the same point in the period before, so seventeen days are compared
// with seventeen days; this flag is what makes the sentence beside the arrow
// say that, instead of naming a whole month the figure never counted.
function Delta({ now, prev, kind, hide, soFar }) {
  if (hide) return null;
  if (!prev) return <p className="quiet" style={{ marginTop: 6 }}>{t("No comparison yet")}</p>;
  const diff = now - prev;
  if (Math.abs(diff) < 0.005) {
    return <p className="quiet" style={{ marginTop: 6 }}>
      {t((soFar ? SAME_AS_LAST_SO_FAR : SAME_AS_LAST)[kind])}</p>;
  }
  const up = diff > 0;
  // **A PERCENTAGE ACROSS A SIGN FLIP IS ARITHMETIC WITH NO MEANING —
  // 2026-09-12.** A month that went from +$728 to -$131 printed `▼118%`: one
  // hundred and eighteen per cent of WHAT, when the two numbers are on
  // opposite sides of zero? `Math.abs(diff / prev)` is a real number and it
  // answers a question nobody asked. The distance is the honest fact, and it
  // is the one a detailer can act on — `down $859`.
  //
  // Only this case changes. Two figures on the same side of zero still take a
  // percentage, because there the ratio means what it looks like.
  //
  // AdvancedMoney carries the same rule in its own `changeWords`, and
  // deliberately not shared: that one renders a badge inside a tile and this
  // one a row with a sentence beside it, so the only thing they would share is
  // the three lines below. If a third screen needs it, lift it then.
  const flipped = (now < 0) !== (prev < 0);
  const said = flipped
    ? t(up ? "up {amount}" : "down {amount}", { amount: money(Math.abs(diff)) })
    : `${up ? "▲" : "▼"} ${Math.round(Math.abs(diff / prev) * 100)}%`;
  return (
    <div className="row" style={{ gap: 8, marginTop: 6 }}>
      <span className={`delta ${up ? "up" : "down"}`}>{said}</span>
      <span className="quiet">{t((soFar ? VS_LAST_SO_FAR : VS_LAST)[kind], { amount: money(prev) })}</span>
    </div>
  );
}
