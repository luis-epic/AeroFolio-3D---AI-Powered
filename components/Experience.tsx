
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Group,
  Vector3,
} from 'three';
import { CameraControls, Environment, Lightformer, ContactShadows, BakeShadows, Preload, AdaptiveEvents, TransformControls } from '@react-three/drei';
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
  useAllRoomGlbs,
} from './GlbRoomElements';
import { CAMERA_POSITIONS } from '../constants';
import { Section } from '../types';
import type {
  RoomItemId,
  RoomItemTransform,
  RoomLayoutState,
  TransformGizmoMode,
} from '../utils/roomLayoutStore';
import type {
  CameraBridge,
  CameraPose,
  CameraStudioConfig,
} from '../utils/cameraTourStore';

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
  volume: number;
  onSoundEnd: () => void;
  onVideoEnded: () => void;
  roomLayout: RoomLayoutState;
  layoutEditMode: boolean;
  selectedRoomItem: RoomItemId;
  onSelectRoomItem: (id: RoomItemId) => void;
  gizmoMode: TransformGizmoMode;
  snapEnabled: boolean;
  onUpdateRoomItem: (id: RoomItemId, next: RoomItemTransform) => void;
  cameraConfig: CameraStudioConfig;
  cameraBridgeRef: React.MutableRefObject<CameraBridge | null>;
  tourActive: boolean;
  tourPlaying: boolean;
  tourStopIndex: number;
  onTourStopChange: (index: number) => void;
  onTourPlayingChange: (playing: boolean) => void;
  appReady: boolean;
  onMounted?: () => void;
  onHoloMediaReady?: () => void;
}

// Pre-allocated math helpers for zero-GC camera tour & pose capture
const _camPosTmp = new Vector3();
const _camTargetTmp = new Vector3();
const _tourStartPos = new Vector3();
const _tourStartTarget = new Vector3();
const _tourGoalPos = new Vector3();
const _tourGoalTarget = new Vector3();
const _tourLerpPos = new Vector3();
const _tourLerpTarget = new Vector3();
const _orbitOffset = new Vector3();

const round2 = (n: number) => Math.round(n * 100) / 100;
const smootherstep = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
};

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
  home: { dy: 0.45, dz: 3.2, targetDy: 1.3 },
  projects: { dy: 0.45, dz: 2.8, targetDy: 0.1 }, // laptop is wide; needs pullback
  about: { dy: 0.1, dz: 2.2, targetDy: 0.15 },
  library: { dy: 0.3, dz: 2.4, targetDy: 0.1 },
  contact: { dy: 0.1, dz: 2.2, targetDy: 0.15 },
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

  // On portrait screens, center the presentation hologram cleanly below the top hero overlay
  if (section === 'home') {
    return {
      position: [0, 4.85, 3.6] as [number, number, number],
      target: [0.09, 6.45, -10.32] as [number, number, number],
    };
  }

  const { dy, dz, targetDy } = MOBILE_ADJUSTMENTS[section];
  return {
    position: [base.position[0], base.position[1] + dy, base.position[2] + dz] as [number, number, number],
    target: [target[0], target[1] + targetDy, target[2]] as [number, number, number],
  };
};

const Experience: React.FC<ExperienceProps> = ({
  activeSection,
  setActiveSection,
  labels,
  videoPaused,
  soundOn,
  volume,
  onSoundEnd,
  onVideoEnded,
  roomLayout,
  layoutEditMode,
  selectedRoomItem,
  onSelectRoomItem,
  gizmoMode,
  snapEnabled,
  onUpdateRoomItem,
  cameraConfig,
  cameraBridgeRef,
  tourActive,
  tourPlaying,
  tourStopIndex,
  onTourStopChange,
  onTourPlayingChange,
  appReady,
  onMounted,
  onHoloMediaReady,
}) => {
  const controlsRef = useRef<CameraControls>(null);
  // IMPORTANT: use `size` (canvas pixels), NOT `viewport` (three.js world units).
  // `viewport.width` scales with camera distance, so deriving `isMobile` from it
  // created a feedback loop: moving the camera changed `viewport.width`, which
  // flipped `isMobile`, which re-ran the camera effect and pushed the camera
  // further away until the scene left the frustum entirely (blank canvas on
  // phones). `size.width` only changes on an actual resize.
  const screenWidth = useThree((state) => state.size.width);
  const isMobile = screenWidth < 768; // Responsive breakpoint (CSS pixels)
  
  // Preload all 4 studio GLB models together inside Scene's <Suspense> boundary
  // so old procedural fallbacks never flash on startup and every model appears at once.
  const {
    libraryLoaded: glbLibraryLoaded,
    projectorLoaded: glbProjectorLoaded,
    laptopLoaded: glbLaptopLoaded,
    phoneLoaded: glbPhoneLoaded,
  } = useAllRoomGlbs();

  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  // State to coordinate Laptop hover with TechOrbit
  const [isLaptopHovered, setIsLaptopHovered] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);

  const itemRefs = useRef<Partial<Record<RoomItemId, Group | null>>>({});
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const prevEditModeRef = useRef(false);

  const registerItemRef = useCallback(
    (id: RoomItemId) => (node: Group | null) => {
      itemRefs.current[id] = node;
      if (id === selectedRoomItem) {
        setSelectedGroup(node);
      }
    },
    [selectedRoomItem]
  );

  useEffect(() => {
    setSelectedGroup(itemRefs.current[selectedRoomItem] ?? null);
  }, [
    selectedRoomItem,
    layoutEditMode,
    glbLibraryLoaded,
    glbProjectorLoaded,
    glbLaptopLoaded,
    glbPhoneLoaded,
  ]);

  const commitSelectedTransform = useCallback(() => {
    const group = itemRefs.current[selectedRoomItem];
    if (!group) return;
    const round2 = (v: number) => Math.round(v * 100) / 100;
    onUpdateRoomItem(selectedRoomItem, {
      position: [round2(group.position.x), round2(group.position.y), round2(group.position.z)],
      rotation: [round2(group.rotation.x), round2(group.rotation.y), round2(group.rotation.z)],
      scale: round2(group.scale.x),
    });
  }, [selectedRoomItem, onUpdateRoomItem]);

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

  // Expose live CameraControls pose capture + preview to HUD
  useEffect(() => {
    cameraBridgeRef.current = {
      getCurrentPose: (): CameraPose | null => {
        const ctrl = controlsRef.current;
        if (!ctrl) return null;
        ctrl.getPosition(_camPosTmp);
        ctrl.getTarget(_camTargetTmp);
        return {
          position: [round2(_camPosTmp.x), round2(_camPosTmp.y), round2(_camPosTmp.z)],
          target: [round2(_camTargetTmp.x), round2(_camTargetTmp.y), round2(_camTargetTmp.z)],
        };
      },
      flyToPose: (pose: CameraPose, animate = true) => {
        const ctrl = controlsRef.current;
        if (!ctrl) return;
        ctrl.setLookAt(
          pose.position[0],
          pose.position[1],
          pose.position[2],
          pose.target[0],
          pose.target[1],
          pose.target[2],
          animate
        );
      },
    };
    return () => {
      cameraBridgeRef.current = null;
    };
  }, [cameraBridgeRef]);

  // Pause automated tour immediately when user drags/zooms manually
  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const handleControlStart = () => {
      if (tourPlaying) {
        onTourPlayingChange(false);
      }
    };
    ctrl.addEventListener('controlstart', handleControlStart);
    return () => {
      ctrl.removeEventListener('controlstart', handleControlStart);
    };
  }, [tourPlaying, onTourPlayingChange]);

  // Listen for camera reset custom events (specifically useful on mobile)
  useEffect(() => {
    const handleReset = () => {
      if (controlsRef.current) {
        const customHome = cameraConfig.sections.home;
        if (customHome) {
          controlsRef.current.setLookAt(
            customHome.position[0],
            customHome.position[1],
            customHome.position[2],
            customHome.target[0],
            customHome.target[1],
            customHome.target[2],
            true
          );
          return;
        }
        const homePose = getCameraConfig('home', isMobile);
        controlsRef.current.setLookAt(
          homePose.position[0], homePose.position[1], homePose.position[2],
          homePose.target[0], homePose.target[1], homePose.target[2],
          true // animate
        );
      }
    };

    window.addEventListener('reset-camera', handleReset);
    return () => window.removeEventListener('reset-camera', handleReset);
  }, [isMobile, cameraConfig.sections.home]);

  // STRATEGY 5: CINEMATIC INTRO (waits until global loading screen finishes so reveal is synchronized)
  useEffect(() => {
    if (!controlsRef.current || introFinished || tourActive) return;

    // Keep camera poised overhead while assets finish buffering behind the global loader
    controlsRef.current.setPosition(0, 20, 25, false);
    if (!appReady) return;

    // Respect custom captured 'home' framing if saved, otherwise default config
    const customHome = cameraConfig.sections.home;
    const { position, target } = customHome ?? getCameraConfig('home', isMobile);

    controlsRef.current.setLookAt(
      position[0], position[1], position[2],
      target[0], target[1], target[2],
      true // animate
    ).then(() => {
      setIntroFinished(true);
    });
  }, [appReady, introFinished, tourActive, isMobile, cameraConfig.sections.home]);

  // Frame a clear room overview when entering layout edit mode (unless user is actively touring)
  useEffect(() => {
    if (!controlsRef.current || !introFinished) return;
    const wasEdit = prevEditModeRef.current;
    prevEditModeRef.current = layoutEditMode;
    if (layoutEditMode && !wasEdit && !tourActive) {
      controlsRef.current.setLookAt(
        0,
        isMobile ? 6.4 : 5.4,
        isMobile ? 13.5 : 11.2,
        0,
        1.1,
        -0.6,
        true
      );
    }
  }, [layoutEditMode, introFinished, isMobile, tourActive]);

  // Handle Camera Movement based on Section (only after intro and outside edit/tour modes)
  useEffect(() => {
    if (controlsRef.current && introFinished && !layoutEditMode && !tourActive) {
      const customSectionPose = cameraConfig.sections[activeSection];
      const baseConfig = customSectionPose
        ? customSectionPose
        : activeSection === 'library' && glbLibraryLoaded
          ? {
              position: isMobile ? ([0, 5.1, 11.4] as [number, number, number]) : ([0, 4.3, 9.6] as [number, number, number]),
              target: [0, 2.4, -1.8] as [number, number, number],
            }
          : getCameraConfig(activeSection, isMobile);

      controlsRef.current.setLookAt(
        baseConfig.position[0], baseConfig.position[1], baseConfig.position[2],
        baseConfig.target[0], baseConfig.target[1], baseConfig.target[2],
        true // animated
      );
    }
  }, [activeSection, introFinished, isMobile, glbLibraryLoaded, layoutEditMode, tourActive, cameraConfig.sections]);

  // --- CINEMATIC TOUR SEQUENCER ---
  const tourRuntimeRef = useRef<{
    stopIdx: number;
    phase: 'fly' | 'hold';
    elapsed: number;
    initialized: boolean;
  }>({ stopIdx: -1, phase: 'fly', elapsed: 0, initialized: false });

  // Reset flight origin whenever tour starts or user selects another stop manually
  useEffect(() => {
    if (!tourPlaying || cameraConfig.tourStops.length === 0) {
      tourRuntimeRef.current.initialized = false;
      return;
    }
    const ctrl = controlsRef.current;
    const stops = cameraConfig.tourStops;
    const clampedIdx = ((tourStopIndex % stops.length) + stops.length) % stops.length;
    if (tourRuntimeRef.current.initialized && tourRuntimeRef.current.stopIdx === clampedIdx) {
      return;
    }
    if (ctrl) {
      ctrl.getPosition(_tourStartPos);
      ctrl.getTarget(_tourStartTarget);
    } else {
      _tourStartPos.set(...stops[clampedIdx].position);
      _tourStartTarget.set(...stops[clampedIdx].target);
    }
    const targetStop = stops[clampedIdx];
    _tourGoalPos.set(...targetStop.position);
    _tourGoalTarget.set(...targetStop.target);
    tourRuntimeRef.current = {
      stopIdx: clampedIdx,
      phase: 'fly',
      elapsed: 0,
      initialized: true,
    };
  }, [tourPlaying, tourStopIndex, cameraConfig.tourStops]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (!tourPlaying || !controlsRef.current) return;
    const stops = cameraConfig.tourStops;
    if (stops.length === 0) return;

    const rt = tourRuntimeRef.current;
    if (!rt.initialized) return;

    rt.elapsed += dt;

    const stop = stops[rt.stopIdx] ?? stops[0];

    if (rt.phase === 'fly') {
      const dur = Math.max(0.25, stop.duration);
      const u = smootherstep(rt.elapsed / dur);
      _tourLerpPos.lerpVectors(_tourStartPos, _tourGoalPos, u);
      _tourLerpTarget.lerpVectors(_tourStartTarget, _tourGoalTarget, u);
      controlsRef.current.setLookAt(
        _tourLerpPos.x,
        _tourLerpPos.y,
        _tourLerpPos.z,
        _tourLerpTarget.x,
        _tourLerpTarget.y,
        _tourLerpTarget.z,
        false
      );

      if (rt.elapsed >= dur) {
        rt.phase = 'hold';
        rt.elapsed = 0;
      }
      return;
    }

    // Hold phase with optional gentle orbital drift around stop target
    const holdDur = Math.max(0, stop.hold);
    if (stop.orbitSpeed !== 0) {
      const angleRad = ((stop.orbitSpeed * Math.PI) / 180) * rt.elapsed;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const dx = stop.position[0] - stop.target[0];
      const dz = stop.position[2] - stop.target[2];
      _orbitOffset.set(
        stop.target[0] + dx * cosA - dz * sinA,
        stop.position[1],
        stop.target[2] + dx * sinA + dz * cosA
      );
      controlsRef.current.setLookAt(
        _orbitOffset.x,
        _orbitOffset.y,
        _orbitOffset.z,
        stop.target[0],
        stop.target[1],
        stop.target[2],
        false
      );
    }

    if (rt.elapsed >= holdDur) {
      const isLast = rt.stopIdx >= stops.length - 1;
      if (isLast && !cameraConfig.tourLoop) {
        onTourPlayingChange(false);
        return;
      }
      const nextIdx = (rt.stopIdx + 1) % stops.length;
      // Snapshot live drifted pose so the next flight begins with zero jump
      controlsRef.current.getPosition(_tourStartPos);
      controlsRef.current.getTarget(_tourStartTarget);
      const nextStop = stops[nextIdx];
      _tourGoalPos.set(...nextStop.position);
      _tourGoalTarget.set(...nextStop.target);
      rt.stopIdx = nextIdx;
      rt.phase = 'fly';
      rt.elapsed = 0;
      onTourStopChange(nextIdx);
    }
  });

  return (
    <>
      {/* Environment & Atmospheric Background */}
      <color attach="background" args={['#02050d']} />
      
      <fog attach="fog" args={['#030712', 18, 78]} />
      {/* Zero-network procedural studio environment map for crisp cyber reflections */}
      <Environment
        resolution={64}
        frames={1}
        environmentIntensity={0.78}
      >
        <Lightformer form="rect" intensity={2.6} color="#e0f2fe" position={[0, 9, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[16, 8, 1]} />
        <Lightformer form="rect" intensity={1.7} color="#00f0ff" position={[-8, 3.5, -3]} rotation={[0, Math.PI / 3, 0]} scale={[9, 5, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#a855f7" position={[8, 3.5, -3]} rotation={[0, -Math.PI / 3, 0]} scale={[9, 5, 1]} />
      </Environment>
      <StudioEnvironment />
      
      <AdaptiveEvents />
      <BakeShadows />
      <Preload all />
      
      {/* Balanced Cyber Studio Lighting Rig: clear key + sky/slate hemisphere + front & interior fills */}
      <ambientLight intensity={1.35} color="#dbeafe" />
      <hemisphereLight args={['#bae6fd', '#1e293b', 1.05]} />
      
      <spotLight
        position={[8, 16, 11]} 
        angle={0.44} 
        penumbra={1} 
        intensity={2.6}
        color="#f0f9ff"
        castShadow 
        shadow-bias={-0.0001}
      />
      {/* Cyber Rim Lights for edge highlight */}
      <pointLight
        position={[-10, 5.5, -9]}
        intensity={7.0}
        color="#3b82f6"
        distance={24}
      />
      <pointLight
        position={[10, 5.5, -9]}
        intensity={7.0}
        color="#ec4899"
        distance={24}
      />
      {/* Front Architectural Fill for Desk Items, Stairs & Tables */}
      <pointLight
        position={[0, 5.5, 9]}
        intensity={2.4}
        color="#f1f5f9"
        distance={32}
        decay={1.4}
      />
      {glbLibraryLoaded && (
        <pointLight
          position={[0, 6.4, -1.8]}
          intensity={2.8}
          color="#e0f2fe"
          distance={30}
          decay={1.4}
        />
      )}

      {/* Controls */}
      <CameraControls 
        ref={controlsRef} 
        makeDefault 
        enabled={!isDraggingGizmo}
      />

      {layoutEditMode && selectedGroup && (
        <TransformControls
          object={selectedGroup}
          mode={gizmoMode}
          translationSnap={snapEnabled ? 0.25 : undefined}
          rotationSnap={snapEnabled ? Math.PI / 12 : undefined}
          scaleSnap={snapEnabled ? 0.1 : undefined}
          onMouseDown={() => setIsDraggingGizmo(true)}
          onMouseUp={() => {
            setIsDraggingGizmo(false);
            commitSelectedTransform();
          }}
        />
      )}


      {/* Floating Desk Platform */}
      <group position={[0, -0.5, 0]}>
        
        {/* Contact Shadows: frames={1} bakes once instead of running 3 blur passes every frame */}
        <ContactShadows 
            frames={1}
            resolution={128} 
            scale={20} 
            blur={2.2} 
            opacity={0.42} 
            far={10} 
            color="#000000" 
        />

        {/* Illuminated dark cyber-slate floor catching grid & neon reflections */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial
            color="#162033"
            metalness={0.38}
            roughness={0.42}
          />
        </mesh>
      </group>
      
      {/* Background hologram: the presentation video, shown full frame */}
      <group
        ref={registerItemRef('holoVideo')}
        position={roomLayout.holoVideo.position}
        rotation={roomLayout.holoVideo.rotation}
        scale={roomLayout.holoVideo.scale}
      >
        <HoloVideo
          paused={videoPaused}
          soundOn={soundOn}
          volume={volume}
          onSoundEnd={onSoundEnd}
          onEnded={onVideoEnded}
          hideBase={glbProjectorLoaded}
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('holoVideo')}
          onMediaReady={onHoloMediaReady}
        />
      </group>

      {/* GLB Hologram Projector directly under HoloVideo inside the room */}
      <group
        ref={registerItemRef('projector')}
        position={roomLayout.projector.position}
        rotation={roomLayout.projector.rotation}
        scale={roomLayout.projector.scale}
      >
        <GlbHologramProjector
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('projector')}
        />
      </group>

      {/* Interactive Elements */}
      <group
        position={[
          roomLayout.laptop.position[0],
          roomLayout.laptop.position[1] + 0.45,
          roomLayout.laptop.position[2],
        ]}
      >
        <TechOrbit
          active={activeSection === 'projects' && !layoutEditMode}
          hovered={isLaptopHovered}
        />
      </group>

      {/* Center Laptop + Mouse (GLB when loaded, procedural fallback only if load failed) */}
      <group
        ref={registerItemRef('laptop')}
        position={roomLayout.laptop.position}
        rotation={roomLayout.laptop.rotation}
        scale={roomLayout.laptop.scale}
      >
        <GlbLaptopStation
          active={activeSection === 'projects'}
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('laptop')}
          onClick={() => setActiveSection('projects')}
          label={labels.projects}
          onHoverChange={setIsLaptopHovered}
        />
        {!glbLaptopLoaded && (
          <Laptop 
            active={activeSection === 'projects'} 
            editMode={layoutEditMode}
            onSelectInEditMode={() => onSelectRoomItem('laptop')}
            onClick={() => setActiveSection('projects')}
            label={labels.projects}
            onHoverChange={setIsLaptopHovered}
          />
        )}
      </group>

      <group
        ref={registerItemRef('brain')}
        position={roomLayout.brain.position}
        rotation={roomLayout.brain.rotation}
        scale={roomLayout.brain.scale}
      >
        <Brain 
          active={activeSection === 'about'} 
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('brain')}
          onClick={() => setActiveSection('about')} 
          label={labels.about}
          visible={activeSection === 'home' || activeSection === 'about'} 
        />
      </group>

      {/* Contact Smartphone (GLB iPhone 15 Pro when loaded, procedural fallback only if load failed) */}
      <group
        ref={registerItemRef('smartphone')}
        position={roomLayout.smartphone.position}
        rotation={roomLayout.smartphone.rotation}
        scale={roomLayout.smartphone.scale}
      >
        <GlbSmartphoneContact
          active={activeSection === 'contact'}
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('smartphone')}
          onClick={() => setActiveSection('contact')}
          label={labels.contact}
          visible={activeSection === 'home' || activeSection === 'contact'}
        />
        {!glbPhoneLoaded && (
          <Smartphone 
            active={activeSection === 'contact'} 
            editMode={layoutEditMode}
            onSelectInEditMode={() => onSelectRoomItem('smartphone')}
            onClick={() => setActiveSection('contact')} 
            label={labels.contact}
            visible={activeSection === 'home' || activeSection === 'contact'}
          />
        )}
      </group>

      {/* Centered GLB Library Room (houses the interactive desk/prism/projector inside) */}
      <group
        ref={registerItemRef('library')}
        position={roomLayout.library.position}
        rotation={roomLayout.library.rotation}
        scale={roomLayout.library.scale}
      >
        <CenteredGlbLibrary
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('library')}
        />
      </group>

      {/* Fallback Procedural Cyber Library Rack only if GLB library fails to load */}
      {!glbLibraryLoaded && (
        <CyberLibrary
          active={activeSection === 'library'}
          onClick={() => setActiveSection('library')}
          label={labels.library}
          visible={activeSection === 'home' || activeSection === 'library'}
        />
      )}

      <group
        ref={registerItemRef('coffee')}
        position={roomLayout.coffee.position}
        rotation={roomLayout.coffee.rotation}
        scale={roomLayout.coffee.scale}
      >
        <CoffeeMug
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('coffee')}
        />
      </group>
      <group
        ref={registerItemRef('resume')}
        position={roomLayout.resume.position}
        rotation={roomLayout.resume.rotation}
        scale={roomLayout.resume.scale}
      >
        <ResumePaper
          editMode={layoutEditMode}
          onSelectInEditMode={() => onSelectRoomItem('resume')}
        />
      </group>
    </>
  );
};

export default Experience;
