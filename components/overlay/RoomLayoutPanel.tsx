import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Box,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Magnet,
  Maximize2,
  Move,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  RotateCw,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CAMERA_POSITIONS } from '../../constants';
import type { Section } from '../../types';
import {
  ROOM_ITEMS_META,
  type RoomItemId,
  type RoomItemTransform,
  type RoomLayoutState,
  type TransformGizmoMode,
} from '../../utils/roomLayoutStore';
import type {
  CameraBridge,
  CameraPose,
  CameraStudioConfig,
  CameraTourStop,
} from '../../utils/cameraTourStore';
import { playClickSound, playHoverSound } from '../../utils/soundEngine';

type PanelTab = 'objects' | 'camera';

interface RoomLayoutPanelProps {
  layout: RoomLayoutState;
  selectedItem: RoomItemId;
  onSelectItem: (id: RoomItemId) => void;
  gizmoMode: TransformGizmoMode;
  onChangeGizmoMode: (mode: TransformGizmoMode) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  onUpdateItem: (id: RoomItemId, next: RoomItemTransform) => void;
  onResetItem: (id: RoomItemId) => void;
  onResetAll: () => void;
  cameraConfig: CameraStudioConfig;
  cameraBridgeRef: React.MutableRefObject<CameraBridge | null>;
  tourPlaying: boolean;
  tourStopIndex: number;
  onSelectTourStop: (idx: number) => void;
  onToggleTourPlay: () => void;
  onChangeCameraConfig: (next: CameraStudioConfig) => void;
  onResetCameraConfig: () => void;
  onClose: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const radToDeg = (r: number) => Math.round((r * 180) / Math.PI);
const degToRad = (d: number) => (d * Math.PI) / 180;

const SECTION_META: { id: Section; labels: { en: string; es: string; zh: string } }[] = [
  { id: 'home', labels: { en: 'Home', es: 'Inicio', zh: '首页' } },
  { id: 'projects', labels: { en: 'Projects', es: 'Proyectos', zh: '项目' } },
  { id: 'about', labels: { en: 'About IA', es: 'IA', zh: '关于 AI' } },
  { id: 'library', labels: { en: 'Library', es: 'Biblioteca', zh: '知识库' } },
  { id: 'contact', labels: { en: 'Contact', es: 'Contacto', zh: '联系' } },
];

export const RoomLayoutPanel: React.FC<RoomLayoutPanelProps> = ({
  layout,
  selectedItem,
  onSelectItem,
  gizmoMode,
  onChangeGizmoMode,
  snapEnabled,
  onToggleSnap,
  onUpdateItem,
  onResetItem,
  onResetAll,
  cameraConfig,
  cameraBridgeRef,
  tourPlaying,
  tourStopIndex,
  onSelectTourStop,
  onToggleTourPlay,
  onChangeCameraConfig,
  onResetCameraConfig,
  onClose,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<PanelTab>('camera');
  const [copied, setCopied] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section>('home');

  const current = layout[selectedItem];
  const stops = cameraConfig.tourStops;
  const safeStopIndex = stops.length > 0 ? Math.min(Math.max(0, tourStopIndex), stops.length - 1) : 0;
  const activeStop = stops[safeStopIndex] ?? null;

  const copyText = {
    title:
      language === 'es'
        ? 'Estudio 3D & Cámara'
        : language === 'zh'
        ? '3D 场景与镜头工作室'
        : '3D Room & Camera Studio',
    tabObjects: language === 'es' ? 'Objetos 3D' : language === 'zh' ? '3D 物体' : '3D Objects',
    tabCamera: language === 'es' ? 'Cámara y Tour' : language === 'zh' ? '镜头与导览' : 'Camera & Tour',
    hintObjects:
      language === 'es'
        ? 'Clic en un objeto o arrastra flechas · G Mover · R Rotar · S Escalar'
        : language === 'zh'
        ? '点击物体或拖动轴 · G 移动 · R 旋转 · S 缩放'
        : 'Click object or drag gizmo · G Move · R Rotate · S Scale',
    hintCamera:
      language === 'es'
        ? 'Mueve la cámara libremente y captura tomas exactas para el tour o secciones.'
        : language === 'zh'
        ? '自由调整镜头角度并采集精准机位，生成巡游路径或区块视角。'
        : 'Orbit/zoom freely and capture exact camera stops & section views.',
    translate: language === 'es' ? 'Mover' : language === 'zh' ? '移动' : 'Move',
    rotate: language === 'es' ? 'Rotar' : language === 'zh' ? '旋转' : 'Rotate',
    scale: language === 'es' ? 'Escala' : language === 'zh' ? '缩放' : 'Scale',
    position: language === 'es' ? 'Posición' : language === 'zh' ? '位置' : 'Position',
    rotation: language === 'es' ? 'Rotación (°)' : language === 'zh' ? '旋转 (°)' : 'Rotation (°)',
    snap: language === 'es' ? 'Imán' : language === 'zh' ? '吸附' : 'Snap',
    resetItem: language === 'es' ? 'Resetear pieza' : language === 'zh' ? '重置当前' : 'Reset item',
    resetAll: language === 'es' ? 'Resetear todo' : language === 'zh' ? '全部重置' : 'Reset all',
    copyCoords: language === 'es' ? 'Copiar JSON' : language === 'zh' ? '复制 JSON' : 'Copy JSON',
    copied: language === 'es' ? 'Copiado' : language === 'zh' ? '已复制' : 'Copied',
    done: language === 'es' ? 'Listo' : language === 'zh' ? '完成' : 'Done',
    tourHeading: language === 'es' ? 'Tour Cinematográfico' : language === 'zh' ? '镜头巡游序列' : 'Cinematic Tour',
    addStop: language === 'es' ? 'Agregar toma' : language === 'zh' ? '添加机位' : 'Add stop',
    capturePose: language === 'es' ? 'Usar vista actual' : language === 'zh' ? '采集当前镜头' : 'Use live view',
    previewPose: language === 'es' ? 'Ver toma' : language === 'zh' ? '预览' : 'Preview',
    duration: language === 'es' ? 'Vuelo (s)' : language === 'zh' ? '过渡 (秒)' : 'Flight (s)',
    hold: language === 'es' ? 'Pausa (s)' : language === 'zh' ? '停留 (秒)' : 'Hold (s)',
    orbit: language === 'es' ? 'Órbita (°/s)' : language === 'zh' ? '环绕 (°/秒)' : 'Orbit (°/s)',
    target: language === 'es' ? 'Objetivo (Look-At)' : language === 'zh' ? '注视点' : 'Target (Look-At)',
    sectionsHeading: language === 'es' ? 'Vistas por Sección' : language === 'zh' ? '区块视角设定' : 'Section Views',
    captureSection: language === 'es' ? 'Fijar vista actual' : language === 'zh' ? '设为当前镜头' : 'Save view',
    goSection: language === 'es' ? 'Ir' : language === 'zh' ? '跳转' : 'Go',
    customTag: language === 'es' ? 'Personalizada' : language === 'zh' ? '已自定义' : 'Custom',
    defaultTag: language === 'es' ? 'Base' : language === 'zh' ? '默认' : 'Default',
    resetCameraAll: language === 'es' ? 'Resetear cámaras' : language === 'zh' ? '重置镜头' : 'Reset cameras',
  };

  const updatePos = (axis: 0 | 1 | 2, value: number) => {
    if (!Number.isFinite(value)) return;
    const nextPos: [number, number, number] = [...current.position];
    nextPos[axis] = round2(value);
    onUpdateItem(selectedItem, { ...current, position: nextPos });
  };

  const updateRotDeg = (axis: 0 | 1 | 2, deg: number) => {
    if (!Number.isFinite(deg)) return;
    const nextRot: [number, number, number] = [...current.rotation];
    nextRot[axis] = degToRad(deg);
    onUpdateItem(selectedItem, { ...current, rotation: nextRot });
  };

  const updateScale = (value: number) => {
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(0.1, Math.min(4, round2(value)));
    onUpdateItem(selectedItem, { ...current, scale: clamped });
  };

  const handleCopyJson = async () => {
    playClickSound();
    const formattedLayout: Record<string, RoomItemTransform> = {};
    for (const meta of ROOM_ITEMS_META) {
      const item = layout[meta.id];
      formattedLayout[meta.id] = {
        position: [round2(item.position[0]), round2(item.position[1]), round2(item.position[2])],
        rotation: [round2(item.rotation[0]), round2(item.rotation[1]), round2(item.rotation[2])],
        scale: round2(item.scale),
      };
    }
    const payload = {
      roomLayout: formattedLayout,
      cameraConfig,
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateActiveStop = (patch: Partial<CameraTourStop>) => {
    if (!activeStop) return;
    const nextStops = stops.map((s, idx) => (idx === safeStopIndex ? { ...s, ...patch } : s));
    onChangeCameraConfig({ ...cameraConfig, tourStops: nextStops });
  };

  const handleAddStopHere = () => {
    playClickSound();
    const pose = cameraBridgeRef.current?.getCurrentPose();
    const fallbackPose: CameraPose = activeStop
      ? { position: [...activeStop.position], target: [...activeStop.target] }
      : { position: [0, 4.5, 9], target: [0, 1.2, -0.5] };
    const captured = pose ?? fallbackPose;
    const newStop: CameraTourStop = {
      id: `stop-${Date.now()}`,
      name: language === 'es' ? `Toma ${stops.length + 1}` : language === 'zh' ? `机位 ${stops.length + 1}` : `Stop ${stops.length + 1}`,
      position: [...captured.position],
      target: [...captured.target],
      duration: 2.2,
      hold: 1.8,
      orbitSpeed: 6,
    };
    const nextStops = [...stops, newStop];
    onChangeCameraConfig({ ...cameraConfig, tourStops: nextStops });
    onSelectTourStop(nextStops.length - 1);
  };

  const handleCaptureToActiveStop = () => {
    playClickSound();
    const pose = cameraBridgeRef.current?.getCurrentPose();
    if (!pose || !activeStop) return;
    updateActiveStop({ position: [...pose.position], target: [...pose.target] });
  };

  const handlePreviewStop = (idx: number) => {
    playClickSound();
    onSelectTourStop(idx);
    const stop = stops[idx];
    if (stop) {
      cameraBridgeRef.current?.flyToPose(
        { position: stop.position, target: stop.target },
        true
      );
    }
  };

  const handleMoveStop = (idx: number, dir: -1 | 1) => {
    playClickSound();
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= stops.length) return;
    const nextStops = [...stops];
    const [moved] = nextStops.splice(idx, 1);
    nextStops.splice(targetIdx, 0, moved);
    onChangeCameraConfig({ ...cameraConfig, tourStops: nextStops });
    onSelectTourStop(targetIdx);
  };

  const handleDeleteStop = (idx: number) => {
    if (stops.length <= 1) return;
    playClickSound();
    const nextStops = stops.filter((_, i) => i !== idx);
    onChangeCameraConfig({ ...cameraConfig, tourStops: nextStops });
    onSelectTourStop(Math.min(idx, nextStops.length - 1));
  };

  const handleCaptureSection = () => {
    playClickSound();
    const pose = cameraBridgeRef.current?.getCurrentPose();
    if (!pose) return;
    onChangeCameraConfig({
      ...cameraConfig,
      sections: {
        ...cameraConfig.sections,
        [selectedSection]: {
          position: [...pose.position],
          target: [...pose.target],
        },
      },
    });
  };

  const handleGoSection = () => {
    playClickSound();
    const saved = cameraConfig.sections[selectedSection];
    const targetPose = saved ?? CAMERA_POSITIONS[selectedSection];
    cameraBridgeRef.current?.flyToPose(targetPose, true);
  };

  const handleClearSection = () => {
    playClickSound();
    const nextSections = { ...cameraConfig.sections };
    delete nextSections[selectedSection];
    onChangeCameraConfig({ ...cameraConfig, sections: nextSections });
  };

  return (
    <aside
      aria-label={copyText.title}
      className="fixed left-4 right-4 bottom-4 md:left-6 md:right-auto md:top-24 md:bottom-auto md:w-[340px] z-50 pointer-events-auto rounded-2xl border border-cyan-400/30 bg-[#070b14]/95 shadow-[0_12px_40px_rgba(0,0,0,0.8)] p-4 text-white space-y-3 max-h-[62vh] md:max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
        <div>
          <h3 className="text-sm font-mono font-bold text-cyan-300 tracking-wide">
            {copyText.title}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
            {activeTab === 'objects' ? copyText.hintObjects : copyText.hintCamera}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          aria-label={copyText.done}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Studio Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/50 border border-white/10">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveTab('objects');
          }}
          className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
            activeTab === 'objects'
              ? 'bg-cyan-400 text-black'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>{copyText.tabObjects}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveTab('camera');
          }}
          className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
            activeTab === 'camera'
              ? 'bg-cyan-400 text-black'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>{copyText.tabCamera}</span>
        </button>
      </div>

      {activeTab === 'objects' ? (
        <>
          {/* Mode Switcher + Snap */}
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'translate', label: copyText.translate, Icon: Move },
                { id: 'rotate', label: copyText.rotate, Icon: RotateCw },
                { id: 'scale', label: copyText.scale, Icon: Maximize2 },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = gizmoMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onChangeGizmoMode(id);
                  }}
                  onMouseEnter={playHoverSound}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    active
                      ? 'bg-cyan-400 text-black border-cyan-300'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onToggleSnap();
              }}
              aria-pressed={snapEnabled}
              title={copyText.snap}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                snapEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{copyText.snap}</span>
            </button>
          </div>

          {/* Object Selector Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {ROOM_ITEMS_META.map((item) => {
              const isSelected = selectedItem === item.id;
              const label = item.labels[language] || item.labels.en;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onSelectItem(item.id);
                  }}
                  onMouseEnter={playHoverSound}
                  className={`px-2.5 py-1.5 rounded-lg border text-left text-xs font-mono truncate transition-all ${
                    isSelected
                      ? `bg-white/15 text-white ${item.accentClass} shadow-[0_0_12px_rgba(34,211,238,0.2)]`
                      : 'bg-white/[0.03] text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Numeric Precision Inputs */}
          <div className="space-y-2.5 pt-1 border-t border-white/10">
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1">
                <span>{copyText.position}</span>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onUpdateItem(selectedItem, {
                      ...current,
                      position: [0, current.position[1], 0],
                    });
                  }}
                  className="text-cyan-400 hover:underline"
                >
                  X/Z = 0
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['X', 'Y', 'Z'] as const).map((axisLabel, idx) => {
                  const axis = idx as 0 | 1 | 2;
                  return (
                    <label
                      key={axisLabel}
                      className="flex items-center gap-1 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-xs font-mono"
                    >
                      <span className="text-gray-400">{axisLabel}</span>
                      <input
                        type="number"
                        step={snapEnabled ? 0.25 : 0.1}
                        value={round2(current.position[axis])}
                        onChange={(e) => updatePos(axis, parseFloat(e.target.value))}
                        className="w-full bg-transparent text-white text-right focus:outline-none tabular-nums"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-gray-400 mb-1">{copyText.rotation}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['X', 'Y', 'Z'] as const).map((axisLabel, idx) => {
                  const axis = idx as 0 | 1 | 2;
                  return (
                    <label
                      key={axisLabel}
                      className="flex items-center gap-1 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-xs font-mono"
                    >
                      <span className="text-gray-400">{axisLabel}</span>
                      <input
                        type="number"
                        step={snapEnabled ? 15 : 5}
                        value={radToDeg(current.rotation[axis])}
                        onChange={(e) => updateRotDeg(axis, parseFloat(e.target.value))}
                        className="w-full bg-transparent text-white text-right focus:outline-none tabular-nums"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1">
                <span>{copyText.scale}</span>
                <span className="text-cyan-300 tabular-nums">{round2(current.scale)}x</span>
              </div>
              <input
                type="range"
                min={0.15}
                max={2.5}
                step={0.05}
                value={current.scale}
                onChange={(e) => updateScale(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Object Footer Actions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onResetItem(selectedItem);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-mono text-gray-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{copyText.resetItem}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onResetAll();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-[11px] font-mono text-gray-300 hover:text-rose-200 transition-colors"
            >
              <span>{copyText.resetAll}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[11px] font-mono text-cyan-200 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? copyText.copied : copyText.copyCoords}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* --- CAMERA TOUR STUDIO TAB --- */}
          <div className="space-y-2.5">
            {/* Tour Transport Bar */}
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                {copyText.tourHeading}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePreviewStop((safeStopIndex - 1 + stops.length) % stops.length)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-200"
                  title="Prev"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onToggleTourPlay();
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    tourPlaying
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-cyan-400 text-black border-cyan-300 hover:bg-cyan-300'
                  }`}
                >
                  {tourPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{tourPlaying ? 'Pausa' : 'Tour'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePreviewStop((safeStopIndex + 1) % stops.length)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-200"
                  title="Next"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onChangeCameraConfig({ ...cameraConfig, tourLoop: !cameraConfig.tourLoop });
                  }}
                  aria-pressed={cameraConfig.tourLoop}
                  title="Loop"
                  className={`p-1.5 rounded-lg border transition-colors ${
                    cameraConfig.tourLoop
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tour Waypoints List */}
            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
              {stops.map((stop, idx) => {
                const isSelected = idx === safeStopIndex;
                return (
                  <div
                    key={stop.id}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-white'
                        : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handlePreviewStop(idx)}
                      className="flex-1 text-left truncate flex items-center gap-1.5"
                    >
                      <span className="text-[10px] text-cyan-400 tabular-nums">{idx + 1}.</span>
                      <span className="truncate">{stop.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStop(idx, -1)}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStop(idx, 1)}
                      disabled={idx === stops.length - 1}
                      className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStop(idx)}
                      disabled={stops.length <= 1}
                      className="p-0.5 text-gray-400 hover:text-rose-300 disabled:opacity-30"
                      aria-label="Delete stop"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddStopHere}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-dashed border-cyan-400/40 text-xs font-mono text-cyan-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{copyText.addStop}</span>
            </button>

            {/* Selected Stop Detail Editor */}
            {activeStop && (
              <div className="space-y-2 rounded-xl bg-black/45 border border-white/10 p-2.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={activeStop.name}
                    onChange={(e) => updateActiveStop({ name: e.target.value })}
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400/60"
                  />
                  <button
                    type="button"
                    onClick={handleCaptureToActiveStop}
                    title={copyText.capturePose}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-[11px] font-mono text-cyan-200 shrink-0"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{copyText.capturePose}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreviewStop(safeStopIndex)}
                    title={copyText.previewPose}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-200 shrink-0"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>

                {/* Timing + Orbital Drift */}
                <div className="grid grid-cols-3 gap-1.5">
                  <label className="rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-[10px] font-mono text-gray-400">
                    <div>{copyText.duration}</div>
                    <input
                      type="number"
                      min={0.4}
                      max={15}
                      step={0.2}
                      value={round2(activeStop.duration)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v)) updateActiveStop({ duration: Math.max(0.4, Math.min(15, v)) });
                      }}
                      className="w-full bg-transparent text-white text-xs focus:outline-none tabular-nums"
                    />
                  </label>
                  <label className="rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-[10px] font-mono text-gray-400">
                    <div>{copyText.hold}</div>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.2}
                      value={round2(activeStop.hold)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v)) updateActiveStop({ hold: Math.max(0, Math.min(20, v)) });
                      }}
                      className="w-full bg-transparent text-white text-xs focus:outline-none tabular-nums"
                    />
                  </label>
                  <label className="rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-[10px] font-mono text-gray-400">
                    <div>{copyText.orbit}</div>
                    <input
                      type="number"
                      min={-45}
                      max={45}
                      step={1}
                      value={Math.round(activeStop.orbitSpeed)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v)) updateActiveStop({ orbitSpeed: Math.max(-45, Math.min(45, v)) });
                      }}
                      className="w-full bg-transparent text-white text-xs focus:outline-none tabular-nums"
                    />
                  </label>
                </div>

                {/* Camera Position & Look-At Target */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-gray-400">{copyText.position}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['X', 'Y', 'Z'] as const).map((axisLabel, idx) => {
                      const axis = idx as 0 | 1 | 2;
                      return (
                        <label
                          key={axisLabel}
                          className="flex items-center gap-1 rounded bg-black/50 border border-white/10 px-1.5 py-0.5 text-[11px] font-mono"
                        >
                          <span className="text-gray-500">{axisLabel}</span>
                          <input
                            type="number"
                            step={0.2}
                            value={round2(activeStop.position[axis])}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!Number.isFinite(v)) return;
                              const next: [number, number, number] = [...activeStop.position];
                              next[axis] = round2(v);
                              updateActiveStop({ position: next });
                            }}
                            className="w-full bg-transparent text-white text-right focus:outline-none tabular-nums"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400">{copyText.target}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['X', 'Y', 'Z'] as const).map((axisLabel, idx) => {
                      const axis = idx as 0 | 1 | 2;
                      return (
                        <label
                          key={axisLabel}
                          className="flex items-center gap-1 rounded bg-black/50 border border-white/10 px-1.5 py-0.5 text-[11px] font-mono"
                        >
                          <span className="text-gray-500">{axisLabel}</span>
                          <input
                            type="number"
                            step={0.2}
                            value={round2(activeStop.target[axis])}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!Number.isFinite(v)) return;
                              const next: [number, number, number] = [...activeStop.target];
                              next[axis] = round2(v);
                              updateActiveStop({ target: next });
                            }}
                            className="w-full bg-transparent text-white text-right focus:outline-none tabular-nums"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Section Camera Framing Overrides */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-pink-300 font-bold">
                  {copyText.sectionsHeading}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  {cameraConfig.sections[selectedSection] ? copyText.customTag : copyText.defaultTag}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {SECTION_META.map((sec) => {
                  const active = selectedSection === sec.id;
                  const customized = Boolean(cameraConfig.sections[sec.id]);
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedSection(sec.id);
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                        active
                          ? 'bg-pink-500/25 border-pink-400 text-white'
                          : customized
                          ? 'bg-emerald-500/10 border-emerald-400/35 text-emerald-200'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {sec.labels[language] || sec.labels.en}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCaptureSection}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/35 border border-pink-400/40 text-[11px] font-mono text-pink-200 transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  <span>{copyText.captureSection}</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoSection}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-mono text-gray-200 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>{copyText.goSection}</span>
                </button>
                {cameraConfig.sections[selectedSection] && (
                  <button
                    type="button"
                    onClick={handleClearSection}
                    title={copyText.resetItem}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 text-gray-300 hover:text-rose-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Camera Footer Actions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onResetCameraConfig();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-[11px] font-mono text-gray-300 hover:text-rose-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{copyText.resetCameraAll}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[11px] font-mono text-cyan-200 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? copyText.copied : copyText.copyCoords}</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
};

export default RoomLayoutPanel;
