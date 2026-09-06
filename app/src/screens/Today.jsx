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
import { ChevronRight, TriangleAlert } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
// ROADMAP 2.19. The nudge counts with the SAME arithmetic the Clients screen
// filters with — `tests/client-list.test.mjs` is 31 checks on it — rather than
// a second rule in SQL that would drift from the chip it sends you to.
import { arrange, summarise } from "../lib/client-list.js";
import { useBookings, usePendingRequests } from "../hooks/useBookings.js";
import { useWide } from "../hooks/useWide.js";
import { api } from "../lib/api.js";
import { addDays, money, time12, todayLocal } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import BookingLink from "../components/BookingLink.jsx";
import DaySheet from "../components/DaySheet.jsx";
import FinalizeModal from "../components/FinalizeModal.jsx";
import JobRow from "../components/JobRow.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";
import QuoteModal from "../components/QuoteModal.jsx";
import RecordHost from "../components/RecordHost.jsx";
import RequestCard from "../components/RequestCard.jsx";

export default function Today({ refreshKey = 0, onGo }) {
  const { business, firstName, can, subscription, siteOrigin } = useBusiness();
  const today = todayLocal(business.timezone);
  const tomorrow = addDays(today, 1);
  const { bookings, loading, refreshing, error, reload } = useBookings(today, tomorrow);
  // ROADMAP 2.12 — its own read, because a request can be for any date and
  // the hook above only knows about today and tomorrow. See useBookings.js.
  const { requests, error: reqError, reload: reloadRequests } = usePendingRequests(refreshKey);
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
  const [quoting, setQuoting] = useState(null);
  // ANSWERING A REQUEST MAKES A CARD LEAVE, AND IT HAS TO LEAVE RATHER THAN
  // VANISH — CLAUDE.md's standing rule since 2026-09-01. The card carries the
  // exit and the reload waits for it: --t-exit (180ms), not --t-reveal, because
  // this is a thing the detailer does several times in a row.
  const [leavingId, setLeavingId] = useState(null);
  // ROADMAP 2.19 — HOW MANY PEOPLE HAVE NOT BEEN BACK. The owner's own words
  // for what this feature is: *"maybe, like, remind deals. Like, hey, do you
  // want to send out email to some of your old people?"* — and the line he
  // drew with them is that the reminder is A ROW ON A SCREEN. It is never an
  // email to the detailer, because the product does not send anything nobody
  // asked it to, and that includes to him.
  const [lapsedCount, setLapsedCount] = useState(0);

  // A booking made from the header's + has to reach the day it landed on.
  // refreshKey ALONE on purpose: reload's identity changes whenever the hook's
  // dates do, and re-running this on that would double every read.
  useEffect(() => { if (refreshKey) reload(); }, [refreshKey]);

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

  // THE ONE LIT THING (§1b, and docs/dashboard-skeletons.md §6). Roadmap 2.12
  // added the top of that list: a booking waiting to be ACCEPTED outranks both
  // of the others, because unrecorded money is money you already hold and a
  // request has a customer at the other end who does not know if they are
  // booked. AT MOST ONE object is lit, so when a request is on the screen the
  // rail has no card at all — `lit` is null and every job draws as a row.
  const nowIso = new Date().toISOString();
  const lit = requests.length > 0
    ? null
    : needsPay[0]
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

  // THE RE-BOOK PROMPT'S COUNT, and the two things that stop it being asked.
  //
  // A PROMPT THAT NEVER GOES QUIET BECOMES WALLPAPER, so it steps back for a
  // month after a send — `businesses.last_campaign_at`, stamped by
  // `send-campaign`. The detailer answered the question; asking it again
  // tomorrow is how a useful row turns into one nobody reads.
  //
  // AND IT NEEDS `marketing` — the permission that has meant "promo codes and
  // campaign links" since roadmap 2.13. A member who cannot send the email
  // must not be handed the prompt to send it, and the read is not made either.
  const mayEmail = can("marketing");
  const askedRecently = business.last_campaign_at
    && Date.now() - new Date(business.last_campaign_at).getTime() < 30 * 86_400_000;
  useEffect(() => {
    if (!mayEmail || askedRecently) { setLapsedCount(0); return; }
    let live = true;
    // The same two reads the Clients screen makes, minus the columns only that
    // screen prints. `end_at <= now` is the second half of "completed": a job
    // marked done early, or seeded into next week, is not a past visit.
    Promise.all([
      supabase.from("customers").select("phone").eq("business_id", business.id),
      supabase.from("bookings")
        .select("customer_phone, end_at")
        .eq("business_id", business.id)
        .is("deleted_at", null)
        .eq("status", "completed")
        .lte("end_at", new Date().toISOString()),
    ]).then(([cs, ts]) => {
      // A FAILED READ IS ZERO, NOT A GUESS. This row is an invitation, so the
      // safe failure is silence — the four other places in this repo where a
      // dropped connection printed as "nothing here" were all screens where
      // the emptiness was a LIE the detailer would act on.
      if (!live || cs.error || ts.error) return;
      setLapsedCount(
        arrange(cs.data, summarise(ts.data, business.timezone), { lapsed: true, today }).length,
      );
    });
    return () => { live = false; };
  }, [business.id, business.timezone, mayEmail, askedRecently, today]);

  // Accept and decline are the same shape: answer, let the card go, refresh
  // both lists — an accepted request becomes a job, and if it is today's it
  // has to appear on the rail in the same beat it leaves the queue.
  const respond = (action) => async (b) => {
    setBusyId(b.id);
    try {
      await api.respondToBooking(business.id, b.id, action);
      setLeavingId(b.id);
      await new Promise((r) => setTimeout(r, 180));
      setLeavingId(null);
      await Promise.all([reloadRequests(), reload()]);
    } finally {
      setBusyId(null);
    }
  };
  const acceptRequest = respond("accept");
  const declineRequest = respond("decline");

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
      {/* Above the day, and the last good day stays drawn. */}
      {error && <div className="error-box">{error}</div>}
      {/* The day is the headline. */}
      {/* data-tour — the walkthrough's first target, and it is the MASTHEAD
          rather than the rail on purpose: the rail is absent on the empty
          dashboard the tour was designed for, and a first step that skips
          itself leaves the tour starting on the header + . */}
      <div data-tour="day">
        <h1 className="title">{longDate}</h1>
        <p className="quiet" style={{ marginTop: 2 }}>
          {partOfDay}{firstName ? `, ${firstName}` : ""} · {empty
            ? "nothing booked"
            : `${todays.length - done} of ${todays.length} still to do`}
        </p>
      </div>

      {/* ROADMAP 2.12 FILLS THE SLOT 2.11 BUILT EMPTY. Above everything when
          there is anything, absent when there is not (§1a) — and second in the
          phone's order, under the masthead and over the ledger, which is where
          docs/dashboard-screen-designs-2026-08-31.md §2 puts it. At a desk it
          moves to the top of the second column instead; it is never in both. */}
      {/* THE CEILING, STATED: one card per waiting request. Two is the demo
          and a handful is realistic; a detailer sitting on twelve unanswered
          requests would get twelve cards, and the answer then is a ruled list
          with the first one open — not a smaller card.
          ponytail: N cards, list-with-one-open if a real queue ever gets long. */}
      {/* THE CARD STOPPED WORKING — roadmap 2.20 stage 2, and it is FIRST on
          the screen rather than last for the reason the re-book prompt is last:
          that one is marketing and this one is the business being switched off.
          It is the one thing on Today that is not about today.

          IT IS DRAWN HERE AND NOT ONLY BEHIND THE GEAR because a suspended
          booking page is invisible from every screen a detailer uses — the
          dashboard keeps working perfectly while nobody can book. The research
          asked for "visible and annoying but not destructive"; a box at the top
          of the first screen they open is exactly that, and it costs the screen
          nothing on the days it says nothing.

          NULL FOR STAFF AND FOR EVERY BUSINESS WITHOUT A SUBSCRIPTION, which is
          all of them today, so this renders nothing at all until there is
          something to say. */}
      {(subscription?.status === "past_due" || subscription?.status === "suspended") && (
        <div className={subscription.status === "suspended" ? "error-box" : "warn-box"}
          data-billing-alert={subscription.status}>
          <TriangleAlert strokeWidth={2} />
          <span>
            {subscription.status === "suspended"
              ? "Your booking page is offline because a payment did not go through. Nothing has been deleted."
              : "Your last payment did not go through. We will keep trying for two weeks."}
          </span>
          <span className="actions">
            <button onClick={() => onGo?.("billing")}>Fix this</button>
          </span>
        </div>
      )}

      {reqError && <div className="error-box">{reqError}</div>}
      {!wide && requests.length > 0 && (
        <div className="tight">
          <h2 className="label">
            {requests.length === 1 ? "Waiting on you" : `Waiting on you · ${requests.length}`}
          </h2>
          {requests.map((b, i) => (
            <RequestCard key={b.id} booking={b} lit={i === 0}
              busy={busyId === b.id} leaving={leavingId === b.id}
              onAccept={acceptRequest} onDecline={declineRequest}
              onQuote={setQuoting} onClick={() => setSelected(b)} />
          ))}
        </div>
      )}

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

      {!empty && (
        <div className="dayrail" data-tour="job">
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
      {empty && tomorrows.length === 0 && requests.length === 0 && (
        <div className="tight">
          <p className="body">Your booking link is how a day gets filled.</p>
          <BookingLink slug={business.slug} origin={siteOrigin} />
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

      {/* THE RE-BOOK PROMPT — roadmap 2.19, and it is LAST on purpose. Today
          is the day's work; people who have not been back are not today's
          work, and a prompt above the rail would be the product interrupting a
          detailer's morning with marketing. It reads as the last line of the
          screen, which is what it is.
          THREE, NOT ONE. The same floor the Clients screen's own sort control
          uses: below it a detailer can see the answer without being told, and
          a prompt about one person is noise wearing a number. */}
      {lapsedCount >= 3 && (
        <button className="row-item" onClick={() => onGo?.("clients", "lapsed")}>
          <span className="txt">
            <span className="nm">{lapsedCount} haven't been in for 3 months</span>
            <span className="sub">Write to them</span>
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
          {/* FIRST IN THE COLUMN — the desktop spec §5a reserved this spot
              before there was anything to put in it, "because a request is the
              only object on that screen waiting on the detailer rather than on
              a car". */}
          {requests.length > 0 && (
            <div className="tight">
              <h2 className="label">
                {requests.length === 1 ? "Waiting on you" : `Waiting on you · ${requests.length}`}
              </h2>
              {requests.map((b, i) => (
                <RequestCard key={b.id} booking={b} lit={i === 0}
                  busy={busyId === b.id} leaving={leavingId === b.id}
                  onAccept={acceptRequest} onDecline={declineRequest}
                  onQuote={setQuoting} onClick={() => setSelected(b)} />
              ))}
            </div>
          )}
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
      {quoting && (
        <QuoteModal booking={quoting} onClose={() => setQuoting(null)}
          onSent={() => { setQuoting(null); reloadRequests(); }} />
      )}
    </div>
  );
}
