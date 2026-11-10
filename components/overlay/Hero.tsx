import React from 'react';
import { Play } from 'lucide-react';
import { Section } from '../../types';
import { HERO_MEDIA } from '../../constants';
import { playHoverSound, playClickSound } from '../../utils/soundEngine';
import ScrambleText from './ScrambleText';

export interface HeroCopy {
  role: string;
  description: string;
  cta: {
    projects: string;
    ai: string;
    contact: string;
    presentation: string;
  };
}

interface HeroProps {
  hidden: boolean;
  copy: HeroCopy;
  onNavigate: (section: Section) => void;
  onOpenPresentation: () => void;
}

const BUTTON_BASE =
  'pointer-events-auto inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-cyan-400 text-black font-bold hover:bg-cyan-300`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-white/20 bg-black/40 text-white backdrop-blur-md hover:bg-white/15`;

const Hero: React.FC<HeroProps> = ({ hidden, copy, onNavigate, onOpenPresentation }) => {
  const go = (section: Section) => {
    playClickSound();
    onNavigate(section);
  };

  return (
    <div
      className={`absolute left-6 right-6 top-8 z-10 pointer-events-none transition-all duration-700 ease-out md:left-10 md:right-auto md:top-10
        ${hidden ? 'invisible opacity-0 -translate-y-5 blur-md' : 'visible opacity-100 blur-0'}`}
    >
      <div className="max-w-md">
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter font-display uppercase drop-shadow-2xl text-balance">
          <ScrambleText text="Luis Martinez" />
          <span className="block text-cyan-400 text-base md:text-xl mt-3 font-mono tracking-widest font-normal border-l-2 border-pink-500 pl-3">
            <ScrambleText text={copy.role} />
          </span>
        </h1>

        <p className="text-gray-200 mt-5 text-sm md:text-base leading-relaxed font-sans text-pretty">
          {copy.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2 md:gap-3">
          <button type="button" onClick={() => go('projects')} onMouseEnter={playHoverSound} className={BUTTON_PRIMARY}>
            {copy.cta.projects}
          </button>
          <button type="button" onClick={() => go('about')} onMouseEnter={playHoverSound} className={BUTTON_SECONDARY}>
            {copy.cta.ai}
          </button>
          <button type="button" onClick={() => go('contact')} onMouseEnter={playHoverSound} className={BUTTON_SECONDARY}>
            {copy.cta.contact}
          </button>
          {HERO_MEDIA.hasAudio && (
            <button
              type="button"
              onClick={() => { playClickSound(); onOpenPresentation(); }}
              onMouseEnter={playHoverSound}
              className={`${BUTTON_SECONDARY} border-pink-400/50 text-pink-200`}
            >
              <Play aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {copy.cta.presentation}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
