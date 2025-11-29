import type { DrumSound } from '../types';

// Import audio files
import dumSound from '../assets/sounds/dum.wav';
import takSound from '../assets/sounds/tak.wav';
import kaSound from '../assets/sounds/ka.wav';
import clickSound from '../assets/sounds/click.mp3';

/**
 * Audio player for drum sounds using Web Audio API for precise timing and volume control
 * Preloads all sounds and provides a simple play interface with dynamic volume
 */
class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private buffers: Map<DrumSound, AudioBuffer> = new Map();
  private clickBuffer: AudioBuffer | null = null;
  private isInitialized = false;
  private activeSources: Set<AudioBufferSourceNode> = new Set(); // Track active sound sources

  constructor() {
    // AudioContext is created lazily on first user interaction
  }

  /**
   * Initialize the audio context and load all sounds
   * Must be called after user interaction (e.g., button click)
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Load all sounds
      const soundFiles: Record<Exclude<DrumSound, 'rest'>, string> = {
        dum: dumSound,
        tak: takSound,
        ka: kaSound,
      };

      const loadPromises = Object.entries(soundFiles).map(async ([sound, src]) => {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.buffers.set(sound as DrumSound, audioBuffer);
      });

      // Also load the click sound for metronome
      const clickPromise = (async () => {
        const response = await fetch(clickSound);
        const arrayBuffer = await response.arrayBuffer();
        this.clickBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      })();

      await Promise.all([...loadPromises, clickPromise]);

      this.isInitialized = true;
    } catch (err) {
      console.error('Error initializing audio:', err);
    }
  }

  /**
   * Play a drum sound with optional volume control
   * @param sound - The drum sound to play
   * @param volume - Volume level (0.0 to 1.0), defaults to 1.0
   * @param duration - Optional duration in seconds for the note (used for fade-out on very short notes)
   */
  async play(sound: DrumSound, volume: number = 1.0, duration?: number): Promise<void> {
    if (sound === 'rest') return;

    // Initialize on first play
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.isInitialized) return;

    const buffer = this.buffers.get(sound);
    if (!buffer) return;

    try {
      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      const now = this.audioContext.currentTime;
      
      // Set initial volume
      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);

      // Only apply fade-out for very short notes (< 0.15 seconds / 150ms)
      // This prevents overlap on fast 16th notes without affecting longer notes
      if (duration !== undefined && duration > 0 && duration < 0.15) {
        // Start fade-out at 80% of the note duration
        const fadeStartTime = now + (duration * 0.8);
        const fadeEndTime = now + duration;
        
        // Exponential ramp down to near-zero (can't use 0 with exponentialRampToValueAtTime)
        gainNode.gain.setValueAtTime(volume, fadeStartTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, fadeEndTime);
      }

      // Connect: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Track this source
      this.activeSources.add(source);
      
      // Clean up when source finishes playing
      source.onended = () => {
        this.activeSources.delete(source);
      };

      // Start immediately and let it play naturally
      source.start(now);
      
      // Only stop if we applied a fade-out
      if (duration !== undefined && duration > 0 && duration < 0.15) {
        source.stop(now + duration + 0.01); // Small buffer after fade
      }
    } catch (err) {
      console.error(`Error playing ${sound} sound:`, err);
    }
  }

  /**
   * Play a metronome click sound
   * @param volume - Volume level (0.0 to 1.0), defaults to 1.0
   */
  async playClick(volume: number = 1.0): Promise<void> {
    // Initialize on first play
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.isInitialized || !this.clickBuffer) return;

    try {
      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = this.clickBuffer;

      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioContext.currentTime);

      // Connect: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start immediately
      source.start(this.audioContext.currentTime);
    } catch (err) {
      console.error('Error playing click sound:', err);
    }
  }

  /**
   * Stop all currently playing drum sounds (but not metronome clicks)
   * This is called when a new note starts to clip the previous sound
   */
  stopAllDrumSounds(): void {
    // Stop all active drum sound sources
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source may have already ended, ignore error
      }
    });
    this.activeSources.clear();
  }

  /**
   * Stop all currently playing sounds (including metronome)
   */
  stopAll(): void {
    this.stopAllDrumSounds();
  }
}

// Singleton instance
export const audioPlayer = new AudioPlayer();

