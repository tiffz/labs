import { StaveNote, StringNumber, Fraction } from 'vexflow';
import type { ScoreNote } from '../music/scoreTypes';
import type { PracticeNoteResult } from '../practice/types';

export const FINGER_CROSSING_BOX_STROKE = '#0f766e';
export const FINGER_CROSSING_BOX_FILL = 'rgba(200, 240, 228, 0.22)';

export const RESULT_COLORS = {
  perfect: '#10b981',
  early: '#3b82f6',
  late: '#f59e0b',
  wrong_pitch: '#ef4444',
  missed: '#94a3b8',
};

export const WRONG_PITCH_GHOST_MAX_DISTANCE = 3;
export const SEMITONE_TO_PIXEL_SHIFT = 3.5;
export const LYRIC_FONT_SIZE = 13;
export const CHORD_FONT_SIZE = 14;

export const DURATION_COMPLEXITY_WEIGHT: Record<string, number> = {
  whole: 0.7,
  half: 0.9,
  quarter: 1.2,
  eighth: 1.8,
  sixteenth: 2.8,
};

/**
 * Piano fingerings: `StringNumber` uses stem/beam extents for above (stem up) and below (stem down),
 * so beamed triplets align on a row instead of stair-stepping with each notehead (`FretHandFinger` / `Annotation`).
 *
 * `StringNumber.draw()` recomputes Y from stem extents and **does not** apply `setOffsetY` for ABOVE/BELOW,
 * so clearance vs dense beams is tuned via `radius` (still no visible circle when `setDrawCircle(false)`).
 */
export function attachPianoFingering(
  staveNote: StaveNote,
  finger: number,
  placement: 'above' | 'below',
  opts?: { note?: ScoreNote; lhGrandStaffTupletNudge?: boolean },
) {
  const sn = new StringNumber(String(finger));
  sn.setPosition(placement);
  sn.setDrawCircle(false);
  sn.setDashed(false);
  sn.setFont('Roboto', 11, 'normal');

  const note = opts?.note;
  let radius = 8;
  if (note?.duration === 'sixteenth') {
    radius = 13;
  } else if (note?.tuplet && note.duration === 'eighth') {
    radius = 10;
  }
  if (opts?.lhGrandStaffTupletNudge && placement === 'below') {
    radius = Math.max(6, radius - 2);
  }
  (sn as StringNumber & { radius: number }).radius = radius;
  sn.setWidth(radius * 2 + 4);

  staveNote.addModifier(sn, 0);
}

export function closestWrongPitchDelta(
  expectedPitches: number[],
  playedPitches: number[],
): number | null {
  if (expectedPitches.length === 0 || playedPitches.length === 0) return null;
  let bestAbs = Number.POSITIVE_INFINITY;
  let bestDelta: number | null = null;
  for (const expected of expectedPitches) {
    for (const played of playedPitches) {
      const delta = played - expected;
      const abs = Math.abs(delta);
      if (abs < bestAbs) {
        bestAbs = abs;
        bestDelta = delta;
      }
    }
  }
  if (bestDelta === null || bestAbs > WRONG_PITCH_GHOST_MAX_DISTANCE) return null;
  return bestDelta;
}

/**
 * Union of each VexFlow `NoteHead` bbox only (no stems, flags, or modifiers).
 * DOM-based mapping was flaky (`getSVGElement` / `getScreenCTM` edge cases);
 * this uses the same layout numbers VexFlow already computed after `draw()`.
 */
export function unionNoteheadBoundsVexFlow(sn: StaveNote): { x: number; y: number; w: number; h: number } | null {
  const heads = sn.noteHeads;
  if (!heads || heads.length === 0) return null;
  let x1 = Number.POSITIVE_INFINITY;
  let y1 = Number.POSITIVE_INFINITY;
  let x2 = Number.NEGATIVE_INFINITY;
  let y2 = Number.NEGATIVE_INFINITY;
  for (const nh of heads) {
    try {
      const bb = nh.getBoundingBox();
      if (!bb) continue;
      const nx = bb.getX();
      const ny = bb.getY();
      const rw = bb.getW();
      const rh = bb.getH();
      x1 = Math.min(x1, nx);
      y1 = Math.min(y1, ny);
      x2 = Math.max(x2, nx + rw);
      y2 = Math.max(y2, ny + rh);
    } catch {
      /* layout */
    }
  }
  if (x1 === Number.POSITIVE_INFINITY) return null;
  return { x: x1, y: y1, w: Math.max(x2 - x1, 1), h: Math.max(y2 - y1, 1) };
}

/** Notehead or rest glyph bounds for metronome dot alignment (after `draw()`). */
export function unionMetronomeGlyphBoundsVexFlow(
  sn: StaveNote,
): { x: number; y: number; w: number; h: number } | null {
  const notehead = unionNoteheadBoundsVexFlow(sn);
  if (notehead) return notehead;
  try {
    const bb = sn.getBoundingBox();
    if (!bb) return null;
    return {
      x: bb.getX(),
      y: bb.getY(),
      w: Math.max(bb.getW(), 1),
      h: Math.max(bb.getH(), 1),
    };
  } catch {
    return null;
  }
}

export function liveActiveNoteMatched(
  note: ScoreNote,
  played: number[],
  mode: 'pitchClass' | 'writtenMidi',
  writtenMidiSemitoneSlack: number,
): boolean {
  if (note.pitches.length === 0 || played.length === 0) return false;
  if (mode === 'pitchClass') {
    return note.pitches.every((expectedPitch) =>
      played.some((playedPitch) => {
        const expectedPc = ((expectedPitch % 12) + 12) % 12;
        const playedPc = ((playedPitch % 12) + 12) % 12;
        return expectedPc === playedPc;
      }),
    );
  }
  const slack = Math.max(0, writtenMidiSemitoneSlack);
  return note.pitches.every((expectedPitch) =>
    played.some(
      (playedPitch) => Math.abs(playedPitch - expectedPitch) <= slack,
    ),
  );
}

export function applyNoteStyle(
  staveNote: StaveNote,
  note: ScoreNote,
  opts: {
    isGreyed: boolean;
    isCurrent: boolean;
    activeMidiNotes?: Set<number>;
    practiceResult?: PracticeNoteResult;
    highlightActiveMatches?: boolean;
    highlightActiveMatchMode?: 'pitchClass' | 'writtenMidi';
    highlightActiveMatchSemitoneSlack?: number;
  },
) {
  if (opts.isGreyed) {
    if (opts.isCurrent) {
      staveNote.setStyle({ fillStyle: '#7c3aed', strokeStyle: '#7c3aed' });
    } else {
      staveNote.setStyle({ fillStyle: GREYED_NOTE, strokeStyle: GREYED_NOTE });
    }
    return;
  }
  if (opts.isCurrent) {
    staveNote.setStyle({ fillStyle: '#7c3aed', strokeStyle: '#7c3aed' });
    return;
  }
  if (opts.practiceResult && !note.rest) {
    const r = opts.practiceResult;
    const color = r.pitchCorrect ? RESULT_COLORS[r.timing] : RESULT_COLORS.missed;
    staveNote.setStyle({ fillStyle: color, strokeStyle: color });
    return;
  }
  // Live exploration feedback — only enabled outside of scored practice
  // (gated by `highlightActiveMatches`). During scored practice this same
  // pitch-class match would also tint upcoming notes the user hasn't
  // reached yet, making them look like successful hits.
  if (
    opts.highlightActiveMatches
    && opts.activeMidiNotes
    && opts.activeMidiNotes.size > 0
    && !note.rest
  ) {
    const played = Array.from(opts.activeMidiNotes);
    const mode = opts.highlightActiveMatchMode ?? 'pitchClass';
    const slack = opts.highlightActiveMatchSemitoneSlack ?? 0;
    if (liveActiveNoteMatched(note, played, mode, slack)) {
      staveNote.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' });
    }
  }
}

export const GREYED_NOTE = '#94a3b8';
export const GREYED_CURRENT = '#a78bfa';
export const GREYED_STAFF = '#d4d8e0';

export function applyGreyToSVGElement(el: SVGElement) {
  const GREY = GREYED_NOTE;
  if (el instanceof SVGElement) {
    const tag = el.tagName.toLowerCase();
    const isShape = tag === 'rect' || tag === 'line' || tag === 'path'
      || tag === 'circle' || tag === 'ellipse' || tag === 'polygon'
      || tag === 'polyline' || tag === 'text';

    const fill = el.getAttribute('fill');
    if (fill && fill !== 'none' && fill !== 'transparent') {
      el.setAttribute('fill', GREY);
    } else if (!fill && isShape) {
      el.setAttribute('fill', GREY);
    }

    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none' && stroke !== 'transparent') {
      el.setAttribute('stroke', GREY);
    }

    for (let i = 0; i < el.children.length; i++) {
      applyGreyToSVGElement(el.children[i] as SVGElement);
    }
  }
}

export const KEY_NORMALIZE: Record<string, string> = {
  'Db': 'Db', 'Eb': 'Eb', 'Gb': 'Gb', 'Ab': 'Ab', 'Bb': 'Bb',
  'C#': 'Db', 'D#': 'Eb', 'F#': 'F#', 'G#': 'Ab', 'A#': 'Bb',
};

export function getVexflowKey(key: string): string {
  const n = KEY_NORMALIZE[key] || key;
  const map: Record<string, string> = {
    'C': 'C', 'Db': 'Db', 'D': 'D', 'Eb': 'Eb', 'E': 'E',
    'F': 'F', 'F#': 'F#', 'Gb': 'Gb', 'G': 'G', 'Ab': 'Ab',
    'A': 'A', 'Bb': 'Bb', 'B': 'B',
  };
  return map[n] || 'C';
}

export const KEY_SHARPS: Record<string, number> = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6,
};
export const KEY_FLATS: Record<string, number> = {
  'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6,
};

export function getKeySignatureInfo(key: string): number {
  const n = KEY_NORMALIZE[key] || key;
  return (KEY_SHARPS[n] ?? 0) + (KEY_FLATS[n] ?? 0);
}

export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export function getKeyAccidentalMap(key: string): Map<string, string> {
  const n = KEY_NORMALIZE[key] || key;
  const map = new Map<string, string>();
  if (KEY_SHARPS[n]) {
    for (let i = 0; i < KEY_SHARPS[n]; i++) map.set(SHARP_ORDER[i], '#');
  } else if (KEY_FLATS[n]) {
    for (let i = 0; i < KEY_FLATS[n]; i++) map.set(FLAT_ORDER[i], 'b');
  }
  return map;
}

export function createAccidentalTracker(keyAccMap: Map<string, string>) {
  const overrides = new Map<string, string>();
  return {
    reset() { overrides.clear(); },
    getNeeded(pitchStr: string): string | null {
      const match = pitchStr.match(/^([A-G])(b|#)?\/(\d+)$/);
      if (!match) return null;
      const [, letter, acc] = match;
      const noteAcc = acc || '';
      const keyAcc = keyAccMap.get(letter) || '';
      const memoKey = `${letter}`;
      const prev = overrides.get(memoKey);

      if (prev !== undefined) {
        if (prev === noteAcc) return null;
        overrides.set(memoKey, noteAcc);
        return noteAcc || 'n';
      }
      if (noteAcc === keyAcc) return null;
      overrides.set(memoKey, noteAcc);
      return noteAcc || 'n';
    },
  };
}

export function getBeamGroups(timeSig: { numerator: number; denominator: number }): Fraction[] {
  const { numerator, denominator } = timeSig;
  if (numerator > 3 && numerator % 3 === 0) {
    return [new Fraction(3, denominator)];
  }
  return [new Fraction(1, denominator)];
}

export function getBeamGroupsForNotes(
  timeSig: { numerator: number; denominator: number },
  notes: ScoreNote[],
): Fraction[] {
  const hasTripletEighths = notes.some(
    (note) =>
      !note.rest &&
      note.duration === 'eighth' &&
      note.tuplet?.actual === 3 &&
      note.tuplet?.normal === 2,
  );
  if (hasTripletEighths) {
    // In 4/4 triplet subdivision, beam in groups of 3 eighths.
    return [new Fraction(3, 8)];
  }
  return getBeamGroups(timeSig);
}

export const TREBLE_8VA_THRESHOLD = 86; // D6 — 3+ ledger lines above treble staff
export const BASS_8VA_THRESHOLD = 72;   // C5 — keeps 1-octave scales readable without 8va

export function renderOttavaBracket(
  svgEl: SVGElement,
  type: '8va' | '8vb',
  notes: StaveNote[],
  y: number,
) {
  if (notes.length === 0) return;
  try {
    const startX = notes[0].getAbsoluteX() - 3;
    const endX = notes[notes.length - 1].getAbsoluteX() + 12;
    const lineY = y + 3;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(startX));
    text.setAttribute('y', String(y));
    text.setAttribute('font-size', '9');
    text.setAttribute('font-family', 'Roboto, sans-serif');
    text.setAttribute('font-style', 'italic');
    text.setAttribute('fill', '#94a3b8');
    text.setAttribute('stroke', 'none');
    text.textContent = type;
    svgEl.appendChild(text);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(startX + 20));
    line.setAttribute('y1', String(lineY));
    line.setAttribute('x2', String(endX));
    line.setAttribute('y2', String(lineY));
    line.setAttribute('stroke', '#94a3b8');
    line.setAttribute('stroke-width', '0.75');
    line.setAttribute('stroke-dasharray', '4 3');
    svgEl.appendChild(line);

    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', String(endX));
    tick.setAttribute('y1', String(lineY));
    tick.setAttribute('x2', String(endX));
    tick.setAttribute('y2', String(lineY + 6));
    tick.setAttribute('stroke', '#94a3b8');
    tick.setAttribute('stroke-width', '0.75');
    svgEl.appendChild(tick);
  } catch { /* position lookup can fail */ }
}

export function findOttavaRuns(flags: boolean[], notes: StaveNote[]): StaveNote[][] {
  const runs: StaveNote[][] = [];
  let current: StaveNote[] = [];
  for (let i = 0; i < flags.length; i++) {
    if (flags[i]) {
      current.push(notes[i]);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

export function drawNavigationLabel(
  svg: SVGElement,
  x: number,
  y: number,
  label: string,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: 'normal' | 'italic';
    fontWeight?: string;
    fill?: string;
  },
) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', String(x));
  text.setAttribute('y', String(y));
  text.setAttribute('font-size', String(options?.fontSize ?? 11));
  text.setAttribute(
    'font-family',
    options?.fontFamily ?? 'ui-serif, Georgia, "Times New Roman", serif',
  );
  text.setAttribute('font-style', options?.fontStyle ?? 'normal');
  text.setAttribute('font-weight', options?.fontWeight ?? '600');
  text.setAttribute('fill', options?.fill ?? '#111827');
  text.setAttribute('stroke', 'none');
  text.textContent = label;
  svg.appendChild(text);
}

export function drawCodaGlyph(
  svg: SVGElement,
  x: number,
  y: number,
) {
  // Draw coda with vector primitives to avoid font/glyph dependencies.
  const centerX = x + 8;
  const centerY = y - 7;
  const radius = 6;
  const stroke = '#111827';

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(centerX));
  circle.setAttribute('cy', String(centerY));
  circle.setAttribute('r', String(radius));
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', stroke);
  circle.setAttribute('stroke-width', '1.35');
  svg.appendChild(circle);

  const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  hLine.setAttribute('x1', String(centerX - 8));
  hLine.setAttribute('y1', String(centerY));
  hLine.setAttribute('x2', String(centerX + 8));
  hLine.setAttribute('y2', String(centerY));
  hLine.setAttribute('stroke', stroke);
  hLine.setAttribute('stroke-width', '1.35');
  hLine.setAttribute('stroke-linecap', 'round');
  svg.appendChild(hLine);

  const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  vLine.setAttribute('x1', String(centerX));
  vLine.setAttribute('y1', String(centerY - 8));
  vLine.setAttribute('x2', String(centerX));
  vLine.setAttribute('y2', String(centerY + 8));
  vLine.setAttribute('stroke', stroke);
  vLine.setAttribute('stroke-width', '1.35');
  vLine.setAttribute('stroke-linecap', 'round');
  svg.appendChild(vLine);
}

export function drawSegnoGlyph(
  svg: SVGElement,
  x: number,
  y: number,
) {
  // Segno approximation using vector curves and dots (no font/glyph requirements).
  const stroke = '#111827';
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    [
      `M ${x + 2} ${y - 3}`,
      `C ${x + 9} ${y - 15}, ${x + 18} ${y + 3}, ${x + 8} ${y + 8}`,
      `C ${x + 2} ${y + 11}, ${x + 1} ${y + 4}, ${x + 8} ${y + 1}`,
      `C ${x + 15} ${y - 2}, ${x + 15} ${y + 12}, ${x + 5} ${y + 14}`,
    ].join(' '),
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', '1.35');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  const slash = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  slash.setAttribute('x1', String(x + 1));
  slash.setAttribute('y1', String(y + 15));
  slash.setAttribute('x2', String(x + 17));
  slash.setAttribute('y2', String(y - 9));
  slash.setAttribute('stroke', stroke);
  slash.setAttribute('stroke-width', '1.15');
  slash.setAttribute('stroke-linecap', 'round');
  svg.appendChild(slash);

  const dotTop = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dotTop.setAttribute('cx', String(x + 15));
  dotTop.setAttribute('cy', String(y - 1));
  dotTop.setAttribute('r', '1.3');
  dotTop.setAttribute('fill', stroke);
  svg.appendChild(dotTop);

  const dotBottom = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dotBottom.setAttribute('cx', String(x + 4));
  dotBottom.setAttribute('cy', String(y + 8));
  dotBottom.setAttribute('r', '1.3');
  dotBottom.setAttribute('fill', stroke);
  svg.appendChild(dotBottom);
}
