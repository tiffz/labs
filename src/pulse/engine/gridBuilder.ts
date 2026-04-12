import type { TimeSignature } from '../../shared/rhythm/types';
import type { SubdivisionType, SubdivisionLevel, VoiceMode } from './types';
import { eighthBaseSlotsPerEighth } from './types';
import { syllableForPosition, takadimiLabelForPosition } from './syllableMap';

export interface SubdivGridEntry {
  subdivision: SubdivisionType;
  sampleId: string;
  isGroupStart: boolean;
  groupIndex: number;
  beatIndex: number;
  measureBeat: number;
}

export interface GridBuilderParams {
  timeSignature: TimeSignature;
  grouping: number[];
  voiceMode: VoiceMode;
  subdivisionLevel: SubdivisionLevel;
  compound: boolean;
}

export function buildSubdivisionGrid(params: GridBuilderParams): SubdivGridEntry[] {
  const grid: SubdivGridEntry[] = [];
  buildSimpleGrid(grid, params);
  return grid;
}

function buildSimpleGrid(grid: SubdivGridEntry[], params: GridBuilderParams): void {
  const { grouping, voiceMode, subdivisionLevel: level, timeSignature } = params;
  const takadimi = voiceMode === 'takadimi';
  const isEighthBase = timeSignature.denominator === 8;
  const slotsPerEighth = isEighthBase ? eighthBaseSlotsPerEighth(level) : 0;
  let subdivIndex = 0;
  let globalBeatNumber = 0;

  if (isEighthBase) {
    for (let gi = 0; gi < grouping.length; gi++) {
      const groupSize = grouping[gi];
      const groupLength = groupSize * slotsPerEighth;
      let groupSlotIdx = 0;
      for (let eighthInGroup = 0; eighthInGroup < groupSize; eighthInGroup++) {
        globalBeatNumber++;
        const isGroupStartEighth = eighthInGroup === 0;
        for (let s = 0; s < slotsPerEighth; s++) {
          const isFirstOfMeasure = gi === 0 && eighthInGroup === 0 && s === 0;
          const isGroupStart = isGroupStartEighth && s === 0;
          const isEighthStart = s === 0;

          let subdivision: SubdivisionType;
          let sampleId: string;

          if (isEighthStart) {
            subdivision = isFirstOfMeasure ? 'accent' : (isGroupStart ? 'quarter' : 'eighth');
          } else {
            subdivision = 'sixteenth';
          }

          if (takadimi) {
            sampleId = takadimiLabelForPosition(groupLength, groupSlotIdx);
          } else {
            sampleId = syllableForPosition(groupLength, groupSlotIdx, gi + 1).sampleId;
          }

          grid.push({
            subdivision,
            sampleId,
            isGroupStart,
            groupIndex: gi,
            beatIndex: subdivIndex,
            measureBeat: globalBeatNumber - 1,
          });
          subdivIndex++;
          groupSlotIdx++;
        }
      }
    }
  } else {
    for (let gi = 0; gi < grouping.length; gi++) {
      const groupSize = grouping[gi];
      for (let beatInGroup = 0; beatInGroup < groupSize; beatInGroup++) {
        globalBeatNumber++;
        for (let subdivPos = 0; subdivPos < level; subdivPos++) {
          const isFirstBeatOfMeasure = gi === 0 && beatInGroup === 0 && subdivPos === 0;
          const isBeatStart = subdivPos === 0;
          const isGroupStart = beatInGroup === 0 && subdivPos === 0;

          let subdivision: SubdivisionType;
          let sampleId: string;

          if (takadimi) {
            if (isBeatStart) {
              subdivision = isFirstBeatOfMeasure ? 'accent' : 'quarter';
            } else {
              subdivision = subdivisionTypeForPos(level, subdivPos);
            }
            sampleId = takadimiLabelForPosition(level, subdivPos);
          } else {
            if (isBeatStart) {
              subdivision = isFirstBeatOfMeasure ? 'accent' : 'quarter';
            } else {
              subdivision = subdivisionTypeForPos(level, subdivPos);
            }
            sampleId = syllableForPosition(level, subdivPos, globalBeatNumber).sampleId;
          }

          grid.push({
            subdivision,
            sampleId,
            isGroupStart,
            groupIndex: gi,
            beatIndex: subdivIndex,
            measureBeat: globalBeatNumber - 1,
          });
          subdivIndex++;
        }
      }
    }
  }
}

/**
 * Returns the subdivision type for a non-beat-start position.
 * Mirrors the subdivision assignment from subdivEntryForPos without the sampleId.
 */
function subdivisionTypeForPos(level: SubdivisionLevel, subdivPos: number): SubdivisionType {
  if (level <= 3) return 'eighth';
  return subdivPos === 2 ? 'eighth' : 'sixteenth';
}

