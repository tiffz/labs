import { useEffect } from 'react';

export type SessionKeyboardHandlers = {
  onPause: () => void;
  onSkip: () => void;
  onBack: () => void;
  onExit: () => void;
};

export function useSessionKeyboard(handlers: SessionKeyboardHandlers, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlers.onPause();
          break;
        case 'ArrowRight':
        case 'n':
        case 'N':
          e.preventDefault();
          handlers.onSkip();
          break;
        case 'ArrowLeft':
        case 'b':
        case 'B':
          e.preventDefault();
          handlers.onBack();
          break;
        case 'Escape':
          e.preventDefault();
          handlers.onExit();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, handlers]);
}
