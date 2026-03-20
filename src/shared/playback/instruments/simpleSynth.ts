/**
 * Simple Synthesizer
 * 
 * Basic waveform synthesizer (sine, square, sawtooth, triangle)
 * with simple exponential decay envelope.
 */

import { BaseInstrument, type PlayNoteParams } from './instrument';

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

/**
 * Base gain levels for different waveforms
 * (some waveforms are louder than others)
 */
const WAVEFORM_GAINS: Record<WaveformType, number> = {
  sine: 0.1,
  square: 0.05,
  sawtooth: 0.08,
  triangle: 0.1,
};

export class SimpleSynthesizer extends BaseInstrument {
  private waveform: WaveformType;
  
  constructor(audioContext: AudioContext, waveform: WaveformType = 'sine') {
    super(audioContext);
    this.waveform = waveform;
  }
  
  /**
   * Change the waveform type
   */
  setWaveform(waveform: WaveformType): void {
    this.waveform = waveform;
  }
  
  /**
   * Get current waveform type
   */
  getWaveform(): WaveformType {
    return this.waveform;
  }
  
  playNote({ frequency, startTime, duration, velocity = 0.8 }: PlayNoteParams): void {
    if (this.disposed) return;
    
    const audioContext = this.audioContext;
    const now = audioContext.currentTime;
    
    // Ensure start time is not in the past
    const clampedStartTime = Math.max(startTime, now + 0.005);
    
    const osc = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    
    osc.type = this.waveform;
    osc.frequency.value = frequency;
    
    // Calculate gain based on waveform type and velocity
    const baseGain = WAVEFORM_GAINS[this.waveform];
    const peakGain = baseGain * velocity;
    
    // Simple attack + exponential decay envelope
    const attack = 0.01;
    
    noteGain.gain.setValueAtTime(0, clampedStartTime);
    noteGain.gain.linearRampToValueAtTime(peakGain, clampedStartTime + attack);
    // Exponential decay to near zero
    // Note: exponentialRampToValueAtTime can't go to 0, so we use a very small value
    noteGain.gain.exponentialRampToValueAtTime(0.001, clampedStartTime + duration);
    
    // Connect: osc -> noteGain -> output
    osc.connect(noteGain);
    noteGain.connect(this.output);
    
    osc.start(clampedStartTime);
    osc.stop(clampedStartTime + duration + 0.01);
    
    // Auto-cleanup
    osc.onended = () => {
      noteGain.disconnect();
    };
  }
}
