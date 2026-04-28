import type { PianoScore, ScoreNote } from '../../shared/music/scoreTypes';

function lowestMidi(note: ScoreNote): number {
  return Math.min(...note.pitches);
}

/**
 * Two adjacent played notes that participate in one thumb-under or thumb-over
 * motion (boxed together on the score).
 */
export type FingerCrossingRegion = {
  readonly noteIds: readonly [string, string];
};

/**
 * Collects adjacent note pairs where a thumb-under or thumb-over reposition is
 * expected in a single part (RH/LH).
 *
 * Heuristic (fingering from `shared/music/scales.ts`):
 * - **Thumb-under (tuck)**: finger 1 after finger 2–4 on a **higher** pitch
 *   (thumb reaches under to the next key up). Skips when the second note is a
 *   **local pitch extremum** (turnaround). Without the pitch direction check,
 *   every 2→1 / 3→1 / 4→1 on the way **down** the scale was boxed too.
 *   Skips the very first RH pair when it is **only** the B♭-major start shape
 *   `2→1` on the first two scale tones (Bb→C): real, but not the “main” octave
 *   tuck we box alongside the descent — avoids three callouts for Tier‑1 B♭.
 *   Skips the parallel **LH** opening `2→1` on tones 2→3 (C→D in B♭, Db, …) for
 *   the same “one main tuck up + one tuck down” story.
 * - **Thumb-over / reach (RH)**: finger 3 or 4 after finger 1 on a **lower**
 *   pitch (cross over the thumb going down). Skips when the previous note was
 *   at a turnaround or when the current note is an extremum.
 * - **LH thumb tuck descending**: finger **2** after finger **1** on a **lower**
 *   pitch (thumb was on the upper tone of the pair, index on the next step
 *   down — mirrors RH `1→3` / `1→4` for the standard `5-4-3-2-1-3-2-1` LH
 *   majors and the analogous B-major LH pattern). Same extremum guards as
 *   thumb-over.
 *
 * Grace notes and rests are skipped. Chords use the lowest written pitch for
 * direction checks.
 */
export function collectFingerCrossingRegions(score: PianoScore): FingerCrossingRegion[] {
  const out: FingerCrossingRegion[] = [];

  for (const part of score.parts) {
    if (part.hand !== 'right' && part.hand !== 'left') continue;

    /** LH `1→2` down can appear twice per printed form (e.g. B♭); keep one per octave trip. */
    let lhDescThumbTuckUsed = false;

    const seq: ScoreNote[] = [];
    for (const measure of part.measures) {
      for (const n of measure.notes) {
        if (n.rest || n.grace || n.finger == null || n.pitches.length === 0) continue;
        seq.push(n);
      }
    }

    for (let i = 1; i < seq.length; i++) {
      const prev2 = i >= 2 ? seq[i - 2] : null;
      const prev = seq[i - 1];
      const cur = seq[i];
      const next = i + 1 < seq.length ? seq[i + 1] : null;

      const pf = prev.finger!;
      const cf = cur.finger!;
      const pm = lowestMidi(prev);
      const cm = lowestMidi(cur);
      const nm = next ? lowestMidi(next) : null;
      const p2m = prev2 ? lowestMidi(prev2) : null;

      if (pm === cm) continue;

      const curIsExtremum = nm != null && ((pm < cm && cm > nm) || (pm > cm && cm < nm));
      const prevIsExtremum = p2m != null && ((p2m < pm && pm > cm) || (p2m > pm && pm < cm));

      const pitchRises = cm > pm;
      const pitchFalls = cm < pm;

      const thumbUnderBase = cf === 1 && pf >= 2 && pf <= 4 && pitchRises;
      const skipBbRhOpeningTuck =
        part.hand === 'right' && i === 1 && pf === 2 && cf === 1 && pitchRises;
      const skipLhOpeningThreeTwoOneTuck =
        part.hand === 'left' && i === 2 && pf === 2 && cf === 1 && pitchRises;
      const thumbUnder =
        thumbUnderBase &&
        !skipBbRhOpeningTuck &&
        !skipLhOpeningThreeTwoOneTuck &&
        !curIsExtremum;
      const thumbOver =
        part.hand === 'right' &&
        pf === 1 &&
        cf >= 3 &&
        cf <= 4 &&
        pitchFalls &&
        !prevIsExtremum &&
        !curIsExtremum;
      const lhThumbTuckDown =
        part.hand === 'left' &&
        pf === 1 &&
        cf === 2 &&
        pitchFalls &&
        !prevIsExtremum &&
        !curIsExtremum;

      if (thumbUnder) {
        // Re-arm: multi-octave LH scores can tuck again after each thumb-under ascent.
        lhDescThumbTuckUsed = false;
        out.push({ noteIds: [prev.id, cur.id] });
      }
      else if (thumbOver) {
        out.push({ noteIds: [prev.id, cur.id] });
      }
      else if (lhThumbTuckDown) {
        if (lhDescThumbTuckUsed) continue;
        lhDescThumbTuckUsed = true;
        out.push({ noteIds: [prev.id, cur.id] });
      }
    }
  }

  return out;
}
