// CampaignLink — the landing page for a short trackable link, e.g. a QR code on
// a flyer at the golf course pointing at andrewsdetail.com/golf. Logs the visit,
// remembers the campaign (so a booking made later in this browser is attributed
// back to it, and its promo code auto-applies), then redirects into the site.
// An unrecognized slug just redirects home — no error shown to the visitor.
import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { trackVisit, storeCampaign } from "@/lib/campaign";

export default function CampaignLink() {
  const { slug } = useParams();
  const [target, setTarget] = useState(null); // null = still resolving

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const campaign = await trackVisit({ slug });
      if (cancelled) return;
      if (campaign) {
        storeCampaign(campaign);
        // Land on the destination (top of the site) — NOT scrolled to the
        // booking widget. The promo banner up top tells them the discount is
        // applied, and they can browse the services before booking.
        setTarget(campaign.destination || "/");
      } else {
        setTarget("/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!target) {
    // Split-second redirect — a blank screen would be fine too, but this avoids
    // a flash of nothing if the network is slow.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
}
