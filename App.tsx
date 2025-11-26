
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Section } from './types';
import Experience from './components/Experience';
import Overlay from './components/Overlay';
import Loader from './components/Loader';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  // State to track if AI is currently generating a response
  const [aiState, setAiState] = useState<'idle' | 'thinking'>('idle');
  
  const { t } = useLanguage();

  const handleCloseOverlay = () => {
    setActiveSection('home');
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* 2D UI Overlay includes language toggle and Recruiter HUD */}
      <Overlay 
        activeSection={activeSection} 
        onClose={handleCloseOverlay} 
        setActiveSection={setActiveSection}
        setAiState={setAiState} // Pass setter to Overlay
      />

      {/* 3D Scene Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          // Balanced near/far planes for optimal depth precision
          // near: 0.1 prevents z-fighting artifacts
          // far: 10000 ensures massive environments are visible on mobile zooming
          camera={{ position: [0, 4, 8], fov: 45, near: 0.1, far: 10000 }}
          dpr={[1, 2]}
          // ALPHA: FALSE is critical for PostProcessing to work correctly without black screen artifacts
          gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
        >
          <Suspense fallback={<Loader />}>
            <Experience 
              activeSection={activeSection} 
              setActiveSection={setActiveSection}
              labels={t.labels}
              aiState={aiState} // Pass state to 3D Scene
            />
          </Suspense>
        </Canvas>
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
