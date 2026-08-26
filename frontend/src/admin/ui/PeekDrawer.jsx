// PeekDrawer — a NON-modal bottom drawer that only ever peeks a sliver of the
// screen, so the content behind it (e.g. the calendar grid) stays fully tappable.
// Drag the grab handle up to reveal the full body, drag/tap down to collapse back
// to the peek. Unlike BottomSheet (Radix Sheet — modal, dims + blocks the page),
// this renders no overlay and never traps interaction. It's positioned above the
// mobile tab bar so both remain usable.
//
// Props:
//   peek        — compact node shown in the collapsed bar (one line)
//   children    — full body revealed when expanded
//   expandLabel — a11y label for the expand/collapse control
import React, { useCallback, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const PEEK_PX = 72; // collapsed height (~a sliver): grab handle + one summary line
const OPEN_FRACTION = 0.72; // fraction of viewport height when fully open

export function PeekDrawer({ peek, children, expandLabel = "Day details", className }) {
  const maxPx = () =>
    typeof window !== "undefined"
      ? Math.round(window.innerHeight * OPEN_FRACTION)
      : 520;
  const [height, setHeight] = useState(PEEK_PX);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null); // { startY, startHeight, moved }
  const expanded = height > PEEK_PX + 24;

  const setExpanded = (open) => setHeight(open ? maxPx() : PEEK_PX);
  const toggle = () => setExpanded(!expanded);

  const onPointerDown = useCallback(
    (e) => {
      drag.current = { startY: e.clientY, startHeight: height, moved: false };
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [height]
  );

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const dy = drag.current.startY - e.clientY;
    if (Math.abs(dy) > 4) drag.current.moved = true;
    const next = Math.min(maxPx(), Math.max(PEEK_PX, drag.current.startHeight + dy));
    setHeight(next);
  }, []);

  const endDrag = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    drag.current = null;
    setDragging(false);
    // A tap (no real movement) toggles.
    if (!d.moved) {
      setHeight((h) => (h > PEEK_PX + 24 ? PEEK_PX : maxPx()));
      return;
    }
    // A drag commits in its DIRECTION after only a small movement (~a thumb
    // flick), so you don't have to drag the whole way; tiny drags snap to nearest.
    const COMMIT_PX = 36;
    setHeight((h) => {
      if (h - d.startHeight > COMMIT_PX) return maxPx();
      if (d.startHeight - h > COMMIT_PX) return PEEK_PX;
      return h > (PEEK_PX + maxPx()) / 2 ? maxPx() : PEEK_PX;
    });
  }, []);

  // Shared handlers for every draggable surface (bar + the strip above it).
  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  return (
    <>
      {/* When expanded, a light tap-catcher behind the drawer collapses it on an
          outside tap (like a bottom sheet). Absent when collapsed, so the peek
          never blocks the calendar. */}
      {expanded && (
        <div
          aria-hidden="true"
          onClick={() => setHeight(PEEK_PX)}
          className="fixed inset-0 z-10 bg-black/20 lg:hidden"
        />
      )}
      <div
        // Sits above the fixed mobile tab bar (h-16) + iOS safe area.
        className={cn(
          "fixed inset-x-0 z-20 lg:hidden",
        "rounded-t-2xl border-x border-t border-border bg-card shadow-[0_-8px_30px_rgba(0,0,0,0.35)]",
        !dragging && "transition-[height] duration-150 ease-out",
        className
      )}
      style={{
        bottom: "calc(4rem + env(safe-area-inset-bottom))",
        height: `${height}px`,
      }}
    >
      {/* Invisible grab strip that extends ABOVE the drawer so a finger landing just
          over the bar can still start the drag (bigger, more forgiving hitbox). */}
      <div
        aria-hidden="true"
        {...dragHandlers}
        className="absolute inset-x-0 -top-6 h-6 cursor-grab touch-none select-none active:cursor-grabbing"
      />
      <div className="flex h-full flex-col">
        {/* Grab bar — the WHOLE bar (handle + summary line) drags; tap toggles. */}
        <button
          type="button"
          aria-label={expanded ? `Collapse ${expandLabel}` : `Expand ${expandLabel}`}
          aria-expanded={expanded}
          {...dragHandlers}
          className="shrink-0 cursor-grab touch-none select-none px-4 pb-2.5 pt-3 active:cursor-grabbing"
        >
          <span
            className="mx-auto mb-2.5 block h-1.5 w-12 rounded-full bg-muted-foreground/40"
            aria-hidden="true"
          />
          {/* Peek line: summary on the left, a chevron affordance on the right */}
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 text-left">{peek}</span>
            <ChevronUp
              className={cn(
                "size-5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </span>
        </button>

        {/* Full body — only meaningfully visible when expanded */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
          {children}
        </div>
      </div>
      </div>
    </>
  );
}

export default PeekDrawer;
