/**
 * Piano Synthesizer (Enhanced)
 * 
 * Creates a realistic piano-like sound using:
 * - Multiple sine wave oscillators with slight detuning (simulates string inharmonicity)
 * - Velocity-dependent timbre (harder hits = brighter sound)
 * - Per-harmonic decay rates (higher harmonics decay faster)
 * - Subtle modulation on long notes for natural movement
 * - Exponential decay curves for natural piano-like sound
 */

import { BaseInstrument, type PlayNoteParams } from './instrument';

/**
 * Harmonic configuration for piano-like sound
 * Each harmonic has:
 * - multiplier: frequency ratio to fundamental
 * - gain: relative amplitude
 * - detuneRange: random detuning in cents (simulates string inharmonicity)
 * - decayMultiplier: how much faster this harmonic decays (higher = faster decay)
 */
const PIANO_HARMONICS = [
  { multiplier: 1.0, gain: 1.0, detuneRange: 1.5, decayMultiplier: 1.0 },   // Fundamental
  { multiplier: 2.0, gain: 0.45, detuneRange: 2, decayMultiplier: 1.4 },    // 2nd harmonic
  { multiplier: 3.0, gain: 0.22, detuneRange: 2.5, decayMultiplier: 1.8 },  // 3rd harmonic
  { multiplier: 4.0, gain: 0.12, detuneRange: 3, decayMultiplier: 2.2 },    // 4th harmonic
  { multiplier: 5.0, gain: 0.06, detuneRange: 3.5, decayMultiplier: 2.8 },  // 5th harmonic
  { multiplier: 6.0, gain: 0.03, detuneRange: 4, decayMultiplier: 3.5 },    // 6th harmonic
];

/**
 * ADSR envelope settings - optimized for natural piano decay
 */
const ENVELOPE = {
  attack: 0.015,        // Fast attack for percussive feel
  decay: 0.2,           // Decay time (longer for more natural sound)
  sustainLevel: 0.3,    // Lower sustain for more natural piano decay
  maxRelease: 0.35,     // Maximum release time
  releaseRatio: 0.2,    // Release time as ratio of duration
};

/**
 * Subtle modulation settings for long notes
 */
const MODULATION = {
  rate: 4.5,            // Hz - slow rate for subtle effect
  depth: 0.003,         // Very subtle (0.3% amplitude variation)
  minDuration: 0.8,     // Only apply to notes longer than this
};

export class PianoSynthesizer extends BaseInstrument {
  // Base gain per harmonic (controls overall volume)
  // Reduced to prevent clipping with multiple harmonics
  private readonly baseGain = 0.11;
  
  /**
   * Generate random detuning in cents
   */
  private getRandomDetune(range: number): number {
    return (Math.random() - 0.5) * 2 * range;
  }
  
  /**
   * Calculate brightness factor based on velocity
   * Higher velocity = brighter sound (more high harmonics)
   * Lower velocity = warmer sound (attenuated high harmonics)
   */
  private getBrightnessFactor(velocity: number, harmonicIndex: number): number {
    // Use a curve for more natural velocity response
    const velocityCurve = Math.pow(velocity, 0.7);
    const brightnessBase = 0.5 + (velocityCurve * 0.5); // Range: 0.5 to 1.0
    // Higher harmonics are more affected by velocity
    const harmonicAttenuation = Math.pow(brightnessBase, harmonicIndex * 0.25);
    return Math.max(0.2, harmonicAttenuation);
  }
  
  /**
   * Create subtle amplitude modulation for long notes
   * This adds "life" to sustained notes
   */
  private createModulation(
    audioContext: AudioContext, 
    startTime: number, 
    duration: number
  ): GainNode | null {
    // Only apply modulation to notes longer than threshold
    if (duration < MODULATION.minDuration) return null;
    
    // Create LFO for subtle tremolo
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = MODULATION.rate;
    
    // Scale the LFO output
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = MODULATION.depth;
    
    // Create modulation gain node
    const modulationGain = audioContext.createGain();
    modulationGain.gain.value = 1.0;
    
    // Connect LFO -> lfoGain -> modulationGain.gain
    lfo.connect(lfoGain);
    lfoGain.connect(modulationGain.gain);
    
    lfo.start(startTime);
    lfo.stop(startTime + duration + 0.1);
    
    lfo.onended = () => {
      lfoGain.disconnect();
    };
    
    return modulationGain;
  }
  
  playNote({ frequency, startTime, duration, velocity = 0.8 }: PlayNoteParams): void {
    if (this.disposed) return;
    
    const audioContext = this.audioContext;
    const now = audioContext.currentTime;
    
    // Ensure start time is not in the past
    const clampedStartTime = Math.max(startTime, now + 0.005);
    
    // Calculate ADSR timing
    const attackTime = ENVELOPE.attack;
    const decayTime = ENVELOPE.decay;
    const releaseTime = duration > 2.0 
      ? ENVELOPE.maxRelease 
      : Math.min(duration * ENVELOPE.releaseRatio, 0.3);
    const sustainTime = Math.max(0, duration - attackTime - decayTime - releaseTime);
    
    // Create modulation for long notes
    const modulationGain = this.createModulation(audioContext, clampedStartTime, duration);
    
    // Create oscillators for each harmonic
    PIANO_HARMONICS.forEach((harmonic, index) => {
      const osc = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      
      osc.type = 'sine';
      
      // Apply slight random detuning for natural string-like sound
      const detuneCents = this.getRandomDetune(harmonic.detuneRange);
      osc.frequency.value = frequency * harmonic.multiplier;
      osc.detune.value = detuneCents;
      
      // Calculate gain with velocity, harmonic level, and brightness
      const brightnessFactor = this.getBrightnessFactor(velocity, index);
      const peakGain = this.baseGain * harmonic.gain * velocity * brightnessFactor;
      
      // Per-harmonic decay time (higher harmonics decay faster)
      const harmonicDecayTime = decayTime / harmonic.decayMultiplier;
      const sustainGain = peakGain * ENVELOPE.sustainLevel;
      
      // ADSR envelope using only linear ramps (more stable, no discontinuities)
      // Attack: 0 -> peak
      noteGain.gain.setValueAtTime(0, clampedStartTime);
      noteGain.gain.linearRampToValueAtTime(peakGain, clampedStartTime + attackTime);
      
      // Decay: peak -> sustain
      noteGain.gain.linearRampToValueAtTime(
        sustainGain, 
        clampedStartTime + attackTime + harmonicDecayTime
      );
      
      // Sustain: gradual natural decay (pianos don't hold perfectly steady)
      const sustainEndTime = clampedStartTime + attackTime + harmonicDecayTime + sustainTime;
      if (sustainTime > 0) {
        const endSustainGain = sustainGain * 0.75;
        noteGain.gain.linearRampToValueAtTime(endSustainGain, sustainEndTime);
      }
      
      // Release: smooth fade to zero
      noteGain.gain.linearRampToValueAtTime(0, clampedStartTime + duration);
      
      // Connect through modulation if available, otherwise direct
      osc.connect(noteGain);
      if (modulationGain) {
        noteGain.connect(modulationGain);
      } else {
        noteGain.connect(this.output);
      }
      
      // Schedule start and stop
      osc.start(clampedStartTime);
      osc.stop(clampedStartTime + duration + 0.02);
      
      // Auto-cleanup
      osc.onended = () => {
        noteGain.disconnect();
      };
    });
    
    // Connect modulation to output if used
    if (modulationGain) {
      modulationGain.connect(this.output);
      // Note: modulationGain cleanup happens when LFO ends
    }
  }
}
