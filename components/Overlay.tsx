
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Section, ChatMessage } from '../types';
import { generateAIResponse } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../translations';
import { playHoverSound, playClickSound, duckAmbient, unduckAmbient } from '../utils/soundEngine';
import { fetchGitHubProfile, type GitHubProfile, type GitHubFailureReason } from '../services/githubService';
import { Box, Mic, Volume2, VolumeX, Zap } from 'lucide-react';
import Navigation from './overlay/Navigation';
import StatsWidget from './overlay/StatsWidget';
import Hero from './overlay/Hero';
import ScrambleText from './overlay/ScrambleText';
import ContactLinks from './overlay/ContactLinks';
import { Projects } from './Projects';

interface OverlayProps {
  activeSection: Section;
  onClose: () => void;
  setActiveSection: (section: Section) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  heroEnded: boolean;
  liteMode: boolean;
  onToggleLiteMode: () => void;
}

// --- CUSTOM CURSOR COMPONENT (TACTICAL PRECISION) ---
const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  // Touch devices have no pointer to replace.
  const [enabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
  );
  // Hover comes from two sources (DOM controls and 3D objects); tracking them
  // separately keeps one from cancelling the other.
  const [domHover, setDomHover] = useState(false);
  const [sceneHover, setSceneHover] = useState(false);
  const hovering = domHover || sceneHover;
  const pos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('custom-cursor');

    const onMouseMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      // Show cursor on first move
      if (cursorRef.current) cursorRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    const onSceneHoverStart = () => setSceneHover(true);
    const onSceneHoverEnd = () => setSceneHover(false);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      setDomHover(Boolean(target?.closest?.('button:not(:disabled), a[href], input, textarea, select, [role="button"]')));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('cursor-hover-start', onSceneHoverStart);
    window.addEventListener('cursor-hover-end', onSceneHoverEnd);
    document.addEventListener('mouseover', onMouseOver);

    return () => {
      document.documentElement.classList.remove('custom-cursor');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('cursor-hover-start', onSceneHoverStart);
      window.removeEventListener('cursor-hover-end', onSceneHoverEnd);
      document.removeEventListener('mouseover', onMouseOver);
    };
  }, [enabled]);

  // Animation Loop for smooth trailing
  useEffect(() => {
    if (!enabled) return;
    let frame: number;
    const animate = () => {
      // INCREASED SPEED: Changed 0.15 to 0.35 for a snappier, responsive feel
      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.35;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.35;

      if (cursorRef.current && ringRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Central Dot - Always precise */}
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[100] -ml-[3px] -mt-[3px] opacity-0 transition-opacity duration-300 shadow-[0_0_10px_white]"
      />
      {/* Outer HUD Ring - Target Lock Effect */}
      <div 
        ref={ringRef}
        className={`fixed top-0 left-0 w-8 h-8 border pointer-events-none z-[100] -ml-4 -mt-4 opacity-0 transition-all duration-200 ease-out flex items-center justify-center
          ${hovering 
            ? 'scale-125 border-cyan-400 bg-cyan-400/10 rounded-sm rotate-45 border-2' // Diamond shape on hover
            : 'scale-100 border-white/50 rounded-full rotate-0 border-1' // Circle on idle
          }
        `}
      >
        {/* Crosshair decorators inside ring */}
        {hovering && (
            <>
                <div className="absolute w-[120%] h-[1px] bg-cyan-400/50"></div>
                <div className="absolute h-[120%] w-[1px] bg-cyan-400/50"></div>
            </>
        )}
      </div>
    </>
  );
};

// Extracted component to prevent re-renders on parent state change
const LanguageToggle: React.FC<{ language: Language; toggleLanguage: () => void }> = ({ language, toggleLanguage }) => {
  const getLanguageLabel = () => {
    if (language === 'en') return 'ENGLISH';
    if (language === 'es') return 'ESPAÑOL';
    return '中文';
  };

  return (
    <button 
      onClick={() => { toggleLanguage(); playClickSound(); }}
      onMouseEnter={playHoverSound}
      aria-label={`Change language. Current language: ${getLanguageLabel()}`}
      className={TOP_BUTTON_CLASS}
    >
      {getLanguageLabel()}
    </button>
  );
};

// Shared by the projects, assistant and contact panels so they read as one system.
const PANEL_HEADER_CLASS = 'px-5 pt-11 pb-4 md:px-6 border-b border-white/10 bg-gradient-to-r';
const PANEL_TITLE_CLASS = 'text-lg md:text-xl font-bold flex items-center gap-3 font-mono tracking-widest';
const PANEL_SUBTITLE_CLASS = 'text-[10px] uppercase tracking-[0.2em] ml-5';

const TOP_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-sm font-mono transition-all pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

// Switches between the 3D scene and the plain, lighter page.
const ViewToggle: React.FC<{ liteMode: boolean; onToggle: () => void; labels: { quickView: string; fullView: string } }> = ({ liteMode, onToggle, labels }) => {
  const Icon = liteMode ? Box : Zap;
  const label = liteMode ? labels.fullView : labels.quickView;
  return (
    <button
      type="button"
      onClick={() => { onToggle(); playClickSound(); }}
      onMouseEnter={playHoverSound}
      aria-label={label}
      title={label}
      className={`${TOP_BUTTON_CLASS} !px-2 !py-2`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
    </button>
  );
};

// Recruiter HUD delegates to extracted Navigation component
const RecruiterHUD: React.FC<{ 
  activeSection: Section; 
  onNavigate: (s: Section) => void;
  labels: Record<Section, string>;
  nextLabel: string;
  alwaysVisible: boolean;
}> = ({ activeSection, onNavigate, labels, nextLabel, alwaysVisible }) => (
  <Navigation
    activeSection={activeSection}
    onNavigate={onNavigate}
    labels={labels}
    nextLabel={nextLabel}
    alwaysVisible={alwaysVisible}
  />
);

const Overlay: React.FC<OverlayProps> = ({ activeSection, onClose, setActiveSection, soundOn, onToggleSound, heroEnded, liteMode, onToggleLiteMode }) => {
  const [visible, setVisible] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  
  // AI Chat State
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // GitHub Data State. `loading` is tracked separately from failure so the
  // stats widget can stop showing a spinner forever when the request fails.
  const [githubData, setGithubData] = useState<GitHubProfile | null>(null);
  const [githubError, setGithubError] = useState<GitHubFailureReason | null>(null);

  // TTS State
  const [isMuted, setIsMuted] = useState(false);

  // STT State (Speech to Text)
  const [isListening, setIsListening] = useState(false);

  // Esc to Close Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeSection !== 'home') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, onClose]);

  // TAB TITLE HIJACKING (Easter Egg)
  useEffect(() => {
    const originalTitle = document.title;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.title = "⚠️ Signal Lost... | AeroFolio";
      } else {
        document.title = originalTitle;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Fetch GitHub Data on Mount (Global)
  useEffect(() => {
  let cancelled = false;
    fetchGitHubProfile('luis-epic').then(result => {
      if (cancelled) return;
      if (result.status === 'success') {
        setGithubData(result.profile);
        setGithubError(null);
      } else {
        setGithubError(result.reason);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Reset chat on language change
  useEffect(() => {
    setChatHistory([{ role: 'model', text: t.about.initialMessage }]);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
  }, [language, t.about.initialMessage]);

  useEffect(() => {
    if (activeSection !== 'home') {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [activeSection]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (language === 'en') utterance.lang = 'en-US';
    else if (language === 'es') utterance.lang = 'es-ES';
    else if (language === 'zh') utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => duckAmbient(0.2, 0.4);
    utterance.onend = () => unduckAmbient(0.8);
    utterance.onerror = () => unduckAmbient(0.8);

    window.speechSynthesis.speak(utterance);
  };

  const processMessage = async (text: string) => {
    if (!text.trim()) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    const userMsg: ChatMessage = { role: 'user', text: text };
    setChatHistory(prev => [...prev, userMsg]);
    setPrompt("");
    
    setIsTyping(true);
    
    const responseText = await generateAIResponse(text, language);
    
    setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    
    setIsTyping(false);
    
    speakText(responseText);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    processMessage(prompt);
  };

  const handleQuickQuestion = (question: string) => {
    playClickSound();
    processMessage(question);
  };

  const toggleLanguage = () => {
    React.startTransition(() => {
      if (language === 'en') setLanguage('es');
      else if (language === 'es') setLanguage('zh');
      else setLanguage('en');
    });
  };

  const handleNav = (section: Section) => {
    React.startTransition(() => {
      if (section === 'home') {
        onClose();
        window.dispatchEvent(new CustomEvent('reset-camera'));
      }
      else setActiveSection(section);
    });
  };

  const handleMicClick = () => {
    playClickSound();
    if (!('webkitSpeechRecognition' in window)) {
        console.warn("Speech recognition not supported in this browser. Try Chrome.");
        return;
    }

    if (isListening) {
        setIsListening(false);
        return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = language === 'en' ? 'en-US' : (language === 'es' ? 'es-ES' : 'zh-CN');
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setPrompt(text);
        processMessage(text);
        setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <>
      <CustomCursor />
      
      {/* Background Dimmer (Focus Visual) */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 transition-opacity duration-700 pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'}`} />

      <Hero
        hidden={activeSection !== 'home'}
        copy={t.home}
        soundOn={soundOn}
        heroEnded={heroEnded}
        onToggleSound={onToggleSound}
      />
      <div className="absolute top-8 right-6 md:right-8 z-50 flex items-center gap-2">
        <ViewToggle liteMode={liteMode} onToggle={onToggleLiteMode} labels={t.home.cta} />
        <LanguageToggle language={language} toggleLanguage={toggleLanguage} />
      </div>
      <RecruiterHUD
        activeSection={activeSection}
        onNavigate={handleNav}
        labels={t.labels}
        nextLabel={t.home.cta.next}
        alwaysVisible={liteMode}
      />

      <div 
        className={`absolute inset-0 z-20 flex items-center justify-center pt-20 pb-28 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none filter blur-sm'}`}
      >
        <div className="relative w-full max-w-5xl h-full max-h-[720px] flex flex-col px-4 md:px-10">
          
          <div className="flex-1 bg-glass-dark backdrop-blur-3xl border border-glass-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative group">
            
            {/* Window Controls Decoration */}
            <div className="absolute top-4 left-4 flex gap-2 z-50">
                <div className="w-3 h-3 rounded-full bg-red-500/50 hover:bg-red-500 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50 hover:bg-yellow-500 transition-colors shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50 hover:bg-green-500 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            </div>

            <button 
              onClick={() => { onClose(); playClickSound(); }}
              onMouseEnter={playHoverSound}
              aria-label="Close panel"
              className="absolute top-4 right-4 z-50 bg-white/5 hover:bg-red-500/80 border border-white/10 text-white p-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* --- PROJECTS VIEW (CYBERPUNK HUD STYLE) --- */}
            {activeSection === 'projects' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col w-full h-full"
              >
                {/* Header */}
                <div className={`${PANEL_HEADER_CLASS} pr-16 from-cyan-500/10 via-cyan-500/5 to-transparent`}>
                  <h2 className={`${PANEL_TITLE_CLASS} text-cyan-400`}>
                     <span className="w-2 h-2 bg-cyan-500 animate-pulse rounded-full shadow-[0_0_8px_#22d3ee]"></span>
                     <ScrambleText text={t.projects.title} />
                  </h2>
                  <p className={`${PANEL_SUBTITLE_CLASS} text-cyan-300/60`}>SYSTEM.ROOT.PROJECTS</p>
                </div>
                
                {/* Projects carousel */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <Projects 
                    items={t.projects.items}
                    playClickSound={playClickSound}
                    playHoverSound={playHoverSound}
                  />
                </div>
              </motion.div>
            )}

            {/* --- ABOUT / AI VIEW (HOLOGRAPHIC CHAT) --- */}
            {activeSection === 'about' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col md:flex-row w-full h-full"
              >
                
                {/* Right/Bottom Side: Terminal Chat (Takes remaining space) */}
                <div className="flex-1 min-w-0 min-h-0 flex flex-col relative order-2 md:order-1">
                  {/* Header HUD */}
                  <div className={`${PANEL_HEADER_CLASS} from-pink-500/10 via-pink-500/5 to-transparent flex justify-between items-center gap-3`}>
                    <div>
                      <h2 className={`${PANEL_TITLE_CLASS} text-pink-400`}>
                         <span className="w-2 h-2 bg-pink-500 animate-pulse rounded-full shadow-[0_0_8px_#ec4899]"></span>
                         <ScrambleText text={t.about.title} />
                      </h2>
                      <p className={`${PANEL_SUBTITLE_CLASS} text-pink-300/60`}>{t.about.subtitle}</p>
                    </div>
                    <button 
                      onClick={() => {
                         playClickSound();
                         setIsMuted(!isMuted);
                         if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                         }
                      }}
                      onMouseEnter={playHoverSound}
                      className={`p-2 rounded-lg border border-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${isMuted ? 'bg-transparent text-gray-500' : 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]'}`}
                      aria-label={isMuted ? 'Unmute assistant voice' : 'Mute assistant voice'}
                      aria-pressed={!isMuted}
                    >
                       {isMuted
                         ? <VolumeX aria-hidden="true" className="w-4 h-4" />
                         : <Volume2 aria-hidden="true" className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Terminal Output (Chat) */}
                  <div
                    ref={chatContainerRef}
                    role="log"
                    aria-live="polite"
                    aria-label="Conversation with the AI assistant"
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 scroll-smooth custom-scrollbar mask-gradient"
                  >
                    <AnimatePresence>
                    {chatHistory.map((msg, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`relative max-w-[90%] md:max-w-[85%] p-4 text-sm font-mono leading-relaxed border border-pink-400/30 rounded-xl
                          ${msg.role === 'user' 
                            ? 'bg-pink-500/15 text-white rounded-tr-none' 
                            : 'bg-white/[0.04] text-pink-100 rounded-tl-none'
                        }`}>
                           {msg.role === 'model' && (
                              <span className="absolute -top-2 left-4 text-[9px] bg-pink-500/20 border border-pink-500/30 text-pink-300 px-1.5 py-0.5 rounded uppercase tracking-wider hidden md:block">Sys.Log</span>
                           )}
                           {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                    <AnimatePresence>
                    {isTyping && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.9 }}
                         className="flex justify-start"
                       >
                         <div className="bg-white/[0.04] border border-pink-400/30 p-3 rounded-xl rounded-tl-none flex gap-2 items-center">
                           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce"></div>
                           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-75"></div>
                           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-150"></div>
                         </div>
                       </motion.div>
                    )}
                    </AnimatePresence>
                  </div>

                  {/* Suggestion Chips */}
                  {!isTyping && (
                    <div className="px-4 md:px-6 pb-2 border-b border-glass-border md:border-none flex gap-2 overflow-x-auto no-scrollbar py-2 mask-gradient">
                      {t.about.quickQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuickQuestion(q)}
                          onMouseEnter={playHoverSound}
                          className="whitespace-nowrap bg-glass-light hover:bg-pink-500/20 text-gray-300 hover:text-pink-100 border border-glass-border hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] text-[10px] md:text-xs font-medium px-4 py-2 rounded-full transition-all duration-300 flex-shrink-0"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Command Input with Voice Support */}
                  <div className="p-3 md:p-4 bg-glass-dark border-t border-glass-border backdrop-blur-2xl">
                    <form onSubmit={handleSendMessage} className="flex gap-2 relative group items-center">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500 font-mono text-sm md:text-lg animate-pulse">{'>'}</span>
                      <label htmlFor="assistant-prompt" className="sr-only">
                        {t.about.placeholder}
                      </label>
                      <input 
                        id="assistant-prompt"
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={isListening ? "Listening..." : t.about.placeholder}
                        className={`flex-1 w-full bg-glass-light border border-glass-border rounded-xl pl-8 p-3 text-pink-50 focus:outline-none focus:border-pink-500/80 focus:bg-white/10 focus:ring-2 focus:ring-pink-500/30 font-mono text-xs md:text-sm transition-all placeholder:text-gray-500 ${isListening ? 'border-pink-500 ring-2 ring-pink-500/50' : ''}`}
                      />
                      
                      <button
                          type="button"
                          onClick={handleMicClick}
                          onMouseEnter={playHoverSound}
                          className={`p-2.5 md:p-3 rounded-xl border transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${isListening ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-glass-light border-glass-border text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/30'}`}
                          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                          aria-pressed={isListening}
                      >
                          {isListening ? (
                              <span aria-hidden="true" className="relative flex h-4 w-4 md:h-5 md:w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 md:h-5 md:w-5 bg-red-500"></span>
                              </span>
                          ) : (
                              <Mic aria-hidden="true" className="h-4 w-4 md:h-5 md:w-5" />
                          )}
                      </button>

                      <button 
                        type="submit"
                        onMouseEnter={playHoverSound}
                        disabled={isTyping || !prompt.trim()}
                        className="bg-pink-600 hover:bg-pink-500 disabled:bg-gray-800/50 disabled:text-gray-500 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-sans text-xs font-bold uppercase tracking-widest transition-all focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-black flex-shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:shadow-none"
                      >
                        {t.about.send || 'TX'}
                      </button>
                    </form>
                  </div>
                </div>
                
                {/* Left/Top Side: Profile & Matrix (Fixed Width on Desktop) */}
                <div className="w-full md:w-72 bg-black/40 flex flex-col p-5 pt-11 shrink-0 max-h-[40%] md:max-h-none overflow-y-auto custom-scrollbar order-1 md:order-2 border-b md:border-b-0 md:border-l border-white/10 relative">
                  
                  {/* Status Indicator */}
                  <div className="absolute top-4 left-24 md:left-5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></span>
                    <span className="text-[8px] font-mono text-green-500 tracking-widest">{t.stats.online}</span>
                  </div>

                  <div className="text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto border-2 border-pink-500/50 rounded-full overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.3)] mb-4 bg-gray-800">
                      <img src={githubData?.avatar_url || 'https://avatars.githubusercontent.com/luis-epic'} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/identicon/svg?seed=luis-epic&backgroundColor=1f2937'; }} />
                    </div>
                    <h3 className="text-white font-mono text-lg font-bold"><ScrambleText text={githubData?.name || "Luis Martinez"} /></h3>
                    <p className="text-pink-300 text-xs font-mono leading-relaxed text-pretty mb-2">{githubData?.bio || "Sr. SWE / UI Architect"}</p>
                    
                    {/* Location Pill */}
                    {githubData?.location && (
                      <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[9px] text-gray-400 font-mono mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {githubData.location}
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3 mt-6 w-full">
                      <h4 className="text-left text-[10px] md:text-xs uppercase tracking-widest text-pink-400 font-mono mb-2 border-b border-white/10 pb-2">{t.stats.coreDirectives}</h4>
                      
                      <div className="space-y-4">
                        <div>
                           <div className="flex justify-between text-[10px] font-mono text-gray-300 mb-1">
                             <span>{t.stats.react}</span>
                             <span className="text-pink-400">90%</span>
                           </div>
                           <div className="w-full bg-white/10 rounded-full h-1.5 shadow-inner">
                             <div className="bg-gradient-to-r from-pink-600 to-pink-400 h-1.5 rounded-full shadow-[0_0_8px_#ec4899]" style={{ width: '90%' }}></div>
                           </div>
                        </div>

                        <div>
                           <div className="flex justify-between text-[10px] font-mono text-gray-300 mb-1">
                             <span>{t.stats.threejs}</span>
                             <span className="text-pink-400">80%</span>
                           </div>
                           <div className="w-full bg-white/10 rounded-full h-1.5 shadow-inner">
                             <div className="bg-gradient-to-r from-pink-600 to-pink-400 h-1.5 rounded-full shadow-[0_0_8px_#ec4899]" style={{ width: '80%' }}></div>
                           </div>
                        </div>
                        
                        <div>
                           <div className="flex justify-between text-[10px] font-mono text-gray-300 mb-1">
                             <span>{t.stats.ai}</span>
                             <span className="text-pink-400">85%</span>
                           </div>
                           <div className="w-full bg-white/10 rounded-full h-1.5 shadow-inner">
                             <div className="bg-gradient-to-r from-pink-600 to-pink-400 h-1.5 rounded-full shadow-[0_0_8px_#ec4899]" style={{ width: '85%' }}></div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 text-left">
                       <h4 className="text-xs uppercase tracking-widest text-gray-400 font-mono mb-2 border-b border-white/10 pb-1">{t.stats.systemLoad}</h4>
                       <div className="w-full bg-white/5 rounded-full h-1.5 mb-1 mt-3">
                          <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                       </div>
                       <p className="text-[10px] text-gray-500 font-mono text-right">{t.stats.cpuOptimal}</p>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* --- CONTACT VIEW (DATA LINK STYLE) --- */}
            {activeSection === 'contact' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col w-full h-full"
              >
                {/* Header HUD */}
                <div className={`${PANEL_HEADER_CLASS} pr-16 from-emerald-500/10 via-emerald-500/5 to-transparent`}>
                  <h2 className={`${PANEL_TITLE_CLASS} text-emerald-400`}>
                     <span className="w-2 h-2 bg-emerald-500 animate-pulse rounded-full shadow-[0_0_8px_#10b981]"></span>
                     <ScrambleText text={t.contact.title} />
                  </h2>
                  <p className={`${PANEL_SUBTITLE_CLASS} text-emerald-300/60`}>{t.stats.signalOpen}</p>
                </div>

                <div className="flex-1 flex flex-col items-center [justify-content:safe_center] overflow-y-auto custom-scrollbar p-5 md:p-6 relative">
                    {/* Background Decor */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                       <div className="w-96 h-96 border border-emerald-500/30 rounded-full animate-spin-slow border-t-transparent"></div>
                       <div className="absolute w-80 h-80 border border-emerald-500/20 rounded-full animate-reverse-spin border-b-transparent"></div>
                    </div>

                    {/* LIVE GITHUB STATS WIDGET */}
                    {githubData ? (
                        <dl className="relative mb-6 w-full max-w-md grid grid-cols-3 gap-3">
                           {[
                             { label: t.stats.repos, value: githubData.public_repos },
                             { label: t.stats.stars, value: githubData.stars || 0 },
                             { label: t.stats.followers, value: githubData.followers },
                           ].map((stat) => (
                             <div key={stat.label} className="flex flex-col-reverse rounded-xl border border-emerald-400/30 bg-white/[0.04] px-2 py-3 text-center">
                               <dt className="mt-1 text-[11px] uppercase tracking-wider text-emerald-300">{stat.label}</dt>
                               <dd className="text-2xl font-bold text-white font-mono">{stat.value}</dd>
                             </div>
                           ))}
                        </dl>
                      ) : (
                      <StatsWidget
                        data={githubData}
                        error={githubError}
                        labels={t.stats}
                      />
                      )}

                    <p className="relative text-white mb-6 max-w-md font-sans text-base leading-relaxed text-center text-pretty">
                       {t.contact.description}
                    </p>

                    <ContactLinks copy={t.contact} />
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default Overlay;
