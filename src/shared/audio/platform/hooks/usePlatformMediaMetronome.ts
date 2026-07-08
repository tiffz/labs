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

function getClickContext(): AudioContext | null {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

let sharedClickCtx: AudioContext | null = null;

export function primePlatformMetronomeAudio(): void {
  const ctx = getClickContext();
  if (!ctx) return;
  void ensureAudioContextRunning(ctx);
  sharedClickCtx = ctx;
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

          const ctx = sharedClickCtx ?? getClickContext();
          if (ctx) {
            sharedClickCtx = ctx;
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
