import React from 'react';
import { Sparkles, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg tracking-tight">
                Andrew&apos;s Auto Cleaning
              </span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Professional mobile car wash and interior cleaning services in Lakewood, California. 
              Quality results, honest prices.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <nav className="space-y-2">
              {[
                { label: 'Services', id: 'services' },
                { label: 'Gallery', id: 'gallery' },
                { label: 'Why Choose Us', id: 'why-us' },
                { label: 'FAQ', id: 'faq' },
                { label: 'Book Now', id: 'book' },
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="block text-sm text-primary-foreground/70 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <div className="space-y-3">
              <a 
                href="tel:562-310-1075" 
                className="flex items-center gap-3 text-primary-foreground/70 hover:text-white transition-colors duration-200"
              >
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">562-310-1075</span>
              </a>
              <a 
                href="mailto:andrewswashing@gmail.com" 
                className="flex items-center gap-3 text-primary-foreground/70 hover:text-white transition-colors duration-200"
              >
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">andrewswashing@gmail.com</span>
              </a>
              <a 
                href="https://www.yelp.com/biz/andrews-car-washing-lakewood-3" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-primary-foreground/70 hover:text-white transition-colors duration-200"
              >
                <ExternalLink className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">View on Yelp</span>
              </a>
              <div className="flex items-start gap-3 pt-2">
                <MapPin className="w-5 h-5 text-primary-foreground/70 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-primary-foreground/70">
                  Lakewood, California
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/50">
              © {currentYear} Andrew&apos;s Auto Cleaning. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
