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
    id: 1,
    title: "Neural Vision API",
    tech: "Python, TensorFlow, FastAPI",
    description: "Real-time object detection service optimized for edge devices."
  },
  {
    id: 2,
    title: "EcoData Vis",
    tech: "React, D3.js, Node.js",
    description: "Interactive dashboard visualizing global carbon footprint trends."
  },
  {
    id: 3,
    title: "CryptoSentinel",
    tech: "Solidity, Web3.js, Next.js",
    description: "DeFi analytics platform with AI-driven anomaly detection."
  }
];

export const COLORS = {
  accent: "#3b82f6",
  accentHover: "#60a5fa",
  base: "#1f2937",
  highlight: "#ffffff"
};