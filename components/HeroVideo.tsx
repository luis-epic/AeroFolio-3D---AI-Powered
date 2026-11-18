import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { HERO_MEDIA, HERO_SPLIT_QUERY } from '../constants';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { attachHeroVideo, switchToFullClip } from '../utils/heroPlayer';

interface HeroVideoProps {
  paused: boolean;
  soundOn: boolean;
  onSoundEnd: () => void;
  onEnded: () => void;
}

const prefersSaveData = (): boolean =>
  typeof navigator !== 'undefined' &&
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

const HeroVideo: React.FC<HeroVideoProps> = ({ paused, soundOn, onSoundEnd, onEnded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isSplit = useMediaQuery(HERO_SPLIT_QUERY);
  const [failed, setFailed] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Asking for sound is an explicit request to play, so it overrides the still.
  const showStill = failed || ((prefersReducedMotion || prefersSaveData()) && !soundOn);
  // Serve compact 708KB clip on mobile when muted for instant load; desktop uses full HD clip.
  const src = !isSplit && !soundOn ? HERO_MEDIA.mp4Mobile : HERO_MEDIA.mp4;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.dataset.clip = !isSplit && !soundOn ? 'mobile' : 'full';
    return attachHeroVideo(video);
  }, [showStill, isSplit, soundOn]);

  // The restart with sound happens in the click (see utils/heroPlayer).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (soundOn) {
      switchToFullClip(video);
      setUserPaused(false);
    }
    video.muted = !soundOn;
  }, [soundOn, showStill, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () => {
      if (paused || userPaused || document.hidden) {
        video.pause();
        return;
      }
      // play() on a finished clip would start it over; only an explicit
      // replay (utils/heroPlayer) does that.
      if (video.ended) return;
      // Autoplay can be refused (e.g. iOS low power mode); the poster stays
      // visible. If it was refused because of the sound, fall back to muted.
      video.play().catch(() => {
        if (soundOn) onSoundEnd();
      });
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [paused, userPaused, showStill, src, soundOn, onSoundEnd]);

  const handleTogglePlayback = () => {
    const video = videoRef.current;
    if (!video || showStill || paused) return;

    if (video.ended) {
      video.currentTime = 0;
      setProgress(0);
      setUserPaused(false);
      video.play().catch(() => {
        if (soundOn) onSoundEnd();
      });
      return;
    }

    if (video.paused) {
      setUserPaused(false);
      video.play().catch(() => {
        if (soundOn) onSoundEnd();
      });
    } else {
      setUserPaused(true);
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration || Number.isNaN(video.duration)) return;
    setProgress(Math.min(1, Math.max(0, video.currentTime / video.duration)));
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#04070d]">
      {/* Unified studio depth backdrop matching hero-poster so there is no pitch-black chasm */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-35 scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${HERO_MEDIA.poster})` }}
      />

      {/* Ambient studio radial lighting connecting the copy and presentation frame */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 65% at 62% 48%, rgba(6, 182, 212, 0.16), rgba(15, 23, 42, 0.55) 55%, rgba(4, 7, 13, 0.92) 100%), radial-gradient(ellipse 45% 45% at 32% 48%, rgba(236, 72, 153, 0.08), transparent 72%)',
        }}
      />

      {/* Subtle zero-WebGL architectural grid across the stage */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(56, 189, 248, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.14) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 85% 75% at 52% 48%, #000 25%, transparent 82%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 52% 48%, #000 25%, transparent 82%)',
        }}
      />

      {isSplit ? (
        /* Centered 2-column architectural showcase synced strictly with Hero.tsx */
        <div className="relative mx-auto w-full max-w-[1060px] h-full px-8 lg:px-12 pt-16 pb-28 grid grid-cols-[1.15fr_0.85fr] items-center gap-8 lg:gap-12">
          <div aria-hidden="true" />
          <div className="justify-self-start relative h-[min(74vh,680px)] aspect-[9/16] rounded-2xl border border-cyan-400/20 bg-black/50 overflow-hidden shadow-[0_0_55px_rgba(0,240,255,0.12),0_24px_64px_rgba(0,0,0,0.85)] group">
            {showStill ? (
              <img src={HERO_MEDIA.still} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={src}
                  poster={HERO_MEDIA.poster}
                  autoPlay
                  muted
                  onPlay={() => setUserPaused(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => {
                    setProgress(1);
                    onEnded();
                  }}
                  playsInline
                  preload="metadata"
                  tabIndex={-1}
                  onError={() => setFailed(true)}
                  className="h-full w-full object-cover"
                />

                {/* Direct stage play/pause control */}
                <button
                  type="button"
                  data-video-control
                  onClick={handleTogglePlayback}
                  aria-label={userPaused ? 'Play presentation video' : 'Pause presentation video'}
                  aria-pressed={userPaused}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 transition-colors cursor-pointer"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white backdrop-blur-md transition-all duration-200 ${
                      userPaused
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                    }`}
                  >
                    {userPaused ? (
                      <Play aria-hidden="true" className="h-5 w-5 translate-x-0.5" />
                    ) : (
                      <Pause aria-hidden="true" className="h-5 w-5" />
                    )}
                  </span>
                </button>

                {/* Live hairline timeline synced to real video progress */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/10"
                >
                  <div
                    className="h-full w-full origin-left bg-gradient-to-r from-cyan-400 to-pink-400 transition-transform duration-150 ease-linear"
                    style={{ transform: `scaleX(${progress})` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Mobile / portrait fallback: full-height centered presentation with protective text scrim */
        <div className="relative h-full w-full flex items-center justify-center">
          <div className="relative h-full max-h-screen aspect-[9/16] max-w-full flex items-center justify-center overflow-hidden">
            {showStill ? (
              <img src={HERO_MEDIA.still} alt="" className="h-full w-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                src={src}
                poster={HERO_MEDIA.poster}
                autoPlay
                muted
                onPlay={() => setUserPaused(false)}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  setProgress(1);
                  onEnded();
                }}
                playsInline
                preload="metadata"
                tabIndex={-1}
                onError={() => setFailed(true)}
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/70 pointer-events-none"
          />
        </div>
      )}
    </div>
  );
};

export default HeroVideo;
