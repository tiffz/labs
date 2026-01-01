/**
 * Audio player for chord progressions
 * Plays beat-by-beat based on styled chord notes
 */

import type { SoundType } from '../types/soundOptions';
import type { TimeSignature } from '../types';
import type { StyledChordNotes } from './chordStyling';
import { durationToBeats } from './durationValidation';

/**
 * Callback for when a chord/beat starts playing
 */
export type ChordHighlightCallback = (chordIndex: number) => void;

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

  /**
   * Play a chord progression at the specified BPM (loops continuously)
   * Plays beat-by-beat based on styled chord notes
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
    if (this.isPlaying) {
      this.stop();
    }

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

    this.scheduleChords();
  }

  /**
   * Schedule all chords beat-by-beat based on their durations
   */
  private scheduleChords(): void {
    if (!this.isPlaying) return;

    // Calculate milliseconds per beat (based on time signature denominator)
    // For 4/4: beat = quarter note, msPerBeat = (60 / BPM) * 1000
    // For 6/8: beat = dotted quarter (3 eighth notes), msPerBeat = (60 / BPM) * 1000 * 1.5
    const msPerQuarterNote = (60 / this.currentBpm) * 1000;
    const beatValue = this.currentTimeSignature.denominator;
    const msPerBeat = msPerQuarterNote * (4 / beatValue);

    // Calculate total duration of one loop
    let totalBeats = 0;
    this.currentStyledChords.forEach((styledChord) => {
      // Calculate beats for this measure
      styledChord.trebleNotes.forEach(group => {
        totalBeats += durationToBeats(group.duration, beatValue);
      });
    });

    const startTime = this.startTime + (this.loopCount * totalBeats * msPerBeat);
    let currentBeat = 0;

    // Schedule each note group beat-by-beat
    this.currentStyledChords.forEach((styledChord, measureIndex) => {
      const measureStartBeat = currentBeat;
      let isFirstGroupInMeasure = true;

      // Schedule treble notes
      styledChord.trebleNotes.forEach((trebleGroup, groupIndex) => {
        const durationBeats = durationToBeats(trebleGroup.duration, beatValue);
        const playTime = startTime + (currentBeat * msPerBeat);
        const delay = Math.max(0, playTime - performance.now());
        const shouldHighlight = isFirstGroupInMeasure && groupIndex === 0;

        const timeoutId = window.setTimeout(() => {
          if (!this.isPlaying) return;

          // Callback for highlighting - highlight on first note group of each measure
          // Call this BEFORE playing notes so highlighting appears immediately
          if (this.onChordPlay && shouldHighlight) {
            this.onChordPlay(measureIndex);
          }

          // Play all notes in the treble group
          trebleGroup.notes.forEach(midiNote => {
            const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            const durationSeconds = (durationBeats * msPerBeat) / 1000;
            this.playTone(frequency, durationSeconds);
          });
        }, delay);

        this.timeoutIds.push(timeoutId);
        currentBeat += durationBeats;
        isFirstGroupInMeasure = false;
      });

      // Schedule bass notes (aligned with treble)
      let bassBeat = 0;
      styledChord.bassNotes.forEach((bassGroup) => {
        const durationBeats = durationToBeats(bassGroup.duration, beatValue);
        const playTime = startTime + ((measureStartBeat + bassBeat) * msPerBeat);
        const delay = Math.max(0, playTime - performance.now());

        const timeoutId = window.setTimeout(() => {
          if (!this.isPlaying) return;

          // Play all notes in the bass group
          bassGroup.notes.forEach(midiNote => {
            const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            const durationSeconds = (durationBeats * msPerBeat) / 1000;
            this.playTone(frequency, durationSeconds);
          });
        }, delay);

        this.timeoutIds.push(timeoutId);
        bassBeat += durationBeats;
      });
    });

    // Schedule next loop if looping
    if (this.isLooping) {
      const loopDuration = totalBeats * msPerBeat;
      const loopTimeout = window.setTimeout(() => {
        if (this.isPlaying) {
          this.loopCount++;
          this.scheduleChords();
        }
      }, loopDuration);
      this.timeoutIds.push(loopTimeout);
    } else {
      // Schedule end callback
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
   * Play a tone at a given frequency with the selected sound type
   */
  private playTone(frequency: number, duration: number): void {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const now = audioContext.currentTime;

    if (this.soundType === 'piano') {
      // Piano synthesis using multiple oscillators with harmonics and ADSR envelope
      this.playPianoTone(audioContext, frequency, duration, now);
    } else {
      // Simple oscillator for other sound types
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = this.soundType;

      // Adjust gain based on sound type for better balance
      const baseGain = this.soundType === 'square' ? 0.05 : this.soundType === 'sawtooth' ? 0.08 : 0.1;
      gainNode.gain.setValueAtTime(baseGain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    }
  }

  /**
   * Play a piano-like tone using multiple oscillators with harmonics
   * Enhanced for richer, more dramatic sound
   */
  private playPianoTone(audioContext: AudioContext, frequency: number, duration: number, startTime: number): void {
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
    // Enhanced for more dramatic sound
    const attackTime = 0.02;   // 20ms attack (slightly longer for more presence)
    const decayTime = 0.15;    // 150ms decay (longer for richer sound)
    const sustainLevel = 0.4;  // 40% sustain (higher for more body)
    const releaseTime = Math.min(0.5, duration * 0.6); // Release is 60% of duration or 500ms max

    const sustainTime = Math.max(0, duration - attackTime - decayTime - releaseTime);

    harmonics.forEach((harmonic) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = frequency * harmonic.freq;
      
      // Apply harmonic-specific gain (increased overall volume)
      const harmonicGain = harmonic.gain * 0.2; // Increased from 0.15
      
      // ADSR envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(harmonicGain, startTime + attackTime);
      gain.gain.linearRampToValueAtTime(harmonicGain * sustainLevel, startTime + attackTime + decayTime);
      gain.gain.setValueAtTime(harmonicGain * sustainLevel, startTime + attackTime + decayTime + sustainTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
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
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];
    this.currentStyledChords = [];
  }

  /**
   * Set BPM (will apply at next measure boundary)
   */
  setBpm(bpm: number): void {
    this.currentBpm = bpm;
  }
}

export const chordPlayer = new ChordPlayer();

