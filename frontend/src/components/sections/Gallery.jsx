import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeUp } from '@/components/animations/AnimationWrappers';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Insert Cloudinary transformation params so we don't download/decode
// full-resolution originals for tiny thumbnails or the bounded main image.
// Non-Cloudinary URLs are returned untouched.
const cldOptimize = (url, transform) => {
  if (typeof url !== 'string') return url;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || idx === -1) return url;
  const insertAt = idx + marker.length;
  // Avoid double-inserting if a transform is already present.
  if (url.slice(insertAt).startsWith(`${transform}/`)) return url;
  return `${url.slice(0, insertAt)}${transform}/${url.slice(insertAt)}`;
};

// How many single photos to show before the "View more" toggle appears.
const VISIBLE_SINGLES = 8;

// ---------------------------------------------------------------------------
// Before/After slider — two stacked images; a draggable divider (backed by a
// range input for keyboard/touch accessibility) reveals the "after" image.
// No external libs.
// ---------------------------------------------------------------------------
const BeforeAfter = ({ before, after, caption }) => {
  const [pos, setPos] = useState(50); // percent of the "after" image revealed

  return (
    <div className="relative w-full select-none overflow-hidden rounded-2xl bg-muted shadow-elegant">
      <div className="relative aspect-[4/3] w-full">
        {/* Before (base layer) */}
        <img
          src={cldOptimize(before, 'c_fill,g_auto,w_800,h_600,q_auto,f_auto')}
          alt={caption ? `${caption} — before` : 'Before'}
          width={800}
          height={600}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        {/* After (clipped from the left up to `pos`) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <img
            src={cldOptimize(after, 'c_fill,g_auto,w_800,h_600,q_auto,f_auto')}
            alt={caption ? `${caption} — after` : 'After'}
            width={800}
            height={600}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full max-w-none object-cover"
            style={{ width: '100vw', maxWidth: 'none' }}
            draggable={false}
          />
        </div>

        {/* Labels */}
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          Before
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-accent/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
          After
        </span>

        {/* Divider handle */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10 flex items-center justify-center"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="h-full w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.4)]" />
          <div className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground shadow-lg">
            <ChevronLeft className="h-4 w-4 -mr-1" />
            <ChevronRight className="h-4 w-4 -ml-1" />
          </div>
        </div>

        {/* Range input drives the divider (keyboard + touch friendly) */}
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Reveal after image"
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      {caption && (
        <p className="px-3 py-2 text-center text-sm text-muted-foreground">{caption}</p>
      )}
    </div>
  );
};

export const Gallery = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null); // index into `singles`
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!mounted.current) return;
      if (!error && Array.isArray(data)) setRows(data);
      setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const pairs = useMemo(
    () => rows.filter((r) => r.kind === 'before_after' && r.before_url && r.after_url),
    [rows]
  );
  const singles = useMemo(
    () => rows.filter((r) => r.kind !== 'before_after' && r.image_url),
    [rows]
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const nextImage = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i + 1) % singles.length)),
    [singles.length]
  );
  const prevImage = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i - 1 + singles.length) % singles.length)),
    [singles.length]
  );

  // Nothing active → render nothing so the page never shows an empty gap.
  if (loading || (pairs.length === 0 && singles.length === 0)) return null;

  const visibleSingles = showAll ? singles : singles.slice(0, VISIBLE_SINGLES);
  const hasMore = singles.length > VISIBLE_SINGLES;

  return (
    <section id="gallery" className="py-16 lg:py-20 bg-secondary/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-2">
              Our Work
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              A quick look at the quality
            </p>
          </div>
        </FadeUp>

        {/* Before/After sliders — proof strip */}
        {pairs.length > 0 && (
          <FadeUp delay={0.05}>
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {pairs.map((p) => (
                <BeforeAfter
                  key={p.id}
                  before={p.before_url}
                  after={p.after_url}
                  caption={p.caption}
                />
              ))}
            </div>
          </FadeUp>
        )}

        {/* Compact grid of single photos */}
        {singles.length > 0 && (
          <FadeUp delay={0.1}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {visibleSingles.map((img, index) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                >
                  <img
                    src={cldOptimize(img.image_url, 'c_fill,g_auto,w_400,h_400,q_auto,f_auto')}
                    alt={img.caption || `Gallery photo ${index + 1}`}
                    width={400}
                    height={400}
                    loading={index < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            {hasMore && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  {showAll ? 'Show less' : `View more (${singles.length - VISIBLE_SINGLES})`}
                </button>
              </div>
            )}
          </FadeUp>
        )}
      </div>

      {/* Lightbox for single images */}
      <AnimatePresence>
        {lightboxIndex !== null && singles[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={closeLightbox}
          >
            {singles.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <motion.img
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              src={cldOptimize(singles[lightboxIndex].image_url, 'c_limit,w_1920,q_auto,f_auto')}
              alt={singles[lightboxIndex].caption || 'Gallery photo'}
              decoding="async"
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={closeLightbox}
              className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Gallery;
