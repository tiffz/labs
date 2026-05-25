import { useEffect, useRef } from 'react';

import { CLICK_SAMPLE_URL } from '../../shared/audio/drumSampleUrls';
import { loadClickSample, playClickSampleAt, type LoadedClickSample } from '../../shared/audio/clickService';
import { ensureAudioContextRunning } from '../../shared/playback/audioContextLifecycle';
import { stanzaMetronomeClickLevels } from '../utils/stanzaMetronomeClickLevels';

let metronomeAudioContext: AudioContext | null = null;

let metronomeClickSample: LoadedClickSample | null = null;
let metronomeClickSampleLoading: Promise<LoadedClickSample | null> | null = null;

function getMetronomeAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!metronomeAudioContext || metronomeAudioContext.state === 'closed') {
    metronomeAudioContext = new Ctor();
    metronomeClickSample = null;
    metronomeClickSampleLoading = null;
  }
  return metronomeAudioContext;
}

async function ensureMetronomeClickSample(ctx: AudioContext): Promise<LoadedClickSample | null> {
  if (metronomeClickSample) return metronomeClickSample;
  if (!metronomeClickSampleLoading) {
    metronomeClickSampleLoading = loadClickSample(ctx, CLICK_SAMPLE_URL).then((s) => {
      metronomeClickSample = s;
      return s;
    });
  }
  return metronomeClickSampleLoading;
}

/**
 * Resume (or create) the shared click context. Call from a user gesture (play / toggle on)
 * so Safari and strict autoplay policies allow audible output.
 */
export function primeStanzaMetronomeAudio(): void {
  const ctx = getMetronomeAudioContext();
  if (!ctx) return;
  void ensureAudioContextRunning(ctx);
  void ensureMetronomeClickSample(ctx);
}

/**
 * Default downbeat ceiling. Raised from the historic 0.52 because users reported the click was too
 * quiet against backing tracks; the user-facing Metronome slider in the Mix multiplies this and
 * lets people pull it back down if it's too loud.
 *
 * Off-beat level and downbeat pitch lift live in {@link stanzaMetronomeClickLevels} so the accent
 * stays subtle (even clicks are easier to practice against).
 */
function playSampleClick(
  ctx: AudioContext,
  sample: LoadedClickSample,
  isDownbeat: boolean,
  userGain: number,
): void {
  const { volume, playbackRate } = stanzaMetronomeClickLevels(isDownbeat, userGain);
  if (volume <= 0) return;
  playClickSampleAt(ctx, sample, ctx.currentTime, volume, playbackRate);
}

export interface UseStanzaMetronomeSyncOptions {
  enabled: boolean;
  bpm: number | undefined;
  anchorMediaTime: number | undefined;
  getMediaTime: () => number;
  isPlaying: boolean;
  audioEnabled: boolean;
  /** Linear 0–1 multiplier applied to the click ceiling. Persisted as `StanzaSong.metronomeGain`. */
  gain: number;
  /** Mute switch from the Mix; suppresses click emission while leaving the rAF schedule running. */
  muted: boolean;
}

/**
 * Emits metronome clicks on the media timeline using `anchorMediaTime` + `bpm`.
 *
 * The hook walks beats inside a `requestAnimationFrame` loop while `isPlaying` is
 * true, comparing the current `getMediaTime()` to the last beat index it fired. On
 * a forward step it triggers a click (loud on the downbeat, quieter on the off-beats)
 * via the shared click sample loaded by `primeStanzaMetronomeAudio()`. On a backward
 * jump (loop wrap, manual seek, resume after pause) it resyncs without emitting a
 * burst of catch-up clicks.
 *
 * Cleans up the rAF when any input falls out of the playable shape (no BPM, no
 * anchor, transport paused, hook disabled).
 */
export function useStanzaMetronomeSync(opts: UseStanzaMetronomeSyncOptions): void {
  const { enabled, bpm, anchorMediaTime, getMediaTime, isPlaying, audioEnabled, gain, muted } = opts;
  const lastBeatRef = useRef<number | null>(null);
  // Read gain/mute fresh on each tick without resetting beat tracking when the user drags the
  // slider — this lets volume react in real time.
  const gainRef = useRef(gain);
  const mutedRef = useRef(muted);
  useEffect(() => {
    gainRef.current = gain;
  }, [gain]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  /** Reset beat tracking when grid or enabled state changes, or whenever transport starts/stops (pause leaves stale indices). */
  useEffect(() => {
    lastBeatRef.current = null;
  }, [anchorMediaTime, bpm, enabled, isPlaying]);

  useEffect(() => {
    if (!enabled || !bpm || bpm <= 0 || anchorMediaTime === undefined || !Number.isFinite(anchorMediaTime) || !isPlaying) {
      return;
    }
    const period = 60 / bpm;
    let raf = 0;

    const tick = () => {
      const t = getMediaTime();
      const beat = Math.floor((t - anchorMediaTime) / period + 1e-9);
      if (lastBeatRef.current === null) {
        lastBeatRef.current = beat;
      } else if (beat > lastBeatRef.current) {
        lastBeatRef.current = beat;
        if (audioEnabled && !mutedRef.current) {
          const ctx = getMetronomeAudioContext();
          if (ctx) {
            void ensureAudioContextRunning(ctx);
            const isDownbeat = ((beat % 4) + 4) % 4 === 0;
            const userGain = gainRef.current;
            void ensureMetronomeClickSample(ctx).then((sample) => {
              if (!sample) return;
              playSampleClick(ctx, sample, isDownbeat, userGain);
            });
          }
        }
      } else if (beat < lastBeatRef.current) {
        // Seek backward, loop wrap, or resume with stale ref — resync without firing a burst of clicks.
        lastBeatRef.current = beat;
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [enabled, bpm, anchorMediaTime, isPlaying, audioEnabled, getMediaTime]);
}
