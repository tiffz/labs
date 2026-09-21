/**
 * A note whose moment has already passed must be DROPPED, not played late.
 *
 * Web Audio clamps a `start()` in the past to "now". So when scheduling falls behind — a main
 * thread stall, a GC pause, a throttled rAF — every backlogged note fires at once on the next
 * tick. The user hears playback stop, then a burst: "it paused suddenly then when it resumed it
 * was extra fast."
 *
 * The chart path already decided this, twice, with the same reasoning:
 *   - `scheduleChartMeasure` (CHART_MEASURE_LATE_SKIP_SEC) — "never clamped to currentTime, never
 *     fired late … a frozen-clock backlog is dropped, not replayed"
 *   - `scheduleDrumMeasure` (DRUM_HIT_LATE_SKIP_SEC) — "AudioPlayer clamps late starts to 'now',
 *     which piles a measure of drums into one audible stutter"
 *
 * `ScorePlayback` — the darbuka app's own transport — never got it, which is why the burst
 * survived there. This is the shared statement of the rule so a fourth scheduler cannot miss it.
 *
 * Silence for the duration of the stall is the correct outcome: a dropped note is a gap, a
 * clamped note is a gap AND a wrong-tempo burst.
 */

/**
 * How far past its moment a note may still be scheduled.
 *
 * Small enough that a burst is impossible, large enough to absorb the sub-millisecond difference
 * between computing `audioTime` and handing it to the instrument.
 */
export const NOTE_LATE_SKIP_SEC = 0.02;

/** Is this note still early enough to schedule, rather than already overdue? */
export function isNoteStillScheduleable(
  startTime: number,
  now: number,
  toleranceSec: number = NOTE_LATE_SKIP_SEC,
): boolean {
  if (!Number.isFinite(startTime) || !Number.isFinite(now)) return false;
  return startTime >= now - toleranceSec;
}
