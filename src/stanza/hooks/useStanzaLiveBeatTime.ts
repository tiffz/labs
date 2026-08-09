import { useEffect, useRef, useState } from 'react';

/**
 * Beat-relative playhead for the drum highlight, read from the SAME live clock the drum audio
 * schedules against.
 *
 * The highlight used to derive from `playback.currentTime`, which is React state written by the
 * media element's `timeupdate` event — a ~4 Hz signal. The audio scheduler reads
 * `readLiveTransportTime()` every rAF. Two clocks for one position: at 120 BPM a beat is 500 ms, so
 * a 250 ms-granular highlight can sit half a beat behind the sound. That is the "drum highlight is
 * not synchronized with the audio" report, and no amount of scheduler tuning could fix it, because
 * the visual was never reading the scheduler's clock.
 *
 * Sampling the live clock at rAF is correct but would re-render at 60 Hz on a screen the owner
 * already finds slow. So the value only changes when the quantized SUBDIVISION changes — at 120 BPM
 * in 16ths that is 8 updates/second, matching how often the highlight can actually move.
 */
export function useStanzaLiveBeatTime(opts: {
  isPlaying: boolean;
  /** Live transport clock — the same `getTime` handed to the drum scheduler. */
  getTime: () => number;
  anchorMediaTime: number;
  bpm: number;
  /** Steps per beat the highlight can distinguish (16ths in 4/4 → 4). */
  subdivisionsPerBeat?: number;
  /** Fallback when paused: the React snapshot is fine when nothing is moving. */
  fallbackTime: number;
}): number {
  const { isPlaying, getTime, anchorMediaTime, bpm, fallbackTime } = opts;
  const subdivisionsPerBeat = opts.subdivisionsPerBeat ?? 4;

  const [beatTime, setBeatTime] = useState(() => Math.max(0, fallbackTime - anchorMediaTime));

  // Mirrored so the rAF registers once and still reads fresh values.
  const ref = useRef({ getTime, anchorMediaTime, bpm, subdivisionsPerBeat });
  ref.current = { getTime, anchorMediaTime, bpm, subdivisionsPerBeat };

  useEffect(() => {
    if (!isPlaying) {
      setBeatTime(Math.max(0, fallbackTime - anchorMediaTime));
      return undefined;
    }
    let raf = 0;
    let lastStep = Number.NaN;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const { getTime: read, anchorMediaTime: anchor, bpm: tempo, subdivisionsPerBeat: sub } =
        ref.current;
      if (tempo > 0 && Number.isFinite(tempo)) {
        const t = Math.max(0, read() - anchor);
        const stepDuration = 60 / tempo / sub;
        const step = Math.floor(t / stepDuration);
        if (step !== lastStep) {
          lastStep = step;
          setBeatTime(t);
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
    // `fallbackTime` intentionally omitted: it changes at 4 Hz and would restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, anchorMediaTime]);

  return beatTime;
}
