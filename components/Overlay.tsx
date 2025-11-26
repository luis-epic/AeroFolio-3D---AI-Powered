
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Section, ChatMessage } from '../types';
import { generateAIResponse } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../translations';
import { playHoverSound, playClickSound } from '../utils/soundEngine';
import { fetchGitHubProfile, GitHubProfile } from '../services/githubService';

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
const ScrambleText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const [display, setDisplay] = useState(text);
  const chars = "!<>-_\\/[]{}—=+*^?#________";
  
  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 3; // Speed of decoding
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{display}</span>;
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
      className="absolute top-8 right-8 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-sm font-mono transition-all pointer-events-auto"
    >
      {getLanguageLabel()}
    </button>
  );
};

// Recruiter HUD (Hybrid Navigation)
const RecruiterHUD: React.FC<{ 
  activeSection: Section; 
  onNavigate: (s: Section) => void;
  labels: any; 
}> = ({ activeSection, onNavigate, labels }) => {
  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: 'home', label: 'HOME', icon: '🏠' },
    { id: 'projects', label: labels.projects, icon: '💻' },
    { id: 'about', label: labels.about, icon: '🧠' },
    { id: 'contact', label: labels.contact, icon: '📱' },
  ];

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex gap-4 pointer-events-auto">
      <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-full p-2 flex gap-2 shadow-2xl">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); playClickSound(); }}
            onMouseEnter={playHoverSound}
            className={`
              px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all flex items-center gap-2
              ${activeSection === item.id 
                ? 'bg-blue-600 text-white shadow-lg scale-105' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'}
            `}
          >
            <span>{item.icon}</span>
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Extracted Header Component to prevent flickering
const Header: React.FC<{ visible: boolean; t: any }> = ({ visible, t }) => (
  <div className={`absolute top-8 left-8 z-10 pointer-events-none transition-all duration-500 ${visible ? 'opacity-0 translate-y-[-20px]' : 'opacity-100'}`}>
    <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
      <ScrambleText text="Luis Martinez" />
      <span className="block text-blue-500 text-xl md:text-2xl mt-2 font-mono">
         <ScrambleText text={t.home.role} />
      </span>
    </h1>
    {!visible && (
      <p className="text-gray-400 mt-4 max-w-md text-sm md:text-base animate-pulse">
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

  // GitHub Data State
  const [githubData, setGithubData] = useState<GitHubProfile | null>(null);

  // TTS State
  const [isMuted, setIsMuted] = useState(false);

  // STT State (Speech to Text)
  const [isListening, setIsListening] = useState(false);

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

  // Fetch GitHub Data when Contact section is active
  useEffect(() => {
    if (activeSection === 'contact' && !githubData) {
        fetchGitHubProfile('luis-epic').then(data => {
            if (data) setGithubData(data);
        });
    }
  }, [activeSection, githubData]);

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
    if (language === 'en') setLanguage('es');
    else if (language === 'es') setLanguage('zh');
    else setLanguage('en');
  };

  const handleNav = (section: Section) => {
    if (section === 'home') onClose();
    else setActiveSection(section);
  };

  const handleMicClick = () => {
    playClickSound();
    if (!('webkitSpeechRecognition' in window)) {
        alert("Speech recognition not supported in this browser. Try Chrome.");
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
        className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-500 ${visible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <div className="relative w-full max-w-4xl h-[70vh] flex flex-col mt-10">
          
          <div className="flex-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
            
            {/* Window Controls Decoration */}
            <div className="absolute top-4 left-4 flex gap-2 z-50">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>

            <button 
              onClick={() => { onClose(); playClickSound(); }}
              onMouseEnter={playHoverSound}
              className="absolute top-4 right-4 z-50 bg-white/5 hover:bg-red-500/80 border border-white/10 text-white p-2 rounded-full transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* --- PROJECTS VIEW (CYBERPUNK HUD STYLE) --- */}
            {activeSection === 'projects' && (
              <div className="flex flex-col w-full h-full">
                {/* Header */}
                <div className="p-6 pt-12 pr-16 border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent">
                  <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-3 font-mono tracking-widest">
                     <span className="w-2 h-2 bg-cyan-500 animate-pulse rounded-full shadow-[0_0_8px_#22d3ee]"></span>
                     <ScrambleText text={t.projects.title} />
                  </h2>
                  <p className="text-[10px] text-cyan-300/60 uppercase tracking-[0.2em] ml-5">SYSTEM.ROOT.PROJECTS</p>
                </div>
                
                {/* Scrollable Grid */}
                <div className="p-8 w-full overflow-y-auto scroll-smooth">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {t.projects.items.map((project) => (
                      <div 
                        key={project.id} 
                        className="relative group bg-gradient-to-br from-cyan-900/10 to-blue-900/20 border border-cyan-500/20 p-6 rounded-lg rounded-tr-none hover:border-cyan-400/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] overflow-hidden"
                      >
                         {/* Tech Decors */}
                         <div className="absolute top-0 right-0 p-2 text-[9px] font-mono text-cyan-500/40 opacity-50 bg-black/40 rounded-bl-lg">ID: PRJ-0{project.id}</div>
                         <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-500/20 group-hover:border-cyan-400 transition-colors"></div>
                         
                         <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 font-mono tracking-tight flex items-center gap-2">
                            <span className="text-cyan-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">►</span>
                            {project.title}
                         </h3>
                         
                         <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-[10px] text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase tracking-wider shadow-[0_0_5px_rgba(6,182,212,0.1)]">
                                {project.tech}
                            </span>
                         </div>
                         
                         <p className="text-gray-400 text-xs font-mono leading-relaxed border-l-2 border-white/5 pl-3 group-hover:border-cyan-500/30 transition-colors">
                            {project.description}
                         </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- ABOUT / AI VIEW (HOLOGRAPHIC CHAT) --- */}
            {activeSection === 'about' && (
              <div className="flex flex-col w-full h-full">
                {/* Header HUD */}
                <div className="p-6 pt-12 pr-16 border-b border-white/10 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-pink-400 flex items-center gap-3 font-mono tracking-widest">
                       <span className="w-2 h-2 bg-pink-500 animate-pulse rounded-full shadow-[0_0_8px_#ec4899]"></span>
                       <ScrambleText text={t.about.title} />
                    </h2>
                    <p className="text-[10px] text-pink-300/60 uppercase tracking-[0.2em] ml-5">{t.about.subtitle}</p>
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
                    className={`p-2 rounded-sm border border-white/10 transition-all ${isMuted ? 'bg-transparent text-gray-500' : 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]'}`}
                    title={isMuted ? "Unmute Voice" : "Mute Voice"}
                  >
                     {isMuted ? '🔇' : '🔊'}
                  </button>
                </div>
                
                {/* Terminal Output (Chat) */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`relative max-w-[85%] p-5 text-sm font-mono leading-relaxed shadow-lg backdrop-blur-md transition-all duration-300
                        ${msg.role === 'user' 
                          ? 'bg-gradient-to-br from-blue-600/30 to-blue-800/30 border border-blue-500/30 text-blue-100 rounded-2xl rounded-tr-none shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                          : 'bg-black/60 border border-pink-500/30 text-pink-100 rounded-2xl rounded-tl-none shadow-[0_0_15px_rgba(236,72,153,0.1)]'
                      }`}>
                         {/* AI Decorator */}
                         {msg.role === 'model' && (
                            <span className="absolute -top-2 left-4 text-[9px] bg-pink-500/20 border border-pink-500/30 text-pink-300 px-1.5 py-0.5 rounded uppercase tracking-wider">Sys.Log</span>
                         )}
                         {msg.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                     <div className="flex justify-start animate-pulse">
                       <div className="bg-black/40 border border-pink-500/30 p-3 rounded-2xl rounded-tl-none flex gap-2 items-center">
                         <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce"></div>
                         <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-75"></div>
                         <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-150"></div>
                         <span className="text-pink-500/70 text-[10px] font-mono ml-2 tracking-widest">NEURAL UPLINK...</span>
                       </div>
                     </div>
                  )}
                </div>

                {/* Suggestion Chips */}
                {!isTyping && (
                  <div className="px-6 pb-4 flex gap-2 overflow-x-auto no-scrollbar mask-gradient">
                    {t.about.quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickQuestion(q)}
                        onMouseEnter={playHoverSound}
                        className="whitespace-nowrap bg-white/5 hover:bg-pink-500/20 text-gray-400 hover:text-white border border-white/10 hover:border-pink-500/50 hover:shadow-[0_0_10px_rgba(236,72,153,0.2)] text-[10px] uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 font-mono"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Command Input with Voice Support */}
                <div className="p-4 bg-black/40 border-t border-white/10 backdrop-blur-md">
                  <form onSubmit={handleSendMessage} className="flex gap-2 relative group items-center">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 font-mono text-lg animate-pulse">{'>'}</span>
                    <input 
                      type="text" 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={isListening ? "Listening..." : t.about.placeholder}
                      className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-10 py-3 text-pink-50 focus:outline-none focus:border-pink-500/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(236,72,153,0.1)] font-mono text-sm transition-all placeholder:text-gray-600 ${isListening ? 'border-pink-500 animate-pulse' : ''}`}
                    />
                    
                    {/* Voice Input Button */}
                    <button
                        type="button"
                        onClick={handleMicClick}
                        onMouseEnter={playHoverSound}
                        className={`p-3 rounded-lg border transition-all ${isListening ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Voice Input"
                    >
                        {isListening ? (
                            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>

                    <button 
                      type="submit"
                      onMouseEnter={playHoverSound}
                      disabled={isTyping || !prompt.trim()}
                      className="bg-pink-600/80 hover:bg-pink-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-6 py-3 rounded-lg font-mono text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-pink-500/20"
                    >
                      {t.about.send}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* --- CONTACT VIEW (DATA LINK STYLE) --- */}
            {activeSection === 'contact' && (
              <div className="flex flex-col w-full h-full">
                {/* Header HUD */}
                <div className="p-6 pt-12 pr-16 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent">
                  <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-3 font-mono tracking-widest">
                     <span className="w-2 h-2 bg-emerald-500 animate-pulse rounded-full shadow-[0_0_8px_#10b981]"></span>
                     <ScrambleText text={t.contact.title} />
                  </h2>
                  <p className="text-[10px] text-emerald-300/60 uppercase tracking-[0.2em] ml-5">SIGNAL.STATUS: OPEN</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                    {/* Background Decor */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                       <div className="w-96 h-96 border border-emerald-500/30 rounded-full animate-spin-slow border-t-transparent"></div>
                       <div className="absolute w-80 h-80 border border-emerald-500/20 rounded-full animate-reverse-spin border-b-transparent"></div>
                    </div>

                    {/* LIVE GITHUB STATS WIDGET */}
                    {githubData ? (
                        <div className="mb-6 w-full max-w-sm grid grid-cols-2 gap-2">
                           <div className="bg-emerald-900/20 border border-emerald-500/20 p-2 text-center rounded">
                               <div className="text-lg font-bold text-white font-mono">{githubData.public_repos}</div>
                               <div className="text-[9px] text-emerald-400 uppercase tracking-widest">Repositories</div>
                           </div>
                           <div className="bg-emerald-900/20 border border-emerald-500/20 p-2 text-center rounded">
                               <div className="text-lg font-bold text-white font-mono">{githubData.followers}</div>
                               <div className="text-[9px] text-emerald-400 uppercase tracking-widest">Followers</div>
                           </div>
                        </div>
                    ) : (
                        <div className="mb-6 h-12 w-full max-w-sm bg-emerald-900/10 animate-pulse rounded border border-emerald-500/10 flex items-center justify-center text-[9px] text-emerald-500">FETCHING DATA...</div>
                    )}

                    <p className="text-emerald-100 mb-6 max-w-md font-mono text-sm text-center bg-black/40 p-4 border-l-2 border-emerald-500">
                       {t.contact.description}
                    </p>
                    
                    <div className="space-y-4 w-full max-w-sm z-10">
                      
                      <a href="mailto:luismartinez.developer@gmail.com" onMouseEnter={playHoverSound} className="group relative w-full flex items-center justify-between p-4 bg-emerald-900/10 border border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all overflow-hidden rounded-sm">
                        <div className="flex items-center gap-4">
                           <span className="text-emerald-500 font-mono text-lg group-hover:animate-pulse">@</span>
                           <span className="text-emerald-100 font-mono text-xs uppercase tracking-wider">Send Email</span>
                        </div>
                        <span className="text-xs text-emerald-600 font-mono opacity-50 group-hover:opacity-100 transition-opacity">SMTP://CONNECT</span>
                        {/* Scanline Effect */}
                        <div className="absolute top-0 bottom-0 w-1 bg-emerald-400 left-0 group-hover:h-full h-0 transition-all duration-300"></div>
                      </a>

                      <a href="https://www.linkedin.com/in/luisepico/" target="_blank" rel="noopener noreferrer" onMouseEnter={playHoverSound} className="group relative w-full flex items-center justify-between p-4 bg-blue-900/10 border border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all overflow-hidden rounded-sm">
                        <div className="flex items-center gap-4">
                           <span className="text-blue-500 font-mono text-lg group-hover:animate-pulse">in</span>
                           <span className="text-blue-100 font-mono text-xs uppercase tracking-wider">LinkedIn</span>
                        </div>
                        <span className="text-xs text-blue-600 font-mono opacity-50 group-hover:opacity-100 transition-opacity">LINK://PROFILE</span>
                         <div className="absolute top-0 bottom-0 w-1 bg-blue-400 left-0 group-hover:h-full h-0 transition-all duration-300"></div>
                      </a>

                      <a href="https://github.com/luis-epic" target="_blank" rel="noopener noreferrer" onMouseEnter={playHoverSound} className="group relative w-full flex items-center justify-between p-4 bg-violet-900/10 border border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(167,139,250,0.2)] transition-all overflow-hidden rounded-sm">
                        <div className="flex items-center gap-4">
                           <span className="text-violet-500 font-mono text-lg group-hover:text-white group-hover:animate-pulse">git</span>
                           <span className="text-violet-200 font-mono text-xs uppercase tracking-wider">GitHub</span>
                        </div>
                        <span className="text-xs text-violet-600 font-mono opacity-50 group-hover:opacity-100 transition-opacity">REPO://ACCESS</span>
                        <div className="absolute top-0 bottom-0 w-1 bg-violet-400 left-0 group-hover:h-full h-0 transition-all duration-300"></div>
                      </a>

                    </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default Overlay;
