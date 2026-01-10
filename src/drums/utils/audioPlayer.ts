import type { DrumSound } from '../types';
import { AudioPlayer } from '../../shared/audio/audioPlayer';

// Import audio files
import dumSound from '../assets/sounds/dum.wav';
import takSound from '../assets/sounds/tak.wav';
import kaSound from '../assets/sounds/ka.wav';
import slapSound from '../assets/sounds/slap2.wav';
import clickSound from '../assets/sounds/click.mp3';
import domesticLivingRoomIR from '../assets/sounds/domestic-living-room.mp4';

/**
 * Drum-specific audio player that wraps the shared AudioPlayer
 * with pre-configured drum sounds and reverb settings
 */
class DrumAudioPlayer {
  private player: AudioPlayer;
  private isInitialized = false;

  constructor() {
    this.player = new AudioPlayer({
      clickUrl: clickSound,
      reverbImpulseUrl: domesticLivingRoomIR,
      enableReverb: true,
    });
  }

  /**
   * Initialize the audio context and load all drum sounds
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.player.initialize();

    // Load drum sounds
    const soundUrls: Record<string, string> = {
      dum: dumSound,
      tak: takSound,
      ka: kaSound,
      slap: slapSound,
    };

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
   * Play metronome click
   */
  async playClick(volume: number = 1.0): Promise<void> {
    await this.player.playClick(volume);
  }

  /**
   * Stop all drum sounds (but not metronome)
   */
  stopAllDrumSounds(): void {
    this.player.stopAllSounds();
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
