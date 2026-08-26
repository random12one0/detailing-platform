import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Sticky "Book Now" call-to-action.
 * On mobile it's a full-width bottom bar; on desktop it's a floating pill in the
 * bottom-right corner. Appears once the user scrolls past the hero and hides
 * again while the booking widget itself is on screen (so it never covers it).
 */
const StickyBookNow = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolledPastHero = window.scrollY > window.innerHeight * 0.6;

      let widgetInView = false;
      const widget = document.getElementById('booking-widget');
      if (widget) {
        const rect = widget.getBoundingClientRect();
        widgetInView = rect.top < window.innerHeight && rect.bottom > 0;
      }

      setVisible(scrolledPastHero && !widgetInView);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const scrollToBooking = () => {
    const element = document.getElementById('booking-widget');
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div
      className={`fixed z-40 transition-all duration-300 inset-x-0 bottom-0 p-3 bg-background/85 backdrop-blur border-t border-border sm:inset-x-auto sm:right-6 sm:bottom-6 sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-[150%] opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={scrollToBooking}
        className="w-full h-12 sm:w-auto sm:px-6 rounded-xl sm:rounded-full bg-accent text-accent-foreground font-semibold text-base shadow-lg sm:shadow-xl flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-95"
        data-testid="sticky-book-now-btn"
      >
        <Sparkles className="w-5 h-5" />
        Book Now
      </button>
    </div>
  );
};

export default StickyBookNow;
