// The settings hub.
//
// It was ten identical accordion rows in one flat list — no sense of which
// you touch weekly and which you set once, and nothing readable without
// opening it. Two changes:
//
//   GROUPED by the question being asked, in roughly the order a detailer
//   thinks about their business: who I am, what I sell, when I work, what
//   gets sent, who else can get in.
//
//   EVERY ROW ANSWERS ITSELF. "Mon–Fri, 9:00 AM – 5:00 PM" under Hours,
//   "7 services · 2 add-ons" under Catalogue. Most visits to this screen are
//   to CHECK something, not change it, and those visits now cost no taps.
//
// Each one opens as the same bottom sheet everything else in the app uses,
// rather than expanding in place and pushing the rest of the list around.

import { useCallback, useEffect, useState } from "react";
import {
  Bell, CalendarClock, ChevronRight, Images, LogOut, MessageSquare,
  Palette, Smartphone, Store, Tag, Users, Wrench,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import Sheet from "../components/Sheet.jsx";
import BookingLink from "../components/BookingLink.jsx";
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
import Preferences from "./more/Preferences.jsx";
import { detectPlatform, loadPrefs, PLATFORMS } from "../lib/platform.js";
import { brandVarsFor } from "../lib/theme.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const time12 = (t) => {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Collapse the open days into something a person would say: consecutive
// weekdays become a range, and identical hours are stated once.
function describeHours(rows) {
  const open = (rows ?? []).filter((r) => r.open_time).sort((a, b) => a.weekday - b.weekday);
  if (open.length === 0) return "No days set — nobody can book";
  const same = open.every((r) => r.open_time === open[0].open_time && r.close_time === open[0].close_time);
  const days = open.map((r) => r.weekday);
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const label = consecutive && days.length > 1
    ? `${DAYS[days[0]]}–${DAYS[days[days.length - 1]]}`
    : days.map((d) => DAYS[d]).join(", ");
  return same
    ? `${label} · ${time12(open[0].open_time)} – ${time12(open[0].close_time)}`
    : `${label} · hours vary`;
}

// The device row answers itself like every other row: what it will open.
const MAPS_NAME = { apple: "Apple Maps", google: "Google Maps", waze: "Waze" };
const CAL_NAME = { ics: "calendar file", google: "Google Calendar" };
function describeDevice() {
  const p = loadPrefs();
  const where = detectPlatform() === PLATFORMS.IOS ? "iPhone"
    : detectPlatform() === PLATFORMS.ANDROID ? "Android" : "this computer";
  return `${where} · ${MAPS_NAME[p.maps] ?? "Maps"} · ${CAL_NAME[p.calendar] ?? "Calendar"}`;
}

const humanNotice = (mins) => {
  if (!mins) return "no notice needed";
  if (mins % 1440 === 0) return `${mins / 1440} day${mins / 1440 > 1 ? "s" : ""} notice`;
  if (mins % 60 === 0) return `${mins / 60} hour${mins / 60 > 1 ? "s" : ""} notice`;
  return `${mins} min notice`;
};

export default function More() {
  const { business, settings, branding, role, signOut } = useBusiness();
  const [open, setOpen] = useState(null);
  const [counts, setCounts] = useState(null);

  // One round trip for every summary line on the screen.
  const load = useCallback(async () => {
    const [h, s, a, p, g, t] = await Promise.all([
      supabase.from("business_hours").select("weekday,open_time,close_time").eq("business_id", business.id),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("add_ons").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("promo_codes").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("gallery_images").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      // business_users is keyed (business_id, user_id) and has NO id column,
      // so select("id") 400s — and a failed count renders as a confident
      // "0 people", which is worse than showing nothing.
      supabase.from("business_users").select("user_id", { count: "exact", head: true }).eq("business_id", business.id),
    ]);
    // A null count means the query failed. Keep it null so the row shows a
    // dash rather than asserting zero — a wrong "0 people" reads as a real
    // answer and sent me looking for a missing owner that was always there.
    setCounts({
      hours: describeHours(h.data),
      services: s.count, addOns: a.count,
      promos: p.count, photos: g.count, team: t.count,
    });
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const emailsOn = settings
    ? ["email_customer_confirmation", "email_customer_reminder", "email_customer_followup",
       "email_owner_new_booking", "email_owner_reminder"].filter((k) => settings[k] !== false).length
    : null;

  const mode = settings?.mobile_enabled && settings?.dropoff_enabled ? "Mobile & drop-off"
    : settings?.mobile_enabled ? "Mobile only"
      : settings?.dropoff_enabled ? "Drop-off only" : "Nothing offered";

  const n = (v, one, many) => (v === null || v === undefined ? "—" : `${v} ${v === 1 ? one : many}`);

  const GROUPS = [
    ["Your business", [
      ["info", "Business info", Store, business.name, true],
      // A hex code as the summary reads like something a developer forgot
      // to finish. The colour itself says it in one glance. Renamed from
      // "Appearance / Colour and theme" in roadmap 2.3: there is no theme to
      // choose any more, and the colour is customer-facing only (law 11), so
      // the row now says where it lands.
      /* "Everywhere" is literal since law 11 was rewritten (2026-08-30): the
         colour paints the booking page, the website AND this dashboard. It
         used to read "Shown on your booking page", which is now a half-truth. */
      ["appearance", "Your colour", Palette, "Used everywhere, including here", false,
        branding?.primary_color ?? null],
    ]],
    ["What you sell", [
      ["catalog", "Services & add-ons", Wrench,
        counts ? `${n(counts.services, "service", "services")} · ${n(counts.addOns, "add-on", "add-ons")}` : "…", true],
      ["promos", "Promo codes & sale", Tag,
        counts ? (settings?.site_discount_active
          ? `Site sale on · ${n(counts.promos, "code", "codes")}`
          : n(counts.promos, "active code", "active codes")) : "…", true],
      ["gallery", "Photo gallery", Images,
        counts ? n(counts.photos, "photo", "photos") : "…", true],
    ]],
    ["When you work", [
      ["hours", "Hours & days off", CalendarClock, counts ? counts.hours : "…", true],
      ["rules", "Booking rules", Store,
        settings ? `${mode} · ${humanNotice(settings.min_advance_minutes)}` : "…", true],
    ]],
    ["What gets sent", [
      ["notifications", "Notifications", Bell,
        emailsOn === null ? "…" : `${emailsOn} of 5 emails on`, true],
      ["templates", "Message templates", MessageSquare, "Texts you send from a job", true],
    ]],
    ["Access", [
      ["team", "Team", Users, counts ? n(counts.team, "person", "people") : "…", true],
    ]],
    ["This device", [
      ["preferences", "Maps, calendar & contacts", Smartphone, describeDevice(), false],
    ]],
  ];

  const SCREENS = {
    info: [BusinessInfo, "Business info"],
    appearance: [Appearance, "Your colour"],
    catalog: [Catalog, "Services & add-ons"],
    promos: [Promos, "Promo codes & sale"],
    gallery: [Gallery, "Photo gallery"],
    hours: [Hours, "Hours & days off"],
    rules: [BookingRules, "Booking rules"],
    notifications: [Notifications, "Notifications"],
    templates: [MessageTemplates, "Message templates"],
    team: [Team, "Team"],
    preferences: [Preferences, "This device"],
  };

  const Active = open ? SCREENS[open][0] : null;

  return (
    <div className="group">
      <div>
        <h1 className="display">Settings</h1>
        <p className="quiet" style={{ marginTop: 2 }}>{business.name}</p>
      </div>

      {GROUPS.map(([title, rows]) => {
        const visible = rows.filter(([, , , , ownerOnly]) => role === "owner" || !ownerOnly);
        if (visible.length === 0) return null;
        return (
          <div className="tight" key={title}>
            <span className="label">{title}</span>
            <div className="card setting-card">
              {visible.map(([key, name, Icon, now, , swatch]) => (
                <button className="nav-row" key={key} onClick={() => setOpen(key)}>
                  <span className="ico">
                    {/* The CORRECTED colour, not the raw one out of the
                        database: this row is a summary of a setting, and the
                        setting's effect is what the customer sees on the
                        booking page after lib/theme.js has nudged it to stay
                        legible. Showing the raw hex would make the row lie
                        about a colour that had to be adjusted. */}
                    {swatch
                      ? <span className="swatch" style={{ background: brandVarsFor(swatch)["--bk-accent"] }} />
                      : <Icon size={19} strokeWidth={2} />}
                  </span>
                  <span className="txt">
                    <span className="name">{name}</span>
                    <span className="now">{now}</span>
                  </span>
                  <span className="chev"><ChevronRight size={18} strokeWidth={2} /></span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {role === "owner" && <BookingLink slug={business.slug} />}

      <div className="tight">
        <span className="label">Account</span>
        <div className="card">
          <div className="thoughts">
            <div>
              <div className="body">
                Signed in as {role === "owner" ? "an owner" : "staff"}.
              </div>

            </div>
            <button className="btn" onClick={signOut}>
              <LogOut strokeWidth={2} /> Sign out
            </button>
          </div>
        </div>
      </div>

      {open && (
        <Sheet
          onClose={() => { setOpen(null); load(); }}
          title={SCREENS[open][1]}
          peek={88}
        >
          <Active />
        </Sheet>
      )}
    </div>
  );
}
