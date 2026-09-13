import type { SectionRepeat } from './types';

/**
 * How many measures a section repeat occupies once its expansions are counted.
 *
 * `repeatCount` is TOTAL PLAYS — `types.ts` says so outright: "How many times to play (2 = play
 * twice total)". Three separate places computed the span as `length * (repeatCount + 1)` with the
 * comment "Source + Repeats", which counts one copy too many.
 *
 * The owner hit it with:
 *
 *     …|: D-S-TKT-D-TKS-TK| D-S-TKT-DKTKS-TK:|x2
 *     |: D-D-TKT-D-TKT-TK| D-D-TKT-D-D-S---:|
 *
 * The `x2` section is measures 4-5, expanded to 6-7 — four measures. The old arithmetic claimed
 * six, so measures 8 and 9 (the whole following section) were inside the repeat's span, got marked
 * as expansion ghosts, and vanished from the render. Hence "everything after the x2 is missing".
 *
 * One function, because the bug was the duplication as much as the arithmetic.
 */
export function sectionRepeatMeasureSpan(repeat: SectionRepeat): number {
  const length = repeat.endMeasure - repeat.startMeasure + 1;
  if (length <= 0) return 0;
  // A count below 1 would still occupy the written measures once.
  const plays = Math.max(1, repeat.repeatCount);
  return length * plays;
}

/** Last measure index the repeat covers, expansions included. */
export function sectionRepeatLastMeasure(repeat: SectionRepeat): number {
  return repeat.startMeasure + sectionRepeatMeasureSpan(repeat) - 1;
}

/** Is this measure one of the repeat's own written measures, or one of its expansions? */
export function isMeasureInSectionRepeat(measureIndex: number, repeat: SectionRepeat): boolean {
  if (measureIndex < repeat.startMeasure) return false;
  return measureIndex <= sectionRepeatLastMeasure(repeat);
}

/**
 * Is this measure an expansion ghost — a copy the repeat generated rather than one the user wrote?
 *
 * Written measures (`startMeasure`…`endMeasure`) are the source and stay editable; everything after
 * them inside the span is a ghost.
 */
export function isSectionRepeatGhostMeasure(measureIndex: number, repeat: SectionRepeat): boolean {
  return measureIndex > repeat.endMeasure && isMeasureInSectionRepeat(measureIndex, repeat);
}

/**
 * How many measures after the written block are expansion ghosts.
 *
 * `repeatCount` is total plays, so a block written once and played `n` times generates `n - 1`
 * copies. The renderer hid `blockLength * repeatCount` measures starting after the block —
 * counting the written block itself as a ghost — and so ate that many measures of whatever came
 * next. Its comment stated the wrong premise outright: "(x3) => Source + 3 Ghosts. Total 4."
 *
 * This is the fourth site of the same off-by-one. The first three said `repeatCount + 1`; this one
 * said `* repeatCount` where it meant `* (repeatCount - 1)`, which is why grepping for the
 * expression missed it. Ask this function instead of doing the arithmetic.
 */
export function sectionRepeatGhostMeasureCount(repeat: SectionRepeat): number {
  const length = repeat.endMeasure - repeat.startMeasure + 1;
  if (length <= 0) return 0;
  return sectionRepeatMeasureSpan(repeat) - length;
}
