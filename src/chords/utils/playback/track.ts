/**
 * Track - Encapsulates a single instrument track with its events and gain control
 * 
 * Each track has:
 * - Its own list of note events
 * - Its own instrument instance
 * - Its own gain control (for mixing)
 * - Shared transport (they all sync to the same clock)
 */

import type { Instrument } from './instruments';
import type { NoteEvent } from './types';
import type { Transport } from './transport';

export class Track {
  readonly id: string;
  private instrument: Instrument;
  private gainNode: GainNode;
  private events: NoteEvent[] = [];
  private scheduledUpTo: number = -1;  // Beat position we've scheduled up to
  private muted: boolean = false;
  private lastLoopScheduled: number = -1;  // Track which loop we last scheduled for
  
  constructor(
    id: string,
    instrument: Instrument,
    audioContext: AudioContext,
    destination: AudioNode
  ) {
    this.id = id;
    this.instrument = instrument;
    
    // Create gain node for track volume control
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    
    // Connect: instrument -> gainNode -> destination
    instrument.connect(this.gainNode);
    this.gainNode.connect(destination);
  }
  
  /**
   * Set the note events for this track
   * Events are sorted by beat position for efficient scheduling
   */
  setEvents(events: NoteEvent[]): void {
    this.events = events.slice().sort((a, b) => a.beatPosition - b.beatPosition);
    this.scheduledUpTo = -1;
    this.lastLoopScheduled = -1;
  }
  
  /**
   * Get the current events
   */
  getEvents(): NoteEvent[] {
    return this.events;
  }
  
  /**
   * Schedule notes within a beat range
   * 
   * @param fromBeat - Start of range (inclusive)
   * @param toBeat - End of range (exclusive)
   * @param transport - Transport for timing conversion
   * @param loopNumber - Which loop we're scheduling for (absolute loop number)
   */
  scheduleNotesInRange(
    fromBeat: number,
    toBeat: number,
    transport: Transport,
    loopNumber: number
  ): void {
    if (this.muted) return;
    
    const tempo = transport.tempo;
    const currentTransportLoop = transport.getLoopCount();
    
    // Calculate loop offset relative to transport's current loop
    const loopOffset = loopNumber - currentTransportLoop;
    
    // Handle new loop - reset scheduling when we enter a new loop
    const isNewLoop = loopNumber > this.lastLoopScheduled;
    
    // If we're in a new loop, reset scheduledUpTo to allow scheduling all events again
    if (isNewLoop) {
      this.scheduledUpTo = -1;
      this.lastLoopScheduled = loopNumber;
    }
    
    for (const event of this.events) {
      const beatPosition = event.beatPosition;
      
      // Skip if not in range
      if (beatPosition < fromBeat || beatPosition >= toBeat) continue;
      
      // Skip if already scheduled for this loop
      if (beatPosition <= this.scheduledUpTo && !isNewLoop) continue;
      
      // Calculate absolute audio time for this beat with correct loop offset
      const audioTime = transport.beatToAudioTime(beatPosition, loopOffset);
      
      // Only schedule if the audio time is in the future (or very near future)
      const now = transport.getCurrentTime();
      if (audioTime < now - 0.01) continue; // Skip notes that are too far in the past
      
      // Schedule each note in the event
      event.notes.forEach(note => {
        // Convert beat duration to seconds
        const durationSeconds = note.duration * (60 / tempo);
        
        this.instrument.playNote({
          frequency: note.frequency,
          startTime: audioTime,
          duration: durationSeconds,
          velocity: note.velocity ?? 0.8,
        });
      });
      
      // Update scheduled position
      if (beatPosition > this.scheduledUpTo) {
        this.scheduledUpTo = beatPosition;
      }
    }
  }
  
  /**
   * Reset scheduling state (call when tempo/content changes)
   */
  resetScheduling(): void {
    this.scheduledUpTo = -1;
    this.lastLoopScheduled = -1;
  }
  
  /**
   * Set track muted state
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }
  
  /**
   * Get track muted state
   */
  isMuted(): boolean {
    return this.muted;
  }
  
  /**
   * Set track volume (0-1)
   */
  setVolume(volume: number, audioContext: AudioContext): void {
    const now = audioContext.currentTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
  }
  
  /**
   * Get track volume
   */
  getVolume(): number {
    return this.gainNode.gain.value;
  }
  
  /**
   * Stop all sounds on this track
   */
  stopAll(fadeTimeMs: number = 50): void {
    this.instrument.stopAll(fadeTimeMs);
  }
  
  /**
   * Set a new instrument for this track
   */
  setInstrument(newInstrument: Instrument): void {
    // Stop and disconnect old instrument
    this.instrument.stopAll(30);
    this.instrument.disconnect();
    
    // Connect new instrument
    this.instrument = newInstrument;
    newInstrument.connect(this.gainNode);
    
    // Reset scheduling to reschedule with new instrument
    this.resetScheduling();
  }
  
  /**
   * Get the instrument
   */
  getInstrument(): Instrument {
    return this.instrument;
  }
  
  /**
   * Clean up track resources
   */
  dispose(): void {
    this.instrument.stopAll(10);
    this.instrument.disconnect();
    if (this.instrument.dispose) {
      this.instrument.dispose();
    }
    this.gainNode.disconnect();
  }
}
