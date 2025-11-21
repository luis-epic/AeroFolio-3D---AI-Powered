import React from 'react';
import { Html, useProgress } from '@react-three/drei';

const Loader: React.FC = () => {
  const { progress } = useProgress();
  
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center bg-black/80 p-4 rounded-lg backdrop-blur-sm">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span className="text-white font-mono text-sm">{progress.toFixed(0)}% loaded</span>
      </div>
    </Html>
  );
};

export default Loader;