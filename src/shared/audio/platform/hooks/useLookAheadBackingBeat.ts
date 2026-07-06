import { useEffect, useRef } from 'react';
import { AudioPlayer } from '../../audioPlayer';
import { LookAheadAudioScheduler } from '../scheduling/LookAheadAudioScheduler';
import { scheduleDrumPatternWindow } from '../scheduling/scheduleDrumPatternWindow';
import { rhythmPlayer } from '../../../rhythm/rhythmPlayer';
import type { DrumSound, ParsedRhythm } from '../../../rhythm/types';

export type UseLookAheadBackingBeatOptions = {
  enabled: boolean;
  pattern: ParsedRhythm | null;
  gain: number;
  soundUrls: Record<string, string>;
};

/**
 * Schedules auxiliary backing patterns on the rhythmPlayer loop transport (look-ahead).
 * Replaces reactive AudioPlayer.play() on metronome beat crossings.
 */
export function useLookAheadBackingBeat({
  enabled,
  pattern,
  gain,
  soundUrls,
}: UseLookAheadBackingBeatOptions): void {
  const playerRef = useRef<AudioPlayer | null>(null);
  const scheduledUpToRef = useRef(0);
  const schedulerRef = useRef<LookAheadAudioScheduler | null>(null);

  useEffect(() => {
    const player = new AudioPlayer({ soundUrls, enableReverb: false });
    void player.initialize().then(() => {
      playerRef.current = player;
    });
    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [soundUrls]);

  useEffect(() => {
    if (!enabled || !pattern?.isValid) {
      schedulerRef.current?.stop();
      scheduledUpToRef.current = 0;
      return;
    }

    const scheduler = new LookAheadAudioScheduler();
    schedulerRef.current = scheduler;
    scheduledUpToRef.current = 0;

    scheduler.start(() => {
      const transport = rhythmPlayer.getLoopTransportSnapshot();
      const player = playerRef.current;
      if (!transport || !player || gain <= 0) return;

      const ctx = player.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const loopDurationBeats = (transport.loopDurationSec * transport.bpm) / 60;
      const elapsedBeats = ((now - transport.audioStartTimeSec) * transport.bpm) / 60;
      const scheduleEndBeats = elapsedBeats + 0.5;

      scheduleDrumPatternWindow({
        rhythm: pattern,
        timeSignature: transport.timeSignature,
        tempo: transport.bpm,
        volume: gain * 100,
        scheduledUpToBeats: scheduledUpToRef.current % loopDurationBeats,
        scheduleEndBeats: scheduleEndBeats % loopDurationBeats || loopDurationBeats,
        startAudioTime: transport.audioStartTimeSec,
        playAt: (sound: DrumSound, audioTime, volume) => {
          if (audioTime >= now && sound !== 'rest') {
            player.playNowIfReady(sound, volume, undefined, audioTime);
          }
        },
      });

      scheduledUpToRef.current = scheduleEndBeats;
    });

    return () => {
      scheduler.stop();
      scheduledUpToRef.current = 0;
    };
  }, [enabled, pattern, gain]);
}
