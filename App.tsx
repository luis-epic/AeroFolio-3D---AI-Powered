import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Section } from './types';
import Experience from './components/Experience';
import Overlay from './components/Overlay';
import Loader from './components/Loader';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
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
      />

      {/* 3D Scene Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          camera={{ position: [0, 4, 8], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={<Loader />}>
            <Experience 
              activeSection={activeSection} 
              setActiveSection={setActiveSection}
              labels={t.labels}
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