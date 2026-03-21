import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export function useMatTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const showTip = useCallback((e: React.MouseEvent, text: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const clamped = Math.max(120, Math.min(cx, window.innerWidth - 120));
    setTip({ text, x: clamped, y: r.top });
  }, []);

  const hideTip = useCallback(() => setTip(null), []);

  const tipPortal = tip
    ? createPortal(
        <div className="mat-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>,
        document.body,
      )
    : null;

  return { showTip, hideTip, tipPortal };
}
