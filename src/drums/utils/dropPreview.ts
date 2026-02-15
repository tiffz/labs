/**
 * Unified Drop Preview Computation
 * 
 * This module provides a SINGLE source of truth for computing drop preview state.
 * Both the green "+" icon and visual preview indicators are derived from the same computation,
 * ensuring perfect consistency.
 * 
 * Drop targeting is unified: whether a drop is a "replace" or "insert" operation is
 * determined automatically based on cursor position relative to note boundaries:
 * - Cursor near a boundary between notes → insert operation (purple line)
 * - Cursor over the center of a note → replace operation (red highlight)
 * 
 * The zone detection is boundary-centered: insertion zones are symmetric around each
 * boundary between consecutive notes, independent of which specific note the drop-target
 * finder selects. This ensures predictable directional behavior:
 * - Moving left from a boundary → replaces the note to the left
 * - Moving right from a boundary → replaces the note to the right
 */

import { getPatternDuration, replacePatternAtPosition } from './dragAndDrop';
import { calculateReplacementHighlights, calculateNoteHighlightBounds } from './previewRenderer';
import { findDropTarget } from './dropTargetFinder';
import { calculateInsertionLineFromGap } from './insertionTargetFinder';
import type { Gap } from './insertionTargetFinder';
import type { TimeSignature, ParsedRhythm } from '../types';
import type { NotePosition } from './dropTargetFinder';
import type { HighlightBounds, InsertionLineBounds } from './previewRenderer';

export type DropPreviewType = 'replace' | 'insert' | 'none';

export interface DropPreviewResult {
  /** Whether a drop is valid (should show green "+") */
  isValid: boolean;
  /** Type of preview to show */
  previewType: DropPreviewType;
  /** Character position where drop would occur */
  dropPosition: number;
  /** For replace mode: bounds of notes that would be replaced */
  replacementHighlights: HighlightBounds[];
  /** For insert mode: position of insertion line */
  insertionLine: InsertionLineBounds | null;
  /** The measure index of the drop target (crucial for handling repeat instance divergence) */
  targetMeasureIndex?: number;
}

/**
 * Half-width of the insertion zone centered on each boundary between notes (in pixels).
 * Total insertion zone width = 2 * BOUNDARY_ZONE_HALF_WIDTH.
 * 
 * A larger value makes insertion easier to target but shrinks replace zones.
 * With 12px (24px total), a typical quarter note (~70-100px) retains ~50-80px of replace zone,
 * keeping replacement as the dominant target while still providing accessible insertion zones.
 */
export const BOUNDARY_ZONE_HALF_WIDTH = 12;

/** Stave layout constants */
const STAVE_HEIGHT = 100;
const LINE_START_Y = 40;

/** A boundary between notes where insertion is possible */
export interface InsertionBoundary {
  /** X position of the boundary in SVG coordinates */
  x: number;
  /** Character position where insertion would occur */
  charPos: number;
  /** A nearby note position (for stave line calculation) */
  nearbyNote: NotePosition;
}

/**
 * Determine which stave line index a note belongs to.
 * @internal Exported for testing
 */
export function getLineIndex(notePos: NotePosition): number {
  if (notePos.staveY !== undefined) {
    return Math.round((notePos.staveY - LINE_START_Y) / STAVE_HEIGHT);
  }
  const estimatedStaveY = notePos.y - 20;
  return Math.round((estimatedStaveY - LINE_START_Y) / STAVE_HEIGHT);
}

/**
 * Construct a minimal Gap object from a note position and insertion X coordinate.
 * Used to calculate insertion line visual bounds via calculateInsertionLineFromGap.
 */
function makeInsertionGap(x: number, notePos: NotePosition, insertionCharPos: number): Gap {
  return {
    charStart: insertionCharPos,
    charEnd: insertionCharPos,
    xStart: x - 2,
    xEnd: x + 2,
    y: notePos.y,
    lineIndex: getLineIndex(notePos),
  };
}

/**
 * Compute all insertion boundaries on a given stave line.
 * 
 * Boundaries are placed:
 * - Before the first note on the line
 * - Between each pair of consecutive notes
 * - After the last note on the line
 */
export function computeLineBoundaries(lineNotes: NotePosition[]): InsertionBoundary[] {
  if (lineNotes.length === 0) return [];

  const sorted = [...lineNotes].sort((a, b) => a.x - b.x);
  const boundaries: InsertionBoundary[] = [];

  // Boundary before the first note
  const first = sorted[0];
  boundaries.push({
    x: first.x,
    charPos: first.charPosition,
    nearbyNote: first,
  });

  // Boundaries between consecutive notes
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    // Place boundary at the start of the next note (= visual boundary between them)
    boundaries.push({
      x: next.x,
      charPos: curr.charPosition + curr.durationInSixteenths,
      nearbyNote: next,
    });
  }

  // Boundary after the last note
  const last = sorted[sorted.length - 1];
  boundaries.push({
    x: last.x + last.width,
    charPos: last.charPosition + last.durationInSixteenths,
    nearbyNote: last,
  });

  return boundaries;
}

/**
 * Compute drop preview state from cursor position and pattern.
 * 
 * This is the SINGLE source of truth for drop preview computation.
 * Both dropEffect and visual preview rendering derive from this result.
 * 
 * Drop mode is determined automatically:
 * 1. Compute all note boundaries on the cursor's stave line
 * 2. If cursor is within BOUNDARY_ZONE_HALF_WIDTH of any boundary → insert mode
 * 3. Otherwise → replace mode (cursor is solidly on a note)
 * 
 * This boundary-centered approach ensures stable, predictable targeting that
 * doesn't depend on which note the drop-target finder happens to select.
 * 
 * @param cursorX - Cursor X position (clientX)
 * @param cursorY - Cursor Y position (clientY)
 * @param pattern - Pattern being dragged
 * @param notation - Current rhythm notation
 * @param timeSignature - Current time signature
 * @param notePositions - Array of note positions for finding drop target
 * @param containerRef - Container element for coordinate conversion
 * @param parsedRhythm - Parsed rhythm data (REQUIRED for Phase 21 Mapping)
 * @returns Drop preview result
 */
export function computeDropPreview(
  cursorX: number,
  cursorY: number,
  pattern: string | null,
  notation: string,
  timeSignature: TimeSignature,
  notePositions: NotePosition[],
  containerRef: { current: HTMLDivElement | null },
  parsedRhythm: ParsedRhythm
): DropPreviewResult {
  // Default: no drop possible
  const defaultResult: DropPreviewResult = {
    isValid: false,
    previewType: 'none',
    dropPosition: 0,
    replacementHighlights: [],
    insertionLine: null,
  };

  // Early returns for invalid states
  if (!pattern || !containerRef.current) {
    return defaultResult;
  }

  const svg = containerRef.current.querySelector('svg');
  if (!svg) {
    return defaultResult;
  }

  // Convert cursor position to SVG coordinates
  const svgRect = svg.getBoundingClientRect();
  const svgX = cursorX - svgRect.left;
  const svgY = cursorY - svgRect.top;

  const cleanNotation = notation.replace(/[\s\n]/g, '');

  // Handle empty notation case - always allow insertion at start
  if (notePositions.length === 0 || cleanNotation.length === 0) {
    return {
      isValid: true,
      previewType: 'insert',
      dropPosition: 0,
      replacementHighlights: [],
      insertionLine: null, // No line to show, but drop is valid
    };
  }

  // Find the closest note (used for stave line detection and replace targeting)
  const dropTarget = findDropTarget(svgX, svgY, notePositions);
  if (!dropTarget) {
    return defaultResult;
  }

  // --- Boundary-Centered Zone Detection ---
  // Instead of checking edges of the selected note, we compute ALL note boundaries
  // on the cursor's stave line and check proximity to those boundaries.
  // This is independent of which note findDropTarget selected, making the behavior
  // predictable and symmetric.

  const targetLineIndex = getLineIndex(dropTarget.notePos);

  // Gather notes on the same stave line
  const lineNotes = notePositions.filter(np => getLineIndex(np) === targetLineIndex);

  // Compute insertion boundaries for this line
  const boundaries = computeLineBoundaries(lineNotes);

  // Find the closest boundary to the cursor
  let closestBoundary: InsertionBoundary | null = null;
  let minBoundaryDist = Infinity;

  for (const boundary of boundaries) {
    const dist = Math.abs(svgX - boundary.x);
    if (dist < minBoundaryDist) {
      minBoundaryDist = dist;
      closestBoundary = boundary;
    }
  }

  // Special handling for edges: if cursor is before the first note or after the last
  // note on this line, always prefer insertion (even if slightly outside the zone)
  const sortedLineNotes = [...lineNotes].sort((a, b) => a.x - b.x);
  const firstNoteOnLine = sortedLineNotes[0];
  const lastNoteOnLine = sortedLineNotes[sortedLineNotes.length - 1];
  const isBeforeFirstNote = firstNoteOnLine && svgX < firstNoteOnLine.x;
  const isAfterLastNote = lastNoteOnLine && svgX > lastNoteOnLine.x + lastNoteOnLine.width;

  // Determine if we're in an insertion zone
  const isInInsertionZone = (
    (closestBoundary !== null && minBoundaryDist <= BOUNDARY_ZONE_HALF_WIDTH) ||
    isBeforeFirstNote ||
    isAfterLastNote
  );

  if (isInInsertionZone && closestBoundary) {
    // --- INSERTION MODE ---
    const gap = makeInsertionGap(closestBoundary.x, closestBoundary.nearbyNote, closestBoundary.charPos);
    const insertionLine = calculateInsertionLineFromGap(gap);

    return {
      isValid: true,
      previewType: 'insert',
      dropPosition: closestBoundary.charPos,
      replacementHighlights: [],
      insertionLine,
      targetMeasureIndex: dropTarget.measureIndex,
    };
  } else {
    // --- REPLACE MODE ---
    // Cursor is solidly on a note - compute replacement preview

    // Handle implicit rests (padding at end of measure)
    if (dropTarget.isImplicitRest) {
      const implicitRestHighlight: HighlightBounds = {
        x: dropTarget.x,
        y: dropTarget.y,
        width: 40,
        height: 60,
      };
      return {
        isValid: true,
        previewType: 'replace',
        dropPosition: dropTarget.exactCharPosition,
        replacementHighlights: [implicitRestHighlight],
        insertionLine: null,
        targetMeasureIndex: dropTarget.measureIndex,
      };
    }

    // Normal replace: use exact position within the note
    const dropPosition = dropTarget.exactCharPosition;
    const patternDuration = getPatternDuration(pattern);

    // Validate the replacement
    const replacementResult = replacePatternAtPosition(
      notation,
      dropPosition,
      pattern,
      patternDuration,
      timeSignature,
      parsedRhythm
    );

    if (replacementResult.replacedLength > 0) {
      // Replacement is possible - compute highlights
      const highlights = calculateReplacementHighlights(
        notePositions,
        dropPosition,
        dropPosition + patternDuration
      );

      // If highlights are empty, try to find notes that overlap with the replacement range
      let finalHighlights = highlights;
      if (highlights.length === 0) {
        const overlappingNotes = notePositions.filter(np => {
          const noteStart = np.charPosition;
          const noteEnd = noteStart + np.durationInSixteenths;
          return noteStart < (dropPosition + patternDuration) && noteEnd > dropPosition;
        });

        if (overlappingNotes.length > 0) {
          finalHighlights = overlappingNotes.map(np => calculateNoteHighlightBounds(np));
        }
      }

      // Only return valid if we have highlights to show
      if (finalHighlights.length > 0) {
        return {
          isValid: true,
          previewType: 'replace',
          dropPosition,
          replacementHighlights: finalHighlights,
          insertionLine: null,
          targetMeasureIndex: dropTarget.measureIndex,
        };
      }
    }

    // Replacement not possible at this position - show invalid
    return defaultResult;
  }
}
