// A job as a LINE — the form a job takes everywhere except the one place it
// is lit.
//
// Lived inside Today.jsx until roadmap 2.11 step 6 stage 3, when the day
// panel needed the same row: "jobs in the day panel are rows, same form as
// §3b — the panel is not the place a job is a card; the job record is"
// (docs/dashboard-phone-pass-2026-08-31.md §6). Two copies of eight lines is
// how one of them gets the fix and the other does not, which this repo has
// already paid for twice.
//
// Two lines at 392 — the same NN/g ceiling History and Clients use — with the
// time and the amount in the figure face (law 8) and the node, when there is
// one, drawn by .dayrail on the left. Tapping it opens the record, which
// carries Call / Text / Navigate in its own pinned bar: the actions are not
// lost, they are where they belong.

import { money, time12 } from "../lib/format.js";

export default function JobRow({ booking, node = "", onClick }) {
  const services = (booking.services ?? []).map((s) => s.name_at_booking).filter(Boolean);
  const where = booking.service_type === "mobile" ? "Mobile" : "Drop-off";
  return (
    <button className={`row-item${node ? ` ${node}` : ""}`} onClick={onClick}>
      <span className="txt">
        <span className="nm">
          <span className="t">{time12(booking.start_time)}</span>{booking.customer_name}
        </span>
        <span className="sub">{[...services, where].join(" · ")}</span>
      </span>
      <span className="figure sm">{money(booking.final_amount ?? booking.total_price)}</span>
    </button>
  );
}
