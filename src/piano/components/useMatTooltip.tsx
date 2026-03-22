import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Tooltip from '@mui/material/Tooltip';

export function useMatTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const showTip = useCallback((e: React.MouseEvent, text: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const clamped = Math.max(120, Math.min(cx, window.innerWidth - 120));
    setTip({ text, x: clamped, y: r.top });
  }, []);

  const hideTip = useCallback(() => setTip(null), []);

  const tipPortal =
    tip &&
    createPortal(
      <Tooltip
        open
        title={tip.text}
        arrow
        disableInteractive
        placement="top"
        enterDelay={350}
        leaveDelay={80}
        slotProps={{
          popper: {
            anchorEl: {
              getBoundingClientRect: () =>
                ({
                  width: 0,
                  height: 0,
                  top: tip.y,
                  right: tip.x,
                  bottom: tip.y,
                  left: tip.x,
                  x: tip.x,
                  y: tip.y,
                  toJSON: () => ({}),
                }) as DOMRect,
            },
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [0, 8],
                },
              },
            ],
          },
          tooltip: {
            sx: {
              backgroundColor: '#202124',
              color: '#fff',
              fontSize: '0.78rem',
              lineHeight: 1.35,
              borderRadius: '8px',
              padding: '7px 10px',
              maxWidth: 320,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.24)',
              whiteSpace: 'pre-line',
            },
          },
          arrow: {
            sx: {
              color: '#202124',
            },
          },
        }}
      >
        <span />
      </Tooltip>,
      document.body
    );

  return { showTip, hideTip, tipPortal };
}
