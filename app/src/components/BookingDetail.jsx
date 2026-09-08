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

import { useEffect, useState } from "react";
import { Bell, CalendarPlus, Check, CheckCircle2, CreditCard, MessageSquare, MessageSquareQuote, Navigation, Phone, UserPlus, X } from "lucide-react";
import { api, icsUrl } from "../lib/api.js";
import { calendarUrlFor, loadPrefs, saveContact } from "../lib/platform.js";
import { supabase } from "../lib/supabase.js";
import { fillTemplate } from "../lib/templates.js";
import { dateLong, mapsUrl, money, time12 } from "../lib/format.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import JobPhotos from "./JobPhotos.jsx";
import FinalizeModal from "./FinalizeModal.jsx";
import QuoteModal from "./QuoteModal.jsx";
import Sheet from "./Sheet.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
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
  subtitle: `${dateLong(b.booking_date)} · ${time12(b.start_time)} – ${time12(b.end_time)}`,
});

export default function BookingDetail({ booking, onClose, onChanged }) {
  useAppLocale();
  const { business } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [pickingText, setPickingText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [quoting, setQuoting] = useState(false);
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
      if (doneMsg) setNotice(doneMsg);
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

  const setStatus = (status) =>
    act(() => api.updateBooking(business.id, { booking_id: booking.id, status }), `Marked ${status}.`);

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
      if (!confirm("Delete this booking? It is hidden, not destroyed, and can be restored by support.")) return;
      await api.softDeleteBooking(business.id, booking.id);
      onClose?.();
    });

  const address =
    booking.service_type === "mobile" && booking.customer_address
      ? booking.customer_address
      : business.dropoff_address;

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
      if (!dead) setTemplates(data ?? []);
    })();
    return () => { dead = true; };
  }, [business.id]);

  const onMyWay = templates.find((x) => x.key === "on_my_way");
  const openTextPicker = () => setPickingText(true);
  const smsHref = (body) =>
    `sms:${booking.customer_phone}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(body)}`;
  const filled = (body) =>
    fillTemplate(body, {
      booking, business,
      dateLabel: dateLong(booking.booking_date),
      timeLabel: time12(booking.start_time),
      address: address || "",
      total: money(booking.final_amount ?? booking.total_price),
    });

  // THE MONEY, and this is Part B row 19. The record printed "Estimated
  // $235.00 · Final $235.00" on every finalized job, which is two figures
  // saying one thing. One figure when they agree; both only when they
  // differ, and then the difference is NAMED rather than left to subtract.
  const quoted = Number(booking.total_price);
  const charged = booking.final_amount == null ? null : Number(booking.final_amount);
  const diff = charged == null ? 0 : Math.round((charged - quoted) * 100) / 100;
  // Same condition as Today's lit card and its "Needs payment" run, so the
  // card and the record it opens cannot disagree about what the job wants
  // next. It also answers the design's "a job in the future has no Finalize
  // payment" for free: a future job cannot be completed.
  const canFinalize = booking.status === "completed" && !booking.finalized_at;
  const cancelled = booking.status === "cancelled";
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
      action === "accept" ? "Accepted — they've been emailed." : "Declined — they've been emailed.");

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
            <a
              className="btn sm"
              href={calendarUrlFor(
                { ...booking, service_name: (booking.services ?? [])[0]?.name_at_booking },
                icsUrl(booking.id, "owner"),
              )}
              {...(loadPrefs().calendar === "google"
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              <CalendarPlus size={18} strokeWidth={2} /> {t("Calendar")}
            </a>
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
                  {t("Quote sent for")} <strong className="num">{money(quotedAmount)}</strong> {t("— not charged until they accept it.")}
                </p>
              )}
              {/* Written by Finalize payment and, until now, printed nowhere. */}
              {booking.payment_notes && <p className="quiet">How they paid: {booking.payment_notes}</p>}
              {canFinalize ? (
                <button className="btn primary" style={{ marginTop: "var(--sp-1)" }} disabled={busy}
                  onClick={() => setFinalizing(true)}>
                  <CreditCard size={18} strokeWidth={2} /> {t("Finalize payment")}
                </button>
              ) : charged != null && booking.customer_email ? (
                <button className="btn primary" style={{ marginTop: "var(--sp-1)" }} disabled={busy}
                  onClick={() => act(() => api.sendInvoice(business.id, booking.id),
                    "Invoice + thank-you sent.", false)}>
                  {t("Email invoice")}
                </button>
              ) : null}
            </div>

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
                  {booking.status !== "completed" && (
                    <button className="btn primary" disabled={busy} onClick={() => setStatus("completed")}>
                      <CheckCircle2 size={18} strokeWidth={2} /> {t("Mark completed")}
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
              <summary>{t("Remove this from my records too")}</summary>
              <p className="quiet" style={{ margin: "0 0 10px" }}>
                {t("Cancelling frees the slot and keeps the job in your history. Removing takes it out of your records and your totals as well. It cannot be undone.")}
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
              <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></label>
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
              {templates.length === 0 && (
                <p className="quiet">{t("No templates yet — the gear, then Message templates.")}</p>
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
