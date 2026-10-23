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

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronRight, ListChecks, MailWarning, Printer, TriangleAlert, WifiOff } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { readAll } from "../lib/readAll.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { STEPS, setupProgress } from "../lib/setup.js";
// ROADMAP 2.19. The nudge counts with the SAME arithmetic the Clients screen
// filters with — `tests/client-list.test.mjs` is 31 checks on it — rather than
// a second rule in SQL that would drift from the chip it sends you to.
import { arrange, summarise } from "../lib/client-list.js";
import { fetchBooking, useBookings, usePendingRequests } from "../hooks/useBookings.js";
import { useWide } from "../hooks/useWide.js";
import { api } from "../lib/api.js";
import { addDays, money, time12, todayLocal } from "../lib/format.js";
import { asOfLabel } from "../lib/offlineJobs.js";
import { keptOf } from "../lib/payPill.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import BookingLink from "../components/BookingLink.jsx";
import { useJobWeather } from "../hooks/useJobWeather.js";
import FinalizeModal from "../components/FinalizeModal.jsx";
import SchedulePrint from "../components/SchedulePrint.jsx";
import JobRow from "../components/JobRow.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";
import QuoteModal from "../components/QuoteModal.jsx";
import RecordHost from "../components/RecordHost.jsx";
import RequestCard from "../components/RequestCard.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), which is
// not the booking page's. `useAppLocale()` is called per screen rather than
// once at the root: at the root it works only while nothing is memoised.
import { appIntlLocale, t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";
import { useOwnAlertBounces } from "../hooks/useOwnAlertBounces.js";

export default function Today({ refreshKey = 0, onGo, onSetup }) {
  useAppLocale();
  const { business, firstName, can, subscription, siteOrigin, settings, branding, role, reload: reloadBusiness } = useBusiness();
  const today = todayLocal(business.timezone);
  const tomorrow = addDays(today, 1);
  // ROADMAP 3.4f S3 — their own alerts are not arriving. Only for somebody
  // who can fix it: Notifications is behind the same permission.
  const ownBounces = useOwnAlertBounces();

  // ---------------------------------------------------------------------------
  // "YOUR PAGE ISN'T FULLY SET UP" — Andrew's ask, 2026-09-14: Today is the
  // screen a detailer actually opens, so an incomplete setup belongs here
  // rather than only on Business, which nobody visits on their own.
  //
  // **NO SECOND SOURCE OF TRUTH.** `setupProgress` and `STEPS` are the exact
  // ones Business.jsx reads, and `setupProgress` now derives almost every
  // step from the real record rather than from `setup.done` — Andrew's
  // correction the same day, after this notice told a business with real
  // hours, real payment methods and a complete vehicle checklist to go set
  // all three. What is fetched here is only the counts that function needs
  // and Business.jsx does not already share via context: hours rows,
  // services, promo codes, reviews and plans.
  const [setupCounts, setSetupCounts] = useState(null);
  useEffect(() => {
    if (role !== "owner") return;
    let live = true;
    (async () => {
      const [h, s, p, rv, pl] = await Promise.all([
        supabase.from("business_hours").select("weekday,open_time").eq("business_id", business.id),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
        supabase.from("promo_codes").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
        supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
        supabase.from("plans").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      ]);
      if (live) {
        setSetupCounts({
          hoursRows: h.data ?? [], services: s.count, promos: p.count,
          reviews: rv.count, plans: pl.count,
        });
      }
    })();
    return () => { live = false; };
  }, [business.id, role]);
  const setup = setupCounts ? setupProgress({ business, branding, settings, counts: setupCounts }) : null;
  const hoursOpen = (setupCounts?.hoursRows ?? []).some((r) => r.open_time);
  const missingSteps = setup ? STEPS.filter(([k]) => !setup.done.has(k)) : [];

  // RANKED BY CONSEQUENCE, NOT BY THE ORDER SETUP ASKS THEM IN. Only three
  // things in this list actually stop a customer booking or paying — no open
  // hours, nothing to sell, no way to reach the business — and those are the
  // exact three Business.jsx's own `blocked` row already treats as more
  // serious than the rest. Everything else is real but cosmetic: a page that
  // works fine without it, just plainer.
  const stopsBooking = [];
  if (!hoursOpen) {
    stopsBooking.push({ key: "hours", text: t("Customers can't book you until you set your hours.") });
  }
  if ((setupCounts?.services ?? 0) === 0) {
    stopsBooking.push({ key: "catalog", text: t("Customers can't book you until you add at least one service.") });
  }
  if (!business.contact_phone && !business.contact_email) {
    stopsBooking.push({ key: "info", text: t("Customers have no way to reach you — add a phone number or email.") });
  }
  const leadKeys = new Set(stopsBooking.map((s) => s.key));
  const cosmeticAll = missingSteps.filter(([k]) => !leadKeys.has(k));

  // ROADMAP 9.3 — **THERE IS ALWAYS A FIRST LINE, AND "AND" NEVER FOLLOWS
  // NOTHING.** Measured on the demo, 2026-09-20: with nothing blocking a
  // booking the notice rendered its heading, an EMPTY `<ul>`, and then a fold
  // reading *"and 3 more"* — 0 visible items, 3 hidden. A detailer's first
  // thirty seconds with the product told them something was unfinished, showed
  // them nothing, and then said "and".
  //
  // The three that stop a booking still lead when they exist. When none does,
  // the FIRST remaining step takes the line instead, so the notice always
  // names one thing to press. The fold then counts what is genuinely left
  // after it, so "and 3 more" becomes "and 2 more" — the word is honest
  // because something now precedes it.
  const [firstCosmetic, ...restCosmetic] = cosmeticAll;
  const leadFallback = stopsBooking.length === 0 && firstCosmetic
    ? [{ key: firstCosmetic[0], text: firstCosmetic[2] }]
    : [];
  const lead = stopsBooking.length ? stopsBooking : leadFallback;
  const cosmetic = stopsBooking.length ? cosmeticAll : restCosmetic;

  // COLLAPSE TO ONE LINE, REMEMBERED — AND UN-COLLAPSED ONCE SOMETHING NEW
  // GOES MISSING. `setup.todayCollapsedFor` is the set of keys that were
  // still missing the moment they last collapsed it; if today's missing set
  // has anything that was not in that snapshot, the notice reopens on its
  // own, exactly once, until they collapse it again.
  const missingKeys = missingSteps.map(([k]) => k);
  const collapsedFor = settings?.setup?.todayCollapsedFor ?? [];
  const somethingNew = missingKeys.some((k) => !collapsedFor.includes(k));
  // **A REAL BLOCKER CANNOT BE COLLAPSED AWAY — Andrew's correction,
  // 2026-09-14.** "Your page isn't fully set up" behind a Hide is fine for
  // nine cosmetic leftovers; it is not fine for "customers can't book you",
  // which has to be the thing a detailer sees without pressing anything.
  // So the fold itself is unavailable while `stopsBooking` is non-empty,
  // whatever was last saved — collapsing only ever hides the cosmetic list.
  const collapsed = stopsBooking.length === 0 && !!settings?.setup?.todayCollapsed && !somethingNew;
  const canCollapse = stopsBooking.length === 0;
  const toggleCollapsed = useCallback(async (next) => {
    const now = settings?.setup ?? {};
    await supabase.from("business_settings").upsert(
      { business_id: business.id, setup: { ...now, todayCollapsed: next, todayCollapsedFor: next ? missingKeys : now.todayCollapsedFor } },
      { onConflict: "business_id" },
    );
    reloadBusiness?.();
  }, [business.id, settings?.setup, missingKeys.join(","), reloadBusiness]);
  const setupNotice = role === "owner" && setup && missingSteps.length > 0;
  // ---------------------------------------------------------------------------
  // **TODAY IS NOT ONLY TODAY — Andrew, 2026-09-13, and it is the bigger miss.**
  // ---------------------------------------------------------------------------
  // *"If there's nothing I'm doing today and it's just empty, there's no point.
  // I'd rather actually see, okay, here's the appointment, here's the
  // appointment coming up in future days."* And the half that stops this being
  // an empty state: *"even if I do have some appointments on the day, I still
  // want to see future ones… I still want to see my upcoming appointments."*
  //
  // **SO THE WINDOW WIDENS RATHER THAN A SECOND HOOK APPEARING.** `useBookings`
  // already takes a range and already pads it; a second call would be a second
  // read, a second loading flag and a second thing to keep in step. Everything
  // below still filters by `booking_date`, which is what it did when the window
  // was two days wide.
  //
  // FOURTEEN DAYS, and the number is chosen against the forecast rather than
  // taste: the NWS reaches about seven, so a fortnight shows a week of jobs
  // carrying weather and a week carrying none — which is the honest picture of
  // what is known. Past that a list is a calendar, and the Calendar is a tab.
  const horizon = addDays(today, 14);
  const { bookings, loading, refreshing, error, offline, updatedAt, reload } = useBookings(today, horizon, { remember: true });
  // WEATHER PER BOOKING — Andrew, 2026-09-13. ONE call for the whole day's
  // work, handed to each row as a prop; `useJobWeather` is what must never be
  // reached for from inside a row.
  const { weather, prefs: weatherRules } = useJobWeather(bookings);
  // ROADMAP 2.12 — its own read, because a request can be for any date and
  // the hook above only knows about today and tomorrow. See useBookings.js.
  const { requests, error: reqError, reload: reloadRequests } = usePendingRequests(refreshKey);
  // Two widths, and only where the two show DIFFERENT CONTENT rather than the
  // same content arranged differently — the rest of the desk layout is CSS.
  const desk = useWide(1024);   // the sunken ledger strip comes back
  const wide = useWide(1180);   // the future takes a column of its own
  const [selected, setSelected] = useState(null);
  const [finalizing, setFinalizing] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [creating, setCreating] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [slots, setSlots] = useState(null);
  const [quoting, setQuoting] = useState(null);
  // ROADMAP 7.3's FINAL PASS, finding 4: **Today offered the booking link
  // before there was anything to book.** Copy, Open and a QR code, with
  // nothing saying the page behind them has no services on it — so the first
  // thing the product invites a new detailer to do is share a link that
  // cannot take a booking. (The booking page itself is honest about it; by
  // then the card is already in somebody's hand.)
  //
  // ONE COUNT, NOT `setupProgress`. Business prints *N of 7* and needs six
  // reads to do it; the question HERE is narrower and is the only one that
  // decides whether the link works at all — **is there a service on the
  // page.** A third copy of the seven-step arithmetic on the screen a
  // detailer opens every morning would be six queries for a sentence.
  const [sellable, setSellable] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.from("services").select("id", { count: "exact", head: true })
      .eq("business_id", business.id).eq("is_active", true)
      .then(({ count }) => { if (live) setSellable(count ?? 0); });
    return () => { live = false; };
  }, [business.id, refreshKey]);
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
  // EVERYTHING AFTER TODAY, in the order the hook already returned them, and
  // grouped by day so the separation he asked for is a heading rather than a
  // rule: *"obviously they'll be separated or whatever."*
  const upcoming = bookings.filter((b) => b.booking_date > today && b.status !== "cancelled");
  const upcomingDays = [...new Map(
    upcoming.map((b) => [b.booking_date, null]),
  ).keys()].map((d) => [d, upcoming.filter((b) => b.booking_date === d)]);

  const expected = todays.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  const paidToday = todays.filter((b) => b.payment_status === "paid");
  const collected = paidToday
    // A refund made in Stripe leaves the job "paid"; only what was kept is collected (97.81).
    .reduce((s, b) => s + keptOf(b, Number(b.final_amount ?? b.total_price)), 0);
  // What was paid and went back. Named instead of "yet" when collected is 0 (97.85), and
  // beside collected on both widths whenever it is above 0 (97.87).
  const refunded = paidToday.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0) - collected;
  const done = todays.filter((b) => b.status === "completed").length;

  // THE THREE RUNS, each named for the work it holds.
  const needsPay = todays.filter((b) => b.status === "completed" && !b.finalized_at);
  const settled = todays.filter((b) => b.status === "completed" && b.finalized_at);
  // A job whose time has passed and was never marked complete stays here,
  // which is true of it, and needs no fourth run.
  const still = todays.filter((b) => b.status !== "completed");

  // THE ONE LIT THING (§1b, and docs/dashboard-skeletons.md §6).
  //
  // **A WAITING REQUEST NO LONGER BLANKS IT — Andrew's brief, 2026-09-13:
  // *"the one thing that needs them now should be unmistakable."*** Roadmap
  // 2.12 made `lit` null whenever a request existed, on the reasoning that at
  // most one object on the screen may be lit. The consequence was measured at
  // 392 on a five-job day with two requests waiting: every job on the rail drew
  // as an identical line, so the job happening at 8:00 AM looked exactly like
  // the one at 5:00 PM, and the screen a detailer opens in a driveway had no
  // answer to *what am I on*. A request is not today; the day always keeps its
  // one lit job.
  //
  // THE TWO LIT OBJECTS ARE DIFFERENT KINDS AND THE SCREEN KEEPS THEM APART,
  // which is what makes two accent fills legal here. RequestCard's own note
  // records the rule it is reading — *at most one accent fill* — and the case
  // it was written for was two Accepts SIDE BY SIDE in one list. These two are
  // never side by side: on a phone the queue is a screen below the rail, and at
  // a desk it is the other column. Each region has exactly one filled action.
  const nowIso = new Date().toISOString();
  const lit = needsPay[0]
    ?? still.find((b) => b.end_at > nowIso && b.status === "confirmed")
    ?? null;
  // **THE WORDS, AND THEY CANNOT LIE, WHICH IS WHY THIS IS READ OFF THE
  // BOOKING'S OWN CLOCK RATHER THAN OFF ITS POSITION IN A LIST.** D3 (see the
  // header) deleted a "NEXT UP" label that printed over a job finished at
  // 4:15 PM, because it described a POSITION. These two describe the job:
  // started and not ended is `now`, not started yet is `next`. A job in the
  // Needs-payment run takes neither — its run label already says what it is.
  const litLive = lit && lit.status === "confirmed"
    ? (lit.start_at <= nowIso ? "now" : "next")
    : null;

  // Open slots in the next 7 days — a figure about the near future, which had
  // been stranded on the Booking rules settings sheet. Only asked for at the
  // width that has somewhere to put it.
  useEffect(() => {
    if (!wide) return;
    let live = true;
    api.availableSlots(business.slug, {
      start_date: today, end_date: addDays(today, 6), duration_minutes: 120,
    })
      // **"OPEN SLOTS · 14" IS A NUMBER WITH NO SECOND NUMBER — 2026-09-12.**
      // Fourteen is good or bad depending on how many of the seven days are
      // open at all, and the answer was already in this response and thrown
      // away. No extra request: the same payload, counted twice.
      .then((r) => {
        if (!live) return;
        const days = Object.values(r.days || {});
        setSlots({
          open: days.reduce((s, d) => s + (d.slots?.length || 0), 0),
          withRoom: days.filter((d) => (d.slots?.length || 0) > 0).length,
          days: days.length,
        });
      })
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
    // Paged (97.29): both pass 1,000 rows on a busy business.
    const nowIso = new Date().toISOString();
    Promise.all([
      readAll(() => supabase.from("customers").select("phone").eq("business_id", business.id)
        .order("id", { ascending: true })),
      readAll(() => supabase.from("bookings")
        .select("customer_phone, end_at")
        .eq("business_id", business.id)
        .is("deleted_at", null)
        .eq("status", "completed")
        .lte("end_at", nowIso)
        .order("id", { ascending: true })),
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
    // **`"en-US"` HERE IS DELIBERATE AND MUST NOT BECOME `appIntlLocale()`.**
    // This formatter is not printing anything — it extracts the HOUR as a
    // number so the greeting can branch on it. Pointing it at the display
    // locale makes a value nobody reads depend on a setting somebody can
    // change, which is a bug that would only ever show up in one language.
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: business.timezone, hour12: false, hour: "2-digit" })
        .format(new Date()),
    );
    // English is the key; `t()` is applied where it is DRAWN, not here.
    return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  })();
  // This one IS read, so it follows the dashboard's language.
  const longDate = new Date(`${today}T12:00:00`).toLocaleDateString(appIntlLocale(), {
    weekday: "long", month: "long", day: "numeric",
  });
  // THE QUEUE'S ROWS TAKE THE SHORT ONE. `.row-item .sub` is nowrap with an
  // ellipsis, and `dateLong` ("Sunday, September 27") plus a time plus a
  // service name is 42 characters before the service starts — measured at 392,
  // "Ceramic Coating" truncated to "Ceramic C…". The card above keeps the long
  // form, where there is a line to itself for it.
  const shortDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(appIntlLocale(), {
    weekday: "short", month: "short", day: "numeric",
  });

  // A run draws its label and then its jobs — the LIT one as the card, every
  // other as a line. At most one card is on the screen.
  //
  // The run labels are <h2>, not <span>. They ARE the day's section headings —
  // a screen reader that gets three runs as unstructured text has no way to
  // skip between them — and `.label` carries the type either way, so it costs
  // nothing. Same for the second column's two.
  // ROADMAP 9.5 — A CONFIRMED JOB WHOSE END TIME HAS PASSED IS LATE, and
  // nothing said so: it just sat under "Still to do" next to jobs that
  // hadn't started yet, with no way to tell the two apart at a glance. Same
  // condition `lit`/`litLive` above already use for "is this job still
  // live", one line down: `status === "confirmed"` excludes a resolved
  // outcome (no_show, a pending request) from being flagged as merely late.
  // `needsPay` is always `completed`, so this is always false there — no
  // second branch needed.
  const runRows = (list, node) => list.map((b) => (b.id === lit?.id
    ? (
      <BookingCard key={b.id} booking={b} isNext rail={node} live={litLive}
        weather={weather.get(b.id)} weatherRules={weatherRules}
        onClick={() => setSelected(b)}
        onMarkComplete={busyId === b.id ? undefined : markComplete}
        onFinalize={setFinalizing} />
    )
    : <JobRow key={b.id} booking={b} node={node} weather={weather.get(b.id)} weatherRules={weatherRules}
        late={b.status === "confirmed" && b.end_at < nowIso}
        onClick={() => setSelected(b)} />
  ));

  // THE REQUEST QUEUE — ONE CARD AND THEN A RULED LIST, at every width.
  //
  // **This is the ceiling roadmap 2.12 wrote down for itself and it turned out
  // to be TWO rather than twelve.** Its own note said *"a detailer sitting on
  // twelve unanswered requests would get twelve cards, and the answer then is a
  // ruled list with the first one open — not a smaller card."* Measured at 392
  // on the demo's own seed: two cards are 620px, so a screen named Today opened
  // on 620px of OTHER WEEKS — September 25 and September 27 — with today's
  // money and today's first job both below the fold.
  //
  // A ruled list is also what `docs/design-system.md` § Composition says a
  // collection of records is; a card is *"for an object you pick between or act
  // on one at a time"*, which is exactly the first one and exactly not the rest.
  // The row opens the record, where Accept and Decline live in its own bar.
  // ---------------------------------------------------------------------------
  // **COMING UP — one element, rendered in one of two places.**
  // ---------------------------------------------------------------------------
  // The same discipline `requestQueue` keeps six lines below: `!wide` puts it
  // under the day in the first column, `wide` puts it in the second, and one
  // document never holds both. Two copies of this JSX is how the desk's and the
  // phone's drift apart — this file's own header records that happening to
  // JobRow.
  //
  // **IT IS ALWAYS THERE WHEN THERE IS ANYTHING TO PUT IN IT**, which is his
  // correction: not an empty state, not a fallback for a quiet day. A detailer
  // with three jobs today still sees what is coming without opening a tab.
  //
  // EVERY ROW IS A `JobRow`, WHICH IS WHERE THE WEATHER ALREADY LIVES. The
  // forecast reaches these rows for free: `useJobWeather` is called once with
  // the whole `bookings` list, which now spans the fortnight, so an upcoming
  // list costs no lookup that today's list was not already paying for. The
  // addresses collapse to one geocode each and the grids to one forecast each.
  const comingUp = upcomingDays.length > 0 && (
    <div className="tight" data-tour="comingup">
      <h2 className="label">{t("Coming up")}</h2>
      {upcomingDays.map(([date, jobs]) => (
        <Fragment key={date}>
          {/* THE DAY IS A ROW OF WORDS, NOT A SECOND EYEBROW. CLAUDE.md
              § SCREEN RULES: `.lab` is a SECTION eyebrow and one per section —
              "Coming up" is that eyebrow, and a second one per day would be
              five more on one screen. This is the date in prose at meta size,
              the same weight the sub-line under a name takes. */}
          {date === upcomingDays[0][0] ? (
            <div className="jw-dayrow">
              <p className="jw-day">{date === tomorrow ? t("Tomorrow") : shortDate(date)}</p>
              {/* ROADMAP 6.4 (d) — the outage fallback. Reads what is already
                  on screen, so it works with no signal. It hangs on the NEXT
                  day that has jobs, which is tomorrow unless tomorrow is quiet:
                  a detailer with a free tomorrow still needs the paper for
                  Thursday. */}
              <button className="btn inline" onClick={() => setPrinting(true)}>
                <Printer size={16} strokeWidth={2} />{" "}
                {date === tomorrow ? t("Print tomorrow") : t("Print {day}", { day: shortDate(date) })}
              </button>
            </div>
          ) : <p className="jw-day">{shortDate(date)}</p>}
          {jobs.map((b) => (
            <JobRow key={b.id} booking={b} weather={weather.get(b.id)}
              weatherRules={weatherRules} onClick={() => setSelected(b)} />
          ))}
        </Fragment>
      ))}
    </div>
  );

  const requestQueue = (
    <div className="tight" data-tour="requests">
      <h2 className="label">
        {requests.length === 1
          ? t("Waiting on you")
          : t("Waiting on you · {count}", { count: requests.length })}
      </h2>
      {/* **THE FIRST CARD IS LIT ONLY WHEN THE DAY HAS NOTHING LIT** — and
          that is the whole of the one-accent-fill rule, written as one
          expression rather than as a prop each component has to be told about.
          Measured at 1440 with both lit: "Mark complete" and "Accept" are two
          filled accent buttons 200px apart at the same height, in view
          together, which is precisely the pair RequestCard's own note was
          written against. When there is work on the rail the day owns the
          fill; on an empty day, or once every job is settled, `lit` is null
          and the request is the one thing left that needs answering. */}
      <RequestCard booking={requests[0]} lit={lit === null} mayAnswer={can("requests")}
        busy={busyId === requests[0]?.id} leaving={leavingId === requests[0]?.id}
        onAccept={acceptRequest} onDecline={declineRequest}
        onQuote={setQuoting} onClick={() => setSelected(requests[0])} />
      {requests.slice(1).map((b) => (
        <button className="row-item" key={b.id} onClick={() => setSelected(b)}>
          <span className="txt">
            <span className="nm">{b.customer_name}</span>
            {/* THE DATE LEADS, for the reason RequestCard prints one at all:
                this is the only object on Today that can be for any day, and a
                row without it reads as today. `.sub` is nowrap with an
                ellipsis, so what leads is what survives truncation. */}
            <span className="sub">
              {[shortDate(b.booking_date), time12(b.start_time),
                ...(b.services ?? []).map((s) => s.name_at_booking).filter(Boolean)]
                .join(" · ")}
            </span>
          </span>
          <span className="figure sm">{money(b.total_price)}</span>
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      ))}
    </div>
  );

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
      {/* ROADMAP 6.4 (a). A dropped signal is not an error to the person in the
          driveway, it is a fact about the list: say so in words, and say how old
          the list is. The raw "Failed to fetch" is for everything else. */}
      {(offline || error) && (offline
        ? (
          <div className="warn-box" role="status" data-offline="">
            <WifiOff size={18} strokeWidth={2} aria-hidden="true" />
            <span style={{ flex: "1 1 0", minWidth: 0 }}>{updatedAt
              ? t("You're offline. Showing your jobs as of {time}.", { time: asOfLabel(updatedAt.toISOString(), business.timezone, today) })
              : t("You're offline. Today's jobs have not loaded yet.")}</span>
          </div>
        )
        : <div className="error-box">{error}</div>)}
      {/* The day is the headline. */}
      {/* data-tour — the walkthrough's first target, and it is the MASTHEAD
          rather than the rail on purpose: the rail is absent on the empty
          dashboard the tour was designed for, and a first step that skips
          itself leaves the tour starting on the header + . */}
      <div data-tour="day">
        <h1 className="title">{longDate}</h1>
        <p className="quiet" style={{ marginTop: 2 }}>
          {/* ONE KEY PER SENTENCE, NEVER ENGLISH GLUED AROUND A VALUE.
              `"Morning" + ", " + name` puts the comma where English wants it;
              a translation has to be free to put the name somewhere else. */}
          {firstName ? t("{when}, {name}", { when: t(partOfDay), name: firstName }) : t(partOfDay)}
          {" · "}
          {empty
            ? t("nothing booked")
            : t("{left} of {total} still to do", { left: todays.length - done, total: todays.length })}
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
              ? t("Your booking page is offline because a payment did not go through. Nothing has been deleted.")
              : t("Your last payment did not go through. We will keep trying for two weeks.")}
          </span>
          <span className="actions">
            <button onClick={() => onGo?.("billing")}>{t("Fix this")}</button>
          </span>
        </div>
      )}

      {/* ROADMAP 3.4f S3 — the channel that would tell them is the broken one,
          so it is said here. `.warn-box`, not `.error-box`: nothing is lost
          (new requests still land on this screen), they just stop being told
          by email. */}
      {can("settings") && ownBounces.length > 0 && (
        <div className="warn-box" role="status" data-own-alerts={ownBounces.join(" ")}>
          <MailWarning strokeWidth={2} aria-hidden="true" />
          <span style={{ flex: "1 1 0", minWidth: 0, overflowWrap: "anywhere" }}>
            {t("Booking alerts to {to} are not arriving. Fix the address in Notifications.", { to: ownBounces.join(", ") })}
          </span>
          <span className="actions">
            <button onClick={() => onGo?.("notifications")}>{t("Fix this")}</button>
          </span>
        </div>
      )}

      {/* "YOUR PAGE ISN'T FULLY SET UP" — a nudge, never an alarm, so it takes
          `.warn-box`'s own reading rather than `.error-box`'s: a panel with an
          edge you can see, ordinary text, the accent only on its own actions.
          Collapses to one line and remembers that choice; reopens on its own
          only when something NEW goes missing that was not missing when it
          was last collapsed. */}
      {setupNotice && (
        <div className="warn-box" data-tour="setup-notice">
          {collapsed ? (
            <>
              {/* ROADMAP 9.15 — even folded away, the line names the one step
                  that is next and the first button goes straight to it. */}
              <span>{t("Next: {name}", { name: t(STEPS.find(([k]) => k === lead[0].key)[2]) })}</span>
              <span className="actions">
                <button onClick={() => onSetup?.(STEPS.findIndex(([k]) => k === lead[0].key))}>{t("Continue")}</button>
                <button onClick={() => toggleCollapsed(false)}>{t("Show")}</button>
              </span>
            </>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row between" style={{ alignItems: "center", gap: 8 }}>
                <strong>{t("Your page isn't fully set up")}</strong>
                {canCollapse && (
                  <button className="nudge-link" onClick={() => toggleCollapsed(true)} style={{
                    background: "none", border: 0, color: "var(--accent-text)",
                    fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    font: "inherit", fontSize: "var(--t-meta)",
                  }}>{t("Hide")}</button>
                )}
              </div>
              {/* LEAD WITH WHAT ACTUALLY STOPS A BOOKING OR A PAYMENT — never
                  more than the three real ones. Everything else is real but
                  cosmetic and sits behind the fold below. */}
              <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
                {lead.map((s) => (
                  <li key={s.key}>
                    <button
                      className="nudge-link"
                      onClick={() => onSetup?.(STEPS.findIndex(([k]) => k === s.key))}
                      style={{
                        background: "none", border: 0, padding: 0, textAlign: "left",
                        color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px",
                        cursor: "pointer", font: "inherit", fontSize: "var(--t-meta)",
                      }}
                    >
                      {t(s.text)}
                    </button>
                  </li>
                ))}
              </ul>
              {cosmetic.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary className="nudge-summary" style={{ cursor: "pointer", fontSize: "var(--t-meta)", color: "var(--text-muted)" }}>
                    {t("and {count} more", { count: cosmetic.length })}
                  </summary>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
                    {cosmetic.map(([k, , name]) => (
                      <li key={k}>
                        <button
                          className="nudge-link"
                          onClick={() => onSetup?.(STEPS.findIndex(([kk]) => kk === k))}
                          style={{
                            background: "none", border: 0, padding: 0, textAlign: "left",
                            color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: "3px",
                            cursor: "pointer", font: "inherit", fontSize: "var(--t-meta)",
                          }}
                        >
                          {t(name)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {reqError && !offline && <div className="error-box">{reqError}</div>}

      {/* A strip of zeroes states nothing, so an empty day has no ledger. */}
      {!empty && (desk
        ? (
          /* ONE ledger strip split by a hairline, not two boxes side by side.
             Two evenly spaced tiles is the three-card tell one short; a single
             sunken block with a rule down it reads as one object with two
             readings, which is what it is. The desk has the 112px; the phone
             does not, which is the row below. */
          <div className="sunken" data-tour="figures" style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: "var(--sp-4)" }}>
            <div>
              <span className="label">{t("Jobs today")}</span>
              <div className="figure" style={{ marginTop: 8 }}>{todays.length}</div>
              {/* ONE KEY, NOT THREE FRAGMENTS. Written as `{done} done · {left}
                  to go` this was English on a Spanish dashboard and BOTH i18n
                  checks reported clean on it — the survey looks for string
                  literals and this was JSX text, and spanish-dom compares
                  against catalogue KEYS, which this could never be. */}
              <div className="quiet" style={{ marginTop: 4 }}>
                {t("{done} done · {left} to go", { done, left: todays.length - done })}
              </div>
            </div>
            <div style={{ background: "var(--line-2)" }} />
            <div>
              <span className="label">{t("Expected")}</span>
              <div className="figure" style={{ marginTop: 8 }}>{money(expected)}</div>
              <div className="quiet" style={{ marginTop: 4 }}>
                {collected > 0
                  ? t("{amount} collected", { amount: money(collected) })
                    // A part refund is named beside what was kept, as the phone cell does (97.87).
                    + (refunded > 0 ? ` · ${t("{amount} refunded", { amount: money(refunded) })}` : "")
                  : refunded > 0
                    ? t("{amount} refunded", { amount: money(refunded) })
                    : t("Nothing collected yet")}
              </div>
            </div>
          </div>
        )
        : (
          /* TWO MONEY CELLS, AND EACH ONE ALWAYS MEANS THE SAME THING —
             rebuilt 2026-09-13 against Andrew's *"money … readable at a glance"*
             and *"nothing should need a second look to understand."*

             IT WAS THREE CELLS AND TWO OF THEM FAILED HIM. `5 / jobs` and
             `0 / done` are the masthead's own "5 of 5 still to do" said twice
             more, one line below it. And the third cell CHANGED MEANING during
             the day — `money(collected > 0 ? collected : expected)` under a
             label that flipped between "expected" and "of $455" — so the one
             figure on the screen a detailer scans for meant *what today is
             worth* in the morning and *what today has paid* by the afternoon,
             with nothing to tell the two apart but the label under it.

             Expected and Collected are now two fixed cells that never swap,
             which is also what the desk strip has always said. `.ledger.two`
             already exists (the client record's own pair) and the extra width
             is what makes a six-figure money value legible in daylight.

             AND THE THREE ENGLISH STRINGS ARE GONE. `"job"/"jobs"`, `"expected"`
             and `` `of ${money(expected)}` `` were raw literals in JSX text —
             the exact shape the comment on the desk strip above warns about,
             one branch away from it, printing English on a Spanish phone with
             both i18n checks clean.

             THE SAME TOUR NAME AS THE DESK STRIP ABOVE, and the rule against
             two elements answering one selector is not broken by it: these two
             are `desk ? … : …`, so exactly one of them is ever in the document.
             Without it the guide lost its figures step on every phone —
             measured at 392, five steps against the desk's six. */
          <div className="ledger two" data-tour="figures">
            <div>
              <span className="figure">{money(expected)}</span>
              <span className="lbl">{t("expected")}</span>
            </div>
            <div>
              <span className="figure">{money(collected)}</span>
              {/* The cell keeps meaning "collected"; money that went back is named
                  under the word, so a refunded day is not a bare "$0" (97.87). It
                  wraps rather than ellipsis, because .lbl clips and 320 is tight. */}
              <span className="lbl">
                {t("collected")}
                {refunded > 0 && (
                  <span style={{ display: "block", whiteSpace: "normal" }}>
                    {t("{amount} refunded", { amount: money(refunded) })}
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}

      {!empty && (
        <div className="dayrail" data-tour="job">
          {needsPay.length > 0 && (
            <h2 className="label">
              {t("Needs payment · {count}", { count: needsPay.length })}
            </h2>
          )}
          {runRows(needsPay, "landed")}
          {still.length > 0 && <h2 className="label">{t("Still to do")}</h2>}
          {runRows(still, "")}
          {/* data-tour — roadmap 2.24. "wrapup" and not "done": every name in
              the tour is unique across the whole app, because two elements
              answering one selector is a silently wrong target. */}
          {settled.length > 0 && <h2 className="label" data-tour="wrapup">{t("Done")}</h2>}
          {settled.map((b) => (
            <button className="settled-row paid" key={b.id} onClick={() => setSelected(b)}>
              <span className="nm">{b.customer_name}</span>
              <span className="figure sm">{money(b.final_amount ?? b.total_price)}</span>
            </button>
          ))}
        </div>
      )}

      {/* THE QUEUE COMES AFTER THE DAY ON A PHONE, AND IT USED TO COME FIRST —
          changed 2026-09-13 against Andrew's brief for this screen: *"a working
          screen a detailer opens between jobs… the one thing that needs them
          now should be unmistakable, money and the day's shape should be
          readable at a glance."*

          `docs/dashboard-screen-designs-2026-08-31.md` §2 put requests second
          in the phone's order, under the masthead and over the ledger. Measured
          at 392 on the demo's own seed, that meant the first 620px of a screen
          named Today were two cards about SEPTEMBER 25 AND SEPTEMBER 27, with
          today's money, today's rail and the job starting in an hour all below
          the fold.

          THE TWO WAITS ARE NOT THE SAME LENGTH, which is what settles it. The
          day's next job needs answering within the hour; `usePendingRequests`
          returns a request for ANY future date, and these two were a fortnight
          out. A request answered one flick down the screen is answered in time;
          a job found one flick down is found late.

          IT IS NOT BURIED EITHER: the queue keeps its own eyebrow, and at a
          desk it is unchanged — first in the second column, beside the day
          rather than below it, which is the arrangement a phone has no room
          for. */}
      {!wide && requests.length > 0 && requestQueue}

      {/* A detailer with no bookings needs the thing that GETS them, not a
          button for typing one in by hand. One sentence and one way forward,
          and it never restates the masthead's own "nothing booked". */}
      {empty && upcoming.length === 0 && requests.length === 0 && (
        /* `emptyscreen` — `docs/final-pass.md` finding 3, measured
           2026-09-06: a brand-new Today ended 256px down a 900px viewport,
           which reads as a screen still loading rather than a day with
           nothing on it. Only the vertical changes and only at a desk. */
        <div className="tight emptyscreen">
          {sellable === 0 ? (
            // THE LINK IS NOT SHOWN AT ALL HERE, rather than shown with a
            // warning beside it. A caveat under a Copy button is a caveat
            // nobody reads; the honest screen offers the one thing that has
            // to happen first, and the link comes back by itself the moment
            // there is a service to sell.
            <>
              <p className="body">{t("Nobody can book yet. Your page has no services on it.")}</p>
              <div className="card setting-card">
                <button className="nav-row" onClick={() => onSetup?.()}>
                  <span className="ico"><ListChecks size={19} strokeWidth={2} /></span>
                  <span className="txt">
                    <span className="name">{t("Finish setting up")}</span>
                    {/* SHORT ENOUGH TO FIT AT 392, which the first version was
                        not — `.now` ellipsised it to "…your link start…", and a
                        sentence that ends in an ellipsis is a sentence nobody
                        finishes reading. It still adds a fact the heading does
                        not carry: WHICH part of setup is the one blocking the
                        link. */}
                    <span className="now">{t("Your services come first")}</span>
                  </span>
                  <span className="chev"><ChevronRight size={18} strokeWidth={2} /></span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="body">{t("Your booking link is how a day gets filled.")}</p>
              <BookingLink slug={business.slug} origin={siteOrigin} />
            </>
          )}
        </div>
      )}

      {/* Tomorrow is deliberately NOT on the rail — carrying the thread
          through tomorrow would say the two are one continuous run of work,
          and the point of the rail is that it ends. On a phone it is one row:
          a driveway does not need tomorrow's detail, only that it exists and
          can be looked at. At a desk it is the right column's second block. */}
      {/* IT REPLACED A ONE-LINE "Tomorrow · 2 jobs, first at 9:00 AM" SUMMARY,
          rather than sitting under it. Keeping both would print tomorrow's
          jobs twice on one screen, and the summary's own job — knowing there
          is something tomorrow — is done better by the jobs themselves. */}
      {!wide && comingUp}

      {/* THE RE-BOOK PROMPT — roadmap 2.19, and it is LAST on purpose. Today
          is the day's work; people who have not been back are not today's
          work, and a prompt above the rail would be the product interrupting a
          detailer's morning with marketing. It reads as the last line of the
          screen, which is what it is.
          THREE, NOT ONE. The same floor the Clients screen's own sort control
          uses: below it a detailer can see the answer without being told, and
          a prompt about one person is noise wearing a number. */}
      {lapsedCount >= 3 && (
        <button className="row-item" data-tour="lapsed" onClick={() => onGo?.("clients", "lapsed")}>
          <span className="txt">
            <span className="nm">{lapsedCount === 1
              ? t("1 has not been in for 3 months")
              : t("{n} have not been in for 3 months", { n: lapsedCount })}</span>
            <span className="sub">{t("Write to them")}</span>
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
          {/* Same element as the phone's, same reason: `!wide` there and
              `wide` here, so one document never holds both. The desk lost its
              requests step until 2026-09-10 — the one object on the screen
              waiting on the detailer rather than on a car, and the guide did
              not mention it.
              IT WAS TWO COPIES OF THE SAME JSX UNTIL 2026-09-13, which is how
              the desk's copy and the phone's copy drift — this file's own
              header records that failure happening to JobRow. One
              `requestQueue`, rendered in one of two places. */}
          {requests.length > 0 && requestQueue}
          {/* THE COLUMN WAS ALREADY "the future" — it held tomorrow and nothing
              else, so this is the same block reaching further rather than a new
              one. The compact `.settled-row` it used carried no weather; a
              `JobRow` does, which is what makes every upcoming row carry its
              sky the way today's rows do. */}
          {comingUp}
          {slots !== null && (
            <div className="tight" data-tour="ahead">
              <h2 className="label">{t("The next 7 days")}</h2>
              <div className="facts">
                <div><span>{t("Open slots")}</span><span className="v strong num">{slots.open}</span></div>
                {/* The denominator. A day with nothing free is the fact a bare
                    count hides: fourteen openings spread over six days and
                    fourteen crammed into two are different weeks. */}
                <div>
                  <span>{t("Days with room")}</span>
                  <span className="v num">{t("{open} of {total}", { open: slots.withRoom, total: slots.days })}</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {selected && (
        <RecordHost onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          {/* ROADMAP 4.1 / DECISIONS.md "the record stays open on a status
              change" — `reload()` refreshes the day's lists; `selected` is a
              snapshot none of those reloads touch, so it is re-fetched by id
              the same way so the record shows what the tap just did instead
              of closing on it. */}
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => { reload(); fetchBooking(selected.id, business.id, business.timezone).then(setSelected); }} />
        </RecordHost>
      )}
      {printing && (
        <SchedulePrint
          jobs={upcomingDays[0]?.[1] ?? []}
          title={upcomingDays[0]?.[0] === tomorrow ? t("Tomorrow's schedule") : t("Schedule")}
          dateLabel={new Date(`${upcomingDays[0]?.[0] ?? tomorrow}T12:00:00`).toLocaleDateString(appIntlLocale(), { weekday: "long", month: "long", day: "numeric" })}
          onClose={() => setPrinting(false)} />
      )}
      {finalizing && (
        <FinalizeModal booking={finalizing} onClose={() => setFinalizing(null)}
          onDone={() => { setFinalizing(null); reload(); }} />
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
