// Where a record is drawn — a sheet on a phone, the second column at a desk.
//
// The rule it carries (docs/dashboard-component-inventory-2026-08-31.md §2):
// A RECORD RENDERS ITS CONTENT. ITS CONTAINER IS THE CALLER'S. Below --wrap a
// job or a client is pulled up over its list; at or above it, NN/g's F11 says
// a record belongs BESIDE the list rather than over it, because a modal hides
// the reference data you are reading it against.
//
// A FORM YOU COMMIT is not a record and does not come through here — new
// booking, finalize payment, add an expense stay modals at every width, and
// they still render their own <Sheet>. Desktop spec §4a.

import { useEffect } from "react";
import { X } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { useWide } from "../hooks/useWide.js";
import { useLeaving } from "../hooks/useLeaving.js";

// IT ANIMATES OUT, NOT JUST IN — roadmap 2.17, and the exit is the half that
// gets skipped. Below --wrap a record has always left the way it arrived
// (`.sheet` has sheet-out); at a desk it vanished, which is the seam this
// component exists to hide showing through the other way round.
// React unmounts the element, so CSS alone cannot do this: the close is held
// for --t-exit while `.leaving` plays, then the caller is told. `useLeaving`
// is that hold, shared with SettingsHost and the calendar's day panel so the
// duration lives in exactly one place.

// `bare` is Clients and only Clients: law 1 makes it the one screen in the
// product with NO PANEL ON IT, and a right-hand card at a desk would end that.
// The record still gets this component — the seam between a sheet and a column
// is exactly what it exists to hide — it just draws no box (screen designs §9).
export default function RecordHost({ open = true, onClose, title, subtitle, children, footer, bare = false }) {
  const wide = useWide();
  // A CLOSE THE PERSON ASKED FOR — the X, or Escape. A record that closes
  // because something CHANGED (a payment finalized, a booking cancelled) is
  // the caller unmounting us and still goes straight out: that is not a "put
  // it away" gesture, and holding the screen for 180ms after a save would put
  // the animation in front of the result.
  // Below --wrap the Sheet runs its own exit, so this one stands down.
  const [leaving, close] = useLeaving(onClose, wide);

  // ESCAPE CLOSES IT AT BOTH WIDTHS. A sheet has always taken Escape, so
  // below --wrap the record did and above it the same record did not — the
  // seam this component exists to hide, showing through. It is not a modal
  // here and does not trap anything; it just answers the key.
  // GUARDED ON AN OPEN SHEET, because a form you commit (Finalize payment,
  // the text picker) opens as a modal ON TOP of the record: without this,
  // Escape would dismiss the modal AND the record under it in one press.
  useEffect(() => {
    if (!open || !wide) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !document.querySelector(".sheet-backdrop")) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, wide, close]);

  if (!open) return null;

  if (!wide) {
    return (
      /* Sheet runs its OWN leaving state and its own 180ms, so it takes the
         raw onClose. Wrapping it in this one would be two exits for one
         gesture — 360ms and a record that leaves twice. */
      <Sheet open onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
        {children}
      </Sheet>
    );
  }

  // SWITCHING RECORDS IS A SWAP, NOT AN ENTRANCE — the owner, 2026-09-03:
  // "if I switch between, like, one booking and I click another one, it just
  // instantly changes… maybe a little dissolve or a blur."
  //
  // The panel deliberately does NOT leave and come back — that would put 180ms
  // between a tap and the thing tapped for, which is his own acceptance test
  // failing. What changes is everything INSIDE it, so the contents dissolve
  // while the frame holds still.
  //
  // KEYED ON title + subtitle rather than on an id threaded down from five
  // call sites. `jobRecordProps` makes those the customer's name and the job's
  // date and time, so two different jobs cannot collide, and a client record's
  // name + phone is unique by construction. The key is what makes React mount
  // a NEW node, which is what re-runs the animation — a class alone would sit
  // there already-played.
  //
  // THE CLOSE BUTTON IS OUTSIDE THE SWAP on purpose: it does not change, and a
  // control that dissolves under the pointer that is about to press it reads
  // as a glitch.
  const swapKey = `${title}|${subtitle}`;

  return (
    <aside className={`col-2 record${bare ? " bare" : ""}${leaving ? " leaving" : ""}`} aria-label={title}>
      <div className="row between" style={{ alignItems: "flex-start", gap: "var(--sp-3)" }}>
        <div className="swap" key={`h-${swapKey}`} style={{ minWidth: 0 }}>
          {title && <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h2>}
          {subtitle && <p className="quiet" style={{ marginTop: 2 }}>{subtitle}</p>}
        </div>
        <button className="x" aria-label="Close" onClick={close}><X size={18} strokeWidth={2} /></button>
      </div>
      <div className="record-body swap" key={`b-${swapKey}`}>{children}</div>
      {footer}
    </aside>
  );
}
