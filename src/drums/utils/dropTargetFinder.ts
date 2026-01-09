/**
 * Drop Target Finder
 * 
 * Pure function to identify which note or gap is the drop target based on cursor position.
 * This is decoupled from rendering and replacement logic.
 */

export interface NotePosition {
  measureIndex: number;
  noteIndex: number;
  charPosition: number;
  x: number;
  y: number;
  width: number;
  height: number;
  durationInSixteenths: number;
  staveY?: number; // Optional: absolute Y position of the stave (for accurate highlight calculation)
  isTiedFrom?: boolean; // This note is tied from a previous note
  isTiedTo?: boolean; // This note ties to the next note
  tiedGroupStart?: number; // Character position of the start of this tied note group
  tiedGroupEnd?: number; // Character position of the end of this tied note group (exclusive)
}

export interface DropTarget {
  measureIndex: number;
  noteIndex: number;
  charPosition: number;
  /** Exact character position based on cursor X within the note (for breaking tied notes) */
  exactCharPosition: number;
  notePos: NotePosition;
}

/**
 * Calculate the exact character position within a note based on cursor X position.
 * 
 * For tied notes (notes that cross measure boundaries), we ONLY allow dropping at
 * meaningful boundaries - the start or end of each visual note segment.
 * This prevents confusing mid-tied-note splits.
 * 
 * For regular notes, we allow dropping at the start or end of the note.
 * 
 * @param cursorX - Cursor X position
 * @param notePos - The note position info
 * @returns The exact character position, snapped to meaningful boundaries
 */
export function calculateExactCharPosition(cursorX: number, notePos: NotePosition): number {
  const noteStartX = notePos.x;
  const noteEndX = notePos.x + notePos.width;
  const noteMidX = noteStartX + (noteEndX - noteStartX) / 2;
  
  // For ALL notes (tied or regular), snap to meaningful boundaries:
  // - If cursor is in the first half of the note, snap to the START
  // - If cursor is in the second half, snap to the END
  // This creates a predictable, intuitive dropping experience
  
  if (cursorX <= noteMidX) {
    // Snap to the start of this note
    return notePos.charPosition;
  } else {
    // Snap to the end of this note (start of next position)
    return notePos.charPosition + notePos.durationInSixteenths;
  }
}

/**
 * Find the drop target note at the given cursor position.
 * 
 * Uses a simpler, more predictable algorithm:
 * 1. Find all notes within a reasonable Y distance (same visual line)
 * 2. Among those, pick the closest by X distance
 * 3. If no notes on same line, fall back to closest overall (with heavy Y weighting)
 * 
 * @param cursorX - Cursor X position relative to SVG
 * @param cursorY - Cursor Y position relative to SVG
 * @param notePositions - Array of note positions
 * @returns Drop target or null if no notes available
 */
export function findDropTarget(
  cursorX: number,
  cursorY: number,
  notePositions: NotePosition[]
): DropTarget | null {
  if (notePositions.length === 0) {
    return null;
  }

  const staveHeight = 100;
  const lineStartY = 40;
  const maxLineDistance = staveHeight * 0.5; // Tighter tolerance: 50% of stave height
  
  // Calculate cursor's stave Y position (middle of stave)
  const cursorStaveY = cursorY - 20; // Approximate: cursor Y minus offset to stave middle
  const cursorLineIndex = Math.round((cursorStaveY - lineStartY) / staveHeight);
  const cursorLineCenterY = lineStartY + cursorLineIndex * staveHeight + (staveHeight / 5) * 2;
  
  // Find notes on the same visual line (within maxLineDistance)
  const sameLineNotes: NotePosition[] = [];
  
  for (const notePos of notePositions) {
    let noteStaveY: number;
    if (notePos.staveY !== undefined) {
      noteStaveY = notePos.staveY + (staveHeight / 5) * 2; // Middle line of stave
    } else {
      noteStaveY = notePos.y + 25; // Approximate stave middle from note Y
    }
    
    const yDistance = Math.abs(cursorLineCenterY - noteStaveY);
    
    if (yDistance <= maxLineDistance) {
      sameLineNotes.push(notePos);
    }
  }
  
  // If we found notes on the same line, pick the closest by X distance
  // When cursor is in a gap between notes, prefer the note to the RIGHT (next note)
  // This ensures clicking at the start of a measure selects that measure's first note
  if (sameLineNotes.length > 0) {
    let closestNote = sameLineNotes[0];
    let minDistance = Infinity;
    
    for (const notePos of sameLineNotes) {
      const noteStartX = notePos.x;
      const noteEndX = notePos.x + notePos.width;
      
      // Calculate distance - prefer notes where cursor is within bounds
      // When at a boundary, prefer the NEXT note (more intuitive for insertion)
      let dx: number;
      if (cursorX >= noteStartX && cursorX < noteEndX) {
        // Cursor is within note bounds (exclusive end) - strongly prefer
        // Use distance from NOTE START rather than center, so boundary clicks prefer next note
        dx = (cursorX - noteStartX) * 0.01;
      } else if (cursorX <= noteStartX) {
        // Cursor is at or to the LEFT of note start - this is the NEXT note
        // When cursor is exactly at noteStartX, dx=0 (perfect match for insertion)
        dx = (noteStartX - cursorX) * 0.5;
      } else {
        // Cursor is to the RIGHT of note end - this is a PREVIOUS note
        // Use high penalty so we never prefer past notes over upcoming ones
        dx = 1000 + (cursorX - noteEndX) * 1.5;
      }
      
      if (dx < minDistance) {
        minDistance = dx;
        closestNote = notePos;
      }
    }
    
    const exactPos = calculateExactCharPosition(cursorX, closestNote);
    
    return {
      measureIndex: closestNote.measureIndex,
      noteIndex: closestNote.noteIndex,
      charPosition: closestNote.charPosition,
      exactCharPosition: exactPos,
      notePos: closestNote,
    };
  }
  
  // Fall back to closest note overall, but weight Y distance VERY heavily
  // Also prefer notes that are closer horizontally (within reasonable X distance)
  let closestNote = notePositions[0];
  let minDistance = Infinity;
  const maxReasonableXDistance = 200; // Don't consider notes more than 200px away horizontally

  for (const notePos of notePositions) {
    const noteCenterX = notePos.x + notePos.width / 2;
    const dx = Math.abs(cursorX - noteCenterX);
    
    // Skip notes that are too far horizontally
    if (dx > maxReasonableXDistance) {
      continue;
    }
    
    let noteStaveY: number;
    if (notePos.staveY !== undefined) {
      noteStaveY = notePos.staveY + (staveHeight / 5) * 2;
    } else {
      noteStaveY = notePos.y + 25;
    }
    
    const dy = cursorY - noteStaveY;
    // Weight Y distance VERY heavily (30x) to strongly prefer notes on nearby lines
    // Also weight X distance moderately (2x) to prefer horizontally closer notes
    const distance = Math.sqrt((dx * dx * 2) + (dy * dy * 30));
    
    if (distance < minDistance) {
      minDistance = distance;
      closestNote = notePos;
    }
  }

  return {
    measureIndex: closestNote.measureIndex,
    noteIndex: closestNote.noteIndex,
    charPosition: closestNote.charPosition,
    exactCharPosition: calculateExactCharPosition(cursorX, closestNote),
    notePos: closestNote,
  };
}

