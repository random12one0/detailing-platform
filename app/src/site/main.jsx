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
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Site from "./Site.jsx";
import { startPicker } from "./picker.js";
import DetailerPreview, { installPreviewGuard } from "./Detailer.jsx";
import Published from "./Published.jsx";
import { tenantHost } from "../lib/host.js";

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

// STUDIO PREVIEW (S2/S3), DEV SERVER ONLY: /site/preview draws a revision handed
// in from outside instead of a committed example. Two doors, both local:
//  - the Studio page (Control Room) frames it and posts {type:"studio-spec", spec}.
//    Only a parent on this laptop (127.0.0.1 / localhost / [::1], any port) or an
//    origin listed in VITE_STUDIO_ORIGINS is listened to, so another web page
//    cannot frame it and feed it words;
//  - the connection check sets window.__STUDIO_SPEC__ before the page runs.
// The spec is validated against the live profile like any other (Site.jsx). A
// production build has no such route: import.meta.env.DEV is false there.
// S4 (review S2-3): when the Studio starts the preview it names its own page in VITE_STUDIO_ORIGINS, and then ONLY
// those origins are listened to, not every page on this laptop. Without it (the connection check's own server, a
// hand-started one) any loopback parent is, as before.
const LOOPBACK = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
const EXTRA = String(import.meta.env.VITE_STUDIO_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const allowed = (origin) => (EXTRA.length ? EXTRA.includes(origin) : LOOPBACK.test(origin));
// It also tells the Studio what it drew ("drawn", "refused" or "not_found"), so the Studio can say in its own words
// that a revision cannot be drawn instead of showing a customer's error page.
function tellParent(origin) {
  let last = null;
  const look = () => {
    const state = document.querySelector("[data-refused]") ? "refused" : document.querySelector("[data-notfound]") ? "not_found" : document.querySelector("[data-section]") ? "drawn" : null;
    if (state && state !== last) { last = state; window.parent.postMessage({ type: "studio-state", state }, origin); }
  };
  new MutationObserver(look).observe(document.body, { childList: true, subtree: true });
  look();
}
// The picker (S4): one per page, told the revision with every spec. A tap in Select mode is reported for that revision.
let picker = null;
function Preview() {
  const [got, setGot] = useState(() => (window.__STUDIO_SPEC__ ? { spec: window.__STUDIO_SPEC__, n: 0 } : null));
  useEffect(() => {
    let told = false;
    const on = (e) => {
      if (e.source !== window.parent || window.parent === window) return;
      if (!allowed(e.origin)) return;
      if (e.data?.type === "studio-spec" && e.data.spec && typeof e.data.spec === "object") {
        picker ||= startPicker({ allowed });
        picker.revision(e.origin, typeof e.data.revision === "string" ? e.data.revision : null);
        setGot((g) => ({ spec: e.data.spec, n: (g?.n ?? 0) + 1 }));
        if (!told) { told = true; tellParent(e.origin); }
      }
    };
    window.addEventListener("message", on);
    // "ready" carries nothing, so it may go to any parent; the spec only comes back from an allowed one.
    if (window.parent !== window) window.parent.postMessage({ type: "studio-ready" }, "*");
    return () => window.removeEventListener("message", on);
  }, []);
  if (!got) return <main className="site-wait" aria-busy="true" style={{ minHeight: "100vh" }} />;
  return <Site key={got.n} spec={got.spec} />;
}

const name = /^\/site\/example\/([a-z0-9-]+)\/?$/.exec(window.location.pathname)?.[1] ?? null;
const spec = name && Object.hasOwn(SPECS, name) ? SPECS[name] : null;
const preview = import.meta.env.DEV && /^\/site\/preview\/?$/.test(window.location.pathname);
// S7: the detailer's preview page. detailingplatform.com/p/<link> (the hosted copy the Studio sends, read through the
// site-preview function), and on the Studio's own dev server also /site/p/<link> (its laptop link server). Its guard is
// in place before anything runs.
const link = (import.meta.env.DEV ? /^\/(?:site\/)?p\/([A-Za-z0-9_-]{1,100})\/?$/ : /^\/p\/([A-Za-z0-9_-]{1,100})\/?$/).exec(window.location.pathname)?.[1] ?? null;
if (link) installPreviewGuard();
// S8: `/` reaches this page only through the edge (or the dev server) on a verified address with a live release. On the
// Studio's phone preview (dev only) /site/live?as-host=<a .test address> shows what that address serves, because a
// test address cannot resolve on this laptop.
const asHost = import.meta.env.DEV && /^\/site\/live\/?$/.test(window.location.pathname) ? (/^[a-z0-9.-]+\.test$/.exec(new URLSearchParams(window.location.search).get("as-host") || "")?.[0] ?? null) : null;
const liveHost = window.location.pathname === "/" ? tenantHost() : asHost;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {liveHost ? <Published host={liveHost} /> : link ? <DetailerPreview token={link} /> : preview ? <Preview /> : <Site spec={spec} />}
  </React.StrictMode>,
);
