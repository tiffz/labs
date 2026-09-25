import type { ResolvedMelodyNote } from './maqamMelody';

export interface TimelineEntry {
  index: number;
  /** Seconds from the start of the phrase. */
  startSeconds: number;
  /** How long the note is held before its note-off. */
  holdSeconds: number;
}

export interface MelodyTimeline {
  entries: TimelineEntry[];
  /** Total phrase length, including the last note's value. */
  totalSeconds: number;
}

/**
 * Fraction of a note's value that the note is actually held.
 *
 * Slightly detached rather than legato: on a plucked string each note is a new
 * attack, and holding to the full value makes a run smear into one chord.
 */
const ARTICULATION = 0.92;

/**
 * Lay a resolved melody out in seconds.
 *
 * Pure, so the schedule can be asserted without an AudioContext — and so the
 * audio and the visual highlight read the *same* timeline rather than deriving
 * two of their own, which is how a staff ends up lighting a note the ear is not
 * hearing.
 */
export function buildMelodyTimeline(
  notes: ResolvedMelodyNote[],
  beatsPerMinute: number,
): MelodyTimeline {
  const safeBpm = Number.isFinite(beatsPerMinute) && beatsPerMinute > 0 ? beatsPerMinute : 60;
  const secondsPerBeat = 60 / safeBpm;

  const entries: TimelineEntry[] = [];
  let cursor = 0;
  notes.forEach((note, index) => {
    const duration = note.beats * secondsPerBeat;
    entries.push({
      index,
      startSeconds: cursor,
      holdSeconds: duration * ARTICULATION,
    });
    cursor += duration;
  });

  return { entries, totalSeconds: cursor };
}

/**
 * Which note is sounding at `seconds` into the phrase, or `null` between the
 * end of the phrase and its loop point.
 *
 * Returns `null` rather than clamping to the last note: a highlight stuck on
 * the final note after playback ends is the "failure as a valid value" shape —
 * indistinguishable from that note genuinely sounding.
 */
export function noteIndexAt(timeline: MelodyTimeline, seconds: number): number | null {
  if (seconds < 0 || seconds >= timeline.totalSeconds) return null;
  // Linear scan: a phrase is a couple of dozen notes, and this runs once per
  // animation frame. A binary search would be faster and harder to read.
  for (let i = timeline.entries.length - 1; i >= 0; i -= 1) {
    if (seconds >= timeline.entries[i].startSeconds) return timeline.entries[i].index;
  }
  return null;
}
