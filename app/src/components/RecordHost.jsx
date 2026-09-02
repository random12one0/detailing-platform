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

// `bare` is Clients and only Clients: law 1 makes it the one screen in the
// product with NO PANEL ON IT, and a right-hand card at a desk would end that.
// The record still gets this component — the seam between a sheet and a column
// is exactly what it exists to hide — it just draws no box (screen designs §9).
export default function RecordHost({ open = true, onClose, title, subtitle, children, footer, bare = false }) {
  const wide = useWide();

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
      if (e.key === "Escape" && !document.querySelector(".sheet-backdrop")) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, wide, onClose]);

  if (!open) return null;

  if (!wide) {
    return (
      <Sheet open onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
        {children}
      </Sheet>
    );
  }

  return (
    <aside className={`col-2 record${bare ? " bare" : ""}`} aria-label={title}>
      <div className="row between" style={{ alignItems: "flex-start", gap: "var(--sp-3)" }}>
        <div style={{ minWidth: 0 }}>
          {title && <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h2>}
          {subtitle && <p className="quiet" style={{ marginTop: 2 }}>{subtitle}</p>}
        </div>
        <button className="x" aria-label="Close" onClick={onClose}><X size={18} strokeWidth={2} /></button>
      </div>
      <div className="record-body">{children}</div>
      {footer}
    </aside>
  );
}
