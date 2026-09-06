// key -> [component, title]. Two doors need the same map.
//
// Roadmap 2.11 step 6, stage 6. `More.jsx` used to hold this inline, and it
// was the only door. The screen split in two — Business carries what changes
// what a CUSTOMER meets, the header gear carries the plumbing — and a map one
// of them imports from the other is a worse shape than a file that just holds
// it (component inventory §3c).
//
// FIFTEEN AS OF ROADMAP 2.20 STAGE 2 — "Your subscription" joined the GEAR,
// not Business, and that is the admission test working rather than a
// coincidence: a card on file changes nothing a customer ever meets. It is
// also the only one of the fifteen that is owner-only rather than
// permission-gated, for the reason 2.13 refused a `team` tick — whoever can
// change what the business PAYS can change everything.
//
// FOURTEEN AS OF ROADMAP 2.20 — "How you get paid" joined under "What you
// sell". Every handle typed on it is printed in a customer's email and
// nowhere else, which is Business's admission test passed outright.
//
// EIGHTEEN AS OF ROADMAP 4.2 — "Campaign links" joined under "Your page". It
// is a feature the rebuild LOST rather than a new one: `campaigns`,
// `campaign_visits` and `track-visit` all survived the conversion with
// nothing calling them, which is how three empty tables got counted as kept.
// *A surviving table is not a surviving feature.*
//
// SEVENTEEN AS OF ROADMAP 3.3 — "Your web address" joined under "Your page".
// `business_domains` had existed since the first tenant migration with no
// reader and no writer at all; this is the writer. It is on Business rather
// than the gear because what it changes is the address a CUSTOMER meets, in
// their own confirmation email.
//
// SIXTEEN AS OF ROADMAP 3.2(b) — "Common questions" joined under "Your page",
// and it is the one this file has carried a note about since stage 6. The
// storage landed then with no writer and no reader on purpose (the owner's
// own split); what turned the wait into a GAP is contract §6b — a tenant site
// draws an FAQ section, so 3.2(b) had to publish the column on the public
// profile anyway, and a column a site can read that a detailer cannot fill in
// is the same defect as a row that opens nothing, one level down.
//
// THIRTEEN AS OF ROADMAP 2.14 — "Monthly plans" joined under "What you sell",
// because a plan is an offer with a price and that is the same admission test
// the catalog passes.

import BusinessInfo from "./BusinessInfo.jsx";
import Appearance from "./Appearance.jsx";
import Gallery from "./Gallery.jsx";
import Reviews from "./Reviews.jsx";
import Faq from "./Faq.jsx";
import WebAddress from "./WebAddress.jsx";
import Campaigns from "./Campaigns.jsx";
import Catalog from "./Catalog.jsx";
import Promos from "./Promos.jsx";
import Plans from "./Plans.jsx";
import Payments from "./Payments.jsx";
import Billing from "./Billing.jsx";
import Hours from "./Hours.jsx";
import BookingRules from "./BookingRules.jsx";
import Notifications from "./Notifications.jsx";
import MessageTemplates from "./MessageTemplates.jsx";
import Team from "./Team.jsx";
import Preferences from "./Preferences.jsx";
import Password from "./Password.jsx";
import Maintenance from "./Maintenance.jsx";
import SwitchBusiness from "./SwitchBusiness.jsx";

export const SCREENS = {
  info: [BusinessInfo, "Business info"],
  appearance: [Appearance, "Your colour"],
  gallery: [Gallery, "Photo gallery"],
  reviews: [Reviews, "Reviews"],
  faq: [Faq, "Common questions"],
  domain: [WebAddress, "Your web address"],
  campaigns: [Campaigns, "Campaign links"],
  catalog: [Catalog, "Services & add-ons"],
  promos: [Promos, "Promo codes & sale"],
  plans: [Plans, "Monthly plans"],
  maintenance: [Maintenance, "Maintenance deadlines"],
  payments: [Payments, "How you get paid"],
  hours: [Hours, "Hours & days off"],
  rules: [BookingRules, "Booking rules"],
  notifications: [Notifications, "Notifications"],
  templates: [MessageTemplates, "Message templates"],
  team: [Team, "Team"],
  billing: [Billing, "Your subscription"],
  password: [Password, "Your password"],
  preferences: [Preferences, "This device"],
  // A picker, not a form — it does not share the settings skeleton and is not
  // one of the twelve. It is only ever offered when the account has more than
  // one membership (component inventory §3f).
  switch: [SwitchBusiness, "Switch business"],
};
