// THE DETAILER'S OWN BOOKING PAGE, ON THEIR OWN SETTINGS SCREEN — ROADMAP 9.10.
//
// Andrew's question, 2026-09-20, looking at Business at a desk: *"why is there
// an empty half"*. Measured before building: the resting column held a 252px
// link card over about 570px of nothing at 1440.
//
// ---------------------------------------------------------------------------
// THE THREE JUDGEMENT CALLS WERE DECIDED 2026-09-24 AND ARE NOT RE-OPENED HERE
// ---------------------------------------------------------------------------
//   1 · IT IS THE REAL PAGE. Not a rendering of the settings and not a
//       mock-up — an iframe of `/book/<slug>`, the same URL a customer opens.
//       A mock-up is a second implementation of the booking page, and the
//       second implementation is the one that rots.
//   2 · IT REFRESHES ON SAVE, NOT ON A KEYSTROKE. The iframe is keyed on
//       `refreshKey`, which only changes when a settings panel closes. Nothing
//       about typing can reach it — that is by construction rather than by a
//       debounce somebody has to get right. As-they-type would show half-typed
//       nonsense to the one person judging how their own page looks.
//   3 · A THIN BUSINESS GETS THE PAGE AS IT IS TODAY PLUS ONE LINE NAMING WHAT
//       IS MISSING. Not a blank panel, not a placeholder. The honest current
//       state is the useful thing; the line is what makes it actionable.
//
// ---------------------------------------------------------------------------
// ONE CALL THAT 9.10 DID NOT MAKE, SO IT IS MADE HERE IN THE OPEN
// ---------------------------------------------------------------------------
// **The frame is inert.** A live booking page sitting on the detailer's own
// settings screen is a page they can book a job through by accident, on their
// own business, and a stray booking is a real row in a real table. So the
// iframe takes no pointer and no tab stop, and the "Open it" button that has
// always been directly above goes to the real thing in a real tab. If that is
// the wrong call it is a one-line change — `inert` and `pointer-events` — and
// this paragraph is where to argue with it.
//
// It is NOT scaled down. A preview shrunk to fit is a picture of a page rather
// than the page, and the column is already about the width of a narrow
// browser, so what a detailer sees here is what the layout actually does.

import { useId } from "react";
import { t } from "../lib/i18n.js";

/**
 * One line naming what is missing, or null when nothing is.
 *
 * ORDERED BY WHAT STOPS A BOOKING FIRST, because that is the order a customer
 * meets them in and the order a detailer should fix them in. Services and open
 * hours each make the page unbookable on their own; photos and reviews do not,
 * so they are named only once the page actually works.
 *
 * **IT RETURNS NULL FOR A COMPLETE BUSINESS AND THAT IS THE POINT.** A line
 * that always says something would be decoration, and the detailer would stop
 * reading it before the day it mattered.
 */
export function missingLine(counts) {
  if (!counts) return null;
  if (!counts.services) return t("Nobody can book this page yet — it has no services on it.");
  if (!counts.hoursOpen) return t("Nobody can book this page yet — no days are open.");
  if (!counts.photos && !counts.reviews) {
    return t("This page works. It has no photos and no reviews on it yet.");
  }
  if (!counts.photos) return t("This page works. It has no photos on it yet.");
  if (!counts.reviews) return t("This page works. It has no reviews on it yet.");
  return null;
}

export default function PagePreview({ slug, origin, counts, refreshKey = 0 }) {
  const titleId = useId();
  /* **`origin` IS ROUTINELY EMPTY AND THAT IS NOT A REASON TO RENDER NOTHING.**
     `siteOrigin` carries a tenant's own domain when they have one and is ""
     when they do not, which is every business on localhost - so the first
     version of this guard returned null on every screen it was built for, and
     the check reported "the preview is ABSENT" eleven times. `BookingLink`,
     six lines above it in the same column, has always fallen back to
     `window.location.origin`; this now reads the same way, so the two cannot
     point at different hosts. */
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (!slug || !base) return null;
  const missing = missingLine(counts);
  return (
    <section className="pagepv" aria-labelledby={titleId}>
      <div className="lab" id={titleId}>{t("What customers see")}</div>
      {/* THE LINE SITS ABOVE THE FRAME, not under it. Under a 600px page it is
          below the fold of the column on a phone, which is the one width this
          sentence exists for. */}
      {missing && <p className="pagepv-missing">{missing}</p>}
      <div className="pagepv-frame">
        <iframe
          /* `key` IS THE WHOLE REFRESH MECHANISM — see judgement call 2. React
             remounts the element when the key changes, which reloads the page;
             nothing else in this component can cause that. */
          key={refreshKey}
          src={`${base}/book/${slug}`}
          title={t("Your booking page")}
          /* Inert: no pointer, no tab stop, no accidental booking on their own
             business. `tabIndex={-1}` on the frame keeps the keyboard walk out
             of a document it cannot escape. */
          tabIndex={-1}
          scrolling="no"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </div>
    </section>
  );
}
