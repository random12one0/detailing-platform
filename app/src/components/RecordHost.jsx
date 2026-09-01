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

import { X } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { useWide } from "../hooks/useWide.js";

export default function RecordHost({ open = true, onClose, title, subtitle, children, footer }) {
  const wide = useWide();
  if (!open) return null;

  if (!wide) {
    return (
      <Sheet open onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
        {children}
      </Sheet>
    );
  }

  return (
    <aside className="col-2 record" aria-label={title}>
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
