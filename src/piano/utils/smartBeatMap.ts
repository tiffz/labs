/**
 * SmartBeatMap — maps between beat indices and audio timestamps
 * for variable-tempo (rubato) playback.
 *
 * Built from resampled per-beat timestamps (already at the score's
 * beat rate), filtered to start from the best offset (score beat 0).
 *
 * Provides forward (beat → time) and inverse (time → beat)
 * lookups with linear interpolation between beats.
 */

export class SmartBeatMap {
  /** Beat times relative to playback start (seconds). beatTimes[0] = 0. */
  readonly beatTimes: readonly number[];
  readonly length: number;
  /** Median inter-beat interval, used for extrapolation. */
  private readonly medianInterval: number;

  /**
   * @param rawBeats  Resampled beat timestamps (seconds) at the score's beat rate
   * @param bestOffset  Audio time (seconds) where score beat 0 starts
   */
  constructor(rawBeats: number[], bestOffset: number) {
    const filtered: number[] = [];
    for (const t of rawBeats) {
      if (t >= bestOffset - 0.05) {
        filtered.push(t - bestOffset);
      }
    }

    if (filtered.length === 0 || filtered[0] > 0.05) {
      filtered.unshift(0);
    } else {
      filtered[0] = 0;
    }

    this.beatTimes = filtered;
    this.length = filtered.length;

    // Compute median interval for stable extrapolation
    if (this.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.length; i++) {
        intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      this.medianInterval = intervals[Math.floor(intervals.length / 2)];
    } else {
      this.medianInterval = 0.75; // fallback: 80 BPM
    }
  }

  /**
   * Given a (fractional) beat index, return the elapsed time in seconds.
   * Interpolates linearly between detected beats.
   * Beyond the map, extrapolates using the median interval for stability.
   */
  beatToTime(beat: number): number {
    if (this.length <= 1) return beat * this.medianInterval;
    if (beat <= 0) return this.beatTimes[0];

    const idx = Math.floor(beat);
    const frac = beat - idx;

    if (idx >= this.length - 1) {
      return this.beatTimes[this.length - 1] + (beat - (this.length - 1)) * this.medianInterval;
    }

    const t0 = this.beatTimes[idx];
    const t1 = this.beatTimes[idx + 1];
    return t0 + frac * (t1 - t0);
  }

  /**
   * Given elapsed seconds, return the fractional beat index.
   * Binary-searches the beat map and interpolates.
   */
  timeToBeat(elapsedSec: number): number {
    if (this.length <= 1) return elapsedSec / this.medianInterval;

    if (elapsedSec <= this.beatTimes[0]) return 0;
    if (elapsedSec >= this.beatTimes[this.length - 1]) {
      if (this.medianInterval <= 0) return this.length - 1;
      return (this.length - 1) + (elapsedSec - this.beatTimes[this.length - 1]) / this.medianInterval;
    }

    let lo = 0;
    let hi = this.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.beatTimes[mid] <= elapsedSec) lo = mid;
      else hi = mid;
    }

    const t0 = this.beatTimes[lo];
    const t1 = this.beatTimes[hi];
    const span = t1 - t0;
    if (span <= 0) return lo;
    return lo + (elapsedSec - t0) / span;
  }

  /**
   * Return the instantaneous BPM at the given beat index.
   * Computed from the interval between adjacent beats.
   */
  instantBpm(beat: number): number {
    if (this.length < 2) return 60 / this.medianInterval;

    const idx = Math.max(0, Math.min(Math.floor(beat), this.length - 2));
    const interval = this.beatTimes[idx + 1] - this.beatTimes[idx];
    if (interval <= 0) return 60 / this.medianInterval;
    return 60 / interval;
  }

  /**
   * Compute the average BPM across the entire map.
   */
  averageBpm(): number {
    if (this.length < 2) return 60 / this.medianInterval;
    const totalTime = this.beatTimes[this.length - 1] - this.beatTimes[0];
    if (totalTime <= 0) return 60 / this.medianInterval;
    return 60 * (this.length - 1) / totalTime;
  }
}
