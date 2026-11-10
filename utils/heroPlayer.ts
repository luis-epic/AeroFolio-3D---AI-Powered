import { HERO_MEDIA } from '../constants';

// Browsers only allow audible playback when it is started synchronously inside
// a user gesture. React effects run too late for Safari and iOS, so the click
// handler reaches the hero <video> through this module instead.
let element: HTMLVideoElement | null = null;

export const attachHeroVideo = (video: HTMLVideoElement): (() => void) => {
  element = video;
  return () => {
    if (element === video) element = null;
  };
};

// The mobile encode has no audio track, so sound always needs the full clip.
export const switchToFullClip = (video: HTMLVideoElement): void => {
  if (video.dataset.clip === 'full') return;
  video.dataset.clip = 'full';
  video.src = HERO_MEDIA.mp4;
};

export const playHeroWithSound = (): void => {
  if (!element) return;
  switchToFullClip(element);
  element.muted = false;
  element.loop = false;
  element.currentTime = 0;
  // A refusal is handled by the component that owns the element.
  element.play().catch(() => undefined);
};
