import React, { useEffect, useRef, useState } from 'react';
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

  // Asking for sound is an explicit request to play, so it overrides the still.
  const showStill = failed || ((prefersReducedMotion || prefersSaveData()) && !soundOn);
  // Always use the high-definition master video for maximum clarity
  const src = HERO_MEDIA.mp4;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.dataset.clip = 'full';
    return attachHeroVideo(video);
  }, [showStill]);

  // The restart with sound happens in the click (see utils/heroPlayer).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (soundOn) switchToFullClip(video);
    video.muted = !soundOn;
  }, [soundOn, showStill, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () => {
      if (paused || document.hidden) {
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
  }, [paused, showStill, src, soundOn, onSoundEnd]);

  // The source is portrait (9:16). Preserves the full aspect ratio with smooth holographic
  // lateral feathering so the presentation, name, and elements are 100% visible without harsh box edges.
  const frameClass = isSplit
    ? 'absolute inset-y-0 right-0 md:right-[4%] lg:right-[8%] h-full aspect-[9/16] flex items-center justify-center'
    : 'absolute inset-0 flex items-center justify-center p-4';
  const mediaClass = isSplit
    ? 'h-full w-full object-contain drop-shadow-[0_0_35px_rgba(0,255,255,0.12)]'
    : 'h-full max-h-screen w-auto max-w-full aspect-[9/16] object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]';

  const lateralMaskStyle: React.CSSProperties = {
    WebkitMaskImage:
      'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 1.5%, rgba(0,0,0,0.7) 3.5%, #000 6.5%, #000 95.6%, rgba(0,0,0,0.7) 97.5%, rgba(0,0,0,0.2) 99%, transparent 100%)',
    maskImage:
      'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 1.5%, rgba(0,0,0,0.7) 3.5%, #000 6.5%, #000 95.6%, rgba(0,0,0,0.7) 97.5%, rgba(0,0,0,0.2) 99%, transparent 100%)',
  };

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050505]">
      {/* Ambient background glow for wide view */}
      <div 
        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${HERO_MEDIA.poster})` }}
      />

      <div className={frameClass} style={lateralMaskStyle}>
        {showStill ? (
          <img src={HERO_MEDIA.still} alt="" className={mediaClass} />
        ) : (
          <video
            ref={videoRef}
            src={src}
            poster={HERO_MEDIA.poster}
            autoPlay
            muted
            onEnded={onEnded}
            playsInline
            preload="metadata"
            tabIndex={-1}
            onError={() => setFailed(true)}
            className={mediaClass}
          />
        )}
      </div>

      {!isSplit && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
      )}
    </div>
  );
};

export default HeroVideo;
