import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { CameraControls, Environment, Sparkles, MeshReflectorMaterial } from '@react-three/drei';
import { Laptop, Brain, Smartphone, TechOrbit, ResumePaper, CoffeeMug } from './SceneElements';
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
}

const Experience: React.FC<ExperienceProps> = ({ activeSection, setActiveSection, labels }) => {
  const controlsRef = useRef<CameraControls>(null);
  const { camera } = useThree();
  
  // State to coordinate Laptop hover with TechOrbit
  const [isLaptopHovered, setIsLaptopHovered] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);

  // STRATEGY 5: CINEMATIC INTRO
  useEffect(() => {
    if (controlsRef.current && !introFinished) {
      // Start from a distant cinematic angle
      controlsRef.current.setPosition(0, 20, 25, false); 
      
      // Zoom into the "Home" position smoothly
      const homePos = CAMERA_POSITIONS.home.position;
      controlsRef.current.setLookAt(
        homePos[0], homePos[1], homePos[2], 
        0, 0, 0, 
        true // animate
      ).then(() => {
         setIntroFinished(true);
      });
    }
  }, [introFinished]);

  // Handle Camera Movement based on Section (only after intro)
  useEffect(() => {
    if (controlsRef.current && introFinished) {
      const targetConfig = CAMERA_POSITIONS[activeSection];
      
      controlsRef.current.setLookAt(
        targetConfig.position[0],
        targetConfig.position[1],
        targetConfig.position[2],
        targetConfig.target[0],
        targetConfig.target[1],
        targetConfig.target[2],
        true // animated
      );
    }
  }, [activeSection, introFinished]);

  return (
    <>
      {/* Environment & Background */}
      <color attach="background" args={['#101010']} />
      <Environment preset="city" />
      
      {/* Atmospheric Particles */}
      <Sparkles 
        count={150} 
        scale={12} 
        size={2} 
        speed={0.4} 
        opacity={0.5} 
        color="#4fa1f7"
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <spotLight 
        position={[10, 10, 10]} 
        angle={0.15} 
        penumbra={1} 
        intensity={1.5} 
        castShadow 
      />
      {/* Blue Rim Light for cyberpunk feel */}
      <pointLight position={[-10, 5, -10]} intensity={5} color="#3b82f6" distance={20} />
      {/* Pink Rim Light */}
      <pointLight position={[10, 5, -10]} intensity={5} color="#db2777" distance={20} />
      
      {/* Controls */}
      <CameraControls ref={controlsRef} maxPolarAngle={Math.PI / 2} minDistance={2} maxDistance={30} makeDefault />

      {/* Floating Desk Platform with Reflection */}
      <group position={[0, -0.5, 0]}>
         {/* Reflective Floor - Optimized Resolution */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={512} // Reduced from 1024 for stability
            mixBlur={1}
            mixStrength={40}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#151515"
            metalness={0.5}
            mirror={0.5}
          />
        </mesh>
      </group>

      {/* Interactive Elements */}
      {/* TechOrbit reacts to both Active State and Hover State */}
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
      />

      <Smartphone 
        active={activeSection === 'contact'} 
        onClick={() => setActiveSection('contact')} 
        label={labels.contact}
      />

      {/* New Strategic Elements */}
      <ResumePaper />
      <CoffeeMug />

    </>
  );
};

export default Experience;