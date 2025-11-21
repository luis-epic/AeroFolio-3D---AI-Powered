
import React, { useState, useEffect, useRef } from 'react';
import { Section, ChatMessage } from '../types';
import { generateAIResponse } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../translations';

interface OverlayProps {
  activeSection: Section;
  onClose: () => void;
  setActiveSection: (section: Section) => void;
}

// Extracted component to prevent re-renders on parent state change
const LanguageToggle: React.FC<{ language: Language; toggleLanguage: () => void }> = ({ language, toggleLanguage }) => {
  const getLanguageLabel = () => {
    if (language === 'en') return 'ENGLISH';
    if (language === 'es') return 'ESPAÑOL';
    return '中文';
  };

  return (
    <button 
      onClick={toggleLanguage}
      className="absolute top-8 right-8 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-sm font-mono transition-all pointer-events-auto"
    >
      {getLanguageLabel()}
    </button>
  );
};

// STRATEGY 1: Recruiter HUD (Hybrid Navigation)
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
            onClick={() => onNavigate(item.id)}
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

const Overlay: React.FC<OverlayProps> = ({ activeSection, onClose, setActiveSection }) => {
  const [visible, setVisible] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  
  // AI Chat State
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // TTS State
  const [isMuted, setIsMuted] = useState(false);

  // Reset chat on language change
  useEffect(() => {
    setChatHistory([{ role: 'model', text: t.about.initialMessage }]);
    // Cancel speech on reset
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
    
    // Map app language to browser locale codes
    if (language === 'en') utterance.lang = 'en-US';
    else if (language === 'es') utterance.lang = 'es-ES';
    else if (language === 'zh') utterance.lang = 'zh-CN';
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Stop any current speech when user sends new message
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    const userMsg: ChatMessage = { role: 'user', text: prompt };
    setChatHistory(prev => [...prev, userMsg]);
    setPrompt("");
    setIsTyping(true);

    const responseText = await generateAIResponse(prompt, language);
    
    setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    setIsTyping(false);

    // Trigger TTS
    speakText(responseText);
  };

  // Language Toggle Button Logic
  const toggleLanguage = () => {
    if (language === 'en') setLanguage('es');
    else if (language === 'es') setLanguage('zh');
    else setLanguage('en');
  };

  const handleNav = (section: Section) => {
    if (section === 'home') {
      onClose();
    } else {
      setActiveSection(section);
    }
  };

  // Header is always visible
  const Header = () => (
    <div className={`absolute top-8 left-8 z-10 pointer-events-none transition-opacity duration-500 ${visible ? 'opacity-0 md:opacity-50' : 'opacity-100'}`}>
      <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
        Luis Martinez
        <span className="block text-blue-500 text-xl md:text-2xl mt-2 font-mono">
          {t.home.role}
        </span>
      </h1>
      {!visible && (
        <p className="text-gray-400 mt-4 max-w-md text-sm md:text-base">
          {t.home.description}
        </p>
      )}
    </div>
  );

  return (
    <>
      <Header />
      <LanguageToggle language={language} toggleLanguage={toggleLanguage} />
      
      {/* RECRUITER HUD */}
      <RecruiterHUD activeSection={activeSection} onNavigate={handleNav} labels={t.labels} />

      <div 
        className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="relative w-full max-w-4xl h-[70vh] flex flex-col mt-10">
          
          {/* Content Card */}
          <div className="flex-1 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
            
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-50 bg-red-500/20 hover:bg-red-500/40 text-red-200 p-2 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* --- PROJECTS VIEW --- */}
            {activeSection === 'projects' && (
              <div className="p-8 w-full overflow-y-auto">
                <h2 className="text-3xl font-bold text-blue-400 mb-6 font-mono">&lt;{t.projects.title} /&gt;</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {t.projects.items.map((project) => (
                    <div key={project.id} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-all group">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400">{project.title}</h3>
                      <p className="text-xs text-blue-300 mb-3 uppercase tracking-wider">{project.tech}</p>
                      <p className="text-gray-300 text-sm leading-relaxed">{project.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- ABOUT / AI VIEW --- */}
            {activeSection === 'about' && (
              <div className="flex flex-col w-full h-full">
                {/* ADDED pr-16 TO PREVENT OVERLAP WITH CLOSE BUTTON */}
                <div className="p-6 pr-16 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                      <span>🧠</span> {t.about.title}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">{t.about.subtitle}</p>
                  </div>
                  <button 
                    onClick={() => {
                       setIsMuted(!isMuted);
                       if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                       }
                    }}
                    className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-gray-700 text-gray-400' : 'bg-pink-600 text-white'}`}
                    title={isMuted ? "Unmute Voice" : "Mute Voice"}
                  >
                     {isMuted ? '🔇' : '🔊'}
                  </button>
                </div>
                
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-lg text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                     <div className="flex justify-start">
                       <div className="bg-gray-700 p-3 rounded-lg rounded-bl-none flex gap-2">
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                       </div>
                     </div>
                  )}
                </div>

                <div className="p-4 bg-gray-800/50 border-t border-gray-700">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input 
                      type="text" 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t.about.placeholder}
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={isTyping || !prompt.trim()}
                      className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      {t.about.send}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* --- CONTACT VIEW --- */}
            {activeSection === 'contact' && (
              <div className="p-8 w-full flex flex-col justify-center items-center text-center">
                <div className="w-20 h-20 bg-gray-700 rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-gray-600">
                  <span className="text-4xl">📱</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{t.contact.title}</h2>
                <p className="text-gray-400 mb-8 max-w-md">
                  {t.contact.description}
                </p>
                
                <div className="space-y-4 w-full max-w-xs">
                  <a href="#" className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-white transition-colors flex items-center justify-center gap-3">
                    <span>📧</span> {t.contact.email}
                  </a>
                  <a href="#" className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-white transition-colors flex items-center justify-center gap-3">
                    <span>💼</span> {t.contact.linkedin}
                  </a>
                  <a href="#" className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-white transition-colors flex items-center justify-center gap-3">
                    <span>🐙</span> {t.contact.github}
                  </a>
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
