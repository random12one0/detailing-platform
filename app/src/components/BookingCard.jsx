// The job card, dense.
//
// The reference admin's version is the best thing in the old dashboard and
// the reason is that it answers every question standing in a driveway
// without a tap: when, who, how much, what, where — then Navigate, Call,
// Text and the one action that moves the job forward. Ported in substance,
// rebuilt on the new type and spacing scale.
//
// Two things carry status without a word being read: a 3px stripe down the
// left edge (new here — the old admin only had the pill) and the pill
// itself. Everything else on the card is neutral.

import { CheckCircle2, CreditCard, MessageSquare, Navigation, Phone } from "lucide-react";
import { mapsUrl, money, time12 } from "../lib/format.js";
import ConfirmTap, { jobDoneQuestion } from "./ConfirmTap.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";
import JobWeather from "./JobWeather.jsx";
import { PAY_LABELS, payPill } from "../lib/payPill.js";

const STATUS_LABEL = {
  confirmed: "Confirmed", completed: "Completed",
  cancelled: "Cancelled", no_show: "No show", pending: "Pending",
};

// The card had its own hardcoded Google Maps link while the detail sheet
// used the shared helper, so the same job navigated differently depending on
// which button you pressed. One helper, which honours Preferences → Maps.

// `live` is the lit job's own state on Today — "now" for a job that has
// started and not ended, "next" for one still ahead, null everywhere else. It
// REPLACES the status pill rather than sitting beside it: a job you are
// standing in front of gains nothing from being told it is Confirmed, and two
// pills about the same thing is the second look Andrew's 2026-09-13 brief
// rules out. Today computes it off the booking's own clock — see the note
// there about why a label read off a POSITION lies.
const LIVE_LABEL = { now: "Happening now", next: "Up next" };

export default function BookingCard({
  booking, onClick, isNext = false, live = null,
  onMarkComplete, onFinalize, dense = false, rail = "", weather, weatherRules,
}) {
  useAppLocale();
  const services = (booking.services ?? []).map((s) => s.name_at_booking).filter(Boolean);
  const isMobile = booking.service_type === "mobile";
  const amount = booking.final_amount ?? booking.total_price;
  const pay = payPill(booking);

  // The action buttons sit OUTSIDE the tappable info region so a thumb
  // aiming for Call never opens the detail sheet instead.
  const hasActions = !dense && (onMarkComplete || onFinalize || booking.customer_phone);

  // `rail` is the state of this job's NODE when the card hangs on Today's
  // rail — "landed" for finished, nothing for a job still ahead. The node is
  // drawn by .dayrail on its child, so the class has to be out here on the
  // card rather than anywhere inside it.
  return (
    <div className={`card${isNext ? " attend" : ""}${rail ? ` ${rail}` : ""}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
        style={{ cursor: "pointer" }}
      >
        <div className="tight">
          <div className="row top between">
            <div style={{ minWidth: 0 }}>
              <div className="strong" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {booking.customer_name}
              </div>
              <div className="quiet" style={{ marginTop: 2 }}>
                {time12(booking.start_time)} – {time12(booking.end_time)}
              </div>
            </div>
            <div className="strong num" style={{ whiteSpace: "nowrap" }}>{money(amount)}</div>
          </div>

          <div className="row wrap" style={{ gap: 6 }}>
            <span className="tag">{t(isMobile ? "Mobile" : "Drop-off")}</span>
            {/* THE LIVE STATE OUTRANKS THE STATUS, and never joins it. */}
            <span className={`pill ${live ? `live ${live}` : booking.status}`}>
              {t(live ? LIVE_LABEL[live] : (STATUS_LABEL[booking.status] ?? booking.status))}
            </span>
            {/* ROADMAP 97.80: a refund in Stripe replaces "Paid", never sits beside it. */}
            {["paid", "refunded", "part_refunded"].includes(pay) && <span className={`pill ${pay}`} data-pay-pill>{t(PAY_LABELS[pay])}</span>}
            {/* THE SKY, IN THE STRIP THAT ALREADY SAYS WHAT KIND OF JOB THIS
                IS — 2026-09-13. It is the same class of fact as *Mobile* and
                the status, so it wraps with them rather than opening a line of
                its own; on a lit job with nothing to warn about it is a
                temperature and no more. */}
            <JobWeather period={weather} prefs={weatherRules} />
          </div>

          {services.length > 0 && <div className="body">{services.join(" · ")}</div>}

          {isMobile && booking.customer_address && (
            <div className="quiet" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {booking.customer_address}
            </div>
          )}
        </div>
      </div>

      {hasActions && (
        <>
          <hr className="rule" />
          {(isMobile && booking.customer_address) || booking.customer_phone ? (
            <div className="btnrow">
              {isMobile && booking.customer_address && (
                <a className="btn sm" href={mapsUrl(booking.customer_address)}
                  target="_blank" rel="noopener noreferrer">
                  <Navigation strokeWidth={2} /> {t("Navigate")}
                </a>
              )}
              {booking.customer_phone && (
                <>
                  <a className="btn sm" href={`tel:${booking.customer_phone}`}>
                    <Phone strokeWidth={2} /> {t("Call")}
                  </a>
                  <a className="btn sm" href={`sms:${booking.customer_phone}`}>
                    <MessageSquare strokeWidth={2} /> {t("Text")}
                  </a>
                </>
              )}
            </div>
          ) : null}

          {/* ROADMAP 4.1 — IT ASKS NOW. This is the accent-filled button on
              the next job of the day, pressed one-handed in a driveway, and
              it used to write the status on the first touch. A1 hit it by
              accident just exploring. */}
          {onMarkComplete && booking.status === "confirmed" && (
            <ConfirmTap
              className={`btn${isNext ? " primary" : ""}`}
              style={{ marginTop: "var(--sp-2)" }}
              icon={<CheckCircle2 strokeWidth={2} />}
              label={t("Mark complete")}
              question={jobDoneQuestion({
                name: booking.customer_name,
                service: services.join(" · "),
                time: time12(booking.start_time),
              })}
              confirmLabel={t("Yes, it’s done")}
              onConfirm={() => onMarkComplete(booking)}
            />
          )}
          {onFinalize && booking.status === "completed" && !booking.finalized_at && (
            <button className={`btn${isNext ? " primary" : ""}`} style={{ marginTop: "var(--sp-2)" }}
              onClick={() => onFinalize(booking)}>
              <CreditCard strokeWidth={2} /> {t("Finalize payment")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
