import type { DrumSound } from '../types';

// Import audio files
import dumSound from '../assets/sounds/dum.wav';
import takSound from '../assets/sounds/tak.wav';
import kaSound from '../assets/sounds/ka.wav';

/**
 * Audio player for drum sounds
 * Preloads all sounds and provides a simple play interface
 */
class AudioPlayer {
  private sounds: Map<DrumSound, HTMLAudioElement[]> = new Map();
  private poolSize = 5; // Number of audio instances per sound for polyphony

  constructor() {
    this.preloadSounds();
  }

  /**
   * Preload all drum sounds with multiple instances for overlapping playback
   */
  private preloadSounds(): void {
    const soundFiles: Record<Exclude<DrumSound, 'rest'>, string> = {
      dum: dumSound,
      tak: takSound,
      ka: kaSound,
    };

    // Create multiple instances of each sound for polyphony
    Object.entries(soundFiles).forEach(([sound, src]) => {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        pool.push(audio);
      }
      this.sounds.set(sound as DrumSound, pool);
    });
  }

  /**
   * Play a drum sound
   * Uses round-robin scheduling to support overlapping sounds
   */
  play(sound: DrumSound): void {
    if (sound === 'rest') return;

    const pool = this.sounds.get(sound);
    if (!pool) return;

    // Find an available audio instance or use the first one
    const audio = pool.find(a => a.paused) || pool[0];
    
    // Reset and play
    audio.currentTime = 0;
    const playPromise = audio.play();
    
    // Handle promise if it exists (may be undefined in test environments)
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.error(`Error playing ${sound} sound:`, err);
      });
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    this.sounds.forEach(pool => {
      pool.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    });
  }
}

// Singleton instance
export const audioPlayer = new AudioPlayer();

