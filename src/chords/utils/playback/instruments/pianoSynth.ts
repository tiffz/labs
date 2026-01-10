/**
 * Piano Synthesizer (Enhanced)
 * 
 * Creates a realistic piano-like sound using:
 * - Multiple sine wave oscillators with slight detuning (simulates string inharmonicity)
 * - Velocity-dependent timbre (harder hits = brighter sound)
 * - Per-harmonic decay rates (higher harmonics decay faster)
 * - Smooth linear envelopes to avoid audio glitches
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
  { multiplier: 2.0, gain: 0.5, detuneRange: 2, decayMultiplier: 1.3 },     // 2nd harmonic
  { multiplier: 3.0, gain: 0.25, detuneRange: 2.5, decayMultiplier: 1.6 },  // 3rd harmonic
  { multiplier: 4.0, gain: 0.15, detuneRange: 3, decayMultiplier: 2.0 },    // 4th harmonic
  { multiplier: 5.0, gain: 0.08, detuneRange: 3.5, decayMultiplier: 2.5 },  // 5th harmonic
  { multiplier: 6.0, gain: 0.04, detuneRange: 4, decayMultiplier: 3.0 },    // 6th harmonic
];

/**
 * ADSR envelope settings
 */
const ENVELOPE = {
  attack: 0.02,         // Slightly longer attack to avoid clicks
  decay: 0.15,          // Decay time
  sustainLevel: 0.35,   // Sustain level
  maxRelease: 0.3,      // Maximum release time
  releaseRatio: 0.2,    // Release time as ratio of duration
};

export class PianoSynthesizer extends BaseInstrument {
  // Base gain per harmonic (controls overall volume)
  // Reduced to prevent clipping with multiple harmonics
  private readonly baseGain = 0.12;
  
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
    // Velocity 0.8+ = full brightness, velocity 0.3 = very warm
    const brightnessBase = 0.5 + (velocity * 0.5); // Range: 0.5 to 1.0
    // Higher harmonics are more affected by velocity
    const harmonicAttenuation = Math.pow(brightnessBase, harmonicIndex * 0.25);
    return Math.max(0.2, harmonicAttenuation);
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
      : Math.min(duration * ENVELOPE.releaseRatio, 0.25);
    const sustainTime = Math.max(0, duration - attackTime - decayTime - releaseTime);
    
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
      
      // ADSR envelope using stable linear ramps
      // Attack: 0 -> peak
      noteGain.gain.setValueAtTime(0, clampedStartTime);
      noteGain.gain.linearRampToValueAtTime(peakGain, clampedStartTime + attackTime);
      
      // Decay: peak -> sustain
      noteGain.gain.linearRampToValueAtTime(
        sustainGain, 
        clampedStartTime + attackTime + harmonicDecayTime
      );
      
      // Sustain: hold at sustain level (with slight decay for realism)
      if (sustainTime > 0) {
        const endSustainGain = sustainGain * 0.85; // Slight natural decay
        noteGain.gain.linearRampToValueAtTime(
          endSustainGain, 
          clampedStartTime + attackTime + harmonicDecayTime + sustainTime
        );
      }
      
      // Release: fade to zero
      noteGain.gain.linearRampToValueAtTime(0, clampedStartTime + duration);
      
      // Connect: osc -> noteGain -> output
      osc.connect(noteGain);
      noteGain.connect(this.output);
      
      // Schedule start and stop
      osc.start(clampedStartTime);
      osc.stop(clampedStartTime + duration + 0.02);  // Small buffer to avoid clicks
      
      // Auto-cleanup when oscillator ends
      osc.onended = () => {
        noteGain.disconnect();
      };
    });
  }
}
