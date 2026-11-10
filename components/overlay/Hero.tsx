import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { HERO_MEDIA } from '../../constants';
import { playHoverSound } from '../../utils/soundEngine';
import ScrambleText from './ScrambleText';

export interface HeroCopy {
  role: string;
  description: string;
  cta: {
    sound: string;
    mute: string;
  };
}

interface HeroProps {
  hidden: boolean;
  copy: HeroCopy;
  soundOn: boolean;
  onToggleSound: () => void;
}

// Navigation lives in the 3D objects and the bottom bar, so the hero only
// carries the one action they do not offer: hearing the presentation.
const Hero: React.FC<HeroProps> = ({ hidden, copy, soundOn, onToggleSound }) => {
  const SoundIcon = soundOn ? VolumeX : Volume2;

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

        {HERO_MEDIA.hasAudio && (
          <button
            type="button"
            onClick={onToggleSound}
            onMouseEnter={playHoverSound}
            aria-pressed={soundOn}
            data-sound-toggle
            className={`pointer-events-auto mt-4 inline-flex items-center gap-1.5 rounded-full border bg-black/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
              ${soundOn
                ? 'border-white/20 text-gray-200 hover:bg-white/15'
                : 'border-cyan-400/60 text-cyan-300 hover:bg-cyan-400/15'}`}
          >
            <SoundIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {soundOn ? copy.cta.mute : copy.cta.sound}
          </button>
        )}
      </div>
    </div>
  );
};

export default Hero;
