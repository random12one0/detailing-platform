import React from "react";
import { FadeUp } from '@/components/animations/AnimationWrappers';

const YouTubeVideos = () => {
  return (
    <section id="youtube-videos" className="py-24 lg:py-32 bg-secondary/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Latest YouTube Videos
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Watch our latest detailing videos and tips.
            </p>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-2xl aspect-w-16 aspect-h-9 rounded-xl overflow-hidden shadow-lg bg-black mx-auto">
              <iframe
                className="w-full h-full min-h-[200px]"
                src="https://www.youtube.com/embed/videoseries?si=AEFHIPp7m9FYREJM&amp;list=PLy_PaXh2fpwY6Wd0rN-8TLjjgqq7MS_jb"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <a
                href="https://youtube.com/@andrewsautodetailcarwash?si=WWqx43f14xaZTBWA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-full bg-accent text-accent-foreground font-semibold text-lg shadow-lg hover:bg-accent/90 transition-colors duration-200"
              >
                View All Videos on YouTube
              </a>
              <a
                href="https://www.instagram.com/andrews.auto_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-full bg-pink-600 text-white font-semibold text-lg shadow-lg hover:bg-pink-700 transition-colors duration-200"
              >
                View Our Instagram
              </a>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default YouTubeVideos;
