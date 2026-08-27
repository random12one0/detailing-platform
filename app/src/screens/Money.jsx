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
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { money, todayLocal } from "../lib/format.js";
import { api } from "../lib/api.js";
import ExpenseModal from "../components/ExpenseModal.jsx";
import BookingDetail from "../components/BookingDetail.jsx";

const monthKey = (dateStr) => dateStr.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
};
const shiftMonth = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Line-item categories that represent money sold at the job rather than
// through the booking page. A discount is negative and belongs on the same
// side of the ledger, so it nets against the upsell rather than hiding.
const ON_SITE = new Set(["upgrade", "add_on", "custom", "travel_fee", "discount"]);

export default function Money() {
  const { business } = useBusiness();
  const today = todayLocal(business.timezone);
  const thisMonth = monthKey(today);
  const from = `${shiftMonth(thisMonth, -5)}-01`;
  const { bookings, loading, reload } = useBookings(from, today);
  const [expenses, setExpenses] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(null);

  const loadExtras = useCallback(async () => {
    const [e, li] = await Promise.all([
      supabase.from("expenses").select("*").eq("business_id", business.id)
        .gte("date", from).lte("date", today).order("date", { ascending: false }),
      supabase.from("booking_line_items").select("booking_id, category, amount, quantity")
        .eq("business_id", business.id),
    ]);
    setExpenses(e.data ?? []);
    setLineItems(li.data ?? []);
  }, [business.id, from, today]);

  useEffect(() => { loadExtras(); }, [loadExtras]);

  const stats = useMemo(() => {
    const lastMonth = shiftMonth(thisMonth, -1);
    const done = bookings.filter((b) => b.status === "completed");
    const inMonth = (mk) => done.filter((b) => monthKey(b.booking_date) === mk);

    const revenueIn = (mk) => inMonth(mk).reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
    const spentIn = (mk) => expenses.filter((e) => monthKey(e.date) === mk)
      .reduce((s, e) => s + Number(e.amount), 0);

    // Line items joined back to the bookings of the month in question.
    const itemsFor = (mk) => {
      const ids = new Set(inMonth(mk).map((b) => b.id));
      return lineItems.filter((li) => ids.has(li.booking_id));
    };
    const sumItems = (items, pred) => items
      .filter(pred)
      .reduce((s, li) => s + Number(li.amount) * Number(li.quantity ?? 1), 0);

    const items = itemsFor(thisMonth);
    const onSite = sumItems(items, (li) => ON_SITE.has(li.category));
    const tipTotal = sumItems(items, (li) => li.category === "tip");
    const tippedJobs = new Set(items.filter((li) => li.category === "tip").map((li) => li.booking_id)).size;

    const inNow = revenueIn(thisMonth), inPrev = revenueIn(lastMonth);
    const outNow = spentIn(thisMonth), outPrev = spentIn(lastMonth);
    const jobsNow = inMonth(thisMonth).length, jobsPrev = inMonth(lastMonth).length;

    // Everything that wasn't sold on site was quoted up front. Tips are not
    // sales, so they sit outside the split rather than inflating it.
    const quoted = Math.max(0, inNow - onSite - tipTotal);

    const chart = Array.from({ length: 6 }, (_, i) => {
      const k = shiftMonth(thisMonth, -(5 - i));
      return { key: k, label: monthLabel(k), value: revenueIn(k) - spentIn(k) };
    });

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
  }, [bookings, expenses, lineItems, thisMonth]);

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
  const thisMonthExpenses = expenses.filter((e) => monthKey(e.date) === thisMonth);

  return (
    <div className="group">
      <div>
        <h1 className="display">Money</h1>
        <p className="quiet" style={{ marginTop: 2 }}>
          {new Date(`${today}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* One lead figure. Net, not revenue — revenue is a vanity number when
          you buy your own supplies. */}
      <div>
        <span className="label">Net this month</span>
        <div className="figure lead" style={{ marginTop: 4 }}>{money(stats.netNow)}</div>
        <Delta now={stats.netNow} prev={stats.netPrev} />
        <div className="bars" style={{ marginTop: 14 }}>
          {stats.chart.map((c) => (
            <i key={c.key} className={c.key === thisMonth ? "on" : ""}
              style={{ height: `${Math.max(2, (Math.abs(c.value) / peak) * 100)}%` }} />
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
              <div className={`stripe ${b.status}`} role="button" tabIndex={0}
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
          <span className="label">Expenses · this month</span>
          <button className="btn sm inline filled" onClick={() => setAdding(true)}>
            <Plus strokeWidth={2} /> Add
          </button>
        </div>
        {thisMonthExpenses.length === 0
          ? <div className="dashed">Nothing logged this month.</div>
          : (
            <div className="sunken">
              {thisMonthExpenses.slice(0, 12).map((e, i) => (
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
        <BookingDetail booking={selected} onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); reload(); loadExtras(); }} />
      )}
    </div>
  );
}

function Cell({ label, value, tone }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="strong num" style={{ marginTop: 4, color: tone === "good" ? "var(--success)" : undefined }}>
        {value}
      </div>
    </div>
  );
}

// Change vs last month. Colour here IS the message, so it is one of the few
// places signal colour is spent.
function Delta({ now, prev }) {
  if (!prev) return <p className="quiet" style={{ marginTop: 6 }}>No comparison yet</p>;
  const diff = now - prev;
  if (Math.abs(diff) < 0.005) return <p className="quiet" style={{ marginTop: 6 }}>Same as last month</p>;
  const up = diff > 0;
  const pct = Math.round(Math.abs(diff / prev) * 100);
  return (
    <div className="row" style={{ gap: 8, marginTop: 6 }}>
      <span className={`delta ${up ? "up" : "down"}`}>{up ? "▲" : "▼"} {pct}%</span>
      <span className="quiet">vs {money(prev)} last month</span>
    </div>
  );
}
