import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { disposeThreeObject } from '../utils/glbAnalyzer';
import { getGlbBuffer, saveGlbBuffer } from '../utils/glbVaultStorage';
import { playClickSound, playHoverSound } from '../utils/soundEngine';

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

const LIBRARY_FILE = 'library_low_poly.glb';
const PROJECTOR_FILE = 'hologram_projector_with_hologram.glb';
const LAPTOP_FILE = 'laptop_and_mouse.glb';
const IPHONE_FILE = 'iphone_15_pro_max_made_in_blender.glb';

const TARGET_ROOM_SPAN = 22;
const FLOOR_Y = -0.58;

async function checkServerModelExists(fileName: string): Promise<boolean> {
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  if (isDev) {
    try {
      const res = await fetch('/__dev/local-models');
      if (!res.ok) return false;
      const data = (await res.json()) as { models?: string[] };
      return Array.isArray(data.models) && data.models.includes(fileName);
    } catch {
      return false;
    }
  }

  try {
    const res = await fetch(`./models/${fileName}`, { method: 'HEAD' });
    const ct = res.headers.get('content-type') || '';
    return res.ok && !ct.includes('text/html');
  } catch {
    return false;
  }
}

interface LoadedGlbResult {
  root: THREE.Group | null;
  animations: THREE.AnimationClip[];
}

function useStoredGlbModel(
  fileName: string,
  transformRoot: (rawScene: THREE.Group) => THREE.Group,
  onLoadedChange?: (loaded: boolean) => void
): LoadedGlbResult {
  const [result, setResult] = useState<LoadedGlbResult>({ root: null, animations: [] });
  const [reloadTick, setReloadTick] = useState(0);
  const transformRef = useRef(transformRoot);
  transformRef.current = transformRoot;

  useEffect(() => {
    const handleModelsUpdated = () => {
      setReloadTick((t) => t + 1);
    };
    window.addEventListener('glb-models-updated', handleModelsUpdated);
    return () => window.removeEventListener('glb-models-updated', handleModelsUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let builtScene: THREE.Group | null = null;

    const load = async () => {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
      loader.setDRACOLoader(dracoLoader);

      try {
        let gltf: GLTF | null = null;
        const cachedBuf = await getGlbBuffer(fileName);

        if (cachedBuf && cachedBuf.byteLength > 0) {
          gltf = await new Promise<GLTF>((resolve, reject) => {
            loader.parse(cachedBuf, '', resolve, reject);
          });
        } else {
          const exists = await checkServerModelExists(fileName);
          if (!exists || cancelled) {
            if (!cancelled) {
              setResult({ root: null, animations: [] });
              onLoadedChange?.(false);
            }
            return;
          }

          const res = await fetch(`./models/${fileName}?v=${reloadTick}`);
          if (!res.ok) throw new Error(`Failed to fetch ${fileName}`);
          const buf = await res.arrayBuffer();
          await saveGlbBuffer(fileName, buf).catch(() => {});
          gltf = await new Promise<GLTF>((resolve, reject) => {
            loader.parse(buf, '', resolve, reject);
          });
        }

        if (!gltf || cancelled) {
          if (gltf?.scene) disposeThreeObject(gltf.scene);
          return;
        }

        const prepared = transformRef.current(gltf.scene);
        builtScene = prepared;
        setResult({ root: prepared, animations: gltf.animations ?? [] });
        onLoadedChange?.(true);
      } catch (err) {
        console.warn(`Could not load ${fileName}:`, err);
        if (!cancelled) {
          setResult({ root: null, animations: [] });
          onLoadedChange?.(false);
        }
      } finally {
        dracoLoader.dispose();
      }
    };

    load();

    return () => {
      cancelled = true;
      if (builtScene) {
        disposeThreeObject(builtScene);
      }
    };
  }, [fileName, reloadTick, onLoadedChange]);

  return result;
}

interface CenteredGlbLibraryProps {
  active: boolean;
  onClick: () => void;
  onLoadedChange?: (loaded: boolean) => void;
}

export const CenteredGlbLibrary: React.FC<CenteredGlbLibraryProps> = ({
  active,
  onClick,
  onLoadedChange,
}) => {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  const { root, animations } = useStoredGlbModel(
    LIBRARY_FILE,
    (rawScene) => {
      // Rotate +90deg around Y so the open cutaway side (-X) faces the front camera (+Z)
      // and the main 2-story bookshelf wall (+X) sits behind the desk (-Z).
      const wrapper = new THREE.Group();
      rawScene.rotation.y = Math.PI / 2;
      wrapper.add(rawScene);
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

      wrapper.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.receiveShadow = true;
          mesh.castShadow = false;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            if (mat && 'envMapIntensity' in mat) {
              (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.85;
            }
          }
        }
      });

      return wrapper;
    },
    onLoadedChange
  );

  useEffect(() => {
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;
    if (root && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(root);
      animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
      mixerRef.current = mixer;
    }
    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [root, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(Math.min(delta, 0.05));
    }
  });

  if (!root) return null;

  return (
    <group
      name="centered-glb-library"
      onClick={(e) => {
        if (active) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <primitive object={root} />
    </group>
  );
};

interface GlbHologramProjectorProps {
  onLoadedChange?: (loaded: boolean) => void;
}

export const GlbHologramProjector: React.FC<GlbHologramProjectorProps> = ({
  onLoadedChange,
}) => {
  const projectorRef = useRef<THREE.Group>(null);

  const { root } = useStoredGlbModel(
    PROJECTOR_FILE,
    (rawScene) => {
      const wrapper = new THREE.Group();
      wrapper.add(rawScene);
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
    },
    onLoadedChange
  );

  useFrame((state) => {
    if (projectorRef.current) {
      projectorRef.current.rotation.y = state.clock.getElapsedTime() * 0.18;
    }
  });

  if (!root) return null;

  return (
    <group name="glb-hologram-projector" position={[0, 0.92, -2.4]}>
      <group ref={projectorRef}>
        <primitive object={root} />
      </group>
    </group>
  );
};

interface GlbLaptopStationProps {
  active: boolean;
  onClick: () => void;
  label: string;
  onHoverChange?: (hovering: boolean) => void;
  onLoadedChange?: (loaded: boolean) => void;
}

export const GlbLaptopStation: React.FC<GlbLaptopStationProps> = ({
  active,
  onClick,
  label,
  onHoverChange,
  onLoadedChange,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const scaleTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    window.dispatchEvent(new Event(hovered ? 'cursor-hover-start' : 'cursor-hover-end'));
  }, [hovered]);

  const { root } = useStoredGlbModel(
    LAPTOP_FILE,
    (rawScene) => {
      const wrapper = new THREE.Group();
      wrapper.add(rawScene);
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
    },
    onLoadedChange
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = -0.35 + Math.sin(t * 0.5) * 0.008;
    const s = hovered && !active ? 1.06 : 1;
    groupRef.current.scale.lerp(scaleTarget.set(s, s, s), 0.12);
  });

  if (!root) return null;

  return (
    <group
      ref={groupRef}
      name="glb-laptop-station"
      position={[0, -0.35, 0]}
      onClick={(e) => {
        e.stopPropagation();
        playClickSound();
        onClick();
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
      <Text
        position={[0, 1.95, 0.5]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000"
        visible={!active}
      >
        {label}
      </Text>
    </group>
  );
};

interface GlbSmartphoneContactProps {
  active: boolean;
  onClick: () => void;
  label: string;
  visible?: boolean;
  onLoadedChange?: (loaded: boolean) => void;
}

export const GlbSmartphoneContact: React.FC<GlbSmartphoneContactProps> = ({
  active,
  onClick,
  label,
  visible = true,
  onLoadedChange,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const scaleTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    window.dispatchEvent(new Event(hovered ? 'cursor-hover-start' : 'cursor-hover-end'));
  }, [hovered]);

  const { root } = useStoredGlbModel(
    IPHONE_FILE,
    (rawScene) => {
      const wrapper = new THREE.Group();
      wrapper.add(rawScene);
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
    },
    onLoadedChange
  );

  useFrame((state) => {
    if (floatRef.current) {
      const t = state.clock.getElapsedTime();
      floatRef.current.rotation.y = -0.22 + Math.sin(t * 0.35) * 0.14;
    }
    if (rootRef.current) {
      const s = visible ? (hovered && !active ? 1.1 : 1) : 0;
      rootRef.current.scale.lerp(scaleTarget.set(s, s, s), 0.1);
    }
  });

  if (!root) return null;

  return (
    <group
      ref={rootRef}
      name="glb-iphone-contact"
      position={[2.5, 0.55, 0.5]}
      onClick={(e) => {
        e.stopPropagation();
        playClickSound();
        onClick();
      }}
      onPointerOver={() => {
        setHovered(true);
        playHoverSound();
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Float speed={1.8} rotationIntensity={0.18} floatIntensity={0.35}>
        <group ref={floatRef}>
          <primitive object={root} />
        </group>
      </Float>
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000"
      >
        {label}
      </Text>
    </group>
  );
};
