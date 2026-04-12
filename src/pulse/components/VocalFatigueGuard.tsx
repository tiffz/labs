import { useState, useEffect, useRef } from 'react';

interface VocalFatigueGuardProps {
  isListening: boolean;
}

const FATIGUE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes
const CHECK_INTERVAL_MS = 30_000;

export function VocalFatigueGuard({ isListening }: VocalFatigueGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const accumulatedRef = useRef(0);
  const lastTickRef = useRef(0);

  useEffect(() => {
    if (!isListening) {
      lastTickRef.current = 0;
      return;
    }

    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      if (!isListening || lastTickRef.current === 0) return;
      const now = Date.now();
      accumulatedRef.current += now - lastTickRef.current;
      lastTickRef.current = now;

      if (accumulatedRef.current >= FATIGUE_THRESHOLD_MS && !dismissed) {
        setShowWarning(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isListening, dismissed]);

  const handleDismiss = () => {
    setShowWarning(false);
    setDismissed(true);
    accumulatedRef.current = 0;

    // Re-enable after 5 minutes
    setTimeout(() => setDismissed(false), 5 * 60 * 1000);
  };

  if (!showWarning) return null;

  return (
    <div className="pulse-fatigue">
      <span className="pulse-fatigue-text">
        VOCAL FATIGUE: 20+ min active mic. Take a silent break.
      </span>
      <button
        className="pulse-fatigue-dismiss"
        onClick={handleDismiss}
        type="button"
      >
        DISMISS
      </button>
    </div>
  );
}
