
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import { Section } from './types';
import Experience from './components/Experience';
import Overlay from './components/Overlay';
import Loader from './components/Loader';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SpeedInsights } from '@vercel/speed-insights/react';

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [aiState, setAiState] = useState<'idle' | 'thinking'>('idle');
  const [dpr, setDpr] = useState(1.5);
  
  const { t } = useLanguage();

  const handleCloseOverlay = () => {
    setActiveSection('home');
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

      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          camera={{ position: [0, 4, 8], fov: 45, near: 0.1, far: 200 }}
          dpr={dpr}
          gl={{ 
            antialias: true, 
            preserveDrawingBuffer: false, 
            alpha: false,
            powerPreference: "high-performance"
          }}
        >
          <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
          <AdaptiveDpr pixelated />
          <Suspense fallback={<Loader />}>
            <Experience 
              activeSection={activeSection} 
              setActiveSection={setActiveSection}
              labels={t.labels}
              aiState={aiState}
            />
          </Suspense>
        </Canvas>
      </div>
      <SpeedInsights />
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
