import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { playHoverSound } from '../../utils/soundEngine';

interface ContactLinksProps {
  copy: {
    email: string;
    linkedin: string;
    github: string;
  };
}

const ITEM_VARIANTS = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

const ContactLinks: React.FC<ContactLinksProps> = ({ copy }) => {
  const links = [
    { glyph: '@', label: 'Email', detail: copy.email, href: `mailto:${copy.email}`, external: false },
    { glyph: 'in', label: 'LinkedIn', detail: 'linkedin.com/in/luisepico', href: 'https://www.linkedin.com/in/luisepico/', external: true },
    { glyph: 'git', label: 'GitHub', detail: 'github.com/luis-epic', href: 'https://github.com/luis-epic', external: true },
  ];

  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
      }}
      className="relative z-10 w-full max-w-md space-y-3"
    >
      {links.map((link) => (
        <motion.li key={link.label} variants={ITEM_VARIANTS}>
          <a
            href={link.href}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
            onMouseEnter={playHoverSound}
            className="group flex w-full items-center gap-4 rounded-xl border border-emerald-400/30 bg-white/[0.04] p-4 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400 font-mono text-sm font-bold text-black"
            >
              {link.glyph}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block font-sans text-base font-semibold text-white">{link.label}</span>
              <span className="block truncate font-mono text-xs text-emerald-200">{link.detail}</span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-emerald-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </motion.li>
      ))}
    </motion.ul>
  );
};

export default ContactLinks;
