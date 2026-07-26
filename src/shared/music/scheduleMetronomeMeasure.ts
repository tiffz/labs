import {
  scheduleClicksInBeatRange,
} from '../audio/metronome/subdivisionClickSchedule';
import type { TimeSignature } from './chordTypes';

export type ScheduleMetronomeMeasureParams = {
  /** The single shared AudioContext (ADR 0025) — same clock as chord and drum. */
  ctx: AudioContext;
  /** Absolute time (on `ctx`) for beat 0 of this measure. */
  measureStartTime: number;
  tempo: number;
  timeSignature: TimeSignature;
  /** 0..1 master click level. */
  volume?: number;
};

/** Short oscillator blip per click — mirrors ScorePlaybackEngine's sample-less click voice. */
function playClickVoice(
  ctx: AudioContext,
  time: number,
  isDownbeat: boolean,
  volumeScale: number,
): void {
  const at = Math.max(time, ctx.currentTime + 0.002);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = isDownbeat ? 1500 : 1000;
  gain.gain.value = 0.15 * volumeScale;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  gain.gain.setTargetAtTime(0, at + 0.03, 0.01);
  osc.stop(at + 0.08);
}

/**
 * Schedule one measure of beat clicks on the shared chart clock (ADR 0025). Called
 * only after {@link scheduleChartMeasure} reports the measure was scheduled (not
 * skipped-late), so clicks ride the same single transport and never fire on a
 * frozen/overdue measure — staying in sync with chords and drums.
 */
export function scheduleMetronomeMeasure(params: ScheduleMetronomeMeasureParams): void {
  const { ctx, measureStartTime, tempo, timeSignature, volume = 1 } = params;
  if (volume <= 0) return;
  const secPerBeat = 60 / tempo;
  const clicks = scheduleClicksInBeatRange({
    startBeat: 0,
    endBeat: timeSignature.numerator,
    clickMode: 'beat',
    subdivision: 'eighth',
    timeSignature,
  });
  for (const click of clicks) {
    const at = measureStartTime + click.beatPosition * secPerBeat;
    playClickVoice(ctx, at, click.subdivision === 'accent', click.volume * volume);
  }
}
