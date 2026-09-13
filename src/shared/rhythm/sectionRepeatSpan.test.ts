// @vitest-environment node
/**
 * Reported against the darbuka app: with a multi-measure repeat, "the notes that come after the
 * repeat seem to be missing in the renderer", using this rhythm — everything after the `x2` gone:
 *
 *   D-D-TKT-D-TKT-TK|x3 D-D-TKT-D-TKT---| |: D-S-TKT-D-TKS-TK| D-S-TKT-DKTKS-TK:|x2
 *   |: D-D-TKT-D-TKT-TK| D-D-TKT-D-D-S---:|
 *
 * The parser was fine — it produced all ten measures. The span arithmetic was not:
 * `length * (repeatCount + 1)` counted one copy too many, so the `x2` section (measures 4-5,
 * expanded to 6-7) claimed six measures instead of four and swallowed 8-9, the entire next section,
 * as expansion ghosts.
 */
import { describe, expect, it } from 'vitest';
import { parseRhythm } from './rhythmParser';
import {
  isMeasureInSectionRepeat,
  isSectionRepeatGhostMeasure,
  sectionRepeatLastMeasure,
  sectionRepeatMeasureSpan,
} from './sectionRepeatSpan';
import type { SectionRepeat } from './types';

const section = (startMeasure: number, endMeasure: number, repeatCount: number): SectionRepeat => ({
  type: 'section',
  startMeasure,
  endMeasure,
  repeatCount,
});

/** The arithmetic that shipped, kept so these tests demonstrably catch something. */
const legacySpan = (r: SectionRepeat) =>
  (r.endMeasure - r.startMeasure + 1) * (r.repeatCount + 1);

describe('sectionRepeatMeasureSpan', () => {
  it('treats repeatCount as total plays, per the type contract', () => {
    // types.ts: "repeatCount: number; // How many times to play (2 = play twice total)"
    expect(sectionRepeatMeasureSpan(section(4, 5, 2))).toBe(4);
    expect(legacySpan(section(4, 5, 2))).toBe(6); // the bug: two measures too many
  });

  it('a bare :| (one play) occupies only its written measures', () => {
    expect(sectionRepeatMeasureSpan(section(8, 9, 1))).toBe(2);
    expect(sectionRepeatLastMeasure(section(8, 9, 1))).toBe(9);
  });

  it('scales with the play count', () => {
    expect(sectionRepeatMeasureSpan(section(0, 1, 3))).toBe(6);
    expect(sectionRepeatMeasureSpan(section(0, 0, 4))).toBe(4);
  });

  it('never collapses below the written measures on a nonsense count', () => {
    expect(sectionRepeatMeasureSpan(section(2, 3, 0))).toBe(2);
  });
});

describe('ghost classification for the reported rhythm', () => {
  const x2 = section(4, 5, 2); // |: … :|x2, expanded into 6-7

  it('marks the generated copies as ghosts', () => {
    expect(isSectionRepeatGhostMeasure(6, x2)).toBe(true);
    expect(isSectionRepeatGhostMeasure(7, x2)).toBe(true);
  });

  it('does NOT claim the following section — the actual bug', () => {
    // Measures 8 and 9 are the `|: … :|` block the user wrote after the x2.
    expect(isSectionRepeatGhostMeasure(8, x2)).toBe(false);
    expect(isSectionRepeatGhostMeasure(9, x2)).toBe(false);
    // Under the old arithmetic both fell inside the span and were hidden.
    expect(8 - x2.startMeasure).toBeLessThan(legacySpan(x2));
    expect(9 - x2.startMeasure).toBeLessThan(legacySpan(x2));
  });

  it('keeps the written measures editable rather than ghosted', () => {
    expect(isSectionRepeatGhostMeasure(4, x2)).toBe(false);
    expect(isSectionRepeatGhostMeasure(5, x2)).toBe(false);
    expect(isMeasureInSectionRepeat(4, x2)).toBe(true);
    expect(isMeasureInSectionRepeat(8, x2)).toBe(false);
  });
});

describe('end to end on the reported notation', () => {
  const NOTATION =
    'D-D-TKT-D-TKT-TK|x3 D-D-TKT-D-TKT---| |: D-S-TKT-D-TKS-TK| D-S-TKT-DKTKS-TK:|x2\n|: D-D-TKT-D-TKT-TK| D-D-TKT-D-D-S---:|';

  it('parses ten measures with the expected repeat structure', () => {
    const parsed = parseRhythm(NOTATION, { numerator: 4, denominator: 4 });
    expect(parsed.isValid).toBe(true);
    expect(parsed.measures).toHaveLength(10);
    const sections = (parsed.repeats ?? []).filter((r): r is SectionRepeat => r.type === 'section');
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ startMeasure: 4, endMeasure: 5, repeatCount: 2 });
    expect(sections[1]).toMatchObject({ startMeasure: 8, endMeasure: 9, repeatCount: 1 });
  });

  it('leaves no measure of the final section claimed by the x2 repeat', () => {
    const parsed = parseRhythm(NOTATION, { numerator: 4, denominator: 4 });
    const sections = (parsed.repeats ?? []).filter((r): r is SectionRepeat => r.type === 'section');
    const x2 = sections[0]!;
    for (const finalSectionMeasure of [8, 9]) {
      expect(isSectionRepeatGhostMeasure(finalSectionMeasure, x2)).toBe(false);
    }
  });
});
