// Clients — the only screen in the product with NO PANEL ON IT (law 1's
// register), and the only record with no container.
//
// REBUILT IN ROADMAP 2.11 STEP 6, STAGE 5, against
// docs/dashboard-screen-designs-2026-08-31.md §8-9 (the shape) and
// docs/dashboard-phone-pass-2026-08-31.md §9-10 (the phone, which overrides
// it wherever the two disagree). What changed and why:
//
//   THE ROW      It printed `name / phone · email`. Email is the least useful
//                thing about a customer to a detailer holding a phone, and
//                the two figures the screen already calculated — how many
//                times they have been in, and what they have spent — were
//                hidden inside the sheet. The list now SHOWS what it
//                calculates: name · last visit · lifetime spend · phone at a
//                desk, and two cells on a phone (phone pass §9). Email is
//                dropped from the row and stays in the record.
//   LAST VISIT   Part B row 6: it read the first row of a newest-first
//                history without checking the job had happened, so a booking
//                on the calendar could print as a past visit. It is now the
//                most recent COMPLETED job that has already ENDED — nothing
//                finished may ever be printed in the future.
//   SORT/FILTER  His decision 3, manual only: three sorts and one chip. When
//                the chip is on, the header offers the action — "Text these
//                12" — which is the "act on the answer" half of the same
//                decision. Automatic "we miss you" messages on a timer are a
//                different thing and are not this.
//   THE CAP      200 rows, silently, with a search that hits the database
//                each keystroke. A silent truncation reads as a complete
//                list, so the cap states itself and names the way past it.
//   THE ERROR    `const { data } = await q` turned a dropped connection into
//                "no customers yet" — the same defect useBookings carried
//                until stage 3 and loadExtras until stage 4. Third time; it
//                is a pattern to grep for, not a bug that keeps being fixed.
//   THE RECORD   Was a <Sheet> at every width. It goes through RecordHost
//                like every other record, and at a desk it is the right
//                column of a 1.4 / 1 split — with NO CARD AROUND IT, which is
//                the whole reason §9 specifies it separately from the job
//                record. Bare ruled rows on the ground.
//   TWO COPY     Part B row 18: the phone number was printed twice (subtitle
//   DEFECTS      and button), and every history row repeated the client's own
//                name on the one screen where the name is the least useful
//                thing in the row. A history row is date · what · total.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import { dateLong, money, todayLocal } from "../lib/format.js";
// THE ARITHMETIC IS IN ITS OWN FILE so `tests/client-list.test.mjs` can import
// it with no browser — the same reason `accountant-export.js` is separate from
// Money. Three of the four decide something a person acts on: what the screen
// prints as the last time somebody was in, who counts as gone, and who ends up
// on the end of a group text. Part B row 6 was a defect of exactly that kind
// and nothing could have caught it while it lived in here.
import { agoWords, arrange, summarise } from "../lib/client-list.js";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import RecordHost from "../components/RecordHost.jsx";
import { Segmented } from "../components/controls.jsx";

// Manual, and three of them (decision 3). Three choices is a segmented
// control, never a <select> — design system § Composition.
const SORTS = [["recent", "Recent"], ["spent", "Most spent"], ["away", "Longest away"]];
// What the database read takes, and what the screen states rather than hides.
const ROW_CAP = 200;
// A ten-year client's history is the longest list in the record.
const HISTORY_CAP = 50;

const shortDate = (d) => new Date(`${d}T12:00:00`)
  .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export default function Clients() {
  const { business, role } = useBusiness();
  const owner = role === "owner";
  const today = todayLocal(business.timezone);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [lapsed, setLapsed] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [totals, setTotals] = useState(new Map());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(null);      // customer
  const [history, setHistory] = useState(null); // null while the record's list loads
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    let q = supabase
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(ROW_CAP);
    if (search.trim()) q = q.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
    // NOTHING FINISHED MAY BE PRINTED IN THE FUTURE. `end_at <= now` is the
    // second half of "completed": a job can be marked done from the day panel
    // before its slot has run out, and a seeded or mistyped one can sit in
    // next week entirely.
    const totalsQ = supabase
      .from("bookings")
      .select("customer_phone, end_at, final_amount, total_price")
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .eq("status", "completed")
      .lte("end_at", new Date().toISOString());
    const [cs, ts] = await Promise.all([q, totalsQ]);
    // A FAILED READ MUST NOT LOOK LIKE AN EMPTY BUSINESS — the third site of
    // this defect (useBookings, Money's loadExtras, here). The last good list
    // stays drawn and the message goes above it.
    const failed = cs.error || ts.error;
    setError(failed ? (failed.message || "Could not load your customers.") : "");
    if (cs.data) setCustomers(cs.data);
    if (ts.data) setTotals(summarise(ts.data, business.timezone));
    setBusy(false);
  }, [business.id, business.timezone, search]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () => arrange(customers, totals, { sort, lapsed, today }),
    [customers, totals, sort, lapsed, today],
  );

  const openCustomer = async (c) => {
    setOpen(c);
    setNotes(c.notes || "");
    setHistory(null);
    const { data } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("business_id", business.id)
      .eq("customer_phone", c.phone)
      .is("deleted_at", null)
      .order("start_at", { ascending: false })
      .limit(HISTORY_CAP);
    setHistory((data ?? []).map((b) => withLocal(b, business.timezone)));
  };

  const saveNotes = async () => {
    await supabase.from("customers").update({ notes: notes || null })
      .eq("id", open.id).eq("business_id", business.id);
    load();
  };

  // The action the filter earns (row 48). This product does not send texts
  // and is not going to — the inbox question was settled `no` in the
  // architecture doc — so it hands the numbers to the phone's own messages
  // app, which is where a detailer writes to a customer anyway.
  const smsHref = `sms:${rows.map((r) => r.c.phone).filter(Boolean).join(",")}`;

  const capped = !search.trim() && customers.length >= ROW_CAP;

  const list = (
    <>
      {/* A masthead, like every other tab. This screen went straight into a
          search field, which left it the only one of the five with no
          identity and no count — and the count is the thing an owner
          actually wants from this tab at a glance. */}
      <div>
        <h1 className="display">Clients</h1>
        <p className="quiet" style={{ marginTop: 4 }}>
          {search.trim()
            ? `${rows.length} match${rows.length === 1 ? "" : "es"}`
            : lapsed
              ? `${rows.length} of ${customers.length}`
              : customers.length === 0
                ? "Nobody yet"
                : `${customers.length} ${customers.length === 1 ? "person" : "people"}`}
        </p>
      </div>

      <input placeholder="Search name or phone…" value={search}
        aria-label="Search customers"
        onChange={(e) => setSearch(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      {/* A CONTROL THAT CANNOT CHANGE ANYTHING IS NOISE — the sort is absent
          below three rows (step 4 §8). The chip stays: at two customers you
          can see for yourself, at two hundred it is the screen's second job. */}
      {customers.length > 0 && (
        <div className="clientfilters">
          {customers.length >= 3 && (
            <Segmented label="Sort by" value={sort} options={SORTS} onChange={setSort} />
          )}
          {/* These words and LAPSED_DAYS in lib/client-list.js are two
              halves of one fact and must move together. Written out rather
              than computed: "3 months" is what a person says, and 90/30 in a
              button is arithmetic nobody reading the screen asked for. */}
          <button className={`chip${lapsed ? " active" : ""}`} aria-pressed={lapsed}
            onClick={() => setLapsed((v) => !v)}>
            Not seen in 3 months
          </button>
        </div>
      )}

      {/* THE FILTER OFFERS THE ACTION. Finding who has not been back is only
          half of decision 3; the other half is doing something about it.
          THE BUTTON IS THE WHOLE ROW — a "2 not seen in 3 months" label went
          here first and it restated the chip that is switched on directly
          above it. The count that is NEW lives in the masthead, where every
          count on this screen lives, and the button carries the number it is
          about to act on. */}
      {lapsed && rows.length > 0 && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <a className="btn sm inline" href={smsHref}>Text these {rows.length}</a>
        </div>
      )}

      {customers.length === 0 && !busy && !error && (
        <p className="body">No customers yet — they appear on their own when bookings come in.</p>
      )}
      {customers.length > 0 && rows.length === 0 && (
        <p className="body">Everyone has been in within three months.</p>
      )}

      {/* A ruled list, not a stack of cards. Cards are for objects you pick
          BETWEEN; a customer list is an enumeration, and eight bordered
          cards filled a phone screen where rows fit three times as many
          (docs/design-system.md, Composition).
          THE LIST DIMS AND THE SEARCH FIELD STAYS LIVE — §8's loading state,
          and the same rule every other screen follows: after the first paint
          a read never blanks what you are looking at. */}
      <div className={`rows cols clients${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
        {rows.map(({ c, visits, spend, last }) => (
          <button key={c.id} className="row-item" onClick={() => openCustomer(c)}
            aria-label={`${c.name}, last visit ${agoWords(last, today).toLowerCase()}, ${owner ? money(spend) : `${visits} visits`}, ${c.phone}`}>
            <span className="c-who nm">{c.name}</span>
            <span className="c-sub">
              <span className="c-date">{agoWords(last, today)}</span>
              <span className="c-what">{c.phone}</span>
            </span>
            {/* Lifetime spend is owner-only; staff get the count, which is
                what they need and is the same slot (step 4 §8). */}
            <span className="c-total figure sm">{owner ? money(spend) : visits}</span>
          </button>
        ))}
      </div>

      {/* A SILENT TRUNCATION READS AS A COMPLETE LIST, and the search is the
          way past it — which is a fact the list does not carry. */}
      {capped && (
        <p className="quiet">Showing the {ROW_CAP} most recent — search for anyone older.</p>
      )}
    </>
  );

  const facts = open ? (totals.get(open.phone) ?? { visits: 0, spend: 0, last: null }) : null;

  return (
    <div className="split clients">
      <div className="group col-1">{list}</div>

      {/* THE ONLY RECORD IN THE PRODUCT WITH NO CONTAINER (§9). Clients is
          the only screen with no panel on it and a right-hand card would end
          that, so the rows sit directly on the ground at both widths. */}
      {open && !selected && (
        <RecordHost bare onClose={() => setOpen(null)} title={open.name} subtitle={open.phone}>
          <div className="group">
            {/* IT LEADS WITH THE NUMBERS — F8, 2 of 2: both documented
                products lead a client with a figure. Today's bare-figure
                ledger is already this shape, so nothing is invented. */}
            <div className={`ledger ${owner ? "two" : "one"}`}>
              <div>
                <span className="figure">{facts.visits}</span>
                <span className="lbl">{facts.visits === 1 ? "visit" : "visits"}</span>
              </div>
              {owner && (
                <div>
                  <span className="figure">{money(facts.spend)}</span>
                  <span className="lbl">lifetime</span>
                </div>
              )}
            </div>

            <div className="facts">
              <div>
                <span className="quiet">Last visit</span>
                <span className="v">{facts.last ? dateLong(facts.last) : "No completed visits yet"}</span>
              </div>
            </div>

            {/* THE PHONE NUMBER IS NOT PRINTED TWICE. It is the record's
                subtitle; this is the action, and the email is the one thing
                here the row above does not already carry. */}
            <div className="stack" style={{ gap: 8 }}>
              <a className="btn" href={`tel:${open.phone}`}><Phone size={18} strokeWidth={2} /> Call</a>
              {open.email && (
                <a className="btn" href={`mailto:${open.email}`}><Mail size={18} strokeWidth={2} /> {open.email}</a>
              )}
            </div>

            <label className="field"><span>Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
                placeholder="Gate code, dog's name, preferences…" /></label>

            <div className="tight">
              <span className="label">History</span>
              {/* DATE · WHAT · TOTAL. Every row used to repeat the client's
                  own name, on the one screen where it is the least useful
                  thing in the row (Part B row 18). */}
              <div className={`rows${history === null ? " refreshing" : ""}`}
                aria-busy={history === null || undefined}>
                {(history ?? []).map((b) => {
                  const what = (b.services ?? []).map((s) => s.name_at_booking).filter(Boolean).join(" · ")
                    || (b.service_type === "mobile" ? "Mobile" : "Drop-off");
                  return (
                    <button key={b.id} className="row-item" onClick={() => setSelected(b)}>
                      <span className="txt">
                        <span className="nm">{shortDate(b.booking_date)}</span>
                        <span className="sub">{what}</span>
                      </span>
                      <span className="figure sm">{money(b.final_amount ?? b.total_price)}</span>
                    </button>
                  );
                })}
              </div>
              {history !== null && history.length === 0 && (
                <p className="quiet">Nothing booked yet.</p>
              )}
              {history?.length >= HISTORY_CAP && (
                <p className="quiet">{HISTORY_CAP} most recent.</p>
              )}
            </div>
          </div>
        </RecordHost>
      )}

      {/* A job opened from the history REPLACES the client in that column and
          closing it puts the client back — the same answer the calendar's day
          gives, and the reason both go through RecordHost. */}
      {selected && (
        <RecordHost onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => { setSelected(null); load(); if (open) openCustomer(open); }} />
        </RecordHost>
      )}
    </div>
  );
}
