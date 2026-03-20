/**
 * Instrument Interface
 * 
 * Abstract interface for all sound generators. This allows the scheduler
 * to be completely decoupled from how sounds are actually produced.
 * 
 * Future implementations could include:
 * - PianoSynthesizer (oscillator-based piano)
 * - SampledPiano (real piano samples)
 * - DrumMachine (drum samples)
 * - FMSynthesizer (FM synthesis)
 */

export interface PlayNoteParams {
  frequency: number;              // Hz
  startTime: number;              // Absolute AudioContext.currentTime
  duration: number;               // Seconds
  velocity?: number;              // 0-1, default 0.8
}

export interface Instrument {
  /**
   * Play a note at an exact time
   * All timing is absolute AudioContext time, ensuring sample-accurate scheduling
   */
  playNote(params: PlayNoteParams): void;
  
  /**
   * Gracefully stop all playing/scheduled notes
   * @param fadeTimeMs - Fade out duration in milliseconds (default 50ms)
   */
  stopAll(fadeTimeMs?: number): void;
  
  /**
   * Connect instrument output to a destination node
   */
  connect(destination: AudioNode): void;
  
  /**
   * Disconnect instrument from current destination
   */
  disconnect(): void;
  
  /**
   * Get the instrument's output node for routing
   */
  getOutput(): GainNode;
  
  /**
   * Optional cleanup for instruments that need it
   */
  dispose?(): void;
}

/**
 * Base class providing common functionality for instruments
 */
export abstract class BaseInstrument implements Instrument {
  protected audioContext: AudioContext;
  protected output: GainNode;
  protected disposed: boolean = false;
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.output = audioContext.createGain();
    this.output.gain.value = 1.0;
  }
  
  abstract playNote(params: PlayNoteParams): void;
  
  stopAll(fadeTimeMs: number = 50): void {
    if (this.disposed) return;
    
    const fadeTime = fadeTimeMs / 1000;
    const now = this.audioContext.currentTime;
    
    // Cancel any scheduled gain changes
    this.output.gain.cancelScheduledValues(now);
    
    // Set current value then ramp to 0, then back to 1
    // Use Web Audio scheduling instead of setTimeout for precise timing
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(0, now + fadeTime);
    // Restore gain immediately after fade completes using Web Audio scheduling
    this.output.gain.setValueAtTime(1, now + fadeTime + 0.001);
  }
  
  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }
  
  disconnect(): void {
    this.output.disconnect();
  }
  
  getOutput(): GainNode {
    return this.output;
  }
  
  dispose(): void {
    this.disposed = true;
    this.stopAll(10);
    this.disconnect();
  }
}
