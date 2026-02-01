import React from 'react';
import { motion } from 'framer-motion';
import { FadeUp } from '@/components/animations/AnimationWrappers';
import { Quote } from 'lucide-react';

export const MeetTheOwner = () => {
  return (
    <section id="meet-owner" className="py-20 lg:py-28 bg-primary text-primary-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-2">
              Meet the Owner
            </h2>
            <p className="text-primary-foreground/70 text-lg">
              The person behind the shine
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-12">
            {/* Profile Image */}
            <motion.div 
              className="flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 blur-xl"></div>
                <img
                  src="https://res.cloudinary.com/dxxs3qvdn/image/upload/v1769927436/0B98BBFF-C339-4C55-942A-3C0ECC69B9E1_cursvj.jpg"
                  alt="Andrew - Owner of Andrew's Auto Detail & Car Wash"
                  className="relative w-full h-full object-cover rounded-2xl border-4 border-white/10 shadow-2xl"
                />
              </div>
            </motion.div>

            {/* Bio Content */}
            <div className="flex-1 text-center md:text-left">
              <div className="relative">
                <Quote className="w-8 h-8 text-accent/30 mb-4 mx-auto md:mx-0" />
                <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
                  Hi, I'm Andrew!
                </h3>
                <p className="text-primary-foreground/80 text-base sm:text-lg leading-relaxed mb-6">
                  I started Andrew's Auto Detail & Car Wash with a simple mission: to provide reliable, 
                  professional mobile car detailing that our community can count on. Every vehicle I work 
                  on gets my full attention and care.
                </p>
                <p className="text-primary-foreground/80 text-base sm:text-lg leading-relaxed mb-6">
                  I believe in doing things right—using proper tools, proven techniques, and taking the 
                  time needed to deliver results that exceed expectations. Your satisfaction isn't just 
                  a goal; it's my guarantee.
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <span className="text-sm font-medium text-white">Serving Lakewood with pride since day one</span>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default MeetTheOwner;
