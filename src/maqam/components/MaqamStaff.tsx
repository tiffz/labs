import { useEffect, useRef, useState } from 'react';

import { useVexFlowMusicFontReady } from '../../shared/notation/useVexFlowMusicFontReady';
import {
  drawMaqamStaff,
  describeStaff,
  type StaffBracket,
  type StaffNote,
} from '../notation/maqamStaffDraw';
import { applyStaffHighlight } from '../notation/maqamStaffHighlight';

/** Shared so an absent `highlighted` does not make a new object every render. */
const NOTHING_LIT: ReadonlySet<number> = new Set<number>();

interface MaqamStaffProps {
  notes: StaffNote[];
  /** Indices into `notes` to draw lit — the degrees currently being played. */
  highlighted?: ReadonlySet<number>;
  /** Ajnas to bracket above the staff. */
  brackets?: StaffBracket[];
  /** Hold the bracket's row of space open even when no bracket is drawn. */
  reserveBracketRow?: boolean;
  className?: string;
}

/**
 * Unscaled drawing height used for the FIRST draw only. The real height comes
 * back from `drawMaqamStaff`, which measures what VexFlow put on the page.
 */
const BASE_HEIGHT = 96;
const MIN_WIDTH = 240;
/**
 * Width at which the stave reads at its natural size; wider gets scaled up.
 *
 * 620 left the hero element a 101px ribbon of notation across an 840px card,
 * and the left column then ran 76px short of the ajnas panel beside it — the
 * "weird spacing between the keyboard and the renderer". The music is what the
 * page is about; at 460 it is drawn at the size that says so, and the two
 * columns come out level without stretching an empty box to fake it.
 */
const COMFORTABLE_WIDTH = 400;
/** Past this the noteheads look inflated rather than generous. */
const MAX_SCALE = 2.2;

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
export default function MaqamStaff({
  notes,
  highlighted,
  brackets,
  reserveBracketRow,
  className,
}: MaqamStaffProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  /**
   * `null` until a draw reports one, never 0 — a zero height is a valid-looking
   * value that would collapse the staff to nothing while looking deliberate.
   */
  const [drawnHeight, setDrawnHeight] = useState<number | null>(null);
  /**
   * Bumped by every completed layout, and a dependency of the highlight below.
   *
   * A redraw paints every note in its resting colour, so whatever was lit has
   * to be re-applied afterwards. Without this the highlight would survive only
   * until the next resize or jins hover, and then silently vanish.
   */
  const [layoutVersion, setLayoutVersion] = useState(0);
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
    void drawMaqamStaff(host, notes, {
      width,
      height: drawHeight,
      scale,
      brackets,
      reserveBracketRow,
    }).then((measured) => {
      // A newer draw has started, or nothing could be measured. Either way,
      // do not overwrite the box with a stale or invented number.
      if (!current) return;
      setLayoutVersion((version) => version + 1);
      if (measured === undefined) return;
      setDrawnHeight(measured);
    });
    return () => {
      current = false;
    };
    /*
     * `highlighted` is deliberately NOT a dependency. It used to be, and every
     * key press therefore re-ran VexFlow's entire layout — ~29ms of render and
     * 8 staff DOM mutations per note, measured on the real app. Web MIDI
     * delivers on the main thread, so that redraw is what the next note has to
     * wait behind. Lighting a note is now the separate, cheap effect below.
     */
  }, [notes, brackets, reserveBracketRow, width, drawHeight, scale, fontReady]);

  /**
   * Lighting the played degrees: attribute writes on the stave already on
   * screen, no layout, no VexFlow.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    applyStaffHighlight(host, highlighted ?? NOTHING_LIT);
  }, [highlighted, layoutVersion]);

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
