/**
 * `HTMLMediaElement.duration` is `NaN` until metadata is available; callers must not use `duration || 0`
 * on `timeupdate` or they will wipe a previously known duration.
 */
export function readPositiveFiniteMediaDurationSec(el: HTMLMediaElement): number | null {
  const d = el.duration;
  return Number.isFinite(d) && d > 0 ? d : null;
}

/** Last end of the seekable range (often more accurate than early VBR metadata duration). */
export function readMediaSeekableEndSec(el: HTMLMediaElement): number | null {
  try {
    const n = el.seekable?.length ?? 0;
    if (n <= 0) return null;
    const end = el.seekable.end(n - 1);
    return Number.isFinite(end) && end > 0 ? end : null;
  } catch {
    return null;
  }
}

/** Last end of the buffered range — evidence that more media exists past a premature `ended`. */
export function readMediaBufferedEndSec(el: HTMLMediaElement): number | null {
  try {
    const n = el.buffered?.length ?? 0;
    if (n <= 0) return null;
    const end = el.buffered.end(n - 1);
    return Number.isFinite(end) && end > 0 ? end : null;
  } catch {
    return null;
  }
}

/** Best transport duration from the element: max(metadata, seekable end). */
export function readBestKnownMediaDurationSec(el: HTMLMediaElement): number | null {
  const meta = readPositiveFiniteMediaDurationSec(el);
  const seekable = readMediaSeekableEndSec(el);
  if (meta == null && seekable == null) return null;
  return Math.max(meta ?? 0, seekable ?? 0);
}

const PREMATURE_END_EPS_SEC = 0.05;

export type PrematureMediaEndResume = {
  shouldResume: boolean;
  seekTo: number;
  nextDuration: number;
};

/**
 * HTML5 (especially VBR MP3) can fire `ended` when `currentTime` reaches a short metadata
 * duration even though more audio remains. Resume only with **evidence**:
 * seekable/buffered past the freeze, or a known horizon (decoded AudioBuffer / fingerprint).
 *
 * Do not speculative-nudge without evidence — that hides real EOF and erodes trust.
 */
export function resolvePrematureMediaEndResume(opts: {
  currentTime: number;
  reportedDuration: number | null;
  seekableEnd: number | null;
  bufferedEnd: number | null;
  /** Decoded buffer / fingerprint / grown transport — may exceed element metadata. */
  knownHorizonSec?: number | null;
}): PrematureMediaEndResume | null {
  const t = opts.currentTime;
  if (!Number.isFinite(t) || t < 0) return null;

  const reported = opts.reportedDuration;
  const seekable = opts.seekableEnd;
  const buffered = opts.bufferedEnd;
  const known =
    opts.knownHorizonSec != null && Number.isFinite(opts.knownHorizonSec) && opts.knownHorizonSec > 0
      ? opts.knownHorizonSec
      : null;

  const rangeHorizon = Math.max(reported ?? 0, seekable ?? 0, buffered ?? 0);
  const horizon = Math.max(rangeHorizon, known ?? 0);
  if (!(horizon > t + PREMATURE_END_EPS_SEC)) return null;

  const pastReported =
    reported == null || !Number.isFinite(reported) || t >= reported - PREMATURE_END_EPS_SEC;
  if (!pastReported) return null;

  const hasRangeEvidence =
    (seekable != null && seekable > t + PREMATURE_END_EPS_SEC) ||
    (buffered != null && buffered > t + PREMATURE_END_EPS_SEC);
  const hasKnownHorizonEvidence = known != null && known > t + PREMATURE_END_EPS_SEC;
  if (!hasRangeEvidence && !hasKnownHorizonEvidence) return null;

  const seekTo = Math.min(t + 0.05, horizon - PREMATURE_END_EPS_SEC);
  if (!(seekTo > t + 0.001)) return null;

  return {
    shouldResume: true,
    seekTo: Math.max(0, seekTo),
    nextDuration: horizon,
  };
}
