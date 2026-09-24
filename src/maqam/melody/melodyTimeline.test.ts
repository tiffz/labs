import { describe, expect, it } from 'vitest';

import { buildMelodyTimeline, noteIndexAt } from './melodyTimeline';
import { MELODY_PATTERNS, resolveMelody } from './maqamMelody';
import { MAQAM_PRESETS_BY_ID } from '../data/maqamPresets';

const rast = MAQAM_PRESETS_BY_ID.rast_c;

const resolved = (patternId: string) =>
  resolveMelody(rast, MELODY_PATTERNS.find((p) => p.id === patternId)!.build(rast), 4);

describe('buildMelodyTimeline', () => {
  it('places notes end to end', () => {
    const notes = resolved('scale-up');
    const timeline = buildMelodyTimeline(notes, 60);
    // 8 quarter notes at 60bpm is 8 seconds, one per second.
    expect(timeline.totalSeconds).toBeCloseTo(8, 6);
    expect(timeline.entries.map((e) => e.startSeconds)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('scales with tempo', () => {
    const notes = resolved('scale-up');
    expect(buildMelodyTimeline(notes, 120).totalSeconds).toBeCloseTo(4, 6);
    expect(buildMelodyTimeline(notes, 30).totalSeconds).toBeCloseTo(16, 6);
  });

  it('holds each note a little short of its value', () => {
    const [first] = buildMelodyTimeline(resolved('scale-up'), 60).entries;
    expect(first.holdSeconds).toBeLessThan(1);
    expect(first.holdSeconds).toBeGreaterThan(0.8);
  });

  it('gives a longer note more time', () => {
    // The descending pattern ends on a half note.
    const timeline = buildMelodyTimeline(resolved('scale-down'), 60);
    const last = timeline.entries[timeline.entries.length - 1];
    expect(last.holdSeconds).toBeGreaterThan(1.5);
  });

  /**
   * A nonsense tempo must not produce an infinite or zero-length phrase, which
   * would either hang the highlight loop or fire every note at once.
   */
  it.each([0, -120, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to a usable tempo for %p bpm',
    (bpm) => {
      const timeline = buildMelodyTimeline(resolved('scale-up'), bpm);
      expect(Number.isFinite(timeline.totalSeconds)).toBe(true);
      expect(timeline.totalSeconds).toBeGreaterThan(0);
    },
  );

  it('handles an empty melody without dividing by anything', () => {
    const timeline = buildMelodyTimeline([], 90);
    expect(timeline.entries).toEqual([]);
    expect(timeline.totalSeconds).toBe(0);
  });

  it.each(MELODY_PATTERNS.map((p) => [p.id] as const))(
    '%s lays out with no gaps or overlaps',
    (id) => {
      const notes = resolved(id);
      const timeline = buildMelodyTimeline(notes, 90);
      let expected = 0;
      timeline.entries.forEach((entry, index) => {
        expect(entry.startSeconds).toBeCloseTo(expected, 6);
        expected += notes[index].beats * (60 / 90);
      });
      expect(timeline.totalSeconds).toBeCloseTo(expected, 6);
    },
  );
});

describe('noteIndexAt', () => {
  const timeline = buildMelodyTimeline(resolved('scale-up'), 60);

  it('reports the note sounding at a given moment', () => {
    expect(noteIndexAt(timeline, 0)).toBe(0);
    expect(noteIndexAt(timeline, 0.99)).toBe(0);
    expect(noteIndexAt(timeline, 1)).toBe(1);
    expect(noteIndexAt(timeline, 7.5)).toBe(7);
  });

  /**
   * Null, not the last note. A highlight clamped to the final note once
   * playback ends is indistinguishable from that note genuinely sounding —
   * the "failure as a valid value" shape the repo has been bitten by.
   */
  it('reports nothing once the phrase is over', () => {
    expect(noteIndexAt(timeline, 8)).toBeNull();
    expect(noteIndexAt(timeline, 100)).toBeNull();
  });

  it('reports nothing before the phrase starts', () => {
    expect(noteIndexAt(timeline, -0.5)).toBeNull();
  });

  it('never returns an index outside the melody', () => {
    for (let t = 0; t < timeline.totalSeconds; t += 0.05) {
      const index = noteIndexAt(timeline, t);
      expect(index).not.toBeNull();
      expect(index!).toBeGreaterThanOrEqual(0);
      expect(index!).toBeLessThan(timeline.entries.length);
    }
  });

  it('advances monotonically through the phrase', () => {
    let previous = -1;
    for (let t = 0; t < timeline.totalSeconds; t += 0.01) {
      const index = noteIndexAt(timeline, t)!;
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it('returns nothing for an empty timeline', () => {
    expect(noteIndexAt(buildMelodyTimeline([], 90), 0)).toBeNull();
  });
});
