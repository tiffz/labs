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
import type { TimeSignature } from '../types';
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
  containerRef: { current: HTMLDivElement | null }
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

  // Find drop target note
  const dropTarget = findDropTarget(svgX, svgY, notePositions);
  if (!dropTarget) {
    return defaultResult;
  }

  const { charPosition } = dropTarget;
  const cleanNotation = notation.replace(/[\s\n]/g, '');

  // Compute preview based on mode
  if (dragDropMode === 'insert') {
    // Insert mode: use completely rewritten insertion target finder
    // This finds actual gaps between notes and uses cursor position directly
    // Pass notation and timeSignature to handle end-of-measure insertion
    const insertionTarget = findInsertionTarget(svgX, svgY, notePositions, notation, timeSignature);
    
    if (insertionTarget) {
      // Use cursor Y position directly for insertion line positioning
      const insertionLine = calculateInsertionLineFromGap(insertionTarget.gap, insertionTarget.cursorY);
      
      return {
        isValid: true,
        previewType: 'insert',
        dropPosition: insertionTarget.insertionCharPosition,
        replacementHighlights: [],
        insertionLine,
      };
    } else {
      return defaultResult;
    }
  } else {
    // Replace mode: use exact note position
    const dropPosition = charPosition;
    
    // Replace mode: ONLY show replacement previews, never fall back to insert
    const patternDuration = getPatternDuration(pattern);
    const replacementResult = replacePatternAtPosition(
      cleanNotation,
      dropPosition,
      pattern,
      patternDuration,
      timeSignature
    );

    // CRITICAL: Only show as valid if replacement actually succeeded AND we have highlights
    if (replacementResult.replacedLength > 0) {
      // Replacement is possible - compute highlights
      const highlights = calculateReplacementHighlights(
        notePositions,
        replacementResult.replacedStart,
        replacementResult.replacedEnd
      );

      // If highlights are empty, try to find notes that overlap with the replacement range
      let finalHighlights = highlights;
      if (highlights.length === 0) {
        // Find all notes that overlap with the replacement range
        const overlappingNotes = notePositions.filter(np => {
          const noteStart = np.charPosition;
          const noteEnd = noteStart + np.durationInSixteenths;
          // Check if note overlaps with replacement range
          return noteStart < replacementResult.replacedEnd && noteEnd > replacementResult.replacedStart;
        });
        
        if (overlappingNotes.length > 0) {
          finalHighlights = overlappingNotes.map(np => calculateNoteHighlightBounds(np));
        }
      }

      // CRITICAL: Only return valid if we have highlights to show
      // In replace mode, we NEVER show insert previews - if replacement fails, return invalid
      if (finalHighlights.length > 0) {
        return {
          isValid: true,
          previewType: 'replace',
          dropPosition,
          replacementHighlights: finalHighlights,
          insertionLine: null,
        };
      }
    }
    
    // Replacement not possible or no highlights found - return invalid
    // In replace mode, we don't fall back to insert previews
    return defaultResult;
  }
}

