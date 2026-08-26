import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Site-wide discount banner.
 *
 * Reads business_info (row id=1): site_discount_active, site_discount_percent,
 * site_discount_label. When active and percent > 0 it renders a slim, celebratory
 * full-width bar pinned to the very top of the page (above the sticky header).
 *
 * It exposes its height as a CSS custom property (--discount-banner-h) on the
 * document root so the fixed Header can offset itself and avoid overlap. When
 * inactive, dismissed, or still loading it renders null and resets the offset.
 */
const BANNER_HEIGHT = 44; // px — also a comfortable touch target height

const DiscountBanner = () => {
  const [discount, setDiscount] = useState({ active: false, percent: 0, label: '' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('business_info')
          .select('site_discount_active, site_discount_percent, site_discount_label')
          .eq('id', 1)
          .single();
        if (error) throw error;
        if (!active) return;
        setDiscount({
          active: !!data?.site_discount_active,
          percent: Number(data?.site_discount_percent) || 0,
          label: data?.site_discount_label || '',
        });
      } catch (err) {
        if (active) setDiscount({ active: false, percent: 0, label: '' });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const show = discount.active && discount.percent > 0 && !dismissed;

  // Publish the banner height to the header (and anything else) via a CSS var.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--discount-banner-h', show ? `${BANNER_HEIGHT}px` : '0px');
    return () => root.style.setProperty('--discount-banner-h', '0px');
  }, [show]);

  if (!show) return null;

  const scrollToBooking = () => {
    document
      .getElementById('booking-widget')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const message = discount.label
    ? `${discount.label} — ${discount.percent}% off everything`
    : `${discount.percent}% off everything — today only!`;

  return (
    <div
      className="shine-gold fixed top-0 inset-x-0 z-[60] shadow-md"
      style={{ height: `${BANNER_HEIGHT}px` }}
      role="region"
      aria-label="Site-wide discount"
    >
      <div className="h-full max-w-6xl mx-auto flex items-center justify-center gap-2 sm:gap-3 px-10 sm:px-12 text-slate-900">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-xs sm:text-sm font-semibold tracking-tight text-center leading-tight">
          {message}
        </p>
        <button
          onClick={scrollToBooking}
          className="flex-shrink-0 inline-flex items-center h-8 px-3 rounded-full bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          Book now
        </button>
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss discount banner"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-slate-900/80 hover:text-slate-900 hover:bg-black/10 transition-colors"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};

export default DiscountBanner;
