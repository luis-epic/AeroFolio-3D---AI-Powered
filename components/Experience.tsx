
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useThree, ThreeElements } from '@react-three/fiber';
import { Vector2 } from 'three';
import { CameraControls, Environment, MeshReflectorMaterial, ContactShadows, CameraShake, BakeShadows, Preload, AdaptiveEvents } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Glitch } from '@react-three/postprocessing';
import { Laptop, Brain, Smartphone, TechOrbit, ResumePaper, CoffeeMug, HoloProjector } from './SceneElements';
import { CAMERA_POSITIONS } from '../constants';
import { Section } from '../types';

interface ExperienceProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  labels: {
    home: string;
    projects: string;
    about: string;
    contact: string;
  };
  aiState: 'idle' | 'thinking'; // Received from App
}

// Define Glitch parameters using Vector2 to satisfy TypeScript requirements
const GLITCH_DELAY = new Vector2(0, 0);
const GLITCH_DURATION = new Vector2(0.1, 0.2);
const GLITCH_STRENGTH = new Vector2(0.3, 0.5);

const Experience: React.FC<ExperienceProps> = ({ activeSection, setActiveSection, labels, aiState }) => {
  const controlsRef = useRef<CameraControls>(null);
  const { width } = useThree((state) => state.viewport);
  const isMobile = width < 5; // Responsive breakpoint
  
  // State to coordinate Laptop hover with TechOrbit
  const [isLaptopHovered, setIsLaptopHovered] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [triggerGlitch, setTriggerGlitch] = useState(false);

  // Set Camera Controls limits via Ref (Props are not strictly typed in some versions of drei/CameraControls)
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.maxPolarAngle = Math.PI / 2;
      controlsRef.current.minDistance = 1.0;
      // Increased maxDistance to allow freedom without clipping
      controlsRef.current.maxDistance = 1000;
    }
  }, []);

  // STRATEGY 5: CINEMATIC INTRO
  useEffect(() => {
    if (controlsRef.current && !introFinished) {
      // Start from a distant cinematic angle
      controlsRef.current.setPosition(0, 20, 25, false); 
      
      // Zoom into the "Home" position smoothly
      const homePos = CAMERA_POSITIONS.home.position;
      const homeTarget = CAMERA_POSITIONS.home.target;

      // Adjust intro end position for mobile immediately
      const endPos = isMobile ? [homePos[0], homePos[1] + 1, homePos[2] + 4] : homePos;

      controlsRef.current.setLookAt(
        endPos[0], endPos[1], endPos[2], 
        homeTarget[0], homeTarget[1], homeTarget[2], 
        true // animate
      ).then(() => {
         setIntroFinished(true);
      });
    }
  }, [introFinished, isMobile]);

  // Handle Camera Movement based on Section (only after intro)
  useEffect(() => {
    if (controlsRef.current && introFinished) {
      // Trigger Glitch Effect on section change
      setTriggerGlitch(true);
      const timer = setTimeout(() => setTriggerGlitch(false), 400); // 0.4s glitch duration

      const baseConfig = CAMERA_POSITIONS[activeSection];
      
      // Calculate responsive offsets
      let targetPos = [...baseConfig.position];
      let lookAtTarget = [...baseConfig.target];

      if (isMobile) {
        switch (activeSection) {
            case 'home':
                targetPos[1] += 1.5; // Higher
                targetPos[2] += 5.0; // Further back
                break;
            case 'projects':
                // Laptop is wide, needs significant pullback on narrow screens
                targetPos[1] += 0.5; 
                targetPos[2] += 3.5; // Pull back heavily to fit screen width
                break;
            case 'about':
                // Brain centering
                targetPos[2] += 2.5; 
                break;
            case 'contact':
                // Phone fit
                targetPos[2] += 2.5; 
                break;
        }
      }

      controlsRef.current.setLookAt(
        targetPos[0], targetPos[1], targetPos[2],
        lookAtTarget[0], lookAtTarget[1], lookAtTarget[2],
        true // animated
      );

      return () => clearTimeout(timer);
    }
  }, [activeSection, introFinished, isMobile]);

  return (
    <>
      {/* Environment & Background */}
      <color attach="background" args={['#050505']} /> {/* Darker background for contrast */}
      
      <fog attach="fog" args={['#050505', 5, 25]} />
      <Environment preset="city" background={false} environmentIntensity={0.3} />
      
      <AdaptiveEvents />
      <BakeShadows />
      <Preload all />
      
      {/* Lighting Upgrade */}
      {/* Ambient Light ensures scene is NEVER black, even without point lights */}
      <ambientLight intensity={1.5} />
      
      <spotLight 
        position={[10, 15, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={2} 
        castShadow 
        shadow-bias={-0.0001}
      />
      {/* Rim Lights for Cyberpunk edge highlight */}
      <pointLight position={[-10, 5, -10]} intensity={8} color="#3b82f6" distance={20} />
      <pointLight position={[10, 5, -10]} intensity={8} color="#db2777" distance={20} />
      {/* Front Light for Desk Items - Ensures they are visible from the camera side */}
      <pointLight position={[0, 5, 10]} intensity={1.5} color="#ffffff" distance={30} />
      
      {/* Post Processing Effects - Optimized for performance */}
      <EffectComposer enableNormalPass={false} multisampling={0}>
        {/* Bloom creates the glowing effect on screens and neons */}
        <Bloom 
            luminanceThreshold={1.2} 
            mipmapBlur={true}
            intensity={isMobile ? 0.2 : 0.4} 
            radius={0.4}
        />
        {/* Cinematic Glitch Transition - Only active during state changes */}
        <Glitch 
            delay={GLITCH_DELAY} 
            duration={GLITCH_DURATION} 
            strength={GLITCH_STRENGTH} 
            mode={1} 
            active={triggerGlitch} 
            ratio={0.85}
        />
        <Vignette eskil={false} offset={0.1} darkness={isMobile ? 0.05 : 0.2} />
      </EffectComposer>

      {/* Controls */}
      <CameraControls 
        ref={controlsRef} 
        makeDefault 
      />

      {/* Camera Shake Effect - Triggered on section change */}
      <CameraShake 
        maxYaw={0.05} 
        maxPitch={0.05} 
        maxRoll={0.05} 
        yawFrequency={triggerGlitch ? 2 : 0} 
        pitchFrequency={triggerGlitch ? 2 : 0} 
        rollFrequency={triggerGlitch ? 2 : 0}
        intensity={triggerGlitch ? 1 : 0}
        decay={true}
        decayRate={0.65}
      />

      {/* Floating Desk Platform */}
      <group position={[0, -0.5, 0]}>
        
        {/* Contact Shadows: Lowered resolution to 512 for better performance */}
        <ContactShadows 
            resolution={512} 
            scale={20} 
            blur={2.5} 
            opacity={0.5} 
            far={10} 
            color="#000000" 
        />

          {/* Reflective Floor - Lowered resolution to 256 for performance */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[50, 50]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={256}
            mixBlur={1}
            mixStrength={50} // Increased reflection strength
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#050505"
            metalness={0.6}
            mirror={0.7}
          />
        </mesh>
      </group>
      
      {/* Background Hologram Projector - Now Reactive to AI State */}
      <HoloProjector aiState={aiState} />

      {/* Interactive Elements */}
      <TechOrbit 
        active={activeSection === 'projects'} 
        hovered={isLaptopHovered} 
      />

      <Laptop 
        active={activeSection === 'projects'} 
        onClick={() => setActiveSection('projects')}
        label={labels.projects}
        onHoverChange={setIsLaptopHovered}
      />

      <Brain 
        active={activeSection === 'about'} 
        onClick={() => setActiveSection('about')} 
        label={labels.about}
        visible={activeSection === 'home' || activeSection === 'about'} 
      />

      <Smartphone 
        active={activeSection === 'contact'} 
        onClick={() => setActiveSection('contact')} 
        label={labels.contact}
        visible={activeSection === 'home' || activeSection === 'contact'} 
      />

      <ResumePaper />
      <CoffeeMug />
    </>
  );
};

export default Experience;
