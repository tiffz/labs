import type { TimeSignature } from '../../rhythm/types';
import {
  getDefaultBeatGrouping,
  parseBeatGrouping,
} from '../../rhythm/timeSignatureUtils';
import type { SubdivisionLevel, VoiceMode } from './types';
import { eighthBaseSlotsPerEighth, slotsPerBeat } from './types';
import { syllableForPosition, takadimiLabelForPosition } from './syllableMap';

export type MetronomeRailLabel = {
  label: string;
  slotIndex: number;
  isAccent: boolean;
  isBeat: boolean;
  isSwingSilent: boolean;
};

/** One measure of counting labels for a dense metronome rail (Count / Stanza). */
export function buildMetronomeMeasureLabels(params: {
  timeSignature: TimeSignature;
  subdivisionLevel: SubdivisionLevel;
  voiceMode: VoiceMode;
  beatGrouping?: string;
}): MetronomeRailLabel[] {
  const { timeSignature, subdivisionLevel, voiceMode, beatGrouping } = params;

  const groups = (() => {
    if (beatGrouping) {
      const parsed = parseBeatGrouping(beatGrouping);
      if (parsed) return parsed;
    }
    return getDefaultBeatGrouping(timeSignature);
  })();

  const takadimi = voiceMode === 'takadimi';
  const isSwing = subdivisionLevel === 'swing8';
  const isEighthBase = timeSignature.denominator === 8;
  const result: MetronomeRailLabel[] = [];
  let flatIdx = 0;

  if (isEighthBase) {
    const slots = eighthBaseSlotsPerEighth(subdivisionLevel);
    for (let gi = 0; gi < groups.length; gi++) {
      const groupSize = groups[gi];
      const groupLength = groupSize * slots;
      let groupSlotIdx = 0;
      for (let b = 0; b < groupSize; b++) {
        for (let s = 0; s < slots; s++) {
          const label = takadimi
            ? takadimiLabelForPosition(groupLength, groupSlotIdx)
            : syllableForPosition(groupLength, groupSlotIdx, gi + 1).label;
          result.push({
            label,
            slotIndex: flatIdx,
            isAccent: gi === 0 && b === 0 && s === 0,
            isBeat: s === 0,
            isSwingSilent: false,
          });
          flatIdx++;
          groupSlotIdx++;
        }
      }
    }
    return result;
  }

  const slots = slotsPerBeat(subdivisionLevel);
  let globalBeatNum = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const groupSize = groups[gi];
    for (let beat = 0; beat < groupSize; beat++) {
      globalBeatNum++;
      for (let s = 0; s < slots; s++) {
        let label: string;
        if (takadimi) {
          label = takadimiLabelForPosition(slots, s);
        } else if (isSwing && s === 1) {
          label = '+';
        } else if (isSwing && s === 2) {
          label = 'a';
        } else {
          label = syllableForPosition(slots, s, globalBeatNum).label;
        }
        result.push({
          label,
          slotIndex: flatIdx,
          isAccent: gi === 0 && beat === 0 && s === 0,
          isBeat: s === 0,
          isSwingSilent: isSwing && s === 1,
        });
        flatIdx++;
      }
    }
  }

  return result;
}

export function activeMetronomeRailSlotIndex(params: {
  mediaTime: number;
  anchorMediaTime: number;
  bpm: number;
  slotCount: number;
  slotDurationSec: number;
}): number {
  const { mediaTime, anchorMediaTime, bpm, slotCount, slotDurationSec } = params;
  if (slotCount <= 0 || bpm <= 0 || slotDurationSec <= 0) return 0;
  const globalSlot = Math.floor((mediaTime - anchorMediaTime) / slotDurationSec + 1e-9);
  return ((globalSlot % slotCount) + slotCount) % slotCount;
}
