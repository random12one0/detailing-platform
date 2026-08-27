import { useState } from "react";
import { useBusiness } from "../context/BusinessContext.jsx";
import BusinessInfo from "./more/BusinessInfo.jsx";
import BookingRules from "./more/BookingRules.jsx";
import Hours from "./more/Hours.jsx";
import Catalog from "./more/Catalog.jsx";
import Promos from "./more/Promos.jsx";
import Gallery from "./more/Gallery.jsx";

const SECTIONS = [
  ["info", "Business info & branding", BusinessInfo],
  ["rules", "Booking rules", BookingRules],
  ["hours", "Hours & days off", Hours],
  ["catalog", "Services & add-ons", Catalog],
  ["promos", "Promo codes", Promos],
  ["gallery", "Photo gallery", Gallery],
];

export default function More() {
  const { business, signOut } = useBusiness();
  const [open, setOpen] = useState(null);

  return (
    <>
      {SECTIONS.map(([key, label, El]) => (
        <div key={key}>
          <div className="card tappable row between" onClick={() => setOpen(open === key ? null : key)}>
            <strong>{label}</strong>
            <span className="muted">{open === key ? "▾" : "›"}</span>
          </div>
          {open === key && (
            <div style={{ padding: "0 2px 8px" }}>
              <El />
            </div>
          )}
        </div>
      ))}

      <div className="section-title">Account</div>
      <p className="muted" style={{ marginBottom: 8 }}>
        Signed in to {business.name} · your public booking page: detailplatform.com/{business.slug}
      </p>
      <button className="btn" onClick={signOut}>Sign out</button>
    </>
  );
}
