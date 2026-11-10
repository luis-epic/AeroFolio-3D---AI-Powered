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
// 2. PROCEDURAL AMBIENT BACKGROUND AUDIO
// ==========================================
// Generates a multi-layered cyberpunk space drone:
// - Deep resonant sub-bass drone with organic binaural beating
// - Warm atmospheric harmonic pad in suspended cyber minor
// - Gentle celestial high-frequency shimmer / air

const TARGET_AMBIENT_GAIN = 0.085;
const DUCKED_AMBIENT_GAIN = 0.02;

interface AmbientEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isDucked: boolean;
  wasPlayingBeforeHidden: boolean;
  masterGain: GainNode | null;
}

const STORAGE_KEY = 'aerofolio_ambient_muted';

const getInitialMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const ambientState: AmbientEngineState = {
  isInitialized: false,
  isPlaying: false,
  isMuted: getInitialMuted(),
  isDucked: false,
  wasPlayingBeforeHidden: false,
  masterGain: null,
};

type AmbientSubscriber = (state: { isPlaying: boolean; isMuted: boolean }) => void;
const subscribers = new Set<AmbientSubscriber>();

const notifySubscribers = () => {
  const current = { isPlaying: ambientState.isPlaying, isMuted: ambientState.isMuted };
  subscribers.forEach((cb) => {
    try {
      cb(current);
    } catch {
      // Ignore subscriber errors
    }
  });
};

export const subscribeAmbientState = (cb: AmbientSubscriber): (() => void) => {
  subscribers.add(cb);
  cb({ isPlaying: ambientState.isPlaying, isMuted: ambientState.isMuted });
  return () => {
    subscribers.delete(cb);
  };
};

export const isAmbientPlaying = (): boolean => ambientState.isPlaying;
export const isAmbientMuted = (): boolean => ambientState.isMuted;

// Build the procedural Web Audio graph for ambient drone
const buildAmbientGraph = (ctx: AudioContext): GainNode => {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

  // ----------------------------------------------------
  // Layer A: Low Cosmic Sub-Bass Drone (A1 55Hz + Detune)
  // ----------------------------------------------------
  const subOsc1 = ctx.createOscillator();
  subOsc1.type = 'sine';
  subOsc1.frequency.setValueAtTime(55.0, ctx.currentTime); // A1

  const subOsc2 = ctx.createOscillator();
  subOsc2.type = 'triangle';
  subOsc2.frequency.setValueAtTime(55.35, ctx.currentTime); // 0.35 Hz beating

  const subFilter = ctx.createBiquadFilter();
  subFilter.type = 'lowpass';
  subFilter.frequency.setValueAtTime(135, ctx.currentTime);
  subFilter.Q.setValueAtTime(1.8, ctx.currentTime);

  // Sub LFO for breathing filter sweep
  const subLfo = ctx.createOscillator();
  subLfo.type = 'sine';
  subLfo.frequency.setValueAtTime(0.045, ctx.currentTime); // ~22 sec cycle
  const subLfoGain = ctx.createGain();
  subLfoGain.gain.setValueAtTime(45, ctx.currentTime);
  subLfo.connect(subLfoGain);
  subLfoGain.connect(subFilter.frequency);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.045, ctx.currentTime);

  subOsc1.connect(subFilter);
  subOsc2.connect(subFilter);
  subFilter.connect(subGain);
  subGain.connect(masterGain);

  subOsc1.start();
  subOsc2.start();
  subLfo.start();

  // ----------------------------------------------------
  // Layer B: Harmonic Atmosphere Pad (Warm Cyber Chord)
  // Chord: A2 (110Hz), E3 (164.8Hz), A3 (220Hz), B3 (246.9Hz Sus2)
  // ----------------------------------------------------
  const chordFreqs = [110.0, 164.81, 220.0, 246.94];
  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.03, ctx.currentTime);

  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.setValueAtTime(420, ctx.currentTime);
  padFilter.Q.setValueAtTime(1.4, ctx.currentTime);

  const padLfo = ctx.createOscillator();
  padLfo.type = 'sine';
  padLfo.frequency.setValueAtTime(0.065, ctx.currentTime);
  const padLfoGain = ctx.createGain();
  padLfoGain.gain.setValueAtTime(75, ctx.currentTime);
  padLfo.connect(padLfoGain);
  padLfoGain.connect(padFilter.frequency);
  padLfo.start();

  chordFreqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(padFilter);
    osc.start();
  });

  padFilter.connect(padGain);
  padGain.connect(masterGain);

  // ----------------------------------------------------
  // Layer C: Subtle Cosmic Shimmer / Air Texture
  // ----------------------------------------------------
  const noiseBufferSize = ctx.sampleRate * 2; // 2 seconds looped
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBufferSize; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.25;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const shimmerFilter = ctx.createBiquadFilter();
  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.setValueAtTime(1600, ctx.currentTime);
  shimmerFilter.Q.setValueAtTime(4.0, ctx.currentTime);

  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime(0.004, ctx.currentTime);

  const shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine';
  shimmerLfo.frequency.setValueAtTime(0.1, ctx.currentTime);
  const shimmerLfoGain = ctx.createGain();
  shimmerLfoGain.gain.setValueAtTime(0.002, ctx.currentTime);
  shimmerLfo.connect(shimmerLfoGain);
  shimmerLfoGain.connect(shimmerGain.gain);
  shimmerLfo.start();

  noiseSource.connect(shimmerFilter);
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(masterGain);
  noiseSource.start();

  masterGain.connect(ctx.destination);
  return masterGain;
};

/**
 * Starts or fades in the ambient background audio.
 * @param fadeInDuration duration of fade-in ramp in seconds (default: 2.5s)
 */
export const startAmbientAudio = (fadeInDuration = 2.5): void => {
  if (ambientState.isMuted) return;

  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  if (!ambientState.isInitialized || !ambientState.masterGain) {
    ambientState.masterGain = buildAmbientGraph(ctx);
    ambientState.isInitialized = true;
  }

  const gain = ambientState.masterGain.gain;
  const now = ctx.currentTime;
  const targetGain = ambientState.isDucked ? DUCKED_AMBIENT_GAIN : TARGET_AMBIENT_GAIN;

  gain.cancelScheduledValues(now);
  gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
  gain.linearRampToValueAtTime(targetGain, now + Math.max(0.2, fadeInDuration));

  ambientState.isPlaying = true;
  notifySubscribers();
};

/**
 * Fades out the ambient background audio.
 * @param fadeOutDuration duration of fade-out ramp in seconds (default: 1.5s)
 */
export const stopAmbientAudio = (fadeOutDuration = 1.5): void => {
  if (!ambientState.masterGain) {
    ambientState.isPlaying = false;
    notifySubscribers();
    return;
  }

  const ctx = getContext();
  if (!ctx) return;

  const gain = ambientState.masterGain.gain;
  const now = ctx.currentTime;

  gain.cancelScheduledValues(now);
  gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
  gain.linearRampToValueAtTime(0.0001, now + Math.max(0.2, fadeOutDuration));

  ambientState.isPlaying = false;
  notifySubscribers();
};

/**
 * Ducks the ambient background audio to a quieter level (e.g., when speech or video audio plays).
 */
export const duckAmbient = (duckRatio = 0.25, duration = 0.6): void => {
  ambientState.isDucked = true;
  if (!ambientState.masterGain || !ambientState.isPlaying || ambientState.isMuted) return;

  const ctx = getContext();
  if (!ctx) return;

  const gain = ambientState.masterGain.gain;
  const now = ctx.currentTime;
  const target = TARGET_AMBIENT_GAIN * duckRatio;

  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(target, now + duration);
};

/**
 * Restores ambient volume after ducking.
 */
export const unduckAmbient = (duration = 1.0): void => {
  ambientState.isDucked = false;
  if (!ambientState.masterGain || !ambientState.isPlaying || ambientState.isMuted) return;

  const ctx = getContext();
  if (!ctx) return;

  const gain = ambientState.masterGain.gain;
  const now = ctx.currentTime;

  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(TARGET_AMBIENT_GAIN, now + duration);
};

/**
 * Toggles ambient audio mute state.
 */
export const toggleAmbientAudio = (): boolean => {
  const newMuted = !ambientState.isMuted;
  setAmbientMuted(newMuted);
  return !newMuted;
};

/**
 * Sets ambient mute state explicitly with smooth fade transition.
 */
export const setAmbientMuted = (muted: boolean, fadeDuration = 1.2): void => {
  ambientState.isMuted = muted;
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
    }
  } catch {
    // Ignore storage issues
  }

  if (muted) {
    stopAmbientAudio(fadeDuration);
  } else {
    startAmbientAudio(fadeDuration);
  }

  notifySubscribers();
};

/**
 * Initializes automatic ambient sound triggering on the first user interaction.
 * Respects user autoplay policy and muted preference.
 */
export const initAutoAmbientTrigger = (): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const triggerEvents = ['pointerdown', 'touchstart', 'keydown', 'click'] as const;

  const handleFirstInteraction = () => {
    triggerEvents.forEach((evt) => {
      window.removeEventListener(evt, handleFirstInteraction, true);
    });

    if (!ambientState.isMuted) {
      startAmbientAudio(2.5);
    }
  };

  triggerEvents.forEach((evt) => {
    window.addEventListener(evt, handleFirstInteraction, { capture: true, once: true });
  });

  // Handle Page Visibility: fade out when tab is hidden, fade in when returning
  const handleVisibility = () => {
    if (document.hidden) {
      if (ambientState.isPlaying && !ambientState.isMuted) {
        ambientState.wasPlayingBeforeHidden = true;
        stopAmbientAudio(0.8);
      }
    } else {
      if (ambientState.wasPlayingBeforeHidden && !ambientState.isMuted) {
        ambientState.wasPlayingBeforeHidden = false;
        startAmbientAudio(1.8);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    triggerEvents.forEach((evt) => {
      window.removeEventListener(evt, handleFirstInteraction, true);
    });
    document.removeEventListener('visibilitychange', handleVisibility);
  };
};