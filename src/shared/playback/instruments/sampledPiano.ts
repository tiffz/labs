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
 * Using the Tone.js-hosted Salamander samples (reliable CDN)
 */
const SAMPLE_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

/**
 * Available sample points (only A, C, Ds, Fs are hosted per octave)
 */
const SAMPLE_NOTES = [
  'A0', 'C1', 'Ds1', 'Fs1', 'A1', 'C2', 'Ds2', 'Fs2',
  'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4',
  'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6',
  'A6', 'C7', 'Ds7', 'Fs7', 'A7', 'C8',
];

/**
 * Single velocity layer (Tone.js samples don't have multiple velocity layers)
 */
const VELOCITY_LAYERS: VelocityLayer[] = [
  { name: 'default', velocityMin: 0, velocityMax: 1.0, suffix: '' },
];

/**
 * Generate sample entries for loading
 */
function generateSampleEntries(): SampleEntry[] {
  const entries: SampleEntry[] = [];
  
  for (const note of SAMPLE_NOTES) {
    for (const layer of VELOCITY_LAYERS) {
      entries.push({
        note,
        midiNote: noteToMidi(note),
        url: `${SAMPLE_BASE_URL}${note}.mp3`,
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
 * Plays real piano samples with:
 * - Velocity-based sample selection
 * - Pitch shifting for notes between sample points
 * - Natural decay (lets samples ring naturally)
 * - Subtle modulation for long notes (adds life/movement)
 * - Smooth release when notes end
 */
export class SampledPiano extends BaseInstrument {
  private samples: LoadedSample[] = [];
  private loadingState: SampleLoadingState = 'idle';
  private loadingPromise: Promise<void> | null = null;
  private onLoadingProgress: LoadingProgressCallback | null = null;
  private onLoadingComplete: ((success: boolean) => void) | null = null;
  
  // Playback settings optimized for natural piano sound
  private readonly attackTime = 0.005;  // Fast attack (samples have their own attack)
  private readonly releaseTime = 0.35;  // Smooth release when note ends
  private readonly baseGain = 0.8;      // Slightly reduced to leave headroom
  
  // Subtle modulation settings (adds "life" to long notes)
  private readonly modulationRate = 4.0;     // Hz - slow vibrato rate
  private readonly modulationDepth = 0.004;  // Very subtle amplitude variation (0.4%)
  
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
  
  /**
   * Create subtle amplitude modulation (tremolo) for long notes
   * This adds "life" to sustained notes, making them sound less static
   */
  private createModulation(
    audioContext: AudioContext, 
    startTime: number, 
    duration: number
  ): { modulationGain: GainNode; lfo: OscillatorNode } | null {
    // Only apply modulation to notes longer than 0.5 seconds
    if (duration < 0.5) return null;
    
    // Create LFO (Low Frequency Oscillator) for subtle tremolo
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = this.modulationRate;
    
    // Create gain node to scale the LFO output
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = this.modulationDepth;
    
    // Create the modulation gain node (this will be multiplied with the signal)
    const modulationGain = audioContext.createGain();
    modulationGain.gain.value = 1.0; // Base gain
    
    // Connect LFO -> lfoGain -> modulationGain.gain (modulates the gain parameter)
    lfo.connect(lfoGain);
    lfoGain.connect(modulationGain.gain);
    
    // Start and stop the LFO
    lfo.start(startTime);
    lfo.stop(startTime + duration + 0.1);
    
    // Cleanup
    lfo.onended = () => {
      lfoGain.disconnect();
    };
    
    return { modulationGain, lfo };
  }
  
  playNote({ frequency, startTime, duration, velocity = 0.8 }: PlayNoteParams): void {
    if (this.disposed) return;
    
    if (!this.isReady()) {
      console.warn('SampledPiano: Samples not loaded, skipping note');
      return;
    }
    
    const audioContext = this.audioContext;
    const now = audioContext.currentTime;
    
    const clampedStartTime = Math.max(startTime, now + 0.005);
    
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    const result = findBestSample(midiNote, velocity, this.samples, VELOCITY_LAYERS);
    
    if (!result) {
      console.warn('SampledPiano: No suitable sample found for note', midiNote);
      return;
    }
    
    const { sample, pitchShift } = result;
    
    const source = audioContext.createBufferSource();
    source.buffer = sample.buffer;
    
    const rate = pitchShift !== 0 ? this.getPitchShiftRate(pitchShift) : 1;
    source.playbackRate.value = rate;
    
    const gainNode = audioContext.createGain();
    
    const velocityCurve = Math.pow(velocity, 0.7);
    const velocityGain = 0.4 + (velocityCurve * 0.6);
    const peakGain = this.baseGain * velocityGain;
    
    // Use the actual playback duration accounting for pitch shift
    const sampleDuration = sample.buffer.duration / rate;
    const effectiveDuration = Math.min(duration, sampleDuration);
    
    // Scale release time with note length for smoother endings on long notes
    const releaseTime = duration > 3.0
      ? Math.min(0.8, duration * 0.15)
      : this.releaseTime;
    
    // Attack
    gainNode.gain.setValueAtTime(0, clampedStartTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, clampedStartTime + this.attackTime);
    
    // Let the sample's natural decay do the work — use setTargetAtTime for a
    // gentle complementary exponential decay that avoids fighting the recording
    // but ensures very long notes don't sustain at an unnaturally high level
    const decayStart = clampedStartTime + this.attackTime;
    // tau chosen so gain halves roughly every 3-4 seconds (natural piano behavior)
    const tau = Math.max(1.5, Math.min(4.0, effectiveDuration * 0.4));
    gainNode.gain.setTargetAtTime(peakGain * 0.08, decayStart, tau);
    
    // At release point, transition to a smooth fade-out
    const releaseStart = Math.max(
      clampedStartTime + this.attackTime + 0.05,
      clampedStartTime + effectiveDuration - releaseTime
    );
    const sustainElapsed = releaseStart - decayStart;
    const gainAtRelease = peakGain * 0.08 +
      (peakGain - peakGain * 0.08) * Math.exp(-sustainElapsed / tau);
    gainNode.gain.setValueAtTime(gainAtRelease, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, clampedStartTime + effectiveDuration);
    
    const modulation = this.createModulation(audioContext, clampedStartTime, effectiveDuration);
    
    if (modulation) {
      source.connect(gainNode);
      gainNode.connect(modulation.modulationGain);
      modulation.modulationGain.connect(this.output);
    } else {
      source.connect(gainNode);
      gainNode.connect(this.output);
    }
    
    source.start(clampedStartTime);
    source.stop(clampedStartTime + effectiveDuration + 0.15);
    
    source.onended = () => {
      gainNode.disconnect();
      if (modulation) {
        modulation.modulationGain.disconnect();
      }
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
