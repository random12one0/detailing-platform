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
  // IDEA 11 — WHAT TO LOAD IN THE VAN, on the row rather than only inside the
  // record. The owner: *"Before I had it so they needed to click it, so
  // there's no point showing me if they have water… but yeah, we should add
  // that — even if someone sets it to the setting that makes it so water and
  // power has to be on, you can still show it."*
  //
  // **IT PASSES HIS OWN COPY RULE.** *Mobile* already says the job is at their
  // address; this says what is NOT there when you arrive, which is a fact the
  // row does not otherwise carry and the one that costs a second trip.
  //
  // **IT LEADS THE SUB-LINE INSTEAD OF TRAILING IT**, because `.row-item .sub`
  // is `nowrap` with an ellipsis — the rule that silently deleted the twelve-
  // month commitment off a phone in roadmap 2.20. Appended, this is the first
  // thing truncation eats; leading, it is the last.
  const bring = booking.service_type === "mobile"
    ? [booking.has_water === false ? "water" : null, booking.has_power === false ? "power" : null].filter(Boolean)
    : [];
  // ROADMAP 8.10 — HOW MANY CARS, AND IT LEADS FOR THE SAME REASON `bring`
  // DOES. `.row-item .sub` is nowrap with an ellipsis, so anything appended is
  // the first thing truncation eats — and *3 cars* is the fact that decides
  // how the day is planned. A single-car job says nothing, which is every job
  // this product has ever had.
  //
  // A DEALERSHIP JOB SAYS IT TOO. `bulk_vehicle_count` is the logged bulk
  // count and it reads exactly the same way to somebody scanning the day.
  const cars = Number(booking.bulk_vehicle_count) || (1 + ((booking.vehicles ?? []).length));
  return (
    <button className={`row-item${node ? ` ${node}` : ""}`} onClick={onClick}>
      <span className="txt">
        <span className="nm">
          <span className="t">{time12(booking.start_time)}</span>{booking.customer_name}
        </span>
        <span className="sub">
          {[
            cars > 1 ? `${cars} cars` : null,
            bring.length ? `Bring ${bring.join(" and ")}` : null,
            ...services,
            where,
          ].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="figure sm">{money(booking.final_amount ?? booking.total_price)}</span>
    </button>
  );
}
