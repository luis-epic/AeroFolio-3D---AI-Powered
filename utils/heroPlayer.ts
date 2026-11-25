import { HERO_MEDIA } from '../constants';

// Browsers only allow audible playback when it is started synchronously inside
// a user gesture. React effects run too late for Safari and iOS, so the click
// handler reaches the hero <video> through this module instead.
let element: HTMLVideoElement | null = null;

const VOLUME_STORAGE_KEY = 'aerofolio_hero_volume_v1';
export const DEFAULT_HERO_VOLUME = 0.2; // 20% UI slider default

const clamp01 = (v: number): number => Math.min(1, Math.max(0, Number.isFinite(v) ? v : DEFAULT_HERO_VOLUME));

/**
 * Perceptual curve mapping UI slider [0..1] to HTMLMediaElement.volume [0..1]
 * so low/mid percentages feel gentle and controllable instead of blasting loudly.
 */
export const toMediaVolume = (uiVolume: number): number => {
  const clamped = clamp01(uiVolume);
  if (clamped <= 0) return 0;
  return Math.pow(clamped, 1.55);
};

export const loadHeroVolume = (): number => {
  if (typeof window === 'undefined') return DEFAULT_HERO_VOLUME;
  try {
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_HERO_VOLUME;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clamp01(parsed) : DEFAULT_HERO_VOLUME;
  } catch {
    return DEFAULT_HERO_VOLUME;
  }
};

let currentUiVolume = loadHeroVolume();

export const getHeroVolume = (): number => currentUiVolume;

export const getEffectiveHeroMediaVolume = (): number => toMediaVolume(currentUiVolume);

export const setHeroVolume = (uiVolume: number): number => {
  currentUiVolume = clamp01(uiVolume);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(currentUiVolume));
    } catch {
      // Ignore storage quota / privacy errors
    }
  }
  if (element) {
    element.volume = toMediaVolume(currentUiVolume);
  }
  return currentUiVolume;
};

export const hasHeroVideo = (): boolean => element !== null;

export const isHeroAudioAudible = (): boolean =>
  Boolean(element && !element.paused && !element.muted && element.volume > 0);

export const attachHeroVideo = (video: HTMLVideoElement): (() => void) => {
  video.volume = getEffectiveHeroMediaVolume();
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

export const playHeroWithSound = (): boolean => {
  if (!element) return false;
  switchToFullClip(element);
  element.volume = getEffectiveHeroMediaVolume();
  element.muted = currentUiVolume <= 0;
  element.loop = false;
  element.currentTime = 0;
  // A refusal is handled by the component that owns the element.
  element.play().catch(() => undefined);
  return true;
};

/**
 * Unmutes and resumes playback at current timestamp (or restarts if ended)
 * when the user adjusts the volume slider directly.
 */
export const unmuteHeroInPlace = (): boolean => {
  if (!element) return false;
  switchToFullClip(element);
  element.volume = getEffectiveHeroMediaVolume();
  element.muted = currentUiVolume <= 0;
  if (element.ended) {
    element.currentTime = 0;
  }
  if (element.paused) {
    element.play().catch(() => undefined);
  }
  return true;
};
