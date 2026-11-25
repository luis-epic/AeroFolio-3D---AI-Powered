import { HERO_MEDIA } from '../constants';

const DRACO_BASE = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export const ROOM_GLB_URLS = [
  './models/library_low_poly.glb',
  './models/hologram_projector_with_hologram.glb',
  './models/laptop_and_mouse.glb',
  './models/iphone_15_pro_max_made_in_blender.glb',
] as const;

const bufferPromises = new Map<string, Promise<ArrayBuffer | null>>();
let dracoWarmed = false;
let heroVideoPreloadStarted = false;
let preloadedVideo: HTMLVideoElement | null = null;
let preloadedVideoClaimed = false;
let preloadedClipKind: 'mobile' | 'full' | null = null;
let preloadedVideoReady = false;
const videoReadyListeners = new Set<() => void>();

/**
 * Starts fetching a GLB file as an ArrayBuffer immediately (without waiting for
 * Three.js / GLTFLoader JS chunks to download and parse).
 */
export function prefetchGlbBuffer(url: string): Promise<ArrayBuffer | null> {
  const existing = bufferPromises.get(url);
  if (existing) return existing;

  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    const empty = Promise.resolve(null);
    bufferPromises.set(url, empty);
    return empty;
  }

  const p = fetch(url, { credentials: 'same-origin' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .catch(() => null);

  bufferPromises.set(url, p);
  return p;
}

export function getPreloadedGlbBuffer(fileName: string): Promise<ArrayBuffer | null> {
  return prefetchGlbBuffer(`./models/${fileName}`);
}

/**
 * Warms the browser cache for the Draco WASM decoder + wrapper script so
 * DRACOLoader initializes instantly as soon as Scene mounts.
 */
export function prefetchDracoDecoder(): void {
  if (dracoWarmed || typeof window === 'undefined' || typeof fetch === 'undefined') return;
  dracoWarmed = true;
  void fetch(`${DRACO_BASE}draco_wasm_wrapper.js`, { mode: 'cors' }).catch(() => undefined);
  void fetch(`${DRACO_BASE}draco_decoder.wasm`, { mode: 'cors' }).catch(() => undefined);
}

/**
 * Starts buffering the hero video immediately on boot in parallel with JS & GLBs
 * instead of waiting for 3D Suspense to finish before touching the video network request.
 */
export function prefetchHeroVideo(): void {
  if (heroVideoPreloadStarted || typeof document === 'undefined') return;
  heroVideoPreloadStarted = true;

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData =
    typeof navigator !== 'undefined' &&
    Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  if (prefersReduced || saveData) return;

  const useMobileClip = typeof window !== 'undefined' && window.innerWidth < 768;
  const clipKind: 'mobile' | 'full' = useMobileClip ? 'mobile' : 'full';
  const el = document.createElement('video');
  el.dataset.clip = clipKind;
  el.src = useMobileClip ? HERO_MEDIA.mp4Mobile : HERO_MEDIA.mp4;
  el.crossOrigin = 'anonymous';
  el.muted = true;
  el.loop = false;
  el.playsInline = true;
  el.preload = 'auto';

  const markReady = () => {
    preloadedVideoReady = true;
    videoReadyListeners.forEach((cb) => cb());
    videoReadyListeners.clear();
  };

  el.addEventListener('loadeddata', markReady, { once: true });
  el.addEventListener('canplay', markReady, { once: true });
  el.addEventListener('error', markReady, { once: true });
  el.load();

  preloadedVideo = el;
  preloadedClipKind = clipKind;
  preloadedVideoClaimed = false;
}

/**
 * Hands over the pre-buffered hero <video> element to HoloVideo so playback and
 * VideoTexture creation happen immediately without a second download.
 */
export function claimPreloadedHeroVideo(expectedKind: 'mobile' | 'full'): {
  element: HTMLVideoElement;
  alreadyReady: boolean;
} | null {
  if (!preloadedVideo || preloadedVideoClaimed || preloadedClipKind !== expectedKind) {
    return null;
  }
  preloadedVideoClaimed = true;
  const element = preloadedVideo;
  const alreadyReady = preloadedVideoReady || element.readyState >= 2;
  preloadedVideo = null;
  return { element, alreadyReady };
}

/**
 * Launches all 3D + media network fetches in parallel at app boot (t = 0).
 */
export function startEarlyAssetPreload(liteMode: boolean): void {
  prefetchHeroVideo();
  if (liteMode) return;
  prefetchDracoDecoder();
  for (const url of ROOM_GLB_URLS) {
    void prefetchGlbBuffer(url);
  }
}
