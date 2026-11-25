import type { Section } from '../types';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export interface CameraTourStop extends CameraPose {
  id: string;
  name: string;
  duration: number;
  hold: number;
  orbitSpeed: number;
}

export interface CameraStudioConfig {
  sections: Partial<Record<Section, CameraPose>>;
  tourLoop: boolean;
  tourStops: CameraTourStop[];
}

export interface CameraBridge {
  getCurrentPose: () => CameraPose | null;
  flyToPose: (pose: CameraPose, animate?: boolean) => void;
}

const STORAGE_KEY = 'aerofolio_camera_studio_v5';

export const DEFAULT_TOUR_STOPS: CameraTourStop[] = [
  {
    id: 'stop-overview',
    name: 'Anfiteatro Biblioteca',
    position: [0, 4.2, 10.6],
    target: [0, 2.5, -2.0],
    duration: 2.6,
    hold: 1.8,
    orbitSpeed: 5,
  },
  {
    id: 'stop-laptop',
    name: 'Estación Laptop',
    position: [1.95, 2.35, 8.25],
    target: [3.23, 1.55, 5.67],
    duration: 2.2,
    hold: 1.8,
    orbitSpeed: 7,
  },
  {
    id: 'stop-brain',
    name: 'Prisma IA',
    position: [-1.25, 2.35, 2.35],
    target: [-2.7, 1.85, -0.45],
    duration: 2.2,
    hold: 1.8,
    orbitSpeed: 8,
  },
  {
    id: 'stop-phone',
    name: 'Estación iPhone',
    position: [1.25, 2.35, 2.35],
    target: [2.7, 1.84, -0.51],
    duration: 2.2,
    hold: 1.8,
    orbitSpeed: -8,
  },
  {
    id: 'stop-holo',
    name: 'Proyector y Holograma',
    position: [1.75, 4.75, -1.6],
    target: [0.09, 5.1, -10.32],
    duration: 2.4,
    hold: 2.0,
    orbitSpeed: -5,
  },
];

export const cloneDefaultCameraStudioConfig = (): CameraStudioConfig => ({
  sections: {},
  tourLoop: true,
  tourStops: DEFAULT_TOUR_STOPS.map((s) => ({
    ...s,
    position: [...s.position],
    target: [...s.target],
  })),
});

const sanitizeVec3 = (
  raw: unknown,
  fallback: [number, number, number]
): [number, number, number] => {
  if (!Array.isArray(raw) || raw.length !== 3) return [...fallback];
  const x = Number(raw[0]);
  const y = Number(raw[1]);
  const z = Number(raw[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return [...fallback];
  return [x, y, z];
};

const VALID_SECTIONS: readonly Section[] = ['home', 'projects', 'about', 'library', 'contact'];

export const loadCameraStudioConfig = (): CameraStudioConfig => {
  const base = cloneDefaultCameraStudioConfig();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<CameraStudioConfig>;

    const sections: Partial<Record<Section, CameraPose>> = {};
    if (parsed.sections && typeof parsed.sections === 'object') {
      for (const sec of VALID_SECTIONS) {
        const entry = parsed.sections[sec];
        if (entry && typeof entry === 'object') {
          sections[sec] = {
            position: sanitizeVec3(entry.position, [0, 3.5, 8]),
            target: sanitizeVec3(entry.target, [0, 1, 0]),
          };
        }
      }
    }

    let tourStops = base.tourStops;
    if (Array.isArray(parsed.tourStops) && parsed.tourStops.length > 0) {
      const cleaned: CameraTourStop[] = [];
      parsed.tourStops.forEach((rawStop, idx) => {
        if (!rawStop || typeof rawStop !== 'object') return;
        const duration = Number(rawStop.duration);
        const hold = Number(rawStop.hold);
        const orbitSpeed = Number(rawStop.orbitSpeed);
        cleaned.push({
          id: typeof rawStop.id === 'string' && rawStop.id ? rawStop.id : `stop-${idx + 1}`,
          name: typeof rawStop.name === 'string' && rawStop.name.trim() ? rawStop.name : `Toma ${idx + 1}`,
          position: sanitizeVec3(rawStop.position, [0, 4, 8]),
          target: sanitizeVec3(rawStop.target, [0, 1, 0]),
          duration: Number.isFinite(duration) ? Math.max(0.4, Math.min(15, duration)) : 2.2,
          hold: Number.isFinite(hold) ? Math.max(0, Math.min(20, hold)) : 1.5,
          orbitSpeed: Number.isFinite(orbitSpeed) ? Math.max(-45, Math.min(45, orbitSpeed)) : 0,
        });
      });
      if (cleaned.length > 0) tourStops = cleaned;
    }

    return {
      sections,
      tourLoop: typeof parsed.tourLoop === 'boolean' ? parsed.tourLoop : true,
      tourStops,
    };
  } catch {
    return base;
  }
};

export const saveCameraStudioConfig = (config: CameraStudioConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
};

export const clearCameraStudioConfig = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};
