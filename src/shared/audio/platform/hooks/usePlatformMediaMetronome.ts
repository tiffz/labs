import { useEffect, useRef } from 'react';
import { ensureAudioContextRunning } from '../../../playback/audioContextLifecycle';
import { labsPlaybackSafeCallAsync } from '../../../utils/labsPlaybackSafeCall';
import { MediaTimelineClock } from '../clocks';
import type { MetronomePreferences } from '../metronome/preferences';
import type { TimeSignature } from '../../../rhythm/types';
import {
  GridMetronomeScheduler,
  type GridMetronomePlaybackPrefs,
} from '../../metronome/gridMetronomePlayback';

let sharedClickCtx: AudioContext | null = null;

/**
 * Resume the one shared click context, creating it only if it does not exist yet.
 *
 * This used to call `new AudioContext()` **unconditionally** and overwrite `sharedClickCtx`,
 * orphaning the previous context without closing it. Since it is called from the first line of
 * Stanza's `playUnified` — which also re-runs on every loop wrap and on premature-end resume —
 * practising a looped section minted one AudioContext per pass. Chrome caps contexts per document
 * (~6) and then throws, after which the metronome and drums are silent for the rest of the session
 * while the `<audio>` element keeps playing normally. That is the "drums are often muted at the
 * start" and "drums don't play at all" report: it depends on how many times you had pressed play.
 *
 * Each orphan also leaked its `visibilitychange` / `statechange` listeners.
 */
export function primePlatformMetronomeAudio(): void {
  if (!sharedClickCtx || sharedClickCtx.state === 'closed') {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    sharedClickCtx = new Ctor();
  }
  void ensureAudioContextRunning(sharedClickCtx);
}

/** Test seam — drops the shared context so a suite can assert the no-leak invariant. */
export function __resetPlatformMetronomeAudioForTests(): void {
  sharedClickCtx = null;
}

export type UsePlatformMediaMetronomeOptions = {
  enabled: boolean;
  bpm: number | undefined;
  timeSignature: TimeSignature;
  anchorMediaTime: number | undefined;
  getMediaTime: () => number;
  isPlaying: boolean;
  audioEnabled: boolean;
  preferences: MetronomePreferences;
  muted: boolean;
};

/**
 * Media-slaved metronome with look-ahead click/voice scheduling on the subdivision grid.
 */
export function usePlatformMediaMetronome(opts: UsePlatformMediaMetronomeOptions): void {
  const {
    enabled,
    bpm,
    timeSignature,
    anchorMediaTime,
    getMediaTime,
    isPlaying,
    audioEnabled,
    preferences,
    muted,
  } = opts;

  const clockRef = useRef<MediaTimelineClock | null>(null);
  const schedulerRef = useRef(new GridMetronomeScheduler());
  const prefsRef = useRef(preferences);
  const mutedRef = useRef(muted);
  prefsRef.current = preferences;
  mutedRef.current = muted;

  useEffect(() => {
    if (!bpm || bpm <= 0 || anchorMediaTime === undefined || !Number.isFinite(anchorMediaTime)) {
      clockRef.current = null;
      return;
    }
    clockRef.current = new MediaTimelineClock({
      bpm,
      timeSignature,
      anchorMediaTime,
      getMediaTime,
    });
    clockRef.current.resyncBeatTracking();
    schedulerRef.current.configure(bpm, timeSignature, prefsRef.current, anchorMediaTime);
  }, [anchorMediaTime, bpm, timeSignature, getMediaTime]);

  useEffect(() => {
    if (!bpm || bpm <= 0 || anchorMediaTime === undefined) return;
    schedulerRef.current.configure(bpm, timeSignature, preferences, anchorMediaTime);
  }, [anchorMediaTime, bpm, timeSignature, preferences]);

  useEffect(() => {
    clockRef.current?.resyncBeatTracking();
    schedulerRef.current.reset();
  }, [enabled, isPlaying, anchorMediaTime, muted]);

  useEffect(() => {
    if (
      !enabled ||
      !bpm ||
      bpm <= 0 ||
      anchorMediaTime === undefined ||
      !Number.isFinite(anchorMediaTime) ||
      !isPlaying ||
      muted
    ) {
      return;
    }

    let raf = 0;
    const tick = () => {
      void labsPlaybackSafeCallAsync('metronome RAF tick', async () => {
        try {
          if (!audioEnabled || mutedRef.current) return;

          // Never mint a context from inside the tick — that is how the leak compounded.
          // `primePlatformMetronomeAudio` owns creation, on a user gesture.
          const ctx = sharedClickCtx;
          if (ctx && ctx.state !== 'closed') {
            const mediaTime = getMediaTime();
            const prefs = prefsRef.current as GridMetronomePlaybackPrefs;
            const legacyMetVolume = prefs.masterMuted ? 0 : prefs.masterVolume;
            await schedulerRef.current.pollTimeline(ctx, mediaTime, prefs, legacyMetVolume, 0);
          }
        } finally {
          raf = window.requestAnimationFrame(tick);
        }
      });
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, bpm, anchorMediaTime, isPlaying, audioEnabled, getMediaTime, muted]);
}
