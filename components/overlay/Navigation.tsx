import React from 'react';
import { motion } from 'motion/react';
import { Section } from '../../types';
import { House, Laptop, BrainCircuit, Smartphone, ChevronRight, type LucideIcon } from 'lucide-react';
import { playHoverSound, playClickSound } from '../../utils/soundEngine';

interface NavigationProps {
  activeSection: Section;
  onNavigate: (section: Section) => void;
  labels: Record<Section, string>;
  nextLabel: string;
  /** Without the 3D scene the bar is the only navigation, so it never hides. */
  alwaysVisible?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeSection, onNavigate, labels, nextLabel, alwaysVisible = false }) => {
  const navItems: { id: Section; label: string; Icon: LucideIcon }[] = [
    { id: 'home', label: labels.home, Icon: House },
    { id: 'projects', label: labels.projects, Icon: Laptop },
    { id: 'about', label: labels.about, Icon: BrainCircuit },
    { id: 'contact', label: labels.contact, Icon: Smartphone },
  ];

  // The tour walks the sections in bar order and ends back at home.
  const activeIndex = navItems.findIndex((item) => item.id === activeSection);
  const nextItem = navItems[(activeIndex + 1) % navItems.length];

  // On the home view the 3D objects are the navigation, so the bar would only
  // repeat them. It stays in the tab order there and appears on keyboard focus,
  // because the 3D objects cannot be reached without a pointer.
  const hiddenUntilFocused = activeSection === 'home' && !alwaysVisible;

  return (
    <nav
      aria-label="Main"
      className={`absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 flex gap-4 transition-opacity duration-500
        ${hiddenUntilFocused
          ? 'opacity-0 pointer-events-none focus-within:opacity-100 focus-within:pointer-events-auto'
          : 'opacity-100 pointer-events-auto'}`}
    >
      <div className="bg-glass-dark backdrop-blur-2xl border border-glass-border rounded-full p-2 flex gap-1 md:gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); playClickSound(); }}
            onMouseEnter={playHoverSound}
            aria-label={item.label}
            aria-current={activeSection === item.id ? 'page' : undefined}
            className={`
              relative px-4 py-2.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 overflow-hidden
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
              ${activeSection === item.id 
                ? 'text-white' 
                : 'text-gray-400 hover:text-white'}
            `}
          >
            {activeSection === item.id && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/15 border border-white/20 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <item.Icon aria-hidden="true" className="relative z-10 w-4 h-4 shrink-0" />
            <span className="relative z-10 hidden md:inline font-sans">{item.label}</span>
          </button>
        ))}

        <button
          onClick={() => { onNavigate(nextItem.id); playClickSound(); }}
          onMouseEnter={playHoverSound}
          aria-label={`${nextLabel}: ${nextItem.label}`}
          className="flex items-center gap-1 rounded-full bg-cyan-400 px-4 py-2.5 text-xs md:text-sm font-bold text-black transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <span className="hidden md:inline font-sans">{nextLabel}</span>
          <ChevronRight aria-hidden="true" className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
