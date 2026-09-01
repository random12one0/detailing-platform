import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Mail, Phone, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import { dateLong, money } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import Sheet from "../components/Sheet.jsx";

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

  const completed = history.filter((b) => b.status === "completed");
  const totalSpent = completed.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  // history is ordered newest-first, so the first completed job is the last visit.
  const lastVisit = completed[0]?.booking_date ?? null;

  return (
    <div className="group">
      {/* A masthead, like every other tab. This screen went straight into a
          search field, which left it the only one of the five with no
          identity and no count — and the count is the thing an owner
          actually wants from this tab at a glance. */}
      <div>
        <h1 className="display">Clients</h1>
        <p className="quiet" style={{ marginTop: 4 }}>
          {search.trim()
            ? `${customers.length} match${customers.length === 1 ? "" : "es"}`
            : customers.length === 0
              ? "Nobody yet"
              : `${customers.length} ${customers.length === 1 ? "person" : "people"}`}
        </p>
      </div>

      <input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {customers.length === 0 && <p className="muted">No customers yet — they appear automatically when bookings come in.</p>}
      {/* A ruled list, not a stack of cards. Cards are for objects you pick
          BETWEEN; a customer list is an enumeration, and eight bordered
          cards filled a phone screen where rows fit three times as many
          (docs/design-system.md, Composition). */}
      <div className="rows">
        {customers.map((c) => (
          <button key={c.id} className="row-item" onClick={() => openCustomer(c)}>
            <span className="txt">
              <span className="nm">{c.name}</span>
              <span className="sub">{c.phone}{c.email ? ` · ${c.email}` : ""}</span>
            </span>
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        ))}
      </div>

      {open && (
        <Sheet onClose={() => setOpen(null)} title={open.name} subtitle={open.phone}>
          {/* Flow containers, not per-element margins — theme.css § SPACE.
              These four blocks are unrelated to each other, so .group (28);
              the facts inside block three are related and are ruled rows with
              no gap at all. Owner walkthrough W7/W8: they used to be boxes
              sitting on each other with nothing between. */}
          <div className="group">
            <div className="stack" style={{ gap: 8 }}>
              <a className="btn" href={`tel:${open.phone}`}><Phone size={18} strokeWidth={2} /> {open.phone}</a>
              {open.email && <a className="btn" href={`mailto:${open.email}`}><Mail size={18} strokeWidth={2} /> {open.email}</a>}
            </div>
            {/* Lifetime spend is owner-only; staff see visit counts. */}
            <div className="facts">
              <div><span className="quiet">Visits</span><span className="num v">{completed.length}</span></div>
              {role === "owner" && (
                <div><span className="quiet">Total spent</span><span className="num v">{money(totalSpent)}</span></div>
              )}
              <div>
                <span className="quiet">Last visit</span>
                <span className="v">{lastVisit ? dateLong(lastVisit) : "No completed visits yet"}</span>
              </div>
            </div>
            <label className="field"><span>Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
                placeholder="Gate code, dog's name, preferences…" /></label>
            <div className="tight">
              <span className="label">History</span>
              <div className="thoughts">
                {history.map((b) => <BookingCard key={b.id} booking={b} showDate onClick={() => setSelected(b)} />)}
              </div>
            </div>
          </div>
        </Sheet>
      )}
      {selected && (
        <Sheet onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => { setSelected(null); if (open) openCustomer(open); }} />
        </Sheet>
      )}
    </div>
  );
}
