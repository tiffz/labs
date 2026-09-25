import { useEffect, useRef, useState } from 'react';

import { useVexFlowMusicFontReady } from '../../shared/notation/useVexFlowMusicFontReady';
import { drawMaqamStaff, describeStaff, type StaffNote } from '../notation/maqamStaffDraw';

interface MaqamStaffProps {
  notes: StaffNote[];
  /** Indices into `notes` to draw lit — the degrees currently being played. */
  highlighted?: ReadonlySet<number>;
  className?: string;
}

/**
 * Unscaled drawing height used for the FIRST draw only. The real height comes
 * back from `drawMaqamStaff`, which measures what VexFlow put on the page.
 */
const BASE_HEIGHT = 96;
const MIN_WIDTH = 240;
/** Width at which the stave reads at its natural size; wider gets scaled up. */
const COMFORTABLE_WIDTH = 620;
/** Past this the noteheads look inflated rather than generous. */
const MAX_SCALE = 1.9;

/**
 * A single stave, sized from its width.
 *
 * VexFlow draws to fixed pixel coordinates, so growing the notation is a canvas
 * transform rather than a CSS stretch — CSS scaling would distort staff-line
 * weight against notehead size.
 *
 * Scale comes from the width and the height follows from it. Deriving it from
 * the available *height* instead was tried and looked worse: the box stretched
 * to whatever the layout had spare and the notation sat in a pool of white.
 * It also risked a measure-draw feedback loop, since the SVG is what fills the
 * box being measured.
 */
export default function MaqamStaff({ notes, highlighted, className }: MaqamStaffProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  /**
   * `null` until a draw reports one, never 0 — a zero height is a valid-looking
   * value that would collapse the staff to nothing while looking deliberate.
   */
  const [drawnHeight, setDrawnHeight] = useState<number | null>(null);
  const fontReady = useVexFlowMusicFontReady();

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    // Whole pixels: a fractional resize loop would redraw the entire stave on
    // every sub-pixel change during a window drag.
    const measure = (next: number) => setWidth(Math.round(next));
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) measure(rect.width);
    });
    observer.observe(host);
    measure(host.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(Math.max(width / COMFORTABLE_WIDTH, 1), MAX_SCALE);
  const drawHeight = Math.round(BASE_HEIGHT * scale);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !fontReady || width < MIN_WIDTH) return;
    let current = true;
    void drawMaqamStaff(host, notes, { width, height: drawHeight, scale, highlighted }).then(
      (measured) => {
        // A newer draw has started, or nothing could be measured. Either way,
        // do not overwrite the box with a stale or invented number.
        if (!current || measured === undefined) return;
        setDrawnHeight(measured);
      },
    );
    return () => {
      current = false;
    };
  }, [notes, highlighted, width, drawHeight, scale, fontReady]);

  return (
    <div className={['maqam-staff', className].filter(Boolean).join(' ')}>
      {/* `drawMaqamStaff` puts role="img" and the note list on this element, so
          the staff has one accessible name whether or not the SVG exists yet. */}
      <div
        ref={hostRef}
        className="maqam-staff__canvas"
        style={{ height: drawnHeight ?? drawHeight }}
        data-testid="maqam-staff-canvas"
        role="img"
        aria-label={describeStaff(notes)}
      />
    </div>
  );
}
