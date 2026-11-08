// STUDIO S8 — `/` ON A DETAILER'S OWN VERIFIED ADDRESS (STUDIO-SPEC.md §1e, §6d "Serving published sites").
// One question first: does this host have a published site? If yes, its live release is drawn by the Studio's
// renderer (loaded only here, so the dashboard and the marketing page never carry it), outside the app's router
// because the site keeps its own. If not (no live release, an unverified host, a business that is not active and
// paying, or the question failed), `app` answers exactly as before: the booking page for this host.
// The site reads every fact live from the detailer's dashboard, like the preview; nothing is copied into it.
// ponytail: two round trips on a tenant's `/` (this, then the profile); one RPC returning both if it ever matters.
import { Suspense, lazy, useEffect, useState } from "react";
import { bookingTransport } from "../lib/api.js";
import { tenantHost } from "../lib/host.js";

const Site = lazy(() => import("./Site.jsx"));
const Wait = () => <div style={{ minHeight: "100vh" }} aria-busy="true" />;

export default function TenantHome({ app, host = tenantHost() }) {
  const [live, setLive] = useState(undefined);   // undefined: asking; null: none
  useEffect(() => {
    let on = true;
    bookingTransport.publishedSite(host).then((r) => on && setLive(r), () => on && setLive(null));
    return () => { on = false; };
  }, [host]);
  if (live === undefined) return <Wait />;
  if (!live) return app;
  return (
    <div data-release={live.release} data-revision={live.revision}>
      <Suspense fallback={<Wait />}><Site spec={live.spec} /></Suspense>
    </div>
  );
}
