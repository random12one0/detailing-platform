import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FadeUp, StaggerContainer, StaggerItem } from '@/components/animations/AnimationWrappers';
import { MapPin, Car, Truck } from 'lucide-react';

export const ServiceOptions = () => {
  const options = [
    {
      icon: Truck,
      title: "Mobile Service",
      description: "I'll come to your location anywhere in Lakewood, California. Travel outside the local area may include an additional fee."
    },
    {
      icon: Car,
      title: "Drop-Off Option",
      description: "Prefer to bring your vehicle to me? That works too. Contact to schedule a drop-off appointment."
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Service Options
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Flexible scheduling to fit your lifestyle
            </p>
          </div>
        </FadeUp>

        <StaggerContainer className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto" staggerDelay={0.15}>
          {options.map((option, index) => (
            <StaggerItem key={index}>
              <Card className="relative h-full bg-card border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-elegant">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                    <option.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {option.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Location Badge */}
        <FadeUp delay={0.3}>
          <div className="flex justify-center mt-12">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-secondary text-secondary-foreground">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Serving Lakewood, California</span>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default ServiceOptions;
