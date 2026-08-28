import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./theme.css";
import { BusinessProvider } from "./context/BusinessContext.jsx";
import App from "./App.jsx";
import JobPage from "./screens/JobPage.jsx";
import AcceptInvite from "./screens/AcceptInvite.jsx";
import BookingPage from "./book/BookingPage.jsx";
import ManageBookingPage from "./book/ManageBookingPage.jsx";
import LandingPage from "./landing/LandingPage.jsx";

// The router is outermost so the PUBLIC routes sit outside BusinessProvider.
// A customer arriving from a text message has no session, no membership and
// no business of their own; wrapping them in the owner's context would make
// the page wait on an auth round trip it can never satisfy, and would apply
// whatever theme the last dashboard user picked on that device. Those pages
// carry their own BookingBusinessProvider, hydrated from the URL slug.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </React.StrictMode>,
);

function Wrapped({ children }) {
  return <BusinessProvider>{children}</BusinessProvider>;
}
