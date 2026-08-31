// Public booking context. Hydrated ONCE from the URL slug via the
// get_public_business_profile RPC — one round trip returning only
// public-safe fields for exactly that business. Nothing here is ever
// derived from a client-supplied business id.
//
// Brand color is injected as CSS custom properties scoped to the booking
// page's own root element, run through the SAME contrast correction the
// dashboard uses, so a business can never configure an unreadable page.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { brandVarsFor } from "../lib/theme.js";

const Ctx = createContext(null);
export const useBookingBusiness = () => useContext(Ctx);

// The booking page carries its own fixed ground, independent of any
// dashboard state — a customer arriving from a text message shouldn't
// inherit whatever theme the last dashboard user picked. That argument is
// unchanged; only its conclusion moved. The page was light-first until
// 2026-08-30, when the owner made it DARK like everything else: the page
// claims the booking form is built INTO the detailer's site, and a light
// form sitting inside a dark site breaks that on sight. Reopen in phase 3
// if a bespoke tenant site turns out light. See DECISIONS.md, "The customer
// booking page is dark", and docs/design-system.md, item 2 of "What this
// file does NOT settle".
//
// The ground value still comes from lib/theme.js, so the colour the accent
// is corrected against can never drift from the colour the page paints.

export function BookingBusinessProvider({ slug, children }) {
  const [state, setState] = useState({ status: "loading", profile: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", profile: null, error: null });
    supabase
      .rpc("get_public_business_profile", { p_slug: slug })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setState({ status: "error", profile: null, error: error.message });
        else if (!data) setState({ status: "not_found", profile: null, error: null });
        else setState({ status: "ready", profile: data, error: null });
      });
    return () => { cancelled = true; };
  }, [slug]);

  const profile = state.profile;

  // A customer booking with Riverside should see Riverside in the tab, not
  // the platform's name. index.html can only carry one static title, so the
  // public pages set their own.
  useEffect(() => {
    const name = profile?.business?.name;
    if (name) document.title = name;
  }, [profile]);

  // Derived brand tokens — ONE policy, owned by lib/theme.js.
  const brandVars = useMemo(
    () => brandVarsFor(profile?.branding?.primary_color),
    [profile],
  );

  const value = useMemo(() => {
    const settings = profile?.settings ?? {};
    return {
      status: state.status,
      error: state.error,
      slug,
      business: profile?.business ?? null,
      branding: profile?.branding ?? null,
      // Sensible fallbacks so a half-configured business still renders.
      settings: {
        mobile_enabled: settings.mobile_enabled ?? true,
        dropoff_enabled: settings.dropoff_enabled ?? true,
        ask_water_electric: settings.ask_water_electric ?? true,
        // W22 — two resources, three states each. The fallback is the old
        // boolean's meaning, so a business whose settings row predates the
        // migration still gets the page it had.
        water_requirement: settings.water_requirement
          ?? ((settings.ask_water_electric ?? true) ? "ask" : "not_needed"),
        power_requirement: settings.power_requirement
          ?? ((settings.ask_water_electric ?? true) ? "ask" : "not_needed"),
        ask_vehicle_condition: settings.ask_vehicle_condition ?? true,
        // W9 — the detailer's own list. Falling back to our three keeps a
        // half-configured business bookable.
        vehicle_sizes: Array.isArray(settings.vehicle_sizes) && settings.vehicle_sizes.length
          ? settings.vehicle_sizes
          : [
            { key: "small", label: "Small", examples: "Coupe, sedan, hatchback" },
            { key: "medium", label: "Medium", examples: "Small SUV, crossover, wagon" },
            { key: "large", label: "Large", examples: "Truck, large SUV, van" },
          ],
        slot_interval_minutes: settings.slot_interval_minutes ?? 30,
        travel_fee: settings.travel_fee ?? null,
        // Roadmap 2.8c — the detailer's own travel areas. Empty means the flat
        // travel fee above still applies to every mobile job, which is every
        // tenant on migration day.
        travel_zones: Array.isArray(settings.travel_zones) ? settings.travel_zones : [],
        min_advance_minutes: settings.min_advance_minutes ?? 120,
        google_review_url: settings.google_review_url ?? null,
        yelp_review_url: settings.yelp_review_url ?? null,
      },
      services: profile?.services ?? [],
      // W25 — the categories, each with its own max_select. The booking page
      // groups by these; group_label is the fallback for a service that has
      // no group_id yet.
      serviceGroups: profile?.service_groups ?? [],
      addOns: profile?.add_ons ?? [],
      hours: profile?.hours ?? [],
      testimonials: profile?.testimonials ?? [],
      gallery: profile?.gallery ?? [],
      brandVars,
    };
  }, [state, profile, slug, brandVars]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
