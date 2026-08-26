// BottomSheet — bottom sheet for contextual actions like "Manage day".
// Opens at a PEEK height first, with a drag handle to pull it to full height
// (or push it down to dismiss). Sticky header + scrollable body. Use Modal when
// you want responsive centering instead.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const PEEK_VH = 52; // height it first pops up to
const FULL_VH = 92; // height when dragged fully open
const SNAP_MIDPOINT = (PEEK_VH + FULL_VH) / 2;
const DISMISS_VH = 34; // drag below this and it closes

export function BottomSheet({ open, onClose, title, description, children, footer, className }) {
  const [heightVh, setHeightVh] = useState(PEEK_VH);
  const drag = useRef(null); // { startY, startHeight }

  // Reset to the peek height every time the sheet opens.
  useEffect(() => {
    if (open) setHeightVh(PEEK_VH);
  }, [open]);

  const onPointerDown = useCallback(
    (e) => {
      drag.current = { startY: e.clientY, startHeight: heightVh };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [heightVh]
  );

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const dyVh = ((drag.current.startY - e.clientY) / window.innerHeight) * 100;
    const next = Math.min(FULL_VH, Math.max(12, drag.current.startHeight + dyVh));
    setHeightVh(next);
  }, []);

  const endDrag = useCallback(
    (e) => {
      if (!drag.current) return;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      drag.current = null;
      setHeightVh((h) => {
        if (h < DISMISS_VH) {
          onClose?.();
          return PEEK_VH;
        }
        return h >= SNAP_MIDPOINT ? FULL_VH : PEEK_VH;
      });
    },
    [onClose]
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent
        side="bottom"
        style={{ height: `${heightVh}vh` }}
        className={cn(
          "flex flex-col gap-0 rounded-t-2xl border-border bg-card p-0 transition-[height] duration-150 ease-out",
          className
        )}
      >
        {/* Drag handle + header (drag the grabber to resize / dismiss) */}
        <div
          className="sticky top-0 z-10 shrink-0 cursor-grab touch-none select-none border-b border-border bg-card px-4 pb-3 pt-2 pr-12 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
          <SheetTitle className="text-lg font-semibold text-foreground">{title}</SheetTitle>
          {description && (
            <SheetDescription className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-4 py-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default BottomSheet;
