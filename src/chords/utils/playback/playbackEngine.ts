/**
 * Playback Engine
 * 
 * Orchestrates all playback components:
 * - Transport for time management
 * - Tracks for instrument playback
 * - Scheduler loop for audio scheduling
 * - UI loop for note highlighting
 * - Live editing for parameter changes
 * - Reverb for spatial depth and realism
 */

import type { TimeSignature } from '../../types';
import type { SoundType } from '../../types/soundOptions';
import type { StyledChordNotes } from '../chordStyling';
import { durationToBeats } from '../durationValidation';
import { Transport } from './transport';
import { Track } from './track';
import { 
  PianoSynthesizer, 
  SimpleSynthesizer, 
  SampledPiano,
  type WaveformType,
  type Instrument,
} from './instruments';
import type { NoteEvent, NoteParams, ActiveNotes, PendingChanges, PlaybackConfig } from './types';
import { createReverb, type ReverbNodes } from '../../../shared/audio/reverb';

/**
 * Convert MIDI note number to frequency
 */
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Check if a duration string is a rest
 */
function isRest(duration: string): boolean {
  return duration.includes('r');
}

/**
 * Callback for playback state updates (used for UI highlighting)
 */
export type PlaybackUpdateCallback = (
  positionInBeats: number,
  activeNotes: Map<number, ActiveNotes>,
  isPlaying: boolean
) => void;

/**
 * Callback for sample loading progress
 */
export type SampleLoadingCallback = (loaded: number, total: number) => void;

export class PlaybackEngine {
  private audioContext: AudioContext | null = null;
  private transport: Transport | null = null;
  private trebleTrack: Track | null = null;
  private bassTrack: Track | null = null;
  
  // Audio chain
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbNodes: ReverbNodes | null = null;
  private reverbInitialized: boolean = false;
  
  // Sampled piano instances (shared across tracks)
  private sampledPiano: SampledPiano | null = null;
  private samplesLoading: boolean = false;
  private onSampleLoadingProgress: SampleLoadingCallback | null = null;
  
  // Scheduler state
  private schedulerInterval: number | null = null;
  private uiAnimationFrame: number | null = null;
  
  // Configuration
  private styledChords: StyledChordNotes[] = [];
  private timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  private soundType: SoundType = 'piano';
  
  // Callbacks
  private onUpdate: PlaybackUpdateCallback | null = null;
  
  // Pending changes for measure boundary application
  private pendingChanges: PendingChanges | null = null;
  
  // Recovery state for handling AudioContext suspension and rebuilds
  private needsRecoveryScheduling: boolean = false;
  private wasSuspended: boolean = false;
  
  // Constants
  private readonly LOOKAHEAD_MS = 200;      // Schedule 200ms ahead (increased for stability)
  private readonly SCHEDULE_INTERVAL_MS = 50;  // Check every 50ms
  private readonly RECOVERY_LOOKBACK_BEATS = 0.5;  // Look back half a beat during recovery
  
  /**
   * Get or create AudioContext
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || 
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }
  
  /**
   * Initialize audio chain (master gain -> reverb dry/wet -> compressor -> destination)
   */
  private async initAudioChain(): Promise<void> {
    const ctx = this.getAudioContext();
    
    // Master gain for overall volume control
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.8;
    
    // Compressor to prevent clipping
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.1;
    
    // Initialize reverb with moderate wet level for piano (0.25 = 25% wet)
    // This adds warmth, space, and helps samples sound more natural/musical
    if (!this.reverbInitialized) {
      try {
        this.reverbNodes = await createReverb(ctx, undefined, 0.25);
        this.reverbInitialized = true;
      } catch (error) {
        console.warn('Failed to initialize reverb, continuing without:', error);
        // Fallback: direct connection without reverb
        this.masterGain.connect(this.compressor);
        this.compressor.connect(ctx.destination);
        return;
      }
    }
    
    // Chain with reverb using a proper dry/wet split
    // Create a splitter gain to avoid double-signal issues
    const reverbInput = ctx.createGain();
    reverbInput.gain.value = 1.0;
    
    // masterGain -> reverbInput -> (split to dry and wet)
    this.masterGain.connect(reverbInput);
    
    // Dry path: reverbInput -> dryGain -> compressor
    reverbInput.connect(this.reverbNodes!.dryGain);
    this.reverbNodes!.dryGain.connect(this.compressor);
    
    // Wet path: reverbInput -> convolver -> (delay, filter already connected) -> wetGain -> compressor
    reverbInput.connect(this.reverbNodes!.convolver);
    this.reverbNodes!.wetGain.connect(this.compressor);
    
    // Final output
    this.compressor.connect(ctx.destination);
  }
  
  /**
   * Create instrument based on sound type
   */
  private createInstrument(soundType: SoundType): Instrument {
    const ctx = this.getAudioContext();
    
    if (soundType === 'piano-sampled') {
      // Use shared sampled piano instance if available and loaded
      if (this.sampledPiano && this.sampledPiano.isReady()) {
        return this.sampledPiano;
      }
      // Fall back to synth if samples aren't loaded
      console.warn('Sampled piano not ready, falling back to synthesized piano');
      return new PianoSynthesizer(ctx);
    } else if (soundType === 'piano') {
      return new PianoSynthesizer(ctx);
    } else {
      return new SimpleSynthesizer(ctx, soundType as WaveformType);
    }
  }
  
  /**
   * Set callback for sample loading progress
   */
  setSampleLoadingCallback(callback: SampleLoadingCallback | null): void {
    this.onSampleLoadingProgress = callback;
  }
  
  /**
   * Check if samples are loaded and ready
   */
  areSamplesLoaded(): boolean {
    return this.sampledPiano?.isReady() ?? false;
  }
  
  /**
   * Check if samples are currently loading
   */
  areSamplesLoading(): boolean {
    return this.samplesLoading;
  }
  
  /**
   * Pre-load piano samples
   * Call this before starting playback with sampled piano for best experience
   */
  async loadSamples(): Promise<boolean> {
    if (this.sampledPiano?.isReady()) {
      return true;
    }
    
    if (this.samplesLoading) {
      // Wait for existing load to complete
      while (this.samplesLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.sampledPiano?.isReady() ?? false;
    }
    
    this.samplesLoading = true;
    
    try {
      const ctx = this.getAudioContext();
      
      // Resume AudioContext if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Create sampled piano if needed
      if (!this.sampledPiano) {
        this.sampledPiano = new SampledPiano(ctx);
      }
      
      // Set up progress callback
      this.sampledPiano.setLoadingProgressCallback((loaded, total) => {
        this.onSampleLoadingProgress?.(loaded, total);
      });
      
      // Load samples
      const success = await this.sampledPiano.loadSamples();
      
      // Connect to audio chain if we have one
      if (success && this.masterGain) {
        this.sampledPiano.connect(this.masterGain);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to load piano samples:', error);
      return false;
    } finally {
      this.samplesLoading = false;
    }
  }
  
  /**
   * Convert StyledChordNotes to NoteEvents for a track
   */
  private buildNoteEvents(
    styledChords: StyledChordNotes[],
    trackType: 'treble' | 'bass',
    timeSignature: TimeSignature
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const beatValue = timeSignature.denominator;
    const beatsPerMeasure = timeSignature.numerator;
    
    styledChords.forEach((styledChord, measureIndex) => {
      const measureStartBeat = measureIndex * beatsPerMeasure;
      const noteGroups = trackType === 'treble' ? styledChord.trebleNotes : styledChord.bassNotes;
      
      let currentBeat = 0;
      noteGroups.forEach((group) => {
        // Skip rests
        if (!isRest(group.duration) && group.notes.length > 0) {
          const durationBeats = durationToBeats(group.duration, beatValue);
          
          // Calculate volume normalization based on number of notes
          // More notes = lower individual velocity to prevent clipping
          const noteCount = group.notes.length;
          const velocity = Math.min(0.9, 0.9 / Math.sqrt(noteCount));
          
          const notes: NoteParams[] = group.notes.map(midiNote => ({
            frequency: midiToFrequency(midiNote),
            duration: durationBeats,
            velocity,
          }));
          
          events.push({
            beatPosition: measureStartBeat + currentBeat,
            notes,
          });
        }
        
        // Always advance beat position, even for rests
        currentBeat += durationToBeats(group.duration, beatValue);
      });
    });
    
    return events;
  }
  
  /**
   * Calculate which notes should be active at a given beat position
   */
  private calculateActiveNotes(beat: number): Map<number, ActiveNotes> {
    const activeNotes = new Map<number, ActiveNotes>();
    const beatValue = this.timeSignature.denominator;
    const beatsPerMeasure = this.timeSignature.numerator;
    
    // Calculate which measure we're in
    const measureIndex = Math.floor(beat / beatsPerMeasure);
    const beatInMeasure = beat % beatsPerMeasure;
    
    if (measureIndex < 0 || measureIndex >= this.styledChords.length) {
      return activeNotes;
    }
    
    const styledChord = this.styledChords[measureIndex];
    const trebleActive = new Set<number>();
    const bassActive = new Set<number>();
    
    // Helper to find active group
    const findActiveGroup = (
      noteGroups: Array<{ notes: number[]; duration: string }>,
      activeSet: Set<number>
    ) => {
      let groupBeat = 0;
      noteGroups.forEach((group, groupIndex) => {
        const durationBeats = durationToBeats(group.duration, beatValue);
        const endBeat = groupBeat + durationBeats;
        
        // Note is active if current beat is within its duration
        const tolerance = 0.05;
        if (beatInMeasure >= groupBeat - tolerance && beatInMeasure < endBeat + tolerance) {
          activeSet.add(groupIndex);
        }
        
        groupBeat = endBeat;
      });
    };
    
    findActiveGroup(styledChord.trebleNotes, trebleActive);
    findActiveGroup(styledChord.bassNotes, bassActive);
    
    activeNotes.set(measureIndex, { treble: trebleActive, bass: bassActive });
    
    return activeNotes;
  }
  
  /**
   * Scheduler tick - called periodically to schedule upcoming notes
   */
  private schedulerTick = (): void => {
    if (!this.transport || !this.transport.isPlaying()) return;
    
    const ctx = this.getAudioContext();
    
    // Handle AudioContext suspension (common when tab loses focus)
    // Don't return early - mark for recovery and try to resume
    if (ctx.state === 'suspended') {
      this.wasSuspended = true;
      ctx.resume().catch(err => console.warn('Failed to resume AudioContext:', err));
      // Continue anyway - we'll schedule notes that will play once resumed
    }
    
    // Check if we just recovered from suspension
    if (this.wasSuspended && ctx.state === 'running') {
      this.wasSuspended = false;
      this.needsRecoveryScheduling = true;
      // Reset track scheduling to allow immediate rescheduling
      this.trebleTrack?.resetScheduling();
      this.bassTrack?.resetScheduling();
    }
    
    const currentBeat = this.transport.getPositionInBeats();
    const currentLoop = this.transport.getLoopCount();
    const tempo = this.transport.tempo;
    const lookaheadBeats = (this.LOOKAHEAD_MS / 1000) * (tempo / 60);
    
    // Check for pending changes at measure boundary
    this.applyPendingChangesIfReady(currentBeat);
    
    // Calculate scheduling range
    // During recovery, look back slightly to catch any notes we might have missed
    const lookback = this.needsRecoveryScheduling ? this.RECOVERY_LOOKBACK_BEATS : 0;
    const fromBeat = Math.max(0, currentBeat - lookback);
    const toBeat = currentBeat + lookaheadBeats;
    const totalBeats = this.transport.loopDurationBeats;
    
    // Clear recovery flag after using it
    if (this.needsRecoveryScheduling) {
      this.needsRecoveryScheduling = false;
    }
    
    // Schedule notes for each track
    if (this.trebleTrack) {
      this.trebleTrack.scheduleNotesInRange(fromBeat, Math.min(toBeat, totalBeats), this.transport, currentLoop);
    }
    if (this.bassTrack) {
      this.bassTrack.scheduleNotesInRange(fromBeat, Math.min(toBeat, totalBeats), this.transport, currentLoop);
    }
    
    // Handle loop boundary - schedule start of next loop
    if (toBeat >= totalBeats) {
      const overflow = toBeat - totalBeats;
      const nextLoop = currentLoop + 1;
      
      if (this.trebleTrack) {
        this.trebleTrack.scheduleNotesInRange(0, overflow, this.transport, nextLoop);
      }
      if (this.bassTrack) {
        this.bassTrack.scheduleNotesInRange(0, overflow, this.transport, nextLoop);
      }
    }
  };
  
  /**
   * Apply pending changes if we've reached the target beat
   */
  private applyPendingChangesIfReady(currentBeat: number): void {
    if (!this.pendingChanges) return;
    
    // Check if we've reached the target beat (with small tolerance)
    if (currentBeat >= this.pendingChanges.applyAtBeat - 0.1) {
      const changes = this.pendingChanges;
      this.pendingChanges = null;
      
      // Apply changes
      if (changes.styledChords) {
        this.styledChords = changes.styledChords;
        this.rebuildTracks();
      }
      if (changes.tempo && this.transport) {
        this.transport.setTempo(changes.tempo);
      }
      if (changes.timeSignature) {
        this.timeSignature = changes.timeSignature;
        if (this.transport) {
          this.transport.setTimeSignature(changes.timeSignature);
        }
        this.rebuildTracks();
      }
      if (changes.soundType) {
        this.changeSoundType(changes.soundType);
      }
    }
  }
  
  /**
   * Rebuild tracks with current configuration
   */
  private rebuildTracks(): void {
    if (!this.transport || !this.masterGain) return;
    
    const ctx = this.getAudioContext();
    const totalBeats = this.styledChords.length * this.timeSignature.numerator;
    
    // Update transport loop duration
    this.transport.setLoopDuration(totalBeats);
    
    // Build new events
    const trebleEvents = this.buildNoteEvents(this.styledChords, 'treble', this.timeSignature);
    const bassEvents = this.buildNoteEvents(this.styledChords, 'bass', this.timeSignature);
    
    // For sampled piano, use the shared instance for both tracks
    // This is more efficient and ensures samples are shared
    const useSampledPiano = this.soundType === 'piano-sampled' && this.sampledPiano?.isReady();
    
    // Update track events (or create tracks if needed)
    if (!this.trebleTrack) {
      const instrument = useSampledPiano ? this.sampledPiano! : this.createInstrument(this.soundType);
      this.trebleTrack = new Track('treble', instrument, ctx, this.masterGain);
    }
    if (!this.bassTrack) {
      // For sampled piano, share the same instrument instance
      // For synth instruments, create separate instances to avoid interference
      const instrument = useSampledPiano ? this.sampledPiano! : this.createInstrument(this.soundType);
      this.bassTrack = new Track('bass', instrument, ctx, this.masterGain);
    }
    
    this.trebleTrack.setEvents(trebleEvents);
    this.bassTrack.setEvents(bassEvents);
    
    // Force immediate rescheduling to avoid gaps
    this.forceReschedule();
  }
  
  /**
   * Force immediate rescheduling of notes
   * Called after configuration changes to ensure seamless playback
   */
  private forceReschedule(): void {
    if (!this.transport?.isPlaying()) return;
    
    // Enable recovery mode for extended scheduling window
    this.needsRecoveryScheduling = true;
    
    // Reset track scheduling state
    this.trebleTrack?.resetScheduling();
    this.bassTrack?.resetScheduling();
    
    // Immediately trigger a scheduler tick to schedule notes
    this.schedulerTick();
  }
  
  /**
   * UI update loop - called via requestAnimationFrame for smooth highlighting
   */
  private uiTick = (): void => {
    if (!this.transport) {
      this.uiAnimationFrame = null;
      return;
    }
    
    const isPlaying = this.transport.isPlaying();
    const currentBeat = this.transport.getPositionInBeats();
    
    // Calculate active notes for highlighting
    const activeNotes = this.calculateActiveNotes(currentBeat);
    
    // Notify callback
    if (this.onUpdate) {
      this.onUpdate(currentBeat, activeNotes, isPlaying);
    }
    
    // Continue loop if playing
    if (isPlaying) {
      this.uiAnimationFrame = requestAnimationFrame(this.uiTick);
    } else {
      this.uiAnimationFrame = null;
    }
  };
  
  /**
   * Start playback
   */
  async start(config: PlaybackConfig, onUpdate: PlaybackUpdateCallback): Promise<void> {
    // Store callback
    this.onUpdate = onUpdate;
    
    // Store configuration
    this.styledChords = config.styledChords;
    this.timeSignature = config.timeSignature;
    this.soundType = config.soundType;
    
    // Initialize audio
    const ctx = this.getAudioContext();
    
    // Resume AudioContext if suspended (required by browsers for user-initiated audio)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(err => console.warn('Failed to resume AudioContext:', err));
    }
    
    // Initialize audio chain (includes reverb setup)
    if (!this.masterGain) {
      await this.initAudioChain();
    }
    
    // If using sampled piano, ensure samples are loaded
    if (config.soundType === 'piano-sampled' && !this.areSamplesLoaded()) {
      const loaded = await this.loadSamples();
      if (!loaded) {
        console.warn('Failed to load piano samples, falling back to synth');
        this.soundType = 'piano'; // Fall back to synth
      }
    }
    
    // Create transport
    const totalBeats = this.styledChords.length * this.timeSignature.numerator;
    this.transport = new Transport(ctx);
    this.transport.start(config.tempo, totalBeats, config.timeSignature);
    
    // Set up loop callback
    this.transport.onLoop(() => {
      // Reset track scheduling on loop
      this.trebleTrack?.resetScheduling();
      this.bassTrack?.resetScheduling();
    });
    
    // Build and initialize tracks
    this.rebuildTracks();
    
    // Start scheduler loop
    this.schedulerInterval = window.setInterval(this.schedulerTick, this.SCHEDULE_INTERVAL_MS);
    
    // Do an immediate scheduler tick to start audio
    this.schedulerTick();
    
    // Start UI loop
    this.uiAnimationFrame = requestAnimationFrame(this.uiTick);
  }
  
  /**
   * Stop playback
   */
  stop(): void {
    // Stop scheduler
    if (this.schedulerInterval !== null) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    
    // Stop UI loop
    if (this.uiAnimationFrame !== null) {
      cancelAnimationFrame(this.uiAnimationFrame);
      this.uiAnimationFrame = null;
    }
    
    // Stop transport
    if (this.transport) {
      this.transport.stop();
    }
    
    // Stop all track sounds with fade
    this.trebleTrack?.stopAll(50);
    this.bassTrack?.stopAll(50);
    
    // Clear pending changes and recovery state
    this.pendingChanges = null;
    this.needsRecoveryScheduling = false;
    this.wasSuspended = false;
    
    // Final UI update to clear highlights
    if (this.onUpdate) {
      this.onUpdate(0, new Map(), false);
    }
  }
  
  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.transport?.isPlaying() ?? false;
  }
  
  /**
   * Set tempo (immediate - maintains beat position)
   */
  setTempo(newTempo: number): void {
    if (!this.transport || !this.transport.isPlaying()) return;
    
    // Update transport tempo (maintains beat position)
    // Don't stop current sounds - let them finish naturally
    // The new tempo will apply to newly scheduled notes
    this.transport.setTempo(newTempo);
    
    // Force immediate rescheduling with new tempo
    this.forceReschedule();
  }
  
  /**
   * Update content (queued for next measure boundary)
   */
  updateContent(newStyledChords: StyledChordNotes[]): void {
    if (!this.transport || !this.transport.isPlaying()) {
      // Not playing, just update directly
      this.styledChords = newStyledChords;
      return;
    }
    
    // Queue for next measure boundary
    const nextMeasure = this.transport.getNextMeasureBoundary();
    
    // If we already have pending changes, update them
    if (this.pendingChanges) {
      this.pendingChanges.styledChords = newStyledChords;
      this.pendingChanges.applyAtBeat = nextMeasure;
    } else {
      this.pendingChanges = {
        styledChords: newStyledChords,
        applyAtBeat: nextMeasure,
      };
    }
  }
  
  /**
   * Change sound type (immediate with crossfade)
   */
  setSoundType(newSoundType: SoundType): void {
    if (this.soundType === newSoundType) return;
    
    this.soundType = newSoundType;
    
    if (!this.transport?.isPlaying() || !this.masterGain) {
      // Not playing, just record the change
      return;
    }
    
    this.changeSoundType(newSoundType);
  }
  
  /**
   * Internal method to change sound type during playback
   */
  private changeSoundType(newSoundType: SoundType): void {
    // Fade out and replace instruments
    if (this.trebleTrack) {
      this.trebleTrack.stopAll(50);
      const newInstrument = this.createInstrument(newSoundType);
      this.trebleTrack.setInstrument(newInstrument);
    }
    
    if (this.bassTrack) {
      this.bassTrack.stopAll(50);
      const newInstrument = this.createInstrument(newSoundType);
      this.bassTrack.setInstrument(newInstrument);
    }
    
    // Force immediate rescheduling with recovery mode
    this.forceReschedule();
  }
  
  /**
   * Update time signature (queued for next measure boundary)
   */
  setTimeSignature(newTimeSignature: TimeSignature): void {
    if (!this.transport || !this.transport.isPlaying()) {
      this.timeSignature = newTimeSignature;
      return;
    }
    
    const nextMeasure = this.transport.getNextMeasureBoundary();
    
    if (this.pendingChanges) {
      this.pendingChanges.timeSignature = newTimeSignature;
      this.pendingChanges.applyAtBeat = nextMeasure;
    } else {
      this.pendingChanges = {
        timeSignature: newTimeSignature,
        applyAtBeat: nextMeasure,
      };
    }
  }
  
  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    if (!this.masterGain) return;
    
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(volume, now + 0.05);
  }
  
  /**
   * Set reverb wet level (0-1)
   * 0 = completely dry, 1 = completely wet
   * Recommended range for piano: 0.1-0.3
   */
  setReverbLevel(wetLevel: number): void {
    if (!this.reverbNodes) return;
    
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const normalizedWet = Math.max(0, Math.min(1, wetLevel));
    
    // Smoothly transition to new levels
    this.reverbNodes.wetGain.gain.setTargetAtTime(normalizedWet, now, 0.02);
    this.reverbNodes.dryGain.gain.setTargetAtTime(1 - normalizedWet, now, 0.02);
  }
  
  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();
    
    // Dispose tracks
    this.trebleTrack?.dispose();
    this.bassTrack?.dispose();
    this.trebleTrack = null;
    this.bassTrack = null;
    
    // Dispose sampled piano
    this.sampledPiano?.dispose();
    this.sampledPiano = null;
    this.samplesLoading = false;
    this.onSampleLoadingProgress = null;
    
    // Disconnect audio chain
    this.masterGain?.disconnect();
    this.compressor?.disconnect();
    this.masterGain = null;
    this.compressor = null;
    
    // Clean up reverb nodes
    if (this.reverbNodes) {
      this.reverbNodes.cleanup();
      this.reverbNodes = null;
    }
    this.reverbInitialized = false;
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.transport = null;
    this.onUpdate = null;
  }
}

// Singleton instance for easy access
let engineInstance: PlaybackEngine | null = null;

/**
 * Get the singleton playback engine instance
 */
export function getPlaybackEngine(): PlaybackEngine {
  if (!engineInstance) {
    engineInstance = new PlaybackEngine();
  }
  return engineInstance;
}

/**
 * Dispose the singleton instance
 */
export function disposePlaybackEngine(): void {
  if (engineInstance) {
    engineInstance.dispose();
    engineInstance = null;
  }
}
