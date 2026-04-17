import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, Beam, Dot, Annotation, Accidental, Fraction, StaveTie, Tuplet, BarlineType } from 'vexflow';
import type { PianoScore, ScoreNote } from '../music/scoreTypes';
import type { PracticeNoteResult } from '../practice/types';
import { DURATION_VEXFLOW, midiToPitchStringForKey, durationToBeats } from '../music/scoreTypes';
import { matchesChord } from '../music/chordMatcher';
import { scrollPlaybackTarget, type PlaybackAutoScrollState } from '../utils/playbackAutoScroll';

export interface GhostNote {
  midi: number;
  duration: import('../music/scoreTypes').NoteDuration;
}

interface ScoreDisplayProps {
  score: PianoScore;
  currentMeasureIndex: number;
  currentNoteIndices: Map<string, number>;
  activeMidiNotes?: Set<number>;
  practiceResultsByNoteId?: Map<string, PracticeNoteResult>;
  greyedOutHands?: Set<string>;
  hiddenHands?: Set<string>;
  ghostNotes?: GhostNote[];
  zoomLevel?: number;
  selectedMeasureRange?: { start: number; end: number } | null;
  onMeasureClick?: (measureIndex: number, shiftKey: boolean) => void;
  showVocalPart?: boolean;
  showChords?: boolean;
}

const RESULT_COLORS = {
  perfect: '#10b981',
  early: '#3b82f6',
  late: '#f59e0b',
  wrong_pitch: '#ef4444',
  missed: '#94a3b8',
};

const WRONG_PITCH_GHOST_MAX_DISTANCE = 3;
const SEMITONE_TO_PIXEL_SHIFT = 3.5;
const LYRIC_FONT_SIZE = 13;
const CHORD_FONT_SIZE = 14;

const DURATION_COMPLEXITY_WEIGHT: Record<string, number> = {
  whole: 0.7,
  half: 0.9,
  quarter: 1.2,
  eighth: 1.8,
  sixteenth: 2.8,
};

function closestWrongPitchDelta(
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

function applyNoteStyle(
  staveNote: StaveNote,
  note: ScoreNote,
  opts: {
    isGreyed: boolean;
    isCurrent: boolean;
    activeMidiNotes?: Set<number>;
    practiceResult?: PracticeNoteResult;
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
  if (opts.activeMidiNotes && opts.activeMidiNotes.size > 0 && !note.rest) {
    const played = Array.from(opts.activeMidiNotes);
    const strictMatched = note.pitches.length > 0 && note.pitches.every((expectedPitch) =>
      played.some((playedPitch) => {
        const expectedPc = ((expectedPitch % 12) + 12) % 12;
        const playedPc = ((playedPitch % 12) + 12) % 12;
        return expectedPc === playedPc;
      })
    );
    if (strictMatched) {
      staveNote.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' });
    }
  }
}

const GREYED_NOTE = '#94a3b8';
const GREYED_CURRENT = '#a78bfa';
const GREYED_STAFF = '#d4d8e0';

function applyGreyToSVGElement(el: SVGElement) {
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

const KEY_NORMALIZE: Record<string, string> = {
  'Db': 'Db', 'Eb': 'Eb', 'Gb': 'Gb', 'Ab': 'Ab', 'Bb': 'Bb',
  'C#': 'Db', 'D#': 'Eb', 'F#': 'F#', 'G#': 'Ab', 'A#': 'Bb',
};

function getVexflowKey(key: string): string {
  const n = KEY_NORMALIZE[key] || key;
  const map: Record<string, string> = {
    'C': 'C', 'Db': 'Db', 'D': 'D', 'Eb': 'Eb', 'E': 'E',
    'F': 'F', 'F#': 'F#', 'Gb': 'Gb', 'G': 'G', 'Ab': 'Ab',
    'A': 'A', 'Bb': 'Bb', 'B': 'B',
  };
  return map[n] || 'C';
}

const KEY_SHARPS: Record<string, number> = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6,
};
const KEY_FLATS: Record<string, number> = {
  'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6,
};

function getKeySignatureInfo(key: string): number {
  const n = KEY_NORMALIZE[key] || key;
  return (KEY_SHARPS[n] ?? 0) + (KEY_FLATS[n] ?? 0);
}

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function getKeyAccidentalMap(key: string): Map<string, string> {
  const n = KEY_NORMALIZE[key] || key;
  const map = new Map<string, string>();
  if (KEY_SHARPS[n]) {
    for (let i = 0; i < KEY_SHARPS[n]; i++) map.set(SHARP_ORDER[i], '#');
  } else if (KEY_FLATS[n]) {
    for (let i = 0; i < KEY_FLATS[n]; i++) map.set(FLAT_ORDER[i], 'b');
  }
  return map;
}

function createAccidentalTracker(keyAccMap: Map<string, string>) {
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

function getBeamGroups(timeSig: { numerator: number; denominator: number }): Fraction[] {
  const { numerator, denominator } = timeSig;
  if (numerator > 3 && numerator % 3 === 0) {
    return [new Fraction(3, denominator)];
  }
  return [new Fraction(1, denominator)];
}

function getBeamGroupsForNotes(
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

const TREBLE_8VA_THRESHOLD = 86; // D6 — 3+ ledger lines above treble staff
const BASS_8VA_THRESHOLD = 72;   // C5 — keeps 1-octave scales readable without 8va

function renderOttavaBracket(
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

function findOttavaRuns(flags: boolean[], notes: StaveNote[]): StaveNote[][] {
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

function drawNavigationLabel(
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

function drawCodaGlyph(
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

function drawSegnoGlyph(
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

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score, currentMeasureIndex, currentNoteIndices, activeMidiNotes,
  practiceResultsByNoteId, greyedOutHands, hiddenHands, ghostNotes,
  zoomLevel = 1.0, selectedMeasureRange, onMeasureClick,
  showVocalPart = false, showChords = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateKeyRef = useRef('');
  const [containerWidth, setContainerWidth] = useState(0);
  const autoScrollStateRef = useRef<PlaybackAutoScrollState>({
    lastMarker: null,
    lastScrollAtMs: 0,
    lastTargetTop: null,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.round(el.clientWidth || 0);
      setContainerWidth((prev) => (prev === next ? prev : next));
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateWidth());
      resizeObserver.observe(el);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver?.disconnect();
    };
  }, []);

  const handleMeasureClick = useCallback((e: MouseEvent) => {
    if (!onMeasureClick || !containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;
    const rects = svgEl.querySelectorAll<SVGRectElement>('[data-measure-idx]');
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgEl.getScreenCTM()?.inverse());

    for (const rect of rects) {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const w = parseFloat(rect.getAttribute('width') || '0');
      const h = parseFloat(rect.getAttribute('height') || '0');
      if (svgPt.x >= x && svgPt.x <= x + w && svgPt.y >= y && svgPt.y <= y + h) {
        const idx = parseInt(rect.getAttribute('data-measure-idx') || '0', 10);
        onMeasureClick(idx, e.shiftKey);
        return;
      }
    }
  }, [onMeasureClick]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('click', handleMeasureClick);
    return () => el.removeEventListener('click', handleMeasureClick);
  }, [handleMeasureClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const stateKey = JSON.stringify({
      id: score.id, key: score.key, ts: score.timeSignature,
      parts: score.parts.map((p) =>
        p.measures.map((m) =>
          m.notes
            .map((n) => `${n.pitches.join('.')}:${n.duration}:${n.dotted ? 1 : 0}:${n.rest ? 1 : 0}:${n.chordSymbol ?? ''}`)
            .join('|')
        )
      ),
      mi: currentMeasureIndex, ni: Array.from(currentNoteIndices.entries()),
      active: activeMidiNotes ? Array.from(activeMidiNotes).sort() : [],
      pr: practiceResultsByNoteId
        ? Array.from(practiceResultsByNoteId.entries())
            .map(
              ([k, v]) =>
                `${k}:${v.timing}:${Math.round(v.timingOffsetMs)}:${v.pitchCorrect ? 1 : 0}:${v.playedPitches.join(',')}`,
            )
            .sort()
        : [],
      gh: greyedOutHands ? Array.from(greyedOutHands) : [],
      hh: hiddenHands ? Array.from(hiddenHands) : [],
      gn: ghostNotes ? ghostNotes.map(g => `${g.midi}:${g.duration}`) : [],
      zm: zoomLevel,
      sel: selectedMeasureRange ? `${selectedMeasureRange.start}-${selectedMeasureRange.end}` : '',
      sv: showVocalPart,
      sc: showChords,
      cw: containerWidth,
    });
    if (stateKey === stateKeyRef.current) return;
    stateKeyRef.current = stateKey;

    containerRef.current.innerHTML = '';

    try {
      const rhPart = score.parts.find(p => p.hand === 'right');
      const lhPart = score.parts.find(p => p.hand === 'left');
      const vocalPart = showVocalPart ? score.parts.find(p => p.hand === 'voice') : undefined;
      if (!rhPart && !lhPart) return;

      const showTreble = !(hiddenHands?.has('right'));
      const showBass = !(hiddenHands?.has('left'));

      const maxMeasures = Math.max(
        (showTreble ? rhPart?.measures.length ?? 0 : 0),
        (showBass ? lhPart?.measures.length ?? 0 : 0),
        vocalPart?.measures.length ?? 0,
        rhPart?.measures.length ?? 0,
        lhPart?.measures.length ?? 0,
      );
      if (maxMeasures === 0) return;

      const rawContainerWidth = containerWidth || containerRef.current.clientWidth || 900;
      const effectiveWidth = rawContainerWidth / zoomLevel;
      const keySigCount = getKeySignatureInfo(score.key);
      const vexKey = getVexflowKey(score.key);
      const keyAccMap = getKeyAccidentalMap(score.key);
      const HEADER_EXTRA = 50 + keySigCount * 12 + 35;
      const availableWidth = effectiveWidth - 40;

      const measureMinContentWidths = Array.from({ length: maxMeasures }, (_, mi) => {
        const rhMeasure = rhPart?.measures[mi];
        const lhMeasure = lhPart?.measures[mi];
        const vMeasure = vocalPart?.measures[mi];
        const rhCount = rhMeasure?.notes.length ?? 0;
        const lhCount = lhMeasure?.notes.length ?? 0;
        const vCount = vMeasure?.notes.length ?? 0;
        const noteCount = Math.max(rhCount, lhCount, vCount, 1);

        const complexityForMeasure = (measure: typeof rhMeasure): number => {
          if (!measure) return 0;
          return measure.notes.reduce((sum, note) => {
            if (note.rest) return sum + 0.35;
            const durWeight = DURATION_COMPLEXITY_WEIGHT[note.duration] ?? 1.3;
            const chordFactor = Math.max(1, Math.sqrt(Math.max(note.pitches.length, 1)));
            const dottedFactor = note.dotted ? 1.1 : 1;
            const tupletFactor = note.tuplet ? 1.25 : 1;
            return sum + durWeight * chordFactor * dottedFactor * tupletFactor;
          }, 0);
        };

        const complexity = Math.max(
          complexityForMeasure(rhMeasure),
          complexityForMeasure(lhMeasure),
          complexityForMeasure(vMeasure),
          0,
        );
        const hasTuplets =
          !!rhMeasure?.notes.some((n) => !!n.tuplet) ||
          !!lhMeasure?.notes.some((n) => !!n.tuplet) ||
          !!vMeasure?.notes.some((n) => !!n.tuplet);
        const hasLyricsInMeasure = !!vMeasure?.notes.some((n) => !!n.lyric);
        const hasChordSymbols =
          !!rhMeasure?.notes.some((n) => !!n.chordSymbol) ||
          !!lhMeasure?.notes.some((n) => !!n.chordSymbol) ||
          !!vMeasure?.notes.some((n) => !!n.chordSymbol);

        return Math.max(
          146,
          Math.min(
            390,
            132 +
              noteCount * 22 +
              complexity * 9 +
              (hasTuplets ? 34 : 0) +
              (hasLyricsInMeasure ? 20 : 0) +
              (hasChordSymbols ? 10 : 0),
          ),
        );
      });

      const maxMeasuresPerLine = Math.max(2, Math.ceil(5.8 / zoomLevel));
      const candidateStart = Math.min(maxMeasuresPerLine, maxMeasures);
      let measuresPerLine = 1;
      for (let candidate = candidateStart; candidate >= 1; candidate--) {
        let fitsAllLines = true;
        const lineCount = Math.ceil(maxMeasures / candidate);
        for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
          const startMeasure = lineIdx * candidate;
          const endMeasure = Math.min(startMeasure + candidate, maxMeasures);
          const minContentNeeded = measureMinContentWidths
            .slice(startMeasure, endMeasure)
            .reduce((sum, width) => sum + width, 0);
          const requiredWidth = HEADER_EXTRA + minContentNeeded;
          if (requiredWidth > availableWidth) {
            fitsAllLines = false;
            break;
          }
        }
        if (fitsAllLines) {
          measuresPerLine = candidate;
          break;
        }
      }
      const numLines = Math.ceil(maxMeasures / measuresPerLine);

      const staffSpacing = 80;
      const hasLyrics = vocalPart?.measures.some(m => m.notes.some(n => n.lyric));
      const rawVocalSpacing = vocalPart ? (hasLyrics ? 110 : 80) : 0;
      const lineHeight = 180
        + (vocalPart && (showTreble || showBass) ? rawVocalSpacing : 0)
        + (showTreble && showBass ? staffSpacing : 0);
      const totalHeight = numLines * lineHeight + 60;
      const rhGreyed = greyedOutHands?.has('right') ?? false;
      const lhGreyed = greyedOutHands?.has('left') ?? false;
      const voiceGreyed = greyedOutHands?.has('voice') ?? false;

      const showMeasureNumbers = maxMeasures > 5;

      const noteIdToStaveNote = new Map<string, StaveNote>();
      const repeatStartMeasures = new Set<number>();
      const repeatEndMeasures = new Map<number, number | undefined>();
      for (const repeat of score.navigation?.repeats ?? []) {
        if (repeat.direction === 'forward') repeatStartMeasures.add(repeat.measureIndex);
        if (repeat.direction === 'backward') repeatEndMeasures.set(repeat.measureIndex, repeat.times);
      }
      const endingByMeasure = new Map<number, number>();
      for (const volta of score.navigation?.voltas ?? []) {
        for (let mi = volta.startMeasure; mi <= volta.endMeasure; mi++) {
          if (!endingByMeasure.has(mi)) endingByMeasure.set(mi, volta.endingNumber);
        }
      }

      // Tie tracking with line index for cross-line tie support
      interface TiePair { first: StaveNote; firstIdx: number; last: StaveNote; lastIdx: number; firstLine: number; lastLine: number; partType?: 'treble' | 'bass' | 'vocal' }
      const tiePairs: TiePair[] = [];
      const openTies = new Map<number, { note: StaveNote; pitchIdx: number; lineIdx: number }>();

      // Tuplet tracking
      interface TupletGroup { notes: StaveNote[]; actual: number; normal: number }
      const tupletGroups: TupletGroup[] = [];

      // Use context.scale for crisp SVG instead of CSS transform
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(rawContainerWidth, totalHeight * zoomLevel);
      const context = renderer.getContext();
      context.scale(zoomLevel, zoomLevel);
      containerRef.current.style.height = `${totalHeight * zoomLevel + 60}px`;

      for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
        const startMeasure = lineIdx * measuresPerLine;
        const endMeasure = Math.min(startMeasure + measuresPerLine, maxMeasures);
        const measuresInLine = endMeasure - startMeasure;

        const lineTreble8vaNotes: StaveNote[] = [];
        const lineTreble8vaFlags: boolean[] = [];
        const lineBass8vaNotes: StaveNote[] = [];
        const lineBass8vaFlags: boolean[] = [];

        let yOffset = 30 + lineIdx * lineHeight;
        const vocalY = vocalPart ? yOffset : 0;
        if (vocalPart) yOffset += rawVocalSpacing;
        const trebleY = showTreble ? yOffset : 0;
        if (showTreble) yOffset += staffSpacing;
        const bassY = showBass ? yOffset : 0;

        const topStaveY = vocalPart ? vocalY : (showTreble ? trebleY : bassY);

        const BASE_WEIGHT = 2;

        const measureWeights: number[] = [];
        const lineMinContentWidths: number[] = [];
        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const rhCount = rhPart?.measures[mi]?.notes.length ?? 0;
          const lhCount = lhPart?.measures[mi]?.notes.length ?? 0;
          const vCount = vocalPart?.measures[mi]?.notes.length ?? 0;
          const noteCount = Math.max(rhCount, lhCount, vCount, 1);
          measureWeights.push(BASE_WEIGHT + Math.max(noteCount, 3));
          lineMinContentWidths.push(measureMinContentWidths[mi] ?? 100);
        }

        const totalWeight = measureWeights.reduce((a, b) => a + b, 0);
        const contentPool = Math.max(0, availableWidth - HEADER_EXTRA);
        const minContentTotal = lineMinContentWidths.reduce((a, b) => a + b, 0);
        const extraPool = Math.max(0, contentPool - minContentTotal);

        const rawWidths = measureWeights.map((w, i) => {
          const extraShare = totalWeight > 0 ? (w / totalWeight) * extraPool : 0;
          const contentWidth = lineMinContentWidths[i] + extraShare;
          return i === 0 ? contentWidth + HEADER_EXTRA : contentWidth;
        });
        const flooredWidths = rawWidths.map(w => Math.floor(w));
        flooredWidths[measuresInLine - 1] += availableWidth - flooredWidths.reduce((a, b) => a + b, 0);

        const trebleStaves: Stave[] = [];
        const bassStaves: Stave[] = [];
        const vocalStaves: Stave[] = [];
        let currentX = 20;

        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const localIdx = mi - startMeasure;
          const w = flooredWidths[localIdx];
          const measureForFlags = rhPart?.measures[mi] ?? lhPart?.measures[mi] ?? vocalPart?.measures[mi];
          const hasRepeatStart = !!measureForFlags?.repeatStart || repeatStartMeasures.has(mi);
          const repeatEndTimes = measureForFlags?.repeatTimes ?? repeatEndMeasures.get(mi);
          const hasRepeatEnd = !!measureForFlags?.repeatEnd || repeatEndMeasures.has(mi);
          const endingNumber = measureForFlags?.endingNumber ?? endingByMeasure.get(mi);

          if (vocalPart) {
            const vocal = new Stave(currentX, vocalY, w);
            if (localIdx === 0) {
              vocal.addClef('treble');
              if (keySigCount > 0) { try { vocal.addKeySignature(vexKey); } catch { /* skip */ } }
              vocal.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
            }
            if (voiceGreyed) vocal.setStyle({ strokeStyle: GREYED_STAFF, fillStyle: GREYED_STAFF });
            if (hasRepeatStart) vocal.setBegBarType(BarlineType.REPEAT_BEGIN);
            if (hasRepeatEnd) vocal.setEndBarType(BarlineType.REPEAT_END);
            vocalStaves.push(vocal);
          }

          if (showTreble) {
            const treble = new Stave(currentX, trebleY, w);
            if (localIdx === 0) {
              treble.addClef('treble');
              if (keySigCount > 0) { try { treble.addKeySignature(vexKey); } catch { /* skip */ } }
              treble.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
            }
            if (rhGreyed) treble.setStyle({ strokeStyle: GREYED_STAFF, fillStyle: GREYED_STAFF });
            if (hasRepeatStart) treble.setBegBarType(BarlineType.REPEAT_BEGIN);
            if (hasRepeatEnd) treble.setEndBarType(BarlineType.REPEAT_END);
            trebleStaves.push(treble);
          }

          if (showBass) {
            const bass = new Stave(currentX, bassY, w);
            if (localIdx === 0) {
              bass.addClef('bass');
              if (keySigCount > 0) { try { bass.addKeySignature(vexKey); } catch { /* skip */ } }
              bass.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
            }
            if (lhGreyed) bass.setStyle({ strokeStyle: GREYED_STAFF, fillStyle: GREYED_STAFF });
            if (hasRepeatStart) bass.setBegBarType(BarlineType.REPEAT_BEGIN);
            if (hasRepeatEnd) bass.setEndBarType(BarlineType.REPEAT_END);
            bassStaves.push(bass);
          }

          currentX += w;

          if (hasRepeatEnd && repeatEndTimes && repeatEndTimes > 1) {
            const svgEl = containerRef.current!.querySelector('svg');
            const topRefStave = vocalStaves[localIdx] ?? trebleStaves[localIdx] ?? bassStaves[localIdx];
            if (svgEl && topRefStave) {
              drawNavigationLabel(
                svgEl,
                topRefStave.getX() + topRefStave.getWidth() - 18,
                topStaveY - 20,
                `${repeatEndTimes}x`,
              );
            }
          }
          if (endingNumber !== undefined) {
            const svgEl = containerRef.current!.querySelector('svg');
            const topRefStave = vocalStaves[localIdx] ?? trebleStaves[localIdx] ?? bassStaves[localIdx];
            const isEndingStart = mi === 0 || endingByMeasure.get(mi - 1) !== endingNumber;
            if (svgEl && topRefStave && isEndingStart) {
              drawNavigationLabel(svgEl, topRefStave.getX() + 8, topStaveY - 20, `${endingNumber}.`);
            }
          }
        }

        {
          const svgForStaves = containerRef.current!.querySelector('svg');
          const drawStavesWithGrey = (staves: Stave[], isGreyed: boolean) => {
            if (staves.length === 0) return;
            const before = svgForStaves ? svgForStaves.children.length : 0;
            staves.forEach(s => s.setContext(context).draw());
            if (isGreyed && svgForStaves) {
              const after = svgForStaves.children.length;
              for (let ci = before; ci < after; ci++) {
                applyGreyToSVGElement(svgForStaves.children[ci] as SVGElement);
              }
            }
          };
          drawStavesWithGrey(vocalStaves, voiceGreyed);
          drawStavesWithGrey(trebleStaves, rhGreyed);
          drawStavesWithGrey(bassStaves, lhGreyed);
        }

        const firstVisibleStave = vocalStaves[0] ?? trebleStaves[0] ?? bassStaves[0];
        const lastVisibleStave = bassStaves[0] ?? trebleStaves[0] ?? vocalStaves[0];

        // Measure numbers
        if (showMeasureNumbers && firstVisibleStave) {
          const svgEl = containerRef.current!.querySelector('svg');
          if (svgEl) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(firstVisibleStave.getX() + 2));
            text.setAttribute('y', String(topStaveY - 5));
            text.setAttribute('font-size', '11');
            text.setAttribute('font-family', 'Roboto, sans-serif');
            text.setAttribute('fill', '#94a3b8');
            text.setAttribute('stroke', 'none');
            text.textContent = String(startMeasure + 1);
            svgEl.appendChild(text);
          }
        }

        // Navigation markers (Segno / Coda / To Coda / D.S.) and volta brackets.
        {
          const svgEl = containerRef.current!.querySelector('svg');
          if (svgEl) {
            const nav = score.navigation;
            const labels: Array<{
              measure: number | undefined;
              kind: 'segno' | 'coda' | 'tocoda' | 'dalsegno';
            }> = [
              { measure: nav?.segnoMeasure, kind: 'segno' },
              { measure: nav?.codaMeasure, kind: 'coda' },
              { measure: nav?.tocodaMeasure, kind: 'tocoda' },
              { measure: nav?.dalsegnoMeasure, kind: 'dalsegno' },
            ];
            const labelsByMeasure = new Map<number, Array<'segno' | 'coda' | 'tocoda' | 'dalsegno'>>();
            for (const label of labels) {
              if (label.measure === undefined) continue;
              if (label.measure < startMeasure || label.measure >= endMeasure) continue;
              const bucket = labelsByMeasure.get(label.measure) ?? [];
              // De-duplicate same-kind labels in one measure to avoid stacked artifacts.
              if (!bucket.includes(label.kind)) bucket.push(label.kind);
              labelsByMeasure.set(label.measure, bucket);
            }
            for (const [measure, kinds] of labelsByMeasure) {
              const localIdx = measure - startMeasure;
              const markerStave = vocalStaves[localIdx] ?? trebleStaves[localIdx] ?? bassStaves[localIdx];
              if (!markerStave) continue;

              for (let i = 0; i < kinds.length; i++) {
                const kind = kinds[i];
                const x = markerStave.getX() + 6;
                // Stack multiple markers vertically instead of drawing on top of each other.
                const y = topStaveY - 34 + i * 13;
                if (kind === 'segno') {
                  drawSegnoGlyph(svgEl, x, y);
                } else if (kind === 'coda') {
                  drawNavigationLabel(svgEl, x, y, 'Coda', {
                    fontStyle: 'italic',
                    fontWeight: '600',
                  });
                  drawCodaGlyph(svgEl, x + 32, y);
                } else if (kind === 'tocoda') {
                  drawNavigationLabel(svgEl, x, y, 'To Coda', {
                    fontStyle: 'italic',
                    fontWeight: '600',
                  });
                  drawCodaGlyph(svgEl, x + 50, y);
                } else {
                  drawNavigationLabel(svgEl, x, y, 'D.S. al Coda', {
                    fontStyle: 'italic',
                    fontWeight: '600',
                  });
                }
              }
            }

            for (const volta of score.navigation?.voltas ?? []) {
              if (volta.endMeasure < startMeasure || volta.startMeasure >= endMeasure) continue;
              const visStart = Math.max(volta.startMeasure, startMeasure);
              const visEnd = Math.min(volta.endMeasure, endMeasure - 1);
              const startIdx = visStart - startMeasure;
              const endIdx = visEnd - startMeasure;
              const startStave = vocalStaves[startIdx] ?? trebleStaves[startIdx] ?? bassStaves[startIdx];
              const endStave = vocalStaves[endIdx] ?? trebleStaves[endIdx] ?? bassStaves[endIdx];
              if (!startStave || !endStave) continue;

              const y = topStaveY - 26;
              const x1 = startStave.getX() + 2;
              const x2 = endStave.getX() + endStave.getWidth() - 2;

              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', String(x1));
              line.setAttribute('y1', String(y));
              line.setAttribute('x2', String(x2));
              line.setAttribute('y2', String(y));
              line.setAttribute('stroke', '#334155');
              line.setAttribute('stroke-width', '1.2');
              svgEl.appendChild(line);

              const hookStart = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              hookStart.setAttribute('x1', String(x1));
              hookStart.setAttribute('y1', String(y));
              hookStart.setAttribute('x2', String(x1));
              hookStart.setAttribute('y2', String(y + 10));
              hookStart.setAttribute('stroke', '#334155');
              hookStart.setAttribute('stroke-width', '1.2');
              svgEl.appendChild(hookStart);

              if (visEnd === volta.endMeasure) {
                const hookEnd = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                hookEnd.setAttribute('x1', String(x2));
                hookEnd.setAttribute('y1', String(y));
                hookEnd.setAttribute('x2', String(x2));
                hookEnd.setAttribute('y2', String(y + 10));
                hookEnd.setAttribute('stroke', '#334155');
                hookEnd.setAttribute('stroke-width', '1.2');
                svgEl.appendChild(hookEnd);
              }
              if (visStart === volta.startMeasure) {
                drawNavigationLabel(svgEl, x1 + 3, y - 3, `${volta.endingNumber}.`);
              }
            }
          }
        }

        // Selection highlight
        if (selectedMeasureRange && firstVisibleStave && lastVisibleStave) {
          const svgEl = containerRef.current!.querySelector('svg');
          if (svgEl) {
            for (let mi = startMeasure; mi < endMeasure; mi++) {
              if (mi >= selectedMeasureRange.start && mi <= selectedMeasureRange.end) {
                const localIdx = mi - startMeasure;
                const topStave2 = vocalStaves[localIdx] ?? trebleStaves[localIdx] ?? bassStaves[localIdx];
                const botStave = bassStaves[localIdx] ?? trebleStaves[localIdx] ?? vocalStaves[localIdx];
                if (!topStave2 || !botStave) continue;
                const selTopY = topStaveY - 10;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', String(topStave2.getX()));
                rect.setAttribute('y', String(selTopY));
                rect.setAttribute('width', String(topStave2.getWidth()));
                rect.setAttribute('height', String((botStave.getY() + botStave.getHeight()) - selTopY + 10));
                rect.setAttribute('fill', 'rgba(124, 58, 237, 0.08)');
                rect.setAttribute('stroke', 'rgba(124, 58, 237, 0.25)');
                rect.setAttribute('stroke-width', '1');
                rect.setAttribute('rx', '4');
                svgEl.insertBefore(rect, svgEl.firstChild);
              }
            }
          }
        }

        // Clickable measure hit areas
        {
          const svgEl = containerRef.current!.querySelector('svg');
          if (svgEl) {
            for (let mi = startMeasure; mi < endMeasure; mi++) {
              const localIdx = mi - startMeasure;
              const topStave2 = vocalStaves[localIdx] ?? trebleStaves[localIdx] ?? bassStaves[localIdx];
              const botStave = bassStaves[localIdx] ?? trebleStaves[localIdx] ?? vocalStaves[localIdx];
              if (!topStave2 || !botStave) continue;
              const hitTopY = topStaveY - 10;
              const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              hitRect.setAttribute('x', String(topStave2.getX()));
              hitRect.setAttribute('y', String(hitTopY));
              hitRect.setAttribute('width', String(topStave2.getWidth()));
              hitRect.setAttribute('height', String((botStave.getY() + botStave.getHeight()) - hitTopY + 10));
              hitRect.setAttribute('fill', 'transparent');
              hitRect.setAttribute('stroke', 'none');
              hitRect.setAttribute('data-measure-idx', String(mi));
              hitRect.style.cursor = 'pointer';
              svgEl.appendChild(hitRect);
            }
          }
        }

        // Brace connector — spans all visible staves
        if (firstVisibleStave && lastVisibleStave && firstVisibleStave !== lastVisibleStave) {
          const brace = new StaveConnector(firstVisibleStave, lastVisibleStave);
          brace.setType(StaveConnector.type.BRACE);
          brace.setContext(context).draw();

          const lineConn = new StaveConnector(firstVisibleStave, lastVisibleStave);
          lineConn.setType(StaveConnector.type.SINGLE_LEFT);
          lineConn.setContext(context).draw();
        }

        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const localIdx = mi - startMeasure;
          const trebleStave = showTreble ? trebleStaves[localIdx] : undefined;
          const bassStave = showBass ? bassStaves[localIdx] : undefined;
          const vocalStave = vocalPart ? vocalStaves[localIdx] : undefined;
          const isCurrentMeasure = mi === currentMeasureIndex;
          const rhNoteIdx = currentNoteIndices.get('rh') ?? -1;
          const lhNoteIdx = currentNoteIndices.get('lh') ?? -1;
          const voiceNoteIdx = currentNoteIndices.get('voice') ?? -1;

          const accTracker = createAccidentalTracker(keyAccMap);

          // --- Treble voice ---
          const trebleNotes: StaveNote[] = [];
          const trebleScoreNotes: ScoreNote[] = [];
          const treble8vaFlags: boolean[] = [];
          let currentTrebleTuplet: TupletGroup | null = null;
          const rhMeasure = showTreble ? rhPart?.measures[mi] : undefined;
          if (rhMeasure) {
            rhMeasure.notes.forEach((note, noteIdx) => {
              const vfDur = DURATION_VEXFLOW[note.duration] + (note.dotted ? 'd' : '') + (note.rest ? 'r' : '');
              const needs8va = !note.rest && note.pitches.some(p => p >= TREBLE_8VA_THRESHOLD);
              const keys = note.rest ? ['b/4'] : note.pitches.map(p => midiToPitchStringForKey(needs8va ? p - 12 : p, score.key));
              const staveNote = new StaveNote({ keys, duration: vfDur, clef: 'treble', stemDirection: 1 });
              if (note.dotted) Dot.buildAndAttach([staveNote], { all: true });
              if (!note.rest) {
                keys.forEach((k, pIdx) => {
                  const acc = accTracker.getNeeded(k);
                  if (acc) staveNote.addModifier(new Accidental(acc), pIdx);
                });
              }
              applyNoteStyle(staveNote, note, {
                isGreyed: rhGreyed,
                isCurrent: isCurrentMeasure && noteIdx === rhNoteIdx,
                activeMidiNotes,
                practiceResult: practiceResultsByNoteId?.get(note.id),
              });
              if (note.finger && !note.rest) {
                const ann = new Annotation(String(note.finger));
                ann.setVerticalJustification(Annotation.VerticalJustify.TOP);
                ann.setFont('Roboto', 11, 'normal');
                staveNote.addModifier(ann, 0);
              }
              if (note.id) noteIdToStaveNote.set(note.id, staveNote);

              // Tie tracking
              if (!note.rest) {
                if (note.tieStop) {
                  note.pitches.forEach((pitch, pIdx) => {
                    const open = openTies.get(pitch);
                    if (open) {
                      tiePairs.push({ first: open.note, firstIdx: open.pitchIdx, last: staveNote, lastIdx: pIdx, firstLine: open.lineIdx, lastLine: lineIdx, partType: 'treble' });
                      openTies.delete(pitch);
                    }
                  });
                }
                if (note.tieStart) {
                  note.pitches.forEach((pitch, pIdx) => {
                    openTies.set(pitch, { note: staveNote, pitchIdx: pIdx, lineIdx: lineIdx });
                  });
                }
              }

              // Tuplet tracking
              if (note.tuplet) {
                if (currentTrebleTuplet && currentTrebleTuplet.actual === note.tuplet.actual && currentTrebleTuplet.normal === note.tuplet.normal) {
                  currentTrebleTuplet.notes.push(staveNote);
                  if (currentTrebleTuplet.notes.length >= note.tuplet.actual) {
                    tupletGroups.push(currentTrebleTuplet);
                    currentTrebleTuplet = null;
                  }
                } else {
                  if (currentTrebleTuplet) tupletGroups.push(currentTrebleTuplet);
                  currentTrebleTuplet = { notes: [staveNote], actual: note.tuplet.actual, normal: note.tuplet.normal };
                }
              } else {
                if (currentTrebleTuplet) {
                  tupletGroups.push(currentTrebleTuplet);
                  currentTrebleTuplet = null;
                }
              }

              trebleNotes.push(staveNote);
              trebleScoreNotes.push(note);
              treble8vaFlags.push(needs8va);
            });
          }
          if (currentTrebleTuplet) {
            tupletGroups.push(currentTrebleTuplet);
            currentTrebleTuplet = null;
          }

          // --- Bass voice ---
          accTracker.reset();
          const bassNotes: StaveNote[] = [];
          const bassScoreNotes: ScoreNote[] = [];
          const bass8vaFlags: boolean[] = [];
          let currentBassTuplet: TupletGroup | null = null;
          const lhMeasure = showBass ? lhPart?.measures[mi] : undefined;
          if (lhMeasure) {
            lhMeasure.notes.forEach((note, noteIdx) => {
              const vfDur = DURATION_VEXFLOW[note.duration] + (note.dotted ? 'd' : '') + (note.rest ? 'r' : '');
              const needsBass8va = !note.rest && note.pitches.some(p => p >= BASS_8VA_THRESHOLD);
              const keys = note.rest ? ['d/3'] : note.pitches.map(p => midiToPitchStringForKey(needsBass8va ? p - 12 : p, score.key));
              const staveNote = new StaveNote({ keys, duration: vfDur, clef: 'bass', stemDirection: -1 });
              if (note.dotted) Dot.buildAndAttach([staveNote], { all: true });
              if (!note.rest) {
                keys.forEach((k, pIdx) => {
                  const acc = accTracker.getNeeded(k);
                  if (acc) staveNote.addModifier(new Accidental(acc), pIdx);
                });
              }
              applyNoteStyle(staveNote, note, {
                isGreyed: lhGreyed,
                isCurrent: isCurrentMeasure && noteIdx === lhNoteIdx,
                activeMidiNotes,
                practiceResult: practiceResultsByNoteId?.get(note.id),
              });
              if (note.finger && !note.rest) {
                const ann = new Annotation(String(note.finger));
                ann.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
                ann.setFont('Roboto', 11, 'normal');
                staveNote.addModifier(ann, 0);
              }
              if (note.id) noteIdToStaveNote.set(note.id, staveNote);

              // Tie tracking for bass
              if (!note.rest) {
                if (note.tieStop) {
                  note.pitches.forEach((pitch, pIdx) => {
                    const open = openTies.get(pitch);
                    if (open) {
                      tiePairs.push({ first: open.note, firstIdx: open.pitchIdx, last: staveNote, lastIdx: pIdx, firstLine: open.lineIdx, lastLine: lineIdx, partType: 'bass' });
                      openTies.delete(pitch);
                    }
                  });
                }
                if (note.tieStart) {
                  note.pitches.forEach((pitch, pIdx) => {
                    openTies.set(pitch, { note: staveNote, pitchIdx: pIdx, lineIdx: lineIdx });
                  });
                }
              }

              // Tuplet tracking for bass
              if (note.tuplet) {
                if (currentBassTuplet && currentBassTuplet.actual === note.tuplet.actual && currentBassTuplet.normal === note.tuplet.normal) {
                  currentBassTuplet.notes.push(staveNote);
                  if (currentBassTuplet.notes.length >= note.tuplet.actual) {
                    tupletGroups.push(currentBassTuplet);
                    currentBassTuplet = null;
                  }
                } else {
                  if (currentBassTuplet) tupletGroups.push(currentBassTuplet);
                  currentBassTuplet = { notes: [staveNote], actual: note.tuplet.actual, normal: note.tuplet.normal };
                }
              } else {
                if (currentBassTuplet) {
                  tupletGroups.push(currentBassTuplet);
                  currentBassTuplet = null;
                }
              }

              bassNotes.push(staveNote);
              bassScoreNotes.push(note);
              bass8vaFlags.push(needsBass8va);
            });
          }
          if (currentBassTuplet) {
            tupletGroups.push(currentBassTuplet);
            currentBassTuplet = null;
          }

          // --- Vocal voice (optional) ---
          interface VocalLyricInfo { noteId: string; lyric: string; isCurrent: boolean; }
          let vocalNotes: StaveNote[] | undefined;
          const vocalLyrics: VocalLyricInfo[] = [];
          if (vocalPart && vocalStave) {
            accTracker.reset();
            vocalNotes = [];
            const vMeasure = vocalPart.measures[mi];
            if (vMeasure) {
              vMeasure.notes.forEach((note, noteIdx) => {
                const vfDur = DURATION_VEXFLOW[note.duration] + (note.dotted ? 'd' : '') + (note.rest ? 'r' : '');
                const keys = note.rest ? ['b/4'] : note.pitches.map(p => midiToPitchStringForKey(p, score.key));
                const staveNote = new StaveNote({ keys, duration: vfDur, clef: 'treble', stemDirection: 1 });
                if (note.dotted) Dot.buildAndAttach([staveNote], { all: true });
                if (!note.rest) {
                  keys.forEach((k, pIdx) => {
                    const acc = accTracker.getNeeded(k);
                    if (acc) staveNote.addModifier(new Accidental(acc), pIdx);
                  });
                }
                applyNoteStyle(staveNote, note, {
                  isGreyed: voiceGreyed,
                  isCurrent: isCurrentMeasure && noteIdx === voiceNoteIdx,
                  activeMidiNotes,
                  practiceResult: practiceResultsByNoteId?.get(note.id),
                });
                if (note.lyric && !note.rest && note.id) {
                  vocalLyrics.push({ noteId: note.id, lyric: note.lyric, isCurrent: isCurrentMeasure && noteIdx === voiceNoteIdx });
                }
                if (note.id) noteIdToStaveNote.set(note.id, staveNote);

                // Tie tracking for vocal
                if (!note.rest) {
                  if (note.tieStop) {
                    note.pitches.forEach((pitch, pIdx) => {
                      const open = openTies.get(pitch + 10000);
                      if (open) {
                        tiePairs.push({ first: open.note, firstIdx: open.pitchIdx, last: staveNote, lastIdx: pIdx, firstLine: open.lineIdx, lastLine: lineIdx, partType: 'vocal' });
                        openTies.delete(pitch + 10000);
                      }
                    });
                  }
                  if (note.tieStart) {
                    note.pitches.forEach((pitch, pIdx) => {
                      openTies.set(pitch + 10000, { note: staveNote, pitchIdx: pIdx, lineIdx: lineIdx });
                    });
                  }
                }

                vocalNotes!.push(staveNote);
              });
            }
          }

          // Ghost notes (edit mode)
          const isLastMeasure = mi === maxMeasures - 1;
          if (isLastMeasure && ghostNotes && ghostNotes.length > 0) {
            for (const ghost of ghostNotes) {
              const clef = ghost.midi < 60 ? 'bass' : 'treble';
              const key = midiToPitchStringForKey(ghost.midi, score.key);
              const vfDur = DURATION_VEXFLOW[ghost.duration];
              const sn = new StaveNote({ keys: [key], duration: vfDur, clef, stemDirection: clef === 'treble' ? 1 : -1 });
              sn.setStyle({ fillStyle: 'rgba(124, 58, 237, 0.3)', strokeStyle: 'rgba(124, 58, 237, 0.3)' });
              const acc = accTracker.getNeeded(key);
              if (acc) sn.addModifier(new Accidental(acc), 0);
              if (clef === 'treble') {
                trebleNotes.push(sn);
                trebleScoreNotes.push({ id: '', pitches: [ghost.midi], duration: ghost.duration });
                treble8vaFlags.push(false);
              } else {
                bassNotes.push(sn);
                bassScoreNotes.push({ id: '', pitches: [ghost.midi], duration: ghost.duration });
                bass8vaFlags.push(false);
              }
            }
          }

          // Fill empty voices for visible staves
          if (showTreble && trebleNotes.length === 0) {
            trebleNotes.push(new StaveNote({ keys: ['b/4'], duration: 'wr', clef: 'treble' }));
            trebleScoreNotes.push({ id: '', pitches: [], duration: 'whole', rest: true });
          }
          if (showBass && bassNotes.length === 0) {
            bassNotes.push(new StaveNote({ keys: ['d/3'], duration: 'wr', clef: 'bass' }));
            bassScoreNotes.push({ id: '', pitches: [], duration: 'whole', rest: true });
          }

          const refStave = trebleStave ?? bassStave ?? vocalStave;
          if (!refStave) continue;
          const noteStartX = refStave.getNoteStartX();
          const staveEndX = refStave.getX() + refStave.getWidth();
          const formatWidth = Math.max(60, staveEndX - noteStartX - 10);

          const formatter = new Formatter();
          const voicesToFormat: Voice[] = [];

          let trebleVoice: Voice | undefined;
          if (showTreble && trebleNotes.length > 0) {
            trebleVoice = new Voice({
              numBeats: score.timeSignature.numerator,
              beatValue: score.timeSignature.denominator,
            });
            trebleVoice.setStrict(false);
            trebleVoice.addTickables(trebleNotes);
            formatter.joinVoices([trebleVoice]);
            voicesToFormat.push(trebleVoice);
          }

          let bassVoice: Voice | undefined;
          if (showBass && bassNotes.length > 0) {
            bassVoice = new Voice({
              numBeats: score.timeSignature.numerator,
              beatValue: score.timeSignature.denominator,
            });
            bassVoice.setStrict(false);
            bassVoice.addTickables(bassNotes);
            formatter.joinVoices([bassVoice]);
            voicesToFormat.push(bassVoice);
          }

          let vocalVoice: Voice | undefined;
          if (vocalNotes && vocalStave) {
            if (vocalNotes.length === 0) {
              vocalNotes.push(new StaveNote({ keys: ['b/4'], duration: 'wr', clef: 'treble' }));
            }
            vocalVoice = new Voice({
              numBeats: score.timeSignature.numerator,
              beatValue: score.timeSignature.denominator,
            });
            vocalVoice.setStrict(false);
            vocalVoice.addTickables(vocalNotes);
            formatter.joinVoices([vocalVoice]);
            voicesToFormat.push(vocalVoice);
          }

          if (voicesToFormat.length > 0) {
            formatter.format(voicesToFormat, formatWidth);
          }

          const svgElForBeams = containerRef.current!.querySelector('svg');

          if (trebleVoice && trebleStave) {
            let trebleBeams: Beam[] = [];
            try {
              const trebleBeamGroups = getBeamGroupsForNotes(score.timeSignature, trebleScoreNotes);
              trebleBeams = Beam.generateBeams(trebleNotes, {
                beamRests: false, beamMiddleOnly: false, stemDirection: 1, groups: trebleBeamGroups,
              });
            } catch { /* beam generation is non-critical */ }
            trebleVoice.draw(context, trebleStave);
            if (rhGreyed) {
              trebleBeams.forEach(b => { b.setStyle({ fillStyle: GREYED_NOTE, strokeStyle: GREYED_NOTE }); });
            }
            const trebleBeamsBefore = svgElForBeams ? svgElForBeams.children.length : 0;
            trebleBeams.forEach(b => b.setContext(context).draw());
            if (rhGreyed && svgElForBeams) {
              for (let ci = trebleBeamsBefore; ci < svgElForBeams.children.length; ci++) {
                applyGreyToSVGElement(svgElForBeams.children[ci] as SVGElement);
              }
            }
          }

          if (bassVoice && bassStave) {
            let bassBeams: Beam[] = [];
            try {
              const bassBeamGroups = getBeamGroupsForNotes(score.timeSignature, bassScoreNotes);
              bassBeams = Beam.generateBeams(bassNotes, {
                beamRests: false, beamMiddleOnly: false, stemDirection: -1, groups: bassBeamGroups,
              });
            } catch { /* beam generation is non-critical */ }
            bassVoice.draw(context, bassStave);
            if (lhGreyed) {
              bassBeams.forEach(b => { b.setStyle({ fillStyle: GREYED_NOTE, strokeStyle: GREYED_NOTE }); });
            }
            const bassBeamsBefore = svgElForBeams ? svgElForBeams.children.length : 0;
            bassBeams.forEach(b => b.setContext(context).draw());
            if (lhGreyed && svgElForBeams) {
              for (let ci = bassBeamsBefore; ci < svgElForBeams.children.length; ci++) {
                applyGreyToSVGElement(svgElForBeams.children[ci] as SVGElement);
              }
            }
          }

          if (vocalVoice && vocalStave) {
            let vocalBeams: Beam[] = [];
            try {
              const vocalMeasure = vocalPart?.measures[mi];
              const vocalBeamGroups = getBeamGroupsForNotes(
                score.timeSignature,
                vocalMeasure?.notes ?? [],
              );
              vocalBeams = Beam.generateBeams(vocalNotes!, {
                beamRests: false, beamMiddleOnly: false, stemDirection: 1, groups: vocalBeamGroups,
              });
            } catch { /* non-critical */ }

            const svgChildCountBefore = svgElForBeams ? svgElForBeams.children.length : 0;

            vocalVoice.draw(context, vocalStave);
            if (voiceGreyed) {
              vocalBeams.forEach(b => { b.setStyle({ fillStyle: GREYED_NOTE, strokeStyle: GREYED_NOTE }); });
            }
            vocalBeams.forEach(b => b.setContext(context).draw());

            if (voiceGreyed && svgElForBeams) {
              const svgChildCountAfter = svgElForBeams.children.length;
              for (let ci = svgChildCountBefore; ci < svgChildCountAfter; ci++) {
                const el = svgElForBeams.children[ci] as SVGElement;
                applyGreyToSVGElement(el);
              }
            }

            // Render lyrics as fixed-position SVG text below the vocal stave
            if (vocalLyrics.length > 0 && svgElForBeams) {
              const lyricBaseY = vocalStave.getY() + vocalStave.getHeight() + 28;
              for (const lyr of vocalLyrics) {
                const vfNote = noteIdToStaveNote.get(lyr.noteId);
                if (!vfNote) continue;
                try {
                  const noteX = vfNote.getAbsoluteX();
                  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                  text.setAttribute('x', String(noteX));
                  text.setAttribute('y', String(lyricBaseY));
                  text.setAttribute('font-size', String(LYRIC_FONT_SIZE));
                  text.setAttribute('font-family', 'Roboto, sans-serif');
                  text.setAttribute('fill', voiceGreyed ? (lyr.isCurrent ? GREYED_CURRENT : GREYED_NOTE) : lyr.isCurrent ? '#7c3aed' : '#1e293b');
                  text.setAttribute('stroke', 'none');
                  if (lyr.isCurrent) text.setAttribute('font-weight', 'bold');
                  text.setAttribute('text-anchor', 'middle');
                  text.textContent = lyr.lyric;
                  svgElForBeams.appendChild(text);
                } catch { /* position lookup can fail */ }
              }
            }
          }

          // Collect ottava notes for line-level bracket rendering
          lineTreble8vaNotes.push(...trebleNotes);
          lineTreble8vaFlags.push(...treble8vaFlags);
          lineBass8vaNotes.push(...bassNotes);
          lineBass8vaFlags.push(...bass8vaFlags);

          // Render chord symbols as SVG text above the topmost visible stave
          if (showChords) {
            interface ChordInfo { symbol: string; beatPos: number }
            const measureChords: ChordInfo[] = [];
            for (const part of score.parts) {
              const m = part.measures[mi];
              if (!m) continue;
              let beat = 0;
              for (const note of m.notes) {
                if (note.chordSymbol && !measureChords.some(c => Math.abs(c.beatPos - beat) < 0.01)) {
                  measureChords.push({ symbol: note.chordSymbol, beatPos: beat });
                }
                beat += durationToBeats(note.duration, note.dotted);
              }
            }

            if (measureChords.length > 0) {
              // Determine the current beat position in this measure for highlighting
              let currentBeatInMeasure = -1;
              if (isCurrentMeasure) {
                const lhMeasure = showBass ? lhPart?.measures[mi] : undefined;
                const candidates: [typeof rhMeasure, number][] = [
                  [rhMeasure, rhNoteIdx],
                  [lhMeasure, lhNoteIdx],
                  [vocalPart?.measures[mi], voiceNoteIdx],
                ];
                for (const [part, idx] of candidates) {
                  if (part && idx >= 0) {
                    let b = 0;
                    for (let i = 0; i < idx && i < part.notes.length; i++) {
                      b += durationToBeats(part.notes[i].duration, part.notes[i].dotted);
                    }
                    currentBeatInMeasure = b;
                    break;
                  }
                }
              }

              const beatToSN: { beat: number; sn: StaveNote }[] = [];
              const addBeats = (scoreNotes: ScoreNote[], staveNotes: StaveNote[]) => {
                let beat = 0;
                for (let i = 0; i < scoreNotes.length && i < staveNotes.length; i++) {
                  beatToSN.push({ beat, sn: staveNotes[i] });
                  beat += durationToBeats(scoreNotes[i].duration, scoreNotes[i].dotted);
                }
              };
              if (trebleScoreNotes.length > 0) addBeats(trebleScoreNotes, trebleNotes);
              if (bassScoreNotes.length > 0) addBeats(bassScoreNotes, bassNotes);
              if (vocalNotes && vocalPart?.measures[mi]) {
                const vMeasure = vocalPart.measures[mi];
                let beat = 0;
                for (let i = 0; i < vMeasure.notes.length && i < vocalNotes.length; i++) {
                  beatToSN.push({ beat, sn: vocalNotes[i] });
                  beat += durationToBeats(vMeasure.notes[i].duration, vMeasure.notes[i].dotted);
                }
              }

              if (beatToSN.length > 0) {
                const svgElChords = containerRef.current!.querySelector('svg');
                if (svgElChords) {
                  const chordY = topStaveY - 8;
                  for (let ci = 0; ci < measureChords.length; ci++) {
                    const chord = measureChords[ci];
                    let closest = beatToSN[0];
                    let minDiff = Math.abs(chord.beatPos - closest.beat);
                    for (const bn of beatToSN) {
                      const diff = Math.abs(chord.beatPos - bn.beat);
                      if (diff < minDiff) { minDiff = diff; closest = bn; }
                    }

                    const nextChordBeat = ci + 1 < measureChords.length ? measureChords[ci + 1].beatPos : Infinity;
                    const isChordCurrent = currentBeatInMeasure >= chord.beatPos && currentBeatInMeasure < nextChordBeat;
                    const chordMatchActive =
                      !!activeMidiNotes &&
                      activeMidiNotes.size > 0 &&
                      matchesChord(Array.from(activeMidiNotes), chord.symbol);

                    try {
                      const x = closest.sn.getAbsoluteX();
                      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                      text.setAttribute('x', String(x));
                      text.setAttribute('y', String(chordY));
                      text.setAttribute('font-size', String(CHORD_FONT_SIZE));
                      text.setAttribute('font-family', 'Roboto, sans-serif');
                      text.setAttribute('font-weight', (chordMatchActive || isChordCurrent) ? '700' : '600');
                      text.setAttribute('fill', chordMatchActive ? '#10b981' : (isChordCurrent ? '#7c3aed' : '#1e293b'));
                      text.setAttribute('stroke', 'none');
                      text.setAttribute('text-anchor', 'middle');
                      text.textContent = chord.symbol;
                      svgElChords.appendChild(text);
                    } catch { /* getAbsoluteX can fail */ }
                  }
                }
              }
            }
          }
        }

        // Render 8va brackets per-line for continuous brackets across measures
        {
          const svgElOttava = containerRef.current!.querySelector('svg');
          if (svgElOttava) {
            if (trebleStaves.length > 0) {
              const trebleRuns = findOttavaRuns(lineTreble8vaFlags, lineTreble8vaNotes);
              const bracketY = trebleStaves[0].getY() - 35;
              for (const run of trebleRuns) {
                renderOttavaBracket(svgElOttava, '8va', run, bracketY);
              }
            }
            if (bassStaves.length > 0) {
              const bassRuns = findOttavaRuns(lineBass8vaFlags, lineBass8vaNotes);
              const bracketY = bassStaves[0].getY() - 15;
              for (const run of bassRuns) {
                renderOttavaBracket(svgElOttava, '8va', run, bracketY);
              }
            }
          }
        }
      }

      // Draw ties -- split cross-line ties into two partial arcs
      for (const tp of tiePairs) {
        const isGreyedTie = (tp.partType === 'treble' && rhGreyed)
          || (tp.partType === 'bass' && lhGreyed)
          || (tp.partType === 'vocal' && voiceGreyed);

        try {
          const svgElPre = containerRef.current!.querySelector('svg');
          const childCountPre = svgElPre ? svgElPre.children.length : 0;

          if (tp.firstLine === tp.lastLine) {
            const tie = new StaveTie({
              firstNote: tp.first,
              lastNote: tp.last,
              firstIndexes: [tp.firstIdx],
              lastIndexes: [tp.lastIdx],
            });
            tie.setContext(context).draw();
          } else {
            const tieA = new StaveTie({
              firstNote: tp.first,
              lastNote: null as unknown as StaveNote,
              firstIndexes: [tp.firstIdx],
              lastIndexes: [tp.firstIdx],
            });
            tieA.setContext(context).draw();

            const tieB = new StaveTie({
              firstNote: null as unknown as StaveNote,
              lastNote: tp.last,
              firstIndexes: [tp.lastIdx],
              lastIndexes: [tp.lastIdx],
            });
            tieB.setContext(context).draw();
          }

          if (isGreyedTie && svgElPre) {
            const childCountPost = svgElPre.children.length;
            for (let ci = childCountPre; ci < childCountPost; ci++) {
              applyGreyToSVGElement(svgElPre.children[ci] as SVGElement);
            }
          }
        } catch { /* tie rendering can fail for edge cases */ }
      }

      // Draw tuplet brackets
      for (const tg of tupletGroups) {
        // Only draw complete tuplets (e.g. 3 notes for triplet).
        if (tg.notes.length < tg.actual) continue;
        try {
          const tuplet = new Tuplet(tg.notes, {
            numNotes: tg.actual,
            notesOccupied: tg.normal,
          });
          tuplet.setContext(context).draw();
        } catch { /* tuplet rendering is non-critical */ }
      }

      // Practice result overlays
      if (practiceResultsByNoteId && practiceResultsByNoteId.size > 0) {
        const svgEl = containerRef.current!.querySelector('svg');
        if (svgEl) {
          practiceResultsByNoteId.forEach((result) => {
            const vfNote = noteIdToStaveNote.get(result.noteId);
            if (!vfNote) return;
            try {
              const bbox = vfNote.getBoundingBox();
              if (!bbox) return;
              const noteX = vfNote.getAbsoluteX();
              const ys = (vfNote as unknown as { getYs?: () => number[] }).getYs?.();
              const headY = ys && ys.length > 0 ? ys[0] : bbox.getY() + bbox.getH() / 2;

              if ((result.timing === 'early' || result.timing === 'late') && result.pitchCorrect) {
                const MAX_SHIFT = 18;
                const clampedMs = Math.max(-200, Math.min(200, result.timingOffsetMs));
                const shiftX = (clampedMs / 200) * MAX_SHIFT;
                const color = result.timing === 'early' ? RESULT_COLORS.early : RESULT_COLORS.late;
                const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                ghost.setAttribute('cx', String(noteX + shiftX));
                ghost.setAttribute('cy', String(headY));
                ghost.setAttribute('rx', '6');
                ghost.setAttribute('ry', '4.5');
                ghost.setAttribute('fill', color);
                ghost.setAttribute('opacity', '0.45');
                ghost.setAttribute('transform', `rotate(-20 ${noteX + shiftX} ${headY})`);
                svgEl.appendChild(ghost);
              }

              if (result.timing === 'wrong_pitch' && !result.pitchCorrect) {
                const deltaSemitones = closestWrongPitchDelta(
                  result.expectedPitches,
                  result.playedPitches,
                );
                if (deltaSemitones !== null) {
                  const MAX_SHIFT = 18;
                  const clampedMs = Math.max(-200, Math.min(200, result.timingOffsetMs));
                  const shiftX = (clampedMs / 200) * MAX_SHIFT;
                  const shiftY = -deltaSemitones * SEMITONE_TO_PIXEL_SHIFT;
                  const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                  ghost.setAttribute('cx', String(noteX + shiftX));
                  ghost.setAttribute('cy', String(headY + shiftY));
                  ghost.setAttribute('rx', '6');
                  ghost.setAttribute('ry', '4.5');
                  ghost.setAttribute('fill', RESULT_COLORS.wrong_pitch);
                  ghost.setAttribute('opacity', '0.45');
                  ghost.setAttribute(
                    'transform',
                    `rotate(-20 ${noteX + shiftX} ${headY + shiftY})`,
                  );
                  svgEl.appendChild(ghost);
                }
              }

              const bx = bbox.getX();
              const by = bbox.getY();
              const bw = Math.max(bbox.getW(), 16);
              const bh = Math.max(bbox.getH(), 16);
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', String(bx - 4));
              rect.setAttribute('y', String(by - 4));
              rect.setAttribute('width', String(bw + 8));
              rect.setAttribute('height', String(bh + 8));
              rect.setAttribute('fill', 'transparent');
              rect.setAttribute('stroke', 'none');
              let tip: string;
              if (result.timing === 'wrong_pitch') {
                tip = 'Wrong pitch/chord';
              } else if (result.timing === 'missed') {
                tip = 'Missed';
              } else if (result.timing === 'perfect') {
                tip = `Perfect (${Math.abs(Math.round(result.timingOffsetMs))}ms)`;
              } else {
                const ms = Math.abs(Math.round(result.timingOffsetMs));
                tip = result.timing === 'early' ? `Early by ${ms}ms` : `Late by ${ms}ms`;
              }
              const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
              title.textContent = tip;
              rect.appendChild(title);
              svgEl.appendChild(rect);
            } catch { /* position lookup can fail for some notes */ }
          });
        }
      }

    } catch (error) {
      console.error('Error rendering score:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: red; padding: 1rem;">Error rendering score. Please try again.</p>`;
      }
    }
  }, [score, currentMeasureIndex, currentNoteIndices, activeMidiNotes, practiceResultsByNoteId, greyedOutHands, hiddenHands, ghostNotes, zoomLevel, selectedMeasureRange, showVocalPart, showChords, containerWidth]);

  // Auto-scroll during playback to keep current measure visible
  useEffect(() => {
    if (currentMeasureIndex < 0) {
      autoScrollStateRef.current.lastMarker = null;
      autoScrollStateRef.current.lastScrollAtMs = 0;
      autoScrollStateRef.current.lastTargetTop = null;
      return;
    }
    if (!containerRef.current) return;

    const rafId = window.requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const target = containerRef.current.querySelector(
        `[data-measure-idx="${currentMeasureIndex}"]`,
      ) as Element | null;
      if (!target) return;
      const mainContent = containerRef.current.closest('.main-content') as HTMLElement | null;
      const beforeTop = mainContent?.scrollTop ?? 0;
      scrollPlaybackTarget({
        marker: currentMeasureIndex,
        target,
        state: autoScrollStateRef.current,
        scrollContainer: mainContent,
        minIntervalMs: 48,
        minDeltaPx: 8,
        preferredTopRatio: 0.12,
        allowBackward: true,
      });
      // Fallback for cases where SVG rect geometry or container math fails.
      if (mainContent && Math.abs(mainContent.scrollTop - beforeTop) < 2) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [currentMeasureIndex, currentNoteIndices, score, zoomLevel]);

  return <div className="score-display" ref={containerRef} />;
};

export default ScoreDisplay;
