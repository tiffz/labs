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
}

export interface DropTarget {
  measureIndex: number;
  noteIndex: number;
  charPosition: number;
  notePos: NotePosition;
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
  // Prefer notes where cursor is to the right of note start (more natural for dragging)
  if (sameLineNotes.length > 0) {
    let closestNote = sameLineNotes[0];
    let minDistance = Infinity;
    
    for (const notePos of sameLineNotes) {
      const noteCenterX = notePos.x + notePos.width / 2;
      const noteStartX = notePos.x;
      const noteEndX = notePos.x + notePos.width;
      
      // Calculate distance - prefer notes where cursor is within or to the right
      let dx: number;
      if (cursorX >= noteStartX && cursorX <= noteEndX) {
        // Cursor is within note bounds - strongly prefer (very low distance)
        dx = Math.abs(cursorX - noteCenterX) * 0.05;
      } else if (cursorX > noteEndX) {
        // Cursor is to the right of note - prefer this over notes to the left
        dx = (cursorX - noteEndX) * 0.5;
      } else {
        // Cursor is to the left of note - less preferred
        dx = (noteStartX - cursorX) * 1.5;
      }
      
      if (dx < minDistance) {
        minDistance = dx;
        closestNote = notePos;
      }
    }
    
    return {
      measureIndex: closestNote.measureIndex,
      noteIndex: closestNote.noteIndex,
      charPosition: closestNote.charPosition,
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
    notePos: closestNote,
  };
}

