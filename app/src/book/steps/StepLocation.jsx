// Step 3 — mobile or drop-off, and where.
//
// Entirely settings-driven: a mobile-only business never sees drop-off, a
// drop-off-only business never sees the address field, and the water and
// electric question appears only when the business asks for it.

import { useBookingBusiness } from "../BookingBusinessContext.jsx";
import { money } from "../../lib/format.js";

export default function StepLocation({ form, setForm }) {
  const { settings, business } = useBookingBusiness();
  const both = settings.mobile_enabled && settings.dropoff_enabled;
  const isMobile = form.serviceType === "mobile";

  return (
    <>
      {both ? (
        <>
          <p className="bk-muted" style={{ marginBottom: 12 }}>How would you like this done?</p>
          <div
            role="button" tabIndex={0}
            className={`bk-card selectable ${isMobile ? "selected" : ""}`}
            onClick={() => setForm((f) => ({ ...f, serviceType: "mobile" }))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setForm((f) => ({ ...f, serviceType: "mobile" })); } }}
          >
            <div className="bk-row between">
              <h3>We come to you</h3>
              {settings.travel_fee > 0 && <span className="bk-price">+{money(settings.travel_fee)}</span>}
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
          {isMobile
            ? `${business.name} comes to you${business.service_area ? ` — serving ${business.service_area}` : ""}.`
            : business.dropoff_address
              ? `Drop your vehicle at ${business.dropoff_address}.`
              : "Drop-off only — we’ll confirm the address with you."}
        </div>
      )}

      {isMobile && (
        <>
          <label className="bk-field" style={{ marginTop: 14 }}>
            <span>Where should we come?</span>
            <input
              value={form.customerAddress}
              placeholder="Street address, city"
              onChange={(e) => setForm((f) => ({ ...f, customerAddress: e.target.value }))}
            />
          </label>

          {settings.ask_water_electric && (
            <label className="bk-row" style={{ gap: 10, alignItems: "flex-start", marginTop: 4 }}>
              <input
                type="checkbox"
                checked={form.hasWaterElectric}
                onChange={(e) => setForm((f) => ({ ...f, hasWaterElectric: e.target.checked }))}
              />
              <span>
                I can provide access to water and an outlet
                <span className="bk-muted" style={{ display: "block" }}>
                  Let us know either way — it just changes what we bring.
                </span>
              </span>
            </label>
          )}
        </>
      )}
    </>
  );
}
