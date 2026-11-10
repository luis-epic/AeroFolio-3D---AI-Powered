
import React, { Suspense, lazy, useCallback, useState } from 'react';
import { Section } from './types';
import Overlay from './components/Overlay';
import HeroVideo from './components/HeroVideo';
import PresentationModal from './components/PresentationModal';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// The 3D layer is code-split: the Three.js stack is large, and deferring it lets
// the hero copy and navigation paint immediately instead of waiting on WebGL.
const Scene = lazy(() => import('./components/Scene'));

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [presentationOpen, setPresentationOpen] = useState(false);

  const { t } = useLanguage();

  const handleCloseOverlay = () => {
    React.startTransition(() => {
      setActiveSection('home');
    });
  };

  const openPresentation = useCallback(() => setPresentationOpen(true), []);
  const closePresentation = useCallback(() => setPresentationOpen(false), []);
  const videoPaused = activeSection !== 'home' || presentationOpen;

  return (
    <div className="relative w-full h-screen bg-[#050505]">
      {/* Global Visual Polish Elements */}
      <div className="vignette pointer-events-none"></div>
      <div className="scanlines pointer-events-none"></div>

      <Overlay 
        activeSection={activeSection} 
        onClose={handleCloseOverlay} 
        setActiveSection={setActiveSection}
        onOpenPresentation={openPresentation}
      />

      <div className="absolute inset-0 z-0">
        {/* If WebGL fails, the plain video keeps the hero usable. */}
        <ErrorBoundary fallback={<HeroVideo paused={videoPaused} />}>
          <Suspense fallback={null}>
            <Scene
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              labels={t.labels}
              videoPaused={videoPaused}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      <PresentationModal
        open={presentationOpen}
        onClose={closePresentation}
        title={t.home.presentation.title}
        closeLabel={t.home.presentation.close}
      />
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
