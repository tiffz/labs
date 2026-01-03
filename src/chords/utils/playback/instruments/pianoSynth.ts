/**
 * Piano Synthesizer
 * 
 * Creates a piano-like sound using multiple sine wave oscillators
 * to simulate harmonics, with proper ADSR envelope.
 */

import { BaseInstrument, type PlayNoteParams } from './instrument';

/**
 * Harmonic configuration for piano-like sound
 */
const PIANO_HARMONICS = [
  { multiplier: 1.0, gain: 1.0 },     // Fundamental
  { multiplier: 2.0, gain: 0.65 },    // 2nd harmonic
  { multiplier: 3.0, gain: 0.3 },     // 3rd harmonic
  { multiplier: 4.0, gain: 0.2 },     // 4th harmonic
  { multiplier: 5.0, gain: 0.08 },    // 5th harmonic
  { multiplier: 6.0, gain: 0.05 },    // 6th harmonic
];

/**
 * ADSR envelope settings
 */
const ENVELOPE = {
  attack: 0.03,
  decay: 0.12,
  sustainLevel: 0.3,
  maxRelease: 0.3,
  releaseRatio: 0.2,  // Release time as ratio of duration
};

export class PianoSynthesizer extends BaseInstrument {
  // Base gain per harmonic (controls overall volume)
  private readonly baseGain = 0.18;
  
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
    PIANO_HARMONICS.forEach((harmonic) => {
      const osc = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency * harmonic.multiplier;
      
      // Calculate gain with velocity and harmonic level
      const peakGain = this.baseGain * harmonic.gain * velocity;
      
      // ADSR envelope using linear ramps (more stable than exponential for final fade)
      // Attack: 0 -> peak
      noteGain.gain.setValueAtTime(0, clampedStartTime);
      noteGain.gain.linearRampToValueAtTime(peakGain, clampedStartTime + attackTime);
      
      // Decay: peak -> sustain
      noteGain.gain.linearRampToValueAtTime(
        peakGain * ENVELOPE.sustainLevel, 
        clampedStartTime + attackTime + decayTime
      );
      
      // Sustain: hold at sustain level
      if (sustainTime > 0) {
        noteGain.gain.setValueAtTime(
          peakGain * ENVELOPE.sustainLevel, 
          clampedStartTime + attackTime + decayTime + sustainTime
        );
      }
      
      // Release: sustain -> 0
      noteGain.gain.linearRampToValueAtTime(0, clampedStartTime + duration);
      
      // Connect: osc -> noteGain -> output
      osc.connect(noteGain);
      noteGain.connect(this.output);
      
      // Schedule start and stop
      osc.start(clampedStartTime);
      osc.stop(clampedStartTime + duration + 0.01);  // Small buffer to avoid clicks
      
      // Auto-cleanup when oscillator ends
      osc.onended = () => {
        noteGain.disconnect();
      };
    });
  }
}
