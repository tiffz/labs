/**
 * Insertion Target Finder
 * 
 * Completely rewritten from first principles for stability.
 * 
 * Core principles:
 * 1. Find actual gaps between notes (where one note ends and another starts)
 * 2. Use cursor X position directly to find the closest gap
 * 3. Use cursor Y position directly to determine which visual line we're on
 * 4. Never show insertion lines within notes - only in gaps
 */

import { findMeasureBoundaries } from './dragAndDrop';
import type { NotePosition } from './dropTargetFinder';
import type { InsertionLineBounds } from './previewRenderer';
import type { TimeSignature } from '../types';

export interface Gap {
  /** Character position where the gap starts (end of previous note) */
  charStart: number;
  /** Character position where the gap ends (start of next note) */
  charEnd: number;
  /** X position where gap starts (end of previous note) */
  xStart: number;
  /** X position where gap ends (start of next note) */
  xEnd: number;
  /** Y position (for vertical alignment) */
  y: number;
  /** Visual line index (0, 1, 2, etc.) */
  lineIndex: number;
}

/**
 * Find all gaps between notes, grouped by visual line.
 */
function findGapsBetweenNotes(notePositions: NotePosition[]): Map<number, Gap[]> {
  const gapsByLine = new Map<number, Gap[]>();
  const staveHeight = 100;
  const lineStartY = 40;

  // Group notes by visual line
  const notesByLine = new Map<number, NotePosition[]>();
  
  for (const notePos of notePositions) {
    let lineIndex: number;
    if (notePos.staveY !== undefined) {
      lineIndex = Math.round((notePos.staveY - lineStartY) / staveHeight);
    } else {
      const estimatedStaveY = notePos.y - 20;
      lineIndex = Math.round((estimatedStaveY - lineStartY) / staveHeight);
    }
    
    if (!notesByLine.has(lineIndex)) {
      notesByLine.set(lineIndex, []);
    }
    notesByLine.get(lineIndex)!.push(notePos);
  }

  // Find gaps within each line
  for (const [lineIndex, lineNotes] of notesByLine.entries()) {
    // Sort notes by charPosition
    const sortedNotes = [...lineNotes].sort((a, b) => a.charPosition - b.charPosition);
    
    const gaps: Gap[] = [];
    
    // Always create gap before first note (allows insertion at start of line/measure)
    if (sortedNotes.length > 0) {
      const firstNote = sortedNotes[0];
      // Create a gap that starts before the first note's charPosition
      // This allows insertion at the beginning of a measure
      gaps.push({
        charStart: firstNote.charPosition, // Insertion point at start of first note
        charEnd: firstNote.charPosition,
        xStart: firstNote.x - 20, // Before first note
        xEnd: firstNote.x,
        y: firstNote.y,
        lineIndex,
      });
    }
    
    // Create insertion points between ALL consecutive notes (even if adjacent)
    // This allows insertion between notes even when there's no gap
    for (let i = 0; i < sortedNotes.length - 1; i++) {
      const currentNote = sortedNotes[i];
      const nextNote = sortedNotes[i + 1];
      
      const currentNoteEnd = currentNote.charPosition + currentNote.durationInSixteenths;
      const currentNoteEndX = currentNote.x + currentNote.width;
      
      // Create insertion point between notes (even if they're adjacent)
      // Use the position where the current note ends / next note starts
      const insertionCharPos = currentNoteEnd;
      
      gaps.push({
        charStart: insertionCharPos,
        charEnd: nextNote.charPosition,
        xStart: currentNoteEndX,
        xEnd: nextNote.x,
        y: currentNote.y,
        lineIndex,
      });
    }
    
    // Gap after last note
    if (sortedNotes.length > 0) {
      const lastNote = sortedNotes[sortedNotes.length - 1];
      const lastNoteEnd = lastNote.charPosition + lastNote.durationInSixteenths;
      const lastNoteEndX = lastNote.x + lastNote.width;
      
      gaps.push({
        charStart: lastNoteEnd,
        charEnd: Infinity, // No end limit
        xStart: lastNoteEndX,
        xEnd: lastNoteEndX + 50, // Extend beyond last note
        y: lastNote.y,
        lineIndex,
      });
    }
    
    if (gaps.length > 0) {
      gapsByLine.set(lineIndex, gaps);
    }
  }

  return gapsByLine;
}

/**
 * Find the insertion target based on cursor position.
 * 
 * Uses very loose tolerances - always finds the nearest gap even when cursor is over notes.
 * This prevents flickering and makes targeting much easier.
 * 
 * If insertion is at the end of a measure, moves it to the start of the next measure.
 * 
 * Returns the gap closest to the cursor, or null if no valid gap found.
 */
export function findInsertionTarget(
  cursorX: number,
  cursorY: number,
  notePositions: NotePosition[],
  notation?: string,
  timeSignature?: TimeSignature
): { gap: Gap; insertionCharPosition: number; cursorY: number } | null {
  if (notePositions.length === 0) {
    return null;
  }

  const staveHeight = 100;
  const lineStartY = 40;
  
  // Find all gaps
  const gapsByLine = findGapsBetweenNotes(notePositions);
  
  // Find the closest gap across ALL lines, using loose tolerances
  // This ensures we always find a gap even when cursor is over a note
  let closestGap: Gap | null = null;
  let minDistance = Infinity;
  
  for (const [lineIndex, gaps] of gapsByLine.entries()) {
    for (const gap of gaps) {
      const gapCenterX = (gap.xStart + gap.xEnd) / 2;
      const dx = cursorX - gapCenterX;
      
      // Calculate line center Y
      const lineCenterY = lineStartY + lineIndex * staveHeight + (staveHeight / 5) * 2;
      const dy = cursorY - lineCenterY;
      
      // Use much looser tolerances:
      // - Weight X distance more (2x) to prefer gaps horizontally closer
      // - Weight Y distance moderately (3x) to prefer gaps on nearby lines
      // This makes it easier to target gaps even when cursor is over notes
      const distance = Math.sqrt((dx * dx * 2) + (dy * dy * 3));
      
      if (distance < minDistance) {
        minDistance = distance;
        closestGap = gap;
      }
    }
  }
  
  if (closestGap) {
    let insertionCharPosition = closestGap.charStart;
    
    // Handle measure boundaries: ensure insertion is valid
    if (notation && timeSignature) {
      const cleanNotation = notation.replace(/[\s\n]/g, '');
      const measureBoundaries = findMeasureBoundaries(cleanNotation, timeSignature);
      
      // Find which measure contains the insertion position
      let measureIndex = -1;
      let measureStart = 0;
      let measureEnd = cleanNotation.length;
      
      for (let i = 0; i < measureBoundaries.length; i++) {
        const measureStartBoundary = measureBoundaries[i];
        const measureEndBoundary = i < measureBoundaries.length - 1 ? measureBoundaries[i + 1] : cleanNotation.length;
        
        // Check if insertion is within this measure
        if (insertionCharPosition >= measureStartBoundary && insertionCharPosition < measureEndBoundary) {
          measureIndex = i;
          measureStart = measureStartBoundary;
          measureEnd = measureEndBoundary;
          break;
        }
      }
      
      // If insertion is at the start of a measure, ensure it's valid
      if (insertionCharPosition === measureStart) {
        // This is valid - insertion at start of measure
        // Find the first note of this measure for accurate X position
        const firstNoteOfMeasure = notePositions.find(np => np.charPosition === measureStart);
        if (firstNoteOfMeasure) {
          closestGap = {
            ...closestGap,
            charStart: measureStart,
            charEnd: measureStart,
            xStart: firstNoteOfMeasure.x - 10,
            xEnd: firstNoteOfMeasure.x,
            y: firstNoteOfMeasure.y,
          };
        }
      } else if (insertionCharPosition >= measureEnd - 1 && insertionCharPosition <= measureEnd) {
        // Insertion is at the end of a measure - move to start of next measure
        if (measureIndex >= 0 && measureIndex < measureBoundaries.length - 1) {
          insertionCharPosition = measureBoundaries[measureIndex + 1];
          // Update gap to reflect new position - find the first note of next measure for X position
          const firstNoteOfNextMeasure = notePositions.find(np => np.charPosition === insertionCharPosition);
          if (firstNoteOfNextMeasure) {
            closestGap = {
              ...closestGap,
              charStart: insertionCharPosition,
              charEnd: insertionCharPosition,
              xStart: firstNoteOfNextMeasure.x - 10,
              xEnd: firstNoteOfNextMeasure.x,
              y: firstNoteOfNextMeasure.y,
            };
          } else {
            // Fallback: use gap position
            closestGap = {
              ...closestGap,
              charStart: insertionCharPosition,
              charEnd: insertionCharPosition,
            };
          }
        }
      }
    }
    
    // Return cursor Y position so insertion line can use it directly
    return { gap: closestGap, insertionCharPosition, cursorY };
  }
  
  return null;
}

/**
 * Calculate insertion line bounds from a gap.
 * 
 * Uses cursor Y position directly to position the line, making it easier to target
 * especially on the first line.
 */
export function calculateInsertionLineFromGap(gap: Gap, cursorY?: number): InsertionLineBounds {
  const staveHeight = 100;
  const lineStartY = 40;
  const staveTop = lineStartY + gap.lineIndex * staveHeight;
  const staveBottom = staveTop + staveHeight;
  const staveMiddleLineY = staveTop + (staveHeight / 5) * 2;
  
  // X position: midpoint of the gap
  const lineX = (gap.xStart + gap.xEnd) / 2;
  
  // Use cursor Y position if provided, otherwise use stave middle line
  // Clamp cursor Y to be within the stave bounds
  let insertionLineY: number;
  if (cursorY !== undefined) {
    // Clamp cursor Y to stave bounds, but allow some flexibility
    const staveTopWithPadding = staveTop - 20; // Allow 20px above stave
    const staveBottomWithPadding = staveBottom + 20; // Allow 20px below stave
    insertionLineY = Math.max(staveTopWithPadding, Math.min(cursorY, staveBottomWithPadding));
  } else {
    insertionLineY = staveMiddleLineY;
  }
  
  // Vertical bounds: extend to cover symbols but stay within reasonable bounds
  const maxHeightAbove = insertionLineY - staveTop;
  const maxHeightBelow = staveBottom - insertionLineY;
  const desiredHeightAbove = 60;
  const desiredHeightBelow = 50;
  
  const lineHeightAbove = Math.min(desiredHeightAbove, Math.max(0, maxHeightAbove));
  const lineHeightBelow = Math.min(desiredHeightBelow, Math.max(0, maxHeightBelow));
  const top = insertionLineY - lineHeightAbove;
  const bottom = insertionLineY + lineHeightBelow;
  
  return { x: lineX, top, bottom };
}

