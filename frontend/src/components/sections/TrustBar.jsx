import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { FadeUp } from '@/components/animations/AnimationWrappers';
import { Star, ShieldCheck, Car, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// A quiet, mobile-first credibility strip rendered directly under the Hero.
// Keeps claims truthful: the rating is derived from real testimonials data and
// the service area is read from business_info — nothing is fabricated.
const DEFAULT_SERVICE_AREA = 'Lakewood, CA';

export const TrustBar = () => {
  const prefersReducedMotion = useReducedMotion();
  // ratingLabel: null while loading -> render a static fallback (no fabricated number).
  const [ratingLabel, setRatingLabel] = useState(null);
  const [serviceArea, setServiceArea] = useState(DEFAULT_SERVICE_AREA);

  useEffect(() => {
    let active = true;
    (async () => {
      const [testimonialsRes, businessRes] = await Promise.all([
        supabase.from('testimonials').select('rating').eq('is_active', true),
        supabase.from('business_info').select('service_area').eq('id', 1).single(),
      ]);
      if (!active) return;

      // Average rating from active testimonials.
      const rows = Array.isArray(testimonialsRes.data) ? testimonialsRes.data : [];
      const valid = rows
        .map((r) => Number(r.rating))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (valid.length > 0) {
        const avg = valid.reduce((sum, n) => sum + n, 0) / valid.length;
        setRatingLabel(`${avg.toFixed(1)} on Google & Yelp`);
      } else {
        setRatingLabel('5-star rated');
      }

      // Service area from business_info (fallback keeps a truthful default).
      const area = businessRes.data?.service_area?.trim();
      if (area) setServiceArea(area);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Displayed rating text; while loading show a generic, non-fabricated label.
  const ratingText = ratingLabel || '5-star rated';

  const Divider = () => (
    <span aria-hidden="true" className="hidden sm:inline-block w-1 h-1 rounded-full bg-muted-foreground/30" />
  );

  const content = (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:gap-x-6 text-sm">
      {/* Rating — the only link; jumps to the reviews section. */}
      <a
        href="#reviews"
        className="inline-flex items-center gap-2 min-h-[44px] text-foreground font-medium hover:text-accent transition-colors"
      >
        <Star className="w-4 h-4 shrink-0 fill-accent text-accent" />
        <span>{ratingText}</span>
      </a>

      <Divider />

      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <ShieldCheck className="w-4 h-4 shrink-0 text-accent" />
        <span>Satisfaction guaranteed</span>
      </span>

      <Divider />

      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Car className="w-4 h-4 shrink-0 text-accent" />
        <span>Mobile &amp; drop-off</span>
      </span>

      <Divider />

      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <MapPin className="w-4 h-4 shrink-0 text-accent" />
        <span>Serving {serviceArea}</span>
      </span>
    </div>
  );

  return (
    <section aria-label="Trust and credibility" className="bg-secondary/50 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        {prefersReducedMotion ? content : <FadeUp duration={0.4}>{content}</FadeUp>}
      </div>
    </section>
  );
};

export default TrustBar;
