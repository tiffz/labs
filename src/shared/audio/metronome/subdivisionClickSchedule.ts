import type { TimeSignature } from '../../rhythm/types';
import type { SubdivisionType } from './types';

export type MetronomeClickMode = 'beat' | 'subdivision';

export interface ScheduledClick {
  /** Quarter-note beat position (e.g. 0, 0.333…, 1). */
  beatPosition: number;
  subdivision: SubdivisionType;
  /** Relative volume multiplier before master/metronome gain. */
  volume: number;
  /** Playback-rate multiplier for click sample (weaker clicks slightly higher). */
  playbackRate: number;
}

/** Map scales curriculum subdivision modes to grid slots per quarter beat. */
export function slotsPerQuarterBeat(subdivision: 'eighth' | 'triplet' | 'sixteenth'): number {
  switch (subdivision) {
    case 'eighth': return 2;
    case 'triplet': return 3;
    case 'sixteenth': return 4;
  }
}

/**
 * Classify a click for accent hierarchy — mirrors {@link MetronomeEngine.scheduleClick}.
 */
export function clickVolumeForSubdivision(subdivision: SubdivisionType, baseVolume = 1): {
  volume: number;
  playbackRate: number;
} {
  const isStrong = subdivision === 'accent' || subdivision === 'quarter';
  return {
    volume: isStrong ? baseVolume : baseVolume * 0.8,
    playbackRate: isStrong ? 1.0 : 1.5,
  };
}

function subdivisionTypeAtSlot(
  slotIndex: number,
  slotsPerBeat: number,
  beatIndexInMeasure: number,
): SubdivisionType {
  if (slotIndex === 0) {
    return beatIndexInMeasure === 0 ? 'accent' : 'quarter';
  }
  if (slotsPerBeat <= 2) return 'eighth';
  if (slotsPerBeat === 3) return 'eighth';
  return slotIndex === 2 ? 'eighth' : 'sixteenth';
}

/**
 * Enumerate metronome clicks between two quarter-note beat positions (inclusive
 * of start, exclusive of end) for scored playback / count-in.
 */
export function scheduleClicksInBeatRange(params: {
  startBeat: number;
  endBeat: number;
  clickMode: MetronomeClickMode;
  subdivision: 'eighth' | 'triplet' | 'sixteenth';
  timeSignature?: TimeSignature;
}): ScheduledClick[] {
  const { startBeat, endBeat, clickMode, subdivision } = params;
  const timeSignature = params.timeSignature ?? { numerator: 4, denominator: 4 };
  const slots = slotsPerQuarterBeat(subdivision);
  const step = clickMode === 'beat' ? 1 : 1 / slots;
  const clicks: ScheduledClick[] = [];
  const beatsPerMeasure = timeSignature.numerator;

  const first = Math.ceil(Math.max(startBeat, 0) / step) * step;
  for (let b = first; b < endBeat - 1e-9; b += step) {
    if (b < 0) continue;
    const beatIndexInMeasure = Math.floor(b + 1e-9) % beatsPerMeasure;
    const slotIndex = Math.round((b - Math.floor(b + 1e-9)) * slots) % slots;
    const subdivType = subdivisionTypeAtSlot(slotIndex, slots, beatIndexInMeasure);
    const { volume, playbackRate } = clickVolumeForSubdivision(subdivType);
    clicks.push({
      beatPosition: b,
      subdivision: subdivType,
      volume,
      playbackRate,
    });
  }
  return clicks;
}
