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
import LandingPage from "./landing/LandingPage.jsx";

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
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/booking/:id" element={<ManageBookingPage />} />

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
