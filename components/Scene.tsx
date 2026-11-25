import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Glitch } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { Section } from '../types';
import Experience from './Experience';
import { glbLoadingManager, preloadAllRoomGlbs, subscribeGlbProgress } from './GlbRoomElements';
import type { LoadingStage } from './Loader';

import type {
  RoomItemId,
  RoomItemTransform,
  RoomLayoutState,
  TransformGizmoMode,
} from '../utils/roomLayoutStore';
import type { CameraBridge, CameraStudioConfig } from '../utils/cameraTourStore';

const GLITCH_DELAY = new Vector2(0, 0);
const GLITCH_DURATION = new Vector2(0.1, 0.2);
const GLITCH_STRENGTH = new Vector2(0.3, 0.5);

interface PostProcessingRigProps {
  activeSection: Section;
}

const PostProcessingRig: React.FC<PostProcessingRigProps> = ({ activeSection }) => {
  const screenWidth = useThree((state) => state.size.width);
  const isMobile = screenWidth < 768;
  const [triggerGlitch, setTriggerGlitch] = useState(false);
  const firstMountRef = useRef(true);

  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    setTriggerGlitch(true);
    const timer = window.setTimeout(() => setTriggerGlitch(false), 380);
    return () => window.clearTimeout(timer);
  }, [activeSection]);

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      {/* Selective HDR Bloom makes cyber neons & LED fixtures glow without blurring normal textures */}
      <Bloom
        luminanceThreshold={1.05}
        luminanceSmoothing={0.28}
        mipmapBlur
        intensity={isMobile ? 0.48 : 0.8}
        radius={0.6}
      />
      <Glitch
        delay={GLITCH_DELAY}
        duration={GLITCH_DURATION}
        strength={GLITCH_STRENGTH}
        mode={1}
        active={triggerGlitch}
        ratio={0.85}
      />
      <Vignette
        eskil={false}
        offset={0.1}
        darkness={isMobile ? 0.05 : 0.2}
      />
    </EffectComposer>
  );
};

interface LoadCoordinatorProps {
  glbsDone: boolean;
  glbLoaded: number;
  glbTotal: number;
  experienceMounted: boolean;
  holoMediaReady: boolean;
  onLoadProgress: (progress: number, stage: LoadingStage) => void;
  onSceneReady: () => void;
}

const LoadCoordinator: React.FC<LoadCoordinatorProps> = ({
  glbsDone,
  glbLoaded,
  glbTotal,
  experienceMounted,
  holoMediaReady,
  onLoadProgress,
  onSceneReady,
}) => {
  const [managerActive, setManagerActive] = useState(false);
  const [managerProgress, setManagerProgress] = useState(100);
  const readyFiredRef = useRef(false);
  const onProgressRef = useRef(onLoadProgress);
  const onReadyRef = useRef(onSceneReady);
  onProgressRef.current = onLoadProgress;
  onReadyRef.current = onSceneReady;

  useEffect(() => {
    let active = true;
    const prevStart = glbLoadingManager.onStart;
    const prevProgress = glbLoadingManager.onProgress;
    const prevLoad = glbLoadingManager.onLoad;
    const prevError = glbLoadingManager.onError;

    const scheduleUpdate = (nextActive: boolean, nextPct?: number) => {
      queueMicrotask(() => {
        if (!active) return;
        setManagerActive(nextActive);
        if (nextPct !== undefined) setManagerProgress(nextPct);
      });
    };

    glbLoadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
      prevStart?.(url, itemsLoaded, itemsTotal);
      const pct = itemsTotal > 0 ? Math.round((itemsLoaded / itemsTotal) * 100) : 0;
      scheduleUpdate(true, pct);
    };
    glbLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      prevProgress?.(url, itemsLoaded, itemsTotal);
      const pct = itemsTotal > 0 ? Math.round((itemsLoaded / itemsTotal) * 100) : 100;
      scheduleUpdate(itemsLoaded < itemsTotal, pct);
    };
    glbLoadingManager.onLoad = () => {
      prevLoad?.();
      scheduleUpdate(false, 100);
    };
    glbLoadingManager.onError = (url) => {
      prevError?.(url);
    };

    return () => {
      active = false;
      glbLoadingManager.onStart = prevStart;
      glbLoadingManager.onProgress = prevProgress;
      glbLoadingManager.onLoad = prevLoad;
      glbLoadingManager.onError = prevError;
    };
  }, []);

  useEffect(() => {
    if (readyFiredRef.current) return;

    if (!glbsDone || !experienceMounted) {
      const ratio = glbTotal > 0 ? glbLoaded / glbTotal : 0;
      onProgressRef.current(Math.round(18 + ratio * 50), 'models');
      return;
    }

    if (managerActive) {
      const texPct = Math.round(70 + (Math.min(100, managerProgress) / 100) * 16);
      onProgressRef.current(texPct, 'textures');
      return;
    }

    if (!holoMediaReady) {
      onProgressRef.current(90, 'video');
      return;
    }

    onProgressRef.current(98, 'video');
    let cancelled = false;
    const rafId = window.requestAnimationFrame(() => {
      if (cancelled || readyFiredRef.current) return;
      readyFiredRef.current = true;
      onProgressRef.current(100, 'ready');
      onReadyRef.current();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [glbsDone, glbLoaded, glbTotal, experienceMounted, managerActive, managerProgress, holoMediaReady]);

  return null;
};

interface SceneProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  labels: Record<Section, string>;
  videoPaused: boolean;
  soundOn: boolean;
  volume: number;
  onSoundEnd: () => void;
  onVideoEnded: () => void;
  roomLayout: RoomLayoutState;
  layoutEditMode: boolean;
  selectedRoomItem: RoomItemId;
  onSelectRoomItem: (id: RoomItemId) => void;
  gizmoMode: TransformGizmoMode;
  snapEnabled: boolean;
  onUpdateRoomItem: (id: RoomItemId, next: RoomItemTransform) => void;
  cameraConfig: CameraStudioConfig;
  cameraBridgeRef: React.MutableRefObject<CameraBridge | null>;
  tourActive: boolean;
  tourPlaying: boolean;
  tourStopIndex: number;
  onTourStopChange: (index: number) => void;
  onTourPlayingChange: (playing: boolean) => void;
  appReady: boolean;
  onLoadProgress: (progress: number, stage: LoadingStage) => void;
  onSceneReady: () => void;
}

/**
 * The WebGL layer, split into its own module so `App` can lazy-load it.
 *
 * Keeping the Canvas out of the entry chunk lets the DOM shell (hero copy and
 * navigation) paint before the Three.js stack is downloaded and parsed.
 */
const Scene: React.FC<SceneProps> = ({
  activeSection,
  setActiveSection,
  labels,
  videoPaused,
  soundOn,
  volume,
  onSoundEnd,
  onVideoEnded,
  roomLayout,
  layoutEditMode,
  selectedRoomItem,
  onSelectRoomItem,
  gizmoMode,
  snapEnabled,
  onUpdateRoomItem,
  cameraConfig,
  cameraBridgeRef,
  tourActive,
  tourPlaying,
  tourStopIndex,
  onTourStopChange,
  onTourPlayingChange,
  appReady,
  onLoadProgress,
  onSceneReady,
}) => {
  const [dpr, setDpr] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1.25
  );
  const [glbProgress, setGlbProgress] = useState({ loaded: 0, total: 4 });
  const [experienceMounted, setExperienceMounted] = useState(false);
  const [holoMediaReady, setHoloMediaReady] = useState(false);

  useEffect(() => {
    preloadAllRoomGlbs();
    return subscribeGlbProgress((loaded, total) => {
      setGlbProgress({ loaded, total });
    });
  }, []);

  const handleExperienceMounted = useCallback(() => setExperienceMounted(true), []);
  const handleHoloMediaReady = useCallback(() => setHoloMediaReady(true), []);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 8], fov: 45, near: 0.1, far: 200 }}
      dpr={dpr}
      gl={{
        antialias: true,
        preserveDrawingBuffer: false,
        alpha: false,
        powerPreference: 'high-performance',
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() =>
          setDpr(typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1.5, 1.75) : 1.5)
        }
      />
      <AdaptiveDpr pixelated />
      <LoadCoordinator
        glbsDone={glbProgress.loaded >= glbProgress.total}
        glbLoaded={glbProgress.loaded}
        glbTotal={glbProgress.total}
        experienceMounted={experienceMounted}
        holoMediaReady={holoMediaReady}
        onLoadProgress={onLoadProgress}
        onSceneReady={onSceneReady}
      />
      <Suspense fallback={null}>
        <Experience
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          labels={labels}
          videoPaused={videoPaused}
          soundOn={soundOn}
          volume={volume}
          onSoundEnd={onSoundEnd}
          onVideoEnded={onVideoEnded}
          roomLayout={roomLayout}
          layoutEditMode={layoutEditMode}
          selectedRoomItem={selectedRoomItem}
          onSelectRoomItem={onSelectRoomItem}
          gizmoMode={gizmoMode}
          snapEnabled={snapEnabled}
          onUpdateRoomItem={onUpdateRoomItem}
          cameraConfig={cameraConfig}
          cameraBridgeRef={cameraBridgeRef}
          tourActive={tourActive}
          tourPlaying={tourPlaying}
          tourStopIndex={tourStopIndex}
          onTourStopChange={onTourStopChange}
          onTourPlayingChange={onTourPlayingChange}
          appReady={appReady}
          onMounted={handleExperienceMounted}
          onHoloMediaReady={handleHoloMediaReady}
        />
        <PostProcessingRig activeSection={activeSection} />
      </Suspense>
    </Canvas>
  );
};

export default Scene;
