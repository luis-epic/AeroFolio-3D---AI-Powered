
import React, { useState, Suspense, useEffect, lazy, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Section } from './types';
import Experience from './components/Experience';
import Overlay from './components/Overlay';
import Loader from './components/Loader';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { validateEnv } from './config/env';

// Lazy load only Experience component (Overlay needs to be available immediately)
const LazyExperience = lazy(() => import('./components/Experience'));

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  // State to track if AI is currently generating a response
  const [aiState, setAiState] = useState<'idle' | 'thinking'>('idle');
  
  const { t } = useLanguage();

  const handleCloseOverlay = useCallback(() => {
    setActiveSection('home');
  }, []);
  
  const handleSetActiveSection = useCallback((section: Section) => {
    setActiveSection(section);
  }, []);
  
  const handleSetAiState = useCallback((state: 'idle' | 'thinking') => {
    setAiState(state);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* 2D UI Overlay includes language toggle and Recruiter HUD */}
      <Overlay 
        activeSection={activeSection} 
        onClose={handleCloseOverlay} 
        setActiveSection={handleSetActiveSection}
        setAiState={handleSetAiState}
      />

      {/* 3D Scene Canvas */}
      <div className="absolute inset-0 z-0 bg-[#050505]">
        <Canvas
          shadows
          // Balanced near/far planes for optimal depth precision
          // near: 0.1 prevents z-fighting artifacts
          // far: 10000 ensures massive environments are visible on mobile zooming
          camera={{ position: [0, 4, 8], fov: 45, near: 0.1, far: 10000 }}
          dpr={[1, 2]}
          // ALPHA: FALSE is needed for PostProcessing, background color ensures visibility
          gl={{ 
            antialias: true, 
            preserveDrawingBuffer: true, 
            alpha: false,
            powerPreference: "high-performance"
          }}
        >
          <Suspense fallback={<Loader />}>
            <LazyExperience 
              activeSection={activeSection} 
              setActiveSection={handleSetActiveSection}
              labels={t.labels}
              aiState={aiState}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Validate environment variables on app startup (development only)
  useEffect(() => {
    try {
      if (import.meta.env.DEV) {
        validateEnv();
      }
    } catch (error) {
      console.error('Error validating environment:', error);
    }
  }, []);

  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
