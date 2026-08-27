// Money answers two questions: am I making money, and is this month better
// than last? Four numbers with a month-over-month delta, one bar chart,
// average job value, and the two lists (waiting to be paid, recent
// expenses). No margins, percentages, year-over-year or hourly figures.

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { money, todayLocal } from "../lib/format.js";
import MonthlyRevenueChart from "../components/MonthlyRevenueChart.jsx";
import ExpenseModal from "../components/ExpenseModal.jsx";
import BookingDetail from "../components/BookingDetail.jsx";

const monthKey = (dateStr) => dateStr.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
};
// The month key N months before the given one.
const shiftMonth = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function Money() {
  const { business } = useBusiness();
  const today = todayLocal(business.timezone);
  const thisMonth = monthKey(today);
  // Six months of history, starting at the first of the earliest month.
  const from = `${shiftMonth(thisMonth, -5)}-01`;
  const { bookings, loading, reload } = useBookings(from, today);
  const [expenses, setExpenses] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadExpenses = useCallback(async () => {
    const { data } = await supabase
      .from("expenses").select("*").eq("business_id", business.id)
      .gte("date", from).lte("date", today).order("date", { ascending: false });
    setExpenses(data ?? []);
  }, [business.id, from, today]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const stats = useMemo(() => {
    const lastMonth = shiftMonth(thisMonth, -1);
    const done = bookings.filter((b) => b.status === "completed");
    const revenueIn = (mk) => done.filter((b) => monthKey(b.booking_date) === mk)
      .reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
    const jobsIn = (mk) => done.filter((b) => monthKey(b.booking_date) === mk).length;
    const spentIn = (mk) => expenses.filter((e) => monthKey(e.date) === mk)
      .reduce((s, e) => s + Number(e.amount), 0);

    const inNow = revenueIn(thisMonth), inPrev = revenueIn(lastMonth);
    const outNow = spentIn(thisMonth), outPrev = spentIn(lastMonth);
    const jobsNow = jobsIn(thisMonth), jobsPrev = jobsIn(lastMonth);

    const chart = Array.from({ length: 6 }, (_, i) => {
      const k = shiftMonth(thisMonth, -(5 - i));
      return { label: monthLabel(k), value: revenueIn(k) };
    });

    return {
      inNow, inPrev, outNow, outPrev, jobsNow, jobsPrev,
      leftNow: inNow - outNow, leftPrev: inPrev - outPrev,
      avgJob: jobsNow > 0 ? inNow / jobsNow : 0,
      avgJobPrev: jobsPrev > 0 ? inPrev / jobsPrev : 0,
      chart,
      unpaid: done.filter((b) => b.payment_status === "pending" || b.payment_status === "partial"),
    };
  }, [bookings, expenses, thisMonth]);

  if (loading) return <div className="center"><div className="spinner" /></div>;

  return (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>This month</div>
      <div className="grid2">
        <Stat label="Money in" value={money(stats.inNow)} now={stats.inNow} prev={stats.inPrev} />
        <Stat label="Money out" value={money(stats.outNow)} now={stats.outNow} prev={stats.outPrev} lowerIsBetter />
        <Stat label="What's left" value={money(stats.leftNow)} now={stats.leftNow} prev={stats.leftPrev} />
        <Stat label="Jobs done" value={String(stats.jobsNow)} now={stats.jobsNow} prev={stats.jobsPrev} plain />
      </div>

      <div className="card">
        <MonthlyRevenueChart data={stats.chart} />
      </div>

      {/* One number, given room — it changes how a detailer sells. */}
      <div className="card">
        <div className="muted">Average job value</div>
        <div className="big" style={{ fontSize: "2rem" }}>{money(stats.avgJob)}</div>
        <Delta now={stats.avgJob} prev={stats.avgJobPrev} suffix="vs last month" />
      </div>

      <div className="section-title">Waiting to be paid</div>
      {stats.unpaid.length === 0 && <p className="muted">Nothing outstanding.</p>}
      {stats.unpaid.map((b) => (
        <div className="card tappable row between" key={b.id} onClick={() => setSelected(b)}>
          <div>
            <strong>{b.customer_name}</strong>
            <div className="muted">{b.booking_date}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <strong>{money(b.final_amount ?? b.total_price)}</strong>
            <span className={`badge ${b.payment_status}`}>{b.payment_status}</span>
          </div>
        </div>
      ))}

      <div className="row between" style={{ marginTop: 20 }}>
        <h2>Recent expenses</h2>
        <button className="btn inline primary" onClick={() => setAdding(true)}>+ Add</button>
      </div>
      {expenses.length === 0 && <p className="muted" style={{ marginTop: 8 }}>No expenses recorded.</p>}
      {expenses.slice(0, 15).map((e) => (
        <div className="card row between" key={e.id}>
          <div>
            <strong>{e.description}</strong>
            <div className="muted">{e.date} · {e.category}</div>
          </div>
          <strong>{money(e.amount)}</strong>
        </div>
      ))}

      {adding && (
        <ExpenseModal
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); loadExpenses(); }}
        />
      )}
      {selected && (
        <BookingDetail booking={selected} onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); reload(); loadExpenses(); }} />
      )}
    </>
  );
}

function Stat({ label, value, now, prev, lowerIsBetter = false, plain = false }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="big">{value}</div>
      <Delta now={now} prev={prev} lowerIsBetter={lowerIsBetter} plain={plain} />
    </div>
  );
}

// Change vs last month. Up is green and down is red, except for money out,
// where spending less is the good direction.
function Delta({ now, prev, lowerIsBetter = false, plain = false, suffix = "vs last month" }) {
  if (!prev) return <div className="muted" style={{ fontSize: "0.75rem" }}>No comparison yet</div>;
  const diff = now - prev;
  if (Math.abs(diff) < 0.005) return <div className="muted" style={{ fontSize: "0.75rem" }}>Same as last month</div>;
  const up = diff > 0;
  const good = lowerIsBetter ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  const shown = plain ? Math.abs(diff) : `$${Math.abs(diff).toFixed(0)}`;
  return (
    <div className="row" style={{ gap: 4, fontSize: "0.75rem", color: good ? "var(--success)" : "var(--danger)" }}>
      <Icon size={14} strokeWidth={2} />
      <span>{shown} {suffix}</span>
    </div>
  );
}
