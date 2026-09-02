// Where a settings screen is drawn — a page below --wrap, the second column
// at or above it. The settings half of what `RecordHost` does for records.
//
// Roadmap 2.11 step 6, stage 6. It exists because step 4b found a THIRD kind
// of container and a settings screen is it
// (docs/dashboard-phone-pass-2026-08-31.md §2b):
//
//   a record      a job, a client       a sheet over its list  | the 2nd column
//   A PLACE YOU GO   a settings screen  A PAGE, with a back    | the 2nd column
//   a form you commit                   a full-screen sheet    | a modal
//
// **Why a settings screen stops being a sheet**, and none of it is taste:
//   - the row that opens it draws a `›`, which promises a push and delivered a
//     peek. The affordance has been lying since it was built.
//   - a sheet with its own inner scroller, inside a page that also scrolls, is
//     two scrollers. *Services & add-ons* is four lists inside one of them.
//   - it was a 640px floating box at EVERY width, including the desk.
//   - step 4 §10 had already moved the desk this way: "the eleven stop being
//     640px modals". The phone is not being given a new idea.
//
// `dashboard-skeletons.md` §3's reasoning survives whole: it lets the twelve
// share one skeleton because "they are modal panels reached one at a time…
// Law 1 governs what is on screen at once". REACHED ONE AT A TIME IS STILL
// TRUE OF A PAGE. Only the container changed; two are still never on screen
// together.
//
// It takes the INDEX as children rather than rendering it, because the two
// callers' indexes have nothing in common — Business is three groups of nav
// rows under a booking-link block, the gear is one group under an account
// block. What they share is this container and the decision inside it.

import { useEffect, useRef } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useWide } from "../hooks/useWide.js";
import { SCREENS } from "../screens/more/index.js";

export default function SettingsHost({ open, onClose, splitClass, empty, children }) {
  const wide = useWide();

  // ESCAPE CLOSES IT AT BOTH WIDTHS, the same rule and the same reason as
  // RecordHost: below --wrap a sheet always took Escape, so the seam between
  // the two containers showed through the keyboard. Guarded on an open sheet,
  // because a settings screen can open one on top of itself (Catalog's
  // editor, the timezone guard) and one press must not close both.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !document.querySelector(".sheet-backdrop")) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // A PAGE STARTS AT ITS TOP. Opening the ninth row of an index and landing
  // two thirds of the way down a form is the thing a sheet got right for
  // free, and it is the one behaviour a page has to be told.
  //
  // AND SO IS WHERE THE KEYBOARD GOES, which is the other thing the sheet did
  // for nothing: it focused its panel on open and put focus back on the row
  // when it closed. Below --wrap the index is UNMOUNTED while a screen is
  // open, so the element cannot be held onto — the row is found again by the
  // key it opened. Without this, closing a settings page drops focus to the
  // body and a keyboard or screen-reader user loses their place in a list of
  // eight. At a desk the index never left, so nothing needs restoring.
  const back = useRef(null);
  const wasOpen = useRef(null);
  useEffect(() => {
    if (open && !wide) {
      window.scrollTo(0, 0);
      back.current?.focus();
      wasOpen.current = open;
    } else if (!open && wasOpen.current && !wide) {
      document.querySelector(`.nav-row[data-settings-key="${wasOpen.current}"]`)?.focus();
      wasOpen.current = null;
    }
  }, [open, wide]);

  const entry = open ? SCREENS[open] : null;
  const Active = entry?.[0];
  const title = entry?.[1];

  // BELOW --wrap THE SCREEN IS THE PAGE. The index is not rendered at all —
  // that is the difference between a page and a sheet, and it is what makes
  // one scroller rather than two.
  if (open && !wide) {
    return (
      <div className="group settings-page">
        <div className="settings-head">
          <button ref={back} className="btn icon ghost" aria-label="Back" onClick={onClose}>
            <ChevronLeft strokeWidth={2} />
          </button>
          <h1 className="display">{title}</h1>
        </div>
        <Active />
      </div>
    );
  }

  return (
    <div className={`split ${splitClass}`}>
      <div className="group col-1">{children}</div>
      {/* A SECOND COLUMN THAT IS EMPTY IS THE dead-width FAILURE ONE LEVEL
          DOWN — 465px of the content column, permanently blank, which is what
          Clients was caught doing in stage 5. So the column always has
          something in it: the selected screen, or the caller's resting
          content (Business puts the booking link there, the gear the account
          block). Neither is DUPLICATED into the index — both callers render
          them in the page only below --wrap. */}
      {open ? (
        /* NO CARD AROUND IT. Every settings screen is already made of
           `.card.setting-card` groups, so a panel here would be boxes in
           boxes at one surface value — the note Catalog's own container
           carries, and what `.record.bare` exists for one screen over. */
        <aside className="col-2 settings-col" aria-label={title}>
          <div className="row between" style={{ alignItems: "flex-start", gap: "var(--sp-3)" }}>
            <h2>{title}</h2>
            <button className="x" aria-label="Close" onClick={onClose}><X size={18} strokeWidth={2} /></button>
          </div>
          <div className="settings-body"><Active /></div>
        </aside>
      ) : wide ? (
        /* ONLY AT A DESK. Below --wrap there is no second column — .split is
           not a grid there — so rendering this would simply stack the resting
           content under the index, and both callers already put it in the
           page themselves. Measured, not reasoned about: without the guard
           the booking link was drawn TWICE on one 392px screen.
           `wide` and the caller's own useWide() are the same query, so the
           two halves cannot disagree. */
        <aside className="col-2 settings-col">{empty}</aside>
      ) : null}
    </div>
  );
}
