"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNameTouchingIcons, setIsNameTouchingIcons] = useState(false);
  const nameRef = useRef(null);
  const iconsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Detect if name touches icons
  useEffect(() => {
    if (!nameRef.current || !iconsRef.current) return;
    const checkOverlap = () => {
      const nameRect = nameRef.current.getBoundingClientRect();
      const iconsRect = iconsRef.current.getBoundingClientRect();
      // Check if right edge of name overlaps left edge of icons
      setIsNameTouchingIcons(nameRect.right >= iconsRect.left - 4); // 4px buffer
    };
    checkOverlap();
    window.addEventListener('resize', checkOverlap);
    return () => window.removeEventListener('resize', checkOverlap);
  }, []);

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
    { label: 'Why Choose Detail', id: 'why-choose-detail' },
    { label: 'Videos', id: 'youtube-videos' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <>
      {/* Floating Island Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 right-0 z-50 transition-[top] duration-300"
        style={{ top: 'calc(var(--discount-banner-h, 0px) + var(--campaign-banner-h, 0px))' }}
      >
        <div className={`max-w-6xl mx-auto rounded-b-xl transition-all duration-300 bg-primary/80 backdrop-blur-md shadow-lg border border-white/5`} style={{ minHeight: '4rem' }}>
          <div className="px-3 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-16 min-h-16" style={{ minHeight: '4rem' }}>

              {/* Logo + Site Name */}
              <motion.div
                className="flex items-center gap-1 flex-shrink-0"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                {!(isNameTouchingIcons && isNameTouchingIcons) && (
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1770270814/Copy_of_car_wash_logo_1_tbov4h.png"
                    alt="Logo"
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 object-contain"
                    style={{ borderRadius: '8px', marginRight: '0px', marginLeft: '0px' }}
                  />
                )}
                <span ref={nameRef} className="font-semibold text-base sm:text-sm lg:text-base tracking-tight text-white whitespace-nowrap" style={{ marginLeft: '0px' }}>
                  <span className="hidden md:inline">Andrew's Auto Detail & Car Wash</span>
                  <span className="hidden sm:inline md:hidden">Andrew's Auto Detail</span>
                  <span className="sm:hidden">Andrew's Auto</span>
                </span>
              </motion.div>

              {/* Desktop Navigation - Only on large screens.
                  FAQ is promoted to a primary action button, so it's excluded here. */}
              <nav className="hidden xl:flex items-center gap-1">
                {navLinks.filter((link) => link.id !== 'faq').map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="px-3 py-2 text-sm font-medium rounded-full transition-colors duration-200 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>

              {/* CTA Buttons - 3 responsive stages */}
              <div className="flex items-center gap-1.5 sm:gap-2" ref={iconsRef}>
                {/* Yelp Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openYelp}
                  className="flex items-center gap-1.5 rounded-full border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all h-8 sm:h-9 lg:h-10 px-2 sm:px-3 lg:px-4"
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583720/qc1on8u4i9ocjxkr10ke.png"
                    alt="Yelp"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                  {/* Show text on medium screens and up */}
                  <span className="hidden md:inline text-xs lg:text-sm font-medium">Yelp</span>
                </Button>

                {/* Google Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openGoogle}
                  className="flex items-center gap-1.5 rounded-full border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white transition-all h-8 sm:h-9 lg:h-10 px-2 sm:px-3 lg:px-4"
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583651/llra5ue5osfindmvrce2.png"
                    alt="Google"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                  {/* Show text on medium screens and up */}
                  <span className="hidden md:inline text-xs lg:text-sm font-medium">Google</span>
                </Button>

                {/* FAQ Button — primary header action, scrolls to the FAQ section */}
                <Button
                  size="sm"
                  onClick={() => scrollToSection('faq')}
                  className="flex items-center gap-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold shadow-lg shadow-cyan-500/30 h-8 sm:h-9 lg:h-10 px-3 sm:px-4 lg:px-5 text-xs sm:text-sm"
                  data-testid="faq-button"
                >
                  <HelpCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  FAQ
                </Button>

                {/* Mobile Menu Button - Only show when nav links are hidden */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="xl:hidden p-2 rounded-full text-white hover:bg-white/10 transition-colors"
                  aria-label="Toggle navigation menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu - Slides in below header */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 sm:top-24 left-4 right-4 z-40 bg-primary/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl xl:hidden"
          >
            <nav className="flex flex-col p-4 space-y-1">
              {navLinks
                .filter((link) => link.id !== 'faq')
                .map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="px-4 py-3 min-h-[44px] text-left text-sm font-medium text-white/90 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              {/* FAQ — promoted to a prominent, primary action in the mobile menu */}
              <button
                onClick={() => scrollToSection('faq')}
                className="mt-1 flex items-center gap-2 px-4 py-3 min-h-[44px] text-left text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-colors shadow-lg shadow-cyan-500/30"
              >
                <HelpCircle className="w-4 h-4" />
                FAQ
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
