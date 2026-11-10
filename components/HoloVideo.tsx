import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  VideoTexture,
} from 'three';
import { HERO_MEDIA } from '../constants';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { attachHeroVideo, switchToFullClip } from '../utils/heroPlayer';

interface HoloVideoProps {
  paused: boolean;
  soundOn: boolean;
  /** Audible playback was refused; the caller falls back to muted. */
  onSoundEnd: () => void;
  /** The clip played through. It stays frozen on its last frame. */
  onEnded: () => void;
}

// The clip is portrait (9:16); the plane keeps that ratio so the whole frame,
// and with it the whole presentation, name, and UI elements, are fully visible.
const PLANE_HEIGHT = 6.0;
const PLANE_WIDTH = (PLANE_HEIGHT * 9) / 16;
const HOLO_COLOR = '#00ffff';

// The emitter floats high enough that, seen from the home camera, it clears
// the laptop in front of it and the row of labels above the desk objects.
const EMITTER_Y = 1.35;
const EMITTER_RADIUS = 1.15;
const BEAM_HEIGHT = 1;
const SCAN_HEIGHT = 0.7;
const SCAN_PERIOD = 5;

const prefersSaveData = (): boolean =>
  typeof navigator !== 'undefined' &&
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

const createGradientTexture = (
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx, canvas);
  return new CanvasTexture(canvas);
};

// Procedurally generated high-precision Hermite edge-fade alpha map.
// Feathers the lateral edges softly so the video doesn't have harsh cut-off borders against the dark 3D scene,
// while keeping 100% solid opacity across the engineer's name ("ING. LUIS MARTÍNEZ") and HUD graphics.
const createEdgeFade = (): CanvasTexture =>
  createGradientTexture(256, 512, (ctx, canvas) => {
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    const smoothstep = (min: number, max: number, value: number) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    for (let y = 0; y < h; y++) {
      const v = y / (h - 1); // 0 at top, 1 at bottom
      // Vertical fade: smooth top entry and bottom dissolution into the hologram emitter cone
      let fadeY = 1.0;
      if (v < 0.02) {
        fadeY = smoothstep(0.0, 0.02, v);
      } else if (v > 0.88) {
        fadeY = 1.0 - smoothstep(0.88, 0.995, v);
      }

      for (let x = 0; x < w; x++) {
        const u = x / (w - 1); // 0 at left, 1 at right

        // Horizontal feathering:
        // Left: smooth 6.5% Hermite roll-off eliminating the rectangular slate seam
        // Right: full 1.0 opacity up to 0.956 protecting the full text of 'ING. LUIS MARTÍNEZ',
        // followed by a smooth roll-off to 0 at 1.000 eliminating the right seam
        let fadeX = 1.0;
        if (u < 0.065) {
          fadeX = smoothstep(0.0, 0.065, u);
        } else if (u > 0.956) {
          fadeX = 1.0 - smoothstep(0.956, 1.0, u);
        }

        const alpha = Math.round(fadeX * fadeY * 255);
        const idx = (y * w + x) * 4;
        data[idx] = alpha;     // R
        data[idx + 1] = alpha; // G (Three.js alphaMap samples the green channel)
        data[idx + 2] = alpha; // B
        data[idx + 3] = alpha; // A
      }
    }

    ctx.putImageData(imgData, 0, 0);
  });

// Soft cyan holographic aura texture that extends slightly beyond the video bounds,
// giving it an ethereal spatial dispersion and dissolving the perimeter into the 3D room.
const createBackGlowTexture = (): CanvasTexture =>
  createGradientTexture(256, 512, (ctx, canvas) => {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rx = canvas.width / 2;
    const ry = canvas.height / 2;

    const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    rad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    rad.addColorStop(0.3, 'rgba(0, 220, 255, 0.20)');
    rad.addColorStop(0.65, 'rgba(0, 160, 255, 0.07)');
    rad.addColorStop(0.88, 'rgba(0, 100, 255, 0.015)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

// Bright at the emitter, gone by the time the beam reaches the picture.
const createBeamFade = (): CanvasTexture =>
  createGradientTexture(4, 64, (ctx, canvas) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(1, '#fff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

// A soft horizontal band, used for the scan line that sweeps the picture.
const createScanFade = (): CanvasTexture =>
  createGradientTexture(4, 64, (ctx, canvas) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(0.5, '#fff');
    gradient.addColorStop(1, '#000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

const loadImageTexture = (url: string): Texture => {
  const texture = new TextureLoader().load(url);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 16;
  return texture;
};

const HoloVideo: React.FC<HoloVideoProps> = ({ paused, soundOn, onSoundEnd, onEnded }) => {
  const ringRef = useRef<Mesh>(null);
  const scanRef = useRef<Mesh>(null);
  const pictureRef = useRef<Mesh>(null);
  const pictureMaterialRef = useRef<MeshBasicMaterial>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  // Asking for sound is an explicit request to play, so it overrides the still.
  const showStill = (prefersReducedMotion || prefersSaveData()) && !soundOn;

  // Shown until the first video frame decodes, and permanently for visitors who
  // asked for reduced motion or data saving.
  //
  // Loaded in an effect, never during render: TextureLoader.load() notifies
  // three's loading manager synchronously, which updates the <Loader> fallback.
  // Doing that mid-render restarts the suspended render, which loads again, and
  // the scene never leaves its loading state.
  const [imageTexture, setImageTexture] = useState<Texture | null>(null);
  useEffect(() => {
    const texture = loadImageTexture(showStill ? HERO_MEDIA.still : HERO_MEDIA.poster);
    setImageTexture(texture);
    return () => {
      texture.dispose();
      setImageTexture(null);
    };
  }, [showStill]);

  const edgeFade = useMemo(createEdgeFade, []);
  const beamFade = useMemo(createBeamFade, []);
  const scanFade = useMemo(createScanFade, []);
  const backGlowTexture = useMemo(createBackGlowTexture, []);
  useEffect(
    () => () => {
      edgeFade.dispose();
      beamFade.dispose();
      scanFade.dispose();
      backGlowTexture.dispose();
    },
    [edgeFade, beamFade, scanFade, backGlowTexture],
  );

  useEffect(() => {
    if (showStill) return;

    const element = document.createElement('video');
    element.dataset.clip = 'full';
    // Always use the master 720x1280 3.4Mbps high-definition clip for pristine visual quality
    element.src = HERO_MEDIA.mp4;
    element.crossOrigin = 'anonymous';
    element.muted = true;
    // Plays once. When it ends the texture keeps the last frame, so the
    // hologram rests on a final pose instead of starting over.
    element.loop = false;
    element.playsInline = true;
    element.preload = 'auto';

    let texture: VideoTexture | null = null;
    const onReady = () => {
      texture = new VideoTexture(element);
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = 16; // Maximum anisotropic filtering for razor-sharp rendering
      setVideoTexture(texture);
    };
    element.addEventListener('loadeddata', onReady, { once: true });
    setVideo(element);
    const detach = attachHeroVideo(element);

    return () => {
      detach();
      element.removeEventListener('loadeddata', onReady);
      element.pause();
      element.removeAttribute('src');
      element.load();
      texture?.dispose();
      setVideoTexture(null);
      setVideo(null);
    };
  }, [showStill]);

  // The restart with sound happens in the click (see utils/heroPlayer).
  useEffect(() => {
    if (!video) return;
    if (soundOn) switchToFullClip(video);
    video.muted = !soundOn;
  }, [video, soundOn]);

  useEffect(() => {
    if (!video) return;
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [video, onEnded]);

  useEffect(() => {
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
  }, [video, paused, soundOn, onSoundEnd]);

  // These keep the projection alive while the picture itself is frozen.
  useFrame((state) => {
    const picture = pictureRef.current;
    if (prefersReducedMotion) {
      picture?.scale.setY(1);
      return;
    }
    const t = state.clock.getElapsedTime();

    // The picture unfolds from a line when the projector switches on.
    if (picture) picture.scale.y += (1 - picture.scale.y) * 0.08;

    if (ringRef.current) ringRef.current.rotation.z = t * 0.2;

    if (scanRef.current) {
      const progress = (t % SCAN_PERIOD) / SCAN_PERIOD;
      scanRef.current.position.y = 0.1 + SCAN_HEIGHT / 2 + progress * (PLANE_HEIGHT - SCAN_HEIGHT);
    }

    if (pictureMaterialRef.current) {
      pictureMaterialRef.current.opacity = 0.98 + Math.sin(t * 9) * 0.02;
    }
  });

  const map = videoTexture ?? imageTexture;

  return (
    <group position={[0, EMITTER_Y, -2.4]}>
      {/* Floating emitter */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[EMITTER_RADIUS, EMITTER_RADIUS * 0.82, 0.12, 48]} />
        <meshStandardMaterial color="#111c33" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.5, 0.16, 0.26, 32]} />
        <meshStandardMaterial color="#0b1120" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, EMITTER_RADIUS * 0.9, 48]} />
        <meshBasicMaterial color={HOLO_COLOR} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[EMITTER_RADIUS, 0.022, 8, 64]} />
        <meshBasicMaterial color={HOLO_COLOR} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.012, 8, 48, Math.PI * 1.6]} />
        <meshBasicMaterial color={HOLO_COLOR} transparent opacity={0.7} blending={AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* Light cone from the emitter up to the picture */}
      <mesh position={[0, BEAM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[PLANE_WIDTH / 2, EMITTER_RADIUS * 0.85, BEAM_HEIGHT, 48, 1, true]} />
        <meshBasicMaterial
          color={HOLO_COLOR}
          alphaMap={beamFade}
          transparent
          opacity={0.16}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/* Atmospheric holographic edge aura that softly diffuses video boundaries into the room */}
      <mesh position={[0, PLANE_HEIGHT / 2 + 0.1, -0.015]}>
        <planeGeometry args={[PLANE_WIDTH * 1.18, PLANE_HEIGHT * 1.05]} />
        <meshBasicMaterial
          map={backGlowTexture}
          transparent
          opacity={0.32}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {map && (
        <mesh ref={pictureRef} position={[0, PLANE_HEIGHT / 2 + 0.1, 0]} scale={[1, 0.01, 1]}>
          <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
          <meshBasicMaterial
            ref={pictureMaterialRef}
            key={map.uuid}
            map={map}
            alphaMap={edgeFade}
            transparent
            depthWrite={false}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}

      {!prefersReducedMotion && (
        <mesh ref={scanRef} position={[0, 0.1 + SCAN_HEIGHT / 2, 0.02]}>
          <planeGeometry args={[PLANE_WIDTH * 0.98, SCAN_HEIGHT]} />
          <meshBasicMaterial
            color={HOLO_COLOR}
            alphaMap={scanFade}
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}

      <Sparkles
        position={[0, PLANE_HEIGHT / 2, 0.1]}
        scale={[PLANE_WIDTH + 0.6, PLANE_HEIGHT, 0.6]}
        count={24}
        speed={0.8}
        color={HOLO_COLOR}
        size={3}
        opacity={0.5}
        noise={0.5}
      />
    </group>
  );
};

export default HoloVideo;
