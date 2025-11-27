
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import { Mesh, Group, Vector3, Color, ShaderMaterial, DoubleSide, AdditiveBlending, BackSide, FrontSide, SkinnedMesh } from 'three';
import { Text, Float, MeshTransmissionMaterial, RoundedBox, Billboard, Sparkles, useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, RapierRigidBody, CylinderCollider } from '@react-three/rapier';
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

// --- CINEMATIC HOLOGRAM SHADER (HIGH REALISM: Chromatic Aberration + Volumetric Noise) ---
const hologramVertexShader = `
  uniform float uTime;
  uniform float uGlitchStrength;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vGlitch;

  // 3D Simplex Noise (Approximation) for vertex displacement
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;

    // --- GLITCH DISPLACEMENT ---
    float drift = sin(pos.y * 10.0 + uTime * 2.0) * 0.005;
    
    // Random Glitch triggers
    vGlitch = 0.0;
    if(uGlitchStrength > 0.05) {
        float glitchNoise = snoise(vec3(0.0, pos.y * 5.0, uTime * 20.0));
        if(glitchNoise > (1.0 - uGlitchStrength)) {
            vGlitch = 1.0;
            pos.x += (snoise(vec3(uTime * 50.0, pos.y, 0.0))) * 0.1 * uGlitchStrength;
            pos.z += (snoise(vec3(uTime * 40.0, pos.y, 1.0))) * 0.1 * uGlitchStrength;
        }
    }

    // Subtle breathing drift
    pos += normal * snoise(vec3(pos * 0.5 + uTime * 0.2)) * 0.005;

    // Calculate world position
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const hologramFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vGlitch;

  // Simple pseudo-random
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // --- HOLOGRAPHIC PATTERN FUNCTION ---
  // Returns intensity at a specific spatial coordinate
  float getHoloPattern(vec3 pos, float timeOffset) {
      // Moving Scanlines
      float scanline = sin(pos.y * 80.0 - (uTime + timeOffset) * 10.0) * 0.5 + 0.5;
      
      // Interference wave
      float interference = sin(pos.y * 2.0 + pos.x * 5.0 + uTime * 3.0);
      
      // Digital noise grain
      float noise = random(vec2(pos.x, pos.y) * 10.0 + uTime);
      
      // Combine
      float pattern = 0.0;
      pattern += pow(scanline, 4.0) * 0.6; // Sharp thin lines
      pattern += smoothstep(0.8, 1.0, sin(pos.y * 5.0 + uTime)) * 0.3; // Broad pulses
      pattern += noise * 0.1; // Grain
      
      return pattern;
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 normal = normalize(vNormal);
    
    // 1. FRESNEL (RIM LIGHT) - The core of the volumetric look
    // Higher power = thinner edges
    float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.0);
    
    // 2. CHROMATIC ABERRATION (RGB SPLIT)
    // Sample the pattern at slightly different offsets for R, G, B
    float patternR = getHoloPattern(vPosition, 0.0);
    float patternG = getHoloPattern(vPosition, 0.02); // Slight time delay
    float patternB = getHoloPattern(vPosition, 0.04);
    
    vec3 holoColor;
    holoColor.r = uColor.r * patternR + fresnel * uColor.r;
    holoColor.g = uColor.g * patternG + fresnel * uColor.g;
    holoColor.b = uColor.b * patternB + fresnel * uColor.b;
    
    // Boost brightness at edges (Fresnel)
    holoColor += vec3(1.0) * fresnel * 0.8;

    // 3. VERTICAL FADE
    // Fade out at the very bottom and top for a projection look
    float verticalFade = smoothstep(-1.0, -0.5, vPosition.y) * smoothstep(2.5, 1.5, vPosition.y);
    
    // 4. GLITCH OVERLAY
    if (vGlitch > 0.5) {
        holoColor = vec3(1.0); // Pure white on glitch
        verticalFade = 1.0;
    }

    // 5. FINAL ALPHA
    // Center is more transparent than edges
    float alpha = (fresnel + (patternR + patternG + patternB) * 0.3) * verticalFade * uOpacity;
    
    // Enhance core visibility slightly
    alpha = clamp(alpha, 0.1, 0.9);

    gl_FragColor = vec4(holoColor, alpha);
  }
`;

// --- BEAM SHADER ---
const beamVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    float opacity = (1.0 - vUv.y); 
    opacity = pow(opacity, 1.5);
    float noise = fract(sin(dot(vUv + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453);
    opacity *= (0.8 + noise * 0.2);
    gl_FragColor = vec4(uColor, opacity * 0.15); 
  }
`;

// Use jsDelivr CDN for better reliability and CORS handling than raw.githubusercontent
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

export const HoloProjector: React.FC<{ aiState: 'idle' | 'thinking' }> = ({ aiState }) => {
  const groupRef = useRef<Group>(null);
  const ringRef1 = useRef<Mesh>(null);
  const ringRef2 = useRef<Mesh>(null);
  
  // LOAD EXTERNAL GLTF MODEL - Enable Draco via drei's built-in handling
  const { scene, animations } = useGLTF(MODEL_URL, true);
  
  // Clone the scene to avoid modifying the cached asset, ensuring safety across re-mounts
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const { actions } = useAnimations(animations, groupRef);

  // 1. Hologram Material (Advanced Shader)
  const shaderMat = useMemo(() => {
    const cyanColor = new Color("#00ffff");
    return new ShaderMaterial({
      vertexShader: hologramVertexShader,
      fragmentShader: hologramFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: cyanColor.clone() }, // Clone to avoid reference issues
        uGlitchStrength: { value: 0.1 },
        uOpacity: { value: 0.8 }
      },
      transparent: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      depthWrite: false,
      wireframe: false
    });
  }, []);

  // 2. Apply Shader to Model & Handle Animations
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as SkinnedMesh;
        mesh.material = shaderMat;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });

    const actionName = aiState === 'thinking' ? 'Dance' : 'Idle';
    const currentAction = actions[actionName];
    if (currentAction) {
        currentAction.reset().fadeIn(0.5).play();
    }

    return () => {
        currentAction?.fadeOut(0.5);
    }
  }, [clonedScene, actions, shaderMat, aiState]);

  // 3. Beam Material
  const beamMat = useMemo(() => new ShaderMaterial({
    vertexShader: beamVertexShader,
    fragmentShader: beamFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color("#00ffff") },
    },
    transparent: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    depthWrite: false,
  }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    shaderMat.uniforms.uTime.value = t;
    beamMat.uniforms.uTime.value = t;
    
    // REACTIVE AI STATE LOGIC
    if (aiState === 'thinking') {
         // HEAVY GLITCH MODE
         shaderMat.uniforms.uGlitchStrength.value = 0.8; 
         shaderMat.uniforms.uColor.value.lerp(new Color("#ec4899"), 0.1);
         beamMat.uniforms.uColor.value.lerp(new Color("#ec4899"), 0.1);
         
         if (ringRef1.current) ringRef1.current.rotation.z += 0.15;
         if (ringRef2.current) ringRef2.current.rotation.z -= 0.10;
    } else {
         // IDLE MODE - Ensure color stays cyan, don't lerp if already correct
         const targetColor = new Color("#00ffff");
         const currentColor = shaderMat.uniforms.uColor.value;
         // Only lerp if color is significantly different (to avoid yellow tint)
         if (currentColor.getHex() !== targetColor.getHex()) {
           shaderMat.uniforms.uColor.value.lerp(targetColor, 0.1);
         } else {
           // Ensure it stays cyan
           shaderMat.uniforms.uColor.value.copy(targetColor);
         }
         beamMat.uniforms.uColor.value.lerp(targetColor, 0.1);

         if (Math.random() > 0.995) {
             shaderMat.uniforms.uGlitchStrength.value = 0.5;
         } else {
             shaderMat.uniforms.uGlitchStrength.value = 0.0;
         }
         
         if (ringRef1.current) ringRef1.current.rotation.z = t * 0.2;
         if (ringRef2.current) ringRef2.current.rotation.z = -t * 0.15;
    }
    
    if (ringRef1.current) ringRef1.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    if (ringRef2.current) ringRef2.current.rotation.y = Math.cos(t * 0.3) * 0.1;
  });

  const holoColor = "#00ffff"; 

  return (
    <group position={[0, -0.8, -5.0]} scale={1.4}> 
      
      {/* --- BASE --- */}
      <mesh receiveShadow position={[0, 0.1, 0]}>
         <cylinderGeometry args={[0.9, 1.1, 0.2, 8]} />
         <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
         <cylinderGeometry args={[0.75, 0.75, 0.05, 32]} />
         <meshBasicMaterial color={holoColor} toneMapped={false} />
      </mesh>

      {/* --- PROJECTION BEAM --- */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.8, 0.7, 3.0, 32, 1, true]} />
        <primitive object={beamMat} attach="material" />
      </mesh>

      {/* --- DATA RINGS --- */}
      <mesh ref={ringRef1} position={[0, 1.5, 0]} rotation={[Math.PI/2, 0, 0]}>
         <torusGeometry args={[1.5, 0.005, 16, 100]} />
         <meshBasicMaterial color={holoColor} transparent opacity={0.3} blending={AdditiveBlending} />
      </mesh>
      <mesh ref={ringRef2} position={[0, 1.2, 0]} rotation={[Math.PI/2.2, 0, 0]}>
         <torusGeometry args={[1.2, 0.008, 16, 100]} />
         <meshBasicMaterial color="#ec4899" transparent opacity={0.2} blending={AdditiveBlending} />
      </mesh>

      {/* --- PARTICLES --- */}
      <Sparkles position={[0, 1.5, 0]} scale={[1, 3, 1]} count={60} speed={1.5} color={holoColor} size={6} opacity={0.8} noise={0.5} />

      {/* --- 3D MODEL AVATAR (Loaded GLB) --- */}
      <group ref={groupRef} position={[0, 0.2, 0]} scale={0.4}>
         <primitive object={clonedScene} />
      </group>

    </group>
  );
};

// Preload the model - Added 'true' to match hook usage and support Draco
useGLTF.preload(MODEL_URL, true);

export const ResumePaper: React.FC = () => {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<Group>(null);
  useHoverDispatcher(hovered);

  const handleDownload = (e: any) => {
    e.stopPropagation();
    playClickSound();
    alert("Downloading Resume.pdf...");
  };

  useFrame((state) => {
    if (groupRef.current) {
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
      onPointerOver={() => { setHover(true); playHoverSound(); }}
      onPointerOut={() => setHover(false)}
    >
      <mesh>
        <boxGeometry args={[0.6, 0.01, 0.85]} />
        <meshStandardMaterial color={hovered ? "#ffffff" : "#f3f4f6"} />
      </mesh>
      
      <Text position={[0, 0.011, -0.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.08} color="#000">RESUME</Text>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
         <planeGeometry args={[0.4, 0.4]} />
         <meshBasicMaterial color="#ccc" />
      </mesh>
      
      {hovered && (
         <Text position={[0, 0.2, 0]} fontSize={0.08} color="#3b82f6" outlineWidth={0.005} outlineColor="#fff">Click to Download</Text>
      )}
    </group>
  );
};

const SparkleSteam = () => (
    <group position={[0, 0.25, 0]}>
        <Sparkles count={10} scale={[0.1, 0.3, 0.1]} size={3} speed={0.8} opacity={0.4} color="#aaa" noise={0.5} />
    </group>
)

export const CoffeeMug: React.FC = () => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [hovered, setHover] = useState(false);
  
  useHoverDispatcher(hovered);

  const push = () => {
    playClickSound();
    if (rigidBodyRef.current) {
        // Apply a random impulse to the physics body
        const xImpulse = (Math.random() - 0.5) * 0.02;
        const zImpulse = (Math.random() - 0.5) * 0.02;
        rigidBodyRef.current.applyImpulse({ x: xImpulse, y: 0.02, z: zImpulse }, true);
        rigidBodyRef.current.applyTorqueImpulse({ x: 0.001, y: 0.001, z: 0.001 }, true);
    }
  };

  return (
    <RigidBody 
        ref={rigidBodyRef} 
        position={[-1.2, 0.5, 0.8]} 
        colliders="hull" 
        restitution={0.2} 
        friction={0.8}
    >
        <group
          onClick={(e) => { e.stopPropagation(); push(); }}
          onPointerOver={() => { setHover(true); playHoverSound(); }}
          onPointerOut={() => setHover(false)}
        >
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.12, 0.1, 0.3, 32]} />
            <meshStandardMaterial color="#1f2937" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.28, 0]} rotation={[-Math.PI/2, 0, 0]}>
             <circleGeometry args={[0.1]} />
             <meshStandardMaterial color="#3c2f2f" roughness={0.2} />
          </mesh>
          <mesh position={[0.12, 0.15, 0]} rotation={[0, 0, -Math.PI/2]}>
            <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <SparkleSteam />
        </group>
    </RigidBody>
  );
};

interface TechOrbitProps {
  active: boolean;
  hovered: boolean;
}

const TechItem = ({ index, total, tech, active, parentHovered }: any) => {
  const ref = useRef<Group>(null);
  
  // OPTIMIZATION: Use useMemo to prevent creating new Vector3 on every render
  const vec = useMemo(() => new Vector3(), []);

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
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.12, 32, 32]} />
            <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.01, 16, 32]} />
            <meshBasicMaterial color={tech.color} toneMapped={false} />
          </mesh>
          <Text position={[0, -0.1, 0]} fontSize={0.15} color={tech.color} anchorX="center" anchorY="top" outlineWidth={0.005} outlineColor="black">
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
        <RoundedBox args={[1.5, 0.06, 1]} radius={0.01} smoothness={4}><meshStandardMaterial color={chassisColor} roughness={0.4} metalness={0.8} /></RoundedBox>
        <mesh position={[0, 0.031, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.32]} />
          <meshPhysicalMaterial color="#334155" roughness={0.2} metalness={0.5} clearcoat={0.5} />
        </mesh>
        <mesh position={[0, 0.031, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.3, 0.45]} />
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
        <RoundedBox args={[1.5, 1.0, 0.04]} radius={0.01} smoothness={4} position={[0, 0.5, 0]}>
          <meshStandardMaterial color={chassisColor} roughness={0.4} metalness={0.8} />
        </RoundedBox>
        <mesh position={[0, 0.5, 0.021]}>
          <planeGeometry args={[1.46, 0.96]} />
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
      <Float speed={4} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[0.7, 0]} />
          <MeshTransmissionMaterial backside samples={4} thickness={0.5} chromaticAberration={0.5} anisotropy={0.5} distortion={0.5} distortionScale={0.5} temporalDistortion={0.1} iridescence={1} iridescenceIOR={1} iridescenceThicknessRange={[0, 1400]} color={active ? "#f472b6" : "#e2e8f0"} />
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
