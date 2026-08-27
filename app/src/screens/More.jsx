import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useBusiness } from "../context/BusinessContext.jsx";
import BusinessInfo from "./more/BusinessInfo.jsx";
import BookingRules from "./more/BookingRules.jsx";
import Hours from "./more/Hours.jsx";
import Catalog from "./more/Catalog.jsx";
import Promos from "./more/Promos.jsx";
import Gallery from "./more/Gallery.jsx";
import Appearance from "./more/Appearance.jsx";
import Team from "./more/Team.jsx";
import Notifications from "./more/Notifications.jsx";
import MessageTemplates from "./more/MessageTemplates.jsx";

// ownerOnly mirrors the database policies: a staff session cannot read
// business_settings, promo_codes or team data even if it reached these
// screens, so they are not offered.
const SECTIONS = [
  ["info", "Business info & branding", BusinessInfo, true],
  ["rules", "Booking rules", BookingRules, true],
  ["hours", "Hours & days off", Hours, true],
  ["catalog", "Services & add-ons", Catalog, true],
  ["promos", "Promo codes & sale", Promos, true],
  ["notifications", "Notifications", Notifications, true],
  ["templates", "Message templates", MessageTemplates, true],
  ["gallery", "Photo gallery", Gallery, true],
  ["team", "Team & access", Team, true],
  ["appearance", "Appearance & theme", Appearance, false],
];

export default function More() {
  const { business, role, signOut } = useBusiness();
  const [open, setOpen] = useState(null);
  const sections = SECTIONS.filter(([, , , ownerOnly]) => role === "owner" || !ownerOnly);

  return (
    <>
      {sections.map(([key, label, El]) => (
        <div key={key}>
          <div className="card tappable row between" onClick={() => setOpen(open === key ? null : key)}>
            <strong>{label}</strong>
            {open === key ? <ChevronDown size={18} strokeWidth={1.75} color="var(--text-muted)" /> : <ChevronRight size={18} strokeWidth={1.75} color="var(--text-muted)" />}
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
        Signed in to {business.name} as {role === "owner" ? "an owner" : "staff"}.
        {role === "owner" ? ` Public booking page: detailplatform.com/${business.slug}` : ""}
      </p>
      <button className="btn" onClick={signOut}>Sign out</button>
    </>
  );
}
