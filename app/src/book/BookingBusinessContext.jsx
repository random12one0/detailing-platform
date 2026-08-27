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
import { contrastRatio, correctAccent, inkFor } from "../lib/theme.js";

const Ctx = createContext(null);
export const useBookingBusiness = () => useContext(Ctx);

// The booking page is always light — it's a public marketing surface, and a
// customer arriving from a text message shouldn't get whatever theme the
// last dashboard user picked.
const PAGE_BG = "#f4f6fa";

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

  // Derived brand tokens — computed once per profile, contrast-corrected.
  const brandVars = useMemo(() => {
    const raw = profile?.branding?.primary_color || "#0ea5e9";
    const accent = correctAccent(raw, "light");
    let ink = inkFor(accent);
    if (contrastRatio(accent, ink) < 4.5) {
      ink = contrastRatio(accent, "#ffffff") > contrastRatio(accent, "#000000") ? "#ffffff" : "#000000";
    }
    return { "--bk-accent": accent, "--bk-accent-ink": ink, "--bk-bg": PAGE_BG };
  }, [profile]);

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
        slot_interval_minutes: settings.slot_interval_minutes ?? 30,
        travel_fee: settings.travel_fee ?? null,
        min_advance_minutes: settings.min_advance_minutes ?? 120,
        google_review_url: settings.google_review_url ?? null,
        yelp_review_url: settings.yelp_review_url ?? null,
      },
      services: profile?.services ?? [],
      addOns: profile?.add_ons ?? [],
      hours: profile?.hours ?? [],
      testimonials: profile?.testimonials ?? [],
      gallery: profile?.gallery ?? [],
      brandVars,
    };
  }, [state, profile, slug, brandVars]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
