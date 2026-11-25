import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Repeat,
  Video,
  X,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { CameraTourStop } from '../../utils/cameraTourStore';
import { playClickSound, playHoverSound } from '../../utils/soundEngine';

interface CameraTourBarProps {
  stops: CameraTourStop[];
  currentIndex: number;
  playing: boolean;
  loop: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleLoop: () => void;
  onExit: () => void;
}

export const CameraTourBar: React.FC<CameraTourBarProps> = ({
  stops,
  currentIndex,
  playing,
  loop,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleLoop,
  onExit,
}) => {
  const { language } = useLanguage();
  const safeIndex = stops.length > 0 ? ((currentIndex % stops.length) + stops.length) % stops.length : 0;
  const activeStop = stops[safeIndex];

  const labels = {
    tour: language === 'es' ? 'Tour 3D' : language === 'zh' ? '3D 导览' : '3D Tour',
    play: language === 'es' ? 'Reproducir' : language === 'zh' ? '播放' : 'Play',
    pause: language === 'es' ? 'Pausar' : language === 'zh' ? '暂停' : 'Pause',
    prev: language === 'es' ? 'Anterior' : language === 'zh' ? '上一镜' : 'Previous',
    next: language === 'es' ? 'Siguiente' : language === 'zh' ? '下一镜' : 'Next',
    loop: language === 'es' ? 'Repetir ciclo' : language === 'zh' ? '循环' : 'Loop tour',
    exit: language === 'es' ? 'Salir del tour' : language === 'zh' ? '退出导览' : 'Exit tour',
  };

  if (!activeStop) return null;

  return (
    <div
      role="region"
      aria-label={labels.tour}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-[94vw] rounded-2xl border border-cyan-400/35 bg-[#070b14]/95 px-3 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.8)] flex items-center gap-2 text-white font-mono"
    >
      <div className="flex items-center gap-2 pl-1 pr-2 border-r border-white/10 min-w-0">
        <Video className="w-4 h-4 text-cyan-300 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-cyan-200 truncate max-w-[140px] sm:max-w-[200px]">
            {activeStop.name}
          </div>
          <div className="text-[10px] text-gray-400 tabular-nums">
            {safeIndex + 1} / {stops.length}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPrev();
          }}
          onMouseEnter={playHoverSound}
          aria-label={labels.prev}
          title={labels.prev}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onTogglePlay();
          }}
          onMouseEnter={playHoverSound}
          aria-label={playing ? labels.pause : labels.play}
          title={playing ? labels.pause : labels.play}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-colors"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{playing ? labels.pause : labels.play}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onNext();
          }}
          onMouseEnter={playHoverSound}
          aria-label={labels.next}
          title={labels.next}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-200 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onToggleLoop();
          }}
          onMouseEnter={playHoverSound}
          aria-pressed={loop}
          aria-label={labels.loop}
          title={labels.loop}
          className={`p-1.5 rounded-lg border transition-colors ${
            loop
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onExit();
          }}
          onMouseEnter={playHoverSound}
          aria-label={labels.exit}
          title={labels.exit}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/25 border border-white/10 hover:border-rose-400/40 text-gray-300 hover:text-rose-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CameraTourBar;
