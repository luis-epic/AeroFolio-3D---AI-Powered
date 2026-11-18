import React, { useMemo } from 'react';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  SRGBColorSpace,
} from 'three';
import { Grid, Stars, Sparkles } from '@react-three/drei';
import FloatingDust from './FloatingDust';

/**
 * Creates an ultra-smooth vertical atmospheric gradient for the studio sky dome.
 * Blends from deep cosmic indigo at the zenith down to an electric horizon glow,
 * then grounds into deep dark navy at floor level.
 */
const createSkyGradientTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.0, '#010307'); // Deep cosmic zenith
    gradient.addColorStop(0.35, '#040b17'); // Upper troposphere
    gradient.addColorStop(0.52, '#0a1a32'); // Atmospheric horizon glow
    gradient.addColorStop(0.68, '#061122'); // Lower horizon
    gradient.addColorStop(1.0, '#010205'); // Deep floor foundation

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
};

/**
 * StudioEnvironment: Immersive 3D architectural sci-fi studio atmosphere.
 * Replaces the empty black void with an expansive cybernetic creative laboratory:
 * - Expansive gradient sky dome giving true ambient volume
 * - Infinite cyber floor grid with glowing cyan/indigo perspective lines
 * - Distant architectural curved backdrop with LED light channels
 * - Floating cosmic dust and glowing ambient data motes for parallax depth
 * - Concentric floor perimeter rings grounding the desk in physical space
 */
const StudioEnvironment: React.FC = () => {
  const skyTexture = useMemo(createSkyGradientTexture, []);

  return (
    <group>
      {/* 1. Atmospheric Gradient Sky Dome */}
      <mesh>
        <sphereGeometry args={[75, 32, 24]} />
        <meshBasicMaterial
          map={skyTexture}
          side={BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* 2. Deep Starfield / Floating Data Constellation */}
      <Stars
        radius={48}
        depth={28}
        count={450}
        factor={3.5}
        saturation={0.7}
        fade
        speed={0.5}
      />

      {/* 3. Infinite Cyber Floor Grid (Perspective & Depth) */}
      <Grid
        position={[0, -0.495, 0]}
        args={[80, 80]}
        cellSize={1.2}
        cellThickness={0.75}
        cellColor="#0369a1"
        sectionSize={6}
        sectionThickness={1.25}
        sectionColor="#00f0ff"
        fadeDistance={36}
        fadeStrength={1.4}
        infiniteGrid
      />

      {/* 4. Concentric Horizon Energy Rings around Desk */}
      <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[11.85, 12.0, 64]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.2}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[19.8, 20.0, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.15}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 5. Curved Architectural Studio Backdrop Wall */}
      <group position={[0, 3.8, -9.5]}>
        {/* Main curved acoustic/server wall */}
        <mesh rotation={[0, Math.PI, 0]}>
          <cylinderGeometry args={[18, 18, 9.5, 36, 1, true, -Math.PI * 0.38, Math.PI * 0.76]} />
          <meshStandardMaterial
            color="#080f1e"
            metalness={0.88}
            roughness={0.32}
            side={DoubleSide}
          />
        </mesh>

        {/* Horizontal glowing architectural LED accent strips along the curved wall */}
        <mesh position={[0, 4.4, 0]} rotation={[0, Math.PI, 0]}>
          <cylinderGeometry args={[17.95, 17.95, 0.04, 36, 1, true, -Math.PI * 0.36, Math.PI * 0.72]} />
          <meshBasicMaterial
            color="#00f5ff"
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>

        <mesh position={[0, -4.2, 0]} rotation={[0, Math.PI, 0]}>
          <cylinderGeometry args={[17.95, 17.95, 0.05, 36, 1, true, -Math.PI * 0.36, Math.PI * 0.72]} />
          <meshBasicMaterial
            color="#6366f1"
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>

        {/* Vertical server/structural light guides in background */}
        {[-7, -3.5, 3.5, 7].map((xOffset, i) => (
          <group key={i} position={[xOffset, 0, 0.2]}>
            {/* Structural column */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.3, 9.0, 0.2]} />
              <meshStandardMaterial color="#0b1324" metalness={0.9} roughness={0.25} />
            </mesh>
            {/* Vertical glowing neon channel */}
            <mesh position={[0, 0, 0.11]}>
              <boxGeometry args={[0.04, 8.6, 0.02]} />
              <meshBasicMaterial
                color={i % 2 === 0 ? '#00e5ff' : '#818cf8'}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* Floating overhead ceiling truss */}
        <mesh position={[0, 5.2, 0]}>
          <boxGeometry args={[22, 0.25, 0.6]} />
          <meshStandardMaterial color="#0c162c" metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* 6. Subtle, slow-moving ambient floating dust particle system */}
      <FloatingDust count={180} color="#7dd3fc" opacity={0.38} size={0.18} />

      {/* 7. Ambient Floating Cyber Motes for Parallax Depth */}
      <Sparkles
        position={[0, 3.5, -1]}
        scale={[26, 11, 26]}
        count={35}
        speed={0.4}
        color="#38bdf8"
        size={2.4}
        opacity={0.32}
      />
    </group>
  );
};

export default StudioEnvironment;
