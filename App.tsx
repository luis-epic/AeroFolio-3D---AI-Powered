
import React, { useState, Suspense, lazy } from 'react';
import { Section } from './types';
import Overlay from './components/Overlay';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';

// The 3D layer is code-split: the Three.js stack is large, and deferring it lets
// the hero copy and navigation paint immediately instead of waiting on WebGL.
const Scene = lazy(() => import('./components/Scene'));

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [aiState, setAiState] = useState<'idle' | 'thinking'>('idle');

  const { t } = useLanguage();

  const handleCloseOverlay = () => {
    React.startTransition(() => {
      setActiveSection('home');
    });
  };

  return (
    <div className="relative w-full h-screen bg-[#050505]">
      {/* Global Visual Polish Elements */}
      <div className="vignette pointer-events-none"></div>
      <div className="scanlines pointer-events-none"></div>

      <Overlay 
        activeSection={activeSection} 
        onClose={handleCloseOverlay} 
        setActiveSection={setActiveSection}
        setAiState={setAiState}
      />

<<<<<<< HEAD
      <div className="absolute inset-0 z-0">
        {/* A WebGL crash must not take the whole portfolio down: the DOM overlay
            stays usable if the 3D layer fails to initialise. */}
        <ErrorBoundary>
          <Suspense fallback={null}>
            <Scene
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              labels={t.labels}
              aiState={aiState}
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
