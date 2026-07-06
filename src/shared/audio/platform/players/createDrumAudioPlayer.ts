import { AudioPlayer } from '../../audioPlayer';
import { CLICK_SAMPLE_URL, DRUM_SAMPLE_URLS } from '../../drumSampleUrls';
import type { DrumSound } from '../../../rhythm/types';

export type CreateDrumAudioPlayerOptions = {
  enableReverb?: boolean;
  includeClick?: boolean;
  /** When true, reuse a module-level singleton (rhythmPlayer path). */
  singleton?: boolean;
};

let rhythmSingleton: DrumAudioPlayerFacade | null = null;

export class DrumAudioPlayerFacade {
  private player: AudioPlayer;
  private initialized = false;

  constructor(options: CreateDrumAudioPlayerOptions = {}) {
    this.player = new AudioPlayer({
      clickUrl: options.includeClick !== false ? CLICK_SAMPLE_URL : undefined,
      soundUrls: { ...DRUM_SAMPLE_URLS },
      enableReverb: options.enableReverb ?? false,
    });
  }

  async ensureReady(): Promise<boolean> {
    if (!this.initialized) {
      await this.player.initialize();
      this.initialized = true;
    }
    return this.player.ensureResumed();
  }

  getAudioContext(): AudioContext | null {
    return this.player.getAudioContext();
  }

  playNowIfReady(sound: DrumSound, volume = 1, duration?: number, startTime?: number): void {
    if (sound === 'rest') return;
    this.player.playNowIfReady(sound, volume, duration, startTime);
  }

  playClickNowIfReady(volume = 1, startTime?: number): void {
    this.player.playClickNowIfReady(volume, startTime);
  }

  setReverbStrength(strength: number): void {
    this.player.setReverbStrength(strength);
  }

  stopAll(): void {
    this.player.stopAll();
  }

  destroy(): void {
    this.player.destroy();
    this.initialized = false;
  }

  /** Underlying player for chart playback compatibility. */
  get underlying(): AudioPlayer {
    return this.player;
  }
}

export function createDrumAudioPlayer(
  options: CreateDrumAudioPlayerOptions = {},
): DrumAudioPlayerFacade {
  if (options.singleton) {
    if (!rhythmSingleton) {
      rhythmSingleton = new DrumAudioPlayerFacade(options);
    }
    return rhythmSingleton;
  }
  return new DrumAudioPlayerFacade(options);
}
