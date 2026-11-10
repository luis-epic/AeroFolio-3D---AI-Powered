
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { HERO_MEDIA } from './constants';
import { playHeroWithSound } from './utils/heroPlayer';
import { initAutoAmbientTrigger, duckAmbient, unduckAmbient } from './utils/soundEngine';
import { Section } from './types';
import Overlay from './components/Overlay';
import HeroVideo from './components/HeroVideo';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

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

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  // Sound is on from the start. Browsers that refuse audible autoplay fall back
  // to the muted loop, and the first interaction below starts it instead.
  const [soundOn, setSoundOn] = useState(canAutoStartSound);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  // The presentation plays once and then rests on its last frame.
  const [heroEnded, setHeroEnded] = useState(false);
  const heroEndedRef = useRef(heroEnded);
  heroEndedRef.current = heroEnded;
  const [liteMode, setLiteMode] = useState(readLiteMode);

  const { t } = useLanguage();

  // Trigger ambient background audio smoothly on user interaction
  useEffect(() => {
    const cleanup = initAutoAmbientTrigger();
    return cleanup;
  }, []);

  // Duck ambient audio when the hero presentation audio is playing
  useEffect(() => {
    if (soundOn) {
      duckAmbient(0.2, 0.8);
    } else {
      unduckAmbient(1.2);
    }
  }, [soundOn]);

  const startSound = useCallback(() => {
    playHeroWithSound();
    setSoundOn(true);
    setHeroEnded(false);
  }, []);

  useEffect(() => {
    if (!HERO_MEDIA.hasAudio) return;

    const events = ['click', 'keydown'] as const;
    const disarm = () => events.forEach((name) => window.removeEventListener(name, onFirstGesture, true));
    const onFirstGesture = (event: Event) => {
      disarm();
      const onSoundToggle = event.target instanceof Element && event.target.closest('[data-sound-toggle]');
      if (!onSoundToggle && !soundOnRef.current && !heroEndedRef.current) startSound();
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
    if (soundOnRef.current && !heroEndedRef.current) setSoundOn(false);
    else startSound();
  }, [startSound]);
  const stopSound = useCallback(() => setSoundOn(false), []);
  const handleVideoEnded = useCallback(() => {
    setHeroEnded(true);
    setSoundOn(false);
  }, []);

  const toggleLiteMode = useCallback(() => {
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
  const videoPaused = activeSection !== 'home';
  const heroVideo = (
    <HeroVideo paused={videoPaused} soundOn={soundOn} onSoundEnd={stopSound} onEnded={handleVideoEnded} />
  );

  return (
    <div className="relative w-full h-screen bg-[#050505]">
      {/* Global Visual Polish Elements */}
      <div className="vignette pointer-events-none"></div>
      <div className="scanlines pointer-events-none"></div>

      <Overlay 
        activeSection={activeSection} 
        onClose={handleCloseOverlay} 
        setActiveSection={setActiveSection}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        heroEnded={heroEnded}
        liteMode={liteMode}
        onToggleLiteMode={toggleLiteMode}
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
                setActiveSection={setActiveSection}
                labels={t.labels}
                videoPaused={videoPaused}
                soundOn={soundOn}
                onSoundEnd={stopSound}
                onVideoEnded={handleVideoEnded}
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
