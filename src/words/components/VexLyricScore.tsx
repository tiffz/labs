import React, { useCallback, useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Dot, BarlineType, Beam, StaveTie, StaveConnector } from 'vexflow';
import type { ParsedRhythm, TimeSignature } from '../../drums/types';
import { drawDrumSymbol } from '../../drums/assets/drumSymbols';
import type { SyllableHit } from '../../drums/wordRhythm/prosodyEngine';
import { scrollPlaybackTarget } from '../../shared/utils/playbackAutoScroll';
import {
  syncPlaybackHighlightState,
  type PlaybackBeatPointer,
  type PlaybackNotePointer,
} from '../utils/playbackHighlight';
import {
  getDefaultBeatGrouping,
  getBeatGroupingInSixteenths,
  getSixteenthsPerMeasure,
} from '../../shared/rhythm/timeSignatureUtils';
import { getChordHitsForStyle } from '../../shared/music/chordStyleHits';

interface VexLyricScoreProps {
  rhythm: ParsedRhythm;
  timeSignature: TimeSignature;
  chordKey?: string;
  measureNumberOffset?: number;
  showMeasureNumbers?: boolean;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  currentMetronomeBeat?: {
    measureIndex: number;
    positionInSixteenths: number;
    isDownbeat: boolean;
  } | null;
  metronomeEnabled?: boolean;
  chordLabelsByMeasure?: Map<number, string>;
  chordStyleByMeasure?: Map<number, string>;
  activeChordMeasure?: number | null;
  renderChordSystem?: boolean;
  sectionMarkers?: Array<{
    startMeasure: number;
    endMeasure: number;
    label: string;
  }>;
  hitMap: Map<string, SyllableHit>;
  autoFollowPlayback?: boolean;
  isPlaying?: boolean;
  zoomLevel?: number;
  scrollContainer?: HTMLElement | null;
}

const DURATION_MAP: Record<string, string> = {
  sixteenth: '16',
  eighth: '8',
  quarter: 'q',
  half: 'h',
  whole: 'w',
};

const SOUND_TO_PITCH: Record<string, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
  slap: 'f/4',
  rest: 'b/4',
  simile: 'b/4',
};

function toVexDurationToken(sixteenths: number) {
  if (sixteenths >= 16) return { duration: 'w', isDotted: false };
  if (sixteenths === 12) return { duration: 'h', isDotted: true };
  if (sixteenths >= 8) return { duration: 'h', isDotted: false };
  if (sixteenths === 6) return { duration: 'q', isDotted: true };
  if (sixteenths >= 4) return { duration: 'q', isDotted: false };
  if (sixteenths === 3) return { duration: '8', isDotted: true };
  if (sixteenths >= 2) return { duration: '8', isDotted: false };
  return { duration: '16', isDotted: false };
}

const CHORD_ROOT_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const VEX_KEY_SIGNATURES = new Set([
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
]);

function normalizeVexKeySignature(key: string): string | null {
  const normalized = key.trim();
  if (VEX_KEY_SIGNATURES.has(normalized)) return normalized;
  const enharmonicMap: Record<string, string> = {
    'D#': 'Eb',
    'A#': 'Bb',
    'G#': 'Ab',
  };
  const mapped = enharmonicMap[normalized];
  return mapped && VEX_KEY_SIGNATURES.has(mapped) ? mapped : null;
}

function toVexKey(note: string, octave: number): string {
  return `${note.toLowerCase()}/${octave}`;
}

function getChordToneKeys(chordLabel: string): { treble: string[]; bass: string[] } {
  const parsed = chordLabel.match(
    /^([A-G](?:#|b)?)(maj7|m7|m|7|sus2|sus4|dim|aug)?$/i
  );
  if (!parsed) {
    return { treble: ['c/4', 'e/4', 'g/4'], bass: ['c/3', 'g/2'] };
  }
  const rootToken = `${parsed[1]?.[0]?.toUpperCase() ?? 'C'}${(parsed[1] ?? '').slice(1)}`;
  const suffix = (parsed[2] ?? '').toLowerCase();
  const rootSemitone = CHORD_ROOT_TO_SEMITONE[rootToken] ?? 0;
  const preferFlats = rootToken.includes('b');
  const intervalMap: Record<string, number[]> = {
    '': [0, 4, 7],
    m: [0, 3, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    '7': [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
  };
  const intervals = intervalMap[suffix] ?? intervalMap[''];
  const noteNames = intervals.map((interval) => {
    const semitone = (rootSemitone + interval) % 12;
    return (preferFlats ? FLAT_NOTES : SHARP_NOTES)[semitone] ?? 'C';
  });
  const treble = noteNames.slice(0, 4).map((note, index) => {
    const octave = index < 2 ? 4 : 5;
    return toVexKey(note, octave);
  });
  const fifth = noteNames[2] ?? noteNames[0] ?? 'C';
  const bass = [toVexKey(noteNames[0] ?? 'C', 3), toVexKey(fifth, 2)];
  return {
    treble: treble.length > 0 ? treble : ['c/4', 'e/4', 'g/4'],
    bass,
  };
}

const VexLyricScore: React.FC<VexLyricScoreProps> = ({
  rhythm,
  timeSignature,
  chordKey = 'C',
  measureNumberOffset = 0,
  showMeasureNumbers = rhythm.measures.length > 4,
  currentNote,
  currentMetronomeBeat,
  metronomeEnabled = false,
  chordLabelsByMeasure = new Map(),
  chordStyleByMeasure = new Map(),
  activeChordMeasure = null,
  renderChordSystem = false,
  sectionMarkers = [],
  hitMap,
  autoFollowPlayback = true,
  isPlaying = false,
  zoomLevel = 1,
  scrollContainer = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const noteElementsRef = useRef<Map<string, SVGElement>>(new Map());
  const noteLineIndexRef = useRef<Map<string, number>>(new Map());
  const symbolElementsRef = useRef<Map<string, SVGGElement>>(new Map());
  const syllableElementsRef = useRef<Map<string, SVGTextElement>>(new Map());
  const metronomeDotElementsRef = useRef<Map<string, SVGCircleElement>>(new Map());
  const chordLabelElementsRef = useRef<Map<number, SVGTextElement>>(new Map());
  const chordSystemNoteElementsRef = useRef<
    Map<string, { element: SVGElement; measureIndex: number; start: number; end: number }>
  >(new Map());
  const activeChordMeasureRef = useRef<number | null>(null);
  const lineAnchorRef = useRef<Map<number, SVGElement>>(new Map());
  const activeKeyRef = useRef<string | null>(null);
  const maxScrolledLineRef = useRef<number>(-1);
  const currentNoteRef = useRef<PlaybackNotePointer>(currentNote ?? null);
  const currentMetronomeBeatRef = useRef<PlaybackBeatPointer>(currentMetronomeBeat ?? null);
  const autoScrollStateRef = useRef<{ lastMarker: number | string | null; lastScrollAtMs: number; lastTargetTop: number | null }>({
    lastMarker: null,
    lastScrollAtMs: 0,
    lastTargetTop: null,
  });

  const syncPlaybackHighlight = useCallback((
    nextNote: PlaybackNotePointer,
    nextMetronomeBeat: PlaybackBeatPointer
  ) => {
    syncPlaybackHighlightState({
      noteElements: noteElementsRef.current,
      symbolElements: symbolElementsRef.current,
      syllableElements: syllableElementsRef.current,
      chordSystemNoteElements: chordSystemNoteElementsRef.current,
      activeKeyRef,
      currentNote: nextNote,
      currentMetronomeBeat: nextMetronomeBeat,
      rhythm,
    });
  }, [rhythm]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    noteElementsRef.current = new Map();
    noteLineIndexRef.current = new Map();
    symbolElementsRef.current = new Map();
    syllableElementsRef.current = new Map();
    metronomeDotElementsRef.current = new Map();
    chordLabelElementsRef.current = new Map();
    chordSystemNoteElementsRef.current = new Map();
    lineAnchorRef.current = new Map();
    if (rhythm.measures.length === 0) return;

    const leftPad = 16;
    const rightPad = 24;
    const topPad = 34;
    const lineGap = renderChordSystem ? 286 : 150;
    const clampedZoom = Math.max(0.75, Math.min(1.75, zoomLevel));
    const containerPixelWidth = Math.max(320, containerRef.current.clientWidth || 960);
    const availableWidth = Math.max(
      320,
      containerPixelWidth / clampedZoom
    );
    // Reserve a right-side gutter so wrapped lines never clip against the edge
    // (including cases where a vertical scrollbar appears in the parent column).
    const wrapSafetyPx = 24;
    const maxLineWidth = Math.max(
      180,
      availableWidth - leftPad - rightPad - wrapSafetyPx
    );
    const beatGrouping = getDefaultBeatGrouping(timeSignature);
    const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, timeSignature);
    const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
    const sectionStartLabels = new Map<number, string>();
    sectionMarkers.forEach((marker) => {
      sectionStartLabels.set(marker.startMeasure, marker.label);
    });

    const measureWidths = rhythm.measures.map((measure, measureIndex) => {
      const soundingNotes = measure.notes.filter((note) => note.sound !== 'rest').length;
      const activeSixteenths = measure.notes
        .filter((note) => note.sound !== 'rest')
        .reduce((sum, note) => sum + note.durationInSixteenths, 0);
      const totalSixteenths = Math.max(
        1,
        measure.notes.reduce((sum, note) => sum + note.durationInSixteenths, 0)
      );
      const density = activeSixteenths / totalSixteenths;
      const lyricDensity = measure.notes.reduce((sum, note, noteIndex) => {
        if (note.sound === 'rest') return sum;
        const hit = hitMap.get(`${measureIndex}-${noteIndex}`);
        if (!hit) return sum;
        // Word starts need extra breathing room to avoid crammed lyric clusters.
        const wordStartWeight = hit.syllableIndex === 0 ? 3 : 0;
        return sum + hit.syllable.length + wordStartWeight;
      }, 0);
      const baseWidth =
        112 + soundingNotes * 16 + Math.round(density * 38) + Math.round(lyricDensity * 2.4);
      const withTimeSigOffset = measureIndex === 0 ? baseWidth + 26 : baseWidth;
      const withSectionGap =
        sectionStartLabels.has(measureIndex) && measureIndex > 0
          ? withTimeSigOffset + 24
          : withTimeSigOffset;
      return Math.max(148, Math.min(336, withSectionGap));
    });
    const lines: number[][] = [];
    let currentLine: number[] = [];
    let currentWidth = 0;
    measureWidths.forEach((width, measureIndex) => {
      if (currentLine.length > 0 && currentWidth + width > maxLineWidth) {
        lines.push(currentLine);
        currentLine = [measureIndex];
        currentWidth = width;
      } else {
        currentLine.push(measureIndex);
        currentWidth += width;
      }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    const totalWidth = Math.max(320, leftPad + maxLineWidth + rightPad);
    const totalHeight = Math.max(180, topPad + lines.length * lineGap + 28);

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(totalWidth, totalHeight);
    const context = renderer.getContext();
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;
    svg.style.transformOrigin = 'top left';
    svg.style.transform = `scale(${clampedZoom})`;
    svg.style.width = `${totalWidth}px`;
    svg.style.height = `${totalHeight}px`;
    containerRef.current.style.height = `${Math.round(totalHeight * clampedZoom)}px`;

    lines.forEach((line, lineIndex) => {
      let x = leftPad;
      const staveY = topPad + lineIndex * lineGap + 14;
      const lineAnchor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      lineAnchor.setAttribute('x', String(leftPad));
      lineAnchor.setAttribute('y', String(staveY));
      lineAnchor.setAttribute('width', '0');
      lineAnchor.setAttribute('height', '0');
      lineAnchor.setAttribute('fill', 'transparent');
      lineAnchor.setAttribute('stroke', 'none');
      lineAnchor.style.stroke = 'none';
      lineAnchor.style.pointerEvents = 'none';
      svg.appendChild(lineAnchor);
      lineAnchorRef.current.set(lineIndex, lineAnchor);
      line.forEach((measureIndex) => {
        const measure = rhythm.measures[measureIndex];
        const measureWidth = measureWidths[measureIndex];
        const sectionLabel = sectionStartLabels.get(measureIndex);
        if (sectionLabel) {
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('x', String(x + 2));
          label.setAttribute('y', String(staveY - 22));
          label.setAttribute('font-size', '10');
          label.setAttribute('font-family', 'Roboto, sans-serif');
          label.setAttribute('font-weight', '800');
          label.setAttribute('fill', '#0f766e');
          label.textContent = sectionLabel;
          svg.appendChild(label);
          if (measureIndex > 0) {
            const separator = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            separator.setAttribute('x1', String(x - 10));
            separator.setAttribute('x2', String(x - 10));
            separator.setAttribute('y1', String(staveY - 12));
            separator.setAttribute(
              'y2',
              String(renderChordSystem ? staveY + 206 : staveY + 72)
            );
            separator.setAttribute('stroke', '#67e8f9');
            separator.setAttribute('stroke-width', '2');
            separator.setAttribute('stroke-linecap', 'round');
            separator.setAttribute('stroke-dasharray', '5 4');
            svg.appendChild(separator);
          }
        }
        const stave = new Stave(x, staveY, measureWidth);

        if (measureIndex === 0) {
          stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
        }
        if (measureIndex === rhythm.measures.length - 1) {
          stave.setEndBarType(BarlineType.END);
        }
        stave.setContext(context).draw();
        if (showMeasureNumbers) {
          const measureLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          measureLabel.setAttribute('x', String(x + 4));
          measureLabel.setAttribute('y', String(staveY - 10));
          measureLabel.setAttribute('font-size', '10');
          measureLabel.setAttribute('font-family', 'Roboto, sans-serif');
          measureLabel.setAttribute('font-weight', '700');
          measureLabel.setAttribute('fill', '#111111');
          measureLabel.setAttribute('stroke', 'none');
          measureLabel.style.stroke = 'none';
          measureLabel.textContent = String(measureNumberOffset + measureIndex + 1);
          svg.appendChild(measureLabel);
        }
        const chordLabel = chordLabelsByMeasure.get(measureIndex);
        if (chordLabel) {
          const chordText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          chordText.setAttribute('x', String(stave.getNoteStartX() + 18));
          chordText.setAttribute('y', String(staveY - 12));
          chordText.setAttribute('text-anchor', 'start');
          chordText.setAttribute('font-size', '15');
          chordText.setAttribute('font-family', 'Roboto, sans-serif');
          chordText.setAttribute('font-weight', '800');
          chordText.setAttribute('fill', '#111827');
          chordText.setAttribute('stroke', 'none');
          chordText.style.stroke = 'none';
          chordText.textContent = chordLabel;
          svg.appendChild(chordText);
          chordLabelElementsRef.current.set(measureIndex, chordText);
        }
        const lineStart = line.indexOf(measureIndex) === 0;
        const chordTrebleStave = renderChordSystem
          ? new Stave(x, staveY + 116, measureWidth)
          : null;
        const chordBassStave = renderChordSystem
          ? new Stave(x, staveY + 174, measureWidth)
          : null;
        if (chordTrebleStave && chordBassStave) {
          if (lineStart) {
            chordTrebleStave.addClef('treble');
            chordBassStave.addClef('bass');
            const keySignature = normalizeVexKeySignature(chordKey);
            if (keySignature) {
              chordTrebleStave.addKeySignature(keySignature);
              chordBassStave.addKeySignature(keySignature);
            }
            chordTrebleStave.addTimeSignature(
              `${timeSignature.numerator}/${timeSignature.denominator}`
            );
            chordBassStave.addTimeSignature(
              `${timeSignature.numerator}/${timeSignature.denominator}`
            );
          }
          chordTrebleStave.setContext(context).draw();
          chordBassStave.setContext(context).draw();
          if (lineStart) {
            const melodyToChords = new StaveConnector(stave, chordTrebleStave)
              .setType(StaveConnector.type.SINGLE_LEFT)
              .setContext(context);
            melodyToChords.draw();
            const leftConnector = new StaveConnector(chordTrebleStave, chordBassStave)
              .setType(StaveConnector.type.SINGLE_LEFT)
              .setContext(context);
            leftConnector.draw();
            const brace = new StaveConnector(chordTrebleStave, chordBassStave)
              .setType(StaveConnector.type.BRACE)
              .setContext(context);
            brace.draw();
          }
        }
        const vexNotes = measure.notes.map((note) => {
          let duration = DURATION_MAP[note.duration] || 'q';
          if (note.isDotted) duration += 'd';
          if (note.sound === 'rest') duration += 'r';

          const staveNote = new StaveNote({
            keys: [SOUND_TO_PITCH[note.sound] || 'f/4'],
            duration,
            clef: 'percussion',
          });
          if (note.isDotted) Dot.buildAndAttach([staveNote], { all: true });
          return staveNote;
        });

        if (vexNotes.length === 0) {
          x += measureWidth;
          return;
        }

        const voice = new Voice({
          numBeats: timeSignature.numerator,
          beatValue: timeSignature.denominator,
        });
        voice.setStrict(false);
        voice.addTickables(vexNotes);
        new Formatter().joinVoices([voice]).format([voice], measureWidth - 32);
        const beams = Beam.generateBeams(vexNotes, { beam_rests: false });
        voice.draw(context, stave);
        beams.forEach((beam) => beam.setContext(context).draw());
        for (let noteIndex = 1; noteIndex < vexNotes.length; noteIndex += 1) {
          const hit = hitMap.get(`${measureIndex}-${noteIndex}`);
          const previousNote = measure.notes[noteIndex - 1];
          const currentNote = measure.notes[noteIndex];
          if (
            !hit?.continuationOfPrevious ||
            previousNote?.sound === 'rest' ||
            currentNote?.sound === 'rest'
          ) {
            continue;
          }
          const firstTieNote = vexNotes[noteIndex - 1];
          const lastTieNote = vexNotes[noteIndex];
          if (!firstTieNote || !lastTieNote) continue;
          const tie = new StaveTie({
            firstNote: firstTieNote,
            lastNote: lastTieNote,
            firstIndexes: [0],
            lastIndexes: [0],
          });
          tie.setContext(context).draw();
        }

        vexNotes.forEach((vexNote, noteIndex) => {
          const note = measure.notes[noteIndex];
          const key = `${measureIndex}-${noteIndex}`;
          const noteElement = vexNote.getSVGElement();
          if (noteElement) {
            noteElementsRef.current.set(key, noteElement);
            noteLineIndexRef.current.set(key, lineIndex);
          }
          if (note.sound === 'rest') return;

          const noteX = vexNote.getAbsoluteX() + 10;
          const noteY = stave.getYForLine(2);
          const hit = hitMap.get(key);

          if (!hit?.continuationOfPrevious) {
            const symbolElement = drawDrumSymbol(svg, noteX, noteY, note.sound, '#1f2937', 0.9, -40);
            if (symbolElement) {
              symbolElementsRef.current.set(key, symbolElement);
            }
          }

          if (hit && hit.syllable.trim().length > 0) {
            const syllable = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            syllable.setAttribute('x', String(noteX));
            syllable.setAttribute(
              'y',
              String(staveY + 92)
            );
            syllable.setAttribute('text-anchor', 'middle');
            syllable.setAttribute('font-size', '11');
            syllable.setAttribute('font-family', 'Roboto, sans-serif');
            syllable.setAttribute('font-weight', '700');
            syllable.setAttribute('fill', '#111111');
            syllable.setAttribute('stroke', 'none');
            syllable.setAttribute('stroke-width', '0');
            const displaySyllable =
              hit.syllableIndex === 0 && hit.wordIndex > 0 ? `\u2009${hit.syllable}` : hit.syllable;
            syllable.textContent = displaySyllable;
            const info = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            info.textContent = `word: ${hit.word} | syllable: ${hit.syllable} | source: ${hit.source} | stress: ${hit.stress}`;
            syllable.appendChild(info);
            svg.appendChild(syllable);
            syllableElementsRef.current.set(key, syllable);
          }
        });

        if (chordTrebleStave && chordBassStave) {
          const styleId = chordStyleByMeasure.get(measureIndex) ?? 'simple';
          const hits = getChordHitsForStyle(styleId, timeSignature)
            .map((hit) => ({
              ...hit,
              start: Math.max(0, Math.round(hit.offsetBeats * 4)),
              duration: Math.max(1, Math.round(hit.durationBeats * 4)),
            }))
            .sort((a, b) => a.start - b.start);
          const chordEvents: Array<{
            sound: 'rest' | 'bass' | 'treble' | 'both';
            start: number;
            duration: number;
          }> = [];
          let cursor = 0;
          hits.forEach((hit) => {
            if (hit.start > cursor) {
              chordEvents.push({
                sound: 'rest',
                start: cursor,
                duration: hit.start - cursor,
              });
            }
            chordEvents.push({
              sound: hit.source,
              start: hit.start,
              duration: hit.duration,
            });
            cursor = Math.max(cursor, hit.start + hit.duration);
          });
          if (cursor < sixteenthsPerMeasure) {
            chordEvents.push({
              sound: 'rest',
              start: cursor,
              duration: sixteenthsPerMeasure - cursor,
            });
          }
          const splitDurations = (duration: number) => {
            const parts: number[] = [];
            let remaining = duration;
            const values = [16, 12, 8, 6, 4, 3, 2, 1];
            while (remaining > 0) {
              const next = values.find((value) => value <= remaining) ?? 1;
              parts.push(next);
              remaining -= next;
            }
            return parts;
          };
          const chordTrebleNotes: StaveNote[] = [];
          const chordBassNotes: StaveNote[] = [];
          const chordTrebleRanges: Array<
            | null
            | {
                measureIndex: number;
                start: number;
                end: number;
              }
          > = [];
          const chordBassRanges: Array<
            | null
            | {
                measureIndex: number;
                start: number;
                end: number;
              }
          > = [];
          chordEvents.forEach((event) => {
            const chordLabel = chordLabelsByMeasure.get(measureIndex) ?? chordKey;
            const chordToneKeys = getChordToneKeys(chordLabel);
            splitDurations(event.duration).forEach((partDuration) => {
              const vex = toVexDurationToken(partDuration);
              const isTrebleRest =
                event.sound === 'rest' || event.sound === 'bass';
              const isBassRest = event.sound === 'rest' || event.sound === 'treble';
              const trebleNote = new StaveNote({
                keys: isTrebleRest ? ['b/4'] : chordToneKeys.treble,
                duration: `${vex.duration}${vex.isDotted ? 'd' : ''}${isTrebleRest ? 'r' : ''}`,
                clef: 'treble',
                auto_stem: false,
                stem_direction: 1,
              });
              const bassNote = new StaveNote({
                keys: isBassRest ? ['b/3'] : chordToneKeys.bass,
                duration: `${vex.duration}${vex.isDotted ? 'd' : ''}${isBassRest ? 'r' : ''}`,
                clef: 'bass',
                auto_stem: false,
                stem_direction: -1,
              });
              if (vex.isDotted) {
                Dot.buildAndAttach([trebleNote], { all: true });
                Dot.buildAndAttach([bassNote], { all: true });
              }
              chordTrebleNotes.push(trebleNote);
              chordBassNotes.push(bassNote);
              chordTrebleRanges.push(
                isTrebleRest
                  ? null
                  : {
                      measureIndex,
                      start: event.start,
                      end: event.start + event.duration,
                    }
              );
              chordBassRanges.push(
                isBassRest
                  ? null
                  : {
                      measureIndex,
                      start: event.start,
                      end: event.start + event.duration,
                    }
              );
            });
          });
          if (chordTrebleNotes.length > 0 && chordBassNotes.length > 0) {
            const trebleVoice = new Voice({
              numBeats: timeSignature.numerator,
              beatValue: timeSignature.denominator,
            });
            const bassVoice = new Voice({
              numBeats: timeSignature.numerator,
              beatValue: timeSignature.denominator,
            });
            trebleVoice.setStrict(false);
            bassVoice.setStrict(false);
            trebleVoice.addTickables(chordTrebleNotes);
            bassVoice.addTickables(chordBassNotes);
            new Formatter()
              .joinVoices([trebleVoice])
              .joinVoices([bassVoice])
              .format([trebleVoice, bassVoice], measureWidth - 32);
            trebleVoice.draw(context, chordTrebleStave);
            bassVoice.draw(context, chordBassStave);
            let chordNoteIndex = 0;
            const registerChordElements = (
              notes: StaveNote[],
              ranges: Array<
                | null
                | { measureIndex: number; start: number; end: number }
              >
            ) => {
              notes.forEach((note, idx) => {
                const el = note.getSVGElement();
                if (!el) return;
                el.querySelectorAll('path, ellipse, circle, line, polygon, rect').forEach((part) => {
                  if (part.getAttribute('fill') && part.getAttribute('fill') !== 'none') {
                    part.setAttribute('fill', '#1f2937');
                  }
                  if (part.getAttribute('stroke') && part.getAttribute('stroke') !== 'none') {
                    part.setAttribute('stroke', '#1f2937');
                  }
                });
                const range = ranges[idx];
                if (!range) return;
                const noteKey = `${measureIndex}-${chordNoteIndex}`;
                chordSystemNoteElementsRef.current.set(noteKey, {
                  element: el,
                  measureIndex: range.measureIndex,
                  start: range.start,
                  end: range.end,
                });
                chordNoteIndex += 1;
              });
            };
            registerChordElements(chordTrebleNotes, chordTrebleRanges);
            registerChordElements(chordBassNotes, chordBassRanges);
          }
        }

        if (metronomeEnabled && vexNotes.length > 0) {
          const getNoteCenterX = (noteIndex: number): number => {
            const vexNote = vexNotes[noteIndex];
            if (!vexNote) return stave.getNoteStartX();
            try {
              const bounds = vexNote.getBoundingBox();
              if (bounds) return bounds.getX() + bounds.getW() * 0.5;
            } catch {
              // Fall through to absolute position fallback
            }
            return vexNote.getAbsoluteX() + 6;
          };

          const beatPositions = [0];
          let cumulativeBeatPosition = 0;
          beatGroupingInSixteenths.forEach((groupSize) => {
            cumulativeBeatPosition += groupSize;
            if (cumulativeBeatPosition < sixteenthsPerMeasure) {
              beatPositions.push(cumulativeBeatPosition);
            }
          });

          beatPositions.forEach((beatPosition) => {
            let dotX = getNoteCenterX(0);
            let cumulativeNotePosition = 0;
            let found = false;

            for (let noteIndex = 0; noteIndex < measure.notes.length; noteIndex += 1) {
              const noteDuration = measure.notes[noteIndex]?.durationInSixteenths ?? 1;
              const noteStartPosition = cumulativeNotePosition;
              const noteEndPosition = cumulativeNotePosition + noteDuration;
              if (beatPosition >= noteStartPosition && beatPosition < noteEndPosition) {
                const noteX = getNoteCenterX(noteIndex);
                const progressWithinNote = (beatPosition - noteStartPosition) / Math.max(1, noteDuration);
                if (progressWithinNote === 0) {
                  dotX = noteX;
                } else {
                  const nextX =
                    noteIndex < measure.notes.length - 1
                      ? getNoteCenterX(noteIndex + 1)
                      : stave.getNoteEndX() - 12;
                  dotX = noteX + (nextX - noteX) * progressWithinNote;
                }
                found = true;
                break;
              }
              cumulativeNotePosition = noteEndPosition;
            }

            if (!found) {
              dotX = getNoteCenterX(0);
            }

            const dotY = stave.getYForLine(5) + 8;
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', String(dotX));
            dot.setAttribute('cy', String(dotY));
            dot.setAttribute('r', '4');
            dot.setAttribute('fill', '#8a97ab');
            dot.setAttribute('stroke', 'none');
            dot.setAttribute('stroke-width', '0');
            svg.appendChild(dot);
            metronomeDotElementsRef.current.set(`${measureIndex}-${beatPosition}`, dot);
          });
        }

        x += measureWidth;
      });
    });
    syncPlaybackHighlight(currentNoteRef.current, currentMetronomeBeatRef.current);
  }, [
    rhythm,
    timeSignature,
    hitMap,
    metronomeEnabled,
    chordLabelsByMeasure,
    chordStyleByMeasure,
    chordKey,
    measureNumberOffset,
    showMeasureNumbers,
    renderChordSystem,
    sectionMarkers,
    syncPlaybackHighlight,
    zoomLevel,
  ]);

  useEffect(() => {
    currentNoteRef.current = currentNote ?? null;
    currentMetronomeBeatRef.current = currentMetronomeBeat ?? null;
    syncPlaybackHighlight(currentNoteRef.current, currentMetronomeBeatRef.current);
  }, [currentNote, currentMetronomeBeat, syncPlaybackHighlight]);

  useEffect(() => {
    if (!metronomeEnabled || metronomeDotElementsRef.current.size === 0) return;
    const beatPositions: number[] = [0];
    const grouping = getBeatGroupingInSixteenths(getDefaultBeatGrouping(timeSignature), timeSignature);
    const measureLength = getSixteenthsPerMeasure(timeSignature);
    let cumulative = 0;
    grouping.forEach((groupSize) => {
      cumulative += groupSize;
      if (cumulative < measureLength) beatPositions.push(cumulative);
    });

    metronomeDotElementsRef.current.forEach((dot) => {
      dot.setAttribute('fill', '#8a97ab');
      dot.setAttribute('stroke', 'none');
      dot.setAttribute('stroke-width', '0');
      dot.setAttribute('r', '4');
    });
    if (!currentMetronomeBeat) return;
    // Latch highlight to the active beat window so the dot stays red for the whole beat.
    const latchedBeatPosition = beatPositions.reduce(
      (active, beatPos) =>
        beatPos <= currentMetronomeBeat.positionInSixteenths && beatPos >= active ? beatPos : active,
      0
    );
    const key = `${currentMetronomeBeat.measureIndex}-${latchedBeatPosition}`;
    const dot = metronomeDotElementsRef.current.get(key);
    if (!dot) return;
    dot.setAttribute('fill', '#ef4444');
    dot.setAttribute('stroke', '#dc2626');
    dot.setAttribute('stroke-width', '1');
  }, [currentMetronomeBeat, metronomeEnabled, rhythm, timeSignature]);

  useEffect(() => {
    const prev = activeChordMeasureRef.current;
    if (prev !== null) {
      const prevLabel = chordLabelElementsRef.current.get(prev);
      if (prevLabel) {
        prevLabel.setAttribute('fill', '#111827');
        prevLabel.setAttribute('font-weight', '800');
        prevLabel.setAttribute('stroke', 'none');
        prevLabel.style.stroke = 'none';
      }
    }
    if (activeChordMeasure !== null) {
      const currentLabel = chordLabelElementsRef.current.get(activeChordMeasure);
      if (currentLabel) {
        currentLabel.setAttribute('fill', '#ef4444');
        currentLabel.setAttribute('font-weight', '900');
        currentLabel.setAttribute('stroke', 'none');
        currentLabel.style.stroke = 'none';
      }
    }
    activeChordMeasureRef.current = activeChordMeasure;
  }, [activeChordMeasure, rhythm]);

  useEffect(() => {
    if (!isPlaying || !currentNote || !autoFollowPlayback) return;
    const currentKey = `${currentNote.measureIndex}-${currentNote.noteIndex}`;
    const currentPlaybackLine = noteLineIndexRef.current.get(currentKey);
    const noteEl = noteElementsRef.current.get(currentKey);
    if (currentPlaybackLine === undefined || !noteEl) return;
    const isLoopBack = currentPlaybackLine < maxScrolledLineRef.current;
    if (isLoopBack) {
      // Loop restart: clear monotonic guards so auto-follow can move upward.
      autoScrollStateRef.current.lastMarker = null;
      autoScrollStateRef.current.lastScrollAtMs = 0;
      autoScrollStateRef.current.lastTargetTop = null;
    } else if (currentPlaybackLine === maxScrolledLineRef.current) {
      return;
    }
    const lineAnchor = lineAnchorRef.current.get(currentPlaybackLine) ?? noteEl;
    scrollPlaybackTarget({
      marker: currentPlaybackLine,
      target: lineAnchor,
      state: autoScrollStateRef.current,
      scrollContainer,
      minIntervalMs: 200,
      minDeltaPx: 56,
      preferredTopRatio: 0.18,
      allowBackward: isLoopBack,
    });
    maxScrolledLineRef.current = currentPlaybackLine;
  }, [currentNote, autoFollowPlayback, isPlaying, scrollContainer]);

  useEffect(() => {
    if (isPlaying) return;
    autoScrollStateRef.current.lastMarker = null;
    autoScrollStateRef.current.lastScrollAtMs = 0;
    autoScrollStateRef.current.lastTargetTop = null;
    maxScrolledLineRef.current = -1;
  }, [isPlaying]);

  return <div className="words-vex-score" ref={containerRef} />;
};

export default VexLyricScore;
