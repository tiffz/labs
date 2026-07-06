import {
  getDefaultBeatGrouping,
  getSixteenthsPerMeasure,
} from '../../rhythm/timeSignatureUtils';
import type { TimeSignature } from '../../rhythm/types';
import {
  eighthBaseSlotsPerEighth,
  sixteenthBaseSlotsPerSixteenth,
  slotsPerBeat,
  type SubdivisionLevel,
} from './types';

/**
 * Map a subdivision-grid index to a **fractional** sixteenth-note position in the
 * measure. Beat-aware (triplets divide each beat into equal thirds, not sixteenth slots).
 */
export function positionInSixteenthsForGridIndex(
  index: number,
  timeSignature: TimeSignature,
  subdivisionLevel: SubdivisionLevel,
  grouping = getDefaultBeatGrouping(timeSignature),
): number {
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  if (sixteenthsPerMeasure <= 0) return 0;

  const isEighthBase = timeSignature.denominator === 8;
  const isSixteenthBase = timeSignature.denominator === 16;

  if (isEighthBase) {
    const slotsPerEighth = eighthBaseSlotsPerEighth(subdivisionLevel);
    const sixteenthsPerEighth = 16 / 8;
    const { unitIndex, slotInUnit } = gridIndexToUnitSlot(
      index,
      grouping,
      slotsPerEighth,
    );
    return unitIndex * sixteenthsPerEighth + slotInUnit * (sixteenthsPerEighth / slotsPerEighth);
  }

  if (isSixteenthBase) {
    const slotsPerSixteenth = sixteenthBaseSlotsPerSixteenth(subdivisionLevel);
    const sixteenthsPerSixteenth = 16 / 16;
    const { unitIndex, slotInUnit } = gridIndexToUnitSlot(
      index,
      grouping,
      slotsPerSixteenth,
    );
    return (
      unitIndex * sixteenthsPerSixteenth +
      slotInUnit * (sixteenthsPerSixteenth / slotsPerSixteenth)
    );
  }

  const slots = slotsPerBeat(subdivisionLevel);
  const totalBeats = grouping.reduce((sum, groupSize) => sum + groupSize, 0);
  if (totalBeats <= 0 || slots <= 0) return 0;

  const sixteenthsPerBeat = sixteenthsPerMeasure / totalBeats;
  const beat = Math.floor(index / slots);
  const subdivInBeat = index % slots;
  return beat * sixteenthsPerBeat + subdivInBeat * (sixteenthsPerBeat / slots);
}

/** Walk beat/eighth/sixteenth units in grid build order to resolve index → unit + slot. */
function gridIndexToUnitSlot(
  index: number,
  grouping: number[],
  slotsPerUnit: number,
): { unitIndex: number; slotInUnit: number } {
  let remaining = index;
  let unitIndex = 0;

  for (const groupSize of grouping) {
    for (let unitInGroup = 0; unitInGroup < groupSize; unitInGroup += 1) {
      if (remaining < slotsPerUnit) {
        return { unitIndex, slotInUnit: remaining };
      }
      remaining -= slotsPerUnit;
      unitIndex += 1;
    }
  }

  return { unitIndex: Math.max(0, unitIndex - 1), slotInUnit: 0 };
}
