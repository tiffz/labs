/**
 * Score Chromagram Builder
 *
 * Converts a PianoScore into a sequence of 12-dimensional chroma vectors
 * at a fixed frame rate (default 10 Hz).  Each chroma bin represents one
 * pitch class (C, C#, D, … , B).
 *
 * This "synthetic chromagram" is aligned with the DTW audio chromagram to
 * produce a non-linear time mapping between score and recording.
 */

import type { PianoScore } from '../types';
import { durationToBeats } from '../types';

export interface ScoreChromaResult {
  /** Sequence of 12-dimensional chroma frames. */
  frames: Float32Array[];
  /** Frame rate in Hz. */
  frameRate: number;
  /** Total duration of the score in seconds. */
  durationSec: number;
}

/**
 * Build a chromagram from a PianoScore.
 *
 * @param score       The score to convert
 * @param bpm         Tempo to use (beats per minute)
 * @param frameRate   Chroma frame rate in Hz (default 10)
 */
export function buildScoreChroma(
  score: PianoScore,
  bpm: number,
  frameRate = 10,
): ScoreChromaResult {
  const secPerBeat = 60 / bpm;
  const beatsPerMeasure =
    score.timeSignature.numerator * (4 / score.timeSignature.denominator);

  // Collect all sounding note events: [startSec, endSec, pitchClass]
  interface NoteSpan {
    startSec: number;
    endSec: number;
    pitchClass: number;
  }
  const spans: NoteSpan[] = [];

  for (const part of score.parts) {
    let beatPos = 0;
    for (const measure of part.measures) {
      let measureBeatPos = 0;
      for (const note of measure.notes) {
        if (note.grace) continue;
        const dur = durationToBeats(note.duration, note.dotted);
        if (!note.rest && !note.tieStop) {
          const startSec = (beatPos + measureBeatPos) * secPerBeat;
          const endSec = startSec + dur * secPerBeat;
          for (const pitch of note.pitches) {
            spans.push({
              startSec,
              endSec,
              pitchClass: ((pitch % 12) + 12) % 12,
            });
          }
        }
        measureBeatPos += dur;
      }
      beatPos += Math.max(measureBeatPos, beatsPerMeasure);
    }
  }

  if (spans.length === 0) {
    return { frames: [], frameRate, durationSec: 0 };
  }

  const maxEnd = Math.max(...spans.map(s => s.endSec));
  const durationSec = maxEnd;
  const numFrames = Math.max(1, Math.ceil(durationSec * frameRate));
  const frameDur = 1 / frameRate;

  const frames: Float32Array[] = [];

  for (let f = 0; f < numFrames; f++) {
    const frameStart = f * frameDur;
    const frameEnd = frameStart + frameDur;
    const chroma = new Float32Array(12);

    for (const span of spans) {
      // Check overlap with this frame
      if (span.endSec <= frameStart || span.startSec >= frameEnd) continue;

      // Energy decays linearly from onset (simple model)
      const age = Math.max(0, frameStart - span.startSec);
      const totalLen = span.endSec - span.startSec;
      const energy = totalLen > 0 ? Math.max(0.1, 1 - age / totalLen) : 1;
      chroma[span.pitchClass] += energy;
    }

    // L2-normalise
    let norm = 0;
    for (let k = 0; k < 12; k++) norm += chroma[k] * chroma[k];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let k = 0; k < 12; k++) chroma[k] /= norm;
    }

    frames.push(chroma);
  }

  return { frames, frameRate, durationSec };
}
