import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group, Vector3, Color } from 'three';
import { Text, Float, useCursor, MeshTransmissionMaterial, RoundedBox, Billboard, Sparkles } from '@react-three/drei';

// --- STRATEGY 4: RESUME PAPER (Physical Download) ---
export const ResumePaper: React.FC = () => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<Group>(null);
  useCursor(hovered, 'pointer', 'auto');

  const handleDownload = (e: any) => {
    e.stopPropagation();
    // Simulate download
    alert("Downloading Resume.pdf...");
    // In production: window.open('/resume.pdf', '_blank');
  };

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle lift on hover
      const targetY = hovered ? 0.05 : 0;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1;
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={[1.2, 0.01, 0.8]} 
      rotation={[0, -0.2, 0]}
      onClick={handleDownload}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {/* Paper Sheet */}
      <mesh>
        <boxGeometry args={[0.6, 0.01, 0.85]} /> {/* A4 ratio approx */}
        <meshStandardMaterial color={hovered ? "#ffffff" : "#f3f4f6"} />
      </mesh>
      
      {/* Text Header */}
      <Text 
        position={[0, 0.011, -0.3]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        fontSize={0.08} 
        color="#000"
        // Removed external font to prevent loading hang
      >
        RESUME
      </Text>
      {/* Text Body Lines */}
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
         <planeGeometry args={[0.4, 0.4]} />
         <meshBasicMaterial color="#ccc" />
      </mesh>
      
      {/* Download CTA */}
      {hovered && (
         <Text 
            position={[0, 0.2, 0]} 
            fontSize={0.08} 
            color="#3b82f6"
            outlineWidth={0.005}
            outlineColor="#fff"
         >
            Click to Download
         </Text>
      )}
    </group>
  );
};

// --- STRATEGY 3: PHYSICS-LITE (Interactive Coffee Mug) ---
const SparkleSteam = () => {
    return (
        <group position={[0, 0.25, 0]}>
            <Sparkles 
              count={10} 
              scale={[0.1, 0.3, 0.1]} 
              size={3} 
              speed={0.8} 
              opacity={0.4} 
              color="#aaa" 
              noise={0.5}
            />
        </group>
    )
}

export const CoffeeMug: React.FC = () => {
  const ref = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  const velocity = useRef(new Vector3(0, 0, 0));
  
  useCursor(hovered, 'grab', 'auto');

  const push = () => {
    // Random push direction
    const angle = Math.random() * Math.PI * 2;
    velocity.current.set(Math.cos(angle) * 0.02, 0, Math.sin(angle) * 0.02);
  };

  useFrame(() => {
    if (ref.current) {
      // Apply velocity
      ref.current.position.add(velocity.current);
      
      // Friction/Damping
      velocity.current.multiplyScalar(0.95);
      
      // Bounds check (Table edges approx)
      if (ref.current.position.x > 4 || ref.current.position.x < -4) velocity.current.x *= -1;
      if (ref.current.position.z > 2 || ref.current.position.z < -1) velocity.current.z *= -1;

      // Wobble based on velocity speed
      const speed = velocity.current.length();
      ref.current.rotation.z = Math.sin(Date.now() * 0.02) * speed * 10;
      ref.current.rotation.x = Math.cos(Date.now() * 0.02) * speed * 10;
    }
  });

  return (
    <group 
        ref={ref} 
        position={[-1.2, 0, 0.8]} 
        onClick={(e) => { e.stopPropagation(); push(); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
    >
      {/* Mug Body */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.3, 32]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>
      {/* Coffee Liquid */}
      <mesh position={[0, 0.28, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <circleGeometry args={[0.1]} />
         <meshStandardMaterial color="#3c2f2f" roughness={0.2} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.12, 0.15, 0]} rotation={[0, 0, -Math.PI/2]}>
        <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* Steam */}
      <SparkleSteam />
    </group>
  );
};

// --- Tech Stack Orbit Component (Holographic HUD) ---
interface TechOrbitProps {
  active: boolean;
  hovered: boolean;
}

// Extracted TechItem to avoid re-renders
const TechItem = ({ index, total, tech, active, parentHovered }: any) => {
  const ref = useRef<Group>(null);
  const vec = new Vector3();

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.getElapsedTime();
    const show = active || parentHovered;

    const targetScale = show ? 1 : 0;
    ref.current.scale.lerp(vec.set(targetScale, targetScale, targetScale), 0.1);

    if (active) {
      const angleStep = 0.6; 
      const startAngle = -((total - 1) * angleStep) / 2;
      const angle = startAngle + index * angleStep;
      
      const radius = 2.0;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius * 0.5 - 1.5; 
      const y = 1.2; 

      ref.current.position.lerp(vec.set(x, y, z), 0.08);
    } else {
      const speed = 0.5;
      const radius = 2.2;
      const yOffset = Math.sin(t * 0.5 + index) * 0.2; 
      const angle = (index / total) * Math.PI * 2 + t * speed;
      
      ref.current.position.lerp(vec.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius), 0.05);
    }
  });

  return (
    <group ref={ref}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Float speed={ active ? 2 : 0} rotationIntensity={0.2} floatIntensity={0.2}>
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.12, 32, 32]} />
            <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.01, 16, 32]} />
            <meshBasicMaterial color={tech.color} toneMapped={false} />
          </mesh>
          <Text
            position={[0, -0.1, 0]} 
            fontSize={0.15} 
            color={tech.color}
            anchorX="center"
            anchorY="top"
            outlineWidth={0.005}
            outlineColor="black"
            // Removed external font
          >
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
        <TechItem 
          key={i} 
          index={i} 
          total={techs.length} 
          tech={tech} 
          active={active} 
          parentHovered={hovered} 
        />
      ))}
    </group>
  );
};

// --- Laptop Component (Ultra-Modern Unibody Design) ---
interface LaptopProps {
  onClick: () => void;
  active: boolean;
  label: string;
  onHoverChange?: (isHovering: boolean) => void;
}

// Extracted TerminalContent to avoid re-renders
const TerminalContent = () => (
  <group position={[0, 0.5, 0.026]}>
    {/* Terminal Background - Upscaled to fill screen */}
    <mesh>
       <planeGeometry args={[1.42, 0.92]} />
       <meshBasicMaterial color="#0f172a" />
    </mesh>
    {/* Simulated Code Lines - Increased Font Size */}
    <Text
       position={[-0.66, 0.4, 0.001]}
       anchorX="left"
       anchorY="top"
       fontSize={0.06}
       maxWidth={1.3}
       lineHeight={1.2}
       color="#4ade80"
       // Removed external font
    >
       {`> initializing system...\n> loading portfolio [|||||||||] 100%\n> status: ONLINE\n\nconst profile = {\n  role: 'Senior Engineer',\n  stack: ['React', 'Three.js', 'AI'],\n  status: 'Open to Work'\n};\n\n> console.log("Welcome Recruiter");`}
    </Text>
  </group>
);

export const Laptop: React.FC<LaptopProps> = ({ onClick, active, label, onHoverChange }) => {
  const groupRef = useRef<Group>(null);
  const screenRef = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

  const handlePointerOver = () => {
    setHover(true);
    onHoverChange?.(true);
  };

  const handlePointerOut = () => {
    setHover(false);
    onHoverChange?.(false);
  };

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      // Gentle floating animation for the whole laptop
      groupRef.current.position.y = 0.1 + Math.sin(t * 0.5) * 0.005;
    }
  });

  const chassisColor = "#1e293b"; 
  const keyColor = "#0f172a"; 
  const glowColor = active ? "#3b82f6" : "#60a5fa";

  // Hinge & Rotation Logic
  // 0 radians = Screen vertical (90 deg relative to base)
  // -0.25 radians = Tilted back ~15 deg (Optimal viewing)
  // -0.45 radians = Tilted back ~25 deg (Resting/Display mode)
  const targetRotation = active ? -0.25 : (hovered ? -0.30 : -0.45);

  return (
    <group 
      ref={groupRef} 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      onPointerOver={handlePointerOver} 
      onPointerOut={handlePointerOut}
    >
      {/* --- BASE CHASSIS --- */}
      <group position={[0, 0, 0]}>
        {/* Main Body */}
        <RoundedBox args={[1.5, 0.06, 1]} radius={0.01} smoothness={4}>
          <meshStandardMaterial color={chassisColor} roughness={0.4} metalness={0.8} />
        </RoundedBox>
        
        {/* Trackpad Area */}
        <mesh position={[0, 0.031, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.32]} />
          <meshPhysicalMaterial color="#334155" roughness={0.2} metalness={0.5} clearcoat={0.5} />
        </mesh>

        {/* Keyboard Well */}
        <mesh position={[0, 0.031, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.3, 0.45]} />
          <meshStandardMaterial color="#111827" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Keys (Simplified Rows) */}
        <group position={[0, 0.035, -0.15]}>
            <RoundedBox args={[1.25, 0.01, 0.03]} radius={0.002} position={[0, 0, -0.18]}>
                <meshStandardMaterial color={keyColor} roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[1.25, 0.01, 0.05]} radius={0.005} position={[0, 0, -0.12]}>
                <meshStandardMaterial color={keyColor} roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[1.25, 0.01, 0.05]} radius={0.005} position={[0, 0, -0.05]}>
                <meshStandardMaterial color={keyColor} roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[1.25, 0.01, 0.05]} radius={0.005} position={[0, 0, 0.02]}>
                <meshStandardMaterial color={keyColor} roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[1.25, 0.01, 0.05]} radius={0.005} position={[0, 0, 0.09]}>
                <meshStandardMaterial color={keyColor} roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[1.25, 0.01, 0.05]} radius={0.005} position={[0, 0, 0.16]}>
                <meshStandardMaterial color={keyColor} roughness={0.7} />
            </RoundedBox>
        </group>

        {/* Ports */}
        <mesh position={[-0.76, 0, -0.1]}>
          <boxGeometry args={[0.02, 0.015, 0.1]} />
          <meshBasicMaterial color="#000" />
        </mesh>
        <mesh position={[0.76, 0, -0.1]}>
          <boxGeometry args={[0.02, 0.015, 0.1]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      </group>

      {/* --- HINGE MECHANISM --- */}
      <mesh position={[0, 0.03, -0.48]} rotation={[0, 0, Math.PI / 2]}>
         <cylinderGeometry args={[0.025, 0.025, 1.2, 16]} />
         <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* --- SCREEN LID GROUP --- */}
      <group 
        ref={screenRef} 
        position={[0, 0.04, -0.48]} // Slightly higher Y to sit ON TOP of hinge
        rotation={[targetRotation, 0, 0]} 
      > 
        {/* Lid Shell - Reduced Radius to prevent glass clipping */}
        <RoundedBox args={[1.5, 1.0, 0.04]} radius={0.01} smoothness={4} position={[0, 0.5, 0]}>
          <meshStandardMaterial color={chassisColor} roughness={0.4} metalness={0.8} />
        </RoundedBox>

        {/* Screen Glass */}
        <mesh position={[0, 0.5, 0.021]}>
          <planeGeometry args={[1.46, 0.96]} />
          <meshPhysicalMaterial 
            color="#000000" 
            roughness={0.2}
            metalness={0.8}
            clearcoat={1}
          />
        </mesh>

        {/* Display Content */}
        {active ? (
             <TerminalContent />
        ) : (
            <>
             {/* Always show terminal faint in background to look cool */}
             <group position={[0, 0, 0]}>
                <TerminalContent />
             </group>
             {/* Reflection Overlay */}
             <mesh position={[0, 0.5, 0.03]}>
                <planeGeometry args={[1.44, 0.94]} />
                <meshBasicMaterial 
                    color={glowColor}
                    transparent
                    opacity={hovered ? 0.1 : 0.05} // Always slight glow
                    toneMapped={false}
                />
             </mesh>
            </>
        )}

        {/* Webcam & Bezel Details */}
        <mesh position={[0, 0.96, 0.024]}>
          <boxGeometry args={[0.12, 0.02, 0.005]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 0.96, 0.025]}>
           <circleGeometry args={[0.004, 16]} />
           <meshBasicMaterial color="#10b981" toneMapped={false} opacity={1} transparent />
        </mesh>
      </group>

      {/* Label */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text 
          position={[0, 1.6, -0.5]} 
          fontSize={0.15} 
          color="white" 
          anchorX="center" 
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
          visible={!active} // Hide label when active to see terminal
        >
          {label}
        </Text>
      </Float>
    </group>
  );
};

// --- Brain/AI Component (Glassmorphism) ---
interface BrainProps {
  onClick: () => void;
  active: boolean;
  label: string;
}

export const Brain: React.FC<BrainProps> = ({ onClick, active, label }) => {
  const meshRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

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
  });

  return (
    <group position={[-2.5, 0.8, 0.5]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <Float speed={4} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[0.7, 0]} />
          <MeshTransmissionMaterial 
            backside
            samples={4}
            thickness={0.5}
            chromaticAberration={0.5}
            anisotropy={0.5}
            distortion={0.5}
            distortionScale={0.5}
            temporalDistortion={0.1}
            iridescence={1}
            iridescenceIOR={1}
            iridescenceThicknessRange={[0, 1400]}
            color={active ? "#f472b6" : "#e2e8f0"}
          />
        </mesh>
        <mesh ref={innerRef} scale={0.4}>
           <octahedronGeometry args={[1, 0]} />
           <meshBasicMaterial 
            color={active ? "#db2777" : "#ec4899"} 
            wireframe 
            toneMapped={false} 
           />
        </mesh>
        <mesh rotation={[1, 1, 1]}>
          <torusGeometry args={[0.9, 0.02, 16, 100]} />
          <meshBasicMaterial color={hovered ? "#f472b6" : "#4b5563"} transparent opacity={0.3} />
        </mesh>
      </Float>
       <Text 
          position={[0, 1.2, 0]} 
          fontSize={0.15} 
          color="white" 
          anchorX="center" 
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
          // Removed external font
        >
          {label}
        </Text>
    </group>
  );
};

// --- Smartphone Component (Titanium High-End Device) ---
interface SmartphoneProps {
  onClick: () => void;
  active: boolean;
  label: string;
}

export const Smartphone: React.FC<SmartphoneProps> = ({ onClick, active, label }) => {
  const groupRef = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

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
    }
  });

  const frameColor = "#9ca3af"; 
  const backColor = "#374151"; 

  return (
    <group 
      ref={groupRef} 
      position={[2.5, 0.5, 0.5]} 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      onPointerOver={() => setHover(true)} 
      onPointerOut={() => setHover(false)}
    >
      <group>
        <RoundedBox args={[0.7, 1.45, 0.08]} radius={0.04} smoothness={4}>
           <meshStandardMaterial color={frameColor} roughness={0.25} metalness={1.0} />
        </RoundedBox>
        <mesh position={[0, 0, 0.041]}>
          <planeGeometry args={[0.66, 1.41]} />
          <meshPhysicalMaterial color="black" roughness={0.2} metalness={0.5} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.65, 0.042]}>
          <boxGeometry args={[0.2, 0.05, 0.001]} />
          <meshBasicMaterial color="black" />
        </mesh>
        {(active || hovered) && (
          <group position={[0, 0.2, 0.045]}>
            <RoundedBox args={[0.55, 0.15, 0.01]} radius={0.02}>
               <meshBasicMaterial color="rgba(255, 255, 255, 0.9)" transparent opacity={0.9} />
            </RoundedBox>
             <mesh position={[-0.2, 0, 0.01]}>
                <circleGeometry args={[0.04, 16]} />
                <meshBasicMaterial color="#22c55e" />
             </mesh>
             <mesh position={[0.05, 0.02, 0.01]}>
                <planeGeometry args={[0.3, 0.015]} />
                <meshBasicMaterial color="#333" />
             </mesh>
             <mesh position={[0.05, -0.02, 0.01]}>
                <planeGeometry args={[0.2, 0.015]} />
                <meshBasicMaterial color="#999" />
             </mesh>
          </group>
        )}
         <mesh position={[0, -0.65, 0.042]}>
            <boxGeometry args={[0.25, 0.01, 0.001]} />
            <meshBasicMaterial color="white" transparent opacity={0.5} />
         </mesh>
      </group>
      <group rotation={[0, Math.PI, 0]}>
         <mesh position={[0, 0, 0.041]}>
             <planeGeometry args={[0.65, 1.4]} />
             <meshStandardMaterial color={backColor} roughness={0.6} metalness={0.2} />
         </mesh>
         <RoundedBox args={[0.3, 0.3, 0.02]} radius={0.05} position={[0.15, 0.5, 0.05]}>
            <meshPhysicalMaterial color={backColor} roughness={0.4} metalness={0.3} clearcoat={0.5} />
         </RoundedBox>
         <group position={[0.15, 0.5, 0.06]}>
            <mesh position={[-0.08, 0.08, 0]} rotation={[Math.PI/2, 0, 0]}>
               <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
               <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[-0.08, -0.08, 0]} rotation={[Math.PI/2, 0, 0]}>
               <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
               <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
            </mesh>
             <mesh position={[0.08, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
               <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
               <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
            </mesh>
         </group>
         <mesh position={[0, 0.1, 0.042]}>
            <circleGeometry args={[0.06, 32]} />
            <meshStandardMaterial color="#555" roughness={0.3} metalness={0.8} />
         </mesh>
      </group>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text 
            position={[0, 1.1, 0]} 
            fontSize={0.15} 
            color="white" 
            anchorX="center" 
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000"
            // Removed external font
          >
            {label}
          </Text>
      </Float>
    </group>
  );
};