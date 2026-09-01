// Money — one lead figure, then everything else demoted to a row.
//
// The numbers ported from the reference admin (which was better on
// information and worse on treatment, so the treatment was left behind):
//
//   NET AFTER EXPENSES as the lead figure, not "money in". Revenue is a
//     vanity number when you buy your own supplies.
//   QUOTED vs ADDED ON SITE — the split between what was sold through the
//     booking page and what was sold standing in the driveway. Read off
//     booking_line_items, which is exactly what the old screen did. This is
//     the one number that changes how someone works.
//   TIPS — total, average, and what share of jobs tipped.
//
// Left behind: the four decorative metric colours (green/emerald/purple/blue
// for four metrics, where purple was not in the token set at all), and the
// md:-scaled layout that made the phone view a squeezed desktop.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { money, todayLocal } from "../lib/format.js";
import { PERIOD_KINDS, bucketsFor, inPeriod, periodAt } from "../lib/periods.js";
import { api } from "../lib/api.js";
import ExpenseModal from "../components/ExpenseModal.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import Sheet from "../components/Sheet.jsx";

// Line-item categories that represent money sold at the job rather than
// through the booking page. A discount is negative and belongs on the same
// side of the ledger, so it nets against the upsell rather than hiding.
// What to call a period in a sentence: "Net this week", "vs last 6 months".
const NOUN = { week: "week", month: "month", "6m": "6 months", year: "year", all: "all time" };

const ON_SITE = new Set(["upgrade", "add_on", "custom", "travel_fee", "discount"]);

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
  const { bookings, loading, reload } = useBookings(from, to);
  const [expenses, setExpenses] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(null);

  const loadExtras = useCallback(async () => {
    const [e, li] = await Promise.all([
      supabase.from("expenses").select("*").eq("business_id", business.id)
        .gte("date", from).lte("date", to).order("date", { ascending: false }),
      supabase.from("booking_line_items").select("booking_id, category, amount, quantity")
        .eq("business_id", business.id),
    ]);
    setExpenses(e.data ?? []);
    setLineItems(li.data ?? []);
  }, [business.id, from, to]);

  useEffect(() => { loadExtras(); }, [loadExtras]);

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
      unpaid: done.filter((b) => b.payment_status === "pending" || b.payment_status === "partial"),
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
    } finally {
      setMarkingPaid(null);
    }
  };

  if (loading) return <div className="center"><div className="spinner" /></div>;

  const peak = Math.max(1, ...stats.chart.map((c) => Math.abs(c.value)));
  const unpaidTotal = stats.unpaid.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  const periodExpenses = expenses.filter((e) => inPeriod(e.date, period));

  return (
    <div className="group">
      <div className="tight">
        <h1 className="display">Money</h1>
        {/* W6. The chips choose the LENGTH, the arrows choose WHICH one —
            two questions, two controls, which is what every dashboard that
            does this does. Changing the length keeps you on the current one
            rather than trying to map "three months ago" onto weeks. */}
        <div className="chiprow wrap" role="group" aria-label="Time range">
          {PERIOD_KINDS.map(([k, label]) => (
            <button key={k} className={`chip ${kind === k ? "active" : ""}`}
              onClick={() => { setKind(k); setOffset(0); }}>{label}</button>
          ))}
        </div>
        {/* Lifetime does not step: there is only one of it. */}
        <div className="row between" style={{ marginTop: 2, minHeight: 34 }}>
          {kind === "all" ? <span /> : (
            <button className="btn ghost inline" aria-label="Previous period"
              onClick={() => setOffset(offset - 1)}>
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
          )}
          <span className="strong">{period.label}</span>
          {kind === "all" ? <span /> : (
            <button className="btn ghost inline" aria-label="Next period"
              disabled={offset >= 0}
              onClick={() => setOffset(offset + 1)}>
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* One lead figure. Net, not revenue — revenue is a vanity number when
          you buy your own supplies. */}
      <div>
        <span className="label">
          {kind === "all" ? "Net, all time" : offset === 0 ? `Net this ${NOUN[kind]}` : `Net that ${NOUN[kind]}`}
        </span>
        <div className="figure lead" style={{ marginTop: 4 }}>{money(stats.netNow)}</div>
        <Delta now={stats.netNow} prev={stats.netPrev} noun={NOUN[kind]} hide={kind === "all"} />
        <div className="bars" style={{ marginTop: 14 }}>
          {/* The bars looked tappable and were not; now they pick the month. */}
          {stats.chart.map((c, i) => (
            // A LOSS MUST NOT LOOK LIKE A WIN. The bar height is |value|, so
            // -$189 and +$189 drew the identical bar — survivable while this
            // screen only ever showed months, and not once W6 added a week,
            // where "expenses, no completed jobs yet" is a normal Tuesday.
            // Red, and fixed for every tenant: money down is MEANING, which
            // is law 11b, and it is the same red .delta.down already uses.
            <button key={c.key} type="button"
              className={`${c.value < 0 ? "neg " : ""}${c.key === period.start ? "on" : ""}`}
              aria-label={`Show ${c.label}`}
              disabled={c.offset === null}
              onClick={() => c.offset !== null && setOffset(c.offset)}
              style={{ "--i": i, height: `${Math.max(3, (Math.abs(c.value) / peak) * 100)}%` }} />
          ))}
        </div>
        <div className="barlabels">
          {stats.chart.map((c) => <span key={c.key}>{c.label}</span>)}
        </div>
      </div>

      {/* Context, not content: one sunken block instead of eight cards. */}
      <div className="sunken">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 8px" }}>
          <Cell label="Collected" value={money(stats.inNow)} />
          <Cell label="Expenses" value={money(stats.outNow)} />
          <Cell label="Avg job" value={money(stats.avgJob)} />
          <Cell label="Jobs done" value={String(stats.jobsNow)} />
        </div>

        <hr className="rule" />

        {/* The split the old screen had and this one didn't. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Cell label="Tips" value={money(stats.tipTotal)} />
              <Cell label="Avg tip" value={money(stats.avgTip)} />
              <Cell label="Tipped"
                value={stats.jobsNow ? `${Math.round((stats.tippedJobs / stats.jobsNow) * 100)}%` : "—"} />
            </div>
          </>
        )}
      </div>

      <div className="tight">
        <span className="label">
          Waiting on payment{unpaidTotal > 0 ? ` · ${money(unpaidTotal)}` : ""}
        </span>
        {stats.unpaid.length === 0
          ? <div className="dashed">Nothing outstanding.</div>
          : stats.unpaid.map((b) => (
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

      <div className="tight">
        <div className="row between">
          <span className="label">Expenses · {period.label}</span>
          <button className="btn sm inline filled" onClick={() => setAdding(true)}>
            <Plus strokeWidth={2} /> Add
          </button>
        </div>
        {periodExpenses.length === 0
          ? <div className="dashed">Nothing logged in this period.</div>
          : (
            <div className="sunken">
              {periodExpenses.slice(0, 12).map((e, i) => (
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
      </div>

      {adding && (
        <ExpenseModal onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); loadExtras(); }} />
      )}
      {selected && (
        <Sheet onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => { setSelected(null); reload(); loadExtras(); }} />
        </Sheet>
      )}
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
