import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { playClickSound, playHoverSound } from '../utils/soundEngine';
import { getPreloadedGlbBuffer } from '../utils/assetPreloader';
import SectionTitle3D from './SectionTitle3D';

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// Dedicated LoadingManager isolated from THREE.DefaultLoadingManager so DRACOLoader.preload()
// and GLTFLoader work never trigger @react-three/drei's useProgress setState during render.
export const glbLoadingManager = new THREE.LoadingManager();

let sharedDracoLoader: DRACOLoader | null = null;
function getSharedDracoLoader(): DRACOLoader {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader(glbLoadingManager);
    sharedDracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    sharedDracoLoader.preload();
  }
  return sharedDracoLoader;
}

export const LIBRARY_FILE = 'library_low_poly.glb';
export const PROJECTOR_FILE = 'hologram_projector_with_hologram.glb';
export const LAPTOP_FILE = 'laptop_and_mouse.glb';
export const IPHONE_FILE = 'iphone_15_pro_max_made_in_blender.glb';

const TARGET_ROOM_SPAN = 22;
const FLOOR_Y = -0.58;

// Pre-allocated colors for zero-GC cyber LED animation inside useFrame
const _ledCyan = new THREE.Color('#00f0ff');
const _ledBlue = new THREE.Color('#3b82f6');
const _ledPink = new THREE.Color('#ec4899');
const _ledViolet = new THREE.Color('#a855f7');
const _ledWorkPrimary = new THREE.Color();
const _ledWorkSecondary = new THREE.Color();

interface CachedGlbEntry {
  status: 'pending' | 'resolved';
  promise: Promise<void>;
  gltf: GLTF | null;
}

const ROOM_GLB_FILES = [LIBRARY_FILE, PROJECTOR_FILE, LAPTOP_FILE, IPHONE_FILE] as const;
const glbCache = new Map<string, CachedGlbEntry>();
const glbListeners = new Set<(loaded: number, total: number) => void>();

export function getGlbLoadProgress(): { loaded: number; total: number } {
  let loaded = 0;
  for (const file of ROOM_GLB_FILES) {
    if (glbCache.get(file)?.status === 'resolved') loaded += 1;
  }
  return { loaded, total: ROOM_GLB_FILES.length };
}

export function subscribeGlbProgress(cb: (loaded: number, total: number) => void): () => void {
  glbListeners.add(cb);
  const current = getGlbLoadProgress();
  cb(current.loaded, current.total);
  return () => {
    glbListeners.delete(cb);
  };
}

function notifyGlbProgress(): void {
  const current = getGlbLoadProgress();
  queueMicrotask(() => {
    glbListeners.forEach((cb) => cb(current.loaded, current.total));
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    parts.push(String.fromCharCode(...slice));
  }
  return btoa(parts.join(''));
}

async function decodeWithDataUriImage(bufferView: ArrayBuffer, mimeType: string): Promise<HTMLImageElement> {
  const base64 = arrayBufferToBase64(bufferView);
  const dataUri = `data:${mimeType};base64,${base64}`;
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to decode embedded ${mimeType} texture`));
    img.src = dataUri;
  });
}

/**
 * Decodes an embedded GLB bufferView image directly in memory without creating
 * blob: object URLs or invoking fetch(blob:...), preventing sandboxed/intercepted
 * fetch failures in GLTFLoader's ImageBitmapLoader.
 */
async function decodeBufferViewToTexture(bufferView: ArrayBuffer, mimeType: string): Promise<THREE.Texture> {
  const blob = new Blob([bufferView], { type: mimeType });
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      });
      const texture = new THREE.Texture(bitmap);
      texture.needsUpdate = true;
      return texture;
    } catch {
      // Fall through to HTMLImageElement data-URI decoding
    }
  }
  const img = await decodeWithDataUriImage(bufferView, mimeType);
  const texture = new THREE.Texture(img);
  texture.needsUpdate = true;
  return texture;
}

interface GltfParserLike {
  json?: {
    images?: Array<{ bufferView?: number; mimeType?: string; extras?: Record<string, unknown> }>;
  };
  sourceCache: Record<number, Promise<THREE.Texture>>;
  loadImageSource: (sourceIndex: number, loader: unknown) => Promise<THREE.Texture>;
  getDependency: (type: 'bufferView', index: number) => Promise<ArrayBuffer>;
}

function registerInMemoryTexturePlugin(loader: GLTFLoader): void {
  loader.register((rawParser) => {
    const parser = rawParser as unknown as GltfParserLike;
    const origLoadImageSource = parser.loadImageSource.bind(parser);
    parser.loadImageSource = (sourceIndex: number, texLoader: unknown) => {
      const sourceDef = parser.json?.images?.[sourceIndex];
      if (!sourceDef || sourceDef.bufferView === undefined) {
        return origLoadImageSource(sourceIndex, texLoader);
      }
      const cached = parser.sourceCache[sourceIndex];
      if (cached !== undefined) {
        return cached.then((texture) => texture.clone());
      }
      const promise = parser
        .getDependency('bufferView', sourceDef.bufferView)
        .then(async (bufferView) => {
          const mimeType = sourceDef.mimeType || 'image/webp';
          const texture = await decodeBufferViewToTexture(bufferView, mimeType);
          if (sourceDef.extras && typeof sourceDef.extras === 'object') {
            Object.assign(texture.userData, sourceDef.extras);
          }
          texture.userData.mimeType = mimeType;
          return texture;
        });
      parser.sourceCache[sourceIndex] = promise;
      return promise;
    };
    return { name: 'IN_MEMORY_BUFFER_TEXTURE_DECODER' };
  });
}

function loadGlbEntry(fileName: string): CachedGlbEntry {
  const existing = glbCache.get(fileName);
  if (existing) return existing;

  const loader = new GLTFLoader(glbLoadingManager);
  loader.setDRACOLoader(getSharedDracoLoader());
  registerInMemoryTexturePlugin(loader);

  const entry: CachedGlbEntry = {
    status: 'pending',
    promise: Promise.resolve(),
    gltf: null,
  };

  entry.promise = new Promise<void>((resolve) => {
    const onParsed = (gltf: GLTF) => {
      entry.gltf = gltf;
      entry.status = 'resolved';
      notifyGlbProgress();
      resolve();
    };
    const onError = (err: unknown) => {
      console.warn(`Could not load ./models/${fileName}:`, err);
      entry.gltf = null;
      entry.status = 'resolved';
      notifyGlbProgress();
      resolve();
    };

    getPreloadedGlbBuffer(fileName).then((buffer) => {
      if (buffer) {
        loader.parse(buffer, './models/', onParsed, onError);
      } else {
        loader.load(`./models/${fileName}`, onParsed, undefined, onError);
      }
    });
  });

  glbCache.set(fileName, entry);
  return entry;
}

export function preloadAllRoomGlbs(): void {
  for (const file of ROOM_GLB_FILES) {
    loadGlbEntry(file);
  }
}

export function useSuspendedGlb(fileName: string): GLTF | null {
  const entry = loadGlbEntry(fileName);
  if (entry.status === 'pending') {
    throw entry.promise;
  }
  return entry.gltf;
}

/**
 * Suspends the whole 3D Experience until all 4 studio GLB models finish loading
 * in parallel, preventing old procedural fallbacks from flashing on startup.
 */
export function useAllRoomGlbs(): {
  libraryLoaded: boolean;
  projectorLoaded: boolean;
  laptopLoaded: boolean;
  phoneLoaded: boolean;
} {
  const entries = [
    loadGlbEntry(LIBRARY_FILE),
    loadGlbEntry(PROJECTOR_FILE),
    loadGlbEntry(LAPTOP_FILE),
    loadGlbEntry(IPHONE_FILE),
  ];
  const pending = entries.filter((e) => e.status === 'pending').map((e) => e.promise);
  if (pending.length > 0) {
    throw Promise.all(pending);
  }
  return {
    libraryLoaded: Boolean(entries[0].gltf),
    projectorLoaded: Boolean(entries[1].gltf),
    laptopLoaded: Boolean(entries[2].gltf),
    phoneLoaded: Boolean(entries[3].gltf),
  };
}

const disposeClonedMaterials = (root: THREE.Object3D | null): void => {
  if (!root) return;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        if (m) m.dispose();
      }
    }
  });
};

function styleLibraryMaterial(
  mat: THREE.Material,
  primaryLedMats: THREE.MeshStandardMaterial[],
  secondaryLedMats: THREE.MeshStandardMaterial[]
): THREE.Material {
  const cloned = mat.clone();
  if (!(cloned instanceof THREE.MeshStandardMaterial)) return cloned;

  const name = (cloned.name || '').toLowerCase();

  // Cyber architectural LED luminaires
  if (name.includes('lumin')) {
    cloned.color.set('#e0ffff');
    cloned.emissive.set('#00f0ff');
    cloned.emissiveIntensity = 2.1;
    cloned.roughness = 0.2;
    cloned.metalness = 0.1;
    cloned.toneMapped = false;
    primaryLedMats.push(cloned);
    return cloned;
  }

  // Translucent cyan cyber glass
  if (name.includes('vidro')) {
    cloned.color.set('#38bdf8');
    cloned.emissive.set('#00f0ff');
    cloned.emissiveIntensity = 1.45;
    cloned.roughness = 0.12;
    cloned.metalness = 0.2;
    cloned.transparent = true;
    cloned.opacity = 0.64;
    cloned.toneMapped = false;
    primaryLedMats.push(cloned);
    return cloned;
  }

  // Magenta/pink cyber accent trim
  if (name.includes('rosinha')) {
    cloned.color.set('#f472b6');
    cloned.emissive.set('#ec4899');
    cloned.emissiveIntensity = 1.6;
    cloned.roughness = 0.25;
    cloned.metalness = 0.28;
    cloned.toneMapped = false;
    secondaryLedMats.push(cloned);
    return cloned;
  }

  // Keep textured book covers and wall cuadros crisp and clearly illuminated
  if (cloned.map) {
    cloned.color.set('#ffffff');
    cloned.emissiveMap = cloned.map;
    cloned.emissive.set('#e0f2fe');
    cloned.emissiveIntensity = 0.3;
    cloned.roughness = 0.48;
    cloned.metalness = 0.08;
    return cloned;
  }

  // Lifted cyber-slate tones so floor, stairs, tables, and shelves read clearly under light
  if (name === 'madeira') {
    cloned.color.set('#22324a');
    cloned.roughness = 0.54;
    cloned.metalness = 0.22;
  } else if (name.includes('madeira_clara')) {
    // Distinct cool steel-slate for reading tables, stair treads & trim
    cloned.color.set('#385175');
    cloned.roughness = 0.44;
    cloned.metalness = 0.26;
  } else if (name.includes('vinho')) {
    cloned.color.set('#39215b');
    cloned.emissive.set('#7c3aed');
    cloned.emissiveIntensity = 0.22;
    cloned.roughness = 0.48;
    cloned.metalness = 0.22;
  } else if (name.includes('azul_esc')) {
    cloned.color.set('#1a3d6e');
    cloned.emissive.set('#0ea5e9');
    cloned.emissiveIntensity = 0.14;
    cloned.roughness = 0.42;
    cloned.metalness = 0.32;
  } else if (name.includes('preto')) {
    // Dark gunmetal slate (shows bevels & shape without crushing to pure black)
    cloned.color.set('#1b2436');
    cloned.roughness = 0.4;
    cloned.metalness = 0.42;
  } else if (name.includes('pastel_escuro')) {
    cloned.color.set('#293b59');
    cloned.roughness = 0.48;
    cloned.metalness = 0.24;
  } else if (name.includes('pastel')) {
    cloned.color.set('#3e5478');
    cloned.roughness = 0.46;
    cloned.metalness = 0.2;
  } else {
    cloned.color.set('#2e4363');
    cloned.roughness = 0.46;
    cloned.metalness = 0.24;
  }

  return cloned;
}

interface CenteredGlbLibraryProps {
  editMode?: boolean;
  onSelectInEditMode?: () => void;
}

export const CenteredGlbLibrary: React.FC<CenteredGlbLibraryProps> = ({
  editMode = false,
  onSelectInEditMode,
}) => {
  const gltf = useSuspendedGlb(LIBRARY_FILE);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const crownStripMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const baseStripMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const cyanLedLightRef = useRef<THREE.PointLight>(null);
  const violetLedLightRef = useRef<THREE.PointLight>(null);

  const prepared = useMemo(() => {
    if (!gltf) return null;

    const primaryLedMats: THREE.MeshStandardMaterial[] = [];
    const secondaryLedMats: THREE.MeshStandardMaterial[] = [];
    const clonedScene = gltf.scene.clone(true);

    const wrapper = new THREE.Group();
    // Keep natural orientation so the open front cutaway faces +Z toward the camera
    // and bookshelves frame left/right symmetrically instead of placing a solid wall in front.
    wrapper.add(clonedScene);
    wrapper.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const horizSpan = Math.max(size.x, size.z) || 1;
    const scaleFactor = TARGET_ROOM_SPAN / horizSpan;

    wrapper.scale.multiplyScalar(scaleFactor);
    wrapper.position.set(
      -center.x * scaleFactor,
      FLOOR_Y - box.min.y * scaleFactor,
      -center.z * scaleFactor
    );
    wrapper.updateMatrixWorld(true);

    const normBox = new THREE.Box3().setFromObject(wrapper);
    const normSize = new THREE.Vector3();
    normBox.getSize(normSize);

    wrapper.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) =>
            styleLibraryMaterial(m, primaryLedMats, secondaryLedMats)
          );
        } else if (mesh.material) {
          mesh.material = styleLibraryMaterial(
            mesh.material,
            primaryLedMats,
            secondaryLedMats
          );
        }
      }
    });

    return {
      wrapper,
      animations: gltf.animations ?? [],
      primaryLedMats,
      secondaryLedMats,
      bounds: {
        minX: normBox.min.x,
        maxX: normBox.max.x,
        minY: normBox.min.y,
        maxY: normBox.max.y,
        minZ: normBox.min.z,
        maxZ: normBox.max.z,
        width: normSize.x,
        depth: normSize.z,
      },
    };
  }, [gltf]);

  useEffect(() => {
    if (!prepared) return;
    return () => {
      disposeClonedMaterials(prepared.wrapper);
    };
  }, [prepared]);

  useEffect(() => {
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;
    if (prepared && prepared.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(prepared.wrapper);
      prepared.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
      mixerRef.current = mixer;
    }
    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [prepared]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (mixerRef.current) {
      mixerRef.current.update(dt);
    }
    if (!prepared) return;

    const t = prefersReducedMotion ? 0 : state.clock.getElapsedTime();
    const wave1 = (Math.sin(t * 0.85) + 1) * 0.5;
    const wave2 = (Math.cos(t * 0.72) + 1) * 0.5;

    _ledWorkPrimary.copy(_ledCyan).lerp(_ledBlue, wave1 * 0.55);
    _ledWorkSecondary.copy(_ledPink).lerp(_ledViolet, wave2 * 0.65);

    const primaryPulse = 2.0 + Math.sin(t * 1.4) * 0.4;
    const secondaryPulse = 1.65 + Math.cos(t * 1.2) * 0.3;

    for (const mat of prepared.primaryLedMats) {
      mat.emissive.copy(_ledWorkPrimary);
      mat.emissiveIntensity = primaryPulse;
    }
    for (const mat of prepared.secondaryLedMats) {
      mat.emissive.copy(_ledWorkSecondary);
      mat.emissiveIntensity = secondaryPulse;
    }

    if (crownStripMatRef.current) {
      crownStripMatRef.current.color.copy(_ledWorkPrimary).multiplyScalar(1.85);
    }
    if (baseStripMatRef.current) {
      baseStripMatRef.current.color.copy(_ledWorkSecondary).multiplyScalar(1.65);
    }
    if (cyanLedLightRef.current) {
      cyanLedLightRef.current.color.set('#bae6fd');
      cyanLedLightRef.current.intensity = 4.4 + Math.sin(t * 1.4) * 0.45;
    }
    if (violetLedLightRef.current) {
      violetLedLightRef.current.color.set('#e0e7ff');
      violetLedLightRef.current.intensity = 4.4 + Math.cos(t * 1.2) * 0.45;
    }
  });

  if (!prepared) return null;

  const { bounds } = prepared;
  const backZ = bounds.minZ + 0.14;
  const stripWidth = bounds.width * 0.94;
  const upperLedY = bounds.maxY - 0.28;
  const floorTrimY = bounds.minY + 0.02;
  const upperLightY = bounds.maxY - 1.3;

  return (
    <group
      name="centered-glb-library"
      onClick={(e) => {
        if (!editMode || e.delta > 4) return;
        e.stopPropagation();
        onSelectInEditMode?.();
      }}
    >
      <primitive object={prepared.wrapper} />

      {/* Upper & back-base horizontal cyber LED bars + balanced interior illumination */}
      <group>
        <mesh position={[0, upperLedY, backZ]}>
          <boxGeometry args={[stripWidth, 0.045, 0.045]} />
          <meshBasicMaterial ref={crownStripMatRef} color={[0, 1.85, 2.0]} toneMapped={false} />
        </mesh>
        <mesh position={[0, floorTrimY, backZ]}>
          <boxGeometry args={[stripWidth, 0.03, 0.04]} />
          <meshBasicMaterial ref={baseStripMatRef} color={[1.6, 0.55, 1.75]} toneMapped={false} />
        </mesh>

        {/* Clean interior architectural fill lighting bookshelves, stairs, tables & cuadros */}
        <pointLight
          ref={cyanLedLightRef}
          position={[-4.5, upperLightY, -1.8]}
          color="#bae6fd"
          intensity={4.4}
          distance={28}
          decay={1.35}
        />
        <pointLight
          ref={violetLedLightRef}
          position={[4.5, upperLightY, -1.8]}
          color="#e0e7ff"
          intensity={4.4}
          distance={28}
          decay={1.35}
        />
        <pointLight
          position={[0, upperLightY - 0.6, 2.2]}
          color="#e0f2fe"
          intensity={3.6}
          distance={26}
          decay={1.35}
        />
      </group>
    </group>
  );
};

interface GlbHologramProjectorProps {
  editMode?: boolean;
  onSelectInEditMode?: () => void;
}

export const GlbHologramProjector: React.FC<GlbHologramProjectorProps> = ({
  editMode = false,
  onSelectInEditMode,
}) => {
  const gltf = useSuspendedGlb(PROJECTOR_FILE);
  const projectorRef = useRef<THREE.Group>(null);

  const root = useMemo(() => {
    if (!gltf) return null;
    const wrapper = new THREE.Group();
    const cloned = gltf.scene.clone(true);
    wrapper.add(cloned);
    wrapper.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const horizSpan = Math.max(size.x, size.z) || 1;
    const scaleFactor = 2.6 / horizSpan;

    wrapper.scale.multiplyScalar(scaleFactor);
    wrapper.position.set(
      -center.x * scaleFactor,
      -box.min.y * scaleFactor,
      -center.z * scaleFactor
    );

    wrapper.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      }
    });

    return wrapper;
  }, [gltf]);

  useFrame((state) => {
    if (projectorRef.current) {
      projectorRef.current.rotation.y = state.clock.getElapsedTime() * 0.18;
    }
  });

  if (!root) return null;

  return (
    <group
      name="glb-hologram-projector"
      onClick={(e) => {
        if (!editMode) return;
        e.stopPropagation();
        playClickSound();
        onSelectInEditMode?.();
      }}
    >
      <group ref={projectorRef}>
        <primitive object={root} />
      </group>
    </group>
  );
};

interface GlbLaptopStationProps {
  active: boolean;
  editMode?: boolean;
  onSelectInEditMode?: () => void;
  onClick: () => void;
  label: string;
  onHoverChange?: (hovering: boolean) => void;
}

export const GlbLaptopStation: React.FC<GlbLaptopStationProps> = ({
  active,
  editMode = false,
  onSelectInEditMode,
  onClick,
  label,
  onHoverChange,
}) => {
  const gltf = useSuspendedGlb(LAPTOP_FILE);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const scaleTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    window.dispatchEvent(new Event(hovered ? 'cursor-hover-start' : 'cursor-hover-end'));
  }, [hovered]);

  const root = useMemo(() => {
    if (!gltf) return null;
    const wrapper = new THREE.Group();
    const cloned = gltf.scene.clone(true);
    wrapper.add(cloned);
    wrapper.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const horizSpan = Math.max(size.x, size.z) || 1;
    const scaleFactor = 2.15 / horizSpan;

    wrapper.scale.multiplyScalar(scaleFactor);
    wrapper.position.set(
      -center.x * scaleFactor,
      -box.min.y * scaleFactor,
      -center.z * scaleFactor
    );

    wrapper.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      }
    });

    return wrapper;
  }, [gltf]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = editMode ? 0 : Math.sin(t * 0.5) * 0.008;
    const s = !editMode && hovered && !active ? 1.06 : 1;
    groupRef.current.scale.lerp(scaleTarget.set(s, s, s), 0.12);
  });

  if (!root) return null;

  return (
    <group
      ref={groupRef}
      name="glb-laptop-station"
      onClick={(e) => {
        e.stopPropagation();
        playClickSound();
        if (editMode) {
          onSelectInEditMode?.();
        } else {
          onClick();
        }
      }}
      onPointerOver={() => {
        setHovered(true);
        playHoverSound();
        onHoverChange?.(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHoverChange?.(false);
      }}
    >
      <primitive object={root} />
      <SectionTitle3D
        label={label}
        theme="projects"
        position={[0, 1.54, 0.28]}
        hovered={hovered}
        active={active}
        visible={!active}
      />
    </group>
  );
};

interface GlbSmartphoneContactProps {
  active: boolean;
  editMode?: boolean;
  onSelectInEditMode?: () => void;
  onClick: () => void;
  label: string;
  visible?: boolean;
}

export const GlbSmartphoneContact: React.FC<GlbSmartphoneContactProps> = ({
  active,
  editMode = false,
  onSelectInEditMode,
  onClick,
  label,
  visible = true,
}) => {
  const gltf = useSuspendedGlb(IPHONE_FILE);
  const rootRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const scaleTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    window.dispatchEvent(new Event(hovered ? 'cursor-hover-start' : 'cursor-hover-end'));
  }, [hovered]);

  const root = useMemo(() => {
    if (!gltf) return null;
    const wrapper = new THREE.Group();
    const cloned = gltf.scene.clone(true);
    wrapper.add(cloned);
    wrapper.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const targetHeight = 1.55;
    const scaleFactor = targetHeight / (size.y || 1);

    wrapper.scale.multiplyScalar(scaleFactor);
    wrapper.position.set(
      -center.x * scaleFactor,
      -center.y * scaleFactor,
      -center.z * scaleFactor
    );

    wrapper.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      }
    });

    return wrapper;
  }, [gltf]);

  useFrame((state) => {
    if (floatRef.current) {
      const t = state.clock.getElapsedTime();
      floatRef.current.rotation.y = -0.22 + Math.sin(t * 0.35) * 0.14;
    }
    if (rootRef.current) {
      const s = visible || editMode ? (!editMode && hovered && !active ? 1.1 : 1) : 0;
      rootRef.current.scale.lerp(scaleTarget.set(s, s, s), 0.1);
    }
  });

  if (!root) return null;

  return (
    <group
      ref={rootRef}
      name="glb-iphone-contact"
      onClick={(e) => {
        e.stopPropagation();
        playClickSound();
        if (editMode) {
          onSelectInEditMode?.();
        } else {
          onClick();
        }
      }}
      onPointerOver={() => {
        setHovered(true);
        playHoverSound();
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Float speed={editMode ? 0 : 1.8} rotationIntensity={editMode ? 0 : 0.18} floatIntensity={editMode ? 0 : 0.35}>
        <group ref={floatRef}>
          <primitive object={root} />
        </group>
      </Float>
      <SectionTitle3D
        label={label}
        theme="contact"
        position={[0, 1.26, 0]}
        hovered={hovered}
        active={active}
        visible={!active}
      />
    </group>
  );
};
