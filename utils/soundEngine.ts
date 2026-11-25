// A lightweight procedural sound engine using Web Audio API
// Generates Sci-Fi UI sounds and immersive ambient space audio without requiring external assets

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let audioCtx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  // Browser Autoplay Policy: Resume context if suspended
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
};

// ==========================================
// 1. UI PROCEDURAL SFX
// ==========================================

export const playHoverSound = (): void => {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // High pitch sci-fi blip
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.02, ctx.currentTime); // Very quiet
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
};

export const playClickSound = (): void => {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Mechanical/Digital click
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

export const playTypeSound = (): void => {
  const ctx = getContext();
  if (!ctx) return;

  // Key switch sound (filtered noise)
  const bufferSize = ctx.sampleRate * 0.05; // 50ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.015, ctx.currentTime); // Subtle
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
};

// ==========================================
// 2. AMBIENT BACKGROUND AUDIO (DISABLED BY USER PREFERENCE)
// ==========================================
// Background ambient drone has been disabled so only intentional video audio (at 30%)
// and subtle UI interaction SFX play. Exports remain safe no-ops for callers.

interface AmbientEngineState {
  isPlaying: boolean;
  isMuted: boolean;
}

const ambientState: AmbientEngineState = {
  isPlaying: false,
  isMuted: true,
};

type AmbientSubscriber = (state: { isPlaying: boolean; isMuted: boolean }) => void;

export const subscribeAmbientState = (cb: AmbientSubscriber): (() => void) => {
  cb({ isPlaying: false, isMuted: true });
  return () => undefined;
};

export const isAmbientPlaying = (): boolean => ambientState.isPlaying;
export const isAmbientMuted = (): boolean => ambientState.isMuted;

export const startAmbientAudio = (_fadeInDuration = 2.5): void => {
  // Disabled intentionally
};

export const stopAmbientAudio = (_fadeOutDuration = 1.5): void => {
  ambientState.isPlaying = false;
};

export const duckAmbient = (_duckRatio = 0.25, _duration = 0.6): void => {
  // Disabled intentionally
};

export const unduckAmbient = (_duration = 1.0): void => {
  // Disabled intentionally
};

export const toggleAmbientAudio = (): boolean => {
  return false;
};

export const setAmbientMuted = (_muted: boolean, _fadeDuration = 1.2): void => {
  ambientState.isMuted = true;
  ambientState.isPlaying = false;
};

export const initAutoAmbientTrigger = (): (() => void) => {
  return () => undefined;
};