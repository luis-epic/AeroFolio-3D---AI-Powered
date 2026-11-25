
import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { CameraControls, Environment, Lightformer, ContactShadows, BakeShadows, Preload, AdaptiveEvents } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Glitch } from '@react-three/postprocessing';
import CameraControlsImpl from 'camera-controls';
import { Laptop, Brain, Smartphone, TechOrbit, ResumePaper, CoffeeMug } from './SceneElements';
import HoloVideo from './HoloVideo';
import StudioEnvironment from './StudioEnvironment';
import CyberLibrary from './CyberLibrary';
import {
  CenteredGlbLibrary,
  GlbHologramProjector,
  GlbLaptopStation,
  GlbSmartphoneContact,
} from './GlbRoomElements';
import Reveal from './Reveal';
import { CAMERA_POSITIONS } from '../constants';
import { Section } from '../types';

interface ExperienceProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  labels: {
    home: string;
    projects: string;
    about: string;
    library: string;
    contact: string;
  };
  videoPaused: boolean;
  soundOn: boolean;
  onSoundEnd: () => void;
  onVideoEnded: () => void;
}

// Define Glitch parameters using Vector2 to satisfy TypeScript requirements
const GLITCH_DELAY = new Vector2(0, 0);
const GLITCH_DURATION = new Vector2(0.1, 0.2);
const GLITCH_STRENGTH = new Vector2(0.3, 0.5);

/**
 * Mobile camera adjustments per section, in world units.
 *
 * `dz` pulls the camera back because portrait viewports have a much narrower
 * horizontal field of view. `targetDy` raises the look-at point: the base
 * targets sit at the desk plane, but the models occupy roughly y=0..1.5, so
 * without it every object projects above the screen centre and the dark floor
 * eats the bottom half of a tall phone screen.
 */
const MOBILE_ADJUSTMENTS: Record<Section, { dy: number; dz: number; targetDy: number }> = {
  // Aiming higher pushes the desk and the hologram lower in the frame, clear
  // of the hero copy overlaying the top third.
  home: { dy: 0.6, dz: 3.4, targetDy: 2.0 },
  projects: { dy: 0.5, dz: 3.5, targetDy: 0.1 }, // laptop is wide; needs the largest pullback
  about: { dy: 0, dz: 2.5, targetDy: 0.2 },
  library: { dy: 0.2, dz: 2.2, targetDy: 0.2 },
  contact: { dy: 0, dz: 2.5, targetDy: 0.2 },
};

/**
 * Single source of truth for camera placement.
 *
 * Always derived from the base config so offsets can never accumulate across
 * renders or between the intro animation and section transitions.
 */
const getCameraConfig = (section: Section, isMobile: boolean) => {
  const base = CAMERA_POSITIONS[section];
  const target: [number, number, number] = [base.target[0], base.target[1], base.target[2]];

  if (!isMobile) {
    return { position: [base.position[0], base.position[1], base.position[2]] as [number, number, number], target };
  }

  const { dy, dz, targetDy } = MOBILE_ADJUSTMENTS[section];
  return {
    position: [base.position[0], base.position[1] + dy, base.position[2] + dz] as [number, number, number],
    target: [target[0], target[1] + targetDy, target[2]] as [number, number, number],
  };
};

const Experience: React.FC<ExperienceProps> = ({ activeSection, setActiveSection, labels, videoPaused, soundOn, onSoundEnd, onVideoEnded }) => {
  const controlsRef = useRef<CameraControls>(null);
  // IMPORTANT: use `size` (canvas pixels), NOT `viewport` (three.js world units).
  // `viewport.width` scales with camera distance, so deriving `isMobile` from it
  // created a feedback loop: moving the camera changed `viewport.width`, which
  // flipped `isMobile`, which re-ran the camera effect and pushed the camera
  // further away until the scene left the frustum entirely (blank canvas on
  // phones). `size.width` only changes on an actual resize.
  const screenWidth = useThree((state) => state.size.width);
  const isMobile = screenWidth < 768; // Responsive breakpoint (CSS pixels)
  
  // State to coordinate Laptop hover with TechOrbit
  const [isLaptopHovered, setIsLaptopHovered] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [triggerGlitch, setTriggerGlitch] = useState(false);
  const [glbLibraryLoaded, setGlbLibraryLoaded] = useState(false);
  const [glbProjectorLoaded, setGlbProjectorLoaded] = useState(false);
  const [glbLaptopLoaded, setGlbLaptopLoaded] = useState(false);
  const [glbPhoneLoaded, setGlbPhoneLoaded] = useState(false);

  // Set Camera Controls limits via Ref (Props are not strictly typed in some versions of drei/CameraControls)
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.maxPolarAngle = Math.PI / 2;
      controlsRef.current.minDistance = 1.0;
      // Increased maxDistance to allow freedom without clipping
      controlsRef.current.maxDistance = 1000;

      // Explicitly configure touch gestures for responsive mobile interactions
      controlsRef.current.touches.one = CameraControlsImpl.ACTION.TOUCH_ROTATE;
      controlsRef.current.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK;
    }
  }, []);

  // Listen for camera reset custom events (specifically useful on mobile)
  useEffect(() => {
    const handleReset = () => {
      if (controlsRef.current) {
        const homePos = CAMERA_POSITIONS.home.position;
        const homeTarget = CAMERA_POSITIONS.home.target;
        const endPos = isMobile ? [homePos[0], homePos[1] + 1, homePos[2] + 4] : homePos;
        controlsRef.current.setLookAt(
          endPos[0], endPos[1], endPos[2],
          homeTarget[0], homeTarget[1], homeTarget[2],
          true // animate
        );
      }
    };

    window.addEventListener('reset-camera', handleReset);
    return () => window.removeEventListener('reset-camera', handleReset);
  }, [isMobile]);

  // STRATEGY 5: CINEMATIC INTRO
  useEffect(() => {
    if (controlsRef.current && !introFinished) {
      // Start from a distant cinematic angle
      controlsRef.current.setPosition(0, 20, 25, false); 
      
      // Zoom into the "Home" position smoothly. Uses the same helper as section
      // transitions so the intro lands exactly where 'home' expects, with no
      // jump when the section effect takes over.
      const { position, target } = getCameraConfig('home', isMobile);

      controlsRef.current.setLookAt(
        position[0], position[1], position[2],
        target[0], target[1], target[2],
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

      const baseConfig =
        activeSection === 'library' && glbLibraryLoaded
          ? {
              position: isMobile ? ([0, 5.2, 10.2] as [number, number, number]) : ([0, 4.6, 8.2] as [number, number, number]),
              target: [0, 1.2, -1.2] as [number, number, number],
            }
          : getCameraConfig(activeSection, isMobile);

      controlsRef.current.setLookAt(
        baseConfig.position[0], baseConfig.position[1], baseConfig.position[2],
        baseConfig.target[0], baseConfig.target[1], baseConfig.target[2],
        true // animated
      );

      return () => clearTimeout(timer);
    }
  }, [activeSection, introFinished, isMobile, glbLibraryLoaded]);

  return (
    <>
      {/* Environment & Atmospheric Background */}
      <color attach="background" args={['#010307']} />
      
      <fog attach="fog" args={['#020409', 16, 75]} />
      {/* Zero-network procedural studio environment map for crisp metallic reflections without external .hdr fetch */}
      <Environment resolution={128} frames={1} environmentIntensity={0.45}>
        <Lightformer form="rect" intensity={2.2} color="#e0f2fe" position={[0, 8, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#00f0ff" position={[-8, 3, -4]} rotation={[0, Math.PI / 3, 0]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#a855f7" position={[8, 3, -4]} rotation={[0, -Math.PI / 3, 0]} scale={[8, 4, 1]} />
      </Environment>
      <StudioEnvironment />
      
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
      {glbLibraryLoaded && (
        <pointLight position={[0, 6.5, 0]} intensity={2.4} color="#fff7ed" distance={26} />
      )}
      
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


      {/* Floating Desk Platform */}
      <group position={[0, -0.5, 0]}>
        
        {/* Contact Shadows: frames={1} bakes once instead of running 3 blur passes every frame */}
        <ContactShadows 
            frames={1}
            resolution={256} 
            scale={20} 
            blur={2.2} 
            opacity={0.5} 
            far={10} 
            color="#000000" 
        />

        {/* Sleek Dark Brushed-Metal Floor (avoids full second scene render pass per frame) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial
            color="#05070d"
            metalness={0.82}
            roughness={0.28}
          />
        </mesh>
      </group>
      
      {/* Background hologram: the presentation video, shown full frame */}
      <HoloVideo
        paused={videoPaused}
        soundOn={soundOn}
        onSoundEnd={onSoundEnd}
        onEnded={onVideoEnded}
        hideBase={glbProjectorLoaded}
      />

      {/* GLB Hologram Projector directly under HoloVideo inside the room */}
      <GlbHologramProjector onLoadedChange={setGlbProjectorLoaded} />

      {/* Interactive Elements */}
      <TechOrbit 
        active={activeSection === 'projects'} 
        hovered={isLaptopHovered} 
      />

      {/* Center Laptop + Mouse (GLB when imported, procedural fallback otherwise) */}
      <GlbLaptopStation
        active={activeSection === 'projects'}
        onClick={() => setActiveSection('projects')}
        label={labels.projects}
        onHoverChange={setIsLaptopHovered}
        onLoadedChange={setGlbLaptopLoaded}
      />
      {!glbLaptopLoaded && (
        <Reveal delay={0.5} origin={[0, 0.1, 0]}>
          <Laptop 
            active={activeSection === 'projects'} 
            onClick={() => setActiveSection('projects')}
            label={labels.projects}
            onHoverChange={setIsLaptopHovered}
          />
        </Reveal>
      )}

      <Reveal delay={0.75} origin={[-2.5, 0.55, 0.5]}>
        <Brain 
          active={activeSection === 'about'} 
          onClick={() => setActiveSection('about')} 
          label={labels.about}
          visible={activeSection === 'home' || activeSection === 'about'} 
        />
      </Reveal>

      {/* Contact Smartphone (GLB iPhone 15 Pro when imported, procedural fallback otherwise) */}
      <GlbSmartphoneContact
        active={activeSection === 'contact'}
        onClick={() => setActiveSection('contact')}
        label={labels.contact}
        visible={activeSection === 'home' || activeSection === 'contact'}
        onLoadedChange={setGlbPhoneLoaded}
      />
      {!glbPhoneLoaded && (
        <Reveal delay={0.9} origin={[2.5, 0.5, 0.5]}>
          <Smartphone 
            active={activeSection === 'contact'} 
            onClick={() => setActiveSection('contact')} 
            label={labels.contact}
            visible={activeSection === 'home' || activeSection === 'contact'}
          />
        </Reveal>
      )}

      {/* Centered GLB Library Room (houses the interactive desk/prism/projector inside) */}
      <CenteredGlbLibrary
        active={activeSection === 'library'}
        onClick={() => setActiveSection('library')}
        onLoadedChange={setGlbLibraryLoaded}
      />

      {/* Fallback Procedural Cyber Library Rack when GLB library isn't present yet */}
      {!glbLibraryLoaded && (
        <Reveal delay={1.0} origin={[-3.6, 1.4, -1.0]}>
          <CyberLibrary
            active={activeSection === 'library'}
            onClick={() => setActiveSection('library')}
            label={labels.library}
            visible={activeSection === 'home' || activeSection === 'library'}
          />
        </Reveal>
      )}

      <Reveal delay={1.1} origin={[-1.1, 0.4, 1.2]}>
        <CoffeeMug />
      </Reveal>
      <Reveal delay={1.2} origin={[1.1, 0.4, 1.2]}>
        <ResumePaper />
      </Reveal>
    </>
  );
};

export default Experience;
