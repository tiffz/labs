import type { ParsedRhythm } from '../../../rhythm/types';
import type { TimeSignature } from '../../../rhythm/types';
import type { DrumSound } from '../../../rhythm/types';

export type DrumHitPlayAt = (
  sound: DrumSound,
  audioTime: number,
  volume: number,
) => void;

export type ScheduleDrumPatternWindowParams = {
  rhythm: ParsedRhythm;
  timeSignature: TimeSignature;
  tempo: number;
  volume: number;
  /** Window in beats (fractional). */
  scheduledUpToBeats: number;
  scheduleEndBeats: number;
  /** AudioContext time at beat 0 of the transport. */
  startAudioTime: number;
  playAt: DrumHitPlayAt;
};

/**
 * Schedule drum pattern hits in a beat window — shared by DrumAccompaniment,
 * ScorePlayback drum callback, and rhythmPlayer internals.
 */
export function scheduleDrumPatternWindow({
  rhythm,
  timeSignature,
  tempo,
  volume,
  scheduledUpToBeats,
  scheduleEndBeats,
  startAudioTime,
  playAt,
}: ScheduleDrumPatternWindowParams): void {
  if (volume <= 0 || !rhythm.isValid || rhythm.measures.length === 0) return;

  const secPerBeat = 60 / tempo;
  const sixteenthsPerMeasure =
    timeSignature.denominator === 8 ? timeSignature.numerator * 2 : timeSignature.numerator * 4;
  const measureCount = rhythm.measures.length;
  const sixteenthsPerPattern = sixteenthsPerMeasure * measureCount;

  const startSixteenth = Math.max(0, scheduledUpToBeats * 4);
  const endSixteenth = scheduleEndBeats * 4;

  for (let s = Math.ceil(startSixteenth); s <= endSixteenth; s++) {
    const posInPattern =
      ((s % sixteenthsPerPattern) + sixteenthsPerPattern) % sixteenthsPerPattern;
    const measureIdx = Math.floor(posInPattern / sixteenthsPerMeasure);
    const posInMeasure = posInPattern % sixteenthsPerMeasure;
    const measure = rhythm.measures[measureIdx];
    if (!measure) continue;

    let cumPos = 0;
    for (const note of measure.notes) {
      if (cumPos === posInMeasure && note.sound !== 'rest' && note.sound !== 'simile') {
        const beatPos = s / 4;
        const audioTime = startAudioTime + beatPos * secPerBeat;
        playAt(note.sound, audioTime, volume / 100);
      }
      cumPos += note.durationInSixteenths;
      if (cumPos > posInMeasure) break;
    }
  }
}

export type DrumSchedulerCallback = (
  scheduledUpTo: number,
  scheduleEnd: number,
  startTime: number,
  tempo: number,
  audioCtx: AudioContext,
) => void;

/** Build a ScorePlayback-compatible drum callback from pattern + volume refs. */
export function createDrumPatternSchedulerCallback(
  getRhythm: () => ParsedRhythm,
  getTimeSignature: () => TimeSignature,
  getVolume: () => number,
): DrumSchedulerCallback {
  return (scheduledUpTo, scheduleEnd, startTime, tempo, audioCtx) => {
    void audioCtx;
    scheduleDrumPatternWindow({
      rhythm: getRhythm(),
      timeSignature: getTimeSignature(),
      tempo,
      volume: getVolume(),
      scheduledUpToBeats: scheduledUpTo,
      scheduleEndBeats: scheduleEnd,
      startAudioTime: startTime,
      playAt: (sound, audioTime, vol) => {
        // playAt is wired by DrumSchedulerAdapter
        drumPatternPlayAtBridge(sound, audioTime, vol);
      },
    });
  };
}

let drumPatternPlayAtBridge: DrumHitPlayAt = () => {};

export function setDrumPatternPlayAtBridge(fn: DrumHitPlayAt): void {
  drumPatternPlayAtBridge = fn;
}
