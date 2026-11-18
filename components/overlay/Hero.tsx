import React from 'react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { HERO_MEDIA, HERO_SPLIT_QUERY } from '../../constants';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { playHoverSound } from '../../utils/soundEngine';
import ScrambleText from './ScrambleText';

export interface HeroCopy {
  role: string;
  description: string;
  pillars?: string[];
  cta: {
    sound: string;
    mute: string;
    replay: string;
  };
}

interface HeroProps {
  hidden: boolean;
  copy: HeroCopy;
  soundOn: boolean;
  heroEnded: boolean;
  onToggleSound: () => void;
  liteMode?: boolean;
}

const ACTION_CLASS =
  'pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wider backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

const Hero: React.FC<HeroProps> = ({
  hidden,
  copy,
  soundOn,
  heroEnded,
  onToggleSound,
  liteMode = false,
}) => {
  const isSplit = useMediaQuery(HERO_SPLIT_QUERY);
  const SoundIcon = heroEnded ? RotateCcw : soundOn ? VolumeX : Volume2;
  const soundLabel = heroEnded ? copy.cta.replay : soundOn ? copy.cta.mute : copy.cta.sound;
  const useSplitStage = liteMode && isSplit;

  const content = (
    <div className={useSplitStage ? 'max-w-xl' : 'max-w-md'}>
      <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter font-display uppercase drop-shadow-2xl text-balance">
        <ScrambleText text="Luis Martinez" />
        <span className="block text-cyan-400 text-base md:text-xl mt-3 font-mono tracking-widest font-normal">
          <ScrambleText text={copy.role} />
        </span>
      </h1>

      <p className="text-gray-200 mt-5 text-sm md:text-base leading-relaxed font-sans text-pretty">
        {copy.description}
      </p>

      {useSplitStage && copy.pillars && copy.pillars.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-slate-400">
          {copy.pillars.map((pillar, idx) => (
            <React.Fragment key={pillar}>
              {idx > 0 && <span aria-hidden="true" className="text-cyan-400/70">·</span>}
              <span>{pillar}</span>
            </React.Fragment>
          ))}
        </p>
      )}

      {HERO_MEDIA.hasAudio && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            onMouseEnter={playHoverSound}
            aria-pressed={heroEnded ? undefined : soundOn}
            data-sound-toggle
            className={`${ACTION_CLASS} border-white/25 bg-black/50 text-gray-100 hover:bg-white/15`}
          >
            <SoundIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {soundLabel}
          </button>
        </div>
      )}
    </div>
  );

  if (useSplitStage) {
    return (
      <div
        className={`absolute inset-0 z-10 pointer-events-none transition-all duration-700 ease-out
          ${hidden ? 'invisible opacity-0 -translate-y-5 blur-md' : 'visible opacity-100 blur-0'}`}
      >
        <div className="mx-auto w-full max-w-[1060px] h-full px-8 lg:px-12 pt-16 pb-28 grid grid-cols-[1.15fr_0.85fr] items-center gap-8 lg:gap-12">
          {content}
          <div aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute left-6 right-6 top-24 md:left-10 md:right-auto md:top-10 z-10 pointer-events-none transition-all duration-700 ease-out
        ${hidden ? 'invisible opacity-0 -translate-y-5 blur-md' : 'visible opacity-100 blur-0'}`}
    >
      {content}
    </div>
  );
};

export default Hero;
