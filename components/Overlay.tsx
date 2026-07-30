
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Section, ChatMessage } from '../types';
import { generateAIResponse } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../translations';
import { playHoverSound, playClickSound } from '../utils/soundEngine';
import { fetchGitHubProfile, type GitHubProfile, type GitHubFailureReason } from '../services/githubService';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { Mic, Volume2, VolumeX } from 'lucide-react';
import Navigation from './overlay/Navigation';
import StatsWidget from './overlay/StatsWidget';

interface OverlayProps {
  activeSection: Section;
  onClose: () => void;
  setActiveSection: (section: Section) => void;
  setAiState: (state: 'idle' | 'thinking') => void;
}

// --- CUSTOM CURSOR COMPONENT (TACTICAL PRECISION) ---
const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const pos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      // Show cursor on first move
      if (cursorRef.current) cursorRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    const onHoverStart = () => setHovering(true);
    const onHoverEnd = () => setHovering(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('cursor-hover-start', onHoverStart);
    window.addEventListener('cursor-hover-end', onHoverEnd);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.closest('button') || target.closest('a')) {
        setHovering(true);
      }
    };
    
    const onMouseOut = (e: MouseEvent) => {
       const target = e.target as HTMLElement;
       if (target.tagName === 'BUTTON' || target.tagName === 'A') {
         setHovering(false);
       }
    };

    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('cursor-hover-start', onHoverStart);
      window.removeEventListener('cursor-hover-end', onHoverEnd);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, []);

  // Animation Loop for smooth trailing
  useEffect(() => {
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
  }, []);

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

// --- SCRAMBLE TEXT COMPONENT ---
const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________";
const TICK_MS = 30;
const MS_PER_LETTER = 45; // wall-clock time before one more letter is revealed
const MAX_SCRAMBLE_MS = 2500; // hard cap so long strings still resolve quickly

/**
 * Decodes `text` from random characters.
 *
 * Accessibility: the animated characters are decorative noise, so they are
 * hidden from assistive tech and the real text is exposed via a visually hidden
 * span. Without this a screen reader announces garbage like
 * "LUIS MART-?\^ FULL STAC=]_!/[". Honors `prefers-reduced-motion`.
 */
const ScrambleText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    // Respect the motion preference: render the final text immediately.
    if (prefersReducedMotion) {
      setDisplay(text);
      return;
    }

    // Progress is derived from elapsed wall-clock time, not from a tick counter.
    // The 3D canvas can starve the main thread and throttle this interval, and a
    // per-tick counter then crawled (~7 letters in 10s on a busy frame budget).
    // Time-based progress always resolves within `duration` no matter how often
    // the timer actually fires.
    const startedAt = Date.now();
    const duration = Math.min(text.length * MS_PER_LETTER, MAX_SCRAMBLE_MS);

    const interval = setInterval(() => {
      const progress = (Date.now() - startedAt) / duration;

      if (progress >= 1) {
        // Guarantee the exact final string, then stop.
        setDisplay(text);
        clearInterval(interval);
        return;
      }

      const revealed = Math.floor(progress * text.length);

      setDisplay(
        text
          .split("")
          .map((letter, index) => {
            if (index < revealed) return text[index];
            // Preserve spaces so word shapes stay stable while decoding.
            if (letter === " ") return " ";
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("")
      );
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [text, prefersReducedMotion]);

  return (
    <span className={className}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{text}</span>
    </span>
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
      className="absolute top-8 right-8 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-sm font-mono transition-all pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      {getLanguageLabel()}
    </button>
  );
};

// Recruiter HUD delegates to extracted Navigation component
const RecruiterHUD: React.FC<{ 
  activeSection: Section; 
  onNavigate: (s: Section) => void;
  labels: Record<Section, string>;
}> = ({ activeSection, onNavigate, labels }) => (
  <Navigation
    activeSection={activeSection}
    onNavigate={onNavigate}
    labels={labels}
  />
);

// Extracted Header Component to prevent flickering
const Header: React.FC<{ visible: boolean; t: any }> = ({ visible, t }) => (
  <div className={`absolute top-10 left-10 z-10 pointer-events-none transition-all duration-700 ease-out ${visible ? 'opacity-0 translate-y-[-20px] filter blur-md' : 'opacity-100 filter blur-0'}`}>
    <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter font-display uppercase drop-shadow-2xl">
      <ScrambleText text="Luis Martinez" />
      <span className="block text-cyan-400 text-lg md:text-xl mt-3 font-mono tracking-widest font-normal opacity-90 border-l-2 border-pink-500 pl-3">
         <ScrambleText text={t.home.role} />
      </span>
    </h1>
    {!visible && (
      <p className="text-gray-400 mt-6 max-w-md text-sm md:text-base leading-relaxed font-sans opacity-80 mix-blend-screen">
        {t.home.description}
      </p>
    )}
  </div>
);

const Overlay: React.FC<OverlayProps> = ({ activeSection, onClose, setActiveSection, setAiState }) => {
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
    
    // Set Loading States
    setIsTyping(true);
    setAiState('thinking'); // Update global state for 3D reactivity
    
    const responseText = await generateAIResponse(text, language);
    
    setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    
    // Reset Loading States
    setIsTyping(false);
    setAiState('idle');
    
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
      if (section === 'home') onClose();
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

      <Header visible={visible} t={t} />
      <LanguageToggle language={language} toggleLanguage={toggleLanguage} />
      <RecruiterHUD activeSection={activeSection} onNavigate={handleNav} labels={t.labels} />

      <div 
        className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none filter blur-sm'}`}
      >
        <div className="relative w-full max-w-5xl h-[75vh] flex flex-col mt-10 md:mt-0 p-4 md:p-6 md:px-10">
          
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
                <div className="p-6 pt-12 pr-16 border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent">
                  <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-3 font-mono tracking-widest">
                     <span className="w-2 h-2 bg-cyan-500 animate-pulse rounded-full shadow-[0_0_8px_#22d3ee]"></span>
                     <ScrambleText text={t.projects.title} />
                  </h2>
                  <p className="text-[10px] text-cyan-300/60 uppercase tracking-[0.2em] ml-5">SYSTEM.ROOT.PROJECTS</p>
                </div>
                
                {/* Bento Grid layout for projects */}
                <div className="p-4 md:p-8 w-full overflow-y-auto scroll-smooth custom-scrollbar mask-gradient">
                  <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[minmax(220px,auto)] gap-4 md:gap-6 pb-20">
                    {t.projects.items.map((project: any, i: number) => {
                      // Make the first project span more columns to create a bento box feel
                      const colSpan = i === 0 ? "md:col-span-4" : i === 1 ? "md:col-span-2" : i === 2 ? "md:col-span-3" : "md:col-span-3";
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 24, delay: i * 0.1 }}
                          key={project.id} 
                          className={`relative group bg-glass-dark border border-glass-border p-6 md:p-8 rounded-3xl hover:border-pink-500/40 hover:bg-glass-light transition-all duration-500 hover:shadow-[0_8px_32px_rgba(236,72,153,0.15)] overflow-hidden flex flex-col justify-between ${colSpan}`}
                        >
                           {/* Hover Glow Effect */}
                           <div className="absolute -inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                           
                           {/* Content Top */}
                           <div className="z-10">
                             <div className="flex justify-between items-start mb-4">
                               <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                               </div>
                               <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest border border-white/5 group-hover:border-pink-500/20 group-hover:text-pink-300 transition-colors">
                                 PRJ-0{project.id}
                               </span>
                             </div>
                             
                             <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight font-display group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-pink-200 transition-all">
                                {project.title}
                             </h3>
                             
                             <p className="text-gray-400 text-sm font-sans leading-relaxed mb-6 group-hover:text-gray-300 transition-colors line-clamp-3">
                                {project.description}
                             </p>
                           </div>

                           {/* Content Bottom: Tech Stack */}
                           <div className="flex flex-wrap gap-2 mt-auto z-10 pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors">
                              {project.tech.split(',').map((tech: string, idx: number) => (
                                <span key={idx} className="text-[11px] text-gray-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full font-medium shadow-sm group-hover:bg-pink-500/10 group-hover:border-pink-500/20 group-hover:text-pink-100 transition-all duration-300">
                                    {tech.trim()}
                                </span>
                              ))}
                           </div>
                        </motion.div>
                      );
                    })}
                  </div>
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
                <div className="flex-1 flex flex-col w-full h-full md:border-l border-white/10 relative order-2 md:order-1">
                  {/* Header HUD */}
                  <div className="p-4 pt-10 md:p-6 md:pt-12 border-b border-white/10 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent flex justify-between items-center">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-pink-400 flex items-center gap-3 font-mono tracking-widest">
                         <span className="w-2 h-2 bg-pink-500 animate-pulse rounded-full shadow-[0_0_8px_#ec4899]"></span>
                         <ScrambleText text={t.about.title} />
                      </h2>
                      <p className="text-[9px] md:text-[10px] text-pink-300/60 uppercase tracking-[0.2em] ml-5">{t.about.subtitle}</p>
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
                      className={`p-2 rounded-sm border border-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${isMuted ? 'bg-transparent text-gray-500' : 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]'}`}
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
                        <div className={`relative max-w-[90%] md:max-w-[85%] p-4 md:p-5 text-sm font-mono leading-relaxed shadow-lg backdrop-blur-md transition-all duration-300
                          ${msg.role === 'user' 
                            ? 'bg-glass-light border border-blue-500/30 text-blue-100 rounded-2xl rounded-tr-none shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                            : 'bg-glass-dark border border-pink-500/30 text-pink-100 rounded-2xl rounded-tl-none shadow-[0_0_15px_rgba(236,72,153,0.1)]'
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
                         <div className="bg-glass-dark border border-pink-500/30 p-3 rounded-2xl rounded-tl-none flex gap-2 items-center">
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
                <div className="w-full md:w-1/3 bg-black/40 flex flex-col p-6 shrink-0 md:shrink md:overflow-y-auto order-1 md:order-2 border-b md:border-none border-white/5 relative">
                  
                  {/* Status Indicator */}
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></span>
                    <span className="text-[8px] font-mono text-green-500 tracking-widest">{t.stats.online}</span>
                  </div>

                  <div className="mt-8 md:mt-2 text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto border-2 border-pink-500/50 rounded-full overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.3)] mb-4 bg-gray-800">
                      <img src={githubData?.avatar_url || 'https://avatars.githubusercontent.com/luis-epic'} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/identicon/svg?seed=luis-epic&backgroundColor=1f2937'; }} />
                    </div>
                    <h3 className="text-white font-mono text-lg font-bold"><ScrambleText text={githubData?.name || "Luis Martinez"} /></h3>
                    <p className="text-pink-400 text-xs font-mono mb-2">{githubData?.bio || "Sr. SWE / UI Architect"}</p>
                    
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
                <div className="p-6 pt-12 pr-16 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent">
                  <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-3 font-mono tracking-widest">
                     <span className="w-2 h-2 bg-emerald-500 animate-pulse rounded-full shadow-[0_0_8px_#10b981]"></span>
                     <ScrambleText text={t.contact.title} />
                  </h2>
                  <p className="text-[10px] text-emerald-300/60 uppercase tracking-[0.2em] ml-5">{t.stats.signalOpen}</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                    {/* Background Decor */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                       <div className="w-96 h-96 border border-emerald-500/30 rounded-full animate-spin-slow border-t-transparent"></div>
                       <div className="absolute w-80 h-80 border border-emerald-500/20 rounded-full animate-reverse-spin border-b-transparent"></div>
                    </div>

                    {/* LIVE GITHUB STATS WIDGET */}
                    {githubData ? (
                        <div className="mb-6 w-full max-w-sm grid grid-cols-3 gap-2">
                           <div className="bg-emerald-900/20 border border-emerald-500/20 p-2 text-center rounded hover:bg-emerald-800/30 transition-colors">
                               <div className="text-lg font-bold text-white font-mono">{githubData.public_repos}</div>
                               <div className="text-[8px] md:text-[9px] text-emerald-400 uppercase tracking-widest">{t.stats.repos}</div>
                           </div>
                           <div className="bg-emerald-900/20 border border-emerald-500/20 p-2 text-center rounded hover:bg-emerald-800/30 transition-colors">
                               <div className="text-lg font-bold text-white font-mono">{githubData.stars || 0}</div>
                               <div className="text-[8px] md:text-[9px] text-emerald-400 uppercase tracking-widest">{t.stats.stars}</div>
                           </div>
                           <div className="bg-emerald-900/20 border border-emerald-500/20 p-2 text-center rounded hover:bg-emerald-800/30 transition-colors">
                               <div className="text-lg font-bold text-white font-mono">{githubData.followers}</div>
                               <div className="text-[8px] md:text-[9px] text-emerald-400 uppercase tracking-widest">{t.stats.followers}</div>
                           </div>
                        </div>
                      ) : (
                      <StatsWidget
                        data={githubData}
                        error={githubError}
                        labels={t.stats}
                      />
                      )}

                    <p className="text-emerald-100 mb-6 max-w-md font-mono text-sm text-center bg-black/40 p-4 border-l-2 border-emerald-500">
                       {t.contact.description}
                    </p>
                    
                    <motion.div 
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
                      }}
                      className="space-y-4 w-full max-w-sm z-10"
                    >
                      
                      <motion.a 
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        href="mailto:luismartinez.developer@gmail.com" onMouseEnter={playHoverSound} className="group relative w-full flex items-center justify-between p-4 bg-emerald-900/10 border border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all overflow-hidden rounded-sm">
                        <div className="flex items-center gap-4">
                           <span className="text-emerald-500 font-mono text-lg group-hover:animate-pulse">@</span>
                           <span className="text-emerald-100 font-mono text-xs uppercase tracking-wider">Send Email</span>
                        </div>
                        <span className="text-xs text-emerald-600 font-mono opacity-50 group-hover:opacity-100 transition-opacity">SMTP://CONNECT</span>
                        {/* Scanline Effect */}
                        <div className="absolute top-0 bottom-0 w-1 bg-emerald-400 left-0 group-hover:h-full h-0 transition-all duration-300"></div>
                      </motion.a>

                      <motion.a 
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        href="https://www.linkedin.com/in/luisepico/" target="_blank" rel="noopener noreferrer" onMouseEnter={playHoverSound} className="group relative w-full flex items-center justify-between p-4 bg-blue-900/10 border border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all overflow-hidden rounded-sm">
                        <div className="flex items-center gap-4">
                           <span className="text-blue-500 font-mono text-lg group-hover:animate-pulse">in</span>
                           <span className="text-blue-100 font-mono text-xs uppercase tracking-wider">LinkedIn</span>
                        </div>
                        <span className="text-xs text-blue-600 font-mono opacity-50 group-hover:opacity-100 transition-opacity">LINK://PROFILE</span>
                         <div className="absolute top-0 bottom-0 w-1 bg-blue-400 left-0 group-hover:h-full h-0 transition-all duration-300"></div>
                      </motion.a>

                      <motion.a 
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        href="https://github.com/luis-epic" target="_blank" rel="noopener noreferrer" onMouseEnter={playHoverSound} className="group relative w-full flex items-center justify-between p-4 bg-violet-900/10 border border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(167,139,250,0.2)] transition-all overflow-hidden rounded-sm">
                        <div className="flex items-center gap-4">
                           <span className="text-violet-500 font-mono text-lg group-hover:text-white group-hover:animate-pulse">git</span>
                           <span className="text-violet-200 font-mono text-xs uppercase tracking-wider">GitHub</span>
                        </div>
                        <span className="text-xs text-violet-600 font-mono opacity-50 group-hover:opacity-100 transition-opacity">REPO://ACCESS</span>
                        <div className="absolute top-0 bottom-0 w-1 bg-violet-400 left-0 group-hover:h-full h-0 transition-all duration-300"></div>
                      </motion.a>

                    </motion.div>
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
