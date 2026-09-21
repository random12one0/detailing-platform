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

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CalendarPlus, Check, CheckCircle2, CreditCard, ExternalLink, MessageSquare, MessageSquareQuote, Navigation, Phone, Receipt, UserPlus, X } from "lucide-react";
import { api, downloadOwnerIcs } from "../lib/api.js";
import { calendarUrlFor, loadPrefs, saveContact } from "../lib/platform.js";
import { supabase } from "../lib/supabase.js";
import { fillTemplate } from "../lib/templates.js";
import { dateLong, localDate, mapsUrl, money, phoneAsTyped, time12 } from "../lib/format.js";
import ConfirmTap, { jobDoneQuestion } from "./ConfirmTap.jsx";
import { useBusiness } from "../context/BusinessContext.jsx";
import JobPhotos from "./JobPhotos.jsx";
// ROADMAP 5.3 — the same mail rows the client record draws. One file, so the
// two screens cannot disagree about whether an email bounced.
import EmailTrail from "./EmailTrail.jsx";
import FinalizeModal from "./FinalizeModal.jsx";
import QuoteModal from "./QuoteModal.jsx";
import Sheet from "./Sheet.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { getAppLocale, t } from "../lib/appI18n.js";
import JobWeather from "./JobWeather.jsx";
import { useJobWeather } from "../hooks/useJobWeather.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

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
const PAY_LABELS = {
  paid: "Paid", pending: "Unpaid", partial: "Part paid", waived: "Waived",
};
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
  || SIZE_LABELS[b.vehicle_size]
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
  const { business, siteOrigin } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [pickingText, setPickingText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [mail, setMail] = useState(null);   // ROADMAP 5.3 — null means loading

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
  const act = async (fn, doneMsg, changed = true) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      // ROADMAP 5.3 — TRANSLATED HERE, WHERE ALL FOUR CALLERS ROUTE THROUGH.
      // Every one of them passes a bare English sentence and `appEs.js` has
      // carried Spanish for them since 14.x — so a Spanish dashboard has been
      // answering "Reminder sent to customer." in English the whole time, with
      // a key sitting right there unused. One line, four call sites.
      if (doneMsg) setNotice(t(doneMsg));
      if (changed) onChanged?.();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
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
      if (!confirm(t("Delete this booking? It is hidden, not destroyed, and can be restored by support."))) return;
      await api.softDeleteBooking(business.id, booking.id);
      onClose?.();
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
  const { weather: jobWeather, prefs: weatherRules } = useJobWeather(justThis);

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
      if (!dead) { setTemplates(data ?? []); setTemplatesLoaded(true); }
    })();
    return () => { dead = true; };
  }, [business.id]);

  // ROADMAP 5.3 — READ, NEVER WRITTEN. `email_sends` grants a browser `select`
  // and nothing else, so this record cannot mark a bounce as delivered however
  // hard it tries; the service role writes every row and Resend's webhook
  // updates it. `null` means loading, `[]` means nothing was ever sent — a
  // spinner is the difference and the two must not collapse.
  const loadMail = useCallback(async () => {
    if (!booking.customer_email) { setMail([]); return; }
    const { data } = await supabase
      .from("email_sends")
      .select("id, subject, to_email, status, detail, sent_at")
      .eq("business_id", business.id)
      .eq("to_email", booking.customer_email)
      .order("sent_at", { ascending: false })
      .limit(MAIL_CAP);
    setMail(data ?? []);
  }, [business.id, booking.customer_email]);
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
  // The subject `invoiceEmail` writes is `Receipt · $195 · <business>` — the
  // product's own word for this document, in whichever language the booking was
  // taken in, and then THE AMOUNT. Both halves are matched, and the amount is
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
  const sentReceipt = (mail ?? []).some((m) =>
    /^(receipt|recibo)\b/i.test(String(m.subject || ""))
    && String(m.subject).includes(money(charged)));
  const diff = charged == null ? 0 : Math.round((charged - quoted) * 100) / 100;
  // Same condition as Today's lit card and its "Needs payment" run, so the
  // card and the record it opens cannot disagree about what the job wants
  // next. It also answers the design's "a job in the future has no Finalize
  // payment" for free: a future job cannot be completed.
  const canFinalize = booking.status === "completed" && !booking.finalized_at;
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
  const refundOwed = cancelled
    && (booking.payment_status === "paid" || booking.payment_status === "partial");
  const refundAmount = booking.payment_status === "partial"
    ? null : money(booking.final_amount ?? booking.total_price);
  // ROADMAP 2.12. A request is answered here as well as on Today, because the
  // owner asked for the accept action on "the page the detailer uses their
  // bookings on" and this record IS that page at /job/:id.
  const waiting = booking.status === "pending";
  // A QUOTE ONLY MEANS ANYTHING WHILE THE BOOKING IS STILL PENDING, and the
  // guard is here rather than on each write for a reason: a declined request
  // and a customer cancellation both end the wait, and so will whatever path
  // gets added next. Clearing the columns in three places is three chances to
  // forget; asking about the status once is none. The columns stay behind as
  // the record of what was last offered, which is worth keeping.
  const quotedAmount = booking.quoted_at && booking.status === "pending"
    ? Number(booking.quoted_amount) : null;
  const respond = (action) =>
    act(() => api.respondToBooking(business.id, booking.id, action),
      // NOT WRAPPED IN `t()` ANY MORE — `act` does it for every caller now.
      action === "accept" ? "Accepted. They've been emailed." : "Declined. They've been emailed.");

  return (
    <>
        {/* The date and time live in the container's own header, so they are
            not repeated here. */}
        <div className="row wrap" style={{ gap: 6 }}>
          {/* These read as raw enum values — lowercase here, title case on
              the card for the same booking. One vocabulary, one casing. */}
          <span className={`pill ${booking.status}`}>{t(STATUS_LABELS[booking.status] ?? booking.status)}</span>
          <span className={`pill ${booking.payment_status}`}>
            {PAY_LABELS[booking.payment_status] ?? booking.payment_status}
          </span>
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
            <div className="error-box" role="status" style={{ color: "var(--bad)" }}>
              {refundAmount
                ? t("This was paid. Refund {amount} from your own Stripe. The money went straight into your account, so we cannot send it back for you.", { amount: refundAmount })
                : t("Part of this was paid. Refund what they paid from your own Stripe. The money went straight into your account, so we cannot send it back for you.")}
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
              <JobWeather period={jobWeather.get(booking.id)} prefs={weatherRules} full />
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
                <p className="muted">{`${(booking.vehicles ?? []).length + 1} vehicles`}</p>
              )}
              <p className="muted">
                {sizeLabel(booking)}
                {booking.vehicle_year ? ` · ${booking.vehicle_year}` : ""}
                {booking.vehicle_model ? ` · ${booking.vehicle_model}` : ""}
                {CONDITION_LABELS[booking.vehicle_condition]
                  ? ` · ${CONDITION_LABELS[booking.vehicle_condition]}` : ""}
              </p>
              {[...(booking.vehicles ?? [])]
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((v) => (
                  <p className="muted" key={v.position}>
                    {v.vehicle_size_label}
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
                  ? <>{waiting ? "They asked for " : "Quoted "}<span className="num">{money(quoted)}</span></>
                  : diff === 0
                    ? <>{t("Charged")} <span className="num">{money(charged)}</span></>
                    : <>
                        {t("Quoted")} <span className="num">{money(quoted)}</span> {t("· charged")} <strong className="num">{money(charged)}</strong>{" "}
                        ({diff > 0 ? `+${money(diff)} added on site` : `${money(-diff)} taken off`})
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
              {canFinalize && (
                <button className="btn primary" style={{ marginTop: "var(--sp-1)" }} disabled={busy}
                  onClick={() => setFinalizing(true)}>
                  <CreditCard size={18} strokeWidth={2} /> {t("Finalize payment")}
                </button>
              )}
            </div>

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
                        onClick={() => act(() => api.sendInvoice(business.id, booking.id),
                          sentReceipt ? "Receipt sent again." : "Receipt + thank-you sent.", false)
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
                          empty="Nothing has been emailed to this address yet." />
                      </div>
                    </>
                  ) : (
                    /* NAMED, NOT ABSENT. A missing button with no sentence
                       beside it reads as a product that forgot, and the
                       detailer cannot tell that the fix is in their hands. */
                    <>
                      <a className="btn ghost" href={receiptHref} target="_blank" rel="noreferrer">
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
            <h3 className="section-title">{waiting ? "Your answer" : "What happened"}</h3>
            <div className="stack" style={{ gap: 8 }}>
              {waiting ? (
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
                    {quotedAmount === null ? " Send a quote" : " Send a new quote"}
                  </button>
                  <button className="btn ghost" disabled={busy} onClick={() => respond("decline")}>
                    <X size={18} strokeWidth={2} /> {t("Decline")}
                  </button>
                </>
              ) : cancelled ? (
                <>
                  {/* THE ONE THING `declined_at` IS FOR. A decline is stored as
                      a cancellation so the slot frees and every existing filter
                      is right about it — which leaves "Cancelled" saying the
                      customer backed out when in fact the detailer said no. A
                      column nothing prints is a column nobody can trust. */}
                  {booking.declined_at && (
                    <p className="quiet" style={{ margin: 0 }}>{t("You declined this request.")}</p>
                  )}
                  <button className="btn" disabled={busy} onClick={() => setStatus("confirmed")}>{t("Un-cancel")}</button>
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
                    <button className="btn" disabled={busy} onClick={() => setStatus("no_show")}>{t("Didn’t show up")}</button>
                  )}
                  <button className="btn ghost" disabled={busy} onClick={() => setStatus("cancelled")}>{t("Cancel the job")}</button>
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
            <details className="disclose">
              {/* **PHRASED AS THE SUBJECT, NOT AS A COMMAND — 2026-09-12.** It
                  read "Remove this from my records too", which looks like a
                  button that DOES the thing rather than a fold that reveals
                  it. Somebody expecting it to act presses it, finds a drawer,
                  and presses whatever is inside — past the sentence that is
                  the entire point of the fold. The button inside should be
                  the only thing on this block that reads like an action. */}
              <summary>{t("Removing it from your records")}</summary>
              <p className="quiet" style={{ margin: "0 0 10px" }}>
                {t("Canceling frees the slot and keeps the job in your history. Removing takes it out of your records and your totals as well. It cannot be undone.")}
              </p>
              <button className="btn danger" disabled={busy} onClick={softDelete}>
                {t("Remove from records")}
              </button>
            </details>
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
              Date/time changes are re-checked against your hours, blockouts and other jobs — a conflicting move is rejected, not silently saved.
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
                  {/* The detailer's OWN words — never translated. */}
                  <div className="strong">{tpl.label}</div>
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
