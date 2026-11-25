import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface AnalyzedMaterialInfo {
  name: string;
  type: string;
  hasEmissive: boolean;
  hasColorMap: boolean;
  doubleSided: boolean;
}

export interface AnalyzedAnimationInfo {
  name: string;
  durationSec: number;
}

export interface GlbAnalysisReport {
  fileId: string;
  fileName: string;
  byteSize: number;
  meshCount: number;
  vertexCount: number;
  triangleCount: number;
  materialCount: number;
  materials: AnalyzedMaterialInfo[];
  textureCount: number;
  animationCount: number;
  animations: AnalyzedAnimationInfo[];
  nodeCount: number;
  topLevelNodes: string[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  center: [number, number, number];
  minY: number;
  guessedRole: 'library' | 'laptop' | 'phone' | 'projector' | 'prism' | 'prop';
  recommendedScaleNote: string;
  objectUrl: string;
}

export interface GlbParseResult {
  report: GlbAnalysisReport;
  scene: THREE.Group;
}

const guessRoleFromFilename = (
  name: string
): GlbAnalysisReport['guessedRole'] => {
  const lower = name.toLowerCase();
  if (/biblio|librar|shelf|estant|bookcase|rack/.test(lower)) return 'library';
  if (/laptop|macbook|notebook|computer|pc/.test(lower)) return 'laptop';
  if (/iphone|phone|mobile|cel|smart/.test(lower)) return 'phone';
  if (/proyec|proj|holo|pedestal|base/.test(lower)) return 'projector';
  if (/prism|brain|cerebro|cristal|crystal/.test(lower)) return 'prism';
  return 'prop';
};

const getScaleAdvice = (maxDim: number): string => {
  if (maxDim <= 0) return 'Empty geometry';
  if (maxDim > 20) {
    return `Very large (${maxDim.toFixed(1)}u) — likely exported in cm/mm; needs scale ~${(2 / maxDim).toFixed(4)}`;
  }
  if (maxDim < 0.08) {
    return `Tiny (${maxDim.toFixed(4)}u) — needs scale up (~${(1.2 / maxDim).toFixed(1)}x)`;
  }
  return `Standard meter scale (${maxDim.toFixed(2)}u max dimension)`;
};

const inspectMaterialTextures = (mat: THREE.Material, textures: Set<THREE.Texture>) => {
  const std = mat as THREE.MeshStandardMaterial;
  const candidateKeys: (keyof THREE.MeshStandardMaterial)[] = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'emissiveMap',
    'aoMap',
    'alphaMap',
  ];
  for (const key of candidateKeys) {
    const val = std[key];
    if (val && typeof val === 'object' && 'isTexture' in val) {
      textures.add(val as THREE.Texture);
    }
  }
};

export const analyzeGlbArrayBuffer = async (
  fileId: string,
  fileName: string,
  buffer: ArrayBuffer
): Promise<GlbParseResult> => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(dracoLoader);

  let gltf: GLTF;
  try {
    gltf = await new Promise<GLTF>((resolve, reject) => {
      loader.parse(buffer, '', resolve, reject);
    });
  } finally {
    dracoLoader.dispose();
  }

  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  let meshCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  let nodeCount = 0;

  const uniqueMaterials = new Set<THREE.Material>();
  const uniqueTextures = new Set<THREE.Texture>();

  scene.traverse((obj) => {
    nodeCount += 1;
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      meshCount += 1;
      const geo = mesh.geometry;
      if (geo) {
        const pos = geo.getAttribute('position');
        if (pos) vertexCount += pos.count;
        if (geo.index) {
          triangleCount += Math.floor(geo.index.count / 3);
        } else if (pos) {
          triangleCount += Math.floor(pos.count / 3);
        }
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m) {
          uniqueMaterials.add(m);
          inspectMaterialTextures(m, uniqueTextures);
        }
      }
    }
  });

  const materials: AnalyzedMaterialInfo[] = Array.from(uniqueMaterials).map((m, idx) => {
    const std = m as THREE.MeshStandardMaterial;
    const hasEmissive = Boolean(
      std.emissive && (std.emissive.r > 0 || std.emissive.g > 0 || std.emissive.b > 0)
    );
    return {
      name: m.name || `Material_${idx + 1}`,
      type: m.type,
      hasEmissive,
      hasColorMap: Boolean(std.map),
      doubleSided: m.side === THREE.DoubleSide,
    };
  });

  const animations: AnalyzedAnimationInfo[] = gltf.animations.map((clip, idx) => ({
    name: clip.name || `Animation_${idx + 1}`,
    durationSec: Number(clip.duration.toFixed(2)),
  }));

  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const topLevelNodes = scene.children.slice(0, 12).map((c) => c.name || c.type);

  const objectUrl = URL.createObjectURL(
    new Blob([buffer], { type: 'model/gltf-binary' })
  );

  return {
    scene,
    report: {
      fileId,
      fileName,
      byteSize: buffer.byteLength,
      meshCount,
      vertexCount,
      triangleCount,
      materialCount: materials.length,
      materials,
      textureCount: uniqueTextures.size,
      animationCount: animations.length,
      animations,
      nodeCount,
      topLevelNodes,
      dimensions: {
        width: Number(size.x.toFixed(3)),
        height: Number(size.y.toFixed(3)),
        depth: Number(size.z.toFixed(3)),
      },
      center: [
        Number(center.x.toFixed(3)),
        Number(center.y.toFixed(3)),
        Number(center.z.toFixed(3)),
      ],
      minY: Number(box.min.y.toFixed(3)),
      guessedRole: guessRoleFromFilename(fileName),
      recommendedScaleNote: getScaleAdvice(maxDim),
      objectUrl,
    },
  };
};

export const disposeThreeObject = (root: THREE.Object3D | null): void => {
  if (!root) return;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const std = mat as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.normalMap?.dispose();
        std.roughnessMap?.dispose();
        std.metalnessMap?.dispose();
        std.emissiveMap?.dispose();
        std.aoMap?.dispose();
        mat.dispose();
      }
    }
  });
};
