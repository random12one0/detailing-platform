import React from "react";
import { FadeUp } from '@/components/animations/AnimationWrappers';

export default function WhyChooseDetail({ onCTAClick }) {
  return (
    <section id="why-choose-detail" className="py-16 lg:py-20 bg-primary text-primary-foreground">
      <FadeUp>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-4 max-w-2xl mx-auto">
            Why Choose a Detail Over a Drive‑Thru Wash
          </h2>
          <div className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
            A tunnel wash gets the surface wet and calls it a day. A proper detail actually protects your car.
          </div>
          <div className="h-6" />
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {/* Box 1 */}
            <div className="h-full bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl shadow-elegant backdrop-blur-sm p-8 flex flex-col">
              <div className="flex items-center mb-4 text-left">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-accent mr-3">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </span>
                <span className="text-lg font-semibold text-white text-left">Safer for your paint</span>
              </div>
              <p className="text-primary-foreground/80 text-base flex-1">
                Drive-thru brushes and harsh chemicals leave swirl marks over time. Hand washing with the right products keeps your clear coat in good shape.
              </p>
            </div>
            {/* Box 2 */}
            <div className="h-full bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl shadow-elegant backdrop-blur-sm p-8 flex flex-col">
              <div className="flex items-center mb-4 text-left">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-accent mr-3">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </span>
                <span className="text-lg font-semibold text-white text-left">Deeper clean</span>
              </div>
              <p className="text-primary-foreground/80 text-base flex-1">
                We get into the wheels, door jambs, trim, and interior areas an automatic wash never touches.
              </p>
            </div>
            {/* Box 3 */}
            <div className="h-full bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl shadow-elegant backdrop-blur-sm p-8 flex flex-col">
              <div className="flex items-center mb-4 text-left">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-accent mr-3">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </span>
                <span className="text-lg font-semibold text-white text-left">Real protection</span>
              </div>
              <p className="text-primary-foreground/80 text-base flex-1">
                Professional products and sealant options that actually last — not a spray-on wax that washes off after one rain.
              </p>
            </div>
          </div>
          {/* Removed Book Now button and callout as requested */}
        </div>
      </FadeUp>
    </section>
  );
}
