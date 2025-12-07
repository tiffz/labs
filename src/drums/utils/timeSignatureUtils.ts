import type { TimeSignature } from '../types';

/**
 * Determines if a time signature is compound (e.g., 6/8, 9/8, 12/8)
 * Compound time signatures have /8 denominator and numerator divisible by 3
 */
export function isCompoundTimeSignature(timeSignature: TimeSignature): boolean {
  return timeSignature.denominator === 8 && timeSignature.numerator % 3 === 0;
}

/**
 * Determines if a time signature is asymmetric (e.g., 5/8, 7/8, 11/8)
 * Asymmetric time signatures have /8 denominator and numerator NOT divisible by 3
 */
export function isAsymmetricTimeSignature(timeSignature: TimeSignature): boolean {
  return timeSignature.denominator === 8 && timeSignature.numerator % 3 !== 0;
}

/**
 * Gets the default beat grouping for a time signature
 * - Compound time signatures (6/8, 9/8, 12/8): groups of 3
 * - Asymmetric time signatures: custom grouping or defaults
 * - Regular time signatures (4/4, 2/4): groups of 4 sixteenths (quarter notes)
 */
export function getDefaultBeatGrouping(timeSignature: TimeSignature): number[] {
  // If custom grouping is specified, use it
  if (timeSignature.beatGrouping && timeSignature.beatGrouping.length > 0) {
    return timeSignature.beatGrouping;
  }

  // Compound time signatures: groups of 3 eighth notes
  if (isCompoundTimeSignature(timeSignature)) {
    const numGroups = timeSignature.numerator / 3;
    return Array(numGroups).fill(3);
  }

  // Asymmetric time signatures: default groupings for common patterns
  if (isAsymmetricTimeSignature(timeSignature)) {
    return getDefaultAsymmetricGrouping(timeSignature.numerator);
  }

  // Regular time signatures (/4): groups of 4 sixteenths (quarter notes)
  if (timeSignature.denominator === 4) {
    return Array(timeSignature.numerator).fill(4);
  }

  // Fallback: single group
  return [timeSignature.numerator];
}

/**
 * Gets default grouping for common asymmetric time signatures
 */
function getDefaultAsymmetricGrouping(numerator: number): number[] {
  switch (numerator) {
    case 5:
      return [3, 2]; // 5/8 = 3+2
    case 7:
      return [3, 2, 2]; // 7/8 = 3+2+2
    case 8:
      return [3, 3, 2]; // 8/8 = 3+3+2
    case 10:
      return [3, 3, 2, 2]; // 10/8 = 3+3+2+2
    case 11:
      return [3, 3, 3, 2]; // 11/8 = 3+3+3+2
    case 13:
      return [3, 3, 3, 2, 2]; // 13/8 = 3+3+3+2+2
    default: {
      // For other values, try to group in 3s with remainder
      const groups: number[] = [];
      let remaining = numerator;
      while (remaining >= 3) {
        groups.push(3);
        remaining -= 3;
      }
      if (remaining > 0) {
        groups.push(remaining);
      }
      return groups;
    }
  }
}

/**
 * Validates that a beat grouping sums to the correct total
 */
export function validateBeatGrouping(
  grouping: number[],
  timeSignature: TimeSignature
): boolean {
  const sum = grouping.reduce((acc, val) => acc + val, 0);
  return sum === timeSignature.numerator;
}

/**
 * Parses a beat grouping string (e.g., "3+3+2") into an array of numbers
 */
export function parseBeatGrouping(input: string): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('+').map(s => s.trim());
  const numbers: number[] = [];

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num <= 0) {
      return null; // Invalid input
    }
    numbers.push(num);
  }

  return numbers.length > 0 ? numbers : null;
}

/**
 * Formats a beat grouping array as a string (e.g., [3, 3, 2] => "3+3+2")
 */
export function formatBeatGrouping(grouping: number[]): string {
  return grouping.join('+');
}

/**
 * Calculates which beat group a note position belongs to
 * @param positionInMeasure - Position in the measure (in eighth notes for /8, sixteenths for /4)
 * @param beatGrouping - Array of beat group sizes
 * @returns Object with groupIndex and positionInGroup
 */
export function getBeatGroupInfo(
  positionInMeasure: number,
  beatGrouping: number[]
): { groupIndex: number; positionInGroup: number; isFirstOfGroup: boolean } {
  let currentPosition = 0;
  
  for (let groupIndex = 0; groupIndex < beatGrouping.length; groupIndex++) {
    const groupSize = beatGrouping[groupIndex];
    const nextPosition = currentPosition + groupSize;
    
    if (positionInMeasure < nextPosition) {
      const positionInGroup = positionInMeasure - currentPosition;
      return {
        groupIndex,
        positionInGroup,
        isFirstOfGroup: positionInGroup === 0,
      };
    }
    
    currentPosition = nextPosition;
  }
  
  // Fallback (shouldn't happen with valid input)
  return {
    groupIndex: beatGrouping.length - 1,
    positionInGroup: 0,
    isFirstOfGroup: false,
  };
}

/**
 * Calculate the number of sixteenth notes per measure for a given time signature
 * @param timeSignature - The time signature to calculate for
 * @returns Number of sixteenth notes in one measure
 */
export function getSixteenthsPerMeasure(timeSignature: TimeSignature): number {
  return timeSignature.denominator === 8
    ? timeSignature.numerator * 2  // eighth notes -> sixteenths
    : timeSignature.numerator * 4;   // quarter notes -> sixteenths
}

/**
 * Calculate beat grouping in sixteenths for a given time signature
 * @param beatGrouping - Array of beat group sizes
 *   - For /4 time signatures: values are already in sixteenths (from getDefaultBeatGrouping)
 *   - For /8 time signatures: values are in eighth notes (from getDefaultBeatGrouping)
 * @param timeSignature - The time signature
 * @returns Array of beat group sizes in sixteenths
 */
export function getBeatGroupingInSixteenths(
  beatGrouping: number[],
  timeSignature: TimeSignature
): number[] {
  if (timeSignature.denominator === 8) {
    // For /8 time: beatGrouping is in eighth notes, convert to sixteenths (multiply by 2)
    return beatGrouping.map(group => group * 2);
  } else {
    // For /4 time: beatGrouping is already in sixteenths, return as-is
    return beatGrouping;
  }
}

