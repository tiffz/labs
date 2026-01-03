/**
 * Transport - Manages time and position for playback
 * 
 * Key principle: Position is ALWAYS derived from AudioContext.currentTime,
 * never stored as separate state that can drift.
 */

import type { TimeSignature } from '../../types';

export class Transport {
  private audioContext: AudioContext;
  private startTime: number = 0;
  private playing: boolean = false;
  private _tempo: number = 120;
  private _loopDurationBeats: number = 16;
  private _timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  private lastReportedLoop: number = -1;
  
  // Callbacks
  private onLoopCallback?: () => void;
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }
  
  /**
   * Start the transport
   */
  start(tempo: number, loopDurationBeats: number, timeSignature: TimeSignature): void {
    this._tempo = tempo;
    this._loopDurationBeats = loopDurationBeats;
    this._timeSignature = timeSignature;
    this.startTime = this.audioContext.currentTime;
    this.playing = true;
    this.lastReportedLoop = -1;
  }
  
  /**
   * Stop the transport
   */
  stop(): void {
    this.playing = false;
  }
  
  /**
   * Get whether transport is playing
   */
  isPlaying(): boolean {
    return this.playing;
  }
  
  /**
   * Get current position in beats - ALWAYS derived from AudioContext.currentTime
   * This is the key to avoiding drift - we never store beat position as state
   */
  getPositionInBeats(): number {
    if (!this.playing) return 0;
    
    const elapsed = this.audioContext.currentTime - this.startTime;
    const beatsElapsed = elapsed * (this._tempo / 60);
    const position = beatsElapsed % this._loopDurationBeats;
    
    // Detect loop boundary crossing and fire callback
    const currentLoop = this.getLoopCount();
    if (currentLoop > this.lastReportedLoop) {
      this.lastReportedLoop = currentLoop;
      if (this.onLoopCallback) {
        this.onLoopCallback();
      }
    }
    
    return position;
  }
  
  /**
   * Get total beats elapsed (including loops)
   */
  getTotalBeatsElapsed(): number {
    if (!this.playing) return 0;
    
    const elapsed = this.audioContext.currentTime - this.startTime;
    return elapsed * (this._tempo / 60);
  }
  
  /**
   * Get current position in seconds within the loop
   */
  getPositionInSeconds(): number {
    return this.getPositionInBeats() * (60 / this._tempo);
  }
  
  /**
   * Get current loop count - derived directly from total elapsed time
   * This ensures we never miss a loop
   */
  getLoopCount(): number {
    if (!this.playing) return 0;
    const totalBeats = this.getTotalBeatsElapsed();
    return Math.floor(totalBeats / this._loopDurationBeats);
  }
  
  /**
   * Get current tempo
   */
  get tempo(): number {
    return this._tempo;
  }
  
  /**
   * Get loop duration in beats
   */
  get loopDurationBeats(): number {
    return this._loopDurationBeats;
  }
  
  /**
   * Get time signature
   */
  get timeSignature(): TimeSignature {
    return this._timeSignature;
  }
  
  /**
   * Get beats per measure based on time signature
   */
  get beatsPerMeasure(): number {
    // For compound time signatures (6/8, 9/8, 12/8), beats are grouped
    if (this._timeSignature.denominator === 8 && this._timeSignature.numerator % 3 === 0) {
      return this._timeSignature.numerator / 3;
    }
    return this._timeSignature.numerator;
  }
  
  /**
   * Set tempo while maintaining current beat position within the loop
   * This recalculates startTime so the position stays the same
   */
  setTempo(newTempo: number): void {
    if (!this.playing) {
      this._tempo = newTempo;
      return;
    }
    
    // Get current position and loop at old tempo
    const currentBeat = this.getPositionInBeats();
    const currentLoop = this.getLoopCount();
    
    // Update tempo
    this._tempo = newTempo;
    
    // Recalculate startTime to maintain the same beat position within the current loop
    // Total elapsed time at new tempo = (currentLoop * loopDuration + currentBeat) * secondsPerBeat
    const totalBeatsElapsed = (currentLoop * this._loopDurationBeats) + currentBeat;
    const newElapsedSeconds = totalBeatsElapsed * (60 / newTempo);
    this.startTime = this.audioContext.currentTime - newElapsedSeconds;
  }
  
  /**
   * Set loop duration
   */
  setLoopDuration(beats: number): void {
    this._loopDurationBeats = beats;
  }
  
  /**
   * Set time signature
   */
  setTimeSignature(timeSignature: TimeSignature): void {
    this._timeSignature = timeSignature;
  }
  
  /**
   * Convert a beat position to an absolute AudioContext time
   * @param beat - Beat position within the loop (0 to loopDurationBeats)
   * @param loopOffset - Which loop relative to current (0 = current, 1 = next, etc.)
   */
  beatToAudioTime(beat: number, loopOffset: number = 0): number {
    const loopDurationSeconds = this._loopDurationBeats * (60 / this._tempo);
    const beatSeconds = beat * (60 / this._tempo);
    
    // Get the current loop count directly from elapsed time (no state)
    const currentLoop = this.getLoopCount();
    const absoluteLoop = currentLoop + loopOffset;
    
    return this.startTime + beatSeconds + (absoluteLoop * loopDurationSeconds);
  }
  
  /**
   * Convert beat duration to seconds
   */
  beatsToSeconds(beats: number): number {
    return beats * (60 / this._tempo);
  }
  
  /**
   * Get the next measure boundary beat position
   */
  getNextMeasureBoundary(): number {
    const currentBeat = this.getPositionInBeats();
    const beatsPerMeasure = this.beatsPerMeasure;
    return Math.ceil(currentBeat / beatsPerMeasure) * beatsPerMeasure;
  }
  
  /**
   * Set callback for loop events
   */
  onLoop(callback: () => void): void {
    this.onLoopCallback = callback;
  }
  
  /**
   * Get AudioContext for creating audio nodes
   */
  getAudioContext(): AudioContext {
    return this.audioContext;
  }
  
  /**
   * Get current AudioContext time
   */
  getCurrentTime(): number {
    return this.audioContext.currentTime;
  }
}
