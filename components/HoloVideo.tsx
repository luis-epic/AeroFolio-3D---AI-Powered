import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  VideoTexture,
} from 'three';
import { HERO_MEDIA } from '../constants';
import { useMediaQuery } from '../hooks/useMediaQuery';
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
// and with it the whole figure, is always visible.
const PLANE_HEIGHT = 4.9;
const PLANE_WIDTH = (PLANE_HEIGHT * 9) / 16;
const HOLO_COLOR = '#00ffff';

// The emitter floats high enough that, seen from the home camera, it clears
// the laptop in front of it and the row of labels above the desk objects.
const EMITTER_Y = 1.95;
const EMITTER_RADIUS = 1;
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

// Fades the frame edges out so the clip reads as a projection, not a screen.
const createEdgeFade = (): CanvasTexture =>
  createGradientTexture(64, 128, (ctx, canvas) => {
    const horizontal = ctx.createLinearGradient(0, 0, canvas.width, 0);
    horizontal.addColorStop(0, '#000');
    horizontal.addColorStop(0.14, '#fff');
    horizontal.addColorStop(0.86, '#fff');
    horizontal.addColorStop(1, '#000');
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const vertical = ctx.createLinearGradient(0, 0, 0, canvas.height);
    vertical.addColorStop(0, '#000');
    vertical.addColorStop(0.1, '#fff');
    vertical.addColorStop(0.9, '#fff');
    vertical.addColorStop(1, '#000');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vertical;
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
  return texture;
};

const HoloVideo: React.FC<HoloVideoProps> = ({ paused, soundOn, onSoundEnd, onEnded }) => {
  const ringRef = useRef<Mesh>(null);
  const scanRef = useRef<Mesh>(null);
  const pictureRef = useRef<Mesh>(null);
  const pictureMaterialRef = useRef<MeshBasicMaterial>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isSmallScreen = useMediaQuery('(max-width: 767px)');
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  // Asking for sound is an explicit request to play, so it overrides the still.
  const showStill = (prefersReducedMotion || prefersSaveData()) && !soundOn;
  const useMobileClip = isSmallScreen;

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
  useEffect(
    () => () => {
      edgeFade.dispose();
      beamFade.dispose();
      scanFade.dispose();
    },
    [edgeFade, beamFade, scanFade],
  );

  useEffect(() => {
    if (showStill) return;

    const element = document.createElement('video');
    element.dataset.clip = useMobileClip ? 'mobile' : 'full';
    element.src = useMobileClip ? HERO_MEDIA.mp4Mobile : HERO_MEDIA.mp4;
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
  }, [showStill, useMobileClip]);

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
      pictureMaterialRef.current.opacity = 0.93 + Math.sin(t * 9) * 0.03 + Math.sin(t * 23) * 0.02;
    }
  });

  const map = videoTexture ?? imageTexture;

  return (
    <group position={[0, EMITTER_Y, -3]}>
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
          <planeGeometry args={[PLANE_WIDTH * 0.92, SCAN_HEIGHT]} />
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
