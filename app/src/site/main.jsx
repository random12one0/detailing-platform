// The Studio site renderer's own entry (site.html).
//
// S1 SERVES COMMITTED EXAMPLES ONLY, at /site/example/<name>. Each example
// spec binds to the slug `example_<name>`, which no real business can ever
// have: the database's own rule is `slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'`
// (20260827000100_tenant_core.sql), and "_" is outside it. So an example can
// only ever draw the offline engine's fictional data, never a real detailer's.
// Real sites (S3+) come from revisions tied to a business id, not from a slug.
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

const name = /^\/site\/example\/([a-z0-9-]+)\/?$/.exec(window.location.pathname)?.[1] ?? null;
const spec = name && Object.hasOwn(SPECS, name) ? SPECS[name] : null;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Site spec={spec} />
  </React.StrictMode>,
);
