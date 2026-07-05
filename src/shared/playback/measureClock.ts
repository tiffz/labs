/** Lead time before the first scheduled hit (matches rhythmPlayer startup). */
export const PLAYBACK_SCHEDULE_LEAD_MS = 50;

/** Seconds per sixteenth note at the given BPM (quarter note = beat). */
export function secPerSixteenthAtBpm(bpm: number): number {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 80;
  return 60 / safeBpm / 4;
}

/** Map a performance.now() target to an AudioContext timeline (works across contexts). */
export function perfMsToAudioContextTime(ctx: AudioContext, targetPerfMs: number): number {
  return ctx.currentTime + (targetPerfMs - performance.now()) / 1000;
}

/** Absolute AudioContext start time for chart/measure step `stepIndex`. */
export function measureStartAudioTimeFromEpoch(
  ctx: AudioContext,
  epochPerfMs: number,
  stepIndex: number,
  measureDurationMs: number,
): number {
  const targetPerfMs = epochPerfMs + stepIndex * measureDurationMs;
  return perfMsToAudioContextTime(ctx, targetPerfMs);
}
