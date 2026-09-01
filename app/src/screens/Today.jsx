// Today — the morning-open home, and the one screen that carries the
// dashboard's signature move.
//
// REBUILT IN ROADMAP 2.11 STEP 6, against
// docs/dashboard-screen-designs-2026-08-31.md §2 (the shape) and
// docs/dashboard-phone-pass-2026-08-31.md §3 (the phone, which overrides it
// wherever the two disagree). Four things were wrong and they are all here:
//
//   D3   the run labels described the CLOCK — "NEXT UP" printed over a job
//        that finished at 4:15 PM and was marked Completed. The three runs
//        are named for the WORK now, and the fix is a deletion: "Next up"
//        and "Later today" were never two kinds of work, they were one kind
//        split by a clock the ordering already respects, and the split is
//        exactly what made the label lie.
//   D4a  three separate .dayrail elements, one per run, where
//        docs/dashboard-skeletons.md §2 specifies ONE continuous hairline
//        with a node per job. One rail now, all three runs on it.
//   D4b  a job that finished hours ago drew the HOLLOW "still ahead" node.
//   D5   a paid job's node was the tenant's accent where the calendar's
//        .dot.paid draws the fixed green — the same fact, two components,
//        two colours. Law 11b: money is never the tenant's colour.
//
// AND THE FIFTH, WHICH IS NOT A LAYOUT: leaving Today and coming back threw
// the whole day away and replaced it with a spinner, and so did marking a
// job complete. That is fixed in useBookings, because all three screens that
// read bookings had it.
//
// THE RAIL — class `dayrail`, not `thread`, which landing.css owns (roadmap
// 2.3). The day hangs on one continuous hairline with a node per job. It is
// the approved landing page's "scattered becomes ordered" at the far end of
// the same thread, and it is the only rail in the product — which is what
// makes this tab structurally different from the other four (law 1).
//
// ONLY THE LIT JOB IS A CARD. Five identical full-width cards is a named
// tell in this project's own docs/design-knowledge.md §1 and it was 1,522px
// of screen for a five-job day. Everything else is a row, which makes "one
// thing lit" a matter of FORM rather than colour.

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { useWide } from "../hooks/useWide.js";
import { api } from "../lib/api.js";
import { addDays, money, time12, todayLocal } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import BookingLink from "../components/BookingLink.jsx";
import DaySheet from "../components/DaySheet.jsx";
import FinalizeModal from "../components/FinalizeModal.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";
import RecordHost from "../components/RecordHost.jsx";

// A job as a LINE. Two lines at 392 — the same NN/g ceiling History and
// Clients use — with the time and the amount in the figure face (law 8) and
// the node drawn by the rail on the left. Tapping it opens the record, which
// step 4 gave an action bar at the top precisely so Call / Text / Navigate
// are one tap away: the actions are not lost, they are where they belong.
function JobRow({ booking, node, onClick }) {
  const services = (booking.services ?? []).map((s) => s.name_at_booking).filter(Boolean);
  const where = booking.service_type === "mobile" ? "Mobile" : "Drop-off";
  return (
    <button className={`row-item${node ? ` ${node}` : ""}`} onClick={onClick}>
      <span className="txt">
        <span className="nm">
          <span className="t">{time12(booking.start_time)}</span>{booking.customer_name}
        </span>
        <span className="sub">{[...services, where].join(" · ")}</span>
      </span>
      <span className="figure sm">{money(booking.final_amount ?? booking.total_price)}</span>
    </button>
  );
}

export default function Today({ refreshKey = 0 }) {
  const { business, firstName } = useBusiness();
  const today = todayLocal(business.timezone);
  const tomorrow = addDays(today, 1);
  const { bookings, loading, refreshing, reload } = useBookings(today, tomorrow);
  // Two widths, and only where the two show DIFFERENT CONTENT rather than the
  // same content arranged differently — the rest of the desk layout is CSS.
  const desk = useWide(1024);   // the sunken ledger strip comes back
  const wide = useWide(1180);   // the future takes a column of its own
  const [selected, setSelected] = useState(null);
  const [finalizing, setFinalizing] = useState(null);
  const [dayOpen, setDayOpen] = useState(null);
  const [creating, setCreating] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [slots, setSlots] = useState(null);

  // A booking made from the header's + has to reach the day it landed on.
  useEffect(() => { if (refreshKey) reload(); }, [refreshKey]); // eslint-disable-line

  const todays = bookings.filter((b) => b.booking_date === today && b.status !== "cancelled");
  const tomorrows = bookings.filter((b) => b.booking_date === tomorrow && b.status !== "cancelled");

  const expected = todays.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  const collected = todays
    .filter((b) => b.payment_status === "paid")
    .reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  const done = todays.filter((b) => b.status === "completed").length;

  // THE THREE RUNS, each named for the work it holds.
  const needsPay = todays.filter((b) => b.status === "completed" && !b.finalized_at);
  const settled = todays.filter((b) => b.status === "completed" && b.finalized_at);
  // A job whose time has passed and was never marked complete stays here,
  // which is true of it, and needs no fourth run.
  const still = todays.filter((b) => b.status !== "completed");

  // THE ONE LIT THING (§1b). Money not yet recorded outranks the next job:
  // a finished job with no payment against it is what the day is waiting on.
  // A booking waiting to be ACCEPTED will outrank both — roadmap 2.12.
  const nowIso = new Date().toISOString();
  const lit = needsPay[0]
    ?? still.find((b) => b.end_at > nowIso && b.status === "confirmed")
    ?? null;

  // Open slots in the next 7 days — a figure about the near future, which had
  // been stranded on the Booking rules settings sheet. Only asked for at the
  // width that has somewhere to put it.
  useEffect(() => {
    if (!wide) return;
    let live = true;
    api.availableSlots(business.slug, {
      start_date: today, end_date: addDays(today, 6), duration_minutes: 120,
    })
      .then((r) => live && setSlots(Object.values(r.days || {}).reduce((s, d) => s + (d.slots?.length || 0), 0)))
      .catch(() => live && setSlots(null));
    return () => { live = false; };
  }, [wide, business, today]);

  const markComplete = async (b) => {
    setBusyId(b.id);
    try {
      await api.updateBooking(business.id, { booking_id: b.id, status: "completed" });
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const partOfDay = (() => {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: business.timezone, hour12: false, hour: "2-digit" })
        .format(new Date()),
    );
    return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  })();
  const longDate = new Date(`${today}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // A run draws its label and then its jobs — the LIT one as the card, every
  // other as a line. At most one card is on the screen.
  //
  // The run labels are <h2>, not <span>. They ARE the day's section headings —
  // a screen reader that gets three runs as unstructured text has no way to
  // skip between them — and `.label` carries the type either way, so it costs
  // nothing. Same for the second column's two.
  const runRows = (list, node) => list.map((b) => (b.id === lit?.id
    ? (
      <BookingCard key={b.id} booking={b} isNext rail={node}
        onClick={() => setSelected(b)}
        onMarkComplete={busyId === b.id ? undefined : markComplete}
        onFinalize={setFinalizing} />
    )
    : <JobRow key={b.id} booking={b} node={node} onClick={() => setSelected(b)} />
  ));

  // ONLY the first paint of a session may show a spinner (§1a). Every read
  // after it leaves the screen where it is and dims what is changing.
  if (loading) return <div className="center"><div className="spinner" /></div>;

  const empty = todays.length === 0;

  return (
    <div className={`split${refreshing ? " refreshing" : ""}`} aria-busy={refreshing || undefined}>
      {/* THE PRIMARY COLUMN IS ONE ELEMENT, and it has to be: a grid row is
          as tall as its tallest item, so a flat list put the second column in
          the same row as the date and pushed the ledger 264px down the page.
          Measured, not assumed — theme.css § TWO COLUMNS carries the working.
          The arrival's beats follow it one level down. */}
      <div className="group col-1">
      {/* The day is the headline. */}
      <div>
        <h1 className="title">{longDate}</h1>
        <p className="quiet" style={{ marginTop: 2 }}>
          {partOfDay}{firstName ? `, ${firstName}` : ""} · {empty
            ? "nothing booked"
            : `${todays.length - done} of ${todays.length} still to do`}
        </p>
      </div>

      {/* A strip of zeroes states nothing, so an empty day has no ledger. */}
      {!empty && (desk
        ? (
          /* ONE ledger strip split by a hairline, not two boxes side by side.
             Two evenly spaced tiles is the three-card tell one short; a single
             sunken block with a rule down it reads as one object with two
             readings, which is what it is. The desk has the 112px; the phone
             does not, which is the row below. */
          <div className="sunken" style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: "var(--sp-4)" }}>
            <div>
              <span className="label">Jobs today</span>
              <div className="figure" style={{ marginTop: 8 }}>{todays.length}</div>
              <div className="quiet" style={{ marginTop: 4 }}>{done} done · {todays.length - done} to go</div>
            </div>
            <div style={{ background: "var(--line-2)" }} />
            <div>
              <span className="label">Expected</span>
              <div className="figure" style={{ marginTop: 8 }}>{money(expected)}</div>
              <div className="quiet" style={{ marginTop: 4 }}>
                {collected > 0 ? `${money(collected)} collected` : "Nothing collected yet"}
              </div>
            </div>
          </div>
        )
        : (
          /* Three bare figures on the ground. The fourth fact is not lost —
             Collected has no cell of its own, the money cell carries both. */
          <div className="ledger">
            <div>
              <span className="figure">{todays.length}</span>
              <span className="lbl">{todays.length === 1 ? "job" : "jobs"}</span>
            </div>
            <div>
              <span className="figure">{done}</span>
              <span className="lbl">done</span>
            </div>
            <div>
              <span className="figure">{money(collected > 0 ? collected : expected)}</span>
              <span className="lbl">{collected > 0 ? `of ${money(expected)}` : "expected"}</span>
            </div>
          </div>
        ))}

      {/* Bookings waiting to be ACCEPTED go above everything when there are
          any, and are absent when there are none (§1a). They are deliberately
          NOT on the rail: the rail is today's day, and a request can be for
          any date. Roadmap 2.12 fills this; 2.11 builds the slot empty. */}

      {!empty && (
        <div className="dayrail">
          {needsPay.length > 0 && (
            <h2 className="label">Needs payment · {needsPay.length}</h2>
          )}
          {runRows(needsPay, "landed")}
          {still.length > 0 && <h2 className="label">Still to do</h2>}
          {runRows(still, "")}
          {settled.length > 0 && <h2 className="label">Done</h2>}
          {settled.map((b) => (
            <button className="settled-row paid" key={b.id} onClick={() => setSelected(b)}>
              <span className="nm">{b.customer_name}</span>
              <span className="figure sm">{money(b.final_amount ?? b.total_price)}</span>
            </button>
          ))}
        </div>
      )}

      {/* A detailer with no bookings needs the thing that GETS them, not a
          button for typing one in by hand. One sentence and one way forward,
          and it never restates the masthead's own "nothing booked". */}
      {empty && tomorrows.length === 0 && (
        <div className="tight">
          <p className="body">Your booking link is how a day gets filled.</p>
          <BookingLink slug={business.slug} />
        </div>
      )}

      {/* Tomorrow is deliberately NOT on the rail — carrying the thread
          through tomorrow would say the two are one continuous run of work,
          and the point of the rail is that it ends. On a phone it is one row:
          a driveway does not need tomorrow's detail, only that it exists and
          can be looked at. At a desk it is the right column's second block. */}
      {!wide && tomorrows.length > 0 && (
        <button className="row-item" onClick={() => setDayOpen(tomorrow)}>
          <span className="txt">
            <span className="nm">Tomorrow</span>
            <span className="sub">
              {tomorrows.length} job{tomorrows.length === 1 ? "" : "s"}, first at {time12(tomorrows[0].start_time)}
            </span>
          </span>
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      )}

      </div>{/* /.col-1 */}

      {/* THE SECOND COLUMN IS THE FUTURE — everything that is not today. It
          becomes the job record when one is open, and the rail does not move,
          which is the whole point of a record opening beside its list rather
          than over it (F11). Desktop spec §5a. */}
      {wide && !selected && (
        <aside className="col-2">
          {tomorrows.length > 0 && (
            <div className="tight">
              <h2 className="label">Tomorrow</h2>
              {tomorrows.map((b) => (
                <button className="settled-row" key={b.id} onClick={() => setSelected(b)}>
                  <span className="nm">{time12(b.start_time)} · {b.customer_name}</span>
                  <span className="figure sm">{money(b.final_amount ?? b.total_price)}</span>
                </button>
              ))}
            </div>
          )}
          {slots !== null && (
            <div className="tight">
              <h2 className="label">The next 7 days</h2>
              <div className="facts">
                <div><span>Open slots</span><span className="v strong num">{slots}</span></div>
              </div>
            </div>
          )}
        </aside>
      )}

      {selected && (
        <RecordHost onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => { reload(); setSelected(null); }} />
        </RecordHost>
      )}
      {finalizing && (
        <FinalizeModal booking={finalizing} onClose={() => setFinalizing(null)}
          onDone={() => { setFinalizing(null); reload(); }} />
      )}
      {dayOpen && (
        <DaySheet date={dayOpen} bookings={tomorrows}
          onClose={() => setDayOpen(null)}
          onOpenBooking={(b) => { setDayOpen(null); setSelected(b); }}
          onNewBooking={(d) => { setDayOpen(null); setCreating(d); }}
          onChanged={reload} />
      )}
      {creating && (
        <NewBookingModal initialDate={creating} onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); reload(); }} />
      )}
    </div>
  );
}
