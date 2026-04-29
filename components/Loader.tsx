import React, { useState, useEffect } from 'react';
import { Html, useProgress } from '@react-three/drei';

const Loader: React.FC = () => {
  const { progress } = useProgress();
  const [loadingText, setLoadingText] = useState("INITIALIZING SYSTEM...");

  useEffect(() => {
    if (progress < 30) setLoadingText("BOOTING KERNEL...");
    else if (progress < 60) setLoadingText("LOADING ASSETS...");
    else if (progress < 90) setLoadingText("COMPILING SHADERS...");
    else setLoadingText("SYSTEM ONLINE. READY.");
  }, [progress]);
  
  return (
    <Html center zIndexRange={[100, 0]}>
      <div className="flex flex-col items-center justify-center bg-black/90 px-8 py-6 rounded-sm border border-cyan-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.15)] min-w-[300px]">
        {/* Holographic scanner effect line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-400 opacity-50 shadow-[0_0_5px_#22d3ee] animate-pulse" />
        
        <div className="text-cyan-400 font-mono text-xs tracking-widest mb-4 uppercase animate-pulse flex items-center justify-between w-full">
            <span>{loadingText}</span>
            <span className="text-pink-500 font-bold ml-4">[{progress.toFixed(0)}%]</span>
        </div>
        
        {/* Progress Bar Container */}
        <div className="w-full h-1.5 bg-gray-900 border border-cyan-900/50 relative overflow-hidden">
            {/* The actual progress fill */}
            <div 
                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-pink-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
            />
            {/* Grid overlay to make it look like separate blocks */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9InRyYW5zcGFyZW50Ii8+PGxpbmUgeDE9IjQiIHkxPSIwIiB4Mj0iNCIgeTI9IjQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+')] opacity-30" />
        </div>

        <div className="mt-4 flex gap-2 w-full justify-start text-[9px] text-cyan-600 font-mono">
            <span>SYS.VER 3.0.1</span>
            <span>MEM: OK</span>
            <span>GPU: CONNECTED</span>
        </div>
      </div>
    </Html>
  );
};

export default Loader;