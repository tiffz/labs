import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useRef, type ReactElement } from 'react';

import type { PalettegenGalleryEntry } from '../hooks/usePalettegenGallery';
import { paletteThumbnailGradient } from '../utils/paletteThumbnailGradient';

export type PalettegenThumbnailStripProps = {
  entries: PalettegenGalleryEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNavigate: (delta: number) => void;
};

function scrollThumbIntoView(scroller: HTMLElement, thumb: HTMLElement, smooth: boolean): void {
  const targetLeft = thumb.offsetLeft - (scroller.clientWidth - thumb.offsetWidth) / 2;
  scroller.scrollTo({
    left: Math.max(0, targetLeft),
    behavior: smooth ? 'smooth' : 'auto',
  });
}

export function PalettegenThumbnailStrip({
  entries,
  activeId,
  onSelect,
  onNavigate,
}: PalettegenThumbnailStripProps): ReactElement | null {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const smoothScrollRef = useRef(true);
  const activeIndex = entries.findIndex((entry) => entry.id === activeId);
  const index = activeIndex >= 0 ? activeIndex : 0;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!activeId || !scroller) return;
    const thumb = scroller.querySelector(`[data-testid="palettegen-thumb-${activeId}"]`);
    if (!(thumb instanceof HTMLElement)) return;
    scrollThumbIntoView(scroller, thumb, smoothScrollRef.current);
    smoothScrollRef.current = true;
  }, [activeId]);

  if (entries.length === 0) return null;

  const go = (delta: number): void => {
    smoothScrollRef.current = true;
    onNavigate(delta);
  };

  return (
    <div className="palettegen-thumbs" data-testid="palettegen-thumbs">
      <div
        ref={scrollerRef}
        className="palettegen-thumbs__scroller"
        role="list"
        aria-label="Palette variations. Use arrow keys or buttons to browse."
      >
        {entries.map((entry, entryIndex) => {
          const active = entry.id === activeId;
          return (
            <button
              key={entry.id}
              type="button"
              className={['palettegen-thumbs__item', active ? 'palettegen-thumbs__item--active' : ''].filter(Boolean).join(' ')}
              style={{ background: paletteThumbnailGradient(entry) }}
              onClick={() => {
                smoothScrollRef.current = true;
                onSelect(entry.id);
              }}
              aria-label={`${entry.label} (${entryIndex + 1} of ${entries.length})`}
              aria-current={active ? 'true' : undefined}
              title={entry.label}
              data-testid={`palettegen-thumb-${entry.id}`}
            />
          );
        })}
      </div>

      <div className="palettegen-thumbs__chrome" aria-label="Palette navigator">
        <Tooltip title="Previous palette (←)">
          <span>
            <IconButton
              size="small"
              className="palettegen-thumbs__nav"
              disabled={entries.length < 2}
              onClick={() => go(-1)}
              aria-label="Previous palette"
              data-testid="palettegen-gallery-prev"
            >
              <ChevronLeftOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <span className="palettegen-thumbs__counter" aria-live="polite">
          {index + 1} / {entries.length}
        </span>

        <Tooltip title="Next palette (→)">
          <span>
            <IconButton
              size="small"
              className="palettegen-thumbs__nav"
              disabled={entries.length < 2}
              onClick={() => go(1)}
              aria-label="Next palette"
              data-testid="palettegen-gallery-next"
            >
              <ChevronRightOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
