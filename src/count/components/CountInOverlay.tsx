import { useEffect, useRef } from 'react';

interface CountInOverlayProps {
  currentBeat: number | null;
  exiting: boolean;
  onClose: () => void;
}

export function CountInOverlay({ currentBeat, exiting, onClose }: CountInOverlayProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div
      className={`pulse-countin-overlay ${exiting ? 'is-exiting' : ''}`}
      onClick={() => onCloseRef.current()}
      onKeyDown={(e) => { if (e.code === 'Escape') onCloseRef.current(); }}
      role="button"
      tabIndex={0}
    >
      {currentBeat !== null && (
        <div key={currentBeat} className="pulse-countin-beat">
          <span className="pulse-countin-number">{currentBeat}</span>
          <span className="pulse-countin-ripple" />
        </div>
      )}
    </div>
  );
}
