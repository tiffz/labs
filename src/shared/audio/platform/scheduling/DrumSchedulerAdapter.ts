import type { DrumScheduler } from '../../../components/music/DrumAccompaniment';
import type { ParsedRhythm, TimeSignature } from '../../../rhythm/types';
import { DRUM_SAMPLE_URLS } from '../../drumSampleUrls';
import {
  createDrumPatternSchedulerCallback,
  setDrumPatternPlayAtBridge,
  type DrumSchedulerCallback,
} from './scheduleDrumPatternWindow';

/** Implements DrumAccompaniment DrumScheduler via ScorePlaybackEngine or custom playAt. */
export function createDrumSchedulerAdapter(
  playAtImpl: (soundName: string, audioTime: number, volume: number) => void,
  loadSoundImpl?: (name: string, url: string) => Promise<void>,
): DrumScheduler {
  setDrumPatternPlayAtBridge((sound, audioTime, volume) => {
    playAtImpl(sound, audioTime, volume);
  });

  return {
    loadSound: async (name, url) => {
      if (loadSoundImpl) await loadSoundImpl(name, url);
    },
    playAt: playAtImpl,
    setCallback: () => {},
  };
}

export function wireDrumAccompanimentToEngine(
  engine: {
    setDrumCallback: (cb: DrumSchedulerCallback | null) => void;
    loadDrumSound?: (name: string, url: string) => Promise<void>;
    playDrumAt?: (name: string, time: number, volume: number) => void;
  },
  getRhythm: () => ParsedRhythm,
  getTimeSignature: () => TimeSignature,
  getVolume: () => number,
): () => void {
  const playAt = (soundName: string, audioTime: number, volume: number) => {
    engine.playDrumAt?.(soundName, audioTime, volume);
  };

  for (const [name, url] of Object.entries(DRUM_SAMPLE_URLS)) {
    void engine.loadDrumSound?.(name, url);
  }

  setDrumPatternPlayAtBridge((sound, audioTime, volume) => {
    playAt(sound, audioTime, volume);
  });

  const cb = createDrumPatternSchedulerCallback(getRhythm, getTimeSignature, getVolume);
  engine.setDrumCallback(cb);
  return () => engine.setDrumCallback(null);
}
