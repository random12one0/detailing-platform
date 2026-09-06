// Public booking context. Hydrated ONCE from the URL slug via the
// get_public_business_profile RPC — one round trip returning only
// public-safe fields for exactly that business. Nothing here is ever
// derived from a client-supplied business id.
//
// Brand color is injected as CSS custom properties scoped to the booking
// page's own root element, run through the SAME contrast correction the
// dashboard uses, so a business can never configure an unreadable page.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { bookingTransport } from "../lib/api.js";
import { normalizeProfile } from "./core.js";
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

// ROADMAP 3.3 — `host` is the other way in. Exactly one of `slug` and `host`
// is given: a customer arriving at `/book/:slug` is found by slug, and one
// arriving at `/` on the detailer's own verified address is found by host.
// The RESOLVED profile's own slug is what everything downstream uses, so the
// quote and the submit are identical on both paths — a page that knew its
// business but not its slug would call `calculate-booking` with `undefined`.
export function BookingBusinessProvider({ slug, host, children }) {
  const [state, setState] = useState({ status: "loading", profile: null, error: null });

  // ROADMAP 3.2 — through the headless core's transport, exactly as a tenant
  // site's own form does. The RPC name and its shape are stated in ONE place
  // now; this file just decides what to render while it is in flight.
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", profile: null, error: null });
    (host ? bookingTransport.profileByHost(host) : bookingTransport.profile(slug)).then(
      (data) => {
        if (cancelled) return;
        if (!data) setState({ status: "not_found", profile: null, error: null });
        else setState({ status: "ready", profile: data, error: null });
      },
      (error) => {
        if (!cancelled) setState({ status: "error", profile: null, error: error.message });
      },
    );
    return () => { cancelled = true; };
  }, [slug, host]);

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

  // ROADMAP 3.2 — EVERY FALLBACK MOVED INTO `core.js`'s `normalizeProfile`,
  // unchanged. They are not tidiness: 'reserve' as the booking-mode fallback
  // is what stops an unreadable value making a page promise LESS than the
  // business delivers, and the water/power pair falls back to the old single
  // boolean's meaning so a settings row predating that migration still gets
  // the page it had. A tenant site that re-derives them by hand gets a
  // subtly different page for exactly the businesses least able to spot it.
  //
  // ROADMAP 2.14 STEP 3 — `plans` is an empty array for the great majority of
  // tenants who run none, and every plan surface on this page is gated on
  // `plans.length`, so a business without them sees the page it always saw.
  const value = useMemo(() => ({
    status: state.status,
    error: state.error,
    // The RESOLVED slug wins. On the host path there is no slug in the URL at
    // all, and every write below — the quote, the availability call, the
    // submit — is addressed by slug.
    slug: profile?.business?.slug ?? slug ?? null,
    ...normalizeProfile(profile),
    brandVars,
  }), [state, profile, slug, brandVars]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
