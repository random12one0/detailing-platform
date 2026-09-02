// The bottom sheet every panel in the app opens as.
//
// Ported in behaviour from the reference admin's BottomSheet, which is the
// best interaction in the old product: tapping a date did not slam a full
// page over your work. A sheet rose to a PEEK height showing enough to act
// on, you could drag it up for the rest, drag it down to put it away, or tap
// outside. Nothing ever felt like navigating away and back.
//
// Rebuilt without Radix (this app has no component library) and with the
// details that make it feel right on a phone:
//
//   - two snap points, peek and full. It opens at peek, because most of the
//     time the top of the sheet is all you need.
//   - the WHOLE header drags, not just the grabber — a 6px handle is a
//     miserable target with a thumb, and the reference version had the same
//     problem.
//   - a drag COMMITS IN ITS DIRECTION after ~40px, so a flick works and you
//     never have to drag the full height.
//   - dragging below the dismiss threshold closes it, and it animates out
//     rather than vanishing.
//   - tap the backdrop, or press Escape, to close.
//   - the page behind cannot scroll while it is open, so putting the sheet
//     away leaves you exactly where you were.
//   - `touch-action: none` only on the drag surface, so the BODY still
//     scrolls normally with a finger.

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const PEEK = 56;      // vh it opens at
const FULL = 92;      // vh when pulled all the way up
const DISMISS = 34;   // drag below this and it closes
const COMMIT = 5;     // vh of movement that commits to a direction

export default function Sheet({
  open = true, onClose, title, subtitle, children, footer,
  peek = PEEK, dismissible = true,
}) {
  const [height, setHeight] = useState(peek);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const drag = useRef(null);
  const panel = useRef(null);

  const close = useCallback(() => {
    if (!dismissible) return;
    // Animate out instead of disappearing — the sheet goes back where it
    // came from, which is what makes it feel put away rather than cancelled.
    setLeaving(true);
    setTimeout(() => onClose?.(), 180);
  }, [onClose, dismissible]);

  // Escape closes, and the page behind is frozen while it is open.
  //
  // AND TAB STAYS INSIDE, WHICH IT DID NOT UNTIL 2026-09-01. Measured by
  // walking the job record with the keyboard (roadmap 2.11 step 6 stage 2):
  // opening a sheet left focus on the page BEHIND it, and tabbing forward out
  // of the record went through four job rows and Tomorrow before it reached
  // the sheet's own Close. This element says `aria-modal="true"`, which tells
  // a screen reader the rest of the page is inert — so the keyboard was
  // contradicting the markup on all eleven sheets in the product, not just
  // this one. The body freeze above stops the MOUSE scrolling past a sheet
  // and always did; nothing stopped the keyboard.
  //
  // Not `<dialog showModal()>`, which would give this for free: the height is
  // dragged, the backdrop is ours, and the top layer would take the exit
  // animation and the peek with it. Twelve lines here is the smaller change.
  // It watches where focus LANDS rather than trying to work out which control
  // is last. Computing first/last was written first and let exactly one stop
  // escape: a closed `<details>` still answers `querySelectorAll` and still
  // has a layout box, so the disclosure's hidden button counted as the last
  // focusable while the browser skipped it. Refusing to let focus settle
  // outside is both shorter and blind to that whole class of question.
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement;
    const back = { current: false };   // which way the last Tab went
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") back.current = e.shiftKey;
    };
    const onFocusIn = (e) => {
      const p = panel.current;
      // A sheet opened FROM a sheet (the text picker, Finalize payment) is
      // inside this one's DOM, so its own focus stays "contained" here and
      // the two never fight over it.
      if (!p || p.contains(e.target)) return;
      const list = [...p.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])',
        // A CLOSED <details> IS THE ONE THING THAT LIES HERE, and it was
        // measured rather than guessed: the disclosure's hidden button
        // reports `getClientRects().length === 1`, a 46px box and a live
        // `offsetParent`, because the browser hides it with
        // content-visibility rather than display. `checkVisibility()` is the
        // only one of the four that says false.
      )].filter((el) => (el.checkVisibility ? el.checkVisibility() : el.offsetParent !== null));
      (list.length ? (back.current ? list[list.length - 1] : list[0]) : p).focus();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      // Back where you were — a sheet is put away, not navigated away from.
      if (returnTo instanceof HTMLElement && document.contains(returnTo)) returnTo.focus();
    };
  }, [open, close]);

  const onPointerDown = (e) => {
    drag.current = { startY: e.clientY, startHeight: height, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dvh = ((drag.current.startY - e.clientY) / window.innerHeight) * 100;
    if (Math.abs(dvh) > 1) drag.current.moved = true;
    setHeight(Math.min(FULL, Math.max(12, drag.current.startHeight + dvh)));
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    drag.current = null;
    setDragging(false);

    // A tap on the header toggles between the two heights.
    if (!d.moved) {
      setHeight((h) => (h > (peek + FULL) / 2 ? peek : FULL));
      return;
    }
    setHeight((h) => {
      if (h < DISMISS) { close(); return h; }
      if (h - d.startHeight > COMMIT) return FULL;
      if (d.startHeight - h > COMMIT) return peek;
      return h > (peek + FULL) / 2 ? FULL : peek;
    });
  };

  if (!open) return null;

  const dragHandlers = {
    onPointerDown, onPointerMove,
    onPointerUp: endDrag, onPointerCancel: endDrag,
  };

  return (
    <div className={`sheet-backdrop${leaving ? " leaving" : ""}`} onClick={close}>
      <div
        ref={panel}
        className={`sheet${dragging ? " dragging" : ""}${leaving ? " leaving" : ""}`}
        style={{ height: `${height}vh` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        /* -1 so the panel itself can take focus when it opens without ever
           landing in the Tab order. */
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab" {...dragHandlers}>
          <span className="grabber" aria-hidden="true" />
          <div className="row between" style={{ alignItems: "flex-start", gap: "var(--sp-3)" }}>
            <div style={{ minWidth: 0 }}>
              {title && <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h2>}
              {subtitle && <p className="quiet" style={{ marginTop: 2 }}>{subtitle}</p>}
            </div>
            {dismissible && (
              <button className="x" aria-label="Close"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); close(); }}>
                <X size={18} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
