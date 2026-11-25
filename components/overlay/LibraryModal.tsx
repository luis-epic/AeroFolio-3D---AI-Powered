import React, { lazy, Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LibraryItem } from '../../types';
import { NOTEBOOK_VAULT } from '../../data/knowledgeVault';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  BookOpen,
  ExternalLink,
  Sparkles,
  Terminal,
  BookmarkCheck,
  Layers,
  BrainCircuit,
  MessageSquare,
  FileText,
  HardDrive,
} from 'lucide-react';
import { playHoverSound, playClickSound } from '../../utils/soundEngine';

const DriveGlbVault = lazy(() => import('./DriveGlbVault'));

interface LibraryModalProps {
  title: string;
  subtitle: string;
  items: LibraryItem[];
  filterLabels: {
    all: string;
    arch: string;
    threeD: string;
    ai: string;
    ui: string;
  };
  readLinkLabel: string;
  statusLabel: string;
  onAskAI?: (prompt: string) => void;
  initialTab?: 'notebooks' | 'books' | 'drive';
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  title,
  subtitle,
  items,
  filterLabels,
  readLinkLabel,
  statusLabel,
  onAskAI,
  initialTab = 'notebooks',
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'books' | 'notebooks' | 'drive'>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const categories = [
    { id: 'all', label: filterLabels.all },
    { id: 'Systems & Architecture', label: filterLabels.arch },
    { id: '3D & Creative Web', label: filterLabels.threeD },
    { id: 'Generative AI & LLMs', label: filterLabels.ai },
    { id: 'UI & Product Engineering', label: filterLabels.ui },
  ];

  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'all') return true;
    return (
      item.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      selectedCategory.toLowerCase().includes(item.category.toLowerCase())
    );
  });

  const filteredNotebooks = NOTEBOOK_VAULT.filter((nb) => {
    if (selectedCategory === 'all') return true;
    return (
      nb.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      selectedCategory.toLowerCase().includes(nb.category.toLowerCase())
    );
  });

  const tabLabels = {
    notebooks:
      language === 'es'
        ? 'Cuadernos NotebookLM (5)'
        : language === 'zh'
        ? 'NotebookLM 笔记档案 (5)'
        : 'NotebookLM Notebooks (5)',
    books:
      language === 'es'
        ? 'Bibliografía Fundamental (5)'
        : language === 'zh'
        ? '核心文献与经典 (5)'
        : 'Foundational Books (5)',
    drive:
      language === 'es'
        ? 'Google Drive 3D (.glb)'
        : language === 'zh'
        ? 'Google Drive 3D 模型 (.glb)'
        : 'Google Drive 3D (.glb)',
  };

  const askAiButtonLabel =
    language === 'es'
      ? 'Consultar a la IA'
      : language === 'zh'
      ? '向 AI 助手提问'
      : 'Ask AI Assistant';

  const notebookSourceLabel =
    language === 'es'
      ? 'Cuaderno Activo en NotebookLM'
      : language === 'zh'
      ? 'NotebookLM 在线笔记库'
      : 'Live NotebookLM Corpus';

  return (
    <div className="flex flex-col h-full max-h-[85vh] text-left">
      {/* Modal Header */}
      <div className="flex-shrink-0 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-1.5">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>CYBER_KNOWLEDGE_VAULT // V2.5</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-sans tracking-tight text-white flex items-center gap-3">
          {title}
        </h2>
        <p className="text-gray-400 text-sm mt-1 font-sans max-w-2xl">{subtitle}</p>

        {/* Primary View Toggle: Notebooks vs Foundational Literature */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => {
              setActiveTab('notebooks');
              playClickSound();
            }}
            onMouseEnter={playHoverSound}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === 'notebooks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-cyan-400" />
            <span>{tabLabels.notebooks}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('books');
              playClickSound();
            }}
            onMouseEnter={playHoverSound}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === 'books'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>{tabLabels.books}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('drive');
              playClickSound();
            }}
            onMouseEnter={playHoverSound}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === 'drive'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>{tabLabels.drive}</span>
          </button>
        </div>

        {/* Category Filters (Books & Notebooks only) */}
        {activeTab !== 'drive' && (
          <div className="flex flex-wrap gap-2 mt-3 pt-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    playClickSound();
                  }}
                  onMouseEnter={playHoverSound}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Layers className="w-3 h-3 opacity-70" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards Scrollable Grid */}
      <div className="flex-grow overflow-y-auto custom-scrollbar py-6 pr-1 space-y-4">
        {/* TAB 0: GOOGLE DRIVE 3D (.GLB) VAULT */}
        {activeTab === 'drive' && (
          <Suspense
            fallback={
              <div className="py-12 text-center text-xs font-mono text-cyan-300">
                Loading Google Drive 3D Vault...
              </div>
            }
          >
            <DriveGlbVault />
          </Suspense>
        )}
        {/* TAB 1: NOTEBOOKLM NOTEBOOKS */}
        {activeTab === 'notebooks' && (
          <AnimatePresence mode="popLayout">
            {filteredNotebooks.map((nb, index) => {
              const summaryText = nb.summary[language] || nb.summary.en;
              const takeawaysList = nb.keyTakeaways[language] || nb.keyTakeaways.en;
              const sampleNote = nb.sampleNotes[language] || nb.sampleNotes.en;

              return (
                <motion.div
                  key={nb.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  onMouseEnter={playHoverSound}
                  className="relative group rounded-xl p-5 bg-gradient-to-br from-cyan-950/20 via-white/[0.04] to-white/[0.02] border border-cyan-500/20 hover:border-cyan-400/50 hover:bg-white/[0.07] transition-all duration-300 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                >
                  {/* Glowing vertical spine bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 via-sky-400 to-indigo-500 rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2.5 flex-grow pl-1">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-medium">
                          {nb.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono text-[11px] flex items-center gap-1">
                          <BrainCircuit className="w-3 h-3" />
                          {nb.sourceBadge}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400/90 ml-auto">
                          <BookmarkCheck className="w-3 h-3" />
                          {notebookSourceLabel}
                        </span>
                      </div>

                      {/* Title */}
                      <div>
                        <h3 className="text-lg md:text-xl font-bold font-sans text-white group-hover:text-cyan-200 transition-colors flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          {nb.title}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {nb.topics.map((t, tidx) => (
                            <span
                              key={tidx}
                              className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-cyan-300/80 border border-cyan-400/10"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-gray-300 text-sm leading-relaxed font-sans">{summaryText}</p>

                      {/* Key Engineering Takeaways */}
                      <div className="p-3.5 rounded-lg bg-black/50 border border-cyan-500/15 space-y-1.5">
                        <div className="text-xs text-cyan-300 font-mono font-semibold flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                          <span>NotebookLM Key Takeaways:</span>
                        </div>
                        <ul className="text-xs text-gray-300 space-y-1 font-sans pl-5 list-disc marker:text-cyan-400">
                          {takeawaysList.map((t, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Highlighted Author Note */}
                      <div className="p-2.5 rounded-md bg-indigo-950/30 border border-indigo-500/20 text-xs font-mono text-indigo-200/90 italic">
                        "{sampleNote}"
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 pt-2 md:pt-0">
                      {/* Ask AI Button */}
                      {onAskAI && (
                        <button
                          onClick={() => {
                            playClickSound();
                            const askPrompt =
                              language === 'es'
                                ? `Explícame en detalle qué tienes en tu cuaderno de NotebookLM sobre "${nb.title}" y cómo lo aplicas en tus proyectos.`
                                : language === 'zh'
                                ? `请详细介绍你在 NotebookLM 笔记《${nb.title}》中记录的核心要点，以及你如何在项目中落地应用。`
                                : `Explain in detail what you documented in your NotebookLM notebook about "${nb.title}" and how you apply it to your software projects.`;
                            onAskAI(askPrompt);
                          }}
                          onMouseEnter={playHoverSound}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] whitespace-nowrap"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{askAiButtonLabel}</span>
                        </button>
                      )}

                      {/* Open NotebookLM Link */}
                      <a
                        href={nb.notebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={playClickSound}
                        onMouseEnter={playHoverSound}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium transition-all border border-white/15 whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>NotebookLM</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* TAB 2: FOUNDATIONAL BOOKS */}
        {activeTab === 'books' && (
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                onMouseEnter={playHoverSound}
                className="relative group rounded-xl p-5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-cyan-400/40 hover:bg-white/[0.08] transition-all duration-300 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              >
                {/* Glowing vertical spine bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 via-indigo-500 to-emerald-400 rounded-l-xl opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-grow pl-1">
                    {/* Category and badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                        {item.category}
                      </span>
                      {item.year && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10 font-mono text-[11px]">
                          {item.year}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400/90 ml-auto">
                        <BookmarkCheck className="w-3 h-3" />
                        {statusLabel}
                      </span>
                    </div>

                    {/* Title & Author */}
                    <div>
                      <h3 className="text-lg md:text-xl font-bold font-sans text-white group-hover:text-cyan-200 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs md:text-sm font-mono text-cyan-400/80 mt-0.5">
                        by {item.author}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-gray-300 text-sm leading-relaxed font-sans">{item.description}</p>

                    {/* Engineering Takeaway Box */}
                    <div className="mt-3 p-3 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
                      <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="text-cyan-300 font-mono font-medium block mb-0.5">
                          Core Engineering Takeaway:
                        </span>
                        <span className="text-gray-300 font-sans leading-normal">{item.takeaway}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {item.tag.split(',').map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/5"
                        >
                          #{t.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Link */}
                  {item.link && (
                    <div className="md:self-center shrink-0 pt-2 md:pt-0">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={playClickSound}
                        onMouseEnter={playHoverSound}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-cyan-400 hover:text-black text-white text-xs font-mono font-bold transition-all border border-white/15 hover:border-cyan-300 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{readLinkLabel}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default LibraryModal;
