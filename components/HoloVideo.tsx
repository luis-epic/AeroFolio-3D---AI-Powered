import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  CylinderGeometry,
  Mesh,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  TorusGeometry,
  VideoTexture,
} from 'three';
import { HERO_MEDIA } from '../constants';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { attachHeroVideo, switchToFullClip } from '../utils/heroPlayer';

interface HoloVideoProps {
  paused: boolean;
  soundOn: boolean;
  onSoundEnd: () => void;
}

// The clip is portrait (9:16); the plane keeps that ratio so the whole frame,
// and with it the whole figure, is always visible.
const PLANE_HEIGHT = 5.6;
const PLANE_WIDTH = (PLANE_HEIGHT * 9) / 16;
const HOLO_COLOR = '#00ffff';
const PEDESTAL_HEIGHT = 1.25;

const prefersSaveData = (): boolean =>
  typeof navigator !== 'undefined' &&
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

// Fades the frame edges out so the clip reads as a projection, not a screen.
const createEdgeFade = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
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
  }
  return new CanvasTexture(canvas);
};

const loadImageTexture = (url: string): Texture => {
  const texture = new TextureLoader().load(url);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const HoloVideo: React.FC<HoloVideoProps> = ({ paused, soundOn, onSoundEnd }) => {
  const ringRef = useRef<Mesh>(null);
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
  useEffect(() => () => edgeFade.dispose(), [edgeFade]);

  const baseGeo = useMemo(() => new CylinderGeometry(0.75, 0.9, 0.08, 32), []);
  const ringGeo = useMemo(() => new TorusGeometry(1.05, 0.008, 8, 64), []);

  useEffect(() => {
    if (showStill) return;

    const element = document.createElement('video');
    element.dataset.clip = useMobileClip ? 'mobile' : 'full';
    element.src = useMobileClip ? HERO_MEDIA.mp4Mobile : HERO_MEDIA.mp4;
    element.crossOrigin = 'anonymous';
    element.muted = true;
    element.loop = true;
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

  // With sound the presentation plays once, then drops back to the silent
  // loop. The restart itself happens in the click (see utils/heroPlayer).
  useEffect(() => {
    if (!video) return;
    if (soundOn) switchToFullClip(video);
    video.muted = !soundOn;
    video.loop = !soundOn;
    if (!soundOn) return;

    video.addEventListener('ended', onSoundEnd);
    return () => video.removeEventListener('ended', onSoundEnd);
  }, [video, soundOn, onSoundEnd]);

  useEffect(() => {
    if (!video) return;

    const sync = () => {
      if (paused || document.hidden) {
        video.pause();
      } else {
        // Autoplay can be refused (e.g. iOS low power mode); the poster stays
        // visible. If it was refused because of the sound, fall back to muted.
        video.play().catch(() => {
          if (soundOn) onSoundEnd();
        });
      }
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [video, paused, soundOn, onSoundEnd]);

  useFrame((state) => {
    if (ringRef.current && !prefersReducedMotion) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.2;
    }
  });

  const map = videoTexture ?? imageTexture;

  return (
    // Raised on a pedestal so the projector base clears the laptop in front of it.
    <group position={[0, PEDESTAL_HEIGHT - 0.5, -3]}>
      <mesh position={[0, -PEDESTAL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.45, 0.6, PEDESTAL_HEIGHT, 24]} />
        <meshStandardMaterial color="#0b1120" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.04, 0]} geometry={baseGeo}>
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={ringGeo}>
        <meshBasicMaterial color={HOLO_COLOR} transparent opacity={0.5} blending={AdditiveBlending} toneMapped={false} />
      </mesh>

      {map && (
        <mesh position={[0, PLANE_HEIGHT / 2 + 0.1, 0]}>
          <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
          <meshBasicMaterial
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
