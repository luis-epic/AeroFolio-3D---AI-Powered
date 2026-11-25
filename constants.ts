import { Section, CameraTarget, ProjectData } from './types';

export const CAMERA_POSITIONS: Record<Section, CameraTarget> = {
  home: {
    // Heroic presentation camera framing the elevated hologram speaker on the
    // mezzanine slightly right of center so left-hand Hero typography stays clear.
    position: [-0.95, 4.45, 0.35],
    target: [-0.85, 5.15, -10.32],
  },
  about: {
    position: [-1.4, 2.25, 2.35], // Focus on "Brain" hovering above left library table
    target: [-2.7, 1.85, -0.45],
  },
  projects: {
    // Front-right view of the Laptop station on the front reading table
    position: [2.3, 2.25, 8.2],
    target: [3.23, 1.5, 5.67],
  },
  library: {
    // Full symmetrical showcase of the centered GLB Library interior
    position: [0, 4.3, 9.6],
    target: [0, 2.4, -1.8],
  },
  contact: {
    position: [1.4, 2.25, 2.35], // Focus on iPhone above right library table
    target: [2.7, 1.84, -0.51],
  },
};

// Paths are relative because `vite.config.ts` builds with `base: './'`.
export const HERO_MEDIA = {
  mp4: './hero/hero.mp4',
  mp4Mobile: './hero/hero-mobile.mp4',
  poster: './hero/hero-poster.jpg',
  still: './hero/hero-still.jpg',
  hasAudio: true,
};

// Wide enough for the portrait video to sit beside the copy instead of behind it.
export const HERO_SPLIT_QUERY = '(min-width: 768px) and (min-aspect-ratio: 5/4)';

export const MOCK_PROJECTS: ProjectData[] = [
  {
    id: 0,
    title: "AeroFolio 3D",
    tech: "R3F, Gemini AI, TypeScript, Next.js",
    description: "An immersive spatial web experience merging 3D interactivity with Generative AI. Features a physics-based environment and LLM-powered voice assistant.",
    link: "https://aerofolio-3d.vercel.app"
  },
  {
    id: 1,
    title: "Neural Vision Edge",
    tech: "Python, TensorFlow Lite, FastAPI",
    description: "Serverless computer vision architecture capable of 60 FPS object detection on IoT devices.",
    link: "https://neural-vision-edge.vercel.app"
  },
  {
    id: 2,
    title: "EcoData Geospatial",
    tech: "React, WebGL, D3.js, Node.js",
    description: "High-performance dashboard visualizing terabytes of real-time climate data using instanced rendering.",
    link: "https://ecodata-geospatial.vercel.app"
  },
  {
    id: 3,
    title: "CryptoSentinel DeFi",
    tech: "Solidity, Graph Protocol, Next.js",
    description: "Automated smart contract auditor utilizing historical on-chain data to predict liquidity exploits.",
    link: "https://crypto-sentinel-defi.vercel.app"
  },
  {
    id: 4,
    title: "Royal Vision Suite",
    tech: "React, Supabase, TypeScript, TailwindCSS, PostgreSQL",
    description: "Comprehensive ERP system designed for opticians and visual health centers. Manages clinical patient records, vision exams, automated scheduling, inventory control, and real-time sales reporting.",
    link: "https://royal-vision-suite.vercel.app"
  }
];

export const COLORS = {
  accent: "#3b82f6",
  accentHover: "#60a5fa",
  base: "#1f2937",
  highlight: "#ffffff"
};
