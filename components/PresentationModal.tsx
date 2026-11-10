import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { HERO_MEDIA } from '../constants';

interface PresentationModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
}

const FOCUSABLE = 'button:not([tabindex="-1"]), video[controls]';

const PresentationModal: React.FC<PresentationModalProps> = ({ open, onClose, title, closeLabel }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/85 backdrop-blur-md"
      />

      <div className="relative flex max-h-full flex-col items-end gap-3">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-red-500/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <video
          src={HERO_MEDIA.mp4}
          poster={HERO_MEDIA.still}
          controls
          autoPlay
          playsInline
          className="aspect-[9/16] max-h-[78vh] w-auto rounded-2xl border border-white/15 bg-black shadow-[0_8px_48px_rgba(0,0,0,0.7)]"
        />
      </div>
    </div>
  );
};

export default PresentationModal;
