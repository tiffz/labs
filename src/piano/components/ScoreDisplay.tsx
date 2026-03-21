import React, { useEffect, useRef, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, Beam, Dot, Annotation, Accidental, Fraction, StaveTie, Tuplet } from 'vexflow';
import type { PianoScore, PracticeNoteResult, ScoreNote } from '../types';
import { DURATION_VEXFLOW, midiToPitchStringForKey, durationToBeats } from '../types';

export interface GhostNote {
  midi: number;
  duration: import('../types').NoteDuration;
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
  late: '#ef4444',
  missed: '#94a3b8',
};

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
    if (note.pitches.some(p => opts.activeMidiNotes!.has(p))) {
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

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score, currentMeasureIndex, currentNoteIndices, activeMidiNotes,
  practiceResultsByNoteId, greyedOutHands, hiddenHands, ghostNotes,
  zoomLevel = 1.0, selectedMeasureRange, onMeasureClick,
  showVocalPart = false, showChords = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateKeyRef = useRef('');
  const measureYMapRef = useRef<Map<number, number>>(new Map());
  const lastScrolledLineRef = useRef(-1);

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
      parts: score.parts.map(p => p.measures.map(m => m.notes.length)),
      mi: currentMeasureIndex, ni: Array.from(currentNoteIndices.entries()),
      active: activeMidiNotes ? Array.from(activeMidiNotes).sort() : [],
      pr: practiceResultsByNoteId ? Array.from(practiceResultsByNoteId.entries()).map(([k, v]) => `${k}:${v.timing}:${Math.round(v.timingOffsetMs)}`).sort() : [],
      gh: greyedOutHands ? Array.from(greyedOutHands) : [],
      hh: hiddenHands ? Array.from(hiddenHands) : [],
      gn: ghostNotes ? ghostNotes.map(g => `${g.midi}:${g.duration}`) : [],
      zm: zoomLevel,
      sel: selectedMeasureRange ? `${selectedMeasureRange.start}-${selectedMeasureRange.end}` : '',
      sv: showVocalPart,
      sc: showChords,
    });
    if (stateKey === stateKeyRef.current) return;
    stateKeyRef.current = stateKey;

    const mainContent = containerRef.current.closest('.main-content') as HTMLElement | null;
    const savedScrollTop = mainContent?.scrollTop ?? 0;
    if (mainContent) mainContent.style.overflowY = 'hidden';

    containerRef.current.innerHTML = '';

    try {
      const rhPart = score.parts.find(p => p.hand === 'right');
      const lhPart = score.parts.find(p => p.hand === 'left');
      const vocalPart = showVocalPart ? score.parts.find(p => p.hand === 'voice') : undefined;
      if (!rhPart && !lhPart) {
        if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
        return;
      }

      const showTreble = !(hiddenHands?.has('right'));
      const showBass = !(hiddenHands?.has('left'));

      const maxMeasures = Math.max(
        (showTreble ? rhPart?.measures.length ?? 0 : 0),
        (showBass ? lhPart?.measures.length ?? 0 : 0),
        vocalPart?.measures.length ?? 0,
        rhPart?.measures.length ?? 0,
        lhPart?.measures.length ?? 0,
      );
      if (maxMeasures === 0) {
        if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
        return;
      }

      const rawContainerWidth = containerRef.current.clientWidth || 900;
      const effectiveWidth = rawContainerWidth / zoomLevel;

      const maxNotesInMeasure = Math.max(
        ...score.parts.flatMap(p => p.measures.map(m => m.notes.length)),
        1
      );
      const minMeasureWidth = Math.max(200, maxNotesInMeasure * 28 + 80);
      const maxMeasuresPerLine = Math.max(4, Math.ceil(8 / zoomLevel));
      const measuresPerLine = Math.min(maxMeasuresPerLine, Math.max(1, Math.floor((effectiveWidth - 40) / minMeasureWidth)));
      const numLines = Math.ceil(maxMeasures / measuresPerLine);

      const staffSpacing = 80;
      const hasLyrics = vocalPart?.measures.some(m => m.notes.some(n => n.lyric));
      const rawVocalSpacing = vocalPart ? (hasLyrics ? 110 : 80) : 0;
      const lineHeight = 180
        + (vocalPart && (showTreble || showBass) ? rawVocalSpacing : 0)
        + (showTreble && showBass ? staffSpacing : 0);
      const totalHeight = numLines * lineHeight + 60;
      const keySigCount = getKeySignatureInfo(score.key);
      const vexKey = getVexflowKey(score.key);
      const keyAccMap = getKeyAccidentalMap(score.key);

      const rhGreyed = greyedOutHands?.has('right') ?? false;
      const lhGreyed = greyedOutHands?.has('left') ?? false;
      const voiceGreyed = greyedOutHands?.has('voice') ?? false;

      const showMeasureNumbers = maxMeasures > 5;

      const noteIdToStaveNote = new Map<string, StaveNote>();
      const measureYMap = new Map<number, number>();

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
        for (let mi = startMeasure; mi < endMeasure; mi++) {
          measureYMap.set(mi, topStaveY);
        }

        const HEADER_EXTRA = 50 + keySigCount * 12 + 35;
        const BASE_WEIGHT = 2;

        const measureWeights: number[] = [];
        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const rhCount = rhPart?.measures[mi]?.notes.length ?? 0;
          const lhCount = lhPart?.measures[mi]?.notes.length ?? 0;
          const vCount = vocalPart?.measures[mi]?.notes.length ?? 0;
          const noteCount = Math.max(rhCount, lhCount, vCount, 1);
          measureWeights.push(BASE_WEIGHT + Math.max(noteCount, 3));
        }

        const totalWeight = measureWeights.reduce((a, b) => a + b, 0);
        const availableWidth = effectiveWidth - 40;
        const contentPool = availableWidth - HEADER_EXTRA;

        const rawWidths = measureWeights.map((w, i) => {
          const share = (w / totalWeight) * contentPool;
          return i === 0 ? share + HEADER_EXTRA : share;
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

          if (vocalPart) {
            const vocal = new Stave(currentX, vocalY, w);
            if (localIdx === 0) {
              vocal.addClef('treble');
              if (keySigCount > 0) { try { vocal.addKeySignature(vexKey); } catch { /* skip */ } }
              vocal.addTimeSignature(`${score.timeSignature.numerator}/${score.timeSignature.denominator}`);
            }
            if (voiceGreyed) vocal.setStyle({ strokeStyle: GREYED_STAFF, fillStyle: GREYED_STAFF });
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
            bassStaves.push(bass);
          }

          currentX += w;
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
          const formatWidth = Math.max(50, staveEndX - noteStartX - 20);

          const formatter = new Formatter({ softmaxFactor: 5 });
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

          const beamGroups = getBeamGroups(score.timeSignature);

          const svgElForBeams = containerRef.current!.querySelector('svg');

          if (trebleVoice && trebleStave) {
            let trebleBeams: Beam[] = [];
            try {
              trebleBeams = Beam.generateBeams(trebleNotes, {
                beamRests: false, beamMiddleOnly: false, stemDirection: 1, groups: beamGroups,
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
              bassBeams = Beam.generateBeams(bassNotes, {
                beamRests: false, beamMiddleOnly: false, stemDirection: -1, groups: beamGroups,
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
              vocalBeams = Beam.generateBeams(vocalNotes!, {
                beamRests: false, beamMiddleOnly: false, stemDirection: 1, groups: beamGroups,
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
                  text.setAttribute('font-size', '11');
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

                    try {
                      const x = closest.sn.getAbsoluteX();
                      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                      text.setAttribute('x', String(x));
                      text.setAttribute('y', String(chordY));
                      text.setAttribute('font-size', '12');
                      text.setAttribute('font-family', 'Roboto, sans-serif');
                      text.setAttribute('font-weight', isChordCurrent ? '700' : '600');
                      text.setAttribute('fill', isChordCurrent ? '#7c3aed' : '#1e293b');
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
        if (tg.notes.length < 2) continue;
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
              if (result.timing === 'missed') {
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

      measureYMapRef.current = measureYMap;
      if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
    } catch (error) {
      console.error('Error rendering score:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: red; padding: 1rem;">Error rendering score. Please try again.</p>`;
      }
      if (mainContent) { mainContent.style.overflowY = ''; mainContent.scrollTop = savedScrollTop; }
    }
  }, [score, currentMeasureIndex, currentNoteIndices, activeMidiNotes, practiceResultsByNoteId, greyedOutHands, hiddenHands, ghostNotes, zoomLevel, selectedMeasureRange, showVocalPart, showChords]);

  // Auto-scroll during playback to keep current measure visible
  useEffect(() => {
    if (currentMeasureIndex < 0) {
      lastScrolledLineRef.current = -1;
      return;
    }
    const measureY = measureYMapRef.current.get(currentMeasureIndex);
    if (measureY === undefined) return;

    const maxNotesInMeasure = Math.max(...score.parts.flatMap(p => p.measures.map(m => m.notes.length)), 1);
    const rawWidth = containerRef.current?.clientWidth || 900;
    const effectiveWidth = rawWidth / zoomLevel;
    const minMeasureWidth = Math.max(200, maxNotesInMeasure * 28 + 80);
    const maxMPL = Math.max(4, Math.ceil(8 / zoomLevel));
    const measuresPerLine = Math.min(maxMPL, Math.max(1, Math.floor((effectiveWidth - 40) / minMeasureWidth)));
    const currentLine = Math.floor(currentMeasureIndex / measuresPerLine);

    if (currentLine === lastScrolledLineRef.current) return;
    lastScrolledLineRef.current = currentLine;

    const mainContent = containerRef.current?.closest('.main-content') as HTMLElement | null;
    if (!mainContent) return;

    const scaledY = measureY * zoomLevel;
    const viewportH = mainContent.clientHeight;
    const targetScroll = scaledY - viewportH / 3;

    if (targetScroll < 0) return;
    if (Math.abs(mainContent.scrollTop - targetScroll) < 50) return;

    mainContent.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [currentMeasureIndex, score, zoomLevel]);

  return <div className="score-display" ref={containerRef} />;
};

export default ScoreDisplay;
