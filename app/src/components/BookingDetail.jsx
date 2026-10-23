// The job record: an ACTION BAR over named sections.
//
// 26 of the product's 126 capabilities live on this object and until roadmap
// 2.11 step 6 stage 2 it was one 340-line scroll with the phone buttons four
// blocks down, under a heading called "Contact". Every product in the research
// sample (Jobber, Housecall Pro, Zenbooker) puts them at the top, because that
// is the only thing you need while you are standing at the car. Sections, not
// tabs: tabs hide state, and a tab strip inside a sheet inside a phone is a
// second navigation on a screen that already has one.
// docs/dashboard-screen-designs-2026-08-31.md §3.
//
// THE CONTAINER IS THE CALLER'S (component inventory §2) — a sheet below
// --wrap, the second column at a desk, the page itself at /job/:id. This file
// renders content and nothing else.
//
// Every booking WRITE goes through the update-booking edge function
// (validation + conflict checks server-side).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarPlus, Check, CheckCircle2, CreditCard, ExternalLink, MessageSquare, MessageSquareQuote, Navigation, Phone, Receipt, UserPlus, X } from "lucide-react";
import { api, downloadOwnerIcs } from "../lib/api.js";
import { calendarUrlFor, loadPrefs, saveContact } from "../lib/platform.js";
import { supabase } from "../lib/supabase.js";
import { fillTemplate, missingDefaults, templateLabel } from "../lib/templates.js";
import { dateLong, localDate, mapsUrl, money, phoneAsTyped, time12 } from "../lib/format.js";
import ConfirmTap, { jobDoneQuestion, jobPhrase } from "./ConfirmTap.jsx";
import { useBusiness } from "../context/BusinessContext.jsx";
import JobPhotos from "./JobPhotos.jsx";
// ROADMAP 5.3 — the same mail rows the client record draws. One file, so the
// two screens cannot disagree about whether an email bounced.
import EmailTrail from "./EmailTrail.jsx";
import FinalizeModal from "./FinalizeModal.jsx";
import QuoteModal from "./QuoteModal.jsx";
import Sheet from "./Sheet.jsx";
// ROADMAP 4.7 — four mutually exclusive states is a Segmented by law, and this
// is the same control the sheet that SET the value uses.
import { Segmented } from "./controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { getAppLocale, t } from "../lib/appI18n.js";
import JobWeather from "./JobWeather.jsx";
import { useJobWeather } from "../hooks/useJobWeather.js";
import { useAppLocale } from "../hooks/useAppLocale.js";
import { jobMailWarning } from "../lib/mailWarning.js";
import { businessToday } from "../book/core.js";
import { PAY_LABELS, payPill } from "../lib/payPill.js";

// One vocabulary for the values a person reads, so the same booking does
// not say "completed" in the sheet and "Completed" on the card, or show the
// database's own word for a vehicle size.
const STATUS_LABELS = {
  confirmed: "Confirmed", completed: "Completed",
  cancelled: "Cancelled", no_show: "No-show",
  // ROADMAP 2.12 — "Pending" is what the database calls it and nobody says it
  // out loud. The detailer's own word for this row is that somebody is waiting.
  pending: "Waiting on you",
};
// ROADMAP 4.7 — THE SAME FOUR STATES, AS A CONTROL, IN THIS RECORD'S OWN WORDS.
// Derived from `PAY_LABELS` rather than written out again, so the choice a
// detailer presses and the pill at the top of the record can never disagree
// about what a state is called. FinalizeModal's own segmented says "Not yet"
// where this says "Unpaid"; that seam is older than this block and the call
// here is to agree with the pill sitting six lines above it, on the same
// screen, rather than with a sheet that has closed.
// The ORDER is a scale and is written out rather than taken from the object:
// paid, part paid, nothing, given away.
const PAY_CHOICES = ["paid", "partial", "pending", "waived"].map((k) => [k, PAY_LABELS[k]]);
// W9 — sizes are the detailer's own list now, so a booking carries the LABEL
// it was taken at (bookings.vehicle_size_label). This map is the fallback for
// rows taken before that column existed; a key we do not know is de-slugged
// rather than printed raw.
// ROADMAP 5.3 — the mail to this job's address. SHORTER THAN THE CLIENT
// RECORD'S TWELVE on purpose: the question here is "did the receipt go out",
// and a year of reminders under a job is a list nobody reads to the end.
const MAIL_CAP = 6;
const SIZE_LABELS = { small: "Small", medium: "Medium", large: "Large" };
const sizeLabel = (b) => b.vehicle_size_label
  || (SIZE_LABELS[b.vehicle_size] && t(SIZE_LABELS[b.vehicle_size]))
  || String(b.vehicle_size || "").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
// W27. Shown only when it was asked — null means "not asked", which is a
// different fact from a clean car.
const CONDITION_LABELS = {
  light: "Light dirt", moderate: "Moderately dirty", heavy: "Heavily soiled", extreme: "Extreme",
};

// The record's own name for itself. The container is the caller's now
// (docs/dashboard-component-inventory-2026-08-31.md §2), and six callers each
// composing this string is six chances for the same job to be titled two ways.
export const jobRecordProps = (b) => ({
  title: b.customer_name,
  subtitle: `${dateLong(b.booking_date, getAppLocale())} · ${time12(b.start_time)} – ${time12(b.end_time)}`,
});

export default function BookingDetail({ booking, onClose, onChanged }) {
  useAppLocale();
  // `siteOrigin` is the detailer's OWN host where they have one — a text that
  // links a customer back to detailingplatform.com when the detailer has a
  // domain is the seam roadmap 3.3 exists to remove.
  const { business, siteOrigin, can } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [pickingText, setPickingText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [quoting, setQuoting] = useState(false);
  // ROADMAP 4.7 — NULL MEANS "WHATEVER THE ROW SAYS", WHICH IS WHY IT IS NOT
  // SEEDED FROM THE BOOKING. Seeded, it would go stale the moment the write
  // lands and `booking` comes back changed, and the record would offer to
  // change a payment to the value it already holds. Read through `??` it
  // follows the row for free and the answer button disappears on success
  // with no effect anywhere.
  const [payPick, setPayPick] = useState(null);
  const [mail, setMail] = useState(null);   // ROADMAP 5.3 — null means loading
  const [mailErr, setMailErr] = useState(""); // ROADMAP 3.1 — a failed read is not an empty one
  const [lastMail, setLastMail] = useState(null); // ROADMAP 3.4f S1 — newest email about THIS booking

  const [form, setForm] = useState({
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    customer_email: booking.customer_email || "",
    customer_address: booking.customer_address || "",
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    admin_notes: booking.admin_notes || "",
  });

  // `changed` is FALSE for the two actions that send an email and touch
  // nothing. All four callers wire onChanged to "reload the list AND close
  // the record", which is right for a status change and wrong for a send:
  // it meant "Reminder sent to customer." and "Invoice + thank-you sent."
  // were written into a record that was already gone. Nobody had ever seen
  // either message. It matters more now — Reminder is one tap in the bar.
  //
  // ROADMAP 9.21 — `act` RETURNS WHAT `fn` RETURNED, AND `doneMsg` MAY BE A
  // FUNCTION OF THAT ANSWER. It used to throw the answer away, so every notice
  // was picked before the press: "Receipt + thank-you sent." printed even when
  // the server said `thank_you_sent: false`. ONE CONVENTION, SEVEN CALLERS
  // (grep `act(` in this file): a fixed string is a promise that no successful
  // answer can contradict it, and each fixed site says why below; a site whose
  // answer CAN contradict it passes `(answer) => sentence`. On a throw `act`
  // returns undefined. `idempotent: false` is still not shown — ROADMAP 6.4's
  // 2026-10-08 decision (clause 4: it is a success; Andrew is the reader).
  const act = async (fn, doneMsg, changed = true) => {
    setBusy(true);
    setError("");
    setNotice("");
    let answer;
    try {
      answer = await fn();
      // ROADMAP 5.3 — TRANSLATED HERE, WHERE ALL SEVEN CALLERS ROUTE THROUGH.
      // Every one of them passes a bare English sentence and `appEs.js` has
      // carried Spanish for them since 14.x — so a Spanish dashboard has been
      // answering "Reminder sent to customer." in English the whole time, with
      // a key sitting right there unused.
      const msg = typeof doneMsg === "function" ? doneMsg(answer) : doneMsg;
      if (msg) setNotice(t(msg));
      if (changed) onChanged?.();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
    return answer;
  };

  // A CONFIRMATION IN A PINNED BAR HAS TO LEAVE ON ITS OWN. It used to scroll
  // away with the rest of the record; now it sits in the one part of the
  // screen that never moves, so "Reminder sent to customer." would eat 44px of
  // the bar for the rest of the session. Six seconds is long enough to read a
  // five-word sentence twice. AN ERROR IS NOT TIMED OUT — it is a thing you
  // still have to do something about, and it clears on the next action.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // ROADMAP 4.1 / DECISIONS.md "the record stays open on a status change" —
  // this notice has never once been on a screen (`onChanged` used to unmount
  // it in the same tick), so it was never caught not being a real `t()` call.
  // Four call sites only; an unrecognised status falls back to the raw enum
  // value rather than inventing a fifth sentence nobody asked for.
  const STATUS_NOTICE = {
    confirmed: "Marked as confirmed.",
    completed: "Marked as completed.",
    no_show: "Marked as not shown.",
    cancelled: "Marked as canceled.",
  };
  // FIXED NOTICE, CANNOT BE CONTRADICTED (9.21): `update-booking` answers
  // success only when the row now has this status — its `duplicate` answer
  // requires `now.status === status`; anything else is a 409 and lands in the
  // error box. Same for `saveEdit` ("Saved."; a move is fenced the same way)
  // and `correctPayment` (a plain write, so success means it was written).
  // `softDelete` shows no notice at all.
  const setStatus = (status) =>
    act(() => api.updateBooking(business.id, { booking_id: booking.id, status }),
      t(STATUS_NOTICE[status] ?? `Marked ${status}.`));

  const saveEdit = () =>
    act(async () => {
      await api.updateBooking(business.id, {
        booking_id: booking.id,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        customer_address: form.customer_address || null,
        booking_date: form.booking_date,
        start_time: form.start_time,
        admin_notes: form.admin_notes || null,
      });
      setEditing(false);
    }, "Saved.");

  const softDelete = () =>
    act(async () => {
      await api.softDeleteBooking(business.id, booking.id);
      onClose?.();
    });

  // ROADMAP 4.1 — WHAT EVERY "ARE YOU SURE" ON THIS RECORD NAMES: customer,
  // service, time. Same three facts the completion question carries.
  const job = jobPhrase({
    name: booking.customer_name,
    service: (booking.services ?? []).map((sv) => sv.name_at_booking).filter(Boolean).join(" · "),
    time: time12(booking.start_time),
  });

  const address =
    booking.service_type === "mobile" && booking.customer_address
      ? booking.customer_address
      : business.dropoff_address;

  // WEATHER FOR THIS ONE JOB — Andrew, 2026-09-13: *"also inside the booking
  // details."* One booking is one list of one, so the same hook the day
  // screens use covers it and the caches are shared: opening a record for a job
  // whose row already showed a chip costs no request at all.
  // A stable one-element list. `[booking]` written inline is a new array on
  // every render, which would restart the hook's effect for ever.
  const justThis = useMemo(() => [booking], [booking]);
  const { weather: jobWeather, prefs: weatherRules, busy: weatherBusy } = useJobWeather(justThis);

  // ── ROADMAP 8.19 / IDEA 06 — "ON MY WAY" IS A BUTTON NOW ─────────────
  //
  // His words: *"I guess. But yeah, we could add that as a button for the
  // booking."* It already existed as one preset among twelve, two taps deep
  // behind **Text**, which is not what a person wants while they are getting
  // into the van.
  //
  // **SO THE TEMPLATES LOAD WITH THE RECORD RATHER THAN WITH THE PICKER**,
  // and that is what makes the button a real `<a href="sms:">` instead of a
  // click handler that fetches and then tries to navigate. A programmatic
  // jump to `sms:` from the async continuation of a tap is exactly the kind
  // of thing a mobile browser blocks, and it would fail on the platform this
  // feature is FOR. One small query per record open buys that, and it makes
  // the picker instant as a side effect.
  //
  // **AND IT USES THE DETAILER'S OWN WORDING, NOT THE DEFAULT.** Falling back
  // to `DEFAULT_TEMPLATES` when the row has not arrived would send a customer
  // a sentence the detailer edited months ago and thinks they replaced — a
  // silent wrong answer, which is worse than the button being absent for a
  // beat. So the button is only drawn once the real row is in hand.
  useEffect(() => {
    let dead = false;
    (async () => {
      const { data } = await supabase
        .from("message_templates").select("*")
        .eq("business_id", business.id).order("sort_order");
      // A shipped template this business has no row for yet (one added after
      // it was seeded, ROADMAP 3.4f D1) is offered in its shipped words — it
      // cannot be one the detailer edited, because they never had it. Only
      // after a SUCCESSFUL read, so a failed one still draws nothing.
      const rows = data ?? [];
      const extra = data ? missingDefaults(rows).map((d) => ({ ...d, id: d.key, body: t(d.body) })) : [];
      if (!dead) { setTemplates([...rows, ...extra]); setTemplatesLoaded(true); }
    })();
    return () => { dead = true; };
  }, [business.id]);

  // ROADMAP 5.3 — READ, NEVER WRITTEN. `email_sends` grants a browser `select`
  // and nothing else, so this record cannot mark a bounce as delivered however
  // hard it tries; the service role writes every row and Resend's webhook
  // updates it. `null` means loading, `[]` means nothing was ever sent — a
  // spinner is the difference and the two must not collapse.
  //
  // **`data ?? []` WAS DRAWING A FAILED READ AS "nothing has been emailed to
  // this address yet" — roadmap 3.1.** Same one-line fault as the client
  // record's copy, and the same fix: the error goes to `EmailTrail`, which owns
  // the empty sentence and suppresses it rather than racing it.
  const loadMail = useCallback(async () => {
    setMailErr("");
    if (!booking.customer_email) { setMail([]); return; }
    const { data, error } = await supabase
      .from("email_sends")
      .select("id, subject, to_email, status, detail, sent_at")
      .eq("business_id", business.id)
      .eq("to_email", booking.customer_email)
      .order("sent_at", { ascending: false })
      .limit(MAIL_CAP);
    if (error) setMailErr(error.message); else setMail(data ?? []);
    // ROADMAP 3.4f S1 — its own query, not a filter of the rows above: those
    // are the newest six to the ADDRESS, and a customer with other jobs can
    // push this booking's email out of them.
    const { data: last } = await supabase
      .from("email_sends")
      .select("status, detail")
      .eq("business_id", business.id)
      .eq("booking_id", booking.id)
      .eq("to_email", booking.customer_email)
      .order("sent_at", { ascending: false })
      .limit(1);
    setLastMail(last?.[0] ?? null);
  }, [business.id, booking.id, booking.customer_email]);
  useEffect(() => { setMail(null); loadMail(); }, [loadMail]);

  // THE PAGE THE CUSTOMER SEES. `siteOrigin` is the tenant's own domain when
  // they have one, so this opens what they opened and not a second address for
  // the same booking.
  const receiptHref = `${siteOrigin || window.location.origin}/booking/${booking.id}`;

  const onMyWay = templates.find((x) => x.key === "on_my_way");
  const openTextPicker = () => setPickingText(true);
  const smsHref = (body) =>
    `sms:${booking.customer_phone}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(body)}`;
  // EVERY TOKEN THE TEMPLATE SCREEN OFFERS IS FILLED HERE, and that is a
  // contract rather than a convenience: `PLACEHOLDERS` grew from six to ten
  // on 2026-09-11, and a token this call site does not know about goes out in
  // a real customer's text as a fallback word. Add them in the same change.
  const filled = (body) =>
    fillTemplate(body, {
      booking, business,
      dateLabel: dateLong(booking.booking_date, getAppLocale()),
      timeLabel: time12(booking.start_time),
      address: address || "",
      total: money(booking.final_amount ?? booking.total_price),
      service: (booking.services ?? []).map((s) => s.name_at_booking).filter(Boolean).join(", "),
      vehicle: booking.vehicle_model || "",
      // The customer's OWN page for this booking — where they reschedule or
      // cancel it.
      bookingLink: receiptHref,
    });

  // THE MONEY, and this is Part B row 19. The record printed "Estimated
  // $235.00 · Final $235.00" on every finalized job, which is two figures
  // saying one thing. One figure when they agree; both only when they
  // differ, and then the difference is NAMED rather than left to subtract.
  const quoted = Number(booking.total_price);
  const charged = booking.final_amount == null ? null : Number(booking.final_amount);

  // HAS A RECEIPT FOR **THIS JOB** ALREADY GONE?
  //
  // The subject `invoiceEmail` writes is `Your receipt from <business>: $195`
  // (`Receipt · $195 · <business>` before 99.2d, and receipts already sent still
  // carry that) — the product's own word for this document, in whichever
  // language the booking was taken in, and then THE AMOUNT. Both halves are matched, and the amount is
  // the half that matters: the rows below are every email to this ADDRESS, and
  // a returning customer has receipts on them from jobs that are not this one.
  // Matching the word alone made a job whose receipt had never been sent offer
  // to send it "again" — a screen telling the detailer their customer is
  // holding something they have never been sent. Found by sabotaging this
  // check on 2026-09-18 and watching it stay green.
  //
  // ponytail: a subject match rather than a new `bookings.invoice_sent_at`
  // column. The row already carries the date AND the delivery outcome, which
  // is two facts a timestamp would not have and could disagree with. Two jobs
  // for one customer at the identical price share a subject and would share
  // this answer; that is a soft wrong label over a list that still shows the
  // truth, and it is a smaller lie than a second copy of the fact.
  // ROADMAP 6.4 — ONE INTENT TO SEND, ONE KEY, AND THE SERVER CANNOT WORK THIS
  // OUT FOR ITSELF. A press of "Email the receipt" that is never answered — a
  // driveway with one bar, a timeout, a second tap while the first is still in
  // flight — has to reach the server carrying the SAME key as the press it is
  // repeating, or it is a second invoice in the customer's inbox. A deliberate
  // "Email it again" an hour later is a different intent and takes a new key,
  // which is why this is a ref made at the press and NEVER derived from the
  // booking id: a key that was a function of the booking could never send twice.
  const sendKey = useRef(null);
  // A DIFFERENT BOOKING IS A DIFFERENT INTENT. Without this a key left over from
  // a failed send on one job would ride along to the next one and the server
  // would answer `duplicate` about somebody else's invoice.
  //
  // **THIS COMMENT USED TO NAME THE FOUR SCREENS WHERE IT IS NOT LOAD-BEARING
  // AND MISS THE ONE WHERE IT IS — corrected 2026-10-08.** It said the record is
  // reused in place on Today, Calendar, Money and Clients; on those four
  // `RecordHost` mounts a fresh `BookingDetail` for each job, so the ref is
  // already gone. The screen this line actually saves is the FIFTH:
  // `screens/JobPage.jsx` renders the record bare under `/job/:id`, where only
  // the route param changes and the component stays mounted. A guard whose
  // comment points at the wrong screen is a guard somebody deletes while
  // checking the screens it names.
  useEffect(() => { sendKey.current = null; }, [booking.id]);

  // **AND `payPick` IS THE SAME SHAPE OF STATE AND DID NOT HAVE THIS LINE —
  // found 2026-10-08 by the session that did NOT build 4.7, reading it cold.**
  // Two blocks in one file, written the same evening, one guarded and one not.
  //
  // WHAT IT COST, said plainly because it is a money path: `payWant` is
  // `payPick ?? booking.payment_status`, so a pick left over from the previous
  // job stayed live when `booking` changed under a mounted component. The
  // answer button appeared because that stale pick differed from the NEW job's
  // status, and one press wrote the previous job's chosen state onto the job on
  // screen — including **Waived**, which this file paints `.btn.danger`
  // precisely because it loses money.
  //
  // **IT WAS REACHABLE ON `/job/:id`.** `screens/JobPage.jsx` renders this
  // component bare — no `RecordHost`, no key — and React Router keeps the
  // element mounted when only the param changes, so Back and Forward between
  // two job pages swap `booking` without a remount. A tapped push notification
  // is the other way in; ROADMAP 14.34 points those links at this route.
  //
  // **ON THE DASHBOARD IT WAS SAVED BY AN ANIMATION DEVICE, WHICH IS NOT A
  // GUARD.** `RecordHost.jsx`'s `swapKey` remounts the body to re-run the swap
  // animation, and that happened to take `payPick` with it. Correctness resting
  // on another file's animation key is correctness nobody can see; this line is
  // what makes the four wide-layout screens safe ON PURPOSE rather than by side
  // effect, and it holds even where that key collides.
  useEffect(() => { setPayPick(null); }, [booking.id]);

  // THE KEY SURVIVES A FAILURE AND DIES ON SUCCESS, which is the whole rule in
  // two lines. It is cleared only after an answer that says the invoice is out
  // (`duplicate: true` is such an answer: an earlier press of THIS key already
  // sent it), so every other ending — a thrown network error, a 502
  // `email_failed`, a timeout — leaves the key in place for the next press.
  // **THE KEY IS READ ONCE, INTO A LOCAL, AND THAT IS NOT TIDINESS — IT IS THE BUG
  // THIS WAS WRITTEN WITH, FOUND BY DOUBLE-TAPPING IT.** The first version passed
  // `sendKey.current` on every attempt. Two presses in flight: the first succeeds and
  // clears the ref, and the second press — waiting out its 409 — then re-reads the ref,
  // finds null, and goes back to the server WITH NO KEY, which is the old send-anyway
  // behaviour and a second invoice. Measured: two presses, three requests, the third
  // keyless, and TWO invoices out. The intent's key belongs to the call, not to the ref;
  // the ref only exists so the NEXT press can find an unfinished intent.
  const sendReceipt = async () => {
    const key = (sendKey.current ||= crypto.randomUUID());
    for (let attempt = 1; ; attempt++) {
      try {
        const answer = await api.sendInvoice(business.id, booking.id, key);
        // ONLY IF IT IS STILL THIS INTENT'S KEY. Clearing blind would wipe a newer
        // press's key and hand the next retry a fresh one, which is the same fault
        // one step along.
        if (sendKey.current === key) sendKey.current = null;
        return answer;
      } catch (e) {
        // **409 `in_progress` IS NOT A FAILURE AND MUST NOT BE SHOWN AS ONE.** It
        // says another press of this same intent is still sending, so the honest
        // thing on screen is the sent notice this press is about to earn: wait,
        // ask again with the same key, and the server answers `duplicate` once
        // the first press lands. Three tries at 700ms covers a send that is
        // slower than the tap; past that the error is real and is shown.
        if (attempt <= 3 && e.status === 409 && e.body?.error === "in_progress") {
          await new Promise((r) => setTimeout(r, 700));
          continue;
        }
        // **AND THE GIVEN-UP 409 PUT THE WORD `in_progress` IN A RED BOX — found
        // 2026-10-08 by the session that did not build this, reading it cold.**
        // The contract's clause 4 says a 409 `in_progress` must not be shown as a
        // failure, and the paragraph above is careful about the three retries and
        // then throws the server's TOKEN at the screen: `send-invoice` answers
        // `{ error: "in_progress" }`, `book/core.js` makes that the Error's
        // message, `act` does `setError(e.message)`, and the record renders it
        // raw. It had no Spanish key either, so it was the same token in both
        // languages.
        //
        // **AND IT IS REACHABLE FOR TWO WHOLE MINUTES, WHICH IS THE PART THAT
        // MAKES IT WORTH A BRANCH.** The server's stale-send takeover is two
        // minutes (`_shared/sendInvoiceClaim.ts`); this loop gives up after about
        // 2.1 seconds. So a send that dies mid-flight leaves every press until
        // that takeover answering 409 — four requests, then the token. The retry
        // budget is reasonable; the sentence at the end of it was not.
        //
        // The key is deliberately NOT cleared here: this intent really is still
        // in flight somewhere, so the next press must carry the same key rather
        // than mint a fresh one and send a second invoice.
        if (e.status === 409 && e.body?.error === "in_progress") {
          // A LITERAL INSIDE `t()`, NOT A CONSTANT: `tests/spanish.test.mjs` reads
          // the first argument of each `t()` call, so a sentence held in a
          // variable is invisible to every extractor here — ConfirmTap's own
          // comment says the same thing about lookup tables. And it is
          // translated HERE rather than in `act`, whose catch does a bare
          // `setError(e.message)`; wrapping that would re-word every server
          // sentence the product deliberately shows as written.
          throw new Error(t("That receipt is still sending. Give it a minute and check again."));
        }
        throw e;
      }
    }
  };

  const sentReceipt = (mail ?? []).some((m) =>
    /^(your receipt|receipt|tu recibo|recibo)\b/i.test(String(m.subject || ""))
    && String(m.subject).includes(money(charged)));
  const diff = charged == null ? 0 : Math.round((charged - quoted) * 100) / 100;
  // Same condition as Today's lit card and its "Needs payment" run, so the
  // card and the record it opens cannot disagree about what the job wants
  // next. It also answers the design's "a job in the future has no Finalize
  // payment" for free: a future job cannot be completed.
  const canFinalize = booking.status === "completed" && !booking.finalized_at;
  // ── ROADMAP 4.7 — THE WAY BACK FROM A RECORDED PAYMENT ───────────────────
  //
  // **WHAT THERE WAS BEFORE THIS: nothing, on any screen.** `FinalizeModal`
  // writes `payment_status` and stamps `finalized_at` in the same call, and
  // the line above takes the modal away the moment it has set the payment. The
  // only other screen that writes a payment state is Money's chase list, and
  // it reads `pending` or `partial` only, so a job marked **paid** or
  // **waived** by a mis-tap appeared on no list that could change it. The
  // server allowed it the whole time: `payment_status` is an ordinary editable
  // field on `update-booking` and the column's CHECK takes all four values in
  // any order. **The way back was simply never drawn.**
  //
  // **AND IT IS NOT A SECOND FINALIZE, WHICH IS THE ITEM'S OWN NAMED WAY TO
  // FAIL.** The obvious build re-opens `FinalizeModal`, which stamps
  // `finalized_at` again and re-writes the line items, and leaves an audit
  // trail saying the job was finished twice. This sends ONE field. No
  // `finalized_at`, no `booking_line_items`, no `status`.
  //
  // THE AUDIT ROW NEEDS NOTHING BUILT. `_shared/actionLog.ts` already writes a
  // `payment.set` (or `payment.waive`) row carrying the before and the after
  // for any `payment_status` move through `update-booking`, from the row's own
  // two states rather than from the payload — so a correction is exactly as
  // visible as the original waive, and a repeated press writes nothing twice.
  const canCorrectPayment = !!booking.finalized_at;
  // `??` rather than a seeded state: see `payPick` above.
  const payWant = payPick ?? booking.payment_status;
  // **THE TWO THAT CAN LOSE MONEY**, which is what earns them `--bad` under
  // `docs/screen-rules.md` while the other two do not get it: **Paid** takes
  // the job off the chase list and says the money is in, so nobody is ever
  // asked about it again; **Waived** gives the work away. Unpaid and Part paid
  // both put the job BACK on a list a person reads, which is an outcome a
  // detailer can live with rather than a loss.
  const payLosesMoney = payWant === "paid" || payWant === "waived";
  const correctPayment = () =>
    act(() => api.updateBooking(business.id, {
      booking_id: booking.id,
      payment_status: payWant,
      // **A NOTE ABOUT HOW THEY PAID IS A LIE ONCE NOTHING WAS PAID.** The
      // record prints "How they paid: Cash" from `payment_notes`, and a job
      // corrected to Unpaid or Waived would print it under a pill saying
      // nothing came in. This is FinalizeModal's own rule, not a new one: that
      // sheet hides the method chips and the note field for exactly these two
      // states, so the states already mean "no method to record".
      ...(payWant === "pending" || payWant === "waived" ? { payment_notes: null } : {}),
    }), "Payment updated.");
  const cancelled = booking.status === "cancelled";
  // ROADMAP 14.4 — A CANCELLED JOB THAT WAS ALREADY PAID FOR.
  //
  // THREE PATHS END HERE and this one line covers all three, which is why it
  // is a fact about the ROW and not a message passed back from whichever
  // endpoint did it: the customer cancelling from their own link
  // (`cancel-booking`), the detailer declining a request
  // (`respond-to-booking`), and the detailer's own "Cancel the job" button
  // just below (`update-booking` with `status: "cancelled"`). Two of those
  // three send no owner email at all, so a screen that waited to be told
  // would stay silent on exactly the paths the detailer drove themselves.
  //
  // The rule is `_shared/connect.ts`'s `refundOwed`, restated: `paid` and
  // `partial` mean money moved, `waived` means the detailer made it free and
  // `pending` means nothing was ever taken. `partial` carries no figure
  // because nothing records which part was paid — the same reason
  // `payability` refuses to guess at it.
  const mailWarning = jobMailWarning(lastMail, { bookingDate: booking.booking_date, today: businessToday(business.timezone) });
  // ROADMAP 97.68 — a refund the detailer made in Stripe is recorded by the
  // webhook (`payment_problem.refunds`, by payment). Refunded in full, the job's
  // own payment owes nothing and the red line goes; in part, it names what is left.
  const refunds = booking.payment_problem?.refunds || {};
  const refundedOf = (intent) => (intent && Number(refunds[intent]?.refunded_cents)) || 0;
  const ownRefund = booking.stripe_payment_intent ? refunds[booking.stripe_payment_intent] : null;
  const ownLeftCents = ownRefund ? (Number(ownRefund.paid_cents) || 0) - refundedOf(booking.stripe_payment_intent) : null;
  const refundOwed = cancelled
    && (booking.payment_status === "paid" || booking.payment_status === "partial")
    && !(ownRefund && ownLeftCents <= 0);
  const refundAmount = booking.payment_status === "partial"
    ? null : money(booking.final_amount ?? booking.total_price);
  // ROADMAP 97.10 — a card payment came in that did not match what the job
  // owes, so the webhook left it unpaid. Shown while the job is unsettled;
  // once the detailer marks it paid it becomes a possible refund (97.70, below),
  // and so does waiving it (97.75).
  // ROADMAP 97.11: `payments` is money that came in AFTER the job was settled.
  // It is a refund still to make, so it shows whatever the job's status, and
  // whichever note carries it (an `extra`, or a `failed` bank payment).
  // ROADMAP 97.69: a payment carrying a `reason` is a wrong-figure payment that
  // came in BEFORE the job was paid another way, so it gets its own line each —
  // "came in after this job was settled" would be untrue of it.
  const payUnsettled = booking.payment_status !== "paid" && booking.payment_status !== "waived";
  const refundPayments = Array.isArray(booking.payment_problem?.payments) ? booking.payment_problem.payments : [];
  // ROADMAP 97.68: a refund the detailer already made in Stripe is not owed
  // again, so each payment shows only what is LEFT, and goes once that is
  // nothing. One line per payment: a sentence over the sum of two named a
  // figure true of neither (review, 2026-10-17).
  const leftCents = (p) => (Number(p?.paid_cents) || 0) - refundedOf(p?.intent);
  const stillOwed = refundPayments.filter((p) => leftCents(p) > 0);
  const owedBack = stillOwed.filter((p) => p?.reason);
  const extrasOwed = stillOwed.filter((p) => !p?.reason);
  // Every reason the webhook kept (`earlier`, newest note first), one line each.
  const kept = booking.payment_problem
    ? [booking.payment_problem, ...(Array.isArray(booking.payment_problem.earlier) ? [...booking.payment_problem.earlier].reverse() : [])]
      .filter((r) => r?.kind && r.kind !== "extra")
      // 97.68: a wrong-figure payment refunded in full needs nothing more doing.
      .filter((r) => !((r.kind === "amount" || r.kind === "currency") && r.intent && refundedOf(r.intent) >= Number(r.paid_cents)))
    : [];
  const payReasons = payUnsettled ? kept : [];
  // ROADMAP 97.70 — Andrew, 2026-10-17: a wrong-figure card payment still noted
  // on a job that is now PAID (the detailer marked it paid by hand, which leaves
  // the note as it was) is flagged as a POSSIBLE refund. Only the detailer knows
  // whether they kept it as part of what the customer paid, so the line says to
  // ignore it if they did. One the webhook already moved onto the refunds owed
  // (97.69) has its own line above and is not repeated.
  // ROADMAP 97.75 — Andrew, 2026-10-17: a WAIVED job flags it too (the card money
  // is still in their Stripe), ending "If you meant to keep it, ignore this."
  const waived = booking.payment_status === "waived";
  // ROADMAP 97.78: partly refunded in Stripe, the line names what is left, as 97.69's does.
  const partlyRefunded = (r) => refundedOf(r.intent) > 0;
  const maybeOwed = booking.payment_status === "waived" || booking.payment_status === "paid" ? kept.filter((r) => (r.kind === "amount" || r.kind === "currency")
    && !(r.intent && refundPayments.some((p) => p?.intent === r.intent))) : [];
  const payProblem = booking.payment_problem && (extrasOwed.length > 0 || owedBack.length > 0 || payReasons.length > 0 || maybeOwed.length > 0)
    ? booking.payment_problem : null;
  // ROADMAP 2.12. A request is answered here as well as on Today, because the
  // owner asked for the accept action on "the page the detailer uses their
  // bookings on" and this record IS that page at /job/:id.
  const waiting = booking.status === "pending";
  // ROADMAP 99.13 — the owner's per-person tick; the server refuses an answer without it.
  const mayAnswer = can("requests");
  const pay = payPill(booking);
  // A QUOTE ONLY MEANS ANYTHING WHILE THE BOOKING IS STILL PENDING, and the
  // guard is here rather than on each write for a reason: a declined request
  // and a customer cancellation both end the wait, and so will whatever path
  // gets added next. Clearing the columns in three places is three chances to
  // forget; asking about the status once is none. The columns stay behind as
  // the record of what was last offered, which is worth keeping.
  const quotedAmount = booking.quoted_at && booking.status === "pending"
    ? Number(booking.quoted_amount) : null;
  // ANSWER-DRIVEN (9.21): a press that loses the race in `respond-to-booking`
  // gets `success, duplicate: true` with the booking AS IT NOW STANDS — which
  // may be another device's decline, or the customer's cancel. Claiming
  // "Accepted. They've been emailed." over that would be the same lie as the
  // receipt's, so the notice is chosen from the booking the server sent back.
  const respond = (action) =>
    act(() => api.respondToBooking(business.id, booking.id, action), (answer) => {
      const now = answer?.booking;
      const landed = !answer?.duplicate || (action === "accept"
        ? now?.status === "confirmed"
        : now?.status === "cancelled" && !!now?.declined_at);
      // NOT WRAPPED IN `t()` — `act` does it for every caller.
      if (!landed) return "This booking was just changed on another device.";
      return action === "accept" ? "Accepted. They've been emailed." : "Declined. They've been emailed.";
    });

  return (
    <>
        {/* The date and time live in the container's own header, so they are
            not repeated here. */}
        <div className="row wrap" style={{ gap: 6 }}>
          {/* These read as raw enum values — lowercase here, title case on
              the card for the same booking. One vocabulary, one casing. */}
          <span className={`pill ${booking.status}`}>{t(STATUS_LABELS[booking.status] ?? booking.status)}</span>
          {/* ROADMAP 97.80: refunded in Stripe, the pill says so rather than "Paid". */}
          <span className={`pill ${pay}`} data-pay-pill>{t(PAY_LABELS[pay] ?? pay)}</span>
          {/* Roadmap 2.14 step 3. The same fact the request card carries, on
              the record you open from it — a plan booking's price is the
              member's, and the one thing that explains it is its name. A
              `tag`, not a `pill`: status and payment are states this job is
              IN, and the plan is a fact about it. */}
          {booking.plan?.name && <span className="tag">Plan · {booking.plan.name}</span>}
        </div>

        {/* THE ACTION BAR — first, unheaded, and PINNED. Two rows of three:
            the driveway row (where you are standing) over the desk row (what
            you do about it afterwards). It carries the error and notice boxes
            because they answer its own buttons and a message that scrolls out
            of a sticky bar is a message nobody reads.
            The label ceiling here is ~9 characters / ~60px of text, measured
            at 320 in step 4 §3 — which is what "Navigate" already is. */}
        <div className="jobbar">
          {error && <div className="error-box" role="alert">{error}</div>}
          {notice && <div className="ok-box" role="status">{notice}</div>}
          {/* ROADMAP 14.4. IT SITS IN THE PINNED BAR, above the buttons and
              under the two status pills, because it is the one thing about
              this job that still needs doing and the bar is the part of the
              record that does not scroll away. `--bad` is the fixed red and
              does not follow the tenant's colour (law 11b) — the same call
              the bounced-address line on the client record makes: this is
              meaning, not identity.
              IT NAMES THE ACTION. "Paid" on its own is a label; "refund it
              from your own Stripe" is the thing to go and do, and the reason
              it is theirs to do is in the sentence rather than left implied. */}
          {refundOwed && (
            <div className="error-box" role="status" data-refund-cancelled="" style={{ color: "var(--bad)" }}>
              {ownRefund && ownLeftCents > 0
                ? t("This was paid. You refunded {refunded} in your Stripe, and {left} is not refunded yet. Refund the rest from your own Stripe. The money went straight into your account, so we cannot send it back for you.", {
                  refunded: money(refundedOf(booking.stripe_payment_intent) / 100),
                  left: money(ownLeftCents / 100),
                })
                : refundAmount
                ? t("This was paid. Refund {amount} from your own Stripe. The money went straight into your account, so we cannot send it back for you.", { amount: refundAmount })
                : t("Part of this was paid. Refund what they paid from your own Stripe. The money went straight into your account, so we cannot send it back for you.")}
            </div>
          )}
          {/* ROADMAP 97.10 — same place and red as the refund line: it names
              something to go and do, in their own Stripe account. */}
          {payProblem && (
            <div className="error-box" role="status" data-payment-problem={payProblem.kind} style={{ color: "var(--bad)" }}>
              {payReasons.map((r, i) => <div key={i} data-payment-reason={r.kind}>{r.kind === "failed"
                ? t("A bank payment of {paid} did not go through, so this job is not paid. Check the payment in your Stripe account.", {
                  paid: money(Number(r.paid_cents) / 100),
                })
                : r.kind === "currency"
                ? t("A card payment came in, but not in US dollars. We did not mark this job paid. Check the payment in your Stripe account.")
                : t("A card payment of {paid} came in, but this job is owed {owed}. We did not mark it paid. Check the payment in your Stripe account.", {
                  paid: money(Number(r.paid_cents) / 100),
                  owed: money(Number(r.owed_cents) / 100),
                })}</div>)}
              {owedBack.map((p, i) => <div key={`owed-${i}`} data-refund-owed={p.reason}>{p.reason === "currency"
                ? (refundedOf(p.intent) > 0
                  ? t("A card payment that was not in US dollars came in, and this job has since been paid. Part of it is not refunded yet. Refund the rest from your own Stripe. The money went straight into your account, so we cannot send it back for you.")
                  : t("A card payment that was not in US dollars came in, and this job has since been paid. Refund it from your own Stripe. The money went straight into your account, so we cannot send it back for you."))
                : refundedOf(p.intent) > 0
                ? t("A card payment of {paid} did not match what this job was owed, and the job has since been paid. You refunded part of it, and {left} is not refunded yet. Refund the rest from your own Stripe. The money went straight into your account, so we cannot send it back for you.", {
                  paid: money(Number(p.paid_cents) / 100),
                  left: money(leftCents(p) / 100),
                })
                : t("A card payment of {paid} did not match what this job was owed, and the job has since been paid. Refund it from your own Stripe. The money went straight into your account, so we cannot send it back for you.", {
                  paid: money(Number(p.paid_cents) / 100),
                })}</div>)}
              {maybeOwed.map((r, i) => <div key={`maybe-${i}`} data-refund-maybe={r.kind}>{partlyRefunded(r)
                ? (waived
                  ? (r.kind === "currency"
                    ? t("A card payment that was not in US dollars came in, and the job has since been waived. Part of it is not refunded yet. Refund the rest from your own Stripe. If you meant to keep it, ignore this.")
                    : t("A card payment of {paid} did not match what this job was owed, and the job has since been waived. You refunded part of it, and {left} is not refunded yet. Refund the rest from your own Stripe. If you meant to keep it, ignore this.", {
                      paid: money(Number(r.paid_cents) / 100),
                      left: money((Number(r.paid_cents) - refundedOf(r.intent)) / 100),
                    }))
                  : r.kind === "currency"
                  ? t("A card payment that was not in US dollars came in, and the job has since been marked paid. Part of it is not refunded yet. If they paid you in full another way, refund the rest from your own Stripe. If you kept this payment as part of what they paid, ignore this.")
                  : t("A card payment of {paid} did not match what this job was owed, and the job has since been marked paid. You refunded part of it, and {left} is not refunded yet. If they paid you in full another way, refund the rest from your own Stripe. If you kept this payment as part of what they paid, ignore this.", {
                    paid: money(Number(r.paid_cents) / 100),
                    left: money((Number(r.paid_cents) - refundedOf(r.intent)) / 100),
                  }))
                : waived
                ? (r.kind === "currency"
                  ? t("A card payment that was not in US dollars came in, and the job has since been waived. Refund it from your own Stripe. If you meant to keep it, ignore this.")
                  : t("A card payment of {paid} did not match what this job was owed, and the job has since been waived. Refund it from your own Stripe. If you meant to keep it, ignore this.", {
                    paid: money(Number(r.paid_cents) / 100),
                  }))
                : r.kind === "currency"
                ? t("A card payment that was not in US dollars came in, and the job has since been marked paid. If they paid you in full another way, refund it from your own Stripe. If you kept this payment as part of what they paid, ignore this.")
                : t("A card payment of {paid} did not match what this job was owed, and the job has since been marked paid. If they paid you in full another way, refund it from your own Stripe. If you kept this payment as part of what they paid, ignore this.", {
                  paid: money(Number(r.paid_cents) / 100),
                })}</div>)}
              {extrasOwed.map((p, i) => <div key={`refund-${i}`} data-refund-owed="">
                {refundedOf(p.intent) > 0
                  ? t("Another payment came in after this job was settled, and {left} of it is not refunded yet. Refund it from your own Stripe. The money went straight into your account, so we cannot send it back for you.", {
                    left: money(leftCents(p) / 100),
                  })
                  : t("Another payment of {paid} came in after this job was settled. Refund it from your own Stripe. The money went straight into your account, so we cannot send it back for you.", {
                    paid: money(Number(p.paid_cents) / 100),
                  })}
              </div>)}
            </div>
          )}
          {/* ROADMAP 3.4f S1 — an email about this job did not arrive. Same
              place and same red as the refund line, for the same reason: it
              names something to do, and the Text button is right under it. */}
          {mailWarning && (
            <div className="error-box" role="status" data-mail-warning={lastMail.status} style={{ color: "var(--bad)" }}>
              {t(mailWarning, { to: booking.customer_email })}
            </div>
          )}
          <div className="actions-row">
            <a className="btn sm" href={`tel:${booking.customer_phone}`}>
              <Phone size={18} strokeWidth={2} /> {t("Call")}
            </a>
            <button className="btn sm" onClick={openTextPicker}>
              <MessageSquare size={18} strokeWidth={2} /> {t("Text")}
            </button>
            {/* ONE TAP, AND ONLY WHERE IT MEANS SOMETHING. A drop-off job is
                the customer coming to the detailer, so "I'm on my way" is the
                wrong sentence and the button is not drawn — the same test the
                Navigate button beside it already makes about an address. */}
            {onMyWay && booking.service_type === "mobile" && booking.customer_phone && (
              <a className="btn sm" data-on-my-way="" href={smsHref(filled(onMyWay.body))}>
                <Navigation size={18} strokeWidth={2} /> {t("On my way")}
              </a>
            )}
            {address && (
              <a className="btn sm" href={mapsUrl(address)} target="_blank" rel="noreferrer">
                <Navigation size={18} strokeWidth={2} /> {t("Navigate")}
              </a>
            )}
          </div>
          <div className="actions-row">
            {/* ROADMAP 14.2 — A BUTTON RATHER THAN A LINK, and it had to
                become one: the owner's .ics carries the customer's phone, so
                the server now requires the owner's session for it, and an
                `<a href>` cannot send one. Google Calendar takes its event in
                the URL and never touches our server, so that branch still
                just opens a window — same button, same 44px, same place.
                Matches the `<button className="btn sm">` beside it. */}
            <button
              className="btn sm"
              onClick={() => {
                // `null` for the file URL because there is no longer a URL
                // the owner's file can be reached at — only a fetch. So a
                // non-Google preference comes back null and falls through to
                // the download, and the choice still lives in one function.
                const url = calendarUrlFor(
                  { ...booking, service_name: (booking.services ?? [])[0]?.name_at_booking },
                  null,
                );
                if (url) window.open(url, "_blank", "noreferrer");
                else downloadOwnerIcs(booking.id).catch(() => setError(t("Could not build the calendar file.")));
              }}
            >
              <CalendarPlus size={18} strokeWidth={2} /> {t("Calendar")}
            </button>
            {loadPrefs().contacts !== "off" && booking.customer_phone && (
              <button
                className="btn sm"
                onClick={() => saveContact({
                  name: booking.customer_name,
                  phone: booking.customer_phone,
                  email: booking.customer_email,
                  address: booking.customer_address,
                })}
              >
                <UserPlus size={18} strokeWidth={2} /> {t("Contacts")}
              </button>
            )}
            {/* "Reminder", not "Remind them": 47px of text wraps the button
                onto two lines at 320 and 59px does not. Step 4 §3. */}
            {/* NOT WHILE IT IS A REQUEST. "Your appointment is coming up" to
                somebody whose request has not been accepted is the automatic
                sweep's bug wearing a button — the migration took `pending` out
                of all four reminder RPCs, and this is the same send by hand.
                `send-owner-reminders` refuses it too; this is so the button is
                not there to press. */}
            {booking.customer_email && !waiting && (
              <button className="btn sm" disabled={busy}
                onClick={() => act(() => api.sendReminder(business.id, booking.id, "customer"),
                  // FIXED NOTICE, CANNOT BE CONTRADICTED (9.21): the
                  // one-booking path of `send-owner-reminders` answers
                  // `{ success, count: 1 }` or an error — never a partial send.
                  "Reminder sent to customer.", false)}>
                <Bell size={18} strokeWidth={2} /> {t("Reminder")}
              </button>
            )}
          </div>
        </div>

        {!editing ? (
          <>
            <h3 className="section-title">{t("The job")}</h3>
            <div className="card tight">
              <p>{t(booking.service_type === "mobile" ? "Mobile" : "Drop-off")}</p>
              {address && <p className="quiet">{address}</p>}
              {/* ROADMAP 2.8 — **DIRECTLY UNDER THE ADDRESS AND ABOVE THE
                  NAVIGATE BUTTON**, which is the point: this record is what a
                  detailer reads on the morning they drive out, and the
                  Navigate button hands this string straight to a maps app.
                  Measured 2026-09-20 — a made-up address arrived here looking
                  exactly like a verified one.
                  Only when the customer TYPED it and the lookup found nothing.
                  A picked suggestion says nothing; so does `null`, which is
                  every booking made before this shipped and every drop-off
                  job, because nobody recorded it and a reassurance we cannot
                  support is the same lie the other way round.
                  **IT IS NOT A WARNING ABOUT THE CUSTOMER.** Andrew's ruling:
                  a new build the lookup has never heard of is a real booking
                  he wants, and a detailer who can SEE it was typed by hand
                  picks up the phone instead of driving. */}
              {booking.service_type === "mobile" && booking.address_source === "typed" && (
                <p className="quiet">
                  {t("Typed by hand. The address lookup found no match for it.")}
                </p>
              )}
              {/* ROADMAP 2.3 — A CRUDE, HONEST FLAG, NOT DISTANCE AND NOT A
                  GATE. The customer's picked travel zone and this address are
                  two independent fields with nothing checking one against the
                  other; this says only that the zone's own name never turned
                  up anywhere in the address text — "San Diego" typed under a
                  zone named "Long Beach", for instance. It does NOT mean the
                  address is far: a real Long Beach street on the far side of
                  town from the shop reads as a match and says nothing here.
                  Same shape as the row above it — a fact for the detailer to
                  weigh before driving out, never a reason this booking was
                  refused or repriced. */}
              {booking.service_type === "mobile" && booking.travel_zone_address_mismatch && (
                <p className="quiet">
                  {t("This address doesn't mention the travel area they picked. Worth a quick check before you drive out.")}
                </p>
              )}
              {/* THE SKY OVER THIS ADDRESS ON THIS DAY, directly under the
                  address it is about — Andrew, 2026-09-13. The record is where
                  EVERY warning shows rather than only the most serious one: a
                  row is scanned and this is read. */}
              <JobWeather period={jobWeather.get(booking.id)} prefs={weatherRules} busy={weatherBusy} full />
              <p className="muted">
                {(booking.services ?? []).map((s) => s.name_at_booking).join(", ")}
                {(booking.booking_add_ons ?? []).length > 0 &&
                  ` + ${(booking.booking_add_ons ?? []).map((a) => a.add_on?.name).filter(Boolean).join(", ")}`}
              </p>
              {/* ROADMAP 8.10 — THE COUNT LEADS, AND THE CARS FOLLOW IT.
                  It read the other way round on the first look — the first
                  car, then "3 vehicles", then the rest — and the heading
                  landed in the middle of its own list, so it seemed to be
                  about the two lines under it. The count is the fact that
                  decides what leaves the yard and a detailer must never have
                  to work it out off a price breakdown; their money is already
                  itemised in `price_adjustments`, so these lines are what the
                  cars ARE. */}
              {(booking.vehicles ?? []).length > 0 && (
                <p className="muted">{t("{count} vehicles", { count: (booking.vehicles ?? []).length + 1 })}</p>
              )}
              <p className="muted">
                {sizeLabel(booking)}
                {booking.vehicle_year ? ` · ${booking.vehicle_year}` : ""}
                {booking.vehicle_model ? ` · ${booking.vehicle_model}` : ""}
                {CONDITION_LABELS[booking.vehicle_condition]
                  ? ` · ${t(CONDITION_LABELS[booking.vehicle_condition])}` : ""}
              </p>
              {/* **`sizeLabel(v)`, NOT `v.vehicle_size_label` — Andrew, live, on a
                  Spanish job record: "Chico · Ford F-150" on the first line and
                  "Medium · Subaru Forester" and a bare "Small" under it.** The
                  first vehicle goes through `sizeLabel`, which translates one of
                  the three known keys and leaves a detailer's own renamed label
                  alone; these printed the stored column raw, so every extra car
                  on a Spanish screen was in English — and a row whose label was
                  never set printed nothing at all. One function, both places.
                  `vehicle_size` joins `BOOKING_SELECT` in the same edit, because
                  `sizeLabel` has nothing to translate without it. */}
              {[...(booking.vehicles ?? [])]
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((v) => (
                  <p className="muted" key={v.position}>
                    {sizeLabel(v)}
                    {v.vehicle_model ? ` · ${v.vehicle_model}` : ""}
                  </p>
                ))}
              {/* W22 — what they can supply at the address, and only for a
                  mobile job. Written as what you have to BRING, because that
                  is the decision this answer feeds. */}
              {booking.service_type === "mobile" && (booking.has_water === false || booking.has_power === false) && (
                <p className="muted">
                  {booking.has_water === false && booking.has_power === false
                    ? t("Bring your own water and power")
                    : booking.has_water === false
                      ? t("Bring your own water")
                      : t("Bring your own power")}
                </p>
              )}
              {/* ROADMAP 8.19 — THE MILEAGE, AND IT IS IN *THE JOB* RATHER THAN
                  *THE MONEY*, WHICH IS WHERE THE FIRST VERSION PUT IT. Seen by
                  looking at the record: it printed directly under "Quoted
                  $65.00", one line below a figure, in a card headed with the
                  word money. **The item's own rule says a number beside a
                  total is a number somebody will eventually expect to be IN
                  the total, and this one never is** — the modal already obeys
                  it and the record did not. The drive is a fact about the job,
                  beside the address it was made to.

                  **`!= null` RATHER THAN TRUTHY, because 0 is a real answer** —
                  a drop-off at the detailer's own unit — and
                  `{booking.miles && …}` would silently hide exactly that row
                  while printing every other one. The word "deduction" is not
                  here: it is a fact this product records, not tax advice it
                  gives. */}
              {booking.miles != null && (
                <p className="muted">{t("Miles driven:")} <span className="num">{booking.miles}</span></p>
              )}
            </div>

            <h3 className="section-title">{t("The money")}</h3>
            <div className="card tight">
              <p className="body">
                {charged == null
                  /* ROADMAP 2.12 — "Quoted" now means something specific in
                     this product: a price the DETAILER offered. On a request
                     this line is the price the CUSTOMER was shown, so the two
                     senses sat one line apart saying opposite things. Seen in
                     the first screenshot of a request record. */
                  ? <>{waiting ? t("They asked for") : t("Quoted")}{" "}<span className="num">{money(quoted)}</span></>
                  : diff === 0
                    ? <>{t("Charged")} <span className="num">{money(charged)}</span></>
                    : <>
                        {t("Quoted")} <span className="num">{money(quoted)}</span> {t("· charged")} <strong className="num">{money(charged)}</strong>{" "}
                        ({diff > 0
                          ? t("+{amount} added on site", { amount: money(diff) })
                          : t("{amount} taken off", { amount: money(-diff) })})
                      </>}
              </p>
              {/* ROADMAP 2.12 — A QUOTE IS NOT A PRICE UNTIL THEY SAY YES, and
                  this line is the whole reason `quoted_amount` is its own
                  column. Two numbers are on the record while a quote is out,
                  and only one of them is what the job costs. */}
              {quotedAmount !== null && (
                <p className="body">
                  {t("Quote sent for")} <strong className="num">{money(quotedAmount)}</strong> {t("· not charged until they accept it.")}
                </p>
              )}
              {/* Written by Finalize payment and, until now, printed nowhere. */}
              {booking.payment_notes && <p className="quiet">How they paid: {booking.payment_notes}</p>}
              {/* ROADMAP 14.4 — paid online, and the money screen already
                  knows. The record has to say it too, or the detailer's only
                  way to find out a customer paid by card is that the job
                  stopped appearing on a list. */}
              {booking.paid_online_at && (
                <p className="quiet">
                  {t("Paid by card on {date}", { date: dateLong(localDate(booking.paid_online_at, business.timezone), getAppLocale()) })}
                </p>
              )}
              {/* ROADMAP 97.68 — the job's own card payment, refunded in the detailer's Stripe. */}
              {ownRefund && refundedOf(booking.stripe_payment_intent) > 0 && (
                <p className="quiet" data-own-refund="">
                  {t("Refunded {amount} in your Stripe on {date}", {
                    amount: money(refundedOf(booking.stripe_payment_intent) / 100),
                    date: dateLong(localDate(ownRefund.at, business.timezone), getAppLocale()),
                  })}
                </p>
              )}
              {canFinalize && (
                <button className="btn primary" style={{ marginTop: "var(--sp-1)" }} disabled={busy}
                  onClick={() => setFinalizing(true)}>
                  <CreditCard size={18} strokeWidth={2} /> {t("Finalize payment")}
                </button>
              )}
            </div>

            {/* ── ROADMAP 4.7 — CORRECTING WHAT WAS RECORDED ─────────────────
                THE DESTRUCTIVE-ACTION PATTERN, COPIED FROM THE DELETE BLOCK AT
                THE FOOT OF THIS SAME RECORD RATHER THAN DESIGNED AGAIN:
                `docs/screen-rules.md` names that block as the reference and
                asks for three things, and the item's done-when asks for the
                pattern by name. All three are here. A FOLD, so the rare and
                consequential thing takes a deliberate press to reach, which is
                also the honest shape for it: a correction is a thing a detailer
                does once in a hundred jobs, and an open segmented control
                offering to move the money on every finished job would be four
                mis-taps waiting on a screen that currently has none. COPY THAT
                SAYS WHAT EACH DIRECTION DOES, because the whole fault is that
                two of the four are quiet. And `.btn.danger` ON THE TWO THAT
                CAN LOSE MONEY AND NOT THE OTHER TWO — the same distinction the
                rules draw when they say "Didn't show up" and "Cancel the job"
                deliberately do NOT take `--bad`.

                A HEADING THAT NAMES THE ACTION, and a SUMMARY PHRASED AS THE
                SUBJECT — the two things the rules say that same delete block
                gets wrong and a copy of it should not. "The money" above is a
                noun and cannot do the heading's job.

                ONE CONTROL AND ONE BUTTON, not four buttons. Four mutually
                exclusive states is a `Segmented` by law (`design-system.md`
                § Composition), the sheet that SET this value uses one, and the
                pick-then-confirm shape means the question can name both sides
                of the change in one sentence.

                **AND PICKING THE STATE IT IS ALREADY IN OFFERS NOTHING**,
                which is the refusal this screen owes: `payWant` falls back to
                the row, so the answer appears only once the pick has actually
                moved. Nothing can write a no-op, and nothing can file an audit
                row that says a payment changed from paid to paid. */}
            {canCorrectPayment && (
              <>
                <h3 className="section-title">{t("Correct how it was paid")}</h3>
                <details className="disclose">
                  <summary>{t("Changing what you recorded")}</summary>
                  <p className="quiet" style={{ margin: "0 0 10px" }}>
                    {t("Unpaid and Part paid put the job back on your chase list. Paid takes it off and counts the money as collected. Waived takes it off as well, and the job still shows in what the customer owes. The job stays finished and its charges are not touched.")}
                  </p>
                  {/* **TWO THINGS LOOKED SELECTED AND THEY SAID DIFFERENT
                      STATES — Andrew, live at 1440.** The pill at the top of
                      the record is the STORED payment, drawn in the accent on
                      an accent-tinted ground; the segment is the PICK, drawn
                      lit white on `--surface-lit`. Choose Waived on a job that
                      is Paid and the screen carries two confident, contradictory
                      answers, each looking like the state.
                      **The pill is the truth and keeps its weight. The pick is
                      a PROPOSAL until it is pressed, so while the two differ it
                      is drawn as a ring instead of a fill** — present, obviously
                      chosen, and visibly not yet a fact. The moment it matches
                      the stored state again the class drops and the ordinary
                      segmented look returns, so nothing about the shared control
                      changes anywhere else in the product. */}
                  <div className={payWant !== booking.payment_status ? "pay-pending" : undefined}>
                    <Segmented
                      value={payWant}
                      onChange={setPayPick}
                      disabled={busy}
                      label={t("Correct how it was paid")}
                      options={PAY_CHOICES}
                    />
                  </div>
                  {payWant !== booking.payment_status && (
                    <div style={{ marginTop: "var(--sp-2)" }}>
                      <ConfirmTap
                        className={payLosesMoney ? "btn danger" : "btn"}
                        confirmClassName={payLosesMoney ? "btn danger" : "btn primary"}
                        disabled={busy}
                        label={t("Change it to {to}", { to: t(PAY_LABELS[payWant]) })}
                        question={t("Change {job} from {from} to {to}?", {
                          job,
                          from: t(PAY_LABELS[booking.payment_status] ?? booking.payment_status),
                          to: t(PAY_LABELS[payWant]),
                        })}
                        confirmLabel={t("Yes, change it")}
                        // NOT ConfirmTap's default "Not yet": that is the word on one of
                        // the four choices this very control offers, and a refusal button
                        // sharing its label with a destination is a question a person can
                        // answer wrongly by reading it carefully.
                        cancelLabel={t("Leave it")}
                        onConfirm={correctPayment}
                      />
                    </div>
                  )}
                </details>
              </>
            )}

            {/* ── ROADMAP 5.3 — THE RECEIPT, WHERE THE JOB IS ───────────────
                The audit asked whether receipts and invoices are findable and
                the answer, measured on 2026-09-18, was no. A job paid by card
                is marked paid by Stripe's webhook, which stamps the row and
                SENDS NOTHING — so there was no receipt anywhere, and the one
                button that would make one was hidden behind `canFinalize`: a
                customer who paid from their own link before the detailer
                finalized got a record offering **Finalize payment** and no way
                at all to send them what they had just bought.

                So the three answers a detailer needs about a receipt are in
                one place now: the page the customer sees, the button that
                sends it, and what happened to the last one that went.

                IT IS ITS OWN SECTION AND NOT PART OF THE MONEY BLOCK. The
                money block answers "what does this job cost"; this one answers
                "what does the customer have in their inbox", and the record's
                own design note says two questions in one box leaves somebody
                working out which one the buttons belong to. */}
            {charged != null && (
              <>
                <h3 className="section-title">{t("Receipt")}</h3>
                <div className="card tight">
                  {/* ── THREE ACTIONS, THREE WEIGHTS — design-system.md §
                      Composition. Filled is **Finalize payment** in the block
                      above, which is still the thing this job wants next; this
                      send is RINGED and the link to the document is RINGLESS.
                      They were both filled to begin with, which put two loud
                      blue bars one under the other on a phone with nothing
                      saying which came first — seen at 392 and fixed. */}
                  {booking.customer_email ? (
                    <>
                      <button className="btn" disabled={busy}
                        onClick={() => act(sendReceipt,
                          // ANSWER-DRIVEN (9.21): `send-invoice` sends the
                          // thank-you best-effort (or not at all, when follow-ups
                          // are off) and says which in `thank_you_sent` — on a
                          // fresh send AND on a `duplicate`. Only a `true` earns
                          // the word. "again" names no thank-you, so it stands.
                          (answer) => sentReceipt ? "Receipt sent again."
                            : answer?.thank_you_sent ? "Receipt + thank-you sent."
                              : "Receipt sent. The thank-you email did not go out.",
                          false)
                          .then(loadMail)}>
                        <Receipt size={18} strokeWidth={2} />{" "}
                        {sentReceipt ? t("Email it again") : t("Email the receipt")}
                      </button>
                      {/* THE ADDRESS UNDER THE BUTTON THAT USES IT. A detailer
                          about to send a receipt is entitled to see where it
                          is going before they press, not after. */}
                      <p className="quiet">{t("It goes to")} {booking.customer_email}</p>
                      {/* THE DOCUMENT ITSELF, and the owner had no link to it
                          anywhere in the product. It is the page their customer
                          opens from the email — the same URL the reminder text
                          already fills in as {bookingLink}. */}
                      <a className="btn ghost" href={receiptHref} target="_blank" rel="noreferrer">
                        <ExternalLink size={18} strokeWidth={2} /> {t("Open the customer's receipt page")}
                      </a>
                      {/* WHAT WAS SENT, WHEN, AND WHETHER IT ARRIVED —
                          ROADMAP 5.3's own done-when, answered here rather
                          than on a different screen. The rows are every email
                          that went to THIS ADDRESS, which is a stronger match
                          than the customer record: `send-email` files a row
                          against a customer only when the address matches one,
                          so a job booked with a second address has mail the
                          client record never shows. */}
                      <div className="tight" style={{ marginTop: "var(--sp-1)" }}>
                        <span className="label">{t("Emails to this address")}</span>
                        <EmailTrail rows={mail} timezone={business.timezone} cap={MAIL_CAP}
                          error={mailErr} empty="Nothing has been emailed to this address yet." />
                      </div>
                    </>
                  ) : (
                    /* NAMED, NOT ABSENT. A missing button with no sentence
                       beside it reads as a product that forgot, and the
                       detailer cannot tell that the fix is in their hands. */
                    <>
                      <a className="btn" href={receiptHref} target="_blank" rel="noreferrer">
                        <ExternalLink size={18} strokeWidth={2} /> {t("Open the customer's receipt page")}
                      </a>
                      <p className="quiet">
                        {t("No email address on this job, so the receipt cannot be emailed. Add one with Edit above.")}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            {/* PHOTOS SIT ABOVE THE NOTES AND BELOW THE MONEY, which is the
                order a job is read in: what it costs, what it looked like,
                what was said about it. `docs/detailer-dashboard-audit-
                2026-09-06.md` §3.1. */}
            <JobPhotos booking={booking} />

            {(booking.customer_notes || booking.admin_notes) && (
              <>
                <h3 className="section-title">{t("Notes")}</h3>
                <div className="card tight">
                  {booking.customer_notes && <p><span className="muted">{t("Customer:")}</span> {booking.customer_notes}</p>}
                  {booking.admin_notes && <p><span className="muted">{t("Private:")}</span> {booking.admin_notes}</p>}
                </div>
              </>
            )}

            {/* Three or more actions take three weights — filled, ringed,
                ringless (design-system.md § Composition). These were a 2x2
                grid of identical buttons, which weighted cancelling a job the
                same as correcting one. At most ONE accent fill is ever on this
                screen: Mark completed only exists while the job is not
                completed, and Finalize payment only once it is. */}
            <h3 className="section-title">{waiting ? t("Your answer") : t("What happened")}</h3>
            <div className="stack" style={{ gap: 8 }}>
              {waiting && !mayAnswer ? (
                <p className="quiet" style={{ margin: 0 }}>{t("Someone who can answer requests will reply to this one.")}</p>
              ) : waiting ? (
                /* Three weights, and the same order as the card on Today so
                   the two cannot teach different habits. Marking a job the
                   customer has not been accepted onto as COMPLETE is not one
                   of the choices, which is why this branch replaces the other
                   rather than adding to it. */
                <>
                  <button className="btn primary" disabled={busy} onClick={() => respond("accept")}>
                    <Check size={18} strokeWidth={2} /> {t("Accept")}
                  </button>
                  <button className="btn" disabled={busy} onClick={() => setQuoting(true)}>
                    <MessageSquareQuote size={18} strokeWidth={2} />
                    {" "}{quotedAmount === null ? t("Send a quote") : t("Send a new quote")}
                  </button>
                  {/* **ROADMAP 4.1 - A DECLINE *IS* A CANCELLATION, WHICH IS WHY IT
                      ASKS NOW.** `respond-to-booking` writes `status: "cancelled"`
                      plus `declined_at` and emails the customer, so one touch of this
                      made the same two things happen as "Cancel the job" in the branch
                      below - which has asked since 2026-10-06 - while this one did not.
                      The sweep that gated the other four read the seven actions as
                      seven BUTTONS and filed this one as "adjacent"; it is the same
                      state change under a different label, and it was the last ungated
                      path to it. The comment under `cancelled` below says so in the
                      product's own words: "a decline is stored as a cancellation".
                      Same question shape as the cancellation, email clause included,
                      because `respond-to-booking` sends only when the booking carries
                      an address - the same condition `update-booking` uses. */}
                  <ConfirmTap
                    className="btn ghost"
                    disabled={busy}
                    icon={<X size={18} strokeWidth={2} />}
                    label={t("Decline")}
                    question={booking.customer_email
                      ? t("Decline {job}? The customer is emailed.", { job })
                      : t("Decline {job}?", { job })}
                    // 4.1a: ringed, not the accent fill - the card already has one accent button.
                    confirmClassName="btn"
                    confirmLabel={t("Yes, decline it")}
                    onConfirm={() => respond("decline")}
                  />
                </>
              ) : cancelled ? (
                <>
                  {/* THE ONE THING `declined_at` IS FOR. A decline is stored as
                      a cancellation so the slot frees and every existing filter
                      is right about it — which leaves "Cancelled" saying the
                      customer backed out when in fact the detailer said no. A
                      column nothing prints is a column nobody can trust. */}
                  {/* ROADMAP 97.24 — A DECLINED REQUEST IS TAKEN BACK BY ACCEPTING
                      IT, not by "Un-cancel": `update-booking` refuses that now,
                      and `respond-to-booking` clears `declined_at` and sends the
                      "You're confirmed" email. A plain cancellation's way back
                      emails the customer too, so it asks like "Cancel the job". */}
                  {booking.declined_at ? (
                    <>
                      <p className="quiet" style={{ margin: 0 }}>{t("You declined this request.")}</p>
                      {mayAnswer && <button className="btn" disabled={busy} onClick={() => respond("accept")}>
                        <Check size={18} strokeWidth={2} /> {t("Accept it after all")}
                      </button>}
                    </>
                  ) : (
                    <ConfirmTap
                      className="btn"
                      disabled={busy}
                      label={t("Un-cancel")}
                      question={booking.customer_email
                        ? t("Put {job} back on? The customer is emailed.", { job })
                        : t("Put {job} back on?", { job })}
                      confirmClassName="btn"
                      confirmLabel={t("Yes, put it back on")}
                      onConfirm={() => setStatus("confirmed")}
                    />
                  )}
                </>
              ) : (
                <>
                  {/* ROADMAP 4.1 — asks once, naming the job, from the same
                      control the card on Today uses. */}
                  {booking.status !== "completed" && (
                    <ConfirmTap
                      className="btn primary"
                      disabled={busy}
                      icon={<CheckCircle2 size={18} strokeWidth={2} />}
                      label={t("Mark completed")}
                      question={jobDoneQuestion({
                        name: booking.customer_name,
                        service: (booking.services ?? []).map((sv) => sv.name_at_booking).filter(Boolean).join(" · "),
                        time: time12(booking.start_time),
                      })}
                      confirmLabel={t("Yes, it’s done")}
                      onConfirm={() => setStatus("completed")}
                    />
                  )}
                  {/* **THE UNDO, AND IT NEEDED NO SERVER CHANGE.** `status` is
                      an ordinary editable field on `update-booking` with no
                      transition guard, and "Un-cancel" three lines up has
                      been writing `confirmed` through it all along — so the
                      way back existed everywhere except on the screen.
                      Worded as the correction it is, not as an undo button
                      floating free of what it undoes. It stays for as long as
                      the job is completed rather than vanishing after a few
                      seconds: a detailer who taps this by accident in a
                      driveway finds out at the end of the day. */}
                  {booking.status === "completed" && (
                    <button className="btn" disabled={busy} onClick={() => setStatus("confirmed")}>
                      {t("Not completed after all")}
                    </button>
                  )}
                  {booking.status !== "no_show" && (
                    <ConfirmTap
                      disabled={busy}
                      label={t("Didn’t show up")}
                      question={t("Mark {job} as a no-show?", { job })}
                      confirmLabel={t("Yes, they didn’t show")}
                      onConfirm={() => setStatus("no_show")}
                    />
                  )}
                  {/* ROADMAP 4.1, RULING 3 — THE WAY BACK FROM A NO-SHOW. `no_show`
                      had the only status button in this row with no undo: the
                      button above vanishes once it is set, "Mark completed"
                      moves the job FORWARD, and nothing wrote it back to
                      `confirmed`. Same shape and same write as "Un-cancel" and
                      "Not completed after all": `status` is an ordinary field
                      on `update-booking` with no transition guard, so this
                      needs no server change. Not behind a confirmation, for
                      the reason the ruling gives for the button above: it
                      undoes an outcome, it does not cause one. */}
                  {booking.status === "no_show" && (
                    <button className="btn" disabled={busy} onClick={() => setStatus("confirmed")}>
                      {t("Showed up after all")}
                    </button>
                  )}
                  {/* ROADMAP 4.1 — THE ONE THAT SENDS AN EMAIL, so the question
                      says so. "Un-cancel" is the way back; the email already
                      sent is not.
                      **AND IT ONLY SAYS SO WHEN IT IS TRUE — 2026-10-07.** The sentence
                      claimed an email on every cancellation, and `update-booking` sends
                      one only when the booking carries an address, so a phone-only
                      customer's job was called off under a promise nothing kept. The
                      screen holds the answer, so the sentence asks it. */}
                  <ConfirmTap
                    className="btn ghost"
                    disabled={busy}
                    label={t("Cancel the job")}
                    question={booking.customer_email
                      ? t("Cancel {job}? The customer is emailed.", { job })
                      : t("Cancel {job}?", { job })}
                    confirmLabel={t("Yes, cancel it")}
                    onConfirm={() => setStatus("cancelled")}
                  />
                </>
              )}
            </div>

            <h3 className="section-title">{t("Change the time or details")}</h3>
            <button className="btn" disabled={busy} onClick={() => setEditing(true)}>{t("Edit")}</button>

            {/* Delete used to be the biggest, reddest thing in the sheet —
                the rarest action given the most weight, sitting beside two
                others with no stated difference. Cancelling is what a
                detailer nearly always means, so deleting hides behind it
                and says what it does that cancelling doesn't. */}
            {/* 99.13: removing a request is declining it without a word, so it rides the same tick. */}
            {!(waiting && !mayAnswer) && <details className="disclose">
              {/* **PHRASED AS THE SUBJECT, NOT AS A COMMAND — 2026-09-12.** It
                  read "Remove this from my records too", which looks like a
                  button that DOES the thing rather than a fold that reveals
                  it. Somebody expecting it to act presses it, finds a drawer,
                  and presses whatever is inside — past the sentence that is
                  the entire point of the fold. The button inside should be
                  the only thing on this block that reads like an action. */}
              <summary>{t("Removing it from your records")}</summary>
              <p className="quiet" style={{ margin: "0 0 10px" }}>
                {t("Canceling frees the slot and keeps the job in your history. Removing takes it out of your records and your totals as well. You cannot undo it yourself, but support can bring the job back.")}
              </p>
              {/* The fold says what removing does; this names WHICH record, in
                  place of the browser's own unnamed confirm box. */}
              <ConfirmTap
                className="btn danger"
                confirmClassName="btn danger"
                disabled={busy}
                label={t("Remove from records")}
                question={t("Remove {job} from your records?", { job })}
                confirmLabel={t("Yes, remove it")}
                onConfirm={softDelete}
              />
            </details>}
          </>
        ) : (
          <>
            <h3 className="section-title">{t("Change the time or details")}</h3>
            <label className="field"><span>{t("Name")}</span>
              <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
            <label className="field"><span>{t("Phone")}</span>
              <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: phoneAsTyped(e.target.value) })} /></label>
            <label className="field"><span>{t("Email")}</span>
              <input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></label>
            <label className="field"><span>{t("Address")}</span>
              <input value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} /></label>
            <div className="grid2">
              <label className="field"><span>{t("Date")}</span>
                <input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} /></label>
              <label className="field"><span>{t("Start")}</span>
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
            </div>
            <label className="field"><span>{t("Private notes")}</span>
              <textarea value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} /></label>
            <p className="muted" style={{ marginBottom: 8 }}>
              {t("Date/time changes are re-checked against your hours, blockouts and other jobs — a conflicting move is rejected, not silently saved.")}
            </p>
            <div className="grid2">
              <button className="btn" onClick={() => setEditing(false)}>{t("Back")}</button>
              <button className="btn primary" disabled={busy} onClick={saveEdit}>{t("Save")}</button>
            </div>
          </>
        )}

        {pickingText && (
          <Sheet onClose={() => setPickingText(false)} title={t("Send a text")} peek={48}>
            <div className="tight">
              {templatesLoaded && templates.length === 0 && (
                <p className="quiet">{t("No templates yet · the gear, then Message templates.")}</p>
              )}
              {templates.map((tpl) => (
                <a key={tpl.id} className="card tappable" href={smsHref(filled(tpl.body))}
                   style={{ display: "block", color: "inherit" }}>
                  {/* The five shipped NAMES follow the dashboard's language; the body is the detailer's own words. */}
                  <div className="strong">{templateLabel(tpl)}</div>
                  <div className="quiet" style={{ marginTop: "var(--sp-1)" }}>{filled(tpl.body)}</div>
                </a>
              ))}
              <a className="btn" href={`sms:${booking.customer_phone}`}>{t("Write my own")}</a>
            </div>
          </Sheet>
        )}

        {quoting && (
          <QuoteModal booking={booking} onClose={() => setQuoting(false)}
            onSent={() => { setQuoting(false); onChanged?.(); }} />
        )}

        {finalizing && (
          <FinalizeModal
            booking={booking}
            onClose={() => setFinalizing(false)}
            onDone={() => {
              setFinalizing(false);
              onChanged?.();
            }}
          />
        )}
    </>
  );
}
