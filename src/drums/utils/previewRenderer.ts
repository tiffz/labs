/**
 * Preview Renderer Utilities
 * 
 * Pure functions to calculate preview positions for drag-and-drop operations.
 * These functions compute where visual feedback should appear, but don't render anything.
 * This separation allows for easy testing and prevents rendering logic from affecting calculations.
 */

import type { NotePosition } from './dropTargetFinder';

export interface HighlightBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InsertionLineBounds {
  x: number;
  top: number;
  bottom: number;
}

/**
 * Calculate highlight bounds for notes that would be replaced.
 * Merges overlapping highlights on the same stave line into a single continuous box.
 * 
 * @param notePositions - Array of all note positions
 * @param replacedStart - Character position where replacement starts
 * @param replacedEnd - Character position where replacement ends
 * @returns Array of highlight bounds - one merged box per stave line
 */
export function calculateReplacementHighlights(
  notePositions: NotePosition[],
  replacedStart: number,
  replacedEnd: number
): HighlightBounds[] {
  // First, collect all individual highlights
  const individualHighlights: Array<{ bounds: HighlightBounds; staveY: number }> = [];

  for (const notePos of notePositions) {
    const noteStart = notePos.charPosition;
    const noteEnd = noteStart + notePos.durationInSixteenths;

    // Check if note overlaps with the replaced range
    // Note overlaps if: noteStart < previewEnd && noteEnd > previewStart
    const overlaps = noteStart < replacedEnd && noteEnd > replacedStart;

    if (overlaps) {
      const bounds = calculateNoteHighlightBounds(notePos);
      // Use staveY if available, otherwise estimate from bounds.y
      const staveY = notePos.staveY ?? Math.round((bounds.y - 40) / 100) * 100 + 40;
      individualHighlights.push({ bounds, staveY });
    }
  }

  // If 0 or 1 highlights, no merging needed
  if (individualHighlights.length <= 1) {
    return individualHighlights.map(h => h.bounds);
  }

  // Group highlights by stave line (Y position)
  const highlightsByLine = new Map<number, HighlightBounds[]>();
  
  for (const { bounds, staveY } of individualHighlights) {
    const existing = highlightsByLine.get(staveY);
    if (existing) {
      existing.push(bounds);
    } else {
      highlightsByLine.set(staveY, [bounds]);
    }
  }

  // Merge highlights on each line into a single bounding box
  const mergedHighlights: HighlightBounds[] = [];
  
  highlightsByLine.forEach((lineHighlights) => {
    if (lineHighlights.length === 1) {
      mergedHighlights.push(lineHighlights[0]);
    } else {
      // Compute bounding box that encompasses all highlights on this line
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      
      for (const bounds of lineHighlights) {
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
      
      mergedHighlights.push({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    }
  });

  return mergedHighlights;
}

/**
 * Calculate highlight bounds for a single note, including drum symbols.
 * 
 * Note: notePos.width is the "time-proportional width" (distance to next note),
 * which is great for drop targeting but too wide for visual highlighting.
 * We use a more conservative visual width based on note duration.
 * 
 * @param notePos - Note position information
 * @returns Highlight bounds
 */
export function calculateNoteHighlightBounds(notePos: NotePosition): HighlightBounds {
  const padding = 2; // Reduced padding to prevent overlap
  const symbolOffset = 40; // Symbols are 40px above the stave middle line
  const symbolPadding = 3; // Extra padding around symbols
  const staveHeight = 100;
  const lineStartY = 40;

  // Calculate stave bounds to prevent bleeding into adjacent measures
  let staveTop: number;
  let staveBottom: number;
  let staveMiddleLineY: number;

  if (notePos.staveY !== undefined) {
    // Use stored stave Y position for accurate calculation
    staveTop = notePos.staveY;
    staveBottom = staveTop + staveHeight;
    staveMiddleLineY = staveTop + (staveHeight / 5) * 2; // Line 2 of 5-line staff
  } else {
    // Fallback: estimate stave position from note Y position
    const estimatedStaveMiddleY = notePos.y + 25;
    const lineIndex = Math.max(0, Math.round((estimatedStaveMiddleY - lineStartY - 40) / staveHeight));
    staveTop = lineStartY + lineIndex * staveHeight;
    staveBottom = staveTop + staveHeight;
    staveMiddleLineY = staveTop + (staveHeight / 5) * 2;
  }
  
  // Symbols are drawn 40px above the stave middle line
  const symbolTopY = staveMiddleLineY - symbolOffset - symbolPadding;
  
  // Use a visual width based on note duration, not the time-proportional width
  // The time-proportional width extends to the next note which causes overlap
  // Base visual width on duration: 16th = ~15px, 8th = ~20px, quarter = ~25px, etc.
  const baseNoteheadWidth = 15;
  const visualWidth = Math.min(
    notePos.width * 0.7, // Use at most 70% of the time-proportional width
    baseNoteheadWidth + (notePos.durationInSixteenths - 1) * 3 // Scale with duration
  );
  
  // Highlight should start from symbol top and extend to note bottom
  const x = notePos.x - padding;
  const y = Math.max(staveTop, symbolTopY); // Start from symbol top, but not above stave
  const width = visualWidth + (padding * 2);
  
  // Note bottom is the bottom of the note bounding box
  const noteBottomY = notePos.y + notePos.height + padding;
  
  // Height should extend from highlight top to note bottom
  const desiredHeight = noteBottomY - y;
  const maxHeight = staveBottom - y; // Don't extend below stave
  const height = Math.min(desiredHeight, maxHeight); // Clamp to stave bounds

  return { x, y, width, height };
}

/**
 * Calculate insertion line position based on drop position.
 * 
 * @param notePositions - Array of all note positions
 * @param dropPosition - Character position where pattern would be inserted
 * @returns Insertion line bounds, or null if invalid
 */
export function calculateInsertionLinePosition(
  notePositions: NotePosition[],
  dropPosition: number
): InsertionLineBounds | null {
  if (notePositions.length === 0) {
    return null;
  }

  // Find the note that contains or immediately follows dropPosition
  let insertNoteIndex = -1;
  let insertNote: NotePosition | null = null;
  let prevNote: NotePosition | null = null;

  // Find where to insert based on dropPosition
  // insertPatternAtPosition inserts at the exact character position: slice(0, position) + pattern + slice(position)
  // So we need to find the visual position that corresponds to that character position
  
  // First, check if inserting at the very beginning
  if (dropPosition === 0 && notePositions.length > 0) {
    const firstNote = notePositions[0];
    return calculateInsertionLineBounds(firstNote.x - 10, firstNote.y);
  }
  
  // Find the note that contains or immediately follows dropPosition
  // insertPatternAtPosition inserts at the exact character position
  // So if dropPosition === noteStart, we insert at the start of that note
  // If dropPosition === noteEnd, we insert after that note (before the next note if it exists)
  for (let i = 0; i < notePositions.length; i++) {
    const note = notePositions[i];
    const noteStart = note.charPosition;
    const noteEnd = noteStart + note.durationInSixteenths;

    if (dropPosition < noteStart) {
      // dropPosition is before this note - insert before this note
      insertNoteIndex = i;
      insertNote = note;
      prevNote = i > 0 ? notePositions[i - 1] : null;
      break;
    } else if (dropPosition === noteStart) {
      // dropPosition is exactly at the start of this note - insert at the start
      insertNoteIndex = i;
      insertNote = note;
      prevNote = i > 0 ? notePositions[i - 1] : null;
      break;
    } else if (dropPosition > noteStart && dropPosition < noteEnd) {
      // dropPosition is within this note - interpolate X position within the note
      insertNoteIndex = i;
      insertNote = note;
      prevNote = i > 0 ? notePositions[i - 1] : null;
      break;
    } else if (dropPosition === noteEnd) {
      // dropPosition is exactly at the end of this note
      // Check if there's a next note - if so, insert before it; if not, insert after this note
      const nextNote = i < notePositions.length - 1 ? notePositions[i + 1] : null;
      if (nextNote && nextNote.charPosition === dropPosition) {
        // Next note starts exactly where we want to insert - insert at its start
        insertNoteIndex = i + 1;
        insertNote = nextNote;
        prevNote = note;
        break;
      } else {
        // No next note or next note starts later - insert after this note
        insertNoteIndex = i;
        insertNote = note;
        prevNote = note;
        break;
      }
    }
  }

  // If no note found, insert at the end
  if (insertNoteIndex === -1) {
    const lastNote = notePositions[notePositions.length - 1];
    const lastNoteEnd = lastNote.charPosition + lastNote.durationInSixteenths;
    if (dropPosition >= lastNoteEnd) {
      // Insert after last note
      return calculateInsertionLineBounds(lastNote.x + lastNote.width + 10, lastNote.y);
    } else {
      // Shouldn't happen, but fallback
      return calculateInsertionLineBounds(lastNote.x + lastNote.width + 10, lastNote.y);
    }
  }

  if (!insertNote) {
    return null;
  }

  const noteStart = insertNote.charPosition;
  const noteEnd = noteStart + insertNote.durationInSixteenths;
  let lineX: number;
  let lineY: number;

  if (dropPosition < noteStart) {
    // Inserting before this note
    if (prevNote && Math.abs(prevNote.y - insertNote.y) < 10) {
      // Same line - calculate midpoint between previous note end and current note start
      const prevNoteEndX = prevNote.x + prevNote.width;
      lineX = (prevNoteEndX + insertNote.x) / 2;
      lineY = insertNote.y;
    } else {
      // Different lines or no previous note - insert at start of current note
      lineX = insertNote.x - 10;
      lineY = insertNote.y;
    }
  } else if (dropPosition === noteStart) {
    // Inserting exactly at the start of this note
    lineX = insertNote.x;
    lineY = insertNote.y;
  } else if (dropPosition > noteStart && dropPosition < noteEnd) {
    // dropPosition is within this note - interpolate X position
    const positionInNote = dropPosition - noteStart;
    const noteDuration = noteEnd - noteStart;
    const proportion = noteDuration > 0 ? positionInNote / noteDuration : 0;
    lineX = insertNote.x + (insertNote.width * proportion);
    lineY = insertNote.y;
  } else if (dropPosition === noteEnd) {
    // Inserting exactly after this note
    const nextNote = insertNoteIndex < notePositions.length - 1 ? notePositions[insertNoteIndex + 1] : null;
    if (nextNote && Math.abs(nextNote.y - insertNote.y) < 10) {
      // Same line - calculate midpoint between current note end and next note start
      const noteEndX = insertNote.x + insertNote.width;
      lineX = (noteEndX + nextNote.x) / 2;
      lineY = insertNote.y;
    } else {
      // Different lines or no next note - insert after current note
      lineX = insertNote.x + insertNote.width + 10;
      lineY = insertNote.y;
    }
  } else {
    // Fallback - shouldn't happen
    lineX = insertNote.x;
    lineY = insertNote.y;
  }

  return calculateInsertionLineBounds(lineX, lineY);
}

/**
 * Calculate insertion line vertical bounds based on X and Y position.
 * 
 * @param lineX - X position of the insertion line
 * @param lineY - Y position (note's Y position)
 * @returns Insertion line bounds
 */
function calculateInsertionLineBounds(lineX: number, lineY: number): InsertionLineBounds {
  const staveHeight = 100;
  const lineStartY = 40;
  const lineIndex = Math.max(0, Math.round((lineY - lineStartY) / staveHeight));
  const staveTop = lineStartY + lineIndex * staveHeight;
  const staveBottom = staveTop + staveHeight;

  // Calculate the stave middle line (line 2 of 5-line staff) where notes are positioned
  const staveMiddleLineY = staveTop + (staveHeight / 5) * 2; // Line 2 of 5-line staff
  const insertionLineY = staveMiddleLineY;

  // Calculate line bounds - extend to cover symbols but stay within stave
  const maxHeightAbove = insertionLineY - staveTop; // Maximum we can extend above
  const maxHeightBelow = staveBottom - insertionLineY; // Maximum we can extend below
  const desiredHeightAbove = 60; // Cover symbols area above notes
  const desiredHeightBelow = 50; // Cover notes and stems below

  const lineHeightAbove = Math.min(desiredHeightAbove, maxHeightAbove);
  const lineHeightBelow = Math.min(desiredHeightBelow, maxHeightBelow);
  const top = insertionLineY - lineHeightAbove;
  const bottom = insertionLineY + lineHeightBelow;

  return { x: lineX, top, bottom };
}

