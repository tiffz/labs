import type { CSSProperties, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

const TITLE = 'Palette Generator';
const TITLE_COLORS = ['#ff4d9d', '#fbbf24', '#2dd4a8', '#38bdf8', '#a78bfa', '#fb7185', '#f97316', '#22d3ee'];
const ANIM_MS = 760;
const STAGGER_MS = 32;

export type PalettegenTitleProps = {
  compact?: boolean;
};

export function PalettegenTitle({ compact = false }: PalettegenTitleProps): ReactElement {
  const [cut, setCut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCut(true);
    const duration = ANIM_MS + TITLE.length * STAGGER_MS + 120;
    timerRef.current = setTimeout(() => {
      setCut(false);
      timerRef.current = null;
    }, duration);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <button
      type="button"
      className={[
        'palettegen-title',
        compact ? 'palettegen-title--compact' : '',
        cut ? 'palettegen-title--cut' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={play}
      aria-pressed={cut}
      data-testid="palettegen-title"
    >
      {TITLE.split('').map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="palettegen-title__char"
          style={
            cut
              ? ({
                  '--char-color': TITLE_COLORS[index % TITLE_COLORS.length],
                  '--char-delay': `${index * STAGGER_MS}ms`,
                  '--char-shift': `${(index - 8) * 2.5}px`,
                } as CSSProperties)
              : undefined
          }
        >
          {char === ' ' ? '\u00a0' : char}
        </span>
      ))}
    </button>
  );
}
