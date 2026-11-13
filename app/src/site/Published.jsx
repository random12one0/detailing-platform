// STUDIO S8 — A PUBLISHED SITE, ON THE DETAILER'S OWN ADDRESS (STUDIO-SPEC.md §1e, §6d "Serving published sites").
// The edge (netlify/edge-functions/tenant-site.mjs; the dev server does the same) sends `/` on a verified address with
// a live release to this page instead of the app. Here the live release's spec is asked for again by host and drawn
// by the same renderer, page and stylesheet as the preview it was approved from. Every fact is read live from the
// detailer's dashboard; the spec holds bindings only.
import { useEffect, useState } from "react";
import Site from "./Site.jsx";
import { bookingTransport } from "../lib/api.js";

export default function Published({ host }) {
  const [live, setLive] = useState(undefined);   // undefined: asking; null: nothing live here (a rollback raced the edge)
  useEffect(() => {
    let on = true;
    bookingTransport.publishedSite(host).then((r) => on && setLive(r), () => on && setLive(null));
    return () => { on = false; };
  }, [host]);
  if (live === undefined) return <main className="site-wait" aria-busy="true" style={{ minHeight: "100vh" }} />;
  if (!live) return <main className="site-msg"><h1>This page is not available right now</h1><p>Please refresh in a moment.</p></main>;
  return <div data-release={live.release} data-revision={live.revision}><Site spec={live.spec} /></div>;
}
