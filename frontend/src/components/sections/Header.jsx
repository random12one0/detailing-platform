'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // External links
  const openBooking = () => window.open('https://andrewsauto.setmore.com/book', '_blank');
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
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Services', id: 'services' },
    { label: 'Gallery', id: 'gallery' },
    { label: 'Why Us', id: 'why-us' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-primary shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo */}
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <span className="font-semibold text-lg tracking-tight text-white">
                Andrew&apos;s Auto Detail &amp; Car Wash
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 text-white/80 hover:text-white hover:bg-white/10"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {/* Yelp Button - frosted */}
              <Button
                variant="outline"
                size="default"
                onClick={openYelp}
                className="flex items-center gap-1 border-red-500 text-red-500 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-red-500 hover:text-white transition-colors duration-200"
              >
                <img
                  src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583720/qc1on8u4i9ocjxkr10ke.png"
                  alt="Yelp Logo"
                  className="w-4 h-4"
                />
                Yelp
              </Button>

              {/* Google Button - frosted */}
              <Button
                variant="outline"
                size="default"
                onClick={openGoogle}
                className="flex items-center gap-1 border-blue-500 text-blue-500 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-blue-500 hover:text-white transition-colors duration-200"
              >
                <img
                  src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583651/llra5ue5osfindmvrce2.png"
                  alt="Google Logo"
                  className="w-4 h-4"
                />
                Google
              </Button>

              {/* Book Now Button */}
              <Button
                variant={isScrolled ? "accent" : "hero"}
                size="default"
                onClick={openBooking}
              >
                Book Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
            className="fixed inset-x-0 top-16 z-40 bg-primary border-b border-white/10 shadow-lg md:hidden"
          >
            <nav className="flex flex-col p-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/10 rounded-lg transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}

              <div className="pt-2 flex flex-col gap-2">
                {/* Mobile Yelp */}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white bg-transparent"
                  onClick={openYelp}
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583720/qc1on8u4i9ocjxkr10ke.png"
                    alt="Yelp Logo"
                    className="w-4 h-4 mr-2"
                  />
                  Yelp
                </Button>

                {/* Mobile Google */}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white bg-transparent"
                  onClick={openGoogle}
                >
                  <img
                    src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769583651/llra5ue5osfindmvrce2.png"
                    alt="Google Logo"
                    className="w-4 h-4 mr-2"
                  />
                  Google
                </Button>

                {/* Mobile Book Now */}
                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  onClick={openBooking}
                >
                  Book Now
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
