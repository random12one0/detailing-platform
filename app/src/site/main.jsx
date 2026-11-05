// The Studio site renderer's own entry (site.html), served at /site/<slug>.
// Separate from the dashboard's main.jsx on purpose: none of the dashboard's
// CSS, fonts, providers or routes load here. STUDIO-SPEC.md §7 row S1.
import React from "react";
import ReactDOM from "react-dom/client";
import Site from "./Site.jsx";

// Committed example specs. Real clients' specs will come from the Studio's
// revisions table, not from git (WEBSITE-STEP1-BRIEF J7).
const SPECS = Object.fromEntries(
  Object.entries(import.meta.glob("./specs/*.json", { eager: true, import: "default" }))
    .map(([file, spec]) => [file.replace(/^.*\/|\.json$/g, ""), spec]),
);

// One motion switch, the same one the dashboard uses (app/src/main.jsx): `.lite`
// on <html> from ?lite=1 or prefers-reduced-motion, live. booking.css keys on it.
{
  const forced = new URLSearchParams(window.location.search).get("lite") === "1";
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const apply = () => document.documentElement.classList.toggle("lite", forced || !!mq?.matches);
  apply();
  mq?.addEventListener("change", apply);
}

const slug = /^\/site\/([a-z0-9-]+)\/?$/.exec(window.location.pathname)?.[1] ?? null;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Site slug={slug} spec={slug ? SPECS[slug] ?? null : null} />
  </React.StrictMode>,
);
