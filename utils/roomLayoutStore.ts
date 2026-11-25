export type RoomItemId =
  | 'library'
  | 'projector'
  | 'holoVideo'
  | 'laptop'
  | 'brain'
  | 'smartphone'
  | 'coffee'
  | 'resume';

export type TransformGizmoMode = 'translate' | 'rotate' | 'scale';

export interface RoomItemTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export type RoomLayoutState = Record<RoomItemId, RoomItemTransform>;

export interface RoomItemMeta {
  id: RoomItemId;
  labels: {
    en: string;
    es: string;
    zh: string;
  };
  accentClass: string;
}

export const ROOM_ITEMS_META: readonly RoomItemMeta[] = [
  {
    id: 'library',
    labels: { en: 'Library Room', es: 'Librería (Sala)', zh: '图书馆房间' },
    accentClass: 'text-amber-300 border-amber-400/40',
  },
  {
    id: 'projector',
    labels: { en: 'Holo Projector', es: 'Proyector Holo', zh: '全息投影仪' },
    accentClass: 'text-cyan-300 border-cyan-400/40',
  },
  {
    id: 'holoVideo',
    labels: { en: 'Holo Video Screen', es: 'Video Holograma', zh: '全息视频屏' },
    accentClass: 'text-sky-300 border-sky-400/40',
  },
  {
    id: 'laptop',
    labels: { en: 'Laptop + Mouse', es: 'Laptop + Mouse', zh: '笔记本与鼠标' },
    accentClass: 'text-blue-300 border-blue-400/40',
  },
  {
    id: 'brain',
    labels: { en: 'AI Prism', es: 'Prisma IA', zh: 'AI 棱镜' },
    accentClass: 'text-pink-300 border-pink-400/40',
  },
  {
    id: 'smartphone',
    labels: { en: 'iPhone 15 Pro', es: 'iPhone 15 Pro', zh: 'iPhone 15 Pro' },
    accentClass: 'text-emerald-300 border-emerald-400/40',
  },
  {
    id: 'coffee',
    labels: { en: 'Coffee Mug', es: 'Taza de Café', zh: '咖啡杯' },
    accentClass: 'text-orange-300 border-orange-400/40',
  },
  {
    id: 'resume',
    labels: { en: 'Resume Paper', es: 'Hoja CV', zh: '简历文件' },
    accentClass: 'text-slate-200 border-slate-400/40',
  },
];

export const DEFAULT_ROOM_LAYOUT: RoomLayoutState = {
  library: { position: [0, 0, -2], rotation: [0, 0, 0], scale: 1 },
  projector: { position: [0.06, 2.59, -10.54], rotation: [0, 0, 0], scale: 0.85 },
  holoVideo: { position: [0.09, 2.95, -10.32], rotation: [0, 0, 0], scale: 0.88 },
  laptop: { position: [3.23, 1.12, 5.67], rotation: [0, 0, 0], scale: 0.92 },
  brain: { position: [-2.7, 1.85, -0.45], rotation: [0, 0.35, 0], scale: 0.92 },
  smartphone: { position: [2.7, 1.84, -0.51], rotation: [0, 2.36, 0], scale: 0.92 },
  coffee: { position: [-1.62, 1.25, 5.32], rotation: [0, 0.45, 0], scale: 0.55 },
  resume: { position: [1.79, 1.18, -0.94], rotation: [0, -0.35, 0], scale: 1 },
};

const STORAGE_KEY = 'aerofolio_room_layout_v4';

export const cloneDefaultRoomLayout = (): RoomLayoutState => ({
  library: {
    position: [...DEFAULT_ROOM_LAYOUT.library.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.library.rotation],
    scale: DEFAULT_ROOM_LAYOUT.library.scale,
  },
  projector: {
    position: [...DEFAULT_ROOM_LAYOUT.projector.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.projector.rotation],
    scale: DEFAULT_ROOM_LAYOUT.projector.scale,
  },
  holoVideo: {
    position: [...DEFAULT_ROOM_LAYOUT.holoVideo.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.holoVideo.rotation],
    scale: DEFAULT_ROOM_LAYOUT.holoVideo.scale,
  },
  laptop: {
    position: [...DEFAULT_ROOM_LAYOUT.laptop.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.laptop.rotation],
    scale: DEFAULT_ROOM_LAYOUT.laptop.scale,
  },
  brain: {
    position: [...DEFAULT_ROOM_LAYOUT.brain.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.brain.rotation],
    scale: DEFAULT_ROOM_LAYOUT.brain.scale,
  },
  smartphone: {
    position: [...DEFAULT_ROOM_LAYOUT.smartphone.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.smartphone.rotation],
    scale: DEFAULT_ROOM_LAYOUT.smartphone.scale,
  },
  coffee: {
    position: [...DEFAULT_ROOM_LAYOUT.coffee.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.coffee.rotation],
    scale: DEFAULT_ROOM_LAYOUT.coffee.scale,
  },
  resume: {
    position: [...DEFAULT_ROOM_LAYOUT.resume.position],
    rotation: [...DEFAULT_ROOM_LAYOUT.resume.rotation],
    scale: DEFAULT_ROOM_LAYOUT.resume.scale,
  },
});

const sanitizeTuple = (
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

export const loadRoomLayout = (): RoomLayoutState => {
  const base = cloneDefaultRoomLayout();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<RoomItemId, Partial<RoomItemTransform>>>;
    for (const meta of ROOM_ITEMS_META) {
      const saved = parsed?.[meta.id];
      if (!saved || typeof saved !== 'object') continue;
      const sc = Number(saved.scale);
      base[meta.id] = {
        position: sanitizeTuple(saved.position, base[meta.id].position),
        rotation: sanitizeTuple(saved.rotation, base[meta.id].rotation),
        scale: Number.isFinite(sc) && sc > 0.05 && sc < 10 ? sc : base[meta.id].scale,
      };
    }
    return base;
  } catch {
    return base;
  }
};

export const saveRoomLayout = (layout: RoomLayoutState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage quota errors
  }
};

export const clearRoomLayout = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};
