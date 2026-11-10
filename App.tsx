
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { HERO_MEDIA } from './constants';
import { playHeroWithSound } from './utils/heroPlayer';
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

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  // Sound is on from the start. Browsers that refuse audible autoplay fall back
  // to the muted loop, and the first interaction below starts it instead.
  const [soundOn, setSoundOn] = useState(canAutoStartSound);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const { t } = useLanguage();

  const startSound = useCallback(() => {
    playHeroWithSound();
    setSoundOn(true);
  }, []);

  useEffect(() => {
    if (!HERO_MEDIA.hasAudio) return;

    const events = ['click', 'keydown'] as const;
    const disarm = () => events.forEach((name) => window.removeEventListener(name, onFirstGesture, true));
    const onFirstGesture = (event: Event) => {
      disarm();
      const onSoundToggle = event.target instanceof Element && event.target.closest('[data-sound-toggle]');
      if (!onSoundToggle && !soundOnRef.current) startSound();
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
    if (soundOnRef.current) setSoundOn(false);
    else startSound();
  }, [startSound]);
  const stopSound = useCallback(() => setSoundOn(false), []);
  const videoPaused = activeSection !== 'home';

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
      />

      <div className="absolute inset-0 z-0">
        {/* If WebGL fails, the plain video keeps the hero usable. */}
        <ErrorBoundary fallback={<HeroVideo paused={videoPaused} soundOn={soundOn} onSoundEnd={stopSound} />}>
          <Suspense fallback={null}>
            <Scene
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              labels={t.labels}
              videoPaused={videoPaused}
              soundOn={soundOn}
              onSoundEnd={stopSound}
            />
          </Suspense>
        </ErrorBoundary>
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
