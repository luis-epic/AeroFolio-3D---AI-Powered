import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Project {
  id: number;
  title: string;
  tech: string;
  description: string;
  link?: string;
}

interface ProjectsProps {
  items: Project[];
  playClickSound: () => void;
  playHoverSound: () => void;
}

export const Projects: React.FC<ProjectsProps> = ({
  items,
  playClickSound,
  playHoverSound
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update scroll navigation buttons state and progress bar
  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    
    // Calculate scroll progress percentage (0 to 1)
    const maxScroll = scrollWidth - clientWidth;
    const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    setScrollProgress(progress);

    // Update button states
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < maxScroll - 5);
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      // Run once initially
      handleScroll();
      
      // Handle window resize updates
      window.addEventListener('resize', handleScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
    };
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    playClickSound();
    
    const { clientWidth } = carouselRef.current;
    const scrollAmount = clientWidth * 0.75; // Scroll 75% of container width
    
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="flex flex-col w-full h-full justify-between pb-3">
      {/* Carousel Controls HUD */}
      <div className="flex justify-between items-center px-6 md:px-8 py-2.5 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
            {items.length} PROJECTS DETECTED
          </span>
          <div className="hidden sm:flex items-center gap-1.5 h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full"
              style={{ width: `${Math.max(10, scrollProgress * 100)}%` }}
              layoutId="scrollBar"
            />
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            onMouseEnter={() => canScrollLeft && playHoverSound()}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 select-none ${
              canScrollLeft 
                ? 'bg-glass-dark border-cyan-500/30 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/10 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                : 'border-white/5 text-gray-600 bg-white/[0.01] cursor-not-allowed'
            }`}
            title="Previous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            onMouseEnter={() => canScrollRight && playHoverSound()}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 select-none ${
              canScrollRight 
                ? 'bg-glass-dark border-pink-500/30 text-pink-400 hover:border-pink-400 hover:bg-pink-500/10 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.15)]' 
                : 'border-white/5 text-gray-600 bg-white/[0.01] cursor-not-allowed'
            }`}
            title="Next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Interactive Carousel Track */}
      <div 
        ref={carouselRef}
        className="flex-1 overflow-x-auto py-4 px-6 md:px-8 flex gap-5 snap-x snap-mandatory scroll-smooth hide-scrollbar custom-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((project, i) => (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
            key={project.id}
            className="flex-shrink-0 w-[290px] sm:w-[330px] md:w-[350px] snap-start relative group bg-black/80 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-2xl hover:border-cyan-400/50 hover:bg-black/90 transition-all duration-500 hover:shadow-[0_12px_40px_rgba(6,182,212,0.25)] flex flex-col justify-between overflow-hidden"
            onMouseEnter={playHoverSound}
          >
            {/* Ambient Background Glow on Hover */}
            <div className="absolute -inset-0 bg-gradient-to-br from-cyan-500/15 via-transparent to-pink-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            {/* Top Row: Icon & Project Indicator */}
            <div className="z-10 flex flex-col">
              <div className="flex justify-between items-center mb-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-cyan-400 group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/25">
                    VERCEL LIVE
                  </span>
                  <span className="text-[9px] font-mono text-gray-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    PRJ-0{project.id + 1}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight font-display group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-200 transition-all">
                {project.title}
              </h3>
              
              <p className="text-gray-150 text-[13.5px] font-sans leading-relaxed mb-4 group-hover:text-white transition-colors line-clamp-4 min-h-[78px] tracking-wide">
                {project.description}
              </p>
            </div>

            {/* Bottom Section: Tech Stack & CTA Button */}
            <div className="z-10 flex flex-col gap-4 mt-auto pt-3 border-t border-white/5">
              {/* Tech Badges */}
              <div className="flex flex-wrap gap-1">
                {project.tech.split(',').map((tech: string, idx: number) => (
                  <span 
                    key={idx} 
                    className="text-[9px] text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-mono transition-all duration-300 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 group-hover:text-cyan-100"
                  >
                    {tech.trim()}
                  </span>
                ))}
              </div>

              {/* View Project Button */}
              {project.link ? (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); playClickSound(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs md:text-sm shadow-[0_4px_15px_rgba(6,182,212,0.2)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.4)] transition-all duration-300 cursor-pointer pointer-events-auto select-none"
                >
                  <span>View Project</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <button
                  disabled
                  className="w-full py-2 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-semibold text-xs md:text-sm cursor-not-allowed select-none"
                >
                  Link Unavailable
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop Helper Instructions */}
      <div className="hidden md:flex justify-center items-center gap-1.5 text-[10px] font-mono text-gray-500 tracking-wider">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-bounce-horizontal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span>DRAG OR SCROLL TO EXPLORE PORTFOLIO</span>
      </div>
    </div>
  );
};
