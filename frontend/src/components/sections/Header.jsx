'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to booking widget
  const scrollToBooking = () => {
    const element = document.getElementById('booking-widget');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setIsMobileMenuOpen(false);
  };

  // External links
  const openYelp = () => window.open('https://www.yelp.com/biz/andrews-car-washing-lakewood-3', '_blank');
  const openGoogle = () => window.open('https://g.page/r/CY27nt5XVIuBEAI/review', '_blank');

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(prev => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    // If not on home page, navigate to home first
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Services', id: 'services' },
    { label: 'Gallery', id: 'gallery' },
    { label: 'Meet Owner', id: 'meet-owner' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <>
      {/* Floating Island Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-4 left-0 right-0 z-50 px-4"
      >
        <div className={`max-w-6xl mx-auto rounded-full transition-all duration-300 ${
          isScrolled 
            ? 'bg-primary/95 backdrop-blur-xl shadow-2xl border border-white/10' 
            : 'bg-primary/80 backdrop-blur-md shadow-lg border border-white/5'
        }`}>
          <div className="px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 lg:h-16">

              {/* Logo */}
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <span className="font-semibold text-sm lg:text-base tracking-tight text-white whitespace-nowrap">
                  Andrew's Auto Detail & Car Wash
                </span>
              </motion.div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="px-3 py-2 text-sm font-medium rounded-full transition-colors duration-200 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>

              {/* CTA Buttons - Always Visible */}
              <div className="flex items-center gap-1.5 lg:gap-2">
                {/* Yelp Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openYelp}
                  className="flex items-center gap-1 rounded-full border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all h-8 px-2 lg:px-3 text-xs lg:text-sm"
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583720/qc1on8u4i9ocjxkr10ke.png"
                    alt="Yelp"
                    className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                  />
                  <span className="hidden sm:inline">Yelp</span>
                </Button>

                {/* Google Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openGoogle}
                  className="flex items-center gap-1 rounded-full border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white transition-all h-8 px-2 lg:px-3 text-xs lg:text-sm"
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583651/llra5ue5osfindmvrce2.png"
                    alt="Google"
                    className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                  />
                  <span className="hidden sm:inline">Google</span>
                </Button>

                {/* Book Now Button */}
                <Button
                  size="sm"
                  onClick={scrollToBooking}
                  className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold shadow-lg shadow-cyan-500/50 h-8 px-3 lg:px-4 text-xs lg:text-sm"
                  data-testid="book-now-button"
                >
                  Book
                </Button>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-full text-white hover:bg-white/10 transition-colors ml-1"
                  aria-label="Toggle navigation menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 left-4 right-4 z-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl lg:hidden"
          >
            <nav className="flex flex-col p-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/10 rounded-xl transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
