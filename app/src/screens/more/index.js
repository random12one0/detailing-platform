// key -> [component, title]. Two doors need the same map.
//
// Roadmap 2.11 step 6, stage 6. `More.jsx` used to hold this inline, and it
// was the only door. The screen split in two — Business carries what changes
// what a CUSTOMER meets, the header gear carries the plumbing — and a map one
// of them imports from the other is a worse shape than a file that just holds
// it (component inventory §3c).
//
// TWELVE, NOT THIRTEEN, and the missing one is the FAQ. Its storage landed in
// the same change (`20260902001000_faq_storage.sql`) and its screen waits,
// which is the owner's own split. A row that opens nothing is the exact defect
// this stage is repairing on the push switch, so there is no FAQ row until
// there is a FAQ screen.

import BusinessInfo from "./BusinessInfo.jsx";
import Appearance from "./Appearance.jsx";
import Gallery from "./Gallery.jsx";
import Reviews from "./Reviews.jsx";
import Catalog from "./Catalog.jsx";
import Promos from "./Promos.jsx";
import Hours from "./Hours.jsx";
import BookingRules from "./BookingRules.jsx";
import Notifications from "./Notifications.jsx";
import MessageTemplates from "./MessageTemplates.jsx";
import Team from "./Team.jsx";
import Preferences from "./Preferences.jsx";
import SwitchBusiness from "./SwitchBusiness.jsx";

export const SCREENS = {
  info: [BusinessInfo, "Business info"],
  appearance: [Appearance, "Your colour"],
  gallery: [Gallery, "Photo gallery"],
  reviews: [Reviews, "Reviews"],
  catalog: [Catalog, "Services & add-ons"],
  promos: [Promos, "Promo codes & sale"],
  hours: [Hours, "Hours & days off"],
  rules: [BookingRules, "Booking rules"],
  notifications: [Notifications, "Notifications"],
  templates: [MessageTemplates, "Message templates"],
  team: [Team, "Team"],
  preferences: [Preferences, "This device"],
  // A picker, not a form — it does not share the settings skeleton and is not
  // one of the twelve. It is only ever offered when the account has more than
  // one membership (component inventory §3f).
  switch: [SwitchBusiness, "Switch business"],
};
