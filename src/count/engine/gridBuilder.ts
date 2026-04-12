import type { TimeSignature } from '../../shared/rhythm/types';
import type { SubdivisionType, SubdivisionLevel, VoiceMode } from './types';
import { eighthBaseSlotsPerEighth, slotsPerBeat } from './types';
import { syllableForPosition, takadimiLabelForPosition } from './syllableMap';

export interface SubdivGridEntry {
  subdivision: SubdivisionType;
  sampleId: string;
  isGroupStart: boolean;
  groupIndex: number;
  beatIndex: number;
  measureBeat: number;
  silent?: boolean;
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
  const slots = isEighthBase ? eighthBaseSlotsPerEighth(level) : slotsPerBeat(level);
  let subdivIndex = 0;
  let globalBeatNumber = 0;

  if (isEighthBase) {
    for (let gi = 0; gi < grouping.length; gi++) {
      const groupSize = grouping[gi];
      const groupLength = groupSize * slots;
      let groupSlotIdx = 0;
      for (let eighthInGroup = 0; eighthInGroup < groupSize; eighthInGroup++) {
        globalBeatNumber++;
        const isGroupStartEighth = eighthInGroup === 0;
        for (let s = 0; s < slots; s++) {
          const isFirstOfMeasure = gi === 0 && eighthInGroup === 0 && s === 0;
          const isGroupStart = isGroupStartEighth && s === 0;
          const isEighthStart = s === 0;

          let subdivision: SubdivisionType;
          if (isEighthStart) {
            subdivision = isFirstOfMeasure ? 'accent' : (isGroupStart ? 'quarter' : 'eighth');
          } else {
            subdivision = 'sixteenth';
          }

          const sampleId = takadimi
            ? takadimiLabelForPosition(groupLength, groupSlotIdx)
            : syllableForPosition(groupLength, groupSlotIdx, gi + 1).sampleId;

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
        for (let subdivPos = 0; subdivPos < slots; subdivPos++) {
          const isFirstBeatOfMeasure = gi === 0 && beatInGroup === 0 && subdivPos === 0;
          const isBeatStart = subdivPos === 0;
          const isGroupStart = beatInGroup === 0 && subdivPos === 0;

          let subdivision: SubdivisionType;
          if (isBeatStart) {
            subdivision = isFirstBeatOfMeasure ? 'accent' : 'quarter';
          } else {
            subdivision = subdivisionTypeForPos(level, subdivPos);
          }

          const isSwingSilent = level === 'swing8' && subdivPos === 1;

          let sampleId: string;
          if (takadimi) {
            sampleId = takadimiLabelForPosition(slots, subdivPos);
          } else if (level === 'swing8' && subdivPos === 2) {
            sampleId = 'uh';
          } else {
            sampleId = syllableForPosition(slots, subdivPos, globalBeatNumber).sampleId;
          }

          grid.push({
            subdivision,
            sampleId,
            isGroupStart,
            groupIndex: gi,
            beatIndex: subdivIndex,
            measureBeat: globalBeatNumber - 1,
            silent: isSwingSilent || undefined,
          });
          subdivIndex++;
        }
      }
    }
  }
}

function subdivisionTypeForPos(level: SubdivisionLevel, subdivPos: number): SubdivisionType {
  if (level === 'swing8') return 'eighth';
  if (typeof level === 'number' && level <= 3) return 'eighth';
  return subdivPos === 2 ? 'eighth' : 'sixteenth';
}
