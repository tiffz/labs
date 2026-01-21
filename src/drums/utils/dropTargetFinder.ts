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
  isImplicitRest?: boolean;
  x: number;
  y: number;
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
  const noteMidX = notePos.x + (notePos.width / 2);

  // Snap to start or end of note based on which half the cursor is in
  if (cursorX <= noteMidX) {
    return notePos.charPosition;
  } else {
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

  if (notePositions.length === 0) {
    return null;
  }

  // We used to try to categorize notes into "lines" based on hardcoded Y offsets.
  // This was fragile for wrapped lines or dynamic layouts (Bug 15).
  // Instead, we now look at ALL notes and pick the one that minimizes a weighted distance function.
  // We weight Y distance heavily so that we prioritize the correct line,
  // but we don't hard-exclude anything based on arbitrary Y bands.

  let closestNote = notePositions[0];
  let minDistance = Infinity;

  // Configuration for weighted distance
  const Y_WEIGHT = 50; // Heavily penalize vertical distance (prefer same line)
  const BOUNDS_BONUS = 0.01; // Tiny distance if within bounds (prefer exact hit)
  const NEXT_NOTE_PREFERENCE = 0.5; // Preference for next note when between notes
  const PREV_NOTE_PENALTY = 1.5; // Penalty for previous note (don't match backwards)

  // Stave visual parameters (for vertical center calculation)
  const STAVE_HEIGHT = 100;

  for (const notePos of notePositions) {
    const noteStartX = notePos.x;
    const noteEndX = notePos.x + notePos.width;

    // Calculate vertical distance from "stave center"
    // Use stored staveY if available (most accurate), otherwise guess from note Y
    let noteStaveCenterY: number;
    if (notePos.staveY !== undefined) {
      noteStaveCenterY = notePos.staveY + (STAVE_HEIGHT / 2);
    } else {
      noteStaveCenterY = notePos.y + 25; // Approximate if missing
    }

    // We adjust cursor Y to be relative to stave center too? 
    // Actually, simple DY is effectively Center-to-CursorY distance.
    // If cursor is on the line, DY is small.
    const dy = Math.abs(cursorY - noteStaveCenterY);

    // Calculate horizontal distance metric
    let dxScore: number;

    if (cursorX >= noteStartX && cursorX < noteEndX) {
      // Direct hit on note body
      dxScore = (cursorX - noteStartX) * BOUNDS_BONUS;
    } else if (cursorX <= noteStartX) {
      // To the left (aiming at this note's start)
      dxScore = (noteStartX - cursorX) * NEXT_NOTE_PREFERENCE + 0.0001;
    } else {
      // To the right (aiming past this note)
      // We generally want to avoid matching "past" notes unless we are really close
      dxScore = (cursorX - noteEndX) * PREV_NOTE_PENALTY + 0.0001;
    }

    // Combine scores
    // Distance = sqrt((dx^2) + (dy^2 * weight))
    // We use dxScore directly as a linear component for fine-tuning

    // Actually, let's stick to the simpler scalar distance logic from the fallback, 
    // but refined with the bounds checks.

    const weightedDist = Math.sqrt(Math.pow(dxScore, 2) + Math.pow(dy * Y_WEIGHT, 2));

    if (weightedDist < minDistance) {
      minDistance = weightedDist;
      closestNote = notePos;
    }
  }

  return {
    measureIndex: closestNote.measureIndex,
    noteIndex: closestNote.noteIndex,
    charPosition: closestNote.charPosition,
    exactCharPosition: calculateExactCharPosition(cursorX, closestNote),
    notePos: closestNote,
    isImplicitRest: false, // Default to false for now, logic handled in preview
    x: closestNote.x,
    y: closestNote.y
  };
}


