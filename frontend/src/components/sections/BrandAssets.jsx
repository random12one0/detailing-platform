import React from 'react';
import { FadeUp } from '@/components/animations/AnimationWrappers';
import { Phone, Mail, MapPin, Droplets } from 'lucide-react';

export const BrandAssets = () => {
  return (
    <section id="brand-assets" className="py-24 lg:py-32 bg-secondary/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Brand Assets
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Logo and promotional flyer
            </p>
          </div>
        </FadeUp>

        {/* Logos Section */}
        <FadeUp delay={0.1}>
          <div className="bg-card rounded-2xl p-8 shadow-card mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-6 text-center">Logos</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* With Icon */}
              <div>
                <p className="text-sm text-muted-foreground mb-3 text-center">With Icon</p>
                {/* Dark bg */}
                <div className="flex flex-col items-center justify-center p-8 bg-primary rounded-xl mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                      <Droplets className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
                        Andrews
                      </h1>
                      <p className="text-sm font-medium text-white/80 tracking-wide">
                        CAR WASH & DETAIL
                      </p>
                    </div>
                  </div>
                </div>
                {/* Light bg */}
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                      <Droplets className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <h1 className="text-2xl font-bold text-primary tracking-tight leading-none">
                        Andrews
                      </h1>
                      <p className="text-sm font-medium text-primary/70 tracking-wide">
                        CAR WASH & DETAIL
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Without Icon */}
              <div>
                <p className="text-sm text-muted-foreground mb-3 text-center">Text Only</p>
                {/* Dark bg */}
                <div className="flex flex-col items-center justify-center p-8 bg-primary rounded-xl mb-3">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-white tracking-tight leading-none">
                      Andrews
                    </h1>
                    <p className="text-sm font-medium text-white/80 tracking-widest mt-1">
                      CAR WASH & DETAIL
                    </p>
                  </div>
                </div>
                {/* Light bg */}
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-border">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary tracking-tight leading-none">
                      Andrews
                    </h1>
                    <p className="text-sm font-medium text-primary/70 tracking-widest mt-1">
                      CAR WASH & DETAIL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Flyers Section */}
        <FadeUp delay={0.2}>
          <div className="bg-card rounded-2xl p-8 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-6 text-center">Promotional Flyers</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Flyer with Icon */}
              <div>
                <p className="text-sm text-muted-foreground mb-3 text-center">With Icon</p>
                <div className="bg-primary rounded-xl overflow-hidden shadow-lg">
                  {/* Header */}
                  <div className="p-6 text-center border-b border-white/10">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                          Andrews
                        </h1>
                        <p className="text-xs font-medium text-white/80 tracking-wide">
                          CAR WASH & DETAIL
                        </p>
                      </div>
                    </div>
                    <p className="text-white/60 text-sm">Mobile Detailing Services</p>
                  </div>

                  {/* Services */}
                  <div className="p-6 border-b border-white/10">
                    <h3 className="text-white font-semibold text-sm mb-3 text-center">OUR SERVICES</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                      <div>
                        <p className="font-medium text-white mb-2">Interior</p>
                        <p>• Vacuuming</p>
                        <p>• Surface Cleaning</p>
                        <p>• Stain Removal</p>
                      </div>
                      <div>
                        <p className="font-medium text-white mb-2">Exterior</p>
                        <p>• Hand Wash</p>
                        <p>• Wheels & Tires</p>
                        <p>• Trim & Glass</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Space */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <div className="text-center text-primary/40 text-xs p-2">
                          <div className="w-16 h-16 border-2 border-dashed border-primary/30 rounded flex items-center justify-center">
                            QR
                          </div>
                        </div>
                      </div>
                      <div className="text-white/80 text-sm">
                        <p className="font-semibold text-white mb-1">Scan to Book</p>
                        <p>Quick & easy online scheduling</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="p-6 bg-black/20">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-white/80">
                        <Phone className="w-4 h-4 text-accent" />
                        <span>562-310-1075</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Mail className="w-4 h-4 text-accent" />
                        <span>andrewswashing@gmail.com</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span>Lakewood, California</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flyer without Icon */}
              <div>
                <p className="text-sm text-muted-foreground mb-3 text-center">Text Only</p>
                <div className="bg-primary rounded-xl overflow-hidden shadow-lg">
                  {/* Header */}
                  <div className="p-6 text-center border-b border-white/10">
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
                      Andrews
                    </h1>
                    <p className="text-sm font-medium text-white/80 tracking-widest mt-1">
                      CAR WASH & DETAIL
                    </p>
                    <p className="text-white/60 text-sm mt-3">Mobile Detailing Services</p>
                  </div>

                  {/* Services */}
                  <div className="p-6 border-b border-white/10">
                    <h3 className="text-white font-semibold text-sm mb-3 text-center">OUR SERVICES</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                      <div>
                        <p className="font-medium text-white mb-2">Interior</p>
                        <p>• Vacuuming</p>
                        <p>• Surface Cleaning</p>
                        <p>• Stain Removal</p>
                      </div>
                      <div>
                        <p className="font-medium text-white mb-2">Exterior</p>
                        <p>• Hand Wash</p>
                        <p>• Wheels & Tires</p>
                        <p>• Trim & Glass</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Space */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <div className="text-center text-primary/40 text-xs p-2">
                          <div className="w-16 h-16 border-2 border-dashed border-primary/30 rounded flex items-center justify-center">
                            QR
                          </div>
                        </div>
                      </div>
                      <div className="text-white/80 text-sm">
                        <p className="font-semibold text-white mb-1">Scan to Book</p>
                        <p>Quick & easy online scheduling</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="p-6 bg-black/20">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-white/80">
                        <Phone className="w-4 h-4 text-accent" />
                        <span>562-310-1075</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Mail className="w-4 h-4 text-accent" />
                        <span>andrewswashing@gmail.com</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span>Lakewood, California</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default BrandAssets;
