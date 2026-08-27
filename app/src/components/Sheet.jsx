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

  const close = useCallback(() => {
    if (!dismissible) return;
    // Animate out instead of disappearing — the sheet goes back where it
    // came from, which is what makes it feel put away rather than cancelled.
    setLeaving(true);
    setTimeout(() => onClose?.(), 180);
  }, [onClose, dismissible]);

  // Escape closes, and the page behind is frozen while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
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
        className={`sheet${dragging ? " dragging" : ""}${leaving ? " leaving" : ""}`}
        style={{ height: `${height}vh` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
