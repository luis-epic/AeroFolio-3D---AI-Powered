import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import { Section } from '../types';
import Loader from './Loader';
import Experience from './Experience';

interface SceneProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  labels: Record<Section, string>;
  aiState: 'idle' | 'thinking';
}

/**
 * The WebGL layer, split into its own module so `App` can lazy-load it.
 *
 * Keeping the Canvas out of the entry chunk lets the DOM shell (hero copy and
 * navigation) paint before the Three.js stack is downloaded and parsed.
 */
const Scene: React.FC<SceneProps> = ({ activeSection, setActiveSection, labels, aiState }) => {
  const [dpr, setDpr] = useState(1.5);

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
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
      <AdaptiveDpr pixelated />
      <Suspense fallback={<Loader />}>
        <Experience
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          labels={labels}
          aiState={aiState}
        />
      </Suspense>
    </Canvas>
  );
};

export default Scene;
