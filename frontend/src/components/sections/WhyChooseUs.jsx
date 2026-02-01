import React from 'react';
import { FadeUp, StaggerContainer, StaggerItem } from '@/components/animations/AnimationWrappers';
import { Heart, DollarSign, Shield, Clock } from 'lucide-react';

export const WhyChooseUs = () => {
  const reasons = [
    {
      icon: Heart,
      title: "Local Service",
      description: "Supporting your community with personalized care."
    },
    {
      icon: DollarSign,
      title: "No Upsells",
      description: "Honest work at honest prices."
    },
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "Meticulous attention to detail."
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      description: "Mobile service comes to you."
    }
  ];

  return (
    <section id="why-us" className="py-16 lg:py-20 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-2">
              Why Choose Andrew&apos;s Auto
            </h2>
          </div>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" staggerDelay={0.1}>
          {reasons.map((reason, index) => (
            <StaggerItem key={index}>
              <div className="text-center group">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 group-hover:scale-110">
                  <reason.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {reason.title}
                </h3>
                <p className="text-primary-foreground/70 text-sm leading-relaxed">
                  {reason.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default WhyChooseUs;
