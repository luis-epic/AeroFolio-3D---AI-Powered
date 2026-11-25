import React, { useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';

export type SectionTitleTheme = 'projects' | 'about' | 'contact' | 'library';

interface ThemePalette {
  textColor: string;
  accentColor: string;
  badgeBg: string;
  glowRgb: [number, number, number];
  activeGlowRgb: [number, number, number];
}

const SECTION_THEMES: Record<SectionTitleTheme, ThemePalette> = {
  projects: {
    textColor: '#e0f2fe',
    accentColor: '#38bdf8',
    badgeBg: '#040c18',
    glowRgb: [0.35, 1.35, 1.95],
    activeGlowRgb: [0.55, 1.8, 2.45],
  },
  about: {
    textColor: '#fce7f3',
    accentColor: '#f472b6',
    badgeBg: '#120618',
    glowRgb: [1.85, 0.45, 1.25],
    activeGlowRgb: [2.35, 0.65, 1.6],
  },
  contact: {
    textColor: '#d1fae5',
    accentColor: '#34d399',
    badgeBg: '#03130f',
    glowRgb: [0.3, 1.7, 1.1],
    activeGlowRgb: [0.45, 2.2, 1.45],
  },
  library: {
    textColor: '#e0e7ff',
    accentColor: '#22d3ee',
    badgeBg: '#050a18',
    glowRgb: [0.25, 1.5, 1.9],
    activeGlowRgb: [0.45, 1.95, 2.4],
  },
};

interface SectionTitle3DProps {
  label: string;
  theme: SectionTitleTheme;
  position: [number, number, number];
  hovered?: boolean;
  active?: boolean;
  visible?: boolean;
  scale?: number;
}

export const SectionTitle3D: React.FC<SectionTitle3DProps> = ({
  label,
  theme,
  position,
  hovered = false,
  active = false,
  visible = true,
  scale = 1,
}) => {
  const palette = SECTION_THEMES[theme];
  const emphasized = hovered || active;

  const { plateWidth, plateHeight, hasCjk } = useMemo(() => {
    const cjk = /[\u3000-\u9fff]/.test(label);
    const charStep = cjk ? 0.165 : 0.104;
    const width = Math.max(1.38, Math.min(2.85, label.length * charStep + 0.54));
    return {
      plateWidth: width,
      plateHeight: 0.38,
      hasCjk: cjk,
    };
  }, [label]);

  if (!visible) return null;

  const halfW = plateWidth / 2;
  const halfH = plateHeight / 2;
  const bracketLen = 0.11;
  const bracketThick = 0.018;
  const activeScale = emphasized ? scale * 1.07 : scale;
  const barGlow = emphasized ? palette.activeGlowRgb : palette.glowRgb;

  return (
    <group position={position} scale={activeScale}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group>
          {/* Outer subtle cyber glow border */}
          <mesh position={[0, 0, -0.016]}>
            <planeGeometry args={[plateWidth + 0.03, plateHeight + 0.03]} />
            <meshBasicMaterial
              color={palette.accentColor}
              transparent
              opacity={emphasized ? 0.36 : 0.18}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* Dark obsidian glass plate */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[plateWidth, plateHeight]} />
            <meshBasicMaterial
              color={palette.badgeBg}
              transparent
              opacity={emphasized ? 0.92 : 0.84}
              depthWrite={false}
            />
          </mesh>

          {/* Top thin accent hairline */}
          <mesh position={[0, halfH - 0.008, 0.002]}>
            <planeGeometry args={[plateWidth * 0.9, 0.012]} />
            <meshBasicMaterial
              color={palette.accentColor}
              transparent
              opacity={emphasized ? 0.85 : 0.45}
              toneMapped={false}
            />
          </mesh>

          {/* Bottom luminous HDR accent underline */}
          <mesh position={[0, -halfH + 0.01, 0.004]}>
            <planeGeometry args={[plateWidth, 0.026]} />
            <meshBasicMaterial color={barGlow} toneMapped={false} />
          </mesh>

          {/* Left & Right architectural corner brackets */}
          <mesh position={[-halfW + bracketThick / 2, halfH - bracketLen / 2, 0.005]}>
            <planeGeometry args={[bracketThick, bracketLen]} />
            <meshBasicMaterial color={barGlow} toneMapped={false} />
          </mesh>
          <mesh position={[halfW - bracketThick / 2, halfH - bracketLen / 2, 0.005]}>
            <planeGeometry args={[bracketThick, bracketLen]} />
            <meshBasicMaterial color={barGlow} toneMapped={false} />
          </mesh>
          <mesh position={[-halfW + bracketThick / 2, -halfH + bracketLen / 2, 0.005]}>
            <planeGeometry args={[bracketThick, bracketLen]} />
            <meshBasicMaterial color={barGlow} toneMapped={false} />
          </mesh>
          <mesh position={[halfW - bracketThick / 2, -halfH + bracketLen / 2, 0.005]}>
            <planeGeometry args={[bracketThick, bracketLen]} />
            <meshBasicMaterial color={barGlow} toneMapped={false} />
          </mesh>

          {/* Crisp high-contrast SDF typography */}
          <Text
            position={[0, 0.012, 0.012]}
            fontSize={0.148}
            fontWeight={700}
            letterSpacing={hasCjk ? 0.08 : 0.13}
            sdfGlyphSize={128}
            color={emphasized ? '#ffffff' : palette.textColor}
            strokeWidth={0.0045}
            strokeColor={palette.accentColor}
            strokeOpacity={emphasized ? 0.92 : 0.55}
            outlineWidth={0.014}
            outlineColor="#020617"
            outlineBlur={0.006}
            anchorX="center"
            anchorY="middle"
            maxWidth={plateWidth - 0.16}
          >
            {label}
          </Text>
        </group>
      </Billboard>
    </group>
  );
};

export default SectionTitle3D;
