import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface RevealProps {
  /** Seconds after the scene starts rendering. */
  delay: number;
  /** World position of the wrapped object, so it grows in place. */
  origin: [number, number, number];
  children: React.ReactNode;
}

const DURATION = 0.9;
const RISE = 0.5;
const HIDDEN_SCALE = 0.0001;

// Overshoots slightly before settling, which reads as a "pop".
const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const Reveal: React.FC<RevealProps> = ({ delay, origin, children }) => {
  const groupRef = useRef<Group>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useFrame((state) => {
    const group = groupRef.current;
    if (!group || doneRef.current) return;

    const now = state.clock.getElapsedTime();
    if (startRef.current === null) startRef.current = now;
    const progress = prefersReducedMotion
      ? 1
      : Math.min(Math.max((now - startRef.current - delay) / DURATION, 0), 1);

    group.scale.setScalar(progress === 0 ? HIDDEN_SCALE : easeOutBack(progress));
    group.position.y = origin[1] - (1 - progress) * RISE;
    if (progress === 1) doneRef.current = true;
  });

  return (
    <group ref={groupRef} position={origin} scale={HIDDEN_SCALE}>
      <group position={[-origin[0], -origin[1], -origin[2]]}>{children}</group>
    </group>
  );
};

export default Reveal;
