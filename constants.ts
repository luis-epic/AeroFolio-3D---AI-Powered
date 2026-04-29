import { Section, CameraTarget, ProjectData } from './types';

export const CAMERA_POSITIONS: Record<Section, CameraTarget> = {
  home: {
    position: [0, 4, 8],
    target: [0, 0, 0],
  },
  about: {
    position: [-2, 1.5, 3], // Focus on "Brain" (Left side)
    target: [-1.5, 0.5, 0],
  },
  projects: {
    // Changed from frontal view to "User sitting at desk" view (Higher Y, Closer Z)
    position: [0, 1.6, 1.5], 
    target: [0, 0.5, -0.2], // Look at center of screen (was 0.2)
  },
  contact: {
    position: [2, 1.8, 3], // Higher Y to see full phone
    target: [2.5, 0.5, 0], // Center on phone position
  },
};

export const MOCK_PROJECTS: ProjectData[] = [
  {
    id: 0,
    title: "AeroFolio 3D",
    tech: "R3F, Gemini AI, TypeScript, Next.js",
    description: "An immersive spatial web experience merging 3D interactivity with Generative AI. Features a physics-based environment and LLM-powered voice assistant."
  },
  {
    id: 1,
    title: "Neural Vision Edge",
    tech: "Python, TensorFlow Lite, FastAPI",
    description: "Serverless computer vision architecture capable of 60 FPS object detection on IoT devices."
  },
  {
    id: 2,
    title: "EcoData Geospatial",
    tech: "React, WebGL, D3.js, Node.js",
    description: "High-performance dashboard visualizing terabytes of real-time climate data using instanced rendering."
  },
  {
    id: 3,
    title: "CryptoSentinel DeFi",
    tech: "Solidity, Graph Protocol, Next.js",
    description: "Automated smart contract auditor utilizing historical on-chain data to predict liquidity exploits."
  }
];

export const COLORS = {
  accent: "#3b82f6",
  accentHover: "#60a5fa",
  base: "#1f2937",
  highlight: "#ffffff"
};