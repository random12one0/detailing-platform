// Money: revenue summary, expenses, net — same theme tokens as every other
// screen (the old Money screens were dark while the rest wasn't).

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { addDays, money, todayLocal } from "../lib/format.js";

const RANGES = [
  ["7d", "7 days", 7],
  ["30d", "30 days", 30],
  ["90d", "90 days", 90],
  ["365d", "Year", 365],
];

export default function Money() {
  const { business } = useBusiness();
  const today = todayLocal(business.timezone);
  const [range, setRange] = useState("30d");
  const days = RANGES.find(([k]) => k === range)[2];
  const from = addDays(today, -days);
  const { bookings, loading } = useBookings(from, today);
  const [expenses, setExpenses] = useState([]);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expForm, setExpForm] = useState({ date: today, category: "supplies", description: "", amount: "", payment_method: "card" });

  const loadExpenses = useCallback(async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("business_id", business.id)
      .gte("date", from)
      .lte("date", today)
      .order("date", { ascending: false });
    setExpenses(data ?? []);
  }, [business.id, from, today]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const stats = useMemo(() => {
    const done = bookings.filter((b) => b.status === "completed");
    const revenue = done.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
    const upcoming = bookings.filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + Number(b.total_price), 0);
    const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const unpaid = done.filter((b) => b.payment_status === "pending" || b.payment_status === "partial");
    return { revenue, upcoming, spent, net: revenue - spent, jobs: done.length, unpaid };
  }, [bookings, expenses]);

  const saveExpense = async () => {
    if (!expForm.description.trim() || !Number(expForm.amount)) return;
    await supabase.from("expenses").insert({
      business_id: business.id,
      date: expForm.date,
      category: expForm.category,
      description: expForm.description.trim(),
      amount: Number(expForm.amount),
      payment_method: expForm.payment_method,
    });
    setAddingExpense(false);
    setExpForm({ ...expForm, description: "", amount: "" });
    loadExpenses();
  };

  if (loading) return <div className="center"><div className="spinner" /></div>;

  return (
    <>
      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {RANGES.map(([k, label]) => (
          <button key={k} className={`chip ${range === k ? "active" : ""}`} onClick={() => setRange(k)}>{label}</button>
        ))}
      </div>

      <div className="grid2">
        <div className="card"><div className="muted">Revenue ({stats.jobs} jobs)</div><div className="big">{money(stats.revenue)}</div></div>
        <div className="card"><div className="muted">Booked upcoming</div><div className="big">{money(stats.upcoming)}</div></div>
        <div className="card"><div className="muted">Expenses</div><div className="big">{money(stats.spent)}</div></div>
        <div className="card"><div className="muted">Net</div><div className="big" style={{ color: stats.net >= 0 ? "var(--success)" : "var(--danger)" }}>{money(stats.net)}</div></div>
      </div>

      {stats.unpaid.length > 0 && (
        <div className="warn-box">⚠️ {stats.unpaid.length} completed job{stats.unpaid.length > 1 ? "s" : ""} not fully paid.</div>
      )}

      <div className="row between" style={{ marginTop: 12 }}>
        <h2>Expenses</h2>
        <button className="btn inline" onClick={() => setAddingExpense(true)}>+ Add</button>
      </div>
      {expenses.length === 0 && <p className="muted" style={{ marginTop: 8 }}>No expenses in this range.</p>}
      {expenses.map((e) => (
        <div className="card row between" key={e.id}>
          <div>
            <strong>{e.description}</strong>
            <div className="muted">{e.date} · {e.category}</div>
          </div>
          <strong>{money(e.amount)}</strong>
        </div>
      ))}

      {addingExpense && (
        <div className="modal-backdrop" onClick={() => setAddingExpense(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 12 }}>Add expense</h2>
            <div className="grid2">
              <label className="field"><span>Date</span>
                <input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} /></label>
              <label className="field"><span>Amount</span>
                <input type="number" inputMode="decimal" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} /></label>
            </div>
            <label className="field"><span>Description</span>
              <input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} /></label>
            <div className="grid2">
              <label className="field"><span>Category</span>
                <select value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}>
                  {["supplies", "fuel", "equipment", "marketing", "insurance", "other"].map((c) => <option key={c}>{c}</option>)}
                </select></label>
              <label className="field"><span>Paid with</span>
                <select value={expForm.payment_method} onChange={(e) => setExpForm({ ...expForm, payment_method: e.target.value })}>
                  {["card", "cash", "bank", "other"].map((c) => <option key={c}>{c}</option>)}
                </select></label>
            </div>
            <button className="btn primary" onClick={saveExpense}>Save expense</button>
          </div>
        </div>
      )}
    </>
  );
}
