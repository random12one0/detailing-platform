import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowDown, MapPin, Clock } from 'lucide-react';

export const Hero = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToServices = () => {
    const element = document.getElementById('services');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBook = () => {
    const element = document.getElementById('book');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const openYelp = () =>
    window.open('https://www.yelp.com/biz/andrews-car-washing-lakewood-3', '_blank');
  const openGoogle = () =>
    window.open('https://g.page/r/CY27nt5XVIuBEAI/review', '_blank');

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-black">
        <motion.img
          src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769136375/hpsyzavwc78ydhdjkgoy.jpg"
          alt="Professional car detailing"
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1.2 }}
        />
      </div>

      {/* Content */}
      <motion.div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="max-w-3xl">
          {/* Location + Reviews */}
          <motion.div
            className="flex items-center gap-3 mb-8 flex-wrap sm:flex-nowrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm text-white/90 font-medium">Lakewood, California</span>
            </div>

            {/* Yelp + Google buttons always visible on mobile */}
            {isMobile && (
              <div className="flex gap-2">
                <button
                  onClick={openYelp}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-transform duration-200 hover:scale-105"
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583720/qc1on8u4i9ocjxkr10ke.png"
                    alt="Yelp"
                    className="w-6 h-6 object-contain filter brightness-125"
                  />
                </button>
                <button
                  onClick={openGoogle}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-transform duration-200 hover:scale-105"
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583651/llra5ue5osfindmvrce2.png"
                    alt="Google"
                    className="w-6 h-6 object-contain"
                  />
                </button>
              </div>
            )}
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight tracking-tight mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Mobile Car Wash
            <br />
            <span className="text-white/90">&amp; Interior Detailing</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-lg sm:text-xl text-white/80 leading-relaxed mb-6 max-w-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Mobile auto detailing you can trust. High-quality results at fair, transparent prices.
          </motion.p>

          {/* Note */}
          <motion.div
            className="flex items-center gap-2 text-white/60 text-sm mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <Clock className="w-4 h-4" />
            <span>Mobile services require access to water and electricity</span>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-start mt-2">
            <Button
              variant="hero"
              size="xl"
              className="w-full sm:w-auto"
              onClick={scrollToBook}
            >
              Book Appointment
            </Button>
            <Button
              variant="hero-outline"
              size="xl"
              className="w-full sm:w-auto"
              onClick={scrollToServices}
            >
              View Services
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.button
        onClick={scrollToServices}
        className="absolute bottom-8 inset-x-0 mx-auto w-fit flex flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-colors duration-300"
      >
        <span className="text-xs font-medium uppercase tracking-wider">Scroll</span>
        <ArrowDown className="w-5 h-5" />
      </motion.button>
    </section>
  );
};

export default Hero;
