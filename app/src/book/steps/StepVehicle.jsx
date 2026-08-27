// Step 2 — vehicle size and add-ons.
//
// Sizes are offered only when the chosen services actually price them
// differently: a business whose services have zero size adjustments never
// sees a question it has no answer for.

import { money } from "../../lib/format.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

const SIZES = [
  ["small", "Small", "Coupe, sedan, hatchback"],
  ["medium", "Medium", "Small SUV, crossover, wagon"],
  ["large", "Large", "Truck, large SUV, van"],
];

export default function StepVehicle({ form, setForm, selectedServices }) {
  const { addOns } = useBookingBusiness();

  // The extra a size costs across the chosen services (0 when unconfigured).
  const sizeExtra = (size) =>
    selectedServices.reduce(
      (sum, s) => sum + (Number(s.vehicle_size_adjustments?.[size]?.price) || 0),
      0,
    );
  const sizesMatter = SIZES.some(([k]) => sizeExtra(k) !== 0);

  const toggleAddOn = (id) =>
    setForm((f) => ({
      ...f,
      addOns: f.addOns.includes(id) ? f.addOns.filter((x) => x !== id) : [...f.addOns, id],
    }));

  return (
    <>
      {sizesMatter ? (
        <>
          <p className="bk-muted" style={{ marginBottom: 12 }}>
            Bigger vehicles take longer, so pricing varies.
          </p>
          {SIZES.map(([key, label, examples]) => {
            const extra = sizeExtra(key);
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                className={`bk-card selectable ${form.vehicleSize === key ? "selected" : ""}`}
                onClick={() => setForm((f) => ({ ...f, vehicleSize: key }))}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setForm((f) => ({ ...f, vehicleSize: key })); } }}
              >
                <div className="bk-row between">
                  <div>
                    <h3>{label}</h3>
                    <p className="bk-muted">{examples}</p>
                  </div>
                  <span className="bk-price">{extra > 0 ? `+${money(extra)}` : "Included"}</span>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <p className="bk-muted" style={{ marginBottom: 12 }}>
          One price for every vehicle.
        </p>
      )}

      <label className="bk-field" style={{ marginTop: 14 }}>
        <span>What are you bringing? (optional)</span>
        <input
          value={form.vehicleModel}
          placeholder="e.g. 2019 Honda Civic"
          onChange={(e) => setForm((f) => ({ ...f, vehicleModel: e.target.value }))}
        />
      </label>

      {addOns.length > 0 && (
        <>
          <div className="bk-step-label" style={{ marginTop: 20 }}>Add extras</div>
          {addOns.map((a) => {
            const on = form.addOns.includes(a.id);
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                className={`bk-card selectable ${on ? "selected" : ""}`}
                onClick={() => toggleAddOn(a.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAddOn(a.id); } }}
              >
                <div className="bk-row between">
                  <div>
                    <h3>{a.name}</h3>
                    {a.description && <p className="bk-muted">{a.description}</p>}
                  </div>
                  <span className="bk-price">+{money(a.price)}</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
