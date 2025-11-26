
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useThree, ThreeElements } from '@react-three/fiber';
import { Vector2 } from 'three';
import { CameraControls, Environment, MeshReflectorMaterial, ContactShadows, CameraShake } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Glitch } from '@react-three/postprocessing';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Laptop, Brain, Smartphone, TechOrbit, ResumePaper, CoffeeMug, HoloProjector } from './SceneElements';
import { CAMERA_POSITIONS } from '../constants';
import { Section } from '../types';

interface ExperienceProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  labels: {
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
      
      {/* Fog Logic: Pushed 'near' to 500 to prevent mobile black-out. 'far' to 30000. */}
      <fog attach="fog" args={['#050505', 500, 30000]} />
      <Environment preset="city" background={false} />
      
      {/* Lighting Upgrade */}
      {/* Ambient Light set to 2.0 ensures scene is NEVER black, even without point lights */}
      <ambientLight intensity={2.0} />
      
      <spotLight 
        position={[10, 15, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={2} 
        castShadow 
        shadow-bias={-0.0001}
      />
      {/* Rim Lights for Cyberpunk edge highlight */}
      <pointLight position={[-10, 5, -10]} intensity={8} color="#3b82f6" distance={100000} />
      <pointLight position={[10, 5, -10]} intensity={8} color="#db2777" distance={100000} />
      
      {/* Post Processing Effects - Simplified for better performance/visibility */}
      <EffectComposer enableNormalPass={false}>
        {/* Bloom creates the glowing effect on screens and neons */}
        <Bloom 
            luminanceThreshold={1.2} // Only very bright things glow
            mipmapBlur 
            intensity={0.6} 
            radius={0.6}
        />
        {/* Cinematic Glitch Transition */}
        <Glitch 
            delay={GLITCH_DELAY} 
            duration={GLITCH_DURATION} 
            strength={GLITCH_STRENGTH} 
            mode={1} // Constant mode when active
            active={triggerGlitch} 
            ratio={0.85}
        />
        {/* Vignette: Reduced darkness to 0.2 to prevent tunnel vision on mobile */}
        <Vignette eskil={false} offset={0.1} darkness={0.2} />
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

      <Physics gravity={[0, -9.8, 0]}>
          {/* Floating Desk Platform */}
          <group position={[0, -0.5, 0]}>
            
            {/* Contact Shadows: Fake ambient occlusion for grounding objects */}
            <ContactShadows 
                resolution={1024} 
                scale={20} 
                blur={2} 
                opacity={0.5} 
                far={10} 
                color="#000000" 
            />

             {/* Reflective Floor */}
            <RigidBody type="fixed" colliders="cuboid" restitution={0.5} friction={0.5}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                  <planeGeometry args={[50, 50]} />
                  <MeshReflectorMaterial
                    blur={[300, 100]}
                    resolution={512}
                    mixBlur={1}
                    mixStrength={50} // Increased reflection strength
                    roughness={1}
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#101010"
                    metalness={0.6}
                    mirror={0.7}
                  />
                </mesh>
            </RigidBody>
          </group>
          
          {/* DESK SURFACE COLLIDER 
              Explicitly wrapped in RigidBody type="fixed" to ensure physics stability.
              Prevents the Mug from glitching through the "table".
          */}
          <RigidBody type="fixed" position={[0, -0.1, 0]}>
             <CuboidCollider args={[3, 0.1, 1.5]} />
          </RigidBody>
          
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
      </Physics>

    </>
  );
};

export default Experience;
