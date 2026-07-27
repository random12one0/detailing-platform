import React from 'react';
import { motion } from 'framer-motion';
import { FadeUp } from '@/components/animations/AnimationWrappers';

export const MeetTheOwner = () => {
  return (
    <section id="meet-owner" className="py-16 lg:py-20 bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-2">
              Meet the Owner
            </h2>
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-10">
            {/* Profile Image */}
            <motion.div 
              className="flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative w-40 h-40 sm:w-48 sm:h-48">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 blur-xl"></div>
                <img
                  src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1770869916/cm6bzwi6ncdnxtpt2x2h.jpg"
                  alt="Andrew - Owner of Andrew's Auto Detail & Car Wash"
                  className="relative w-full h-full object-cover rounded-2xl border-4 border-white/10 shadow-2xl"
                />
              </div>
            </motion.div>

            {/* Bio Content */}
            <div className="flex-1 text-center md:text-left">
              <div className="relative">
                <p className="text-primary-foreground/80 text-base leading-relaxed mb-3">
                  Hi, I'm Andrew, the owner of Andrew's Auto Detail & Car Wash. I provide honest, high-quality mobile detailing with a focus on proper technique, attention to detail, and fair pricing. Every vehicle is serviced by me personally, ensuring consistent results and care you can trust.
                </p>
                <p className="text-primary-foreground/70 text-sm italic">
                  — Andrew
                </p>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default MeetTheOwner;
