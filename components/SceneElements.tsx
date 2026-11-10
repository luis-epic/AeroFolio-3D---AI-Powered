
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import { Mesh, Group, Vector3, CylinderGeometry, TorusGeometry, BoxGeometry, PlaneGeometry, SphereGeometry, CircleGeometry, IcosahedronGeometry, OctahedronGeometry } from 'three';
import { Text, Float, MeshTransmissionMaterial, RoundedBox, Billboard, Sparkles } from '@react-three/drei';
import { useLanguage } from '../contexts/LanguageContext';
import { playHoverSound, playClickSound, playTypeSound } from '../utils/soundEngine';

// Explicitly define JSX intrinsic elements for R3F and HTML to fix Typescript errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Helper for hover events
const useHoverDispatcher = (isHovered: boolean) => {
    useEffect(() => {
        if (isHovered) {
            window.dispatchEvent(new Event('cursor-hover-start'));
        } else {
            window.dispatchEvent(new Event('cursor-hover-end'));
        }
    }, [isHovered]);
};

export const ResumePaper: React.FC = () => {
  const [hovered, setHover] = useState(false);
  useHoverDispatcher(hovered);

  // Memoize geometries
  const stackGeo = useMemo(() => new BoxGeometry(0.62, 0.02, 0.87), []);
  const topGeo = useMemo(() => new BoxGeometry(0.6, 0.01, 0.85), []);
  const planeGeo = useMemo(() => new PlaneGeometry(0.45, 0.5), []);
  const iconGeo = useMemo(() => new PlaneGeometry(0.12, 0.12), []);

  const handleClick = (e: any) => {
    e.stopPropagation();
    playClickSound();
    // Simulate opening/downloading
    window.open('https://luismartinez.dev/cv.pdf', '_blank');
  };

  return (
    <group 
        position={[1.1, 0.4, 1.2]} 
        rotation={[0, -0.4, 0]}
    >
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
        <group 
          onClick={handleClick}
          onPointerOver={() => { setHover(true); playHoverSound(); }}
          onPointerOut={() => setHover(false)}
        >
          {/* Paper Stack Effect */}
          <mesh position={[0, -0.01, 0]} geometry={stackGeo}>
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
          <mesh geometry={topGeo}>
            <meshStandardMaterial color={hovered ? "#ffffff" : "#f3f4f6"} />
          </mesh>
          
          <mesh position={[0, 0.011, 0.05]} rotation={[-Math.PI / 2, 0, 0]} geometry={planeGeo}>
             <meshBasicMaterial color="#e5e7eb" transparent opacity={0.6} />
          </mesh>

          {/* Icon/Profile Pic Placeholder */}
          <mesh position={[-0.18, 0.012, -0.3]} rotation={[-Math.PI / 2, 0, 0]} geometry={iconGeo}>
             <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </group>
      </Float>
    </group>
  );
};

const SparkleSteam = () => (
    <group position={[0, 0.25, 0]}>
        <Sparkles count={5} scale={[0.1, 0.3, 0.1]} size={2} speed={0.8} opacity={0.3} color="#aaa" noise={0.5} />
    </group>
)

export const CoffeeMug: React.FC = () => {
  const [hovered, setHover] = useState(false);
  
  useHoverDispatcher(hovered);

  // Memoize geometries with reduced segments
  const mugGeo = useMemo(() => new CylinderGeometry(0.14, 0.12, 0.35, 16), []);
  const coffeeGeo = useMemo(() => new CircleGeometry(0.12, 16), []);
  const handleGeo = useMemo(() => new TorusGeometry(0.09, 0.025, 6, 12, Math.PI), []);

  return (
    <group 
        position={[-1.1, 0.4, 1.2]} 
        rotation={[0, 0.5, 0]}
    >
       <Float speed={2} rotationIntensity={0.5} floatIntensity={0.4}>
        <group
          onClick={(e) => { e.stopPropagation(); playClickSound(); }}
          onPointerOver={() => { setHover(true); playHoverSound(); }}
          onPointerOut={() => setHover(false)}
        >
          {/* Mug Base */}
          <mesh position={[0, 0.15, 0]} geometry={mugGeo}>
            <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Coffee Surface */}
          <mesh position={[0, 0.31, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={coffeeGeo}>
             <meshStandardMaterial color="#3c2f2f" roughness={0.2} emissive="#3c2f2f" emissiveIntensity={0.2} />
          </mesh>
          {/* Handle */}
          <mesh position={[0.14, 0.15, 0]} rotation={[0, 0, -Math.PI/2]} geometry={handleGeo}>
            <meshStandardMaterial color="#1f2937" metalness={0.8} />
          </mesh>
          
          <SparkleSteam />
        </group>
       </Float>
    </group>
  );
};

interface TechOrbitProps {
  active: boolean;
  hovered: boolean;
}

const TechItem = ({ index, total, tech, active, parentHovered }: any) => {
  const ref = useRef<Group>(null);
  
  // OPTIMIZATION: Use useMemo to prevent creating new objects on every render
  const vec = useMemo(() => new Vector3(), []);
  const sphereGeo = useMemo(() => new SphereGeometry(0.12, 16, 16), []);
  const ringGeo = useMemo(() => new TorusGeometry(0.15, 0.01, 8, 24), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const show = active || parentHovered;
    const targetScale = show ? 1 : 0;
    ref.current.scale.lerp(vec.set(targetScale, targetScale, targetScale), 0.1);

    if (active) {
      const angleStep = 0.5; 
      const startAngle = -((total - 1) * angleStep) / 2;
      const angle = startAngle + index * angleStep;
      const radius = 1.6;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius * 0.5 - 1.2; 
      const y = 1.2; 
      ref.current.position.lerp(vec.set(x, y, z), 0.08);
    } else {
      const speed = 0.5;
      const radius = 2.0;
      const yOffset = Math.sin(t * 0.5 + index) * 0.2; 
      const angle = (index / total) * Math.PI * 2 + t * speed;
      ref.current.position.lerp(vec.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius), 0.05);
    }
  });

  return (
    <group ref={ref}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Float speed={ active ? 2 : 0} rotationIntensity={0.2} floatIntensity={0.2}>
          <mesh position={[0, 0.15, 0]} geometry={sphereGeo}>
            <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={ringGeo}>
            <meshBasicMaterial color={tech.color} toneMapped={false} />
          </mesh>
          <Text position={[0, -0.1, 0]} fontSize={0.15} color={tech.color} anchorX="center" anchorY="top">
            {tech.label}
          </Text>
        </Float>
      </Billboard>
    </group>
  );
};

export const TechOrbit: React.FC<TechOrbitProps> = ({ active, hovered }) => {
  const techs = useMemo(() => [
    { label: "React", color: "#61dafb" },
    { label: "TypeScript", color: "#3178c6" },
    { label: "Next.js", color: "#ffffff" },
    { label: "Three.js", color: "#F3F3F3" }, 
    { label: "Gemini AI", color: "#8e75e8" },
  ], []);

  return (
    <group position={[0, 0.5, 0]}>
      {techs.map((tech, i) => (
        <TechItem key={i} index={i} total={techs.length} tech={tech} active={active} parentHovered={hovered} />
      ))}
    </group>
  );
};

interface LaptopProps {
  onClick: () => void;
  active: boolean;
  label: string;
  onHoverChange?: (isHovering: boolean) => void;
}

const TypewriterText = () => {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const fullTextLines = [
    "> initializing kernel...",
    "> loading portfolio_v3.0",
    "> [||||||||||] 100%",
    "> mounting virtual_fs...",
    "> status: ONLINE",
    "",
    "const engineer = {",
    "  name: 'Luis Martinez',",
    "  role: 'Senior Frontend',",
    "  skills: ['R3F', 'AI', 'Next']",
    "};",
    "",
    "> ready for input"
  ];
  const fullText = fullTextLines.join('\n');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index));
        if (Math.random() > 0.6) playTypeSound(); 
        index++;
      } else clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(prev => !prev), 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <Text position={[-0.66, 0.4, 0.001]} anchorX="left" anchorY="top" fontSize={0.055} maxWidth={1.3} lineHeight={1.1} color="#4ade80">
       {displayedText + (showCursor ? "_" : "")}
    </Text>
  );
};

const TypewriterTerminal = () => (
  <group position={[0, 0.5, 0.026]}>
    <mesh>
       <planeGeometry args={[1.42, 0.92]} />
       <meshBasicMaterial color="#0f172a" />
    </mesh>
    <TypewriterText />
  </group>
);

export const Laptop: React.FC<LaptopProps> = ({ onClick, active, label, onHoverChange }) => {
  const groupRef = useRef<Group>(null);
  const screenRef = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  
  // Memoize geometries for performance
  const chassisGeo = useMemo(() => new BoxGeometry(1.5, 0.06, 1), []);
  const screenGeo = useMemo(() => new BoxGeometry(1.5, 1.0, 0.04), []);
  const screenSurfaceGeo = useMemo(() => new PlaneGeometry(1.46, 0.96), []);
  const trackpadGeo = useMemo(() => new PlaneGeometry(0.6, 0.32), []);
  const keyboardAreaGeo = useMemo(() => new PlaneGeometry(1.3, 0.45), []);
  
  useHoverDispatcher(hovered);

  const handlePointerOver = () => {
    setHover(true);
    playHoverSound();
    onHoverChange?.(true);
  };

  const handlePointerOut = () => {
    setHover(false);
    onHoverChange?.(false);
  };

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = 0.1 + Math.sin(t * 0.5) * 0.005;
    }
  });

  const chassisColor = "#1e293b"; 
  const keyColor = "#0f172a"; 
  const glowColor = active ? "#3b82f6" : "#60a5fa";
  const targetRotation = active ? -0.25 : (hovered ? -0.30 : -0.45);

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); playClickSound(); }} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      <group position={[0, 0, 0]}>
        <mesh geometry={chassisGeo} position={[0, 0, 0]}>
            <meshStandardMaterial color={chassisColor} roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.031, 0.3]} rotation={[-Math.PI / 2, 0, 0]} geometry={trackpadGeo}>
          <meshPhysicalMaterial color="#334155" roughness={0.2} metalness={0.5} clearcoat={0.5} />
        </mesh>
        <mesh position={[0, 0.031, -0.15]} rotation={[-Math.PI / 2, 0, 0]} geometry={keyboardAreaGeo}>
          <meshStandardMaterial color="#111827" roughness={0.8} metalness={0.2} />
        </mesh>
        <group position={[0, 0.035, -0.15]}>
            {[ -0.18, -0.12, -0.05, 0.02, 0.09, 0.16 ].map((z, i) => (
                <RoundedBox key={i} args={[1.25, 0.01, 0.03 + (i%2)*0.02]} radius={0.005} position={[0, 0, z]}>
                    <meshStandardMaterial color={keyColor} roughness={0.7} />
                </RoundedBox>
            ))}
        </group>
        <mesh position={[-0.76, 0, -0.1]}><boxGeometry args={[0.02, 0.015, 0.1]} /><meshBasicMaterial color="#000" /></mesh>
        <mesh position={[0.76, 0, -0.1]}><boxGeometry args={[0.02, 0.015, 0.1]} /><meshBasicMaterial color="#000" /></mesh>
      </group>
      <mesh position={[0, 0.03, -0.48]} rotation={[0, 0, Math.PI / 2]}>
         <cylinderGeometry args={[0.025, 0.025, 1.2, 16]} />
         <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      <group ref={screenRef} position={[0, 0.04, -0.48]} rotation={[targetRotation, 0, 0]}> 
        <mesh position={[0, 0.5, 0]} geometry={screenGeo}>
          <meshStandardMaterial color={chassisColor} roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.5, 0.021]} geometry={screenSurfaceGeo}>
          <meshPhysicalMaterial color="#000000" roughness={0.2} metalness={0.8} clearcoat={1} />
        </mesh>
        {active ? <TypewriterTerminal /> : (
            <>
             <group position={[0, 0, 0]}><TypewriterTerminal /></group>
             <mesh position={[0, 0.5, 0.03]}>
                <planeGeometry args={[1.44, 0.94]} />
                <meshBasicMaterial color={glowColor} transparent opacity={hovered ? 0.1 : 0.05} toneMapped={false} />
             </mesh>
            </>
        )}
        <mesh position={[0, 0.96, 0.024]}><boxGeometry args={[0.12, 0.02, 0.005]} /><meshBasicMaterial color="#0f172a" /></mesh>
        <mesh position={[0, 0.96, 0.025]}><circleGeometry args={[0.004, 16]} /><meshBasicMaterial color="#10b981" toneMapped={false} opacity={1} transparent /></mesh>
      </group>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text position={[0, 1.6, -0.5]} fontSize={0.15} color="white" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000" visible={!active}>
          {label}
        </Text>
      </Float>
    </group>
  );
};

interface BrainProps {
  onClick: () => void;
  active: boolean;
  label: string;
  visible?: boolean;
}

export const Brain: React.FC<BrainProps> = ({ onClick, active, label, visible = true }) => {
  const meshRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  const vec = new Vector3();
  useHoverDispatcher(hovered);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(t) * 0.1;
      meshRef.current.rotation.x = t * 0.2;
      meshRef.current.rotation.y = t * 0.3;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x = -t * 0.2;
      innerRef.current.rotation.y = -t * 0.5;
    }
    if (groupRef.current) {
      const targetScale = visible ? 1 : 0;
      groupRef.current.scale.lerp(vec.set(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <group ref={groupRef} position={[-2.5, 0.8, 0.5]} onClick={(e) => { e.stopPropagation(); onClick(); playClickSound(); }} onPointerOver={() => { setHover(true); playHoverSound(); }} onPointerOut={() => setHover(false)}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[0.7, 0]} />
          <MeshTransmissionMaterial 
            backside={false} 
            samples={1} // Lowest samples for max performance
            resolution={512}
            thickness={0.2} 
            chromaticAberration={0.1} 
            anisotropy={0.1} 
            distortion={0.1} 
            distortionScale={0.1} 
            temporalDistortion={0.1} 
            color={active ? "#f472b6" : "#e2e8f0"} 
            roughness={0.1}
          />
        </mesh>
        <mesh ref={innerRef} scale={0.4}>
           <octahedronGeometry args={[1, 0]} />
           <meshBasicMaterial color={active ? "#db2777" : "#ec4899"} wireframe toneMapped={false} />
        </mesh>
        <mesh rotation={[1, 1, 1]}>
          <torusGeometry args={[0.9, 0.02, 16, 100]} />
          <meshBasicMaterial color={hovered ? "#f472b6" : "#4b5563"} transparent opacity={0.3} />
        </mesh>
      </Float>
       <Text position={[0, 1.2, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000">
          {label}
        </Text>
    </group>
  );
};

interface SmartphoneProps {
  onClick: () => void;
  active: boolean;
  label: string;
  visible?: boolean;
}

export const Smartphone: React.FC<SmartphoneProps> = ({ onClick, active, label, visible = true }) => {
  const groupRef = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  const vec = new Vector3();
  useHoverDispatcher(hovered);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = 0.5 + Math.sin(t * 0.6) * 0.08;
      groupRef.current.rotation.y = -0.2 + Math.sin(t * 0.3) * 0.15;
      if (hovered) {
        groupRef.current.rotation.z = Math.sin(t * 20) * 0.005;
        groupRef.current.position.x = 2.5 + Math.sin(t * 30) * 0.002;
      } else {
        groupRef.current.rotation.z = 0;
        groupRef.current.position.x = 2.5;
      }
      const targetScale = visible ? 1 : 0;
      groupRef.current.scale.lerp(vec.set(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const frameColor = "#9ca3af"; 
  const backColor = "#374151"; 

  return (
    <group ref={groupRef} position={[2.5, 0.5, 0.5]} onClick={(e) => { e.stopPropagation(); onClick(); playClickSound(); }} onPointerOver={() => { setHover(true); playHoverSound(); }} onPointerOut={() => setHover(false)}>
      <group>
        <RoundedBox args={[0.7, 1.45, 0.08]} radius={0.04} smoothness={4}><meshStandardMaterial color={frameColor} roughness={0.25} metalness={1.0} /></RoundedBox>
        <mesh position={[0, 0, 0.041]}><planeGeometry args={[0.66, 1.41]} /><meshPhysicalMaterial color="black" roughness={0.2} metalness={0.5} clearcoat={1} /></mesh>
        <mesh position={[0, 0.65, 0.042]}><boxGeometry args={[0.2, 0.05, 0.001]} /><meshBasicMaterial color="black" /></mesh>
        {(active || hovered) && (
          <group position={[0, 0.2, 0.045]}>
            <RoundedBox args={[0.55, 0.15, 0.01]} radius={0.02}><meshBasicMaterial color="#ffffff" transparent opacity={0.9} /></RoundedBox>
             <mesh position={[-0.2, 0, 0.01]}><circleGeometry args={[0.04, 16]} /><meshBasicMaterial color="#22c55e" /></mesh>
             <mesh position={[0.05, 0.02, 0.01]}><planeGeometry args={[0.3, 0.015]} /><meshBasicMaterial color="#333" /></mesh>
             <mesh position={[0.05, -0.02, 0.01]}><planeGeometry args={[0.2, 0.015]} /><meshBasicMaterial color="#999" /></mesh>
          </group>
        )}
         <mesh position={[0, -0.65, 0.042]}><boxGeometry args={[0.25, 0.01, 0.001]} /><meshBasicMaterial color="white" transparent opacity={0.5} /></mesh>
      </group>
      <group rotation={[0, Math.PI, 0]}>
         <mesh position={[0, 0, 0.041]}><planeGeometry args={[0.65, 1.4]} /><meshStandardMaterial color={backColor} roughness={0.6} metalness={0.2} /></mesh>
         <RoundedBox args={[0.3, 0.3, 0.02]} radius={0.05} position={[0.15, 0.5, 0.05]}><meshPhysicalMaterial color={backColor} roughness={0.4} metalness={0.3} clearcoat={0.5} /></RoundedBox>
         <group position={[0.15, 0.5, 0.06]}>
            <mesh position={[-0.08, 0.08, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} /></mesh>
            <mesh position={[-0.08, -0.08, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} /></mesh>
             <mesh position={[0.08, 0, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} /></mesh>
         </group>
         <mesh position={[0, 0.1, 0.042]}><circleGeometry args={[0.06, 32]} /><meshStandardMaterial color="#555" roughness={0.3} metalness={0.8} /></mesh>
      </group>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text position={[0, 1.1, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000">
            {label}
        </Text>
      </Float>
    </group>
  );
};
