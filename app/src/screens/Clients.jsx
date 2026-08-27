import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Mail, Phone, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import { money } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail from "../components/BookingDetail.jsx";

export default function Clients() {
  const { business, role } = useBusiness();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(null); // customer
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    let q = supabase
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (search.trim()) q = q.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
    const { data } = await q;
    setCustomers(data ?? []);
  }, [business.id, search]);

  useEffect(() => { load(); }, [load]);

  const openCustomer = async (c) => {
    setOpen(c);
    setNotes(c.notes || "");
    const { data } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("business_id", business.id)
      .eq("customer_phone", c.phone)
      .is("deleted_at", null)
      .order("start_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []).map((b) => withLocal(b, business.timezone)));
  };

  const saveNotes = async () => {
    await supabase.from("customers").update({ notes: notes || null }).eq("id", open.id).eq("business_id", business.id);
    load();
  };

  const totalSpent = history
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);

  return (
    <>
      <input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }} />
      {customers.length === 0 && <p className="muted">No customers yet — they appear automatically when bookings come in.</p>}
      {customers.map((c) => (
        <div key={c.id} className="card tappable row between" onClick={() => openCustomer(c)}>
          <div>
            <strong>{c.name}</strong>
            <div className="muted">{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
          </div>
          <ChevronRight size={18} strokeWidth={1.75} color="var(--text-muted)" />
        </div>
      ))}

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <h2>{open.name}</h2>
              <button className="btn ghost inline" onClick={() => setOpen(null)} aria-label="Close"><X size={20} strokeWidth={1.75} /></button>
            </div>
            <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
              <a className="btn" href={`tel:${open.phone}`}><Phone size={18} strokeWidth={1.75} /> {open.phone}</a>
              {open.email && <a className="btn" href={`mailto:${open.email}`}><Mail size={18} strokeWidth={1.75} /> {open.email}</a>}
            </div>
            {/* Lifetime spend is owner-only; staff see visit counts. */}
            <div className={role === "owner" ? "grid2" : ""}>
              <div className="card"><div className="muted">Visits</div><div className="big">{history.filter((b) => b.status === "completed").length}</div></div>
              {role === "owner" && (
                <div className="card"><div className="muted">Total spent</div><div className="big">{money(totalSpent)}</div></div>
              )}
            </div>
            <label className="field"><span>Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
                placeholder="Gate code, dog's name, preferences…" /></label>
            <div className="section-title">History</div>
            {history.map((b) => <BookingCard key={b.id} booking={b} showDate onClick={() => setSelected(b)} />)}
          </div>
        </div>
      )}
      {selected && (
        <BookingDetail booking={selected} onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); if (open) openCustomer(open); }} />
      )}
    </>
  );
}
