import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, RotateCcw, Volume1, Volume2, VolumeX } from 'lucide-react';
import { HERO_MEDIA, HERO_SPLIT_QUERY } from '../../constants';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { playClickSound, playHoverSound } from '../../utils/soundEngine';
import ScrambleText from './ScrambleText';

export interface HeroCopy {
  role: string;
  description: string;
  pillars?: string[];
  cta: {
    sound: string;
    mute: string;
    replay: string;
    volume: string;
  };
}

interface HeroProps {
  hidden: boolean;
  copy: HeroCopy;
  soundOn: boolean;
  heroEnded: boolean;
  onToggleSound: () => void;
  volume: number;
  onChangeVolume: (nextVolume: number) => void;
  liteMode?: boolean;
}

const Hero: React.FC<HeroProps> = ({
  hidden,
  copy,
  soundOn,
  heroEnded,
  onToggleSound,
  volume,
  onChangeVolume,
  liteMode = false,
}) => {
  const isSplit = useMediaQuery(HERO_SPLIT_QUERY);
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);

  const effectiveVolume = soundOn ? volume : 0;
  const volumePct = Math.round(volume * 100);
  const displayPct = soundOn ? volumePct : 0;
  const isVolumeOpen = !hidden && (hovered || pinnedOpen);

  useEffect(() => {
    if (hidden) {
      setHovered(false);
      setPinnedOpen(false);
    }
  }, [hidden]);

  useEffect(() => {
    if (!pinnedOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (controlRef.current && !controlRef.current.contains(e.target as Node)) {
        setPinnedOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [pinnedOpen]);

  const SoundIcon = heroEnded
    ? RotateCcw
    : !soundOn || volume <= 0
      ? VolumeX
      : volume < 0.45
        ? Volume1
        : Volume2;
  const soundLabel = heroEnded ? copy.cta.replay : soundOn && volume > 0 ? copy.cta.mute : copy.cta.sound;
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
        <div className="mt-6 flex items-center">
          <div
            ref={controlRef}
            role="group"
            aria-label={copy.cta.volume}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="pointer-events-auto relative inline-block"
          >
            <div className="inline-flex items-center rounded-full border border-white/25 bg-black/55 backdrop-blur-md transition-colors hover:border-cyan-400/45">
              <button
                type="button"
                onClick={onToggleSound}
                onMouseEnter={playHoverSound}
                aria-pressed={heroEnded ? undefined : soundOn}
                data-sound-toggle
                className="inline-flex items-center gap-2 rounded-l-full py-2 pl-4 pr-3 font-mono text-xs uppercase tracking-wider text-gray-100 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <SoundIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                {soundLabel}
              </button>

              <span aria-hidden="true" className="h-4 w-px bg-white/15" />

              <button
                type="button"
                data-volume-control
                onClick={() => {
                  playClickSound();
                  setPinnedOpen((prev) => !prev);
                }}
                onMouseEnter={playHoverSound}
                aria-expanded={isVolumeOpen}
                aria-label={copy.cta.volume}
                title={copy.cta.volume}
                className="inline-flex items-center gap-1 rounded-r-full py-2 pl-2.5 pr-3 font-mono text-[11px] tabular-nums text-cyan-300 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
              >
                <span>{displayPct}%</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${isVolumeOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Dropdown volume panel deployed directly beneath the Listen/Replay button */}
            <div
              data-volume-control
              className={`absolute left-0 top-full pt-2 z-30 transition-all duration-200 origin-top ${
                isVolumeOpen
                  ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
                  : 'opacity-0 scale-95 pointer-events-none -translate-y-1'
              }`}
            >
              <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-400/30 bg-[#070b14]/95 px-3.5 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] backdrop-blur-md">
                <button
                  type="button"
                  onClick={onToggleSound}
                  aria-label={soundOn && volume > 0 ? copy.cta.mute : copy.cta.sound}
                  className="text-cyan-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 rounded"
                >
                  {!soundOn || volume <= 0 ? (
                    <VolumeX aria-hidden="true" className="h-4 w-4" />
                  ) : volume < 0.45 ? (
                    <Volume1 aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Volume2 aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
                <label htmlFor="hero-volume-slider" className="sr-only">
                  {copy.cta.volume}
                </label>
                <input
                  id="hero-volume-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={displayPct}
                  aria-label={copy.cta.volume}
                  aria-valuetext={`${displayPct}%`}
                  onChange={(e) => {
                    const next = Number(e.target.value) / 100;
                    onChangeVolume(next);
                  }}
                  className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                />
                <span className="w-9 text-right font-mono text-[11px] tabular-nums text-cyan-300">
                  {Math.round(effectiveVolume * 100)}%
                </span>
              </div>
            </div>
          </div>
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
