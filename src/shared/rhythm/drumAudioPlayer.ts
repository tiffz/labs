import type { DrumSound } from './types';
import { AudioPlayer } from '../audio/audioPlayer';
import { CLICK_SAMPLE_URL, DRUM_SAMPLE_URLS } from '../audio/drumSampleUrls';

/**
 * Drum-specific audio player that wraps the shared AudioPlayer
 * with pre-configured drum sounds and reverb settings
 */
class DrumAudioPlayer {
  private player: AudioPlayer;
  private isInitialized = false;

  constructor() {
    this.player = new AudioPlayer({
      clickUrl: CLICK_SAMPLE_URL,
      enableReverb: false,
    });
  }

  /**
   * Initialize the audio context and load all drum sounds
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.player.initialize();

    // Load drum sounds
    const soundUrls: Record<string, string> = { ...DRUM_SAMPLE_URLS };

    await this.player.loadAdditionalSounds(soundUrls);
    this.isInitialized = true;
  }

  /**
   * Ensure the AudioContext is running
   */
  async ensureResumed(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.player.ensureResumed();
  }

  /**
   * Check if audio is healthy
   */
  isHealthy(): boolean {
    return this.player.isHealthy();
  }

  /**
   * Get current AudioContext state
   */
  getState(): AudioContextState | 'uninitialized' {
    return this.player.getState();
  }

  /**
   * Set reverb strength (0-100)
   */
  setReverbStrength(strength: number): void {
    this.player.setReverbStrength(strength);
  }

  /**
   * Play a drum sound
   */
  async play(sound: DrumSound, volume: number = 1.0, duration?: number): Promise<void> {
    if (sound === 'rest') return;
    await this.player.play(sound, volume, duration);
  }

  /**
   * Fast playback path for hot scheduling loops.
   * Caller must ensure playback has already initialized/resumed audio.
   *
   * @param startTime - Optional precise AudioContext time.
   */
  playNowIfReady(sound: DrumSound, volume: number = 1.0, duration?: number, startTime?: number): void {
    if (sound === 'rest') return;
    this.player.playNowIfReady(sound, volume, duration, startTime);
  }

  /**
   * Play metronome click
   */
  async playClick(volume: number = 1.0): Promise<void> {
    await this.player.playClick(volume);
  }

  /**
   * Fast click playback path for hot scheduling loops.
   *
   * @param startTime - Optional precise AudioContext time.
   */
  playClickNowIfReady(volume: number = 1.0, startTime?: number): void {
    this.player.playClickNowIfReady(volume, startTime);
  }

  /**
   * Expose the underlying AudioContext (e.g. for reading currentTime).
   */
  getAudioContext(): AudioContext | null {
    return this.player.getAudioContext();
  }

  /**
   * Stop all drum sounds (but not metronome).
   *
   * @param atTime - Optional AudioContext time for scheduled choke.
   */
  stopAllDrumSounds(atTime?: number): void {
    this.player.stopAllSounds(atTime);
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.player.stopAll();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.player.destroy();
    this.isInitialized = false;
  }
}

// Singleton instance for backward compatibility
export const audioPlayer = new DrumAudioPlayer();
