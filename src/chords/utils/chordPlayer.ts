/**
 * Audio player for chord progressions
 * Plays beat-by-beat based on styled chord notes
 */

import type { SoundType } from '../types/soundOptions';
import type { TimeSignature } from '../types';
import type { StyledChordNotes } from './chordStyling';
import { durationToBeats } from './durationValidation';

/**
 * Information about a single note group that should be highlighted
 */
export interface ActiveNoteGroup {
  measureIndex: number;
  trebleGroupIndex: number | null;
  bassGroupIndex: number | null;
  loopId?: number; // Track which loop this highlight belongs to
}

/**
 * Callback for when a note group starts playing
 * Called for each note group as it starts, allowing multiple simultaneous highlights
 */
export type ChordHighlightCallback = (activeGroup: ActiveNoteGroup) => void;

/**
 * Chord player that schedules and plays chords beat-by-beat based on BPM
 */
class ChordPlayer {
  private timeoutIds: number[] = [];
  private isPlaying = false;
  private isLooping = false;
  private currentStyledChords: StyledChordNotes[] = []; // Array of styled chord notes
  private currentBpm = 120;
  private currentTimeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  private onChordPlay: ChordHighlightCallback | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private startTime = 0;
  private loopCount = 0;
  private soundType: SoundType = 'piano';
  private audioContext: AudioContext | null = null; // Reuse AudioContext for better performance and timing
  private pendingUpdate: {
    styledChords: StyledChordNotes[];
    bpm: number;
    timeSignature: TimeSignature;
    soundType: SoundType;
  } | null = null; // Pending update to apply after current loop completes

  /**
   * Play a chord progression at the specified BPM (loops continuously)
   * Plays beat-by-beat based on styled chord notes
   * If already playing, will update after current measure finishes
   */
  play(
    styledChords: StyledChordNotes[], // Array of styled chord notes with durations
    bpm: number,
    timeSignature: TimeSignature,
    onChordPlay: ChordHighlightCallback,
    onPlaybackEnd: () => void,
    loop: boolean = true,
    soundType: SoundType = 'piano'
  ): void {
    // If already playing, queue an update to happen after current measure
    if (this.isPlaying) {
      this.pendingUpdate = {
        styledChords,
        bpm,
        timeSignature,
        soundType,
      };
      // Update callbacks immediately so highlighting works
      this.onChordPlay = onChordPlay;
      this.onPlaybackEnd = onPlaybackEnd;
      this.isLooping = loop;
      // Update sound type immediately (doesn't affect timing)
      this.soundType = soundType;
      return;
    }

    // Not playing, start fresh
      this.stop();

    this.currentStyledChords = styledChords;
    this.currentBpm = bpm;
    this.currentTimeSignature = timeSignature;
    this.onChordPlay = onChordPlay;
    this.onPlaybackEnd = onPlaybackEnd;
    this.isLooping = loop;
    this.isPlaying = true;
    this.startTime = performance.now();
    this.loopCount = 0;
    this.soundType = soundType;
    this.pendingUpdate = null;

    this.scheduleChords();
  }

  /**
   * Update playback settings mid-playback (will apply after current measure)
   */
  updatePlayback(
    styledChords: StyledChordNotes[],
    bpm: number,
    timeSignature: TimeSignature,
    soundType: SoundType
  ): void {
    if (!this.isPlaying) {
      // Not playing, just update settings
      this.currentStyledChords = styledChords;
      this.currentBpm = bpm;
      this.currentTimeSignature = timeSignature;
      this.soundType = soundType;
      return;
    }

    // Queue update for after current measure
    this.pendingUpdate = {
      styledChords,
      bpm,
      timeSignature,
      soundType,
    };
    // Update sound type immediately (doesn't affect timing)
    this.soundType = soundType;
  }

  /**
   * Update tempo immediately during playback (for responsive tempo changes)
   * Reschedules all remaining notes with the new tempo
   */
  updateTempo(bpm: number): void {
    if (!this.isPlaying) {
      this.currentBpm = bpm;
      return;
    }

    // Store the old tempo to calculate how much time has elapsed
    const oldBpm = this.currentBpm;
    this.currentBpm = bpm;
    
    // Update pendingUpdate if it exists
    if (this.pendingUpdate) {
      this.pendingUpdate.bpm = bpm;
    }
    
    // Reschedule all remaining notes with the new tempo
    // Cancel all existing timeouts
    this.timeoutIds.forEach(id => window.clearTimeout(id));
    this.timeoutIds = [];
    
    // Clear all highlights when tempo changes to prevent stale highlights
    if (this.onChordPlay) {
      this.onChordPlay({
        measureIndex: -1, // Special value to indicate "clear all"
        trebleGroupIndex: null,
        bassGroupIndex: null,
        loopId: this.loopCount,
      });
    }
    
    // Calculate how much time has elapsed since playback started
    const elapsedTime = performance.now() - this.startTime;
    
    // Calculate how many beats have elapsed with the OLD tempo
    const msPerQuarterNoteOld = (60 / oldBpm) * 1000;
    const beatValue = this.currentTimeSignature.denominator;
    const msPerBeatOld = msPerQuarterNoteOld * (4 / beatValue);
    const totalBeatsPerLoop = this.currentStyledChords.length * this.currentTimeSignature.numerator;
    const totalMsPerLoopOld = totalBeatsPerLoop * msPerBeatOld;
    
    // Calculate which loop we're in and how many beats into that loop
    const loopsCompleted = Math.floor(elapsedTime / totalMsPerLoopOld);
    const timeIntoCurrentLoop = elapsedTime - (loopsCompleted * totalMsPerLoopOld);
    const beatsIntoCurrentLoop = timeIntoCurrentLoop / msPerBeatOld;
    
    // Calculate new msPerBeat with new tempo
    const msPerQuarterNoteNew = (60 / bpm) * 1000;
    const msPerBeatNew = msPerQuarterNoteNew * (4 / beatValue);
    
    // Update loop count and start time to reflect the new tempo
    // Adjust startTime so that when we reschedule, the current beat position aligns correctly
    this.loopCount = loopsCompleted;
    this.startTime = performance.now() - (beatsIntoCurrentLoop * msPerBeatNew);
    
    // Reschedule all remaining notes with the new tempo
    this.scheduleChords();
  }

  /**
   * Schedule all chords beat-by-beat based on their durations
   */
  private scheduleChords(): void {
    if (!this.isPlaying) return;

    const loopId = this.loopCount;
    
    // Clear highlights at the start of each loop (including the first one)
    // This ensures old highlights from previous loops don't persist
    // Include loopId so App can track which loop we're on
    // Clear synchronously before scheduling any notes
    if (this.onChordPlay) {
      this.onChordPlay({
        measureIndex: -1, // Special value to indicate "clear all"
        trebleGroupIndex: null,
        bassGroupIndex: null,
        loopId, // Include loop ID so App knows which loop we're starting
      });
    }

    // Calculate milliseconds per beat (based on time signature denominator)
    // For 4/4: beat = quarter note, msPerBeat = (60 / BPM) * 1000
    // For 6/8: beat = dotted quarter (3 eighth notes), msPerBeat = (60 / BPM) * 1000 * 1.5
    const msPerQuarterNote = (60 / this.currentBpm) * 1000;
    const beatValue = this.currentTimeSignature.denominator;
    const msPerBeat = msPerQuarterNote * (4 / beatValue);

    // Calculate total duration of one loop (in beats)
    // Each measure has the same number of beats as the time signature numerator
    const totalBeats = this.currentStyledChords.length * this.currentTimeSignature.numerator;

    const startTime = this.startTime + (this.loopCount * totalBeats * msPerBeat);
    let currentBeat = 0;

    // Schedule each note group beat-by-beat
    // To ensure proper synchronization, we need to schedule bass and treble notes together
    // based on their beat positions, not separately
    this.currentStyledChords.forEach((styledChord, measureIndex) => {
      const measureStartBeat = currentBeat;

      // Calculate beat positions for all note groups (both treble and bass)
      // This ensures we can schedule them together at the same beat positions
      const trebleBeatPositions: Array<{ beat: number; group: typeof styledChord.trebleNotes[0]; groupIndex: number }> = [];
      let trebleBeat = 0;
      styledChord.trebleNotes.forEach((trebleGroup, trebleGroupIndex) => {
        trebleBeatPositions.push({ beat: trebleBeat, group: trebleGroup, groupIndex: trebleGroupIndex });
        trebleBeat += durationToBeats(trebleGroup.duration, beatValue);
      });

      const bassBeatPositions: Array<{ beat: number; group: typeof styledChord.bassNotes[0]; groupIndex: number }> = [];
      let bassBeat = 0;
      styledChord.bassNotes.forEach((bassGroup, bassGroupIndex) => {
        bassBeatPositions.push({ beat: bassBeat, group: bassGroup, groupIndex: bassGroupIndex });
        bassBeat += durationToBeats(bassGroup.duration, beatValue);
      });

      // Get all unique beat positions where notes should play
      const allBeatPositions = new Set<number>();
      trebleBeatPositions.forEach(t => allBeatPositions.add(t.beat));
      bassBeatPositions.forEach(b => allBeatPositions.add(b.beat));
      const sortedBeatPositions = Array.from(allBeatPositions).sort((a, b) => a - b);

      // Schedule notes at each beat position
      // Use AudioContext time for precise scheduling to ensure bass/treble alignment
      // AudioContext.currentTime continues even when tab is backgrounded, preventing slowdown
      const audioContext = this.getAudioContext();
      const now = performance.now();
      const audioContextNow = audioContext.currentTime;

      sortedBeatPositions.forEach((beatPosition) => {
        // Use AudioContext time for scheduling to avoid slowdown when tab is inactive
        // AudioContext.currentTime continues even when tab is backgrounded
        const beatTimeInSeconds = ((measureStartBeat + beatPosition) * msPerBeat) / 1000;
        const audioPlayTime = audioContextNow + beatTimeInSeconds;
        // Calculate delay for setTimeout (fallback, but AudioContext timing is primary)
        const playTime = startTime + ((measureStartBeat + beatPosition) * msPerBeat);
        const delay = Math.max(0, playTime - now);

        // Find treble and bass groups that start at this beat position
        const trebleGroupsAtBeat = trebleBeatPositions.filter(t => Math.abs(t.beat - beatPosition) < 0.001);
        const bassGroupsAtBeat = bassBeatPositions.filter(b => Math.abs(b.beat - beatPosition) < 0.001);

        // Check if this is beat 1 of the measure
        const isBeat1 = beatPosition === 0;

      const timeoutId = window.setTimeout(() => {
          if (!this.isPlaying || this.loopCount !== loopId) return;

          const onChordPlay = this.onChordPlay;
          if (!onChordPlay) return;

          // Capture current time when the timeout fires (not when it was scheduled)
          // This ensures accurate timing for removal callbacks
          const currentTime = performance.now();

          // SMART HIGHLIGHTING: Track note durations and clear treble/bass separately
          // Add highlights for notes that start at THIS beat
          trebleGroupsAtBeat.forEach(({ groupIndex, group }) => {
            onChordPlay({
              measureIndex,
              trebleGroupIndex: groupIndex,
              bassGroupIndex: null,
              loopId,
            });
            
            // Schedule removal when this note's duration ends
            // Cap visual highlighting at 1 beat to prevent "sticky" feeling for longer notes
            // This ensures notes highlight for exactly one beat, regardless of their actual duration
            const durationBeats = durationToBeats(group.duration, beatValue);
            const visualHighlightBeats = Math.min(durationBeats, 1.0); // Cap at 1 beat
            const endTime = playTime + (visualHighlightBeats * msPerBeat);
            // Use currentTime (when timeout fired) instead of now (when timeout was scheduled)
            const endDelay = Math.max(1, endTime - currentTime);
            
            if (endDelay < 1000000) {
              const endTimeoutId = window.setTimeout(() => {
                if (!this.isPlaying || this.loopCount !== loopId) return;
                if (this.onChordPlay) {
                  this.onChordPlay({
                    measureIndex,
                    trebleGroupIndex: -(groupIndex + 1), // Negative indicates removal
                    bassGroupIndex: null,
                    loopId,
                  });
                }
              }, endDelay);
              this.timeoutIds.push(endTimeoutId);
            }
          });

          bassGroupsAtBeat.forEach(({ groupIndex, group }) => {
            onChordPlay({
              measureIndex,
              trebleGroupIndex: null,
              bassGroupIndex: groupIndex,
              loopId,
            });
            
            // Schedule removal when this note's duration ends
            // Cap visual highlighting at 1 beat to prevent "sticky" feeling for longer notes
            // This ensures notes highlight for exactly one beat, regardless of their actual duration
            const durationBeats = durationToBeats(group.duration, beatValue);
            const visualHighlightBeats = Math.min(durationBeats, 1.0); // Cap at 1 beat
            const endTime = playTime + (visualHighlightBeats * msPerBeat);
            // Use currentTime (when timeout fired) instead of now (when timeout was scheduled)
            const endDelay = Math.max(1, endTime - currentTime);
            
            if (endDelay < 1000000) {
              const endTimeoutId = window.setTimeout(() => {
                if (!this.isPlaying || this.loopCount !== loopId) return;
                if (this.onChordPlay) {
                  this.onChordPlay({
                    measureIndex,
                    trebleGroupIndex: null,
                    bassGroupIndex: -(groupIndex + 1), // Negative indicates removal
                    loopId,
                  });
                }
              }, endDelay);
              this.timeoutIds.push(endTimeoutId);
            }
          });

          // Play treble notes at this beat position (using AudioContext time for precise timing)
          trebleGroupsAtBeat.forEach(({ group: trebleGroup }) => {
            if (trebleGroup.notes.length > 0) { // Only play if not a rest
              const durationBeats = durationToBeats(trebleGroup.duration, beatValue);
              trebleGroup.notes.forEach(midiNote => {
          const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
                const durationSeconds = (durationBeats * msPerBeat) / 1000;
                this.playToneAtTime(frequency, durationSeconds, audioPlayTime, isBeat1);
              });
            }
        });

          // Play bass notes at this beat position (synchronized with treble using same AudioContext time)
          bassGroupsAtBeat.forEach(({ group: bassGroup }) => {
            if (bassGroup.notes.length > 0) { // Only play if not a rest
              const durationBeats = durationToBeats(bassGroup.duration, beatValue);
              bassGroup.notes.forEach(midiNote => {
                const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
                const durationSeconds = (durationBeats * msPerBeat) / 1000;
                this.playToneAtTime(frequency, durationSeconds, audioPlayTime, isBeat1);
              });
            }
          });
      }, delay);

      this.timeoutIds.push(timeoutId);
      });

      // Update currentBeat to the end of this measure
      // Each measure has exactly numerator beats, so we advance by that amount
      currentBeat += this.currentTimeSignature.numerator;
    });

    // Schedule next loop if looping
    // Calculate the actual end time of the last scheduled note to ensure we don't cut off playback
    // The last note is scheduled at: startTime + (totalBeats - 1) * msPerBeat
    // But we need to account for the duration of the last note as well
    // Use totalBeats * msPerBeat as the loop duration, which ensures all notes finish
    if (this.isLooping) {
      const loopDuration = totalBeats * msPerBeat;
      const loopTimeout = window.setTimeout(() => {
        // Check if still playing and looping before scheduling next loop
        if (this.isPlaying && this.isLooping) {
          // Check for pending update before scheduling next loop
          // This ensures we finish the current loop with old settings, then switch
          if (this.pendingUpdate) {
            // Apply pending update
            this.currentStyledChords = this.pendingUpdate.styledChords;
            this.currentBpm = this.pendingUpdate.bpm;
            this.currentTimeSignature = this.pendingUpdate.timeSignature;
            this.soundType = this.pendingUpdate.soundType;
            this.pendingUpdate = null;
            // Reset timing for new progression
            this.startTime = performance.now();
            this.loopCount = 0;
            // Clear highlights when applying pending update (new progression)
            if (this.onChordPlay) {
              this.onChordPlay({
                measureIndex: -1, // Special value to indicate "clear all"
                trebleGroupIndex: null,
                bassGroupIndex: null,
              });
            }
          } else {
          this.loopCount++;
          }
          // Don't update startTime - keep the original start time and calculate based on loop count
          // This ensures seamless looping without timing drift
          // Schedule the next loop - this will add new timeouts for the next iteration
          this.scheduleChords();
        }
      }, loopDuration);
      this.timeoutIds.push(loopTimeout);
    } else {
      // Schedule end callback
      // Use totalBeats * msPerBeat to ensure all notes finish before ending
      const endDelay = totalBeats * msPerBeat;
      const endTimeout = window.setTimeout(() => {
        if (this.isPlaying && this.onPlaybackEnd) {
          this.isPlaying = false;
          this.onPlaybackEnd();
        }
      }, endDelay);
      this.timeoutIds.push(endTimeout);
    }
  }

  /**
   * Get or create AudioContext (reuse for better performance and timing)
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    // Resume if suspended (browsers require user interaction to start audio)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Play a tone at a specific AudioContext time (for precise synchronization)
   * @param frequency - Frequency in Hz
   * @param duration - Duration in seconds
   * @param startTime - AudioContext time to start playing
   * @param emphasize - If true, play louder (for beat 1 emphasis)
   */
  private playToneAtTime(frequency: number, duration: number, startTime: number, emphasize: boolean = false): void {
    const audioContext = this.getAudioContext();
    
    // Ensure startTime is not in the past - AudioContext requires non-negative times
    // Clamp to currentTime to prevent negative time errors
    const currentTime = audioContext.currentTime;
    const clampedStartTime = Math.max(startTime, currentTime);

    if (this.soundType === 'piano') {
      // Piano synthesis using multiple oscillators with harmonics and ADSR envelope
      this.playPianoTone(audioContext, frequency, duration, clampedStartTime, emphasize);
    } else {
      // Simple oscillator for other sound types
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = this.soundType;

      // Adjust gain based on sound type for better balance
      // Emphasize beat 1 by making it 1.5x louder
      const baseGain = this.soundType === 'square' ? 0.05 : this.soundType === 'sawtooth' ? 0.08 : 0.1;
      const gain = emphasize ? baseGain * 1.5 : baseGain;
      gainNode.gain.setValueAtTime(gain, clampedStartTime);
      // Improved fade-out: use exponential ramp for smoother decay
      gainNode.gain.exponentialRampToValueAtTime(0.001, clampedStartTime + duration);

      oscillator.start(clampedStartTime);
      oscillator.stop(clampedStartTime + duration);
    }
  }

  /**
   * Play a piano-like tone using multiple oscillators with harmonics
   * Enhanced for richer, more dramatic sound
   * @param emphasize - If true, play louder (for beat 1 emphasis)
   * @param startTime - AudioContext time (should already be clamped to currentTime or later)
   */
  private playPianoTone(audioContext: AudioContext, frequency: number, duration: number, startTime: number, emphasize: boolean = false): void {
    // Ensure startTime is not in the past (defensive check)
    const currentTime = audioContext.currentTime;
    const clampedStartTime = Math.max(startTime, currentTime);
    // Piano harmonics: fundamental + overtones at specific ratios
    // Enhanced for richer sound
    const harmonics = [
      { freq: 1.0, gain: 1.0 },    // Fundamental
      { freq: 2.0, gain: 0.6 },    // Octave (increased)
      { freq: 3.0, gain: 0.35 },   // Perfect fifth + octave (increased)
      { freq: 4.0, gain: 0.2 },    // Two octaves (increased)
      { freq: 5.0, gain: 0.1 },    // Major third + two octaves (increased)
      { freq: 6.0, gain: 0.05 },   // Additional harmonic for richness
    ];

    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);

    // ADSR envelope for piano: quick attack, medium decay, sustain, release
    // Shorter release times for cleaner visual/audio alignment
    // Visual highlighting ends at 95% of duration, so audio should fade out quickly too
    const attackTime = 0.02;   // 20ms attack
    const decayTime = 0.1;     // 100ms decay
    const sustainLevel = 0.35; // 35% sustain
    // Shorter release times to match visual highlighting end
    // Visual ends at 95% of duration, so audio should fade out by then
    const releaseTime = duration < 0.5 
      ? Math.min(duration * 0.4, 0.2)  // Shorter notes: 40% of duration, max 200ms
      : Math.min(duration * 0.25, 0.3); // Longer notes: 25% of duration, max 300ms

    const sustainTime = Math.max(0, duration - attackTime - decayTime - releaseTime);

    harmonics.forEach((harmonic) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = frequency * harmonic.freq;
      
      // Apply harmonic-specific gain (increased overall volume)
      // Emphasize beat 1 by making it 1.5x louder
      const baseHarmonicGain = harmonic.gain * 0.2; // Increased from 0.15
      const harmonicGain = emphasize ? baseHarmonicGain * 1.5 : baseHarmonicGain;
      
      // ADSR envelope
      gain.gain.setValueAtTime(0, clampedStartTime);
      gain.gain.linearRampToValueAtTime(harmonicGain, clampedStartTime + attackTime);
      gain.gain.linearRampToValueAtTime(harmonicGain * sustainLevel, clampedStartTime + attackTime + decayTime);
      gain.gain.setValueAtTime(harmonicGain * sustainLevel, clampedStartTime + attackTime + decayTime + sustainTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clampedStartTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(clampedStartTime);
      osc.stop(clampedStartTime + duration);
    });
  }
  
  /**
   * Set the sound type for playback
   */
  setSoundType(soundType: SoundType): void {
    this.soundType = soundType;
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false;
    this.isLooping = false;
    // Clear all timeouts immediately
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];
    // Reset state completely
    this.currentStyledChords = [];
    this.loopCount = 0;
    this.startTime = 0;
    this.pendingUpdate = null;
    // Clear callbacks to prevent highlighting after stop
    this.onChordPlay = null;
    this.onPlaybackEnd = null;
    // Don't close AudioContext - keep it for reuse
    // AudioContext will be reused on next play
  }

  /**
   * Set BPM (will apply at next measure boundary)
   */
  setBpm(bpm: number): void {
    this.currentBpm = bpm;
  }
}

export const chordPlayer = new ChordPlayer();

