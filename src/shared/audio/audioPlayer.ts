import { createReverb, updateReverbLevel, convertReverbStrengthToWetLevel, type ReverbNodes } from './reverb';

/**
 * Configuration for the audio player
 */
export interface AudioPlayerConfig {
  /** Map of sound names to URLs for loading */
  soundUrls?: Record<string, string>;
  /** URL for metronome click sound */
  clickUrl?: string;
  /** URL for reverb impulse response */
  reverbImpulseUrl?: string;
  /** Whether to enable reverb by default */
  enableReverb?: boolean;
}

/**
 * Audio player using Web Audio API for precise timing and volume control
 * Preloads sounds and provides a simple play interface with dynamic volume
 *
 * RELIABILITY FEATURES:
 * - Automatically resumes suspended AudioContext (browser autoplay policy compliance)
 * - Handles visibility changes to prevent audio issues when tab is backgrounded
 * - Provides health check API for playback system to verify audio is working
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private clickBuffer: AudioBuffer | null = null;
  private isInitialized = false;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private reverbNodes: ReverbNodes | null = null;
  private reverbStrength: number = 0;
  private visibilityChangeHandler: (() => void) | null = null;
  private stateChangeHandler: (() => void) | null = null;
  private config: AudioPlayerConfig;

  constructor(config: AudioPlayerConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the audio context and load all sounds
   * Must be called after user interaction (e.g., button click)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create AudioContext
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Set up visibility change handler to resume audio when tab becomes visible
      this.visibilityChangeHandler = () => {
        if (document.visibilityState === 'visible' && this.audioContext?.state === 'suspended') {
          this.audioContext.resume().catch(err => {
            console.warn('Failed to resume AudioContext on visibility change:', err);
          });
        }
      };
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);

      // Set up state change handler to detect when AudioContext becomes suspended
      this.stateChangeHandler = () => {
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume().catch(err => {
            console.warn('Failed to resume suspended AudioContext:', err);
          });
        }
      };
      this.audioContext.addEventListener('statechange', this.stateChangeHandler);

      // Load all configured sounds
      const loadPromises: Promise<void>[] = [];

      if (this.config.soundUrls) {
        for (const [name, url] of Object.entries(this.config.soundUrls)) {
          loadPromises.push(this.loadSound(name, url));
        }
      }

      // Load click sound if provided
      if (this.config.clickUrl) {
        loadPromises.push(
          (async () => {
            const response = await fetch(this.config.clickUrl!);
            const arrayBuffer = await response.arrayBuffer();
            this.clickBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          })()
        );
      }

      await Promise.all(loadPromises);

      // Initialize reverb nodes if enabled
      if (this.config.enableReverb !== false) {
        this.reverbNodes = await createReverb(
          this.audioContext,
          this.config.reverbImpulseUrl,
          0
        );
        this.reverbNodes.wetGain.connect(this.audioContext.destination);
        this.reverbNodes.dryGain.connect(this.audioContext.destination);
      }

      this.isInitialized = true;
    } catch (err) {
      console.error('Error initializing audio:', err);
    }
  }

  /**
   * Load a sound from URL
   */
  private async loadSound(name: string, url: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.buffers.set(name, audioBuffer);
    } catch (err) {
      console.error(`Error loading sound ${name}:`, err);
    }
  }

  /**
   * Dynamically load additional sounds after initialization
   */
  async loadAdditionalSounds(soundUrls: Record<string, string>): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    const loadPromises: Promise<void>[] = [];
    for (const [name, url] of Object.entries(soundUrls)) {
      if (!this.buffers.has(name)) {
        loadPromises.push(this.loadSound(name, url));
      }
    }

    await Promise.all(loadPromises);
  }

  /**
   * Ensure the AudioContext is running (not suspended)
   * This MUST be called before any playback to handle browser autoplay policies
   * and recovery from tab backgrounding
   *
   * @returns Promise that resolves to true if audio is ready, false otherwise
   */
  async ensureResumed(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext) {
      return false;
    }

    // If context is suspended, try to resume it
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
        return false;
      }
    }

    // If context is closed, we can't recover - would need to reinitialize
    if (this.audioContext.state === 'closed') {
      console.error('AudioContext is closed and cannot be resumed');
      return false;
    }

    return this.audioContext.state === 'running';
  }

  /**
   * Check if audio is currently healthy and ready for playback
   * @returns true if AudioContext exists and is in 'running' state
   */
  isHealthy(): boolean {
    return this.isInitialized && this.audioContext !== null && this.audioContext.state === 'running';
  }

  /**
   * Get current AudioContext state for debugging/monitoring
   * @returns The current state or 'uninitialized' if not yet created
   */
  getState(): AudioContextState | 'uninitialized' {
    if (!this.audioContext) {
      return 'uninitialized';
    }
    return this.audioContext.state;
  }

  /**
   * Get the AudioContext for advanced usage
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Set reverb strength (0-100)
   * @param strength - Reverb strength from 0 (no reverb) to 100 (full reverb)
   */
  setReverbStrength(strength: number): void {
    this.reverbStrength = Math.max(0, Math.min(100, strength));

    if (this.reverbNodes) {
      const wetLevel = convertReverbStrengthToWetLevel(this.reverbStrength);
      updateReverbLevel(this.reverbNodes.wetGain, this.reverbNodes.dryGain, wetLevel);
    }
  }

  /**
   * Play a sound by name with optional volume control
   * @param soundName - The name of the sound to play
   * @param volume - Volume level (0.0 to 1.0), defaults to 1.0
   * @param duration - Optional duration in seconds for the note (used for fade-out on very short notes)
   */
  async play(soundName: string, volume: number = 1.0, duration?: number): Promise<void> {
    if (soundName === 'rest') return;

    const isReady = await this.ensureResumed();
    if (!isReady || !this.audioContext) return;

    const buffer = this.buffers.get(soundName);
    if (!buffer) {
      console.warn(`Sound "${soundName}" not loaded`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioContext.createGain();
      const now = this.audioContext.currentTime;

      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);

      // Only apply fade-out for very short notes (< 0.15 seconds / 150ms)
      if (duration !== undefined && duration > 0 && duration < 0.15) {
        const fadeStartTime = now + duration * 0.8;
        const fadeEndTime = now + duration;

        gainNode.gain.setValueAtTime(volume, fadeStartTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, fadeEndTime);
      }

      // Connect audio chain with reverb support
      if (this.reverbNodes && this.reverbStrength > 0) {
        source.connect(gainNode);
        gainNode.connect(this.reverbNodes.dryGain);
        gainNode.connect(this.reverbNodes.convolver);
      } else {
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
      }

      this.activeSources.add(source);

      source.onended = () => {
        this.activeSources.delete(source);
      };

      source.start(now);

      if (duration !== undefined && duration > 0 && duration < 0.15) {
        source.stop(now + duration + 0.01);
      }
    } catch (err) {
      console.error(`Error playing ${soundName} sound:`, err);
    }
  }

  /**
   * Play a metronome click sound
   * @param volume - Volume level (0.0 to 1.0), defaults to 1.0
   */
  async playClick(volume: number = 1.0): Promise<void> {
    const isReady = await this.ensureResumed();
    if (!isReady || !this.audioContext || !this.clickBuffer) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.clickBuffer;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioContext.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start(this.audioContext.currentTime);
    } catch (err) {
      console.error('Error playing click sound:', err);
    }
  }

  /**
   * Stop all currently playing sounds (but not metronome clicks)
   */
  stopAllSounds(): void {
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch {
        // Source may have already ended
      }
    });
    this.activeSources.clear();
  }

  /**
   * Stop all currently playing sounds (including metronome)
   */
  stopAll(): void {
    this.stopAllSounds();
  }

  /**
   * Clean up resources when audio player is no longer needed
   */
  destroy(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.stateChangeHandler && this.audioContext) {
      this.audioContext.removeEventListener('statechange', this.stateChangeHandler);
      this.stateChangeHandler = null;
    }

    this.stopAll();

    if (this.reverbNodes) {
      this.reverbNodes.cleanup();
      this.reverbNodes = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(err => {
        console.warn('Error closing AudioContext:', err);
      });
      this.audioContext = null;
    }

    this.buffers.clear();
    this.clickBuffer = null;
    this.isInitialized = false;
  }
}

/**
 * Create a pre-configured audio player for metronome-only usage
 */
export function createMetronomePlayer(clickUrl: string): AudioPlayer {
  return new AudioPlayer({
    clickUrl,
    enableReverb: false,
  });
}
