import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FadeUp } from '@/components/animations/AnimationWrappers';
import { Star, Quote } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Same Google review destination used by the site Header.
const GOOGLE_REVIEW_URL = 'https://g.page/r/CY27nt5XVIuBEAI/review';

// Row of filled/empty stars for a given rating (out of 5).
const StarRow = ({ rating = 5, className = '' }) => {
  const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${r} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= r ? 'fill-accent text-accent' : 'fill-none text-muted-foreground/40'}`}
        />
      ))}
    </div>
  );
};

export const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!active) return;
      if (!error && Array.isArray(data)) setReviews(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // While loading, render nothing to avoid layout shift.
  if (loading) return null;

  // No rows: a subtle "leave us a review" CTA rather than an empty gap.
  if (reviews.length === 0) {
    return (
      <section id="reviews" className="py-16 lg:py-20 bg-secondary/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeUp>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-3">
              Loved your detail?
            </h2>
            <p className="text-muted-foreground mb-6">
              We would love to hear about it. Leave us a quick review!
            </p>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-accent text-accent-foreground font-semibold shadow-elegant hover:bg-accent/90 transition-colors"
            >
              <Star className="w-5 h-5 fill-current" />
              Leave a Review
            </a>
          </FadeUp>
        </div>
      </section>
    );
  }

  // Aggregate rating derived from the data.
  const avg =
    reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
  const avgLabel = avg.toFixed(1);

  return (
    <section id="reviews" className="py-16 lg:py-24 bg-secondary/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-10 lg:mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              What Local Drivers Say
            </h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-2">
              <StarRow rating={5} />
              <span className="text-sm font-semibold text-foreground">
                {avgLabel} · loved by local drivers
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Responsive grid of quote cards. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {reviews.map((r, index) => (
            <FadeUp key={r.id} delay={0.05 * index}>
              <motion.article
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="relative h-full flex flex-col rounded-2xl border border-border bg-card p-6 shadow-elegant overflow-hidden"
              >
                {/* Subtle brand gradient wash, consistent with sibling sections. */}
                <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 blur-2xl" />

                <Quote className="w-8 h-8 text-accent/40 mb-3" />

                <p className="relative text-foreground/90 text-base leading-relaxed flex-1">
                  “{r.quote}”
                </p>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <StarRow rating={r.rating} className="mb-1" />
                    <p className="font-semibold text-foreground truncate">{r.author}</p>
                  </div>
                  {r.source && (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                      {r.source}
                    </span>
                  )}
                </div>
              </motion.article>
            </FadeUp>
          ))}
        </div>

        {/* CTA to the real Google review page. */}
        <FadeUp delay={0.1}>
          <div className="text-center mt-10 lg:mt-12">
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-accent text-accent-foreground font-semibold shadow-elegant hover:bg-accent/90 transition-colors"
            >
              <Star className="w-5 h-5 fill-current" />
              Leave us a Review
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default Reviews;
