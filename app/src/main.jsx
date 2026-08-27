import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./theme.css";
import { BusinessProvider } from "./context/BusinessContext.jsx";
import App from "./App.jsx";
import JobPage from "./screens/JobPage.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BusinessProvider>
      <BrowserRouter>
        <Routes>
          {/* Push-notification taps land on one clean job page. */}
          <Route path="/job/:id" element={<JobPage />} />
          {/* Everything else: one URL, five tabs via internal state, so the
              phone home-screen app never breaks out to the browser. */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </BusinessProvider>
  </React.StrictMode>,
);
