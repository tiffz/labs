/**
 * Analysis Validator
 *
 * Cross-references beat detection and chord analysis to validate
 * and improve the accuracy of both analyses.
 *
 * Key insight: In most music, chord changes typically happen on strong beats
 * (especially beat 1 of measures). If detected chord changes consistently
 * fall on weak beats, the beat grid may be misaligned.
 */

import type { ChordEvent } from './chordAnalyzer';

export interface AnalysisValidation {
  /** 0-1: how well chord changes align with strong beats */
  beatChordAlignment: number;
  /** Suggested beat offset correction in seconds (0 if alignment is good) */
  suggestedBeatOffset: number;
  /** Confidence boost/penalty based on alignment (-0.2 to +0.2) */
  confidenceAdjustment: number;
  /** Whether the beat grid should be adjusted */
  suggestBeatAdjustment: boolean;
  /** Detailed alignment statistics */
  alignmentStats: {
    totalChordChanges: number;
    changesOnStrongBeats: number;
    changesOnWeakBeats: number;
    averageOffsetFromBeat: number;
  };
  /** Human-readable assessment */
  assessment: string;
}

/**
 * Calculate how close a time is to the nearest beat
 * Returns the offset from the nearest beat in seconds
 */
function getOffsetFromNearestBeat(
  time: number,
  beats: number[],
  bpm: number
): { offset: number; isStrongBeat: boolean; beatIndex: number } {
  if (beats.length === 0) {
    return { offset: 0, isStrongBeat: false, beatIndex: -1 };
  }

  const beatInterval = 60 / bpm;
  let nearestBeatIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < beats.length; i++) {
    const distance = Math.abs(time - beats[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBeatIndex = i;
    }
    // Early exit if we've passed the time
    if (beats[i] > time + beatInterval) break;
  }

  const offset = time - beats[nearestBeatIndex];
  // A beat is "strong" if it's the first beat of a 4-beat measure (every 4th beat)
  const isStrongBeat = nearestBeatIndex % 4 === 0;

  return { offset, isStrongBeat, beatIndex: nearestBeatIndex };
}

/**
 * Validate analysis by checking beat/chord alignment
 */
export function validateAnalysis(
  beats: number[],
  chordChanges: ChordEvent[],
  bpm: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _beatsPerMeasure: number = 4
): AnalysisValidation {
  // Filter out 'N' (no chord) entries
  const validChordChanges = chordChanges.filter((c) => c.chord !== 'N');

  if (validChordChanges.length === 0 || beats.length === 0) {
    return {
      beatChordAlignment: 0.5,
      suggestedBeatOffset: 0,
      confidenceAdjustment: 0,
      suggestBeatAdjustment: false,
      alignmentStats: {
        totalChordChanges: 0,
        changesOnStrongBeats: 0,
        changesOnWeakBeats: 0,
        averageOffsetFromBeat: 0,
      },
      assessment: 'Insufficient data for validation',
    };
  }

  const beatInterval = 60 / bpm;
  const strongBeatThreshold = beatInterval * 0.15; // Within 15% of beat interval

  let changesOnStrongBeats = 0;
  let changesOnWeakBeats = 0;
  let totalOffset = 0;
  const offsets: number[] = [];

  for (const change of validChordChanges) {
    const { offset, isStrongBeat } = getOffsetFromNearestBeat(change.time, beats, bpm);
    const absOffset = Math.abs(offset);
    offsets.push(offset);
    totalOffset += absOffset;

    if (absOffset <= strongBeatThreshold) {
      if (isStrongBeat) {
        changesOnStrongBeats++;
      } else {
        changesOnWeakBeats++;
      }
    }
  }

  const totalChanges = validChordChanges.length;
  const averageOffset = totalOffset / totalChanges;
  const changesOnBeat = changesOnStrongBeats + changesOnWeakBeats;

  // Calculate alignment score (0-1)
  // Higher weight for strong beat alignment
  const strongBeatScore = changesOnStrongBeats / totalChanges;
  const onBeatScore = changesOnBeat / totalChanges;
  const beatChordAlignment = strongBeatScore * 0.7 + onBeatScore * 0.3;

  // Calculate suggested beat offset
  // If most chord changes have a consistent offset, suggest adjustment
  let suggestedBeatOffset = 0;
  let suggestBeatAdjustment = false;

  if (offsets.length >= 3) {
    // Calculate median offset
    const sortedOffsets = [...offsets].sort((a, b) => a - b);
    const medianOffset = sortedOffsets[Math.floor(sortedOffsets.length / 2)];

    // Check if offset is consistent (low variance)
    const variance =
      offsets.reduce((sum, o) => sum + Math.pow(o - medianOffset, 2), 0) / offsets.length;
    const stdDev = Math.sqrt(variance);

    // If offset is consistent and significant, suggest adjustment
    if (stdDev < beatInterval * 0.2 && Math.abs(medianOffset) > beatInterval * 0.1) {
      suggestedBeatOffset = medianOffset;
      suggestBeatAdjustment = true;
    }
  }

  // Calculate confidence adjustment
  let confidenceAdjustment = 0;
  if (beatChordAlignment >= 0.7) {
    // Good alignment boosts confidence
    confidenceAdjustment = (beatChordAlignment - 0.5) * 0.4; // Up to +0.2
  } else if (beatChordAlignment < 0.3) {
    // Poor alignment reduces confidence
    confidenceAdjustment = (beatChordAlignment - 0.5) * 0.4; // Down to -0.2
  }

  // Generate assessment
  let assessment: string;
  if (beatChordAlignment >= 0.7) {
    assessment = 'Excellent beat/chord alignment - high confidence in BPM detection';
  } else if (beatChordAlignment >= 0.5) {
    assessment = 'Good beat/chord alignment';
  } else if (beatChordAlignment >= 0.3) {
    assessment = 'Moderate beat/chord alignment - BPM may need minor adjustment';
  } else {
    assessment = 'Poor beat/chord alignment - consider manual BPM verification';
  }

  if (suggestBeatAdjustment) {
    const direction = suggestedBeatOffset > 0 ? 'later' : 'earlier';
    assessment += `. Beat phase appears to be ${Math.abs(suggestedBeatOffset * 1000).toFixed(0)}ms ${direction}`;
  }

  return {
    beatChordAlignment,
    suggestedBeatOffset,
    confidenceAdjustment,
    suggestBeatAdjustment,
    alignmentStats: {
      totalChordChanges: totalChanges,
      changesOnStrongBeats,
      changesOnWeakBeats,
      averageOffsetFromBeat: averageOffset,
    },
    assessment,
  };
}
