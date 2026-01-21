import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, BarlineType } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound, TimeSignature, RepeatMarker, SectionRepeat } from '../types';
import { drawDrumSymbol } from '../assets/drumSymbols';
import { getDefaultBeatGrouping, isCompoundTimeSignature, isAsymmetricTimeSignature, getBeatGroupingInSixteenths, getSixteenthsPerMeasure } from '../utils/timeSignatureUtils';
import { findDropTarget, type NotePosition } from '../utils/dropTargetFinder';
import { computeDropPreview } from '../utils/dropPreview';
import { getCurrentDraggedPattern } from './NotePalette';

/**
 * Checks if a measure is at the start of a section repeat
 */
function isSectionRepeatStart(measureIndex: number, repeats?: RepeatMarker[]): SectionRepeat | null {
  if (!repeats) return null;
  for (const repeat of repeats) {
    if (repeat.type === 'section' && repeat.startMeasure === measureIndex) {
      return repeat;
    }
  }
  return null;
}

/**
 * Checks if a measure is at the end of a section repeat
 */
function isSectionRepeatEnd(measureIndex: number, repeats?: RepeatMarker[]): SectionRepeat | null {
  if (!repeats) return null;
  for (const repeat of repeats) {
    if (repeat.type === 'section' && repeat.endMeasure === measureIndex) {
      return repeat;
    }
  }
  return null;
}

/**
 * Checks if a measure should be rendered as a simile (% symbol)
 */
function getMeasureRepeatInfo(measureIndex: number, repeats?: RepeatMarker[]): { isSimile: boolean; sourceMeasure: number } | null {
  if (!repeats) return null;
  for (const repeat of repeats) {
    if (repeat.type === 'measure') {
      if (repeat.repeatMeasures.includes(measureIndex)) {
        return { isSimile: true, sourceMeasure: repeat.sourceMeasure };
      }
    }
  }
  return null;
}

/**
 * Find the note at a click position using visual notehead bounds.
 * 
 * This algorithm prioritizes clicks on the visual notehead (the actual drawn note)
 * rather than the abstract "time region" that extends to the next note. This is
 * more intuitive because users expect to click ON the visual element.
 * 
 * Strategy:
 * 1. Filter to notes on the same line (Y proximity)
 * 2. Check if click is directly on any notehead's visual bounds - if so, select it
 * 3. If not on any notehead, find the closest notehead by distance to center
 */
function findClickedNote(
  svgX: number,
  svgY: number,
  notePositions: NotePosition[]
): NotePosition | null {
  if (notePositions.length === 0) return null;

  const yPadding = 10;
  const staveYRange = 80; // Vertical range to consider a note "on the same line"

  // Visual notehead width - the actual clickable area around the notehead
  // This is wider than the drawn notehead to provide a comfortable click target
  const visualNoteheadWidth = 28;
  const noteheadPadding = visualNoteheadWidth / 2;

  // First, filter to notes on the same line (Y proximity)
  const sameLineNotes: NotePosition[] = [];
  for (const notePos of notePositions) {
    const noteStaveY = notePos.staveY ?? notePos.y;
    if (svgY >= noteStaveY - yPadding && svgY <= noteStaveY + staveYRange + yPadding) {
      sameLineNotes.push(notePos);
    }
  }

  if (sameLineNotes.length === 0) return null;

  // PASS 1: Check if click is directly on any notehead's visual bounds
  // This takes priority - if you click ON a note, you get that note
  for (const notePos of sameLineNotes) {
    const noteheadCenter = notePos.x + noteheadPadding / 2; // Notehead is near the start
    const noteheadLeft = noteheadCenter - noteheadPadding;
    const noteheadRight = noteheadCenter + noteheadPadding;

    if (svgX >= noteheadLeft && svgX <= noteheadRight) {
      return notePos;
    }
  }

  // PASS 2: Click is not directly on any notehead - find the closest one
  // Use distance to notehead center for intuitive "closest note" behavior
  let closestNote: NotePosition | null = null;
  let minDistance = Infinity;

  for (const notePos of sameLineNotes) {
    const noteheadCenter = notePos.x + noteheadPadding / 2;
    const distance = Math.abs(svgX - noteheadCenter);

    if (distance < minDistance) {
      minDistance = distance;
      closestNote = notePos;
    }
  }

  return closestNote;
}

/**
 * ARCHITECTURE DECISION: VexFlowRenderer vs DrumNotationMini
 *
 * This component and `src/shared/notation/DrumNotationMini.tsx` both render drum
 * notation using VexFlow, but they intentionally DO NOT share rendering code.
 *
 * Why separate implementations?
 * - VexFlowRenderer: Full-featured editor with multi-measure layout, drag-drop,
 *   rectangle selection, metronome dots, cross-measure ties, and responsive sizing
 * - DrumNotationMini: Simple read-only display for single measure with theming
 *
 * These serve fundamentally different purposes. Merging them would create:
 * - Parameter explosion (isEditable, showMetronome, enableDragDrop, etc.)
 * - Conditional rendering paths that make the code hard to reason about
 * - Tight coupling that would make both harder to evolve independently
 *
 * Per Sandi Metz's "The Wrong Abstraction": prefer duplication over the wrong
 * abstraction. The duplicated beaming logic and constants are acceptable - they're
 * cheaper to maintain than a condition-laden shared component.
 *
 * Shared utilities (types, drumSymbols, timeSignatureUtils) ARE appropriate to share
 * because they're pure functions/data without consumer-specific behavior.
 *
 * @see https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
 */

/** Selection rectangle state for visual feedback */
interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/** Selection state for notes */
export interface NoteSelectionState {
  startCharPosition: number | null;
  endCharPosition: number | null;
  isSelecting: boolean;
}

interface VexFlowRendererProps {
  rhythm: ParsedRhythm;
  currentNote?: { measureIndex: number; noteIndex: number; repeatIteration?: number; maxRepeats?: number } | null;
  metronomeEnabled?: boolean;
  currentMetronomeBeat?: { measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null;
  onDropPattern?: (pattern: string, charPosition: number, targetMeasureIndex?: number) => void;
  dragDropMode?: 'replace' | 'insert';
  notation?: string;
  timeSignature?: TimeSignature;
  /** Current selection state */
  selection?: NoteSelectionState | null;
  /** Callback when selection changes */
  onSelectionChange?: (start: number | null, end: number | null, duration: number, isShiftPressed?: boolean) => void;
  /** Callback when selection is dragged to a new position */
  onMoveSelection?: (fromStart: number, fromEnd: number, toPosition: number) => void;
  /** Callback when delete key is pressed on selection */
  onDeleteSelection?: () => void;
  /** Callback to request focus on the note palette (for Tab navigation) */
  onRequestPaletteFocus?: () => void;
}

/**
 * Maps Darbuka sounds to staff positions
 * Notes on F/4 line, rests centered on B/4 (middle line)
 */
const SOUND_TO_PITCH: Record<DrumSound, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
  slap: 'f/4',
  rest: 'b/4', // Center rests on middle line
  simile: 'b/4', // Will be skipped, but needed for type check
};

/**
 * Maps note durations to VexFlow duration strings
 */
const DURATION_MAP: Record<string, string> = {
  sixteenth: '16',
  eighth: '8',
  quarter: 'q',
  half: 'h',
  whole: 'w',
};

/**
 * Creates beams based on beat groupings for proper visual grouping
 * For compound time (6/8, 9/8, 12/8): groups notes by beat groups (e.g., 3 eighth notes)
 * For asymmetric time: groups notes according to custom beat groupings
 */
function createBeamsFromBeatGroups(
  staveNotes: StaveNote[],
  notes: Note[],
  timeSignature: TimeSignature
): Beam[] {
  const beams: Beam[] = [];

  // Get beat grouping for this time signature
  const beatGrouping = getDefaultBeatGrouping(timeSignature);

  // Convert beat grouping to sixteenths
  const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, timeSignature);

  // Track position in measure (in sixteenths)
  let currentPosition = 0;
  let currentNoteIndex = 0;

  // Determine if we should use sub-grouping
  // Only sub-group for simple time signatures (4/4, 2/4, etc.)
  // For compound (12/8) and asymmetric (7/8) time, respect the beat grouping
  const useSubGrouping = !isCompoundTimeSignature(timeSignature) && !isAsymmetricTimeSignature(timeSignature);

  // Process each beat group
  for (const beatGroupSize of beatGroupingInSixteenths) {
    const groupEndPosition = currentPosition + beatGroupSize;

    // For simple time signatures, beam in sub-groups of 4 sixteenth notes (one quarter note beat)
    // For compound/asymmetric time, beam the entire beat group together
    if (useSubGrouping) {
      // Sub-group into quarter-note-sized beams for simple time
      while (currentPosition < groupEndPosition && currentNoteIndex < notes.length) {
        const subGroupEndPosition = Math.min(currentPosition + 4, groupEndPosition);
        let notesInGroup: StaveNote[] = [];

        // Collect beamable notes for this sub-group
        while (currentNoteIndex < notes.length && currentPosition < subGroupEndPosition) {
          const note = notes[currentNoteIndex];
          const staveNote = staveNotes[currentNoteIndex];

          // Only beam eighth notes and sixteenth notes (including dotted)
          // Exclude rests, quarters, halves, and wholes
          const vexDuration = staveNote.getDuration();
          const isBeamable = note.sound !== 'rest' &&
            (note.duration === 'eighth' || note.duration === 'sixteenth') &&
            (vexDuration === '8' || vexDuration === '8d' || vexDuration === '16' || vexDuration === '16d');

          if (isBeamable) {
            notesInGroup.push(staveNote);
          } else {
            // Hit a non-beamable note (rest, quarter, etc.)
            // Create beam for accumulated notes
            if (notesInGroup.length > 1) {
              try {
                const beam = new Beam(notesInGroup);
                beams.push(beam);
              } catch {
                // Beam creation failed - notes will keep their individual flags
              }
            }
            notesInGroup = []; // Create new array for next sub-group
          }

          currentPosition += note.durationInSixteenths;
          currentNoteIndex++;
        }

        // Add beam for remaining notes in this sub-group
        if (notesInGroup.length > 1) {
          try {
            const beam = new Beam(notesInGroup);
            beams.push(beam);
          } catch {
            // Beam creation failed - notes will keep their individual flags
          }
        }
      }
    } else {
      // For compound/asymmetric time, beam the entire beat group together
      let notesInGroup: StaveNote[] = [];

      while (currentNoteIndex < notes.length && currentPosition < groupEndPosition) {
        const note = notes[currentNoteIndex];
        const staveNote = staveNotes[currentNoteIndex];

        // Only beam eighth notes and sixteenth notes (including dotted)
        // Exclude rests, quarters, halves, and wholes
        const vexDuration = staveNote.getDuration();
        const isBeamable = note.sound !== 'rest' &&
          (note.duration === 'eighth' || note.duration === 'sixteenth') &&
          (vexDuration === '8' || vexDuration === '8d' || vexDuration === '16' || vexDuration === '16d');

        if (isBeamable) {
          notesInGroup.push(staveNote);
        } else {
          // Hit a non-beamable note (rest, quarter, etc.)
          // Create beam for accumulated notes
          if (notesInGroup.length > 1) {
            try {
              const beam = new Beam(notesInGroup);
              beams.push(beam);
            } catch {
              // Beam creation failed - notes will keep their individual flags
            }
          }
          notesInGroup = []; // Create new array for next sub-group
        }

        currentPosition += note.durationInSixteenths;
        currentNoteIndex++;
      }

      // Add beam for remaining notes in this beat group
      if (notesInGroup.length > 1) {
        try {
          const beam = new Beam(notesInGroup);
          beams.push(beam);
        } catch {
          // Beam creation failed - notes will keep their individual flags
        }
      }
    }
  }

  return beams;
}

const VexFlowRenderer: React.FC<VexFlowRendererProps> = ({
  rhythm,
  currentNote,
  metronomeEnabled = false,
  currentMetronomeBeat = null,
  onDropPattern,
  dragDropMode = 'replace',
  notation = '',
  timeSignature,
  selection = null,
  onSelectionChange,
  onMoveSelection,
  onDeleteSelection,
  onRequestPaletteFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const metronomeDotsRef = useRef<Map<string, SVGCircleElement>>(new Map());
  const notePositionsRef = useRef<NotePosition[]>([]);
  // Track simile symbols by measure index for playback highlighting
  const simileGroupsRef = useRef<Map<number, SVGGElement>>(new Map());
  // Track repeat count text elements for highlighting
  const repeatCountTextRefs = useRef<Map<number, SVGTextElement>>(new Map());

  // ARIA live region ref for screen reader announcements
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const allStaveNoteRefsRef = useRef<Array<{
    staveNote: StaveNote;
    stave: Stave;
    measureIndex: number;
    noteIndex: number;
    note: Note;
  }>>([]);

  // Rectangle selection state - using a single ref object for all drag state
  // This prevents issues with stale closures in event handlers
  const dragStateRef = useRef({
    isDrawing: false,
    isDraggingSelection: false,
    startX: 0,
    startY: 0,
    startSvgX: 0,
    startSvgY: 0,
    hasDragged: false,
  });

  // Re-render on window resize to recalculate responsive layout
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Selection rectangle ref for direct DOM manipulation (avoids re-render conflicts with VexFlow)
  const selectionRectRef = useRef<HTMLDivElement | null>(null);

  // Helper to update selection rectangle position (direct DOM manipulation)
  const updateSelectionRect = useCallback((rect: SelectionRect | null) => {
    if (!selectionRectRef.current) return;

    if (rect) {
      const left = Math.min(rect.startX, rect.currentX);
      const top = Math.min(rect.startY, rect.currentY);
      const width = Math.abs(rect.currentX - rect.startX);
      const height = Math.abs(rect.currentY - rect.startY);

      selectionRectRef.current.style.display = width > 2 && height > 2 ? 'block' : 'none';
      selectionRectRef.current.style.left = `${left}px`;
      selectionRectRef.current.style.top = `${top}px`;
      selectionRectRef.current.style.width = `${width}px`;
      selectionRectRef.current.style.height = `${height}px`;
    } else {
      selectionRectRef.current.style.display = 'none';
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current || rhythm.measures.length === 0) {
      return;
    }

    // Clear previous rendering
    containerRef.current.innerHTML = '';
    metronomeDotsRef.current.clear();
    notePositionsRef.current = [];
    simileGroupsRef.current.clear();
    repeatCountTextRefs.current.clear();

    try {
      // Dynamic measure width based on note count
      // Calculate width for each measure based on its note count
      // For long time signatures, allow measures to expand as needed
      const sixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);
      const isLongMeasure = sixteenthsPerMeasure > 32; // More than 8/4 equivalent

      // Fixed width for simile (repeat) measures - compact and consistent
      const SIMILE_MEASURE_WIDTH = 60;

      const calculateMeasureWidth = (measure: typeof rhythm.measures[0], measureIndex: number): number => {
        // Check if this measure is a simile repeat
        const measureRepeatInfo = getMeasureRepeatInfo(measureIndex, rhythm.repeats);
        if (measureRepeatInfo?.isSimile) {
          return SIMILE_MEASURE_WIDTH;
        }

        const baseWidth = 120; // Base width for time signature, barlines, etc.
        // Use smaller width per note for long measures to keep them readable
        const widthPerNote = isLongMeasure ? 20 : 25;
        const minWidth = 200;
        // For long time signatures, don't cap the width - let it expand
        // This ensures notes don't escape or overlap
        const maxWidth = isLongMeasure ? Infinity : 850;

        const calculatedWidth = baseWidth + (measure.notes.length * widthPerNote);
        return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
      };

      // Calculate which measures should be hidden (unrolled section repeats)
      // Visual rendering should only show the first iteration of a section repeat
      const hiddenMeasureIndices = new Set<number>();
      if (rhythm.repeats) {
        rhythm.repeats.forEach(repeat => {
          // FIX Phase 32: Unrolled Section Repeats logic update.
          // repeatCount (from Parser) matches number of GHOST blocks generated.
          // (x3) => Source + 3 Ghosts. Total 4.
          // We must hide ALL ghosts.
          if (repeat.type === 'section' && repeat.repeatCount > 0) {
            const blockLength = repeat.endMeasure - repeat.startMeasure + 1;
            const measuresToHide = blockLength * repeat.repeatCount;
            const startHiddenIndex = repeat.endMeasure + 1;

            for (let i = 0; i < measuresToHide; i++) {
              hiddenMeasureIndices.add(startHiddenIndex + i);
            }
          }
        });
      }

      const measureWidths = rhythm.measures.map((m, i) => calculateMeasureWidth(m, i));

      // Layout measures into lines based on available width
      // Use viewport width minus padding for responsive layout
      const containerPadding = 40; // Account for margins and padding
      const sidebarWidth = 280; // Approximate sidebar width
      // For long measures, use a wider base line width
      const baseMaxLineWidth = Math.max(600, Math.min(1200, windowWidth - sidebarWidth - containerPadding));
      const lineHeight = 100;
      const leftMargin = 10;
      const rightMargin = 10;

      // Group measures into lines
      const lines: number[][] = []; // Array of arrays of measure indices
      let currentLine: number[] = [];
      let currentLineWidth = leftMargin;

      rhythm.measures.forEach((_measure, measureIndex) => {
        // Skip hidden measures
        if (hiddenMeasureIndices.has(measureIndex)) {
          return;
        }

        const measureWidth = measureWidths[measureIndex];
        const currentMeasureRepeatInfo = getMeasureRepeatInfo(measureIndex, rhythm.repeats);

        // For long measures, each one gets its own line
        if (isLongMeasure && measureWidth > baseMaxLineWidth) {
          // If current line has measures, push it first
          if (currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = leftMargin;
          }
          // Put this long measure on its own line
          lines.push([measureIndex]);
        } else if (currentLine.length > 0 && currentLineWidth + measureWidth + rightMargin > baseMaxLineWidth) {
          // If the current measure is a simile, try to keep it on the same line as its predecessor
          // unless it's the very first measure or the line is already empty.
          if (currentMeasureRepeatInfo?.isSimile && currentLine.length > 0) {
            // Add to current line even if it exceeds max width, to keep simile with predecessor
            currentLine.push(measureIndex);
            currentLineWidth += measureWidth;
          } else {
            // Start a new line
            lines.push(currentLine);
            currentLine = [measureIndex];
            currentLineWidth = leftMargin + measureWidth;
          }
        } else {
          // Add to current line
          currentLine.push(measureIndex);
          currentLineWidth += measureWidth;
        }
      });

      // Add the last line
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      // Calculate actual max line width based on content
      // This ensures the SVG is wide enough for long measures
      const maxActualLineWidth = lines.reduce((maxWidth, lineIndices) => {
        const lineWidth = leftMargin + lineIndices.reduce((sum, idx) => sum + measureWidths[idx], 0) + rightMargin;
        return Math.max(maxWidth, lineWidth);
      }, baseMaxLineWidth);

      const numLines = lines.length;
      // Add extra space at bottom for metronome dots (15px)
      const totalHeight = numLines * lineHeight + 40 + (metronomeEnabled ? 15 : 0);
      const totalWidth = Math.max(baseMaxLineWidth, maxActualLineWidth) + 20;

      // Create SVG renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(totalWidth, totalHeight);
      const context = renderer.getContext();

      // Store references to all StaveNotes for later symbol drawing and highlighting
      interface StaveNoteRef {
        staveNote: StaveNote;
        stave: Stave;
        measureIndex: number;
        noteIndex: number;
        note: Note;
      }
      const allStaveNoteRefs: StaveNoteRef[] = [];
      // Clear refs at start of rendering
      allStaveNoteRefsRef.current = [];
      notePositionsRef.current = [];

      // Render each line
      lines.forEach((lineIndices, lineIndex) => {
        let xPosition = leftMargin;
        const yPosition = 40 + lineIndex * lineHeight;

        lineIndices.forEach((measureIndex) => {
          const measure = rhythm.measures[measureIndex];
          const measureWidth = measureWidths[measureIndex];

          // Create a stave for each measure with 5 lines (standard staff)
          const stave = new Stave(xPosition, yPosition, measureWidth, { numLines: 5 });

          // Add time signature to first measure only
          if (measureIndex === 0) {
            stave.addTimeSignature(`${rhythm.timeSignature.numerator}/${rhythm.timeSignature.denominator}`);
          }

          // Check for section repeat barlines
          const sectionRepeatStart = isSectionRepeatStart(measureIndex, rhythm.repeats);
          const sectionRepeatEnd = isSectionRepeatEnd(measureIndex, rhythm.repeats);

          // Add repeat begin barline if this is the start of a section repeat
          if (sectionRepeatStart) {
            stave.setBegBarType(BarlineType.REPEAT_BEGIN);
          }

          // Add repeat end barline if this is the end of a section repeat
          if (sectionRepeatEnd) {
            stave.setEndBarType(BarlineType.REPEAT_END);
          } else if (measureIndex === rhythm.measures.length - 1) {
            // Default: Add doubl line at the end
            stave.setEndBarType(BarlineType.END);
          }

          stave.setContext(context).draw();

          // Add "Play Nx" text above repeat end barlines
          if (sectionRepeatEnd && sectionRepeatEnd.repeatCount > 1) {
            const svgElement = containerRef.current?.querySelector('svg');
            if (svgElement) {
              const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              const staveEndX = xPosition + measureWidth;
              // Position for readability - slightly inside the measure end
              const textX = staveEndX - 5;
              // Position vertically centered or slightly above staff
              // yPosition is top line. yPosition + 40 is bottom line.
              // yPosition + 25 is center.
              // Position ABOVE the staff to avoid note collisions
              const textY = yPosition - 10;

              textElement.setAttribute('x', String(textX));
              textElement.setAttribute('y', String(textY));
              textElement.setAttribute('font-family', 'Arial, sans-serif');
              textElement.setAttribute('font-size', '16'); // Larger, clearer
              textElement.setAttribute('font-weight', 'bold');
              textElement.setAttribute('fill', '#000000'); // Default to black (not purple)
              textElement.setAttribute('text-anchor', 'end'); // Align to right (barline)
              textElement.setAttribute('dominant-baseline', 'middle');
              textElement.setAttribute('class', 'repeat-count-text'); // Class for highlighting
              textElement.setAttribute('data-measure-index', String(measureIndex)); // ID for highlighting
              textElement.textContent = `${sectionRepeatEnd.repeatCount}x`;
              svgElement.appendChild(textElement);
              repeatCountTextRefs.current.set(measureIndex, textElement); // Store ref for highlighting

              // Add progress indicator (Dots or Text Counter)
              const useTextCounter = sectionRepeatEnd.repeatCount > 6;
              const dotsY = textY + 10;

              if (useTextCounter) {
                // Render "(1)" placeholder
                const counterText1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                counterText1.setAttribute('x', String(textX)); // Align with "Nx"
                counterText1.setAttribute('y', String(dotsY + 6)); // More margin below "Nx"
                counterText1.setAttribute('font-family', 'Arial, sans-serif');
                counterText1.setAttribute('font-size', '10px');
                counterText1.setAttribute('font-weight', 'bold');
                counterText1.setAttribute('fill', '#999'); // Subtle color
                counterText1.setAttribute('text-anchor', 'end'); // Right align
                counterText1.setAttribute('class', 'repeat-counter'); // Identify for updates
                counterText1.textContent = ''; // Hidden initially (only show during playback)

                const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                dotsGroup.setAttribute('class', 'repeat-dots-group');
                dotsGroup.setAttribute('data-measure-index', String(measureIndex));
                dotsGroup.appendChild(counterText1);
                svgElement.appendChild(dotsGroup);
              } else {
                // Render Dots
                const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                dotsGroup.setAttribute('class', 'repeat-dots-group');
                dotsGroup.setAttribute('data-measure-index', String(measureIndex));

                // Position dots to the LEFT of the "Nx" text (since text is right-aligned)
                // textX is the right edge.
                const dotSpacing = 7;
                const totalDotsWidth = (sectionRepeatEnd.repeatCount - 1) * dotSpacing;
                // Start from textX and go left
                const startDotX = textX - totalDotsWidth;

                for (let i = 0; i < sectionRepeatEnd.repeatCount; i++) {
                  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                  dot.setAttribute('cx', String(startDotX + (i * dotSpacing)));
                  dot.setAttribute('cy', String(dotsY));
                  dot.setAttribute('r', '2');
                  dot.setAttribute('fill', '#000000');
                  dot.setAttribute('class', 'repeat-dot');
                  dot.setAttribute('data-index', String(i + 1));
                  dotsGroup.appendChild(dot);
                }
                svgElement.appendChild(dotsGroup);
              }
            }
          }

          // Add measure number above the stave using SVG text element (left-aligned)
          if (rhythm.measures.length > 3) {
            const svgElement = containerRef.current?.querySelector('svg');
            if (svgElement) {
              const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              textElement.setAttribute('x', String(xPosition));
              textElement.setAttribute('y', String(yPosition + 15));
              textElement.setAttribute('font-family', 'Arial');
              textElement.setAttribute('font-size', '10');
              textElement.setAttribute('fill', '#666');
              textElement.setAttribute('text-anchor', 'start');
              textElement.setAttribute('dominant-baseline', 'baseline');
              textElement.textContent = `${measureIndex + 1}`;
              svgElement.appendChild(textElement);
            }
          }

          // Check if this measure should be rendered as a simile (% symbol)
          const measureRepeatInfo = getMeasureRepeatInfo(measureIndex, rhythm.repeats);

          if (measureRepeatInfo?.isSimile) {
            const svgElement = containerRef.current?.querySelector('svg');
            if (svgElement) {
              const simileGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              simileGroup.setAttribute('class', 'vf-simile');
              simileGroup.setAttribute('data-measure-index', String(measureIndex));
              simileGroup.setAttribute('data-source-measure', String(measureRepeatInfo.sourceMeasure));

              const centerX = xPosition + measureWidth / 2;
              const middleLineY = stave.getYForLine(3);
              const dotRadius = 3.5;
              const spreadX = 8;
              const spreadY = 10;

              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', String(centerX - 12));
              line.setAttribute('y1', String(middleLineY + 12));
              line.setAttribute('x2', String(centerX + 12));
              line.setAttribute('y2', String(middleLineY - 12));
              line.setAttribute('stroke', '#1f2937');
              line.setAttribute('stroke-width', '3');
              line.setAttribute('stroke-linecap', 'butt');
              line.setAttribute('class', 'simile-line');
              simileGroup.appendChild(line);

              const topDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              topDot.setAttribute('cx', String(centerX - spreadX));
              topDot.setAttribute('cy', String(middleLineY - spreadY + 3));
              topDot.setAttribute('r', String(dotRadius));
              topDot.setAttribute('fill', '#1f2937');
              topDot.setAttribute('class', 'simile-dot');
              simileGroup.appendChild(topDot);

              const bottomDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              bottomDot.setAttribute('cx', String(centerX + spreadX));
              bottomDot.setAttribute('cy', String(middleLineY + spreadY - 3));
              bottomDot.setAttribute('r', String(dotRadius));
              bottomDot.setAttribute('fill', '#1f2937');
              bottomDot.setAttribute('class', 'simile-dot');
              simileGroup.appendChild(bottomDot);

              svgElement.appendChild(simileGroup);
              simileGroupsRef.current.set(measureIndex, simileGroup);
            }
            xPosition += measureWidth;
            return;
          }

          // Convert measure notes to VexFlow StaveNotes
          const staveNotes = measure.notes.map((note: Note, noteIndex: number) => {
            let duration = DURATION_MAP[note.duration] || 'q';
            const pitch = SOUND_TO_PITCH[note.sound];

            const isRest = note.sound === 'rest';

            if (note.isDotted) {
              duration += 'd';
            }

            if (isRest) {
              duration += 'r';
            }

            const staveNote = new StaveNote({
              keys: [pitch],
              duration: duration,
              clef: 'percussion',
              autoStem: false,
            });

            const isWholeNote = note.duration === 'whole' || duration === 'w' || duration === 'wr';
            if (isRest || isWholeNote) {
              staveNote.setStemDirection(0);
              try {
                staveNote.setStemStyle({ strokeStyle: 'none' });
              } catch {
                // Ignore
              }
            } else {
              staveNote.setStemDirection(1);
            }

            if (note.isDotted) {
              Dot.buildAndAttach([staveNote], { all: true });
            }

            const ref = {
              staveNote,
              stave,
              measureIndex,
              noteIndex,
              note,
            };
            allStaveNoteRefs.push(ref);
            allStaveNoteRefsRef.current.push(ref);

            return staveNote;
          });

          if (staveNotes.length > 0) {
            const beatsPerMeasure = rhythm.timeSignature.numerator;
            const beatValue = rhythm.timeSignature.denominator;

            const voice = new Voice({
              numBeats: beatsPerMeasure,
              beatValue: beatValue,
            });

            voice.setStrict(false);
            voice.addTickables(staveNotes);

            const beams = createBeamsFromBeatGroups(
              staveNotes,
              measure.notes,
              rhythm.timeSignature
            );

            const formatter = new Formatter();
            formatter.joinVoices([voice]).format([voice], measureWidth - 60);

            voice.draw(context, stave);

            staveNotes.forEach((note, noteIndex) => {
              const originalNote = measure.notes[noteIndex];
              const isRest = originalNote.sound === 'rest';
              const noteDuration = note.getDuration();
              const isWholeNote = originalNote.duration === 'whole' || noteDuration === 'w' || noteDuration === 'wr';

              if (isRest || isWholeNote) {
                const svgEl = note.getSVGElement();
                if (svgEl) {
                  const stemEls = svgEl.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"], .stem, [class*="stem"]');
                  stemEls.forEach((el) => el.remove());
                }
              }
            });

            staveNotes.forEach((note, noteIndex) => {
              const originalNote = measure.notes[noteIndex];
              const isRest = originalNote.sound === 'rest';
              const noteDuration = note.getDuration();
              const isWholeNote = originalNote.duration === 'whole' || noteDuration === 'w' || noteDuration === 'wr';

              if (isRest || isWholeNote) {
                return;
              }

              const stem = note.getStem();
              if (stem) {
                const svgEl = note.getSVGElement();
                const stemEls = svgEl?.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"]');

                if (!stemEls || stemEls.length === 0) {
                  try {
                    stem.setContext(context).draw();
                  } catch {
                    // Ignore
                  }
                }
              }
            });

            const successfullyBeamedNotes = new Set<StaveNote>();
            beams.forEach((beam) => {
              try {
                beam.setContext(context).draw();
                const beamNotes = beam.getNotes() as StaveNote[];
                beamNotes.forEach(note => successfullyBeamedNotes.add(note as StaveNote));
              } catch {
                // Ignore
              }
            });

            if (containerRef.current && successfullyBeamedNotes.size > 0) {
              const svg = containerRef.current.querySelector('svg');
              if (svg) {
                successfullyBeamedNotes.forEach(note => {
                  const svgElement = note.getSVGElement();
                  if (svgElement) {
                    const flagSelectors = [
                      '.vf-flag',
                      'path[class*="flag"]',
                      'g[class*="flag"]',
                      '[class*="vf-flag"]'
                    ];

                    flagSelectors.forEach(selector => {
                      const flags = svgElement.querySelectorAll(selector);
                      flags.forEach(flag => {
                        const classList = (flag as SVGElement).getAttribute('class') || '';
                        if (!classList.includes('stem')) {
                          flag.remove();
                        }
                      });
                    });
                  }
                });
              }
            }
          }

          xPosition += measureWidth;
        });
      });

      if (notation && timeSignature) {
        notePositionsRef.current = [];

        let globalCharPosition = 0;
        const measureStartCharPositions: Record<number, number> = {};
        // Use pre-calculated map from parser, or empty if missing
        const measureSourceMapping = rhythm.measureSourceMapping || {};

        const tempPositions: Array<{
          measureIndex: number;
          noteIndex: number;
          x: number;
          y: number;
          width: number;
          height: number;
          charPosition: number;
          durationInSixteenths: number;
          staveY: number;
          isTiedFrom?: boolean;
          isTiedTo?: boolean;
        }> = [];

        rhythm.measures.forEach((_measure, measureIndex) => {
          // Record start of CURRENT measure
          // If this measure is a literal part of the source string (not a ghost/expanded repeat),
          // we use the current accumulated position.
          // If it is a ghost/repeat, we map it to its source's position visually,
          // but we DO NOT advance the global 'compressed' position pointer.

          let effectiveStart = globalCharPosition;

          // Check if this measure is a repeated instance (ghost)
          const isRepeatInstance = measureSourceMapping[measureIndex] !== undefined && measureSourceMapping[measureIndex] !== measureIndex;

          if (isRepeatInstance) {
            // It's a ghost. Map to source.
            const sourceIdx = measureSourceMapping[measureIndex];
            if (measureStartCharPositions[sourceIdx] !== undefined) {
              effectiveStart = measureStartCharPositions[sourceIdx];
            }
            // Do NOT update globalCharPosition for this measure's duration, 
            // because it doesn't exist in the compressed string.
          } else {
            // It is a real source measure.
            measureStartCharPositions[measureIndex] = globalCharPosition;
            // We WILL update globalCharPosition after processing.
          }

          // If hidden, just skip visual targets
          if (hiddenMeasureIndices.has(measureIndex)) {
            // If it's a source measure that's hidden (unlikely given logic, but possible with section parsing),
            // we still need to advance global time if it's source.
            // But usually hidden measures are unrolled repeats (ghosts).
            // Let's assume hidden measures are handled like ghosts if they are repeats.
            // If NOT a repeat instance, we must advance.
            if (!isRepeatInstance) {
              const measureDuration = _measure.notes.reduce((sum, n) => sum + (n.durationInSixteenths || 0), 0);
              globalCharPosition += measureDuration;
            }
            return;
          }

          const measureRefs = allStaveNoteRefsRef.current
            .filter(ref => ref.measureIndex === measureIndex)
            .sort((a, b) => a.noteIndex - b.noteIndex);

          let localOffset = 0;

          measureRefs.forEach((ref, refIndex) => {
            const durationInSixteenths = ref.note.durationInSixteenths || 1;

            try {
              const bounds = ref.staveNote.getBoundingBox();
              if (bounds) {
                const noteX = bounds.getX();
                const noteHeight = bounds.getH();

                let timeProportionalWidth: number;

                if (refIndex < measureRefs.length - 1) {
                  const nextBounds = measureRefs[refIndex + 1].staveNote.getBoundingBox();
                  if (nextBounds) {
                    timeProportionalWidth = nextBounds.getX() - noteX;
                  } else {
                    timeProportionalWidth = bounds.getW();
                  }
                } else {
                  const staveWidth = ref.stave.getWidth();
                  const staveX = ref.stave.getX();
                  const measureEndX = staveX + staveWidth - 20;
                  timeProportionalWidth = Math.max(bounds.getW(), measureEndX - noteX);
                }

                const staveY = ref.stave.getY();
                const noteY = bounds.getY();

                tempPositions.push({
                  measureIndex: ref.measureIndex,
                  noteIndex: ref.noteIndex,
                  x: noteX,
                  y: noteY,
                  width: timeProportionalWidth,
                  height: noteHeight,
                  charPosition: effectiveStart + localOffset,
                  durationInSixteenths: durationInSixteenths,
                  staveY: staveY,
                  isTiedFrom: ref.note.isTiedFrom,
                  isTiedTo: ref.note.isTiedTo,
                });
              }
            } catch (error) {
              console.error('Error getting bounds for note after rendering:', ref.measureIndex, ref.noteIndex, error);
            }

            localOffset += durationInSixteenths;
          });

          // Fix for Drop Mismatch (Phase 15/18):
          // VexFlowRenderer calculates "charPosition" (logical ticks) by summing note durations.
          // We must force alignment to the full measure duration defined by TimeSignature.
          // This must apply to ALL measures (including Repeats/Ghosts) so globalCharPosition
          // tracks strict Logical Time, ensuring selection targets correct tick.
          const sixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);

          // However, we should check if we should effectively wrap or pad
          // Usually, standard measures imply full duration padding.
          const effectiveDuration = Math.max(
            _measure.notes.reduce((sum, n) => sum + (n.durationInSixteenths || 0), 0),
            sixteenthsPerMeasure
          );

          globalCharPosition += effectiveDuration;
        });

        for (let i = 0; i < tempPositions.length; i++) {
          const pos = tempPositions[i];
          let groupStart = pos.charPosition;
          let groupEnd = pos.charPosition + pos.durationInSixteenths;

          if (pos.isTiedFrom) {
            for (let j = i - 1; j >= 0; j--) {
              const prevPos = tempPositions[j];
              groupStart = prevPos.charPosition;
              if (!prevPos.isTiedFrom) break;
            }
          }

          if (pos.isTiedTo) {
            for (let j = i + 1; j < tempPositions.length; j++) {
              const nextPos = tempPositions[j];
              groupEnd = nextPos.charPosition + nextPos.durationInSixteenths;
              if (!nextPos.isTiedTo) break;
            }
          }

          notePositionsRef.current.push({
            ...pos,
            tiedGroupStart: (pos.isTiedFrom || pos.isTiedTo) ? groupStart : undefined,
            tiedGroupEnd: (pos.isTiedFrom || pos.isTiedTo) ? groupEnd : undefined,
          });
        }
      }

      // Draw custom symbols and highlighting using stored StaveNote references
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement) {
        // First, check if we're playing a simile measure and determine source measure highlighting
        let sourceMeasureToHighlight: number | null = null;
        let sourceNoteIndex: number | null = null;

        // Reset all repeat counters (hide them when not active)
        const allCounters = svgElement.querySelectorAll('.repeat-counter');
        allCounters.forEach(c => c.textContent = '');

        // HIGHLIGHTING LOGIC FOR REPEATS AND SIMILES
        if (currentNote) {

          // 1. Handle Section Repeat Dots Highlighting
          // Logic: If we are INSIDE a section repeat, we need to highlight the dots at the END of the section.
          // The `currentNote.repeatIteration` tells us which iteration we are on.

          let repeatEndMeasureIndex = -1;

          // Check if current measure is part of a section repeat
          // Iterate through all repeats to find one that contains the current measure
          if (rhythm.repeats) {
            for (const repeat of rhythm.repeats) {
              if (repeat.type === 'section' &&
                currentNote.measureIndex >= repeat.startMeasure &&
                currentNote.measureIndex <= repeat.endMeasure) {
                repeatEndMeasureIndex = repeat.endMeasure;
                break; // found the container section
              }
            }
          }

          // If we found a containing section, update the indicator at the end of it
          if (repeatEndMeasureIndex !== -1 && currentNote.repeatIteration !== undefined) {
            const repeatDotsGroup = svgElement.querySelector(`.repeat-dots-group[data-measure-index="${repeatEndMeasureIndex}"]`);

            if (repeatDotsGroup) {
              const textCounter = repeatDotsGroup.querySelector('.repeat-counter');
              if (textCounter) {
                textCounter.textContent = `(${currentNote.repeatIteration + 1})`;
                textCounter.setAttribute('fill', '#ef4444');
                (textCounter as SVGElement).style.fill = '#ef4444'; // Force via style also
              } else {
                const dots = repeatDotsGroup.querySelectorAll('.repeat-dot');
                dots.forEach((dot) => {
                  const index = parseInt(dot.getAttribute('data-index') || '0');
                  const dotEl = dot as SVGElement;
                  if (index <= currentNote.repeatIteration!) {
                    dotEl.setAttribute('fill', '#ef4444');
                  } else {
                    dotEl.setAttribute('fill', '#000000');
                  }
                });
              }
            }


          }


          const currentMeasureRepeatInfo = getMeasureRepeatInfo(currentNote.measureIndex, rhythm.repeats);
          if (currentMeasureRepeatInfo?.isSimile) {
            // This is a simile measure - highlight both the simile symbol AND the source note
            sourceMeasureToHighlight = currentMeasureRepeatInfo.sourceMeasure;
            sourceNoteIndex = currentNote.noteIndex;

            // Highlight the simile symbol
            const simileGroup = simileGroupsRef.current.get(currentNote.measureIndex);
            if (simileGroup) {
              // Highlight dots
              simileGroup.querySelectorAll('.simile-dot').forEach((dot) => {
                const el = dot as SVGElement;
                el.setAttribute('fill', '#ef4444');
                el.style.fill = '#ef4444'; // Reinforce with style
              });
              // Highlight line
              simileGroup.querySelectorAll('.simile-line').forEach((line) => {
                const el = line as SVGElement;
                el.setAttribute('stroke', '#ef4444');
                el.style.stroke = '#ef4444'; // Reinforce with style
              });
            }
          }
        }

        allStaveNoteRefs.forEach(({ staveNote, stave, measureIndex, noteIndex, note }) => {
          // Highlight current note with red
          // Also highlight source note when playing a simile measure
          const isCurrentNote = currentNote &&
            currentNote.measureIndex === measureIndex &&
            currentNote.noteIndex === noteIndex;

          const isSourceNote = sourceMeasureToHighlight !== null &&
            measureIndex === sourceMeasureToHighlight &&
            noteIndex === sourceNoteIndex;

          if (isCurrentNote || isSourceNote) {
            // Highlight the notehead in red
            const noteheadElements = staveNote.getSVGElement()?.querySelectorAll('.vf-notehead, path[class*="notehead"], ellipse[class*="notehead"]');
            noteheadElements?.forEach((el) => {
              (el as SVGElement).style.fill = '#ef4444';
              (el as SVGElement).style.stroke = '#ef4444';
            });

            // Highlight the stem in red
            const stemElements = staveNote.getSVGElement()?.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"]');
            stemElements?.forEach((el) => {
              (el as SVGElement).style.stroke = '#ef4444';
            });
          }

          if (note && note.sound !== 'rest') {
            // Get the note's x position using VexFlow's API
            const noteX = staveNote.getAbsoluteX() + 10; // Center offset
            const noteY = stave.getYForLine(2); // Middle line

            // Draw custom drum symbol using shared utility
            drawDrumSymbol(svgElement, noteX, noteY, note.sound);
          }
        });
      }

      // Draw ties for notes that span measure boundaries
      // Use clean SVG paths for proper tie rendering
      for (let i = 0; i < allStaveNoteRefs.length - 1; i++) {
        const currentRef = allStaveNoteRefs[i];
        const nextRef = allStaveNoteRefs[i + 1];

        // Check if current note is tied to the next, and neither is a rest
        if (currentRef.note.isTiedTo && nextRef.note.isTiedFrom &&
          currentRef.note.sound !== 'rest' && nextRef.note.sound !== 'rest') {
          const isConsecutive =
            (nextRef.measureIndex === currentRef.measureIndex && nextRef.noteIndex === currentRef.noteIndex + 1) ||
            (nextRef.measureIndex === currentRef.measureIndex + 1 && nextRef.noteIndex === 0 &&
              currentRef.noteIndex === rhythm.measures[currentRef.measureIndex].notes.length - 1);

          if (isConsecutive && svgElement) {
            try {
              const sameStaveLine = currentRef.stave.getY() === nextRef.stave.getY();
              const firstX = currentRef.staveNote.getAbsoluteX() + 12;
              const noteY = currentRef.stave.getYForLine(4) + 5; // Below staff area

              if (sameStaveLine) {
                // Same line: draw a clean bezier tie curve
                const secondX = nextRef.staveNote.getAbsoluteX() - 2;
                const distance = secondX - firstX;
                const curveHeight = Math.min(18, Math.max(12, distance * 0.15));
                const controlX1 = firstX + distance * 0.3;
                const controlX2 = firstX + distance * 0.7;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // Use cubic bezier for smoother curve
                path.setAttribute('d', `M ${firstX} ${noteY} C ${controlX1} ${noteY + curveHeight}, ${controlX2} ${noteY + curveHeight}, ${secondX} ${noteY}`);
                path.setAttribute('stroke', '#000');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('class', 'tie-curve');
                svgElement.appendChild(path);
              } else {
                // Cross-line tie: draw simple curved strokes like standard music notation
                // Both curves should curve DOWNWARD (same direction as normal ties)
                // The continuation "head" should be very short and positioned slightly offset
                // to minimize visual conflict with same-line ties

                // First note: tie extending from note toward the right edge
                const staveWidth = currentRef.stave.getWidth();
                const staveX = currentRef.stave.getX();
                const tailEndX = Math.min(firstX + 35, staveX + staveWidth - 15);
                const tailCurveHeight = 10;

                const tailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const tailMidX = (firstX + tailEndX) / 2;
                tailPath.setAttribute('d',
                  `M ${firstX} ${noteY} Q ${tailMidX} ${noteY + tailCurveHeight}, ${tailEndX} ${noteY + 2}`
                );
                tailPath.setAttribute('stroke', '#000');
                tailPath.setAttribute('stroke-width', '2');
                tailPath.setAttribute('fill', 'none');
                tailPath.setAttribute('stroke-linecap', 'round');
                tailPath.setAttribute('class', 'tie-curve cross-line-tie-tail');
                svgElement.appendChild(tailPath);

                // Second note: short tie coming into the note from the left
                // Curves DOWNWARD like normal ties, but very short (15px)
                // Positioned slightly higher than same-line ties to reduce overlap
                const secondX = nextRef.staveNote.getAbsoluteX() - 2;
                const headStartX = secondX - 15; // Very short - only 15px
                const nextNoteY = nextRef.stave.getYForLine(4) + 3; // Slightly higher
                const headCurveHeight = 6; // Small curve

                const headPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // Curve DOWNWARD like normal ties
                headPath.setAttribute('d',
                  `M ${headStartX} ${nextNoteY + 1} Q ${(headStartX + secondX) / 2} ${nextNoteY + headCurveHeight}, ${secondX} ${nextNoteY}`
                );
                headPath.setAttribute('stroke', '#000');
                headPath.setAttribute('stroke-width', '2');
                headPath.setAttribute('fill', 'none');
                headPath.setAttribute('stroke-linecap', 'round');
                headPath.setAttribute('class', 'tie-curve cross-line-tie-head');
                svgElement.appendChild(headPath);
              }
            } catch (error) {
              console.error('Error drawing tie:', error);
            }
          }
        }
      }

      // Draw selection highlighting as continuous boxes per stave line
      if (selection && selection.startCharPosition !== null && selection.endCharPosition !== null && svgElement) {
        const { startCharPosition, endCharPosition } = selection;

        // Group selected notes by stave line (Y position)
        const selectedNotesByLine: Map<number, { minX: number; maxX: number; staveY: number }> = new Map();

        // Track running position to match notes to selection
        allStaveNoteRefs.forEach(({ staveNote, stave }, index) => {
          // Use pre-calculated note position from notePositionsRef (Phase 6 compliant)
          // Ensure we have position data for this index
          if (!notePositionsRef.current[index]) return;

          const posData = notePositionsRef.current[index];
          const noteCharPosition = posData.charPosition;
          const noteEndPosition = noteCharPosition + posData.durationInSixteenths;

          // Check if note overlaps with selection
          if (noteCharPosition < endCharPosition && noteEndPosition > startCharPosition) {
            try {
              const bounds = staveNote.getBoundingBox();
              if (bounds) {
                const staveY = stave.getY();
                const existing = selectedNotesByLine.get(staveY);
                if (existing) {
                  existing.minX = Math.min(existing.minX, bounds.getX());
                  existing.maxX = Math.max(existing.maxX, bounds.getX() + bounds.getW());
                } else {
                  selectedNotesByLine.set(staveY, {
                    minX: bounds.getX(),
                    maxX: bounds.getX() + bounds.getW(),
                    staveY,
                  });
                }
              }
            } catch {
              // Skip notes that can't be measured
            }
          }
        });

        // Draw continuous highlight boxes for each stave line with high visibility
        selectedNotesByLine.forEach(({ minX, maxX, staveY }) => {
          const highlightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

          // Use smaller padding to avoid bleeding into adjacent notes
          // Scale padding based on selection width - narrower selections get tighter padding
          const selectionWidth = maxX - minX;
          const padding = Math.min(4, selectionWidth * 0.1); // Max 4px, or 10% of width

          highlightRect.setAttribute('x', String(minX - padding));
          highlightRect.setAttribute('y', String(staveY + 15)); // Slightly lower to better frame notes
          highlightRect.setAttribute('width', String(selectionWidth + padding * 2));
          highlightRect.setAttribute('height', String(75)); // Slightly shorter
          highlightRect.setAttribute('fill', 'rgba(147, 51, 234, 0.15)'); // Slightly more subtle fill
          highlightRect.setAttribute('stroke', '#9333ea'); // Solid purple border
          highlightRect.setAttribute('stroke-width', '2');
          highlightRect.setAttribute('rx', '4');
          highlightRect.setAttribute('ry', '4');
          highlightRect.setAttribute('class', 'selection-highlight');
          highlightRect.setAttribute('pointer-events', 'none');

          // Insert at the beginning so it appears behind notes
          if (svgElement.firstChild) {
            svgElement.insertBefore(highlightRect, svgElement.firstChild);
          } else {
            svgElement.appendChild(highlightRect);
          }
        });
      }

      // Draw metronome dots if enabled
      if (metronomeEnabled) {
        // Get beat grouping for this time signature
        const beatGrouping = getDefaultBeatGrouping(rhythm.timeSignature);

        // Convert beat grouping to sixteenths
        const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, rhythm.timeSignature);

        // Draw dots for ALL beat group positions, not just where notes exist
        rhythm.measures.forEach((_measure, measureIndex) => {
          // Find the stave for this measure
          const measureRefs = allStaveNoteRefs.filter(ref => ref.measureIndex === measureIndex);
          if (measureRefs.length === 0) return;

          // Sort by noteIndex to ensure correct order
          measureRefs.sort((a, b) => a.noteIndex - b.noteIndex);

          const stave = measureRefs[0].stave;

          // Calculate all beat group positions for this measure (in sixteenths)
          const beatPositions = [0]; // Start with downbeat
          let cumulativePosition = 0;
          const localSixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);
          beatGroupingInSixteenths.forEach((groupSize) => {
            cumulativePosition += groupSize;
            if (cumulativePosition < localSixteenthsPerMeasure) {
              beatPositions.push(cumulativePosition);
            }
          });

          // For each beat position, calculate X coordinate using note-based positioning
          // This ensures dots align with actual rendered notes regardless of measure length
          beatPositions.forEach((beatPosition) => {
            let dotX: number = 0;

            // Find the note that contains this beat position
            let cumulativeNotePosition = 0;
            let found = false;

            for (let i = 0; i < measureRefs.length; i++) {
              const ref = measureRefs[i];
              const noteStartPosition = cumulativeNotePosition;
              const noteEndPosition = cumulativeNotePosition + ref.note.durationInSixteenths;

              // Check if this beat position falls within this note
              if (beatPosition >= noteStartPosition && beatPosition < noteEndPosition) {
                // Beat is within this note - calculate proportional X position
                const progressWithinNote = (beatPosition - noteStartPosition) / ref.note.durationInSixteenths;
                const noteX = ref.staveNote.getAbsoluteX();

                if (progressWithinNote === 0) {
                  // Beat is at the start of this note
                  dotX = noteX;
                } else {
                  // Beat is partway through this note - interpolate to next note
                  const nextX = i < measureRefs.length - 1
                    ? measureRefs[i + 1].staveNote.getAbsoluteX()
                    : noteX + 40; // Estimate if no next note
                  dotX = noteX + (nextX - noteX) * progressWithinNote;
                }
                found = true;
                break;
              }

              cumulativeNotePosition = noteEndPosition;
            }

            // If beat position wasn't found within any note (shouldn't happen normally),
            // use the first note's X position as fallback
            if (!found) {
              dotX = measureRefs[0].staveNote.getAbsoluteX();
            }

            const dotY = stave.getYForLine(5) + 8; // Closer to the bottom of the staff

            // Create unique ID for this dot based on measure and position
            const dotId = `metronome-dot-${measureIndex}-${beatPosition}`;

            // Create new dot
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle') as SVGCircleElement;
            circle.setAttribute('id', dotId);
            circle.setAttribute('cx', dotX.toString());
            circle.setAttribute('cy', dotY.toString());
            circle.setAttribute('class', 'metronome-dot');
            circle.setAttribute('data-measure', measureIndex.toString());
            circle.setAttribute('data-position', beatPosition.toString());
            circle.setAttribute('r', '4'); // Smaller dots (was 5)
            circle.setAttribute('fill', '#6b7280'); // Dark grey - use setAttribute for SVG
            circle.setAttribute('stroke', 'none');
            circle.setAttribute('stroke-width', '0');
            if (svgElement) {
              svgElement.appendChild(circle);
            }

            // Store reference to this dot
            metronomeDotsRef.current.set(dotId, circle);
          });
        });
      }
    } catch (error) {
      console.error('Error rendering VexFlow notation:', error);
    }
    // Preview rendering is handled in a separate useEffect below
    // Note: notation, timeSignature, and onDropPattern are used for drag/drop but don't need to trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rhythm, currentNote, metronomeEnabled, windowWidth, selection]);

  // Separate effect to update metronome dot highlighting
  useEffect(() => {
    if (!metronomeEnabled || metronomeDotsRef.current.size === 0) return;

    // Reset all dots to inactive state (dark grey)
    metronomeDotsRef.current.forEach((circle) => {
      circle.setAttribute('fill', '#6b7280'); // Use setAttribute instead of style for SVG
      circle.setAttribute('stroke', 'none');
      circle.setAttribute('stroke-width', '0');
    });

    // Highlight the current beat if it exists
    if (currentMetronomeBeat) {
      const { measureIndex, positionInSixteenths } = currentMetronomeBeat;

      // Find the dot at this position
      const dotId = `metronome-dot-${measureIndex}-${positionInSixteenths}`;
      const circle = metronomeDotsRef.current.get(dotId);

      if (circle) {
        circle.setAttribute('fill', '#ef4444'); // Red
        circle.setAttribute('stroke', '#dc2626');
        circle.setAttribute('stroke-width', '1');
      }
    }
  }, [currentMetronomeBeat, metronomeEnabled, rhythm.measures]);

  // Click-to-select functionality (desktop-style rectangle selection)
  // Using React event handlers on the container for reliability
  const handleContainerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only

    const container = containerRef.current;
    const svg = container?.querySelector('svg');
    if (!container || !svg) return;

    // Focus the container for keyboard navigation
    // This ensures keyboard controls work immediately after clicking a note
    container.focus();

    e.preventDefault();

    const state = dragStateRef.current;

    const clientToContainer = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return {
        x: clientX - rect.left + container.scrollLeft,
        y: clientY - rect.top + container.scrollTop,
      };
    };

    const clientToSvg = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const containerCoords = clientToContainer(e.clientX, e.clientY);
    const svgCoords = clientToSvg(e.clientX, e.clientY);

    // Find clicked note using distance-based selection
    const clickedNote = findClickedNote(svgCoords.x, svgCoords.y, notePositionsRef.current);

    // Check if clicking within existing selection (for drag-to-move)
    // Use tied group bounds if available
    const noteStart = clickedNote?.tiedGroupStart ?? clickedNote?.charPosition ?? 0;
    const noteEnd = clickedNote?.tiedGroupEnd ?? (clickedNote ? clickedNote.charPosition + clickedNote.durationInSixteenths : 0);

    if (clickedNote && selection && selection.startCharPosition !== null && selection.endCharPosition !== null &&
      noteStart >= selection.startCharPosition &&
      noteEnd <= selection.endCharPosition && onMoveSelection) {
      state.isDraggingSelection = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.hasDragged = false;
      return;
    }

    // Shift-click extends selection (expand to include tied groups)
    if (clickedNote && e.shiftKey && selection && selection.startCharPosition !== null) {
      const newStart = Math.min(selection.startCharPosition, noteStart);
      const newEnd = Math.max(selection.endCharPosition || selection.startCharPosition, noteEnd);
      if (onSelectionChange) {
        onSelectionChange(newStart, newEnd, newEnd - newStart);
      }
      return;
    }

    // Start rectangle selection
    state.isDrawing = true;
    state.startX = containerCoords.x;
    state.startY = containerCoords.y;
    state.startSvgX = svgCoords.x;
    state.startSvgY = svgCoords.y;
    state.hasDragged = false;

    // Clear previous selection
    if (onSelectionChange) {
      onSelectionChange(null, null, 0);
    }
  }, [selection, onSelectionChange, onMoveSelection]);

  // Global mouse move handler for rectangle drawing
  useEffect(() => {
    const state = dragStateRef.current;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!state.isDrawing && !state.isDraggingSelection) return;

      const container = containerRef.current;
      const svg = container?.querySelector('svg');
      if (!container || !svg) return;

      const clientToContainer = (clientX: number, clientY: number) => ({
        x: clientX - container.getBoundingClientRect().left + container.scrollLeft,
        y: clientY - container.getBoundingClientRect().top + container.scrollTop,
      });

      const clientToSvg = (clientX: number, clientY: number) => ({
        x: clientX - svg.getBoundingClientRect().left,
        y: clientY - svg.getBoundingClientRect().top,
      });

      // Handle selection move
      if (state.isDraggingSelection && !state.hasDragged) {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          state.hasDragged = true;
          container.style.cursor = 'grabbing';
        }
      }

      if (state.isDraggingSelection && state.hasDragged) {
        // Show insertion preview using findDropTarget for consistent positioning
        const svgCoords = clientToSvg(e.clientX, e.clientY);
        svg.querySelectorAll('.drag-preview').forEach(el => el.remove());

        const dropTarget = findDropTarget(svgCoords.x, svgCoords.y, notePositionsRef.current);

        if (dropTarget && selection && selection.startCharPosition !== null && selection.endCharPosition !== null) {
          const exactPos = dropTarget.exactCharPosition;

          // Only show preview if target is outside the current selection
          if (exactPos < selection.startCharPosition || exactPos >= selection.endCharPosition) {
            const notePos = dropTarget.notePos;
            const staveY = notePos.staveY || notePos.y;

            // Calculate insertion line X based on exact position within the note
            const offsetWithinNote = exactPos - notePos.charPosition;
            const proportionWithinNote = offsetWithinNote / notePos.durationInSixteenths;
            const insertionX = notePos.x + (proportionWithinNote * notePos.width);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(insertionX));
            line.setAttribute('y1', String(staveY + 15));
            line.setAttribute('x2', String(insertionX));
            line.setAttribute('y2', String(staveY + 95));
            line.setAttribute('stroke', '#9333ea');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '6,4');
            line.setAttribute('class', 'drag-preview');
            line.setAttribute('pointer-events', 'none');
            svg.appendChild(line);
          }
        }
        return;
      }

      // Handle rectangle drawing
      if (state.isDrawing) {
        state.hasDragged = true;

        const containerCoords = clientToContainer(e.clientX, e.clientY);
        const svgCoords = clientToSvg(e.clientX, e.clientY);

        // Update visual rectangle (direct DOM manipulation to avoid re-render conflicts)
        updateSelectionRect({
          startX: state.startX,
          startY: state.startY,
          currentX: containerCoords.x,
          currentY: containerCoords.y,
        });

        // Find notes in rectangle and update selection
        const minX = Math.min(state.startSvgX, svgCoords.x);
        const maxX = Math.max(state.startSvgX, svgCoords.x);
        const minY = Math.min(state.startSvgY, svgCoords.y);
        const maxY = Math.max(state.startSvgY, svgCoords.y);

        let startChar = Infinity;
        let endChar = -Infinity;

        notePositionsRef.current.forEach((notePos) => {
          const noteLeft = notePos.x;
          const noteRight = notePos.x + notePos.width;
          const noteTop = notePos.staveY || notePos.y;
          const noteBottom = noteTop + 80;

          if (noteRight >= minX && noteLeft <= maxX && noteBottom >= minY && noteTop <= maxY) {
            // If note is part of a tied group, expand to include the whole group
            if (notePos.tiedGroupStart !== undefined && notePos.tiedGroupEnd !== undefined) {
              startChar = Math.min(startChar, notePos.tiedGroupStart);
              endChar = Math.max(endChar, notePos.tiedGroupEnd);
            } else {
              startChar = Math.min(startChar, notePos.charPosition);
              endChar = Math.max(endChar, notePos.charPosition + notePos.durationInSixteenths);
            }
          }
        });

        if (startChar !== Infinity && endChar !== -Infinity && onSelectionChange) {
          onSelectionChange(startChar, endChar, endChar - startChar);
        }
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const state = dragStateRef.current;
      const container = containerRef.current;
      const svg = container?.querySelector('svg');

      // Handle move completion
      if (state.isDraggingSelection && state.hasDragged && onMoveSelection && selection &&
        selection.startCharPosition !== null && selection.endCharPosition !== null && svg) {
        const svgRect = svg.getBoundingClientRect();
        const svgX = e.clientX - svgRect.left;
        const svgY = e.clientY - svgRect.top;

        // Use findDropTarget to get the exact position (same logic as regular drag-drop)
        const dropTarget = findDropTarget(svgX, svgY, notePositionsRef.current);

        if (dropTarget) {
          const targetPosition = dropTarget.exactCharPosition;

          // Only move if target is outside the current selection
          if (targetPosition < selection.startCharPosition || targetPosition >= selection.endCharPosition) {
            onMoveSelection(selection.startCharPosition, selection.endCharPosition, targetPosition);
          }
        }

        svg.querySelectorAll('.drag-preview').forEach(el => el.remove());
        if (container) container.style.cursor = '';
      }

      // Handle rectangle selection completion
      if (state.isDrawing) {
        updateSelectionRect(null); // Hide rectangle

        if (!state.hasDragged && svg) {
          // Single click - select note or clear using distance-based selection
          const svgRect = svg.getBoundingClientRect();
          const svgX = e.clientX - svgRect.left;
          const svgY = e.clientY - svgRect.top;

          const clickedNote = findClickedNote(svgX, svgY, notePositionsRef.current);

          if (clickedNote && onSelectionChange) {
            // If clicking on a tied note, select the entire tied group
            const start = clickedNote.tiedGroupStart ?? clickedNote.charPosition;
            const end = clickedNote.tiedGroupEnd ?? (clickedNote.charPosition + clickedNote.durationInSixteenths);
            onSelectionChange(start, end, end - start);
          } else if (onSelectionChange) {
            onSelectionChange(null, null, 0);
          }
        }
      }

      // Reset state
      state.isDrawing = false;
      state.isDraggingSelection = false;
      state.hasDragged = false;
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selection, onSelectionChange, onMoveSelection, updateSelectionRect]);

  // React-style drag handlers - more reliable than manual SVG event listeners
  // These are always attached and handle events that bubble up from SVG elements
  const handleContainerDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!timeSignature || !notation || !containerRef.current || !onDropPattern) {
      return;
    }

    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Clear any existing preview
    const existingPreview = svg.querySelectorAll('.preview-note');
    existingPreview.forEach(el => el.remove());

    const pattern = getCurrentDraggedPattern();
    // cleanNotation removed - use raw notation

    // Compute drop preview
    const previewResult = computeDropPreview(
      e.clientX,
      e.clientY,
      pattern,
      notation, // Phase 21: Pass RAW notation
      timeSignature,
      dragDropMode,
      notePositionsRef.current,
      containerRef,
      rhythm // Phase 21: Pass parsed rhythm
    );

    // Set dropEffect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = previewResult.isValid ? 'copy' : 'none';
    }

    // Render preview
    if (previewResult.isValid) {
      if (previewResult.previewType === 'replace' && previewResult.replacementHighlights.length > 0) {
        previewResult.replacementHighlights.forEach((bounds) => {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(bounds.x));
          rect.setAttribute('y', String(bounds.y));
          rect.setAttribute('width', String(bounds.width));
          rect.setAttribute('height', String(bounds.height));
          rect.setAttribute('fill', 'rgba(239, 68, 68, 0.3)');
          rect.setAttribute('stroke', 'rgba(239, 68, 68, 0.8)');
          rect.setAttribute('stroke-width', '2');
          rect.setAttribute('stroke-dasharray', '4,4');
          rect.setAttribute('class', 'preview-note');
          rect.setAttribute('pointer-events', 'none');
          svg.appendChild(rect);
        });
      } else if (previewResult.previewType === 'insert' && previewResult.insertionLine) {
        const { x, top, bottom } = previewResult.insertionLine;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x));
        line.setAttribute('y1', String(top));
        line.setAttribute('x2', String(x));
        line.setAttribute('y2', String(bottom));
        line.setAttribute('stroke', '#9333ea');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '6,4');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('class', 'preview-note');
        line.setAttribute('pointer-events', 'none');
        svg.appendChild(line);
      }
    }
  }, [notation, timeSignature, dragDropMode, onDropPattern]);

  const handleContainerDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear preview if leaving the container entirely (not entering a child)
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
      return; // Still within container, don't clear preview
    }

    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const existingPreview = svg.querySelectorAll('.preview-note');
        existingPreview.forEach(el => el.remove());
      }
    }
  }, []);

  const handleContainerDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear preview
    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        svg.querySelectorAll('.preview-note').forEach(el => el.remove());
      }
    }

    if (!timeSignature || !notation || !onDropPattern) {
      return;
    }

    // Get pattern from dataTransfer or global variable
    let pattern: string | null = null;
    if (e.dataTransfer) {
      pattern = e.dataTransfer.getData('application/darbuka-pattern') ||
        e.dataTransfer.getData('text/plain');
    }
    if (!pattern) {
      pattern = getCurrentDraggedPattern();
    }

    if (!pattern) {
      return;
    }


    // Compute drop position using the same logic as preview
    const previewResult = computeDropPreview(
      e.clientX,
      e.clientY,
      pattern,
      notation, // Phase 21: Pass RAW notation
      timeSignature,
      dragDropMode,
      notePositionsRef.current,
      containerRef,
      rhythm // Phase 21: Pass parsed rhythm
    );

    if (previewResult.isValid) {
      onDropPattern(pattern, previewResult.dropPosition, previewResult.targetMeasureIndex);
    }
  }, [notation, timeSignature, dragDropMode, onDropPattern]);

  // Helper to announce to screen readers via the live region
  const announce = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, []);

  // Helper to find the next/previous note position based on current selection
  const findAdjacentNote = useCallback((direction: 'next' | 'prev' | 'first' | 'last'): NotePosition | null => {
    const positions = notePositionsRef.current;
    if (positions.length === 0) return null;

    // Sort by charPosition for consistent navigation
    const sorted = [...positions].sort((a, b) => a.charPosition - b.charPosition);

    if (direction === 'first') return sorted[0];
    if (direction === 'last') return sorted[sorted.length - 1];

    // If no current selection, return first or last based on direction
    if (!selection || selection.startCharPosition === null) {
      return direction === 'next' ? sorted[0] : sorted[sorted.length - 1];
    }

    // Find current note index
    const currentIndex = sorted.findIndex(n => n.charPosition === selection.startCharPosition);
    if (currentIndex === -1) {
      return direction === 'next' ? sorted[0] : sorted[sorted.length - 1];
    }

    if (direction === 'next') {
      // Wrap to first if at end
      return sorted[(currentIndex + 1) % sorted.length];
    } else {
      // Wrap to last if at beginning
      return sorted[(currentIndex - 1 + sorted.length) % sorted.length];
    }
  }, [selection]);

  // Keyboard handler for navigation and actions
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key, shiftKey } = e;

    // Tab navigation - when there's a selection, move focus to palette
    // for pattern replacement. Otherwise, Tab navigates between notes.
    if (key === 'Tab' && !shiftKey) {
      if (selection && selection.startCharPosition !== null && onRequestPaletteFocus) {
        // Selection exists - programmatically focus the palette
        e.preventDefault();
        onRequestPaletteFocus();
        return;
      }
      // No selection - use Tab to navigate between notes
      e.preventDefault();
      const targetNote = findAdjacentNote('next');
      if (targetNote && onSelectionChange) {
        const start = targetNote.tiedGroupStart ?? targetNote.charPosition;
        const end = targetNote.tiedGroupEnd ?? (targetNote.charPosition + targetNote.durationInSixteenths);
        onSelectionChange(start, end, end - start);
        announce(`Note ${targetNote.noteIndex + 1} of measure ${targetNote.measureIndex + 1}`);
      }
      return;
    }

    // Shift+Tab navigates backward between notes
    if (key === 'Tab' && shiftKey) {
      e.preventDefault();
      const targetNote = findAdjacentNote('prev');
      if (targetNote && onSelectionChange) {
        const start = targetNote.tiedGroupStart ?? targetNote.charPosition;
        const end = targetNote.tiedGroupEnd ?? (targetNote.charPosition + targetNote.durationInSixteenths);
        onSelectionChange(start, end, end - start);
        announce(`Note ${targetNote.noteIndex + 1} of measure ${targetNote.measureIndex + 1}`);
      }
      return;
    }

    // Arrow key navigation
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      e.preventDefault();
      const targetNote = findAdjacentNote(key === 'ArrowRight' ? 'next' : 'prev');
      if (targetNote && onSelectionChange) {
        const start = targetNote.tiedGroupStart ?? targetNote.charPosition;
        const end = targetNote.tiedGroupEnd ?? (targetNote.charPosition + targetNote.durationInSixteenths);
        onSelectionChange(start, end, end - start);
        announce(`Note ${targetNote.noteIndex + 1} of measure ${targetNote.measureIndex + 1}`);
      }
      return;
    }

    // Home/End for first/last note
    if (key === 'Home') {
      e.preventDefault();
      const targetNote = findAdjacentNote('first');
      if (targetNote && onSelectionChange) {
        const start = targetNote.tiedGroupStart ?? targetNote.charPosition;
        const end = targetNote.tiedGroupEnd ?? (targetNote.charPosition + targetNote.durationInSixteenths);
        onSelectionChange(start, end, end - start);
        announce('First note selected');
      }
      return;
    }

    if (key === 'End') {
      e.preventDefault();
      const targetNote = findAdjacentNote('last');
      if (targetNote && onSelectionChange) {
        const start = targetNote.tiedGroupStart ?? targetNote.charPosition;
        const end = targetNote.tiedGroupEnd ?? (targetNote.charPosition + targetNote.durationInSixteenths);
        onSelectionChange(start, end, end - start);
        announce('Last note selected');
      }
      return;
    }

    // Delete/Backspace to delete selection
    if ((key === 'Delete' || key === 'Backspace') && selection && selection.startCharPosition !== null) {
      e.preventDefault();
      if (onDeleteSelection) {
        onDeleteSelection();
        announce('Note deleted');
      }
      return;
    }

    // Escape to clear selection and blur
    if (key === 'Escape') {
      e.preventDefault();
      if (selection && selection.startCharPosition !== null && onSelectionChange) {
        onSelectionChange(null, null, 0);
        announce('Selection cleared');
      }
      // Blur the container
      containerRef.current?.blur();
      return;
    }

    // Select all with Cmd/Ctrl+A
    if (key === 'a' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const positions = notePositionsRef.current;
      if (positions.length > 0 && onSelectionChange) {
        const sorted = [...positions].sort((a, b) => a.charPosition - b.charPosition);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const start = first.charPosition;
        const end = last.charPosition + last.durationInSixteenths;
        onSelectionChange(start, end, end - start);
        announce(`All ${sorted.length} notes selected`);
      }
      return;
    }
  }, [selection, onSelectionChange, onDeleteSelection, onRequestPaletteFocus, findAdjacentNote, announce]);

  if (rhythm.measures.length === 0) {
    return null;
  }

  // Generate selection description for screen readers
  const getSelectionDescription = (): string => {
    if (!selection || selection.startCharPosition === null) {
      return 'No notes selected';
    }
    const noteCount = notePositionsRef.current.filter(
      n => n.charPosition >= selection.startCharPosition! &&
        n.charPosition < selection.endCharPosition!
    ).length;
    if (noteCount === 1) {
      return 'One note selected';
    }
    return `${noteCount} notes selected`;
  };

  return (
    <div
      ref={containerRef}
      className="vexflow-container"
      // Accessibility: Make focusable and add ARIA attributes
      tabIndex={0}
      role="application"
      aria-label="Rhythm notation editor. Use arrow keys to navigate notes, Delete to remove, Escape to clear selection."
      aria-roledescription="notation editor"
      aria-describedby="notation-live-region"
      onMouseDown={handleContainerMouseDown}
      onKeyDown={handleKeyDown}
      onDragOver={handleContainerDragOver}
      onDragLeave={handleContainerDragLeave}
      onDrop={handleContainerDrop}
      style={{
        width: '100%',
        overflowX: 'auto',
        padding: '20px 0',
        position: 'relative', // Enable absolute positioning for selection overlay
        cursor: 'crosshair',
        outline: 'none', // We'll use custom focus styling
      }}
    >
      {/* ARIA live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        id="notation-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {getSelectionDescription()}
      </div>

      {/* Selection rectangle overlay - always rendered, visibility controlled via ref */}
      <div
        ref={selectionRectRef}
        className="selection-rectangle-overlay"
        style={{
          display: 'none', // Initially hidden, controlled by updateSelectionRect
          position: 'absolute',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          border: '1.5px solid rgba(59, 130, 246, 0.8)',
          borderRadius: '2px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
};

export default VexFlowRenderer;
