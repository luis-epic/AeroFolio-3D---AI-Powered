import React, { useEffect, useState } from 'react';
import { Check, Cpu, Film, Layers } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type LoadingStage = 'bundle' | 'models' | 'textures' | 'video' | 'ready';

export interface GlobalLoaderProps {
  ready: boolean;
  progress: number;
  stage: LoadingStage;
  liteMode: boolean;
}

const STAGE_COPY = {
  en: {
    title: 'AEROFOLIO // SPATIAL OS',
    stages: {
      bundle: 'INITIALIZING 3D ENGINE...',
      models: 'LOADING 3D ROOM & MODELS...',
      textures: 'PREPARING TEXTURES & SHADERS...',
      video: 'BUFFERING HOLOGRAPHIC VIDEO...',
      ready: 'ALL SYSTEMS READY.',
    },
    chips: {
      models: '3D Models',
      textures: 'Textures',
      video: 'Hero Video',
    },
  },
  es: {
    title: 'AEROFOLIO // SISTEMA ESPACIAL',
    stages: {
      bundle: 'INICIALIZANDO MOTOR 3D...',
      models: 'CARGANDO SALA Y MODELOS 3D...',
      textures: 'PREPARANDO TEXTURAS Y SHADERS...',
      video: 'CARGANDO VIDEO HOLOGRÁFICO...',
      ready: 'SISTEMA LISTO.',
    },
    chips: {
      models: 'Modelos 3D',
      textures: 'Texturas',
      video: 'Video Hero',
    },
  },
  zh: {
    title: 'AEROFOLIO // 空间系统',
    stages: {
      bundle: '正在初始化 3D 引擎...',
      models: '正在加载 3D 场景与模型...',
      textures: '正在准备纹理与着色器...',
      video: '正在缓冲全息视频...',
      ready: '所有资源已就绪。',
    },
    chips: {
      models: '3D 模型',
      textures: '纹理着色',
      video: '全息视频',
    },
  },
} as const;

const Loader: React.FC<GlobalLoaderProps> = ({ ready, progress, stage, liteMode }) => {
  const { language } = useLanguage();
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    if (!ready) {
      setUnmounted(false);
      return;
    }
    const timer = window.setTimeout(() => setUnmounted(true), 520);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (unmounted) return null;

  const copy = STAGE_COPY[language] ?? STAGE_COPY.en;
  const clamped = Math.min(100, Math.max(0, Math.round(ready ? 100 : progress)));
  const stageLabel = copy.stages[ready ? 'ready' : stage];

  const modelsDone = liteMode || stage === 'textures' || stage === 'video' || stage === 'ready' || ready;
  const texturesDone = liteMode || stage === 'video' || stage === 'ready' || ready;
  const videoDone = stage === 'ready' || ready;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={stageLabel}
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-[#03050a] px-6 transition-opacity duration-500 ease-out ${
        ready ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Subtle architectural cyber grid behind loader */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(0, 240, 255, 0.14), transparent 60%), linear-gradient(to right, rgba(34, 211, 238, 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 211, 238, 0.07) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />

      <div className="relative w-full max-w-md rounded-xl border border-cyan-500/30 bg-[#060a14]/95 px-7 py-6 shadow-[0_0_50px_rgba(0,240,255,0.12)]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        />

        <div className="mb-3 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] text-cyan-500/80">
          <span>{copy.title}</span>
          <span className="text-pink-400">BOOT.SEQ</span>
        </div>

        <div className="mb-4 flex items-baseline justify-between gap-3 font-mono text-xs tracking-wider text-cyan-300">
          <span className="truncate">{stageLabel}</span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-pink-400">{clamped}%</span>
        </div>

        {/* Unified Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full border border-cyan-900/60 bg-slate-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-pink-500 transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>

        {/* Asset synchronization checklist */}
        <div className="mt-5 grid grid-cols-3 gap-2 font-mono text-[10px]">
          {!liteMode && (
            <>
              <div
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors ${
                  modelsDone
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                    : 'border-white/10 bg-white/[0.03] text-slate-400'
                }`}
              >
                {modelsDone ? <Check className="h-3 w-3 shrink-0" /> : <Cpu className="h-3 w-3 shrink-0" />}
                <span className="truncate">{copy.chips.models}</span>
              </div>

              <div
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors ${
                  texturesDone
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                    : 'border-white/10 bg-white/[0.03] text-slate-400'
                }`}
              >
                {texturesDone ? <Check className="h-3 w-3 shrink-0" /> : <Layers className="h-3 w-3 shrink-0" />}
                <span className="truncate">{copy.chips.textures}</span>
              </div>
            </>
          )}

          <div
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors ${
              liteMode ? 'col-span-3 justify-center' : ''
            } ${
              videoDone
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-white/10 bg-white/[0.03] text-slate-400'
            }`}
          >
            {videoDone ? <Check className="h-3 w-3 shrink-0" /> : <Film className="h-3 w-3 shrink-0" />}
            <span className="truncate">{copy.chips.video}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loader;