import { describe, expect, it } from 'vitest';
import { buildMeasureLayout, lookupVisualTick, visualToLogicalTick } from './measureLayout';
import { expandSelectionToRepeats, findMeasureIndexFromVisualTick, parseRhythm } from './rhythmParser';

const TWO_FOUR = { numerator: 2, denominator: 4 };
const FOUR_FOUR = { numerator: 4, denominator: 4 };

/** The owner's report: two x2 sections in 2/4. */
const TWO_SECTIONS = '|: DKTKD-TK| D-TKTKTK:|x2 |: DKTKD-TK| TKD-TKTK:|x2';

describe('buildMeasureLayout', () => {
  it('places each section of two back-to-back x2 repeats on its own drawn ticks', () => {
    const parsed = parseRhythm(TWO_SECTIONS, TWO_FOUR);
    const layout = buildMeasureLayout(parsed);

    expect(layout.map((s) => s.visualStartTick)).toEqual([0, 8, null, null, 16, 24, null, null]);
    expect(layout.map((s) => s.logicalStartTick)).toEqual([0, 8, 16, 24, 32, 40, 48, 56]);
    expect(layout.map((s) => s.sourceIndex)).toEqual([0, 1, 0, 1, 4, 5, 4, 5]);
    expect(layout.map((s) => s.repeatIteration)).toEqual([1, 1, 2, 2, 1, 1, 2, 2]);
  });

  it('does not mark the second section as a copy of the first', () => {
    // The parser counted one section copy too many, mapping measures 4 and 5 onto 0 and 1 — so a
    // note selected in one section lit up in both, and the last measure had no drop targets.
    const parsed = parseRhythm(TWO_SECTIONS, TWO_FOUR);
    expect(parsed.measureSourceMapping).toEqual({ 2: 0, 3: 1, 6: 4, 7: 5 });
  });

  it('uses the meter length for every measure, not 16 sixteenths', () => {
    const layout = buildMeasureLayout(parseRhythm('DKTKD-TK|D-TKTKTK|TKD-TKTK', TWO_FOUR));
    expect(layout.map((s) => s.visualStartTick)).toEqual([0, 8, 16]);
  });
});

describe('visual tick lookups', () => {
  it('resolves a 2/4 click on measure 2 to measure 2, not the end of measure 1', () => {
    const parsed = parseRhythm('DKTKD-TK|D-TKTKTK|TKD-TKTK', TWO_FOUR);
    expect(findMeasureIndexFromVisualTick(parsed, 8)).toMatchObject({ index: 1, localTick: 0 });
    expect(findMeasureIndexFromVisualTick(parsed, 16)).toMatchObject({ index: 2, localTick: 0 });
  });

  it('resolves the final measure after two sections to its own played ticks', () => {
    const parsed = parseRhythm(TWO_SECTIONS, TWO_FOUR);
    expect(findMeasureIndexFromVisualTick(parsed, 24)).toMatchObject({
      index: 5,
      logicalMeasureStartTick: 40,
      localTick: 0,
    });
  });

  it('treats an end tick on a barline as the end of the measure before it', () => {
    const layout = buildMeasureLayout(parseRhythm(TWO_SECTIONS, TWO_FOUR));
    // Measure 1 ends at drawn tick 16. As a start, 16 is measure 4 (played tick 32, past the
    // hidden copies); as an end it must stay in measure 1 (played tick 16).
    expect(visualToLogicalTick(layout, 16)).toBe(32);
    expect(visualToLogicalTick(layout, 16, 'end')).toBe(16);
    expect(lookupVisualTick(layout, 32)).toBeUndefined();
    expect(visualToLogicalTick(layout, 32)).toBe(64);
  });

  it('loops the second section on the played timeline', () => {
    const parsed = parseRhythm(TWO_SECTIONS, TWO_FOUR);
    // The whole second section, drawn 16..32 → played 32..48, plus its hidden pass through 64.
    expect(expandSelectionToRepeats(parsed, 16, 32)).toEqual({ startTick: 32, endTick: 64 });
    // Its last measure alone (drawn 24..32) loops once: played 40..48.
    expect(expandSelectionToRepeats(parsed, 24, 32)).toEqual({ startTick: 40, endTick: 48 });
  });

  it('still works for 4/4 section repeats followed by plain measures', () => {
    const parsed = parseRhythm('|: D-T-D-T-D-T-D-T- :|x3 K-K-K-K-K-K-K-K-', FOUR_FOUR);
    const layout = buildMeasureLayout(parsed);
    expect(layout.map((s) => s.visualStartTick)).toEqual([0, null, null, 16]);
    expect(findMeasureIndexFromVisualTick(parsed, 16)).toMatchObject({ index: 3, logicalMeasureStartTick: 48 });
  });
});

describe('looping a selection with repeats', () => {
  // 2/4, |: A B :|x2 C: drawn A 0..8, B 8..16, C 16..24; played A B A' B' C = 0..40.
  const n = '|: DKTKD-TK| D-TKTKTK:|x2 TKD-TKTK';

  it('a whole section loops every pass', () => {
    expect(expandSelectionToRepeats(parseRhythm(n, TWO_FOUR), 0, 16)).toEqual({ startTick: 0, endTick: 32 });
  });

  it('the last measure of a section alone loops once, not with the next pass of the first', () => {
    // It used to run on through the hidden passes: B, A', B'.
    expect(expandSelectionToRepeats(parseRhythm(n, TWO_FOUR), 8, 16)).toEqual({ startTick: 8, endTick: 16 });
  });

  it('a note inside a section loops once', () => {
    expect(expandSelectionToRepeats(parseRhythm(n, TWO_FOUR), 12, 14)).toEqual({ startTick: 12, endTick: 14 });
  });

  it('a selection running past the section plays straight through, passes included', () => {
    expect(expandSelectionToRepeats(parseRhythm(n, TWO_FOUR), 8, 24)).toEqual({ startTick: 8, endTick: 40 });
  });
});
