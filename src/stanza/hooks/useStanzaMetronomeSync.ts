import { useEffect, useRef } from 'react';

import { CLICK_SAMPLE_URL } from '../../shared/audio/drumSampleUrls';
import { loadClickSample, playClickSampleAt, type LoadedClickSample } from '../../shared/audio/clickService';
import { ensureAudioContextRunning } from '../../shared/playback/audioContextLifecycle';

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

function playSampleClick(ctx: AudioContext, sample: LoadedClickSample, isDownbeat: boolean): void {
  const base = 0.52;
  const vol = isDownbeat ? base : base * 0.42;
  playClickSampleAt(ctx, sample, ctx.currentTime, vol, isDownbeat ? 1.28 : 1);
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
export function useStanzaMetronomeSync(
  enabled: boolean,
  bpm: number | undefined,
  anchorMediaTime: number | undefined,
  getMediaTime: () => number,
  isPlaying: boolean,
  audioEnabled: boolean,
): void {
  const lastBeatRef = useRef<number | null>(null);

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
        if (audioEnabled) {
          const ctx = getMetronomeAudioContext();
          if (ctx) {
            void ensureAudioContextRunning(ctx);
            const isDownbeat = ((beat % 4) + 4) % 4 === 0;
            void ensureMetronomeClickSample(ctx).then((sample) => {
              if (!sample) return;
              playSampleClick(ctx, sample, isDownbeat);
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
