/**
 * Unified Drop Preview Computation
 * 
 * This module provides a SINGLE source of truth for computing drop preview state.
 * Both the green "+" icon and red highlight boxes are derived from the same computation,
 * ensuring perfect consistency.
 */

import { getPatternDuration, replacePatternAtPosition } from './dragAndDrop';
import { calculateReplacementHighlights, calculateNoteHighlightBounds } from './previewRenderer';
import { findDropTarget } from './dropTargetFinder';
import { findInsertionTarget, calculateInsertionLineFromGap } from './insertionTargetFinder';
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
 * Compute drop preview state from cursor position and pattern.
 * 
 * This is the SINGLE source of truth for drop preview computation.
 * Both dropEffect and visual preview rendering derive from this result.
 * 
 * @param cursorX - Cursor X position (clientX)
 * @param cursorY - Cursor Y position (clientY)
 * @param pattern - Pattern being dragged
 * @param notation - Current rhythm notation
 * @param timeSignature - Current time signature
 * @param dragDropMode - 'replace' or 'insert'
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
  dragDropMode: 'replace' | 'insert',
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
  // Use getBoundingClientRect() for cross-platform compatibility
  // This works consistently across browsers and platforms
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

  // Find drop target note
  const dropTarget = findDropTarget(svgX, svgY, notePositions);

  if (!dropTarget) {
    // No target found (too far from any note)
    return defaultResult;
  }

  // Handle dropping on implicit rests (padding) or standard replace
  if (dragDropMode === 'replace') {
    // Check for "Implicit Rests" (Padding at end of measure)
    if (dropTarget.isImplicitRest) {
      // User is targeting the void space.
      // We calculate highlight for the void.
      const implicitRestHighlight: HighlightBounds = {
        x: dropTarget.x,
        y: dropTarget.y,
        width: 40, // default width
        height: 60, // default height
      };

      return {
        isValid: true,
        previewType: 'replace', // Show as replace (red highlight) for consistency
        dropPosition: dropTarget.exactCharPosition, // Use Logical Tick position
        replacementHighlights: [implicitRestHighlight],
        insertionLine: null,
        targetMeasureIndex: dropTarget.measureIndex,
      };
    }

    // Normal replace mode: use exact position within the note
    // This allows breaking tied notes when dropping in the middle
    const dropPosition = dropTarget.exactCharPosition;

    // Try replacement first
    const patternDuration = getPatternDuration(pattern);
    const replacementResult = replacePatternAtPosition(
      notation, // RAW notation
      dropPosition,
      pattern,
      patternDuration,
      timeSignature,
      parsedRhythm
    );

    // If replacement succeeded, show replacement preview
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
        // Find all notes that overlap with the replacement range
        const overlappingNotes = notePositions.filter(np => {
          const noteStart = np.charPosition;
          const noteEnd = noteStart + np.durationInSixteenths;
          // Check if note overlaps with replacement range
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

    // Replacement failed - check if we should fall back to insert at end
    // This allows appending at the end of the sequence in replace mode
    if (notePositions.length > 0) {
      // Find the last note
      const lastNote = notePositions.reduce((max, np) =>
        (np.charPosition + np.durationInSixteenths > max.charPosition + max.durationInSixteenths) ? np : max,
        notePositions[0]
      );
      const lastNoteEnd = lastNote.charPosition + lastNote.durationInSixteenths;

      // Check if the drop target is at or near the end of the notation
      // Allow insertion if we're targeting the last note or position is at/past the end
      const isAtEnd = dropPosition >= lastNoteEnd - 1 || dropPosition === lastNote.charPosition;

      if (isAtEnd) {
        // Use insertion target finder for proper end-of-sequence handling
        const insertionTarget = findInsertionTarget(svgX, svgY, notePositions, notation, timeSignature);

        if (insertionTarget) {
          const insertionLine = calculateInsertionLineFromGap(insertionTarget.gap, insertionTarget.cursorY);

          return {
            isValid: true,
            previewType: 'insert',
            dropPosition: insertionTarget.insertionCharPosition,
            replacementHighlights: [],
            insertionLine,
          };
        }
      }
    }

    // Replacement not possible and not at end - return invalid
    return defaultResult;
  }

  return defaultResult;
}
