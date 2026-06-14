import { useCallback, useEffect, useRef, useState } from 'react';

export type DrawingTimerState = {
  remainingSec: number;
  paused: boolean;
  complete: boolean;
};

export function useDrawingTimer(durationSec: number, active: boolean) {
  const [remainingSec, setRemainingSec] = useState(durationSec);
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef(durationSec);

  useEffect(() => {
    setRemainingSec(durationSec);
    setPaused(false);
    setComplete(false);
    endAtRef.current = null;
    pausedRemainingRef.current = durationSec;
  }, [durationSec, active]);

  useEffect(() => {
    if (!active || paused || complete) return;
    if (endAtRef.current == null) {
      endAtRef.current = Date.now() + remainingSec * 1000;
    }
    const tick = () => {
      const endAt = endAtRef.current;
      if (endAt == null) return;
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemainingSec(next);
      if (next <= 0) setComplete(true);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [active, paused, complete, remainingSec]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (p) {
        endAtRef.current = Date.now() + pausedRemainingRef.current * 1000;
        return false;
      }
      pausedRemainingRef.current = remainingSec;
      endAtRef.current = null;
      return true;
    });
  }, [remainingSec]);

  const resetForNext = useCallback((nextDurationSec: number) => {
    setRemainingSec(nextDurationSec);
    setPaused(false);
    setComplete(false);
    endAtRef.current = null;
    pausedRemainingRef.current = nextDurationSec;
  }, []);

  const elapsedMs = durationSec * 1000 - remainingSec * 1000;

  return {
    remainingSec,
    paused,
    complete,
    togglePause,
    resetForNext,
    elapsedMs,
    setPaused,
  };
}
