/**
 * `HTMLMediaElement.duration` is `NaN` until metadata is available; callers must not use `duration || 0`
 * on `timeupdate` or they will wipe a previously known duration.
 */
export function readPositiveFiniteMediaDurationSec(el: HTMLMediaElement): number | null {
  const d = el.duration;
  return Number.isFinite(d) && d > 0 ? d : null;
}
