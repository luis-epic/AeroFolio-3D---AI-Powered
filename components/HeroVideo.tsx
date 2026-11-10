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
  const isSmallScreen = useMediaQuery('(max-width: 767px)');
  const [failed, setFailed] = useState(false);

  // Asking for sound is an explicit request to play, so it overrides the still.
  const showStill = failed || ((prefersReducedMotion || prefersSaveData()) && !soundOn);
  const src = isSmallScreen ? HERO_MEDIA.mp4Mobile : HERO_MEDIA.mp4;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.dataset.clip = isSmallScreen ? 'mobile' : 'full';
    return attachHeroVideo(video);
  }, [showStill, isSmallScreen]);

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

  // The source is portrait (9:16). On wide screens it sits in a column on the
  // right at its natural ratio instead of being upscaled and cropped.
  const frameClass = isSplit
    ? 'absolute inset-y-0 right-0 lg:right-[8%] h-full aspect-[9/16] [mask-image:linear-gradient(90deg,transparent,#000_24%,#000_80%,transparent)]'
    : 'absolute inset-0';
  const mediaClass = isSplit
    ? 'h-full w-full object-cover'
    : 'h-full w-full object-cover object-[50%_20%]';

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050505]">
      <div className={frameClass}>
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
      )}
    </div>
  );
};

export default HeroVideo;
