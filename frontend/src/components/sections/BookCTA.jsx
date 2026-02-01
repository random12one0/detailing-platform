import React from 'react';
import { FadeUp, StaggerContainer, StaggerItem } from '@/components/animations/AnimationWrappers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export const BookCTA = () => {
  const paymentMethods = [
    { name: 'Cash', icon: '💵' },
    { name: 'Zelle', icon: '💳' },
    { name: 'Cash App', icon: '📱' },
    { name: 'Venmo', icon: '✓' },
    { name: 'PayPal', icon: '🅿️' },
  ];

  const openBooking = () => {
    window.open('https://andrewsauto.setmore.com/book', '_blank');
  };

  return (
    <section id="book" className="py-24 lg:py-32 bg-gradient-to-b from-secondary/30 to-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <Card className="bg-card border-border shadow-elegant overflow-hidden">
            <CardContent className="p-8 lg:p-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-accent" />
                </div>
                
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
                  Ready to Book?
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                  Schedule your appointment online and get your vehicle looking its best.
                </p>

                <Button 
                  variant="accent" 
                  size="xl" 
                  className="mb-10 shadow-lg hover:shadow-xl"
                  onClick={openBooking}
                >
                  Book Your Appointment
                </Button>

                {/* Payment Methods */}
                <div className="border-t border-border pt-8">
                  <p className="text-sm text-muted-foreground mb-4">Payment Methods Accepted</p>
                  <StaggerContainer className="flex flex-wrap justify-center gap-3" staggerDelay={0.05}>
                    {paymentMethods.map((method, index) => (
                      <StaggerItem key={index}>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                          <span>{method.icon}</span>
                          <span>{method.name}</span>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeUp>
      </div>
    </section>
  );
};

export default BookCTA;
