/**
 * Pitch Detector using Spotify Basic Pitch
 *
 * Uses ML-based pitch detection for more accurate note transcription,
 * which is then used for chord detection.
 */

import {
  BasicPitch,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly,
  type NoteEventTime,
} from '@spotify/basic-pitch';

// Note names for MIDI to note conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface DetectedNote {
  /** Start time in seconds */
  startTime: number;
  /** Duration in seconds */
  duration: number;
  /** MIDI pitch number (21-108) */
  midiPitch: number;
  /** Note name (e.g., "C4", "F#5") */
  noteName: string;
  /** Pitch class (0-11, where C=0) */
  pitchClass: number;
  /** Amplitude/velocity (0-1) */
  amplitude: number;
  /** Pitch bends if available */
  pitchBends?: number[];
}

export interface PitchDetectionResult {
  /** All detected notes */
  notes: DetectedNote[];
  /** HPCP-like pitch class profile per time window */
  pitchClassProfiles: {
    time: number;
    profile: number[]; // 12-element array for each pitch class
  }[];
  /** Processing stats */
  processingTimeMs: number;
}

// Lazy-loaded BasicPitch instance
let basicPitchInstance: BasicPitch | null = null;
let modelLoadPromise: Promise<BasicPitch> | null = null;

/**
 * Get or create the BasicPitch instance (lazy loaded)
 */
async function getBasicPitch(): Promise<BasicPitch> {
  if (basicPitchInstance) {
    return basicPitchInstance;
  }

  if (modelLoadPromise) {
    return modelLoadPromise;
  }

  modelLoadPromise = (async () => {
    // Model is copied to /assets by viteStaticCopy plugin
    const modelUrl = '/assets/model.json';

    basicPitchInstance = new BasicPitch(modelUrl);
    
    // Wait for model to be ready
    await basicPitchInstance.model;
    
    return basicPitchInstance;
  })();

  return modelLoadPromise;
}

/**
 * Convert MIDI pitch to note name (e.g., 60 -> "C4")
 */
function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Detect pitches in an audio buffer using Basic Pitch ML model
 */
export async function detectPitches(
  audioBuffer: AudioBuffer,
  onProgress?: (progress: number) => void
): Promise<PitchDetectionResult> {
  const startTime = performance.now();

  const basicPitch = await getBasicPitch();

  // Collect model outputs
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  // Resample to mono if needed
  let audioData: Float32Array;
  if (audioBuffer.numberOfChannels > 1) {
    // Mix down to mono
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    audioData = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      audioData[i] = (left[i] + right[i]) / 2;
    }
  } else {
    audioData = audioBuffer.getChannelData(0);
  }

  // Run the model
  await basicPitch.evaluateModel(
    audioData,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (progress) => {
      onProgress?.(progress);
    }
  );


  // Convert to notes with pitch bends
  const noteEvents = outputToNotesPoly(
    frames,
    onsets,
    0.3,  // onsetThresh - slightly higher for cleaner detection
    0.3,  // frameThresh
    5,    // minNoteLen
    true, // inferOnsets
    null, // maxFreq
    null, // minFreq
    true, // melodiaTrick - helps with polyphonic audio
    11    // energyTolerance
  );

  const notesWithBends = addPitchBendsToNoteEvents(contours, noteEvents);
  const noteTimings = noteFramesToTime(notesWithBends);


  // Convert to our format
  const notes: DetectedNote[] = noteTimings.map((note: NoteEventTime) => ({
    startTime: note.startTimeSeconds,
    duration: note.durationSeconds,
    midiPitch: note.pitchMidi,
    noteName: midiToNoteName(note.pitchMidi),
    pitchClass: note.pitchMidi % 12,
    amplitude: note.amplitude,
    pitchBends: note.pitchBends,
  }));

  // Generate pitch class profiles for chord detection
  // Group notes into time windows
  const windowSize = 0.25; // 250ms windows
  const duration = audioBuffer.duration;
  const pitchClassProfiles: { time: number; profile: number[] }[] = [];

  for (let t = 0; t < duration; t += windowSize) {
    const profile = new Array(12).fill(0);
    
    // Find all notes active during this window
    for (const note of notes) {
      const noteEnd = note.startTime + note.duration;
      if (note.startTime <= t + windowSize && noteEnd >= t) {
        // Note is active in this window - add its contribution
        const overlap = Math.min(noteEnd, t + windowSize) - Math.max(note.startTime, t);
        const weight = (overlap / windowSize) * note.amplitude;
        profile[note.pitchClass] += weight;
      }
    }

    // Normalize profile
    const maxVal = Math.max(...profile, 0.001);
    for (let i = 0; i < 12; i++) {
      profile[i] /= maxVal;
    }

    pitchClassProfiles.push({ time: t, profile });
  }

  const processingTimeMs = performance.now() - startTime;

  return {
    notes,
    pitchClassProfiles,
    processingTimeMs,
  };
}
