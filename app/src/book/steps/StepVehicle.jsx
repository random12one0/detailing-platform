// The vehicle: its size, and what it is.
//
// Sizes are offered only when the chosen services actually price them
// differently: a business whose services have zero size adjustments never
// sees a question it has no answer for.
//
// ADD-ONS LEFT THIS STEP in roadmap 2.7 (W19) — they are ./StepExtras.jsx
// now. They were the tallest block on the page: 158px of ruled checklist
// under three boxes and a text field, which is what made this the worst step
// in the flow for W16 (222px past the bottom of a phone, 26% of the screen).

import { money } from "../../lib/format.js";

const SIZES = [
  ["small", "Small", "Coupe, sedan, hatchback"],
  ["medium", "Medium", "Small SUV, crossover, wagon"],
  ["large", "Large", "Truck, large SUV, van"],
];

export default function StepVehicle({ form, setForm, selectedServices }) {
  // The extra a size costs across the chosen services (0 when unconfigured).
  const sizeExtra = (size) =>
    selectedServices.reduce(
      (sum, s) => sum + (Number(s.vehicle_size_adjustments?.[size]?.price) || 0),
      0,
    );
  const sizesMatter = SIZES.some(([k]) => sizeExtra(k) !== 0);

  return (
    <>
      {sizesMatter ? (
        <div className="bk-choices">
          <p className="bk-muted">Bigger vehicles take longer, so pricing varies.</p>
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
        </div>
      ) : (
        <p className="bk-muted">One price for every vehicle.</p>
      )}

      <label className="bk-field">
        <span>What are you bringing? (optional)</span>
        <input
          value={form.vehicleModel}
          placeholder="e.g. 2019 Honda Civic"
          onChange={(e) => setForm((f) => ({ ...f, vehicleModel: e.target.value }))}
        />
      </label>

    </>
  );
}
