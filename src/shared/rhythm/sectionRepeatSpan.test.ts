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
  sectionRepeatGhostMeasureCount,
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

/**
 * The renderer's own copy of this arithmetic, which is what the owner actually saw. It hides
 * measures AFTER the written block:
 *
 *     measuresToHide = blockLength * repeatCount      // shipped
 *     startHiddenIndex = endMeasure + 1
 *
 * with the comment "(x3) => Source + 3 Ghosts. Total 4." That premise is wrong — `repeatCount` is
 * total plays — so an x2 block hid FOUR measures starting at the first ghost, which is both ghosts
 * plus the whole next section. This was a fourth site of the same off-by-one, expressed differently
 * (`* repeatCount` rather than `* (repeatCount + 1)`), which is why grepping the expression missed
 * it the first time.
 */
describe('renderer ghost hiding', () => {
  const hidden = (r: SectionRepeat, ghostCount: number) => {
    const out = new Set<number>();
    for (let i = 0; i < ghostCount; i += 1) out.add(r.endMeasure + 1 + i);
    return out;
  };
  const legacyGhostCount = (r: SectionRepeat) =>
    (r.endMeasure - r.startMeasure + 1) * r.repeatCount;

  it('hides exactly the generated copies of an x2 block', () => {
    const x2 = section(4, 5, 2);
    expect(sectionRepeatGhostMeasureCount(x2)).toBe(2);
    expect([...hidden(x2, sectionRepeatGhostMeasureCount(x2))]).toEqual([6, 7]);
  });

  it('does not hide the following section — the reported bug', () => {
    const x2 = section(4, 5, 2);
    const shipped = hidden(x2, legacyGhostCount(x2));
    // What the user saw: measures 8 and 9 — her final |: … :| block — hidden.
    expect(shipped.has(8)).toBe(true);
    expect(shipped.has(9)).toBe(true);

    const fixed = hidden(x2, sectionRepeatGhostMeasureCount(x2));
    expect(fixed.has(8)).toBe(false);
    expect(fixed.has(9)).toBe(false);
  });

  it('hides nothing for a bare :| that plays once', () => {
    expect(sectionRepeatGhostMeasureCount(section(8, 9, 1))).toBe(0);
  });

  it('hides two blocks for x3', () => {
    expect(sectionRepeatGhostMeasureCount(section(0, 1, 3))).toBe(4);
  });

  it('every measure of the reported rhythm is either drawn or a true ghost', () => {
    const NOTATION =
      'D-D-TKT-D-TKT-TK|x3 D-D-TKT-D-TKT---| |: D-S-TKT-D-TKS-TK| D-S-TKT-DKTKS-TK:|x2\n|: D-D-TKT-D-TKT-TK| D-D-TKT-D-D-S---:|';
    const parsed = parseRhythm(NOTATION, { numerator: 4, denominator: 4 });
    const sections = (parsed.repeats ?? []).filter((r): r is SectionRepeat => r.type === 'section');

    const hiddenAll = new Set<number>();
    for (const r of sections) {
      for (const m of hidden(r, sectionRepeatGhostMeasureCount(r))) hiddenAll.add(m);
    }
    // Only the x2's two generated copies are hidden; the final section survives.
    expect([...hiddenAll].sort((a, b) => a - b)).toEqual([6, 7]);
    expect(parsed.measures.length - hiddenAll.size).toBe(8);
  });
});
