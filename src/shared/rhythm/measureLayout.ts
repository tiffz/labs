import { sectionRepeatGhostMeasureCount } from './sectionRepeatSpan';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';
import type { Measure, RepeatMarker, TimeSignature } from './types';

/**
 * One measure of the parser's expanded timeline, placed on both timelines the editor uses.
 *
 * The parser writes every repeat out in full, so `measures[i]` is the measure that PLAYS i-th.
 * The score hides section-repeat expansions, so the drawn score is a shorter timeline. Editing
 * needs both: a click arrives in drawn (visual) ticks, and the notation string is reached through
 * played (logical) ticks.
 *
 * Before this module, seven call sites each derived "which measures are hidden" and "where does
 * measure N start" on their own, and they disagreed:
 *
 * - the parser's `measureSourceMapping` counted one section copy too many, so a second section's
 *   own measures were marked as copies of the first — selecting a note highlighted it in both
 *   sections, drops matched both, and the last measure had no drop targets of its own;
 * - the tick lookups padded every measure to 16 sixteenths, so in any meter shorter than 4/4 a
 *   click on measure 2 resolved to the end of measure 1;
 * - the player re-expanded repeats the parser had already expanded, so `x2` played three times.
 *
 * Ask this module instead of re-deriving any of that.
 */
export interface MeasureSlot {
  /** Index into the parser's expanded `measures`. */
  index: number;
  /**
   * The written measure whose notes this one plays, followed through nested repeats: a hidden
   * copy of a `%` measure resolves to the measure the `%` repeats.
   */
  sourceIndex: number;
  /** The measure the score draws for this one — itself, or for a hidden copy, its written measure. */
  drawnIndex: number;
  /** A section-repeat expansion: it plays, but the score does not draw it. */
  isHidden: boolean;
  /** 1-based pass through the section repeat that contains this measure. */
  repeatIteration?: number;
  /** Total passes of that section repeat. */
  repeatCount?: number;
  logicalStartTick: number;
  durationTicks: number;
  /** Where the measure starts in the drawn score, or `null` when the score hides it. */
  visualStartTick: number | null;
}

interface LayoutInput {
  measures: Measure[];
  repeats?: RepeatMarker[];
  timeSignature: TimeSignature;
}

function measureDuration(measure: Measure, sixteenthsPerMeasure: number): number {
  const sum = measure.notes.reduce((total, note) => total + (note.durationInSixteenths || 0), 0);
  return Math.max(sum, sixteenthsPerMeasure);
}

export function buildMeasureLayout({ measures, repeats, timeSignature }: LayoutInput): MeasureSlot[] {
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const slots: MeasureSlot[] = measures.map((measure, index) => ({
    index,
    sourceIndex: index,
    drawnIndex: index,
    isHidden: false,
    logicalStartTick: 0,
    durationTicks: measureDuration(measure, sixteenthsPerMeasure),
    visualStartTick: null,
  }));

  for (const repeat of repeats ?? []) {
    if (repeat.type === 'measure') {
      for (const copy of repeat.repeatMeasures) {
        if (slots[copy]) slots[copy].sourceIndex = repeat.sourceMeasure;
      }
      continue;
    }
    const length = repeat.endMeasure - repeat.startMeasure + 1;
    if (length <= 0) continue;
    const span = length + sectionRepeatGhostMeasureCount(repeat);
    for (let offset = 0; offset < span; offset++) {
      const slot = slots[repeat.startMeasure + offset];
      if (!slot) break;
      if (repeat.repeatCount > 1) {
        slot.repeatIteration = Math.floor(offset / length) + 1;
        slot.repeatCount = repeat.repeatCount;
      }
      if (offset >= length) {
        const written = slots[repeat.startMeasure + (offset % length)];
        slot.sourceIndex = written.sourceIndex;
        slot.drawnIndex = written.index;
        slot.isHidden = true;
      }
    }
  }

  // Follow chains to the written measure: a `%` after an `x3` section repeats the section's last
  // hidden pass, whose own source is the section's first measure. Sources always come earlier,
  // so one in-order pass resolves every chain.
  for (const slot of slots) {
    if (slot.sourceIndex !== slot.index) slot.sourceIndex = slots[slot.sourceIndex].sourceIndex;
  }

  let logicalTick = 0;
  let visualTick = 0;
  for (const slot of slots) {
    slot.logicalStartTick = logicalTick;
    logicalTick += slot.durationTicks;
    if (!slot.isHidden) {
      slot.visualStartTick = visualTick;
      visualTick += slot.durationTicks;
    }
  }
  return slots;
}

/** Expanded indices of the measures the score hides. */
export function hiddenMeasureIndices(layout: MeasureSlot[]): Set<number> {
  return new Set(layout.filter((slot) => slot.isHidden).map((slot) => slot.index));
}

/** `measureIndex → sourceIndex` for every repeat copy; written measures are absent. */
export function measureSourceMappingFromLayout(layout: MeasureSlot[]): Record<number, number> {
  const mapping: Record<number, number> = {};
  for (const slot of layout) {
    if (slot.sourceIndex !== slot.index) mapping[slot.index] = slot.sourceIndex;
  }
  return mapping;
}

export interface VisualTickLookup {
  /** The visible measure containing the tick. */
  slot: MeasureSlot;
  localTick: number;
  logicalTick: number;
}

/**
 * Resolve a drawn-score tick to the visible measure that contains it.
 *
 * `edge: 'end'` treats the tick as an exclusive end, so a selection ending on a barline resolves
 * to the end of the measure before it — not to the start of whatever follows, which after a
 * section repeat is past the hidden copies and the `:|xN` token.
 *
 * Returns `undefined` for a tick past the end of the score; callers decide whether that appends.
 */
export function lookupVisualTick(
  layout: MeasureSlot[],
  visualTick: number,
  edge: 'start' | 'end' = 'start',
): VisualTickLookup | undefined {
  for (const slot of layout) {
    if (slot.visualStartTick === null) continue;
    const start = slot.visualStartTick;
    const end = start + slot.durationTicks;
    const inside = edge === 'start'
      ? visualTick >= start && visualTick < end
      : visualTick > start && visualTick <= end;
    if (inside) {
      const localTick = visualTick - start;
      return { slot, localTick, logicalTick: slot.logicalStartTick + localTick };
    }
  }
  return undefined;
}

/** Total played ticks. */
function logicalTickLength(layout: MeasureSlot[]): number {
  const last = layout[layout.length - 1];
  return last ? last.logicalStartTick + last.durationTicks : 0;
}

/**
 * Convert a drawn-score tick to a played tick. Ticks past the end of the score map to the end
 * of the played timeline, which is where an append goes.
 */
export function visualToLogicalTick(
  layout: MeasureSlot[],
  visualTick: number,
  edge: 'start' | 'end' = 'start',
): number {
  const lookup = lookupVisualTick(layout, visualTick, edge);
  if (lookup) return lookup.logicalTick;
  if (edge === 'end' && visualTick <= 0) return 0;
  return logicalTickLength(layout);
}
