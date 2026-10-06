// ROADMAP 6.4 (d) — TOMORROW ON PAPER, AND IT NEEDS NO NETWORK TO MAKE.
//
// The outage fallback the item asks for: a driveway with no signal, and the
// next day's jobs with the phone numbers and addresses on a page or in a PDF.
// Everything printed is read off the `bookings` Today ALREADY HOLDS in memory
// (it loads a fortnight), so pressing the button makes no request at all —
// which is the only way it can work at the moment it is needed. The browser's
// print dialog is also its "Save as PDF", so printed and saved are one button.
//
// TWO COPIES OF THE SAME TABLE, ON PURPOSE. The sheet is the on-screen preview
// and sits inside `#root`; the print copy is a portal on `<body>` so the
// print rules can hide the whole app (`body.printing-schedule #root`) and
// leave only the page. theme.css § "TOMORROW ON PAPER" holds both rules.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { useBusiness } from "../context/BusinessContext.jsx";
import { phone, time12 } from "../lib/format.js";
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

function Table({ jobs }) {
  return (
    <table className="sched-table">
      <thead>
        <tr>
          <th>{t("Time")}</th><th>{t("Customer")}</th><th>{t("Phone")}</th>
          <th>{t("Where")}</th><th>{t("Job")}</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((b) => {
          const cars = [b.vehicle_model || b.vehicle_size_label,
            ...(b.vehicles ?? []).map((v) => v.vehicle_model || v.vehicle_size_label)].filter(Boolean);
          const what = [...(b.services ?? []).map((s) => s.name_at_booking), ...cars].filter(Boolean).join(" · ");
          return (
            <tr key={b.id}>
              <td className="num">{time12(b.start_time)}–{time12(b.end_time)}</td>
              <td><strong>{b.customer_name}</strong></td>
              <td className="num">{phone(b.customer_phone)}</td>
              <td>{b.customer_address || t(b.service_type === "mobile" ? "Mobile" : "Drop-off")}</td>
              <td>
                {what}
                {b.customer_notes && <div className="sched-note">{b.customer_notes}</div>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function SchedulePrint({ jobs, title, dateLabel, onClose }) {
  useAppLocale();
  const { business } = useBusiness();
  const [stamp] = useState(() => new Date().toLocaleString());

  // The class is the whole mechanism, so it must never outlive the dialog:
  // `afterprint` clears it, and so does leaving the sheet mid-print.
  useEffect(() => {
    const off = () => document.body.classList.remove("printing-schedule");
    window.addEventListener("afterprint", off);
    return () => { window.removeEventListener("afterprint", off); off(); };
  }, []);

  const print = () => {
    document.body.classList.add("printing-schedule");
    window.print();
  };

  return (
    <>
      <Sheet onClose={onClose} title={title} subtitle={dateLabel} peek={78}>
        <Table jobs={jobs} />
        <button className="btn primary" onClick={print}>
          <Printer size={18} strokeWidth={2} /> {t("Print or save as PDF")}
        </button>
      </Sheet>
      {createPortal(
        <div className="sched-print">
          <h1>{business.name} · {dateLabel}</h1>
          <p className="sched-stamp">{t("Printed {when}", { when: stamp })}</p>
          <Table jobs={jobs} />
        </div>,
        document.body,
      )}
    </>
  );
}
