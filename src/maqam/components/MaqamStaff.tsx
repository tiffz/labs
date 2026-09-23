import { useEffect, useRef, useState } from 'react';

import { useVexFlowMusicFontReady } from '../../shared/notation/useVexFlowMusicFontReady';
import { drawMaqamStaff, describeStaff, type StaffNote } from '../notation/maqamStaffDraw';

interface MaqamStaffProps {
  notes: StaffNote[];
  height?: number;
  /** Shown in place of the staff when there is nothing to draw. */
  emptyMessage?: string;
  className?: string;
}

const DEFAULT_HEIGHT = 96;
const MIN_WIDTH = 240;

/**
 * A single stave, redrawn when its notes or its width change.
 *
 * VexFlow draws to a fixed pixel width, so the stave has to be re-rendered on
 * resize rather than scaled with CSS — scaling would stretch the clef and
 * noteheads out of proportion with the staff lines.
 */
export default function MaqamStaff({
  notes,
  height = DEFAULT_HEIGHT,
  emptyMessage,
  className,
}: MaqamStaffProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const fontReady = useVexFlowMusicFontReady();

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observe = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      // Round to whole pixels: a fractional resize loop would redraw the whole
      // stave on every sub-pixel change during a window drag.
      setWidth(Math.round(next));
    });
    observe.observe(host);
    setWidth(Math.round(host.getBoundingClientRect().width));
    return () => observe.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !fontReady || width < MIN_WIDTH) return;
    let cancelled = false;
    void drawMaqamStaff(host, notes, { width, height }).then(() => {
      // A newer draw may have started during the font await; its own effect
      // will have cleared and redrawn, so nothing to undo here.
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [notes, width, height, fontReady]);

  const isEmpty = notes.length === 0;

  return (
    <div className={['maqam-staff', className].filter(Boolean).join(' ')}>
      <div
        ref={hostRef}
        className="maqam-staff__canvas"
        style={{ minHeight: height }}
        data-testid="maqam-staff-canvas"
      />
      {isEmpty && emptyMessage && (
        <p className="maqam-staff__empty">{emptyMessage}</p>
      )}
      {/* The SVG carries its own aria-label; this keeps the note list available
          even before the font resolves and the SVG exists. */}
      <span className="maqam-visually-hidden">{describeStaff(notes)}</span>
    </div>
  );
}
