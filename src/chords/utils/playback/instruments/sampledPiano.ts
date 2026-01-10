/**
 * Sampled Piano Instrument
 * 
 * Uses real piano samples from the Salamander Grand Piano library
 * for realistic piano sound.
 * 
 * Salamander Grand Piano by Alexander Holm
 * Licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
 */

import { BaseInstrument, type PlayNoteParams } from './instrument';
import {
  loadSamples,
  findBestSample,
  noteToMidi,
  type SampleEntry,
  type LoadedSample,
  type VelocityLayer,
  type LoadingProgressCallback,
} from './sampleLoader';

/**
 * Salamander Grand Piano sample configuration
 * Using samples hosted on GitHub (commonly used by Tone.js)
 */
const SAMPLE_BASE_URL = 'https://nbrosowsky.github.io/tonern/Salamander/';

/**
 * Notes to load (every 3 semitones for good coverage with pitch shifting)
 * This reduces download size while maintaining quality
 */
const SAMPLE_NOTES = [
  'A0', 'C1', 'Eb1', 'Gb1', 'A1', 'C2', 'Eb2', 'Gb2',
  'A2', 'C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4',
  'A4', 'C5', 'Eb5', 'Gb5', 'A5', 'C6', 'Eb6', 'Gb6',
  'A6', 'C7', 'Eb7', 'Gb7', 'A7', 'C8',
];

/**
 * Velocity layers for dynamic response
 * Using 2 layers for balance between quality and download size
 */
const VELOCITY_LAYERS: VelocityLayer[] = [
  { name: 'mf', velocityMin: 0, velocityMax: 0.6, suffix: 'v5' },
  { name: 'f', velocityMin: 0.6, velocityMax: 1.0, suffix: 'v10' },
];

/**
 * Convert note name for URL (Eb -> Ds for Salamander naming convention)
 */
function formatNoteForUrl(note: string): string {
  // Salamander uses sharps, so convert flats
  return note.replace('Eb', 'Ds').replace('Gb', 'Fs').replace('Ab', 'Gs').replace('Bb', 'As');
}

/**
 * Generate sample entries for loading
 */
function generateSampleEntries(): SampleEntry[] {
  const entries: SampleEntry[] = [];
  
  for (const note of SAMPLE_NOTES) {
    for (const layer of VELOCITY_LAYERS) {
      const urlNote = formatNoteForUrl(note);
      entries.push({
        note,
        midiNote: noteToMidi(note),
        url: `${SAMPLE_BASE_URL}${urlNote}${layer.suffix}.mp3`,
        velocityLayer: layer.name,
      });
    }
  }
  
  return entries;
}

/**
 * Loading state
 */
export type SampleLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Sampled Piano Synthesizer
 * 
 * Plays real piano samples with velocity-based sample selection
 * and pitch shifting for notes between sample points.
 */
export class SampledPiano extends BaseInstrument {
  private samples: LoadedSample[] = [];
  private loadingState: SampleLoadingState = 'idle';
  private loadingPromise: Promise<void> | null = null;
  private onLoadingProgress: LoadingProgressCallback | null = null;
  private onLoadingComplete: ((success: boolean) => void) | null = null;
  
  // ADSR settings for sample playback
  private readonly attackTime = 0.005;  // Very fast attack for samples
  private readonly releaseTime = 0.3;   // Smooth release
  private readonly baseGain = 0.9;      // Samples are already normalized
  
  constructor(audioContext: AudioContext) {
    super(audioContext);
  }
  
  /**
   * Get current loading state
   */
  getLoadingState(): SampleLoadingState {
    return this.loadingState;
  }
  
  /**
   * Check if samples are loaded and ready
   */
  isReady(): boolean {
    return this.loadingState === 'loaded' && this.samples.length > 0;
  }
  
  /**
   * Set callback for loading progress updates
   */
  setLoadingProgressCallback(callback: LoadingProgressCallback | null): void {
    this.onLoadingProgress = callback;
  }
  
  /**
   * Set callback for when loading completes
   */
  setLoadingCompleteCallback(callback: ((success: boolean) => void) | null): void {
    this.onLoadingComplete = callback;
  }
  
  /**
   * Start loading samples
   * Returns a promise that resolves when loading is complete
   */
  async loadSamples(): Promise<boolean> {
    // If already loading, return existing promise result
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.isReady();
    }
    
    // If already loaded, return immediately
    if (this.isReady()) {
      return true;
    }
    
    this.loadingState = 'loading';
    
    this.loadingPromise = (async () => {
      try {
        const sampleEntries = generateSampleEntries();
        
        this.samples = await loadSamples(
          this.audioContext,
          sampleEntries,
          (loaded, total) => {
            this.onLoadingProgress?.(loaded, total);
          }
        );
        
        if (this.samples.length > 0) {
          this.loadingState = 'loaded';
          this.onLoadingComplete?.(true);
        } else {
          this.loadingState = 'error';
          this.onLoadingComplete?.(false);
        }
      } catch (error) {
        console.error('Failed to load piano samples:', error);
        this.loadingState = 'error';
        this.onLoadingComplete?.(false);
      }
    })();
    
    await this.loadingPromise;
    return this.isReady();
  }
  
  /**
   * Calculate playback rate for pitch shifting
   */
  private getPitchShiftRate(semitones: number): number {
    return Math.pow(2, semitones / 12);
  }
  
  playNote({ frequency, startTime, duration, velocity = 0.8 }: PlayNoteParams): void {
    if (this.disposed) return;
    
    // If samples aren't loaded, fail silently (fallback should handle this)
    if (!this.isReady()) {
      console.warn('SampledPiano: Samples not loaded, skipping note');
      return;
    }
    
    const audioContext = this.audioContext;
    const now = audioContext.currentTime;
    
    // Ensure start time is not in the past
    const clampedStartTime = Math.max(startTime, now + 0.005);
    
    // Convert frequency to MIDI note
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    // Find best sample for this note and velocity
    const result = findBestSample(midiNote, velocity, this.samples, VELOCITY_LAYERS);
    
    if (!result) {
      console.warn('SampledPiano: No suitable sample found for note', midiNote);
      return;
    }
    
    const { sample, pitchShift } = result;
    
    // Create buffer source
    const source = audioContext.createBufferSource();
    source.buffer = sample.buffer;
    
    // Apply pitch shifting if needed
    if (pitchShift !== 0) {
      source.playbackRate.value = this.getPitchShiftRate(pitchShift);
    }
    
    // Create gain node for envelope
    const gainNode = audioContext.createGain();
    
    // Calculate gain based on velocity (samples already have velocity baked in,
    // but we still want some dynamic range)
    const velocityGain = 0.5 + (velocity * 0.5); // Range: 0.5 to 1.0
    const peakGain = this.baseGain * velocityGain;
    
    // Envelope: fast attack, hold, then release
    gainNode.gain.setValueAtTime(0, clampedStartTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, clampedStartTime + this.attackTime);
    
    // Calculate when to start release
    const releaseStartTime = clampedStartTime + duration - this.releaseTime;
    
    if (releaseStartTime > clampedStartTime + this.attackTime) {
      // Hold until release
      gainNode.gain.setValueAtTime(peakGain, releaseStartTime);
    }
    
    // Release
    gainNode.gain.linearRampToValueAtTime(0, clampedStartTime + duration);
    
    // Connect: source -> gain -> output
    source.connect(gainNode);
    gainNode.connect(this.output);
    
    // Start playback
    source.start(clampedStartTime);
    
    // Stop the source after the note duration (plus a small buffer)
    // Account for playback rate changes in duration
    const adjustedDuration = duration / (source.playbackRate.value || 1);
    source.stop(clampedStartTime + adjustedDuration + 0.1);
    
    // Cleanup
    source.onended = () => {
      gainNode.disconnect();
    };
  }
  
  /**
   * Dispose and clean up
   */
  dispose(): void {
    super.dispose();
    this.samples = [];
    this.loadingState = 'idle';
    this.loadingPromise = null;
    this.onLoadingProgress = null;
    this.onLoadingComplete = null;
  }
}
