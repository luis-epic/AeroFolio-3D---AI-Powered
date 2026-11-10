import React, { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

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

    // Progress is derived from elapsed wall-clock time, not from a tick counter,
    // so the text always resolves within `duration` even when a busy main thread
    // throttles this interval.
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

export default ScrambleText;
