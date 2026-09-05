import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./theme.css";
import { BusinessProvider } from "./context/BusinessContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import App from "./App.jsx";
import JobPage from "./screens/JobPage.jsx";
import AcceptInvite from "./screens/AcceptInvite.jsx";
import BookingPage from "./book/BookingPage.jsx";
import ManageBookingPage from "./book/ManageBookingPage.jsx";
import PlansPage from "./book/PlansPage.jsx";
import PlanMemberPage from "./book/PlanMemberPage.jsx";
import UnsubscribePage from "./book/UnsubscribePage.jsx";
import LandingPage from "./landing/LandingPage.jsx";
import PricingPage from "./landing/PricingPage.jsx";

// DEGRADATION — ONE code path, for the whole app (docs/design-system.md,
// "Degradation"). `.lite` on <html> makes every animation render the end
// state it was travelling to, using the same CSS the animation targets, so
// it cannot drift out of sync with the thing it replaces.
//
// Both ways in route into that one class, and this is why it lives here
// rather than in a stylesheet: prefers-reduced-motion handled as its own
// @media block would be a SECOND implementation, and the second one is the
// one that rots. `?lite=1` is the everything-off state, reachable by hand on
// any page — it is how a slow phone gets checked without a slow phone.
//
// LIVE, not read-once: somebody who turns reduced motion on while the
// dashboard is open gets it without reloading, which is what PRODUCT.md's
// accessibility floor actually promises. `?lite=1` is a MANUAL override and
// outranks the media query — it is checked once, so turning the system
// setting off can never take away the everything-off state somebody asked
// for by hand. Nothing is hidden behind an animation either way — every
// revealable ends at `.in`, so if this file never ran at all the page would
// still read.
{
  const forced = new URLSearchParams(window.location.search).get("lite") === "1";
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const apply = () => document.documentElement.classList.toggle("lite", forced || !!mq?.matches);
  apply();
  mq?.addEventListener("change", apply);
}

// The router is outermost so the PUBLIC routes sit outside BusinessProvider.
// A customer arriving from a text message has no session, no membership and
// no business of their own; wrapping them in the owner's context would make
// the page wait on an auth round trip it can never satisfy, and would apply
// whatever theme the last dashboard user picked on that device. Those pages
// carry their own BookingBusinessProvider, hydrated from the URL slug.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>
        {/* --- Public. No session. ------------------------------------- */}
        {/* detailingplatform.com/ is the marketing site: someone typing the
            domain should meet the product, not a login form. */}
        <Route path="/" element={<LandingPage />} />
        {/* ROADMAP 2.20 STAGE 2. Every plan button on the landing page comes
            here now instead of going straight to the signup form — the
            owner's ask, and also where California's AB 2863 disclosures have
            to live, because they must be clear and conspicuous BEFORE any
            billing detail is asked for. tests/route-contract.test.mjs pins
            that this route exists and that the landing page points at it;
            a plan button that quietly goes back to /app?plan= is the exact
            thing he objected to, and it is one character of drift away. */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/book/:slug" element={<BookingPage />} />
        {/* ROADMAP 2.14 STEP 3. The plans a detailer sells live BESIDE the
            booking flow, never as a step inside it — 7 of 7 sampled detailers
            and 5 of 6 products publish them on a page of their own, and step
            1's spare room is measured at ten pixels. */}
        <Route path="/book/:slug/plans" element={<PlansPage />} />
        <Route path="/booking/:id" element={<ManageBookingPage />} />
        {/* The member's own page. The membership UUID is the credential, the
            same access model as /booking/:id above — this is what the owner's
            customer-account idea shipped as instead of an auth system. */}
        <Route path="/plan/:memberId" element={<PlanMemberPage />} />
        {/* ROADMAP 2.19. The opt-out at the bottom of the one commercial email
            this product sends. Same credential as the two routes above — the
            row's own UUID — and it MUST match `unsubscribeUrl()` in
            supabase/functions/_shared/config.ts, whose header records what it
            cost the last time one of these pairs drifted apart. */}
        <Route path="/unsubscribe/:customerId" element={<UnsubscribePage />} />

        {/* --- Signed-in. ---------------------------------------------- */}
        <Route path="/invite/:token" element={<Wrapped><AcceptInvite /></Wrapped>} />
        <Route path="/job/:id" element={<Wrapped><JobPage /></Wrapped>} />
        {/* The dashboard lives under /app: one URL, five tabs via internal
            state, so the phone home-screen app never breaks out to the
            browser. The bare catch-all still lands here so any pre-move
            bookmark (e.g. /login, or the old / home-screen icon) keeps
            working instead of 404ing into marketing. */}
        <Route path="/app/*" element={<Wrapped><App /></Wrapped>} />
        <Route path="/*" element={<Wrapped><App /></Wrapped>} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);

function Wrapped({ children }) {
  return <BusinessProvider>{children}</BusinessProvider>;
}
