import React from 'react';
import { FadeUp } from '@/components/animations/AnimationWrappers';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ = () => {
  const faqs = [
    {
      question: "Do you come to my location?",
      answer: "Yes! I offer mobile services throughout Lakewood. I'll come to your home, office, or wherever is convenient for you. Travel outside of Lakewood may include an additional fee."
    },
    {
      question: "How long does a service take?",
      answer: "Service times vary based on the package. Basic services typically take 1-1.5 hours, while premium deep cleaning services take 1.5-2.5 hours. I never rush—your car gets the time it needs."
    },
    {
      question: "How do I pay?",
      answer: "I accept multiple payment methods for your convenience: Cash, Zelle, Cash App, Venmo, and PayPal. Payment is due upon completion of service."
    },
    {
      question: "Do you provide your own water and electricity?",
      answer: "Mobile services require access to water and electricity at your location. If you're unsure about availability, we can discuss alternatives or you can use the drop-off option."
    },
    {
      question: "Can I drop off my car instead of having mobile service?",
      answer: "Absolutely! If you prefer to bring your vehicle to me, that works too. Just contact me to schedule a drop-off appointment."
    },
    {
      question: "Do you only operate during certain times?",
      answer: "I offer flexible scheduling to accommodate your needs. Contact me to discuss availability and find a time that works best for you."
    }
  ];

  return (
    <section id="faq" className="py-24 lg:py-32 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about our services
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-card transition-shadow duration-300"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-5 text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeUp>
      </div>
    </section>
  );
};

export default FAQ;
