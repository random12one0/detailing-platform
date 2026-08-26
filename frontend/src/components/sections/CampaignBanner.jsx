import React, { useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';
import axios from 'axios';
import { SUPABASE_FUNCTIONS_URL } from '@/lib/supabase';
import { getStoredCampaign, clearStoredCampaign, getOwnerAccessToken } from '@/lib/campaign';

const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
// Remembers that this browser dismissed the banner for a given campaign slug, so
// it stays gone across refreshes (a plain state dismiss came back on reload).
const DISMISS_KEY = 'andrews_campaign_dismissed';

/**
 * Personal "you get a discount" banner for visitors who arrived via a
 * trackable campaign link (e.g. the golf-course QR code → /golf). Unlike
 * DiscountBanner (a global sale, same for every visitor), this only ever
 * renders for the one visitor who has a campaign stored in their own
 * browser — nobody else sees it, and it reappears on every visit within the
 * 30-day attribution window so they can confirm the discount is still there.
 *
 * Stacks below DiscountBanner via the same CSS-var offset pattern, and adds
 * its own --campaign-banner-h so Header can offset past both when present.
 */
const BANNER_HEIGHT = 44;

const CampaignBanner = () => {
  const [campaign, setCampaign] = useState(null);
  const [promo, setPromo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = getStoredCampaign();
    if (!stored?.promo_code) return;
    setCampaign(stored);
    // Stay dismissed across refreshes if this browser already closed this campaign's banner.
    try {
      if (localStorage.getItem(DISMISS_KEY) === stored.slug) setDismissed(true);
    } catch {
      /* ignore */
    }

    let active = true;
    axios
      .post(
        `${SUPABASE_FUNCTIONS_URL}/validate-promo-code`,
        { code: stored.promo_code },
        { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' } }
      )
      .then((res) => {
        if (active && res.data?.success && res.data?.promo) setPromo(res.data.promo);
      })
      .catch(() => {
        /* code may have been deactivated/expired since the visit — just skip the banner */
      });
    return () => {
      active = false;
    };
  }, []);

  const show = !!campaign && !!promo && !dismissed;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--campaign-banner-h', show ? `${BANNER_HEIGHT}px` : '0px');
    return () => root.style.setProperty('--campaign-banner-h', '0px');
  }, [show]);

  if (!show) return null;

  const scrollToBooking = () => {
    document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDismiss = async () => {
    setDismissed(true);
    // Remember the dismissal so the banner doesn't pop back on the next refresh.
    try {
      if (campaign?.slug) localStorage.setItem(DISMISS_KEY, campaign.slug);
    } catch {
      /* ignore */
    }
    // If the OWNER is previewing their own site, also forget the campaign so the
    // booking widget stops auto-applying the promo. A real (signed-out) customer
    // keeps theirs, so dismissing the bar never costs them their discount.
    try {
      const token = await getOwnerAccessToken();
      if (token) clearStoredCampaign();
    } catch {
      /* ignore */
    }
  };

  const discountLabel =
    promo.type === 'percentage' ? `${Number(promo.value)}% off` : `$${Number(promo.value)} off`;

  return (
    <div
      className="fixed inset-x-0 z-[59] bg-accent shadow-md"
      style={{ height: `${BANNER_HEIGHT}px`, top: 'var(--discount-banner-h, 0px)' }}
      role="region"
      aria-label="Your discount"
    >
      <div className="h-full max-w-6xl mx-auto flex items-center justify-center gap-2 sm:gap-3 px-10 sm:px-12 text-white">
        <Gift className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-xs sm:text-sm font-semibold tracking-tight text-center leading-tight">
          {discountLabel} applied &mdash; code <span className="font-mono">{campaign.promo_code}</span> will be used automatically when you book
        </p>
        <button
          onClick={scrollToBooking}
          className="flex-shrink-0 inline-flex items-center h-8 px-3 rounded-full bg-white text-accent text-xs sm:text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          Book now
        </button>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss discount notice"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-black/10 transition-colors"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};

export default CampaignBanner;
