import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { Text, Billboard, Sparkles } from '@react-three/drei';
import { playHoverSound, playClickSound } from '../utils/soundEngine';

interface CyberLibraryProps {
  active: boolean;
  onClick: () => void;
  label: string;
  visible?: boolean;
}

const useHoverDispatcher = (isHovered: boolean) => {
  useEffect(() => {
    if (isHovered) {
      window.dispatchEvent(new Event('cursor-hover-start'));
    } else {
      window.dispatchEvent(new Event('cursor-hover-end'));
    }
  }, [isHovered]);
};

// Reusable target vector outside useFrame to prevent GC allocations
const _targetScaleVec = new Vector3(1, 1, 1);

const CYAN = '#00f0ff';
const ULTRAVIOLET = '#a855f7';
const DEEP_VIOLET = '#6d28d9';
const FRAME_DARK = '#080d17';
const FRAME_SLATE = '#131d2e';
const CHASSIS_TRIM = '#1e293b';

/**
 * Modular Data Cartridge canister (01. Data Cartridge from spec sheet)
 */
const DataCartridge: React.FC<{
  position: [number, number, number];
  accent: string;
  scale?: number;
}> = ({ position, accent, scale = 1 }) => (
  <group position={position} scale={scale}>
    {/* Main metallic cylinder body */}
    <mesh position={[0, 0.11, 0]}>
      <cylinderGeometry args={[0.048, 0.048, 0.22, 16]} />
      <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.28} />
    </mesh>
    {/* Top & bottom caps */}
    <mesh position={[0, 0.225, 0]}>
      <cylinderGeometry args={[0.052, 0.052, 0.025, 16]} />
      <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.012, 0]}>
      <cylinderGeometry args={[0.052, 0.052, 0.024, 16]} />
      <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.2} />
    </mesh>
    {/* Emissive top & bottom rings */}
    <mesh position={[0, 0.205, 0]}>
      <cylinderGeometry args={[0.051, 0.051, 0.014, 16]} />
      <meshBasicMaterial color={accent} toneMapped={false} />
    </mesh>
    <mesh position={[0, 0.032, 0]}>
      <cylinderGeometry args={[0.051, 0.051, 0.012, 16]} />
      <meshBasicMaterial color={accent} toneMapped={false} />
    </mesh>
    {/* Front telemetry bar */}
    <mesh position={[0, 0.115, 0.049]}>
      <boxGeometry args={[0.016, 0.1, 0.004]} />
      <meshBasicMaterial color={accent} toneMapped={false} />
    </mesh>
  </group>
);

/**
 * Translucent Glowing Holographic Document / Scroll Panel
 */
const HoloDocument: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  width?: number;
  height?: number;
}> = ({ position, rotation = [0, 0, 0], color, width = 0.28, height = 0.34 }) => (
  <group position={position} rotation={rotation}>
    {/* Glassy holographic backing */}
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.18}
        depthWrite={false}
      />
    </mesh>
    {/* Top & bottom bright edge bars */}
    <mesh position={[0, height / 2, 0.002]}>
      <boxGeometry args={[width, 0.012, 0.004]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    <mesh position={[0, -height / 2, 0.002]}>
      <boxGeometry args={[width, 0.012, 0.004]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    {/* Data scan lines */}
    {[-0.08, -0.02, 0.04, 0.1].map((lineY, i) => (
      <mesh key={i} position={[i % 2 === 0 ? -0.02 : 0, lineY * (height / 0.34), 0.002]}>
        <planeGeometry args={[width * (i % 2 === 0 ? 0.68 : 0.8), 0.012]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

/**
 * CyberLibrary: Modular Dual-Bay Cyberpunk 3D Knowledge Archive.
 * Inspired by the GLB/glTF Asset Spec Sheet:
 * - Modular dual-bay frame with side ventilation louvers & cabinet base
 * - Alternating Cyan (#00f0ff) & Ultraviolet (#a855f7) emissive shelf lighting
 * - 01. Data Cartridges, Memory Crystal & Ultraviolet Crystal Cluster
 * - 02. Side Control Terminal Console with glowing screen & keyboard
 * - 03. Sloped Access Ladder mounted on a horizontal guide rail
 * - 04. Overhead, side conduit & floor Cable Bundles via TubeGeometry
 */
export const CyberLibrary: React.FC<CyberLibraryProps> = ({
  active,
  onClick,
  label,
  visible = true,
}) => {
  const [hovered, setHover] = useState(false);
  useHoverDispatcher(hovered);

  const groupRef = useRef<Group>(null);
  const crystalRef = useRef<Mesh>(null);
  const clusterRef = useRef<Group>(null);
  const holoGroupRef = useRef<Group>(null);

  // Build smooth curved cable bundles once and dispose on unmount
  const cableGeometries = useMemo(() => {
    const makeTube = (pts: [number, number, number][], radius: number) => {
      const curve = new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x, y, z)));
      return new TubeGeometry(curve, 28, radius, 8, false);
    };

    return {
      // Overhead cable bundles sweeping from top bridge up & right
      top1: makeTube(
        [
          [-0.85, 1.33, 0.06],
          [-0.1, 1.38, 0.04],
          [0.65, 1.36, 0.02],
          [1.05, 1.65, -0.05],
          [1.2, 2.35, -0.15],
        ],
        0.024
      ),
      top2: makeTube(
        [
          [-0.78, 1.33, -0.04],
          [0.05, 1.37, -0.02],
          [0.72, 1.35, -0.06],
          [1.12, 1.68, -0.12],
          [1.28, 2.35, -0.22],
        ],
        0.02
      ),
      // Side conduit dropping down right pillar into Control Console
      sideDrop1: makeTube(
        [
          [0.95, 1.28, 0.14],
          [1.16, 0.85, 0.18],
          [1.18, 0.05, 0.2],
          [1.22, -0.95, 0.22],
          [1.36, -1.35, 0.24],
        ],
        0.018
      ),
      sideDrop2: makeTube(
        [
          [0.98, 1.28, 0.06],
          [1.19, 0.82, 0.1],
          [1.21, 0.02, 0.12],
          [1.24, -1.0, 0.16],
          [1.4, -1.38, 0.2],
        ],
        0.016
      ),
      // Floor cables snaking away from base & console
      floorRight: makeTube(
        [
          [1.42, -1.86, 0.35],
          [1.65, -1.88, 0.55],
          [1.95, -1.88, 0.62],
          [2.25, -1.88, 0.78],
        ],
        0.022
      ),
      floorLeft: makeTube(
        [
          [-1.12, -1.82, 0.18],
          [-1.35, -1.88, 0.32],
          [-1.62, -1.88, 0.28],
          [-1.92, -1.88, 0.45],
        ],
        0.02
      ),
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(cableGeometries).forEach((geo) => geo.dispose());
    };
  }, [cableGeometries]);

  // Procedural animation loop (zero allocations)
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (crystalRef.current) {
      crystalRef.current.rotation.y = time * 0.75;
      crystalRef.current.position.y = 0.19 + Math.sin(time * 2.0) * 0.02;
    }
    if (clusterRef.current) {
      clusterRef.current.rotation.y = -time * 0.4;
    }
    if (holoGroupRef.current) {
      holoGroupRef.current.position.y = Math.sin(time * 1.6) * 0.015;
    }

    if (groupRef.current) {
      const targetScale = hovered || active ? 1.025 : 1.0;
      _targetScaleVec.set(targetScale, targetScale, targetScale);
      groupRef.current.scale.lerp(_targetScaleVec, delta * 8);
    }
  });

  // Shelf Y positions inside the twin bays (local coordinates; floor is at y = -1.90)
  const shelfLevels = useMemo(
    () => [
      { y: 0.92, light: CYAN },
      { y: 0.42, light: ULTRAVIOLET },
      { y: -0.08, light: CYAN },
      { y: -0.62, light: ULTRAVIOLET },
      { y: -1.16, light: CYAN },
    ],
    []
  );

  // Digital folio / book clusters
  const leftBayTopBooks = useMemo(
    () => [
      { w: 0.06, h: 0.34, d: 0.26, c: '#0e7490', g: CYAN, x: -0.84 },
      { w: 0.05, h: 0.31, d: 0.25, c: '#4c1d95', g: ULTRAVIOLET, x: -0.77 },
      { w: 0.07, h: 0.36, d: 0.27, c: '#0369a1', g: CYAN, x: -0.69 },
      { w: 0.06, h: 0.33, d: 0.26, c: '#5b21b6', g: ULTRAVIOLET, x: -0.61 },
      { w: 0.05, h: 0.29, d: 0.24, c: '#0284c7', g: CYAN, x: -0.54 },
      { w: 0.06, h: 0.35, d: 0.26, c: '#1e293b', g: CYAN, x: -0.46 },
    ],
    []
  );

  const leftBayMidBooks = useMemo(
    () => [
      { w: 0.06, h: 0.33, d: 0.25, c: '#1e1b4b', g: ULTRAVIOLET, x: -0.85 },
      { w: 0.07, h: 0.36, d: 0.27, c: '#0284c7', g: CYAN, x: -0.76 },
      { w: 0.05, h: 0.30, d: 0.24, c: '#6d28d9', g: ULTRAVIOLET, x: -0.68 },
      { w: 0.06, h: 0.34, d: 0.26, c: '#0e7490', g: CYAN, x: -0.60 },
    ],
    []
  );

  const rightBayBooks = useMemo(
    () => [
      { w: 0.06, h: 0.34, d: 0.26, c: '#0f172a', g: CYAN, x: 0.20 },
      { w: 0.05, h: 0.30, d: 0.25, c: '#4c1d95', g: ULTRAVIOLET, x: 0.27 },
      { w: 0.07, h: 0.35, d: 0.27, c: '#0369a1', g: CYAN, x: 0.35 },
      { w: 0.06, h: 0.32, d: 0.25, c: '#5b21b6', g: ULTRAVIOLET, x: 0.43 },
      { w: 0.05, h: 0.29, d: 0.24, c: '#0284c7', g: CYAN, x: 0.50 },
    ],
    []
  );

  if (!visible) return null;

  return (
    <group
      ref={groupRef}
      position={[-3.6, 1.4, -1.0]}
      rotation={[0, 0.45, 0]}
      onClick={(e) => {
        e.stopPropagation();
        playClickSound();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        playHoverSound();
      }}
      onPointerOut={() => setHover(false)}
    >
      {/* ===================================================================
          1. MODULAR DUAL-BAY TITANIUM FRAME (Floor contact at local y = -1.90)
          =================================================================== */}
      {/* Left, Center, Right Heavy Structural Pillars */}
      {[-1.08, 0.0, 1.08].map((px, idx) => (
        <group key={idx} position={[px, -0.3, 0]}>
          {/* Main Pillar Column */}
          <mesh>
            <boxGeometry args={[idx === 1 ? 0.14 : 0.16, 3.16, 0.56]} />
            <meshStandardMaterial color={FRAME_DARK} metalness={0.9} roughness={0.26} />
          </mesh>
          {/* Front Chamfered Trim */}
          <mesh position={[0, 0, 0.285]}>
            <boxGeometry args={[idx === 1 ? 0.1 : 0.12, 3.08, 0.025]} />
            <meshStandardMaterial color={FRAME_SLATE} metalness={0.78} roughness={0.42} />
          </mesh>
          {/* Vertical Emissive Accent Strip */}
          <mesh position={[0, 0, 0.302]}>
            <boxGeometry args={[0.014, 2.95, 0.008]} />
            <meshBasicMaterial
              color={idx === 1 ? ULTRAVIOLET : CYAN}
              toneMapped={false}
              transparent
              opacity={hovered ? 1.0 : 0.72}
            />
          </mesh>
          {/* Side Ventilation Louvers on Outer Pillars */}
          {idx !== 1 && (
            <group position={[idx === 0 ? -0.085 : 0.085, 0.95, 0]}>
              <mesh>
                <boxGeometry args={[0.02, 0.42, 0.36]} />
                <meshStandardMaterial color="#050810" metalness={0.85} roughness={0.5} />
              </mesh>
              {[-0.14, -0.07, 0, 0.07, 0.14].map((vy, vi) => (
                <mesh key={vi} position={[idx === 0 ? -0.008 : 0.008, vy, 0]}>
                  <boxGeometry args={[0.014, 0.022, 0.3]} />
                  <meshStandardMaterial color={CHASSIS_TRIM} metalness={0.9} roughness={0.25} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      ))}

      {/* Top Modular Bridge & Cable Conduit Header */}
      <group position={[0, 1.28, 0]}>
        <mesh>
          <boxGeometry args={[2.36, 0.16, 0.6]} />
          <meshStandardMaterial color={FRAME_SLATE} metalness={0.88} roughness={0.3} />
        </mesh>
        {/* Top Recessed Trim Cap */}
        <mesh position={[0, 0.095, 0]}>
          <boxGeometry args={[2.22, 0.04, 0.48]} />
          <meshStandardMaterial color={FRAME_DARK} metalness={0.92} roughness={0.22} />
        </mesh>
        {/* Top Front Status Strip */}
        <mesh position={[0, 0, 0.305]}>
          <boxGeometry args={[2.12, 0.018, 0.01]} />
          <meshBasicMaterial color={CYAN} toneMapped={false} />
        </mesh>
      </group>

      {/* Bottom Storage Cabinet Plinth (Sits flush at y = -1.90) */}
      <group position={[0, -1.58, 0]}>
        {/* Main Base Cabinet */}
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[2.32, 0.56, 0.6]} />
          <meshStandardMaterial color={FRAME_DARK} metalness={0.9} roughness={0.28} />
        </mesh>
        {/* Recessed Floor Kickplate */}
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[2.42, 0.08, 0.66]} />
          <meshStandardMaterial color="#050811" metalness={0.92} roughness={0.24} />
        </mesh>
        {/* Cabinet Door Panels (Left & Right Bays) */}
        {[-0.78, -0.32, 0.32, 0.78].map((dx, i) => (
          <group key={i} position={[dx, 0.02, 0.304]}>
            <mesh>
              <boxGeometry args={[0.38, 0.42, 0.016]} />
              <meshStandardMaterial color={FRAME_SLATE} metalness={0.78} roughness={0.42} />
            </mesh>
            {/* Cyan/Violet Door Handle LED */}
            <mesh position={[i % 2 === 0 ? 0.13 : -0.13, 0, 0.012]}>
              <boxGeometry args={[0.012, 0.14, 0.008]} />
              <meshBasicMaterial color={i < 2 ? CYAN : ULTRAVIOLET} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Solid Dark Back Wall for Both Bays */}
      <mesh position={[0, -0.22, -0.25]}>
        <boxGeometry args={[2.18, 2.86, 0.04]} />
        <meshStandardMaterial color="#04070e" metalness={0.75} roughness={0.55} />
      </mesh>

      {/* ===================================================================
          2. SHELVES WITH CYAN & ULTRAVIOLET EMISSIVE UNDER-LIGHTING
          =================================================================== */}
      {shelfLevels.map((shelf, idx) => (
        <group key={idx} position={[0, shelf.y, 0.02]}>
          {/* Left Bay Shelf */}
          <mesh position={[-0.54, 0, 0]}>
            <boxGeometry args={[0.96, 0.036, 0.46]} />
            <meshStandardMaterial color={FRAME_SLATE} metalness={0.85} roughness={0.32} />
          </mesh>
          {/* Right Bay Shelf */}
          <mesh position={[0.54, 0, 0]}>
            <boxGeometry args={[0.96, 0.036, 0.46]} />
            <meshStandardMaterial color={FRAME_SLATE} metalness={0.85} roughness={0.32} />
          </mesh>

          {/* Emissive Shelf Under-Glow Bar (Cyan / Ultraviolet) */}
          <mesh position={[-0.54, -0.022, 0.22]}>
            <boxGeometry args={[0.92, 0.012, 0.012]} />
            <meshBasicMaterial color={shelf.light} toneMapped={false} />
          </mesh>
          <mesh position={[0.54, -0.022, 0.22]}>
            <boxGeometry args={[0.92, 0.012, 0.012]} />
            <meshBasicMaterial
              color={idx % 2 === 0 ? ULTRAVIOLET : CYAN}
              toneMapped={false}
            />
          </mesh>

          {/* Interior Backboard Emissive Accent Line */}
          <mesh position={[-0.54, 0.22, -0.22]}>
            <planeGeometry args={[0.88, 0.018]} />
            <meshBasicMaterial
              color={shelf.light}
              transparent
              opacity={hovered ? 0.9 : 0.55}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.54, 0.22, -0.22]}>
            <planeGeometry args={[0.88, 0.018]} />
            <meshBasicMaterial
              color={idx % 2 === 0 ? ULTRAVIOLET : CYAN}
              transparent
              opacity={hovered ? 0.9 : 0.55}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* ===================================================================
          3. SHELF CONTENTS: DATA CARTRIDGES, CRYSTALS, BOOKS & HOLO-SCROLLS
          =================================================================== */}

      {/* --- TOP SHELF (y = 0.92) --- */}
      <group position={[0, 0.94, 0.03]}>
        {/* Left Bay: Digital Folios + Cyan Memory Crystal */}
        {leftBayTopBooks.map((b, i) => (
          <group key={i} position={[b.x, b.h / 2, 0]}>
            <mesh>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={b.c} metalness={0.65} roughness={0.38} />
            </mesh>
            <mesh position={[0, 0, b.d / 2 + 0.002]}>
              <planeGeometry args={[b.w * 0.65, b.h * 0.84]} />
              <meshBasicMaterial color={b.g} toneMapped={false} />
            </mesh>
          </group>
        ))}

        {/* Rotating Cyan Crystal (Spec 01) */}
        <group position={[-0.22, 0.02, 0.02]}>
          <mesh position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.03, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh ref={crystalRef} position={[0, 0.19, 0]}>
            <octahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial
              color={CYAN}
              emissive={CYAN}
              emissiveIntensity={hovered ? 1.1 : 0.65}
              transparent
              opacity={0.86}
              roughness={0.1}
              metalness={0.25}
            />
          </mesh>
        </group>

        {/* Right Bay: Glowing Data Cartridges + Ultraviolet Crystal Cluster */}
        {[0.2, 0.36, 0.52].map((cx, i) => (
          <DataCartridge
            key={i}
            position={[cx, 0, 0.02]}
            accent={i % 2 === 0 ? ULTRAVIOLET : CYAN}
          />
        ))}
        {/* Multi-shard Ultraviolet Crystal Cluster (Spec 01) */}
        <group ref={clusterRef} position={[0.78, 0.02, 0]}>
          <mesh position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.11, 0.13, 0.03, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
          </mesh>
          {[
            { pos: [0, 0.14, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number], s: 1.0 },
            { pos: [-0.06, 0.1, 0.03] as [number, number, number], rot: [0.2, 0.3, 0.4] as [number, number, number], s: 0.7 },
            { pos: [0.06, 0.11, -0.02] as [number, number, number], rot: [-0.2, -0.4, -0.35] as [number, number, number], s: 0.75 },
          ].map((shard, si) => (
            <mesh key={si} position={shard.pos} rotation={shard.rot} scale={shard.s}>
              <octahedronGeometry args={[0.075, 0]} />
              <meshStandardMaterial
                color={ULTRAVIOLET}
                emissive={DEEP_VIOLET}
                emissiveIntensity={hovered ? 1.2 : 0.75}
                transparent
                opacity={0.88}
                roughness={0.12}
                metalness={0.3}
              />
            </mesh>
          ))}
        </group>
      </group>

      {/* --- UPPER-MID SHELF (y = 0.42) --- */}
      <group position={[0, 0.44, 0.03]}>
        {/* Left Bay: Row of 5 Data Cartridges */}
        {[-0.86, -0.7, -0.54, -0.38, -0.22].map((cx, i) => (
          <DataCartridge
            key={i}
            position={[cx, 0, 0.02]}
            accent={i % 2 === 0 ? CYAN : ULTRAVIOLET}
            scale={1.05}
          />
        ))}
        {/* Right Bay: Books + Glowing Data Pad Slate */}
        {rightBayBooks.map((b, i) => (
          <group key={i} position={[b.x, b.h / 2, 0]}>
            <mesh>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={b.c} metalness={0.65} roughness={0.36} />
            </mesh>
            <mesh position={[0, 0, b.d / 2 + 0.002]}>
              <planeGeometry args={[b.w * 0.65, b.h * 0.85]} />
              <meshBasicMaterial color={b.g} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* Stacked Glowing Data Tablets */}
        <group position={[0.78, 0.04, 0.02]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.26, 0.03, 0.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.01, 0.035, 0]}>
            <boxGeometry args={[0.22, 0.025, 0.17]} />
            <meshStandardMaterial
              color={CYAN}
              emissive={CYAN}
              emissiveIntensity={0.45}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>

      {/* --- MIDDLE SHELF (y = -0.08) WITH HOLOGRAPHIC SCROLLS --- */}
      <group position={[0, -0.06, 0.03]}>
        {/* Left Bay: Folios */}
        {leftBayMidBooks.map((b, i) => (
          <group key={i} position={[b.x, b.h / 2, 0]}>
            <mesh>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={b.c} metalness={0.65} roughness={0.38} />
            </mesh>
            <mesh position={[0, 0, b.d / 2 + 0.002]}>
              <planeGeometry args={[b.w * 0.65, b.h * 0.85]} />
              <meshBasicMaterial color={b.g} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* Holographic Floating Scrolls / Data Panels */}
        <group ref={holoGroupRef}>
          <HoloDocument position={[-0.3, 0.22, 0.05]} rotation={[0, 0.08, 0]} color={CYAN} />
          <HoloDocument position={[0.42, 0.22, 0.06]} rotation={[0, -0.1, 0]} color={ULTRAVIOLET} width={0.34} />
          <HoloDocument position={[0.78, 0.2, 0.04]} rotation={[0, -0.18, 0]} color={CYAN} width={0.24} height={0.28} />
        </group>
      </group>

      {/* --- LOWER-MID SHELF (y = -0.62) --- */}
      <group position={[0, -0.6, 0.03]}>
        {/* Left Bay: Stacked Archive Pads + Cartridges */}
        {[-0.82, -0.66].map((cx, i) => (
          <DataCartridge key={i} position={[cx, 0, 0.02]} accent={ULTRAVIOLET} />
        ))}
        <group position={[-0.34, 0.05, 0]}>
          {[0, 0.045, 0.09].map((sy, si) => (
            <mesh key={si} position={[si * 0.01, sy, 0]}>
              <boxGeometry args={[0.32 - si * 0.02, 0.035, 0.26]} />
              <meshStandardMaterial color={si % 2 === 0 ? '#0f172a' : '#1e1b4b'} metalness={0.78} roughness={0.32} />
            </mesh>
          ))}
        </group>
        {/* Right Bay: Holographic Terminal Display + Data Cartridges */}
        <HoloDocument position={[0.36, 0.22, 0.04]} color={CYAN} width={0.36} height={0.32} />
        {[0.72, 0.87].map((cx, i) => (
          <DataCartridge key={i} position={[cx, 0, 0.02]} accent={CYAN} />
        ))}
      </group>

      {/* --- BOTTOM SHELF (y = -1.16) --- */}
      <group position={[0, -1.14, 0.03]}>
        {/* Left Bay: Heavy Data Server Blades */}
        {[-0.78, -0.52, -0.26].map((bx, i) => (
          <group key={i} position={[bx, 0.18, 0]}>
            <mesh>
              <boxGeometry args={[0.2, 0.34, 0.32]} />
              <meshStandardMaterial color="#0b1220" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.1, 0.163]}>
              <boxGeometry args={[0.14, 0.012, 0.004]} />
              <meshBasicMaterial color={i % 2 === 0 ? CYAN : ULTRAVIOLET} toneMapped={false} />
            </mesh>
            <mesh position={[0, -0.09, 0.163]}>
              <boxGeometry args={[0.1, 0.01, 0.004]} />
              <meshBasicMaterial color={CYAN} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* Right Bay: 4 Glowing Data Cartridges */}
        {[0.22, 0.4, 0.58, 0.76].map((cx, i) => (
          <DataCartridge
            key={i}
            position={[cx, 0, 0.02]}
            accent={i % 2 === 0 ? ULTRAVIOLET : CYAN}
            scale={1.12}
          />
        ))}
      </group>

      {/* ===================================================================
          4. ACCESS LADDER & HORIZONTAL SLIDING RAIL (Spec 03)
          =================================================================== */}
      {/* Horizontal Stainless Sliding Rail across Mid-Rack */}
      <mesh position={[0, -0.04, 0.34]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 2.18, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.2} />
      </mesh>
      {/* Sloped Access Ladder anchored at floor y = -1.90, leaning onto rail */}
      <group position={[-0.36, -0.97, 0.56]} rotation={[-0.24, 0, 0]}>
        {/* Left & Right Ladder Rails */}
        {[-0.17, 0.17].map((lx, i) => (
          <mesh key={i} position={[lx, 0, 0]}>
            <boxGeometry args={[0.032, 1.94, 0.048]} />
            <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.28} />
          </mesh>
        ))}
        {/* Ladder Rungs */}
        {[-0.74, -0.46, -0.18, 0.1, 0.38, 0.66].map((ry, i) => (
          <mesh key={i} position={[0, ry, 0]}>
            <boxGeometry args={[0.34, 0.022, 0.032]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        {/* Top Hook Brackets */}
        {[-0.17, 0.17].map((lx, i) => (
          <mesh key={i} position={[lx, 0.94, -0.035]}>
            <boxGeometry args={[0.038, 0.05, 0.07]} />
            <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.22} />
          </mesh>
        ))}
      </group>

      {/* ===================================================================
          5. CONTROL TERMINAL CONSOLE (Spec 02 - Right Side Pedestal)
          =================================================================== */}
      <group position={[1.38, -1.9, 0.26]} rotation={[0, -0.35, 0]}>
        {/* Pedestal Foot */}
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.38, 0.06, 0.38]} />
          <meshStandardMaterial color="#050810" metalness={0.92} roughness={0.25} />
        </mesh>
        {/* Main Console Column */}
        <mesh position={[0, 0.36, -0.02]}>
          <boxGeometry args={[0.28, 0.62, 0.26]} />
          <meshStandardMaterial color={FRAME_DARK} metalness={0.88} roughness={0.3} />
        </mesh>
        {/* Angled Control Deck / Keyboard */}
        <mesh position={[0, 0.69, 0.06]} rotation={[0.42, 0, 0]}>
          <boxGeometry args={[0.34, 0.05, 0.24]} />
          <meshStandardMaterial color={FRAME_SLATE} metalness={0.8} roughness={0.35} />
        </mesh>
        {/* Glowing Keyboard Accent */}
        <mesh position={[0, 0.715, 0.07]} rotation={[-Math.PI / 2 + 0.42, 0, 0]}>
          <planeGeometry args={[0.26, 0.12]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.65} toneMapped={false} />
        </mesh>
        {/* Angled Holographic Monitor Head */}
        <group position={[0, 0.87, -0.05]} rotation={[-0.28, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.36, 0.26, 0.04]} />
            <meshStandardMaterial color={FRAME_DARK} metalness={0.9} roughness={0.24} />
          </mesh>
          {/* Glowing Cyan Screen */}
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[0.31, 0.2]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.82} toneMapped={false} />
          </mesh>
          {/* Screen UI Accent Bar */}
          <mesh position={[0, 0.05, 0.024]}>
            <planeGeometry args={[0.24, 0.015]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* ===================================================================
          6. INDUSTRIAL CABLE BUNDLES (Spec 04 - TubeGeometry)
          =================================================================== */}
      {[
        cableGeometries.top1,
        cableGeometries.top2,
        cableGeometries.sideDrop1,
        cableGeometries.sideDrop2,
        cableGeometries.floorRight,
        cableGeometries.floorLeft,
      ].map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshStandardMaterial
            color={idx % 2 === 0 ? '#0f172a' : '#1e293b'}
            metalness={0.65}
            roughness={0.48}
          />
        </mesh>
      ))}

      {/* Subtle Ambient Cyan/Violet Shelf Glow */}
      <pointLight position={[-0.5, 0.4, 0.65]} intensity={1.8} distance={3.2} color={CYAN} />
      <pointLight position={[0.5, -0.3, 0.65]} intensity={1.6} distance={3.2} color={ULTRAVIOLET} />

      {/* ===================================================================
          7. FLOATING ENERGY MOTES & HOLOGRAPHIC BILLBOARD LABEL
          =================================================================== */}
      <Sparkles
        position={[0, 0, 0.35]}
        scale={[2.4, 2.8, 0.7]}
        count={hovered ? 40 : 14}
        speed={0.5}
        color={hovered ? CYAN : '#818cf8'}
        size={hovered ? 3.0 : 1.8}
        opacity={hovered ? 0.78 : 0.35}
      />

      <Billboard position={[0, 1.72, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
        <group>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.55, 0.32]} />
            <meshBasicMaterial
              color="#030712"
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <planeGeometry args={[1.55, 0.02]} />
            <meshBasicMaterial
              color={hovered || active ? CYAN : '#0284c7'}
              toneMapped={false}
            />
          </mesh>
          <Text
            position={[0, 0.02, 0.01]}
            fontSize={0.095}
            color={hovered || active ? '#ffffff' : '#94a3b8'}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.12}
          >
            {label}
          </Text>
        </group>
      </Billboard>
    </group>
  );
};

export default CyberLibrary;
