import type { StaveNote } from 'vexflow';
import type { ParsedRhythm } from '../types';

export type StaveNotePlaybackRef = {
  staveNote: StaveNote;
  measureIndex: number;
  noteIndex: number;
};

type PlaybackNote = {
  measureIndex: number;
  noteIndex: number;
  repeatIteration?: number;
};

function getMeasureRepeatInfo(
  measureIndex: number,
  repeats?: ParsedRhythm['repeats'],
): { isSimile: boolean; sourceMeasure: number } | null {
  if (!repeats) return null;
  for (const repeat of repeats) {
    if (repeat.type === 'measure' && repeat.repeatMeasures.includes(measureIndex)) {
      return { isSimile: true, sourceMeasure: repeat.sourceMeasure };
    }
  }
  return null;
}

const HIGHLIGHT = '#ef4444';
const DEFAULT_FILL = '#000000';
const DEFAULT_STROKE = '#000000';

/** Reset playback-only SVG styling without re-running VexFlow layout. */
export function clearDrumsPlaybackHighlights(
  svgElement: SVGSVGElement,
  staveNoteRefs: StaveNotePlaybackRef[],
  simileGroups: Map<number, SVGGElement>,
): void {
  svgElement.querySelectorAll('.repeat-counter').forEach((c) => {
    c.textContent = '';
  });

  simileGroups.forEach((group) => {
    group.querySelectorAll('.simile-dot').forEach((dot) => {
      const el = dot as SVGElement;
      el.setAttribute('fill', DEFAULT_FILL);
      el.style.fill = DEFAULT_FILL;
    });
    group.querySelectorAll('.simile-line').forEach((line) => {
      const el = line as SVGElement;
      el.setAttribute('stroke', DEFAULT_STROKE);
      el.style.stroke = DEFAULT_STROKE;
    });
  });

  for (const { staveNote } of staveNoteRefs) {
    const noteSvg = staveNote.getSVGElement();
    if (!noteSvg) continue;
    noteSvg.querySelectorAll('.vf-notehead, path[class*="notehead"], ellipse[class*="notehead"]').forEach((el) => {
      (el as SVGElement).style.fill = DEFAULT_FILL;
      (el as SVGElement).style.stroke = DEFAULT_STROKE;
    });
    noteSvg.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"]').forEach((el) => {
      (el as SVGElement).style.stroke = DEFAULT_STROKE;
    });
  }

  svgElement.querySelectorAll('.repeat-dot').forEach((dot) => {
    (dot as SVGElement).setAttribute('fill', DEFAULT_FILL);
  });
}

/** Apply playback highlight to the existing SVG (no full re-layout). */
export function applyDrumsPlaybackHighlights(
  svgElement: SVGSVGElement,
  currentNote: PlaybackNote,
  rhythm: ParsedRhythm,
  staveNoteRefs: StaveNotePlaybackRef[],
  simileGroups: Map<number, SVGGElement>,
): void {
  let sourceMeasureToHighlight: number | null = null;
  let sourceNoteIndex: number | null = null;

  let repeatEndMeasureIndex = -1;
  if (rhythm.repeats) {
    for (const repeat of rhythm.repeats) {
      if (
        repeat.type === 'section' &&
        currentNote.measureIndex >= repeat.startMeasure &&
        currentNote.measureIndex <= repeat.endMeasure
      ) {
        repeatEndMeasureIndex = repeat.endMeasure;
        break;
      }
    }
  }

  if (repeatEndMeasureIndex !== -1 && currentNote.repeatIteration !== undefined) {
    const repeatDotsGroup = svgElement.querySelector(
      `.repeat-dots-group[data-measure-index="${repeatEndMeasureIndex}"]`,
    );
    if (repeatDotsGroup) {
      const textCounter = repeatDotsGroup.querySelector('.repeat-counter');
      if (textCounter) {
        textCounter.textContent = `(${currentNote.repeatIteration + 1})`;
        textCounter.setAttribute('fill', HIGHLIGHT);
        (textCounter as SVGElement).style.fill = HIGHLIGHT;
      } else {
        repeatDotsGroup.querySelectorAll('.repeat-dot').forEach((dot) => {
          const index = parseInt(dot.getAttribute('data-index') || '0', 10);
          const dotEl = dot as SVGElement;
          dotEl.setAttribute('fill', index <= currentNote.repeatIteration! ? HIGHLIGHT : DEFAULT_FILL);
        });
      }
    }
  }

  const currentMeasureRepeatInfo = getMeasureRepeatInfo(currentNote.measureIndex, rhythm.repeats);
  if (currentMeasureRepeatInfo?.isSimile) {
    sourceMeasureToHighlight = currentMeasureRepeatInfo.sourceMeasure;
    sourceNoteIndex = currentNote.noteIndex;
    const simileGroup = simileGroups.get(currentNote.measureIndex);
    if (simileGroup) {
      simileGroup.querySelectorAll('.simile-dot').forEach((dot) => {
        const el = dot as SVGElement;
        el.setAttribute('fill', HIGHLIGHT);
        el.style.fill = HIGHLIGHT;
      });
      simileGroup.querySelectorAll('.simile-line').forEach((line) => {
        const el = line as SVGElement;
        el.setAttribute('stroke', HIGHLIGHT);
        el.style.stroke = HIGHLIGHT;
      });
    }
  }

  for (const { staveNote, measureIndex, noteIndex } of staveNoteRefs) {
    const isCurrentNote =
      currentNote.measureIndex === measureIndex && currentNote.noteIndex === noteIndex;
    const isSourceNote =
      sourceMeasureToHighlight !== null &&
      measureIndex === sourceMeasureToHighlight &&
      noteIndex === sourceNoteIndex;

    if (!isCurrentNote && !isSourceNote) continue;

    const noteSvg = staveNote.getSVGElement();
    if (!noteSvg) continue;
    noteSvg.querySelectorAll('.vf-notehead, path[class*="notehead"], ellipse[class*="notehead"]').forEach((el) => {
      (el as SVGElement).style.fill = HIGHLIGHT;
      (el as SVGElement).style.stroke = HIGHLIGHT;
    });
    noteSvg.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"]').forEach((el) => {
      (el as SVGElement).style.stroke = HIGHLIGHT;
    });
  }
}
