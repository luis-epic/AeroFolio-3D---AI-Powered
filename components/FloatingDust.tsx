import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  LinearFilter,
  Points,
  SRGBColorSpace,
} from 'three';

interface FloatingDustProps {
  count?: number;
  color?: string;
  opacity?: number;
  size?: number;
}

/**
 * Creates a soft radial circular sprite so dust motes appear as delicate,
 * out-of-focus luminous particles rather than hard pixel squares.
 */
const createDustParticleTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 32;
    const cy = 32;
    const radius = 30;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(220, 245, 255, 0.85)');
    grad.addColorStop(0.5, 'rgba(140, 215, 255, 0.35)');
    grad.addColorStop(0.85, 'rgba(56, 189, 248, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
};

// Bounding box for the ambient volumetric dust field
const BOUNDS = {
  minX: -18,
  maxX: 18,
  minY: 0.1,
  maxY: 9.5,
  minZ: -20,
  maxZ: 9,
};

/**
 * FloatingDust: Subtle, slow-moving ambient dust particle system.
 * Simulates gentle thermal currents and Brownian micro-drifts in 3D space,
 * creating atmospheric depth and cinematic parallax during camera movement.
 */
const FloatingDust: React.FC<FloatingDustProps> = ({
  count = 280,
  color = '#7dd3fc',
  opacity = 0.42,
  size = 0.16,
}) => {
  const pointsRef = useRef<Points>(null);
  const texture = useMemo(createDustParticleTexture, []);

  // Pre-generate randomized initial positions, individual speeds, and drift phase offsets
  const { geometry, velocities, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    const ph = new Float32Array(count);

    const rangeX = BOUNDS.maxX - BOUNDS.minX;
    const rangeY = BOUNDS.maxY - BOUNDS.minY;
    const rangeZ = BOUNDS.maxZ - BOUNDS.minZ;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Volumetric dispersion favoring mid-to-background depth
      positions[i3] = BOUNDS.minX + Math.random() * rangeX;
      positions[i3 + 1] = BOUNDS.minY + Math.random() * rangeY;
      positions[i3 + 2] = BOUNDS.minZ + Math.random() * rangeZ;

      // Gentle, slow upward float speed (0.04 to 0.14 units/sec)
      vel[i] = 0.04 + Math.random() * 0.1;
      ph[i] = Math.random() * Math.PI * 2;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));

    return {
      geometry: geo,
      velocities: vel,
      phases: ph,
    };
  }, [count]);

  // Clean up texture & geometry on unmount
  React.useEffect(() => {
    return () => {
      texture.dispose();
      geometry.dispose();
    };
  }, [texture, geometry]);

  // Animate particles slowly and smoothly each frame
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const attr = pointsRef.current.geometry.attributes.position as Float32BufferAttribute;
    const pos = attr.array as Float32Array;
    const time = state.clock.getElapsedTime();
    // Clamp delta to prevent sudden particle jumps on tab switch / lag spikes
    const dt = Math.min(delta, 0.1);

    const rangeX = BOUNDS.maxX - BOUNDS.minX;
    const rangeZ = BOUNDS.maxZ - BOUNDS.minZ;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 1. Gentle upward thermal current
      pos[i3 + 1] += velocities[i] * dt;

      // 2. Slow harmonic micro-drift in X & Z
      pos[i3] += Math.sin(time * 0.35 + phases[i]) * 0.012 * dt;
      pos[i3 + 2] += Math.cos(time * 0.28 + phases[i] * 1.3) * 0.012 * dt;

      // 3. Seamless wrap-around boundaries
      if (pos[i3 + 1] > BOUNDS.maxY) {
        pos[i3 + 1] = BOUNDS.minY;
        pos[i3] = BOUNDS.minX + Math.random() * rangeX;
        pos[i3 + 2] = BOUNDS.minZ + Math.random() * rangeZ;
      }
      if (pos[i3] > BOUNDS.maxX) pos[i3] = BOUNDS.minX;
      else if (pos[i3] < BOUNDS.minX) pos[i3] = BOUNDS.maxX;

      if (pos[i3 + 2] > BOUNDS.maxZ) pos[i3 + 2] = BOUNDS.minZ;
      else if (pos[i3 + 2] < BOUNDS.minZ) pos[i3 + 2] = BOUNDS.maxZ;
    }

    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={texture}
        size={size}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
};

export default FloatingDust;
