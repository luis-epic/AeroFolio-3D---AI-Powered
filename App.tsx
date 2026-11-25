
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { HERO_MEDIA } from './constants';
import {
  DEFAULT_HERO_VOLUME,
  getHeroVolume,
  hasHeroVideo,
  isHeroAudioAudible,
  playHeroWithSound,
  setHeroVolume,
  unmuteHeroInPlace,
} from './utils/heroPlayer';
import { Section } from './types';
import { startEarlyAssetPreload } from './utils/assetPreloader';
import Overlay from './components/Overlay';
import HeroVideo from './components/HeroVideo';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalLoader, { type LoadingStage } from './components/Loader';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import {
  clearRoomLayout,
  cloneDefaultRoomLayout,
  DEFAULT_ROOM_LAYOUT,
  loadRoomLayout,
  saveRoomLayout,
  type RoomItemId,
  type RoomItemTransform,
  type RoomLayoutState,
  type TransformGizmoMode,
} from './utils/roomLayoutStore';
import {
  clearCameraStudioConfig,
  cloneDefaultCameraStudioConfig,
  loadCameraStudioConfig,
  saveCameraStudioConfig,
  type CameraBridge,
  type CameraStudioConfig,
} from './utils/cameraTourStore';

// The 3D layer is code-split: the Three.js stack is large, and deferring it lets
// the hero copy and navigation paint immediately instead of waiting on WebGL.
const Scene = lazy(() => import('./components/Scene'));

// Skipped on small screens (the audible clip is far heavier and phones refuse
// audible autoplay anyway) and for visitors who asked for reduced motion.
const canAutoStartSound = (): boolean =>
  HERO_MEDIA.hasAudio &&
  typeof window !== 'undefined' &&
  !window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;

// The quick view skips WebGL entirely. It lives in the URL so it can be linked.
const LITE_PARAM = 'view';
const readLiteMode = (): boolean =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get(LITE_PARAM) === 'lite';

if (typeof window !== 'undefined') {
  startEarlyAssetPreload(readLiteMode());
}

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
  // Sound is on from the start. Browsers that refuse audible autoplay fall back
  // to the muted loop, and the first interaction below starts it instead.
  const [soundOn, setSoundOn] = useState(canAutoStartSound);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const [heroVolume, setHeroVolumeState] = useState<number>(() => getHeroVolume());
  // The presentation plays once and then rests on its last frame.
  const [heroEnded, setHeroEnded] = useState(false);
  const heroEndedRef = useRef(heroEnded);
  heroEndedRef.current = heroEnded;
  const [liteMode, setLiteMode] = useState(readLiteMode);
  const liteModeRef = useRef(liteMode);
  liteModeRef.current = liteMode;

  useEffect(() => {
    startEarlyAssetPreload(liteMode);
  }, [liteMode]);
  const [roomLayout, setRoomLayout] = useState<RoomLayoutState>(() => loadRoomLayout());
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const layoutEditModeRef = useRef(layoutEditMode);
  layoutEditModeRef.current = layoutEditMode;
  const [selectedRoomItem, setSelectedRoomItem] = useState<RoomItemId>('laptop');
  const [gizmoMode, setGizmoMode] = useState<TransformGizmoMode>('translate');
  const [snapEnabled, setSnapEnabled] = useState(false);

  const [cameraConfig, setCameraConfig] = useState<CameraStudioConfig>(() => loadCameraStudioConfig());
  const [tourActive, setTourActive] = useState(false);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourStopIndex, setTourStopIndex] = useState(0);
  const cameraBridgeRef = useRef<CameraBridge | null>(null);

  const [appReady, setAppReady] = useState(false);
  const appReadyRef = useRef(appReady);
  appReadyRef.current = appReady;
  const [loadState, setLoadState] = useState<{ progress: number; stage: LoadingStage }>({
    progress: 12,
    stage: 'bundle',
  });

  const { t } = useLanguage();

  const handleUpdateRoomItem = useCallback((id: RoomItemId, next: RoomItemTransform) => {
    setRoomLayout((prev) => {
      const updated: RoomLayoutState = { ...prev, [id]: next };
      saveRoomLayout(updated);
      return updated;
    });
  }, []);

  const handleResetRoomItem = useCallback((id: RoomItemId) => {
    setRoomLayout((prev) => {
      const def = DEFAULT_ROOM_LAYOUT[id];
      const updated: RoomLayoutState = {
        ...prev,
        [id]: {
          position: [...def.position],
          rotation: [...def.rotation],
          scale: def.scale,
        },
      };
      saveRoomLayout(updated);
      return updated;
    });
  }, []);

  const handleResetAllRoom = useCallback(() => {
    clearRoomLayout();
    setRoomLayout(cloneDefaultRoomLayout());
  }, []);

  const handleChangeCameraConfig = useCallback((next: CameraStudioConfig) => {
    saveCameraStudioConfig(next);
    setCameraConfig(next);
  }, []);

  const handleResetCameraConfig = useCallback(() => {
    clearCameraStudioConfig();
    setCameraConfig(cloneDefaultCameraStudioConfig());
    setTourStopIndex(0);
    setTourPlaying(false);
  }, []);

  const handleToggleTourActive = useCallback(() => {
    setTourActive((prev) => {
      const next = !prev;
      if (next) {
        setActiveSection('home');
        setLayoutEditMode(false);
        setTourStopIndex(0);
        setTourPlaying(true);
      } else {
        setTourPlaying(false);
      }
      return next;
    });
  }, []);

  const handleExitTour = useCallback(() => {
    setTourActive(false);
    setTourPlaying(false);
  }, []);

  const handleToggleTourPlay = useCallback(() => {
    setTourPlaying((p) => !p);
  }, []);

  const handleSelectTourStop = useCallback(
    (idx: number) => {
      const count = cameraConfig.tourStops.length;
      if (count === 0) return;
      const safe = ((idx % count) + count) % count;
      setTourStopIndex(safe);
      if (!tourPlaying && !layoutEditMode) {
        const stop = cameraConfig.tourStops[safe];
        if (stop) cameraBridgeRef.current?.flyToPose(stop, true);
      }
    },
    [cameraConfig.tourStops, tourPlaying, layoutEditMode]
  );

  useEffect(() => {
    if (!layoutEditMode && !tourActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const key = e.key.toLowerCase();
      if (layoutEditMode) {
        if (key === 'g') setGizmoMode('translate');
        else if (key === 'r') setGizmoMode('rotate');
        else if (key === 's') setGizmoMode('scale');
        else if (e.key === 'Escape') {
          setLayoutEditMode(false);
          setTourPlaying(false);
        }
      } else if (tourActive) {
        if (e.key === 'Escape') {
          setTourActive(false);
          setTourPlaying(false);
        } else if (e.key === ' ') {
          e.preventDefault();
          setTourPlaying((p) => !p);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [layoutEditMode, tourActive]);

  // Background ambient drone disabled per user preference

  const startSound = useCallback(() => {
    setTourActive(false);
    setTourPlaying(false);
    setActiveSection('home');
    playHeroWithSound();
    setSoundOn(true);
    setHeroEnded(false);
  }, []);

  useEffect(() => {
    if (!HERO_MEDIA.hasAudio) return;

    const events = ['click', 'touchend', 'keydown'] as const;
    const disarm = () => events.forEach((name) => window.removeEventListener(name, onFirstGesture, true));
    const onFirstGesture = (event: Event) => {
      const onSoundToggle =
        event.target instanceof Element &&
        event.target.closest('[data-sound-toggle], [data-video-control], [data-volume-control]');
      if (onSoundToggle) {
        disarm();
        return;
      }
      // Wait until global load completes and the video element is attached before disarming
      if (!appReadyRef.current || !hasHeroVideo()) return;
      disarm();
      if ((!soundOnRef.current || !isHeroAudioAudible()) && !heroEndedRef.current) {
        startSound();
      }
    };

    events.forEach((name) => window.addEventListener(name, onFirstGesture, true));
    return disarm;
  }, [startSound]);

  const handleCloseOverlay = () => {
    React.startTransition(() => {
      setActiveSection('home');
    });
  };

  const toggleSound = useCallback(() => {
    if (soundOnRef.current && !heroEndedRef.current) {
      setSoundOn(false);
    } else {
      if (getHeroVolume() <= 0) {
        setHeroVolumeState(setHeroVolume(DEFAULT_HERO_VOLUME));
      }
      startSound();
    }
  }, [startSound]);

  const handleChangeVolume = useCallback((nextVolume: number) => {
    const clamped = setHeroVolume(nextVolume);
    setHeroVolumeState(clamped);
    if (clamped <= 0) {
      setSoundOn(false);
      return;
    }
    if (!soundOnRef.current || !isHeroAudioAudible()) {
      unmuteHeroInPlace();
      setSoundOn(true);
      setHeroEnded(false);
    }
  }, []);

  const stopSound = useCallback(() => setSoundOn(false), []);
  const handleVideoEnded = useCallback(() => {
    setHeroEnded(true);
    setSoundOn(false);
    if (!liteModeRef.current && activeSectionRef.current === 'home' && !layoutEditModeRef.current) {
      setTourStopIndex(0);
      setTourActive(true);
      setTourPlaying(true);
    }
  }, []);

  const handleLoadProgress = useCallback((progress: number, stage: LoadingStage) => {
    setLoadState((prev) =>
      prev.progress === progress && prev.stage === stage ? prev : { progress, stage }
    );
  }, []);

  const handleSceneReady = useCallback(() => {
    setLoadState({ progress: 100, stage: 'ready' });
    setAppReady(true);
  }, []);

  const toggleLiteMode = useCallback(() => {
    setAppReady(false);
    setLoadState({ progress: 18, stage: 'video' });
    setLiteMode((current) => {
      const next = !current;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(LITE_PARAM, 'lite');
      else url.searchParams.delete(LITE_PARAM);
      window.history.replaceState(null, '', url);
      return next;
    });
    // The other view mounts a fresh video element, which starts from the top.
    setHeroEnded(false);
  }, []);
  const videoPaused = activeSection !== 'home' || !appReady;
  const heroVideo = (
    <HeroVideo
      paused={videoPaused}
      soundOn={soundOn}
      volume={heroVolume}
      onSoundEnd={stopSound}
      onEnded={handleVideoEnded}
      onMediaReady={handleSceneReady}
    />
  );

  return (
    <div className="relative w-full h-screen bg-[#050505]">
      <GlobalLoader
        ready={appReady}
        progress={loadState.progress}
        stage={loadState.stage}
        liteMode={liteMode}
      />

      {/* Global Visual Polish Elements */}
      <div className="vignette pointer-events-none"></div>
      <div className="scanlines pointer-events-none"></div>

      <Overlay 
        activeSection={activeSection} 
        onClose={handleCloseOverlay} 
        setActiveSection={(sec) => {
          setTourActive(false);
          setTourPlaying(false);
          setActiveSection(sec);
        }}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        volume={heroVolume}
        onChangeVolume={handleChangeVolume}
        heroEnded={heroEnded}
        liteMode={liteMode}
        onToggleLiteMode={toggleLiteMode}
        roomLayout={roomLayout}
        layoutEditMode={layoutEditMode}
        onToggleLayoutEditMode={() => {
          setLayoutEditMode((v) => {
            const next = !v;
            if (next) {
              setActiveSection('home');
              setTourActive(false);
            } else {
              setTourPlaying(false);
            }
            return next;
          });
        }}
        selectedRoomItem={selectedRoomItem}
        onSelectRoomItem={setSelectedRoomItem}
        gizmoMode={gizmoMode}
        onChangeGizmoMode={setGizmoMode}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled((s) => !s)}
        onUpdateRoomItem={handleUpdateRoomItem}
        onResetRoomItem={handleResetRoomItem}
        onResetAllRoom={handleResetAllRoom}
        cameraConfig={cameraConfig}
        cameraBridgeRef={cameraBridgeRef}
        tourActive={tourActive}
        tourPlaying={tourPlaying}
        tourStopIndex={tourStopIndex}
        onToggleTourActive={handleToggleTourActive}
        onToggleTourPlay={handleToggleTourPlay}
        onSelectTourStop={handleSelectTourStop}
        onChangeCameraConfig={handleChangeCameraConfig}
        onResetCameraConfig={handleResetCameraConfig}
        onExitTour={handleExitTour}
      />

      <div className="absolute inset-0 z-0">
        {liteMode ? (
          heroVideo
        ) : (
          // If WebGL fails, the plain video keeps the hero usable.
          <ErrorBoundary fallback={heroVideo}>
            <Suspense fallback={null}>
              <Scene
                activeSection={activeSection}
                setActiveSection={(sec) => {
                  setTourActive(false);
                  setTourPlaying(false);
                  setActiveSection(sec);
                }}
                labels={t.labels}
                videoPaused={videoPaused}
                soundOn={soundOn}
                volume={heroVolume}
                onSoundEnd={stopSound}
                onVideoEnded={handleVideoEnded}
                roomLayout={roomLayout}
                layoutEditMode={layoutEditMode}
                selectedRoomItem={selectedRoomItem}
                onSelectRoomItem={setSelectedRoomItem}
                gizmoMode={gizmoMode}
                snapEnabled={snapEnabled}
                onUpdateRoomItem={handleUpdateRoomItem}
                cameraConfig={cameraConfig}
                cameraBridgeRef={cameraBridgeRef}
                tourActive={tourActive || (layoutEditMode && tourPlaying)}
                tourPlaying={tourPlaying}
                tourStopIndex={tourStopIndex}
                onTourStopChange={setTourStopIndex}
                onTourPlayingChange={setTourPlaying}
                appReady={appReady}
                onLoadProgress={handleLoadProgress}
                onSceneReady={handleSceneReady}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
