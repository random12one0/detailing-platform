// Step 3 — mobile or drop-off, and where.
//
// Entirely settings-driven: a mobile-only business never sees drop-off, a
// drop-off-only business never sees the address field, and the water and
// power questions appear only where the business asks for them.
//
// W22 (roadmap 2.8b) SPLIT ONE BOOLEAN INTO TWO SETTINGS WITH THREE STATES.
// The owner asked for "optional per detailer, an electricity-only mode, and
// an option that blocks the booking if the customer can't supply what that
// detailer needs" — and the research found his premise was backwards: most
// working detailers DO use the customer's tap and outlet, so asking is the
// norm and what varies is which resource and what "no" means.
//
//   not_needed  they bring their own — the customer is never asked
//   ask         ask and record it, so they know what to load in the van
//   required    ask, and the booking is BLOCKED on "no"
//
// Water and power vary independently: the coating specialist needs power and
// brings water; the rinseless detailer needs neither. One boolean could never
// say that.
//
// THE CONSEQUENCE IS STATED BEFORE THEY ANSWER, and the block itself is on
// the server (`_shared/slotValidation.ts`). Roadmap 2.7's W4 found a live hole
// of exactly this shape — a restriction printed on the page that nothing on
// the way in ever read.

import { useBookingBusiness } from "../BookingBusinessContext.jsx";
import { money } from "../../lib/format.js";

// `modeLimit` IS A PROP AND WAS NOT TAKEN — the booking page threw
// `ReferenceError: modeLimit is not defined` for every business offering only
// ONE of mobile and drop-off, which is a total booking outage for that tenant.
// Found by roadmap 2.5's smoke test on the mobile-only seed, 2026-09-04; live
// on `main` since 2026-08-31 (1ed5084, roadmap 2.8c), and invisible until now
// because the demo enables both modes, so nothing in the repo ever rendered
// the branch below.
//
// AND THE SAME LINE HID THE OTHER HALF. `both` was computed here WITHOUT
// `modeLimit`, while BookingPage's own `bothModes` includes it and feeds the
// step's heading. So a business with both modes on and a service that allows
// only one got the heading for a narrowed step and the two choice cards
// anyway — and the "which service decided" message this file was written to
// print was unreachable in every configuration that did not crash.
export default function StepLocation({ form, setForm, modeLimit }) {
  const { settings, business } = useBookingBusiness();
  const both = settings.mobile_enabled && settings.dropoff_enabled && !modeLimit;
  const isMobile = form.serviceType === "mobile";

  return (
    <>
      {/* THE STEP HEADING ALREADY ASKS THE QUESTION. “Where should we do it?”
          sat directly above “How would you like this done?”, which is the same
          sentence twice and 19px plus a 26px gap of a step that overflowed a
          phone by 6px once the travel areas landed on it. Same cut, same
          reason, as step 1’s intro in roadmap 2.8b. */}
      {both ? (
        <>
          <div
            role="button" tabIndex={0}
            className={`bk-card selectable ${isMobile ? "selected" : ""}`}
            onClick={() => setForm((f) => ({ ...f, serviceType: "mobile" }))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setForm((f) => ({ ...f, serviceType: "mobile" })); } }}
          >
            <div className="bk-row between">
              <h3>We come to you</h3>
              {/* ROADMAP 2.8c — ONLY when there are no travel areas. With areas
                  set, the fee comes from the one the customer picks (0 here, 40
                  there) and this flat number is simply a different, wrong price
                  printed above the right one. */}
              {settings.travel_zones.length === 0 && settings.travel_fee > 0 && (
                <span className="bk-price">+{money(settings.travel_fee)}</span>
              )}
            </div>
            <p className="bk-muted">
              We bring everything to your home or work
              {business.service_area ? ` in ${business.service_area}` : ""}.
            </p>
          </div>
          <div
            role="button" tabIndex={0}
            className={`bk-card selectable ${!isMobile ? "selected" : ""}`}
            onClick={() => setForm((f) => ({ ...f, serviceType: "dropoff" }))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setForm((f) => ({ ...f, serviceType: "dropoff" })); } }}
          >
            <h3>Drop it off</h3>
            <p className="bk-muted">
              {business.dropoff_address
                ? `Bring your vehicle to ${business.dropoff_address}.`
                : "Bring your vehicle to us — we’ll confirm the address."}
            </p>
          </div>
        </>
      ) : (
        <div className="bk-note">
          {/* When it is the SERVICE that decided, say which one. A choice that
              silently disappears reads as a broken form, and the same service
              is what the server names if the rule is ever reached. */}
          {modeLimit && (
            <strong style={{ display: "block", marginBottom: 4 }}>
              {modeLimit.only === "dropoff"
                ? `${modeLimit.because} has to be done at our place.`
                : `${modeLimit.because} is only done at your address.`}
            </strong>
          )}
          {isMobile
            ? `${business.name} comes to you${business.service_area ? ` — serving ${business.service_area}` : ""}.`
            : business.dropoff_address
              ? `Drop your vehicle at ${business.dropoff_address}.`
              : "Drop-off only — we’ll confirm the address with you."}
        </div>
      )}

      {isMobile && (
        <>
          {/* ROADMAP 2.8c — TRAVEL AREAS. The research found the trade’s own
              software prices travel by territory; we had one flat fee. This is
              NOT geocoded distance — we have no way to measure one — it is the
              detailer’s own areas in their own words, which is how a small
              mobile business actually quotes it. A detailer with no areas set
              never sees this, and their flat fee applies as before. */}
          {settings.travel_zones.length > 0 && (
            <label className="bk-field" style={{ marginTop: 14 }}>
              <span>Which area are you in?</span>
              {/* Mapped, so it is a list of unknown length rather than a
                  two-to-four choice — the case a drop-down is for
                  (composition.test.mjs test 2). */}
              <select value={form.travelZone}
                onChange={(e) => setForm((f) => ({ ...f, travelZone: e.target.value }))}>
                {settings.travel_zones.map((z) => (
                  <option key={z.key} value={z.key}>
                    {z.name}{Number(z.fee) > 0 ? ` — +${money(z.fee)}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="bk-field" style={{ marginTop: 14 }}>
            <span>Where should we come?</span>
            <input
              value={form.customerAddress}
              placeholder="Street address, city"
              onChange={(e) => setForm((f) => ({ ...f, customerAddress: e.target.value }))}
            />
          </label>

          <Resource
            need={settings.water_requirement}
            checked={form.hasWater}
            onChange={(v) => setForm((f) => ({ ...f, hasWater: v }))}
            label="I can provide access to a water tap"
            required="Without it we can't do this job at your address."
            // The "either way" line is the same sentence for both resources,
            // so it is printed under the FIRST one that is merely asked about
            // and not repeated. A `required` line is specific to its own
            // resource and always shows.
            optional={settings.water_requirement === "ask" ? ASK_HELP : null}
          />
          <Resource
            need={settings.power_requirement}
            checked={form.hasPower}
            onChange={(v) => setForm((f) => ({ ...f, hasPower: v }))}
            label="I can provide access to a power outlet"
            required="Without it we can't do this job at your address."
            optional={settings.water_requirement === "ask" ? null : ASK_HELP}
          />
        </>
      )}
    </>
  );
}

const ASK_HELP = "Let us know either way — it just changes what we bring.";

// One resource, one question. 'not_needed' draws nothing at all — a question
// whose answer changes nothing is a question that should not be asked.
function Resource({ need, checked, onChange, label, required, optional }) {
  if (need === "not_needed") return null;
  const help = need === "required" ? required : optional;
  return (
    <label className="bk-row" style={{ gap: 10, alignItems: "flex-start", marginTop: 4 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {help && <span className="bk-muted" style={{ display: "block" }}>{help}</span>}
      </span>
    </label>
  );
}
