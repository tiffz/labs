import type { ParsedRhythm } from '../../shared/rhythm/types';
import {
  paintSvgDescendants,
  setSvgElementColor,
} from '../../shared/notation/playbackSvgHighlight';

export type PlaybackNotePointer = { measureIndex: number; noteIndex: number } | null;
export type PlaybackBeatPointer = {
  measureIndex: number;
  positionInSixteenths: number;
  isDownbeat: boolean;
} | null;

type ChordSystemEntry = {
  element: SVGElement;
  measureIndex: number;
  start: number;
  end: number;
};

type SyncPlaybackHighlightArgs = {
  noteElements: Map<string, SVGElement>;
  symbolElements: Map<string, SVGGElement>;
  syllableElements: Map<string, SVGTextElement>;
  chordSystemNoteElements: Map<string, ChordSystemEntry>;
  activeKeyRef: { current: string | null };
  currentNote: PlaybackNotePointer;
  currentMetronomeBeat: PlaybackBeatPointer;
  rhythm: ParsedRhythm;
};

export function syncPlaybackHighlightState({
  noteElements,
  symbolElements,
  syllableElements,
  chordSystemNoteElements,
  activeKeyRef,
  currentNote,
  currentMetronomeBeat,
  rhythm,
}: SyncPlaybackHighlightArgs) {
  const setHighlighted = (key: string, highlighted: boolean) => {
    const noteElement = noteElements.get(key);
    const noteColor = highlighted ? '#ef4444' : '#1f2937';
    if (noteElement) {
      setSvgElementColor(noteElement, noteColor, 'force');
      paintSvgDescendants(noteElement, noteColor, 'path, ellipse, circle, line, polygon, rect', 'auto');
    }

    const symbolElement = symbolElements.get(key);
    const symbolColor = highlighted ? '#ef4444' : '#1f2937';
    if (symbolElement) {
      paintSvgDescendants(symbolElement, symbolColor, 'path, circle', 'auto');
    }

    const syllableElement = syllableElements.get(key);
    if (syllableElement) {
      syllableElement.setAttribute('fill', highlighted ? '#ef4444' : '#111111');
      syllableElement.style.setProperty('fill', highlighted ? '#ef4444' : '#111111', 'important');
      syllableElement.setAttribute('font-weight', highlighted ? '900' : '700');
    }
  };

  const highlightChordSystem = (
    measureIndex: number | null,
    positionInSixteenths: number
  ) => {
    chordSystemNoteElements.forEach((entry) => {
      const isActive =
        measureIndex !== null &&
        entry.measureIndex === measureIndex &&
        positionInSixteenths >= entry.start &&
        positionInSixteenths < entry.end;
      const color = isActive ? '#ef4444' : '#1f2937';
      setSvgElementColor(entry.element, color, 'force');
      paintSvgDescendants(entry.element, color, 'path, ellipse, circle, line, polygon, rect', 'auto');
    });
  };

  const previousKey = activeKeyRef.current;
  const nextKey = currentNote ? `${currentNote.measureIndex}-${currentNote.noteIndex}` : null;
  if (previousKey && previousKey !== nextKey) {
    setHighlighted(previousKey, false);
  }
  if (nextKey) {
    setHighlighted(nextKey, true);
  }
  if (currentMetronomeBeat) {
    highlightChordSystem(
      currentMetronomeBeat.measureIndex,
      currentMetronomeBeat.positionInSixteenths
    );
  } else if (currentNote) {
    const measure = rhythm.measures[currentNote.measureIndex];
    const pos = measure
      ? measure.notes
          .slice(0, currentNote.noteIndex)
          .reduce((sum, note) => sum + note.durationInSixteenths, 0)
      : 0;
    highlightChordSystem(currentNote.measureIndex, pos);
  } else {
    highlightChordSystem(null, 0);
  }
  activeKeyRef.current = nextKey;
}
