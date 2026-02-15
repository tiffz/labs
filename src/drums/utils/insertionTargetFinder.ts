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

import type { InsertionLineBounds } from './previewRenderer';

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
 * Calculate insertion line bounds from a gap.
 * 
 * The insertion line is always vertically centered on the stave with fixed extents,
 * since insertion has no vertical positioning component — only the horizontal (X)
 * position matters.
 */
export function calculateInsertionLineFromGap(gap: Gap): InsertionLineBounds {
  const staveHeight = 100;
  const lineStartY = 40;
  const staveTop = lineStartY + gap.lineIndex * staveHeight;
  const staveMiddleLineY = staveTop + (staveHeight / 5) * 2;
  
  // X position: midpoint of the gap
  const lineX = (gap.xStart + gap.xEnd) / 2;
  
  // Fixed vertical extents, nudged slightly below stave middle line.
  // Shorter than the full stave height so it reads as a subtle indicator, not a barline.
  const top = staveMiddleLineY - 25;
  const bottom = staveMiddleLineY + 35;
  
  return { x: lineX, top, bottom };
}

