import { visualToLogicalTick } from '../../shared/rhythm/measureLayout';
import {
  findMeasureIndexAtTick,
  findMeasureIndexFromVisualTick,
  measureLayoutOf,
  parseRhythm,
} from '../../shared/rhythm/rhythmParser';
import type { ParsedRhythm, TimeSignature } from '../types';
import {
  findNoteHead,
  getPatternDuration,
  insertPatternAtIndex,
  mapLogicalToStringIndex,
} from './dragAndDrop';
import { expandSimileMeasure } from './notationUtils';

/**
 * Every edit the score offers, as a pure function of the notation string.
 *
 * Positions are drawn-score (visual) ticks — what the renderer reports for clicks, selections and
 * drops. Each function resolves them through the measure layout, so a caller never mixes visual
 * and played ticks (the cause of most bugs fixed in #250 and #259).
 *
 * Each returns the new notation, or `null` when the edit does not apply. `null` means "record no
 * undo step": an edit that changes nothing must not leave a no-op on the history.
 *
 * Kept free of React so `notationEdits.fuzz.test.ts` can drive every path, including drops, which
 * before this module lived in an App callback no test reached.
 */

/** Repeat signs and barlines. A range edit removes or moves notes, never these. */
const STRUCTURE = /\|:|:\|(?:\s*x\d+)?|\|x\d+|\|/g;

/** The structure inside `text`, as it must stay when the notes around it go. */
function structureOf(text: string): string {
  const tokens = text.match(STRUCTURE);
  return tokens ? ` ${tokens.join(' ')} ` : '';
}

/**
 * Remove repeat signs an edit left with no notes inside: `|: :|x2`, `| |x3`, a leading `|x2`
 * or `%`.
 * They parse to nothing and would linger as junk the user cannot see or select.
 */
function dropEmptyStructure(notation: string): string {
  return notation
    .replace(/\|:[\s|]*:\|\s*(x\d+)?/g, ' ')
    .replace(/(^|\|)[\s|]*\|x\d+/g, '$1')
    // A `%` with no measure before it has nothing to repeat. One after an emptied measure
    // (`X | |%`) would silently start repeating X instead, so it goes with the notes it copied.
    .replace(/^[\s|]*%/, '')
    .replace(/\|\s*\|\s*%/g, '|')
    .replace(/ {2,}/g, ' ');
}

/** A drawn-score tick range, end exclusive. */
export interface VisualRange {
  start: number;
  end: number;
}

interface Prepared {
  notation: string;
  parsed: ParsedRhythm;
  /** Played tick of the visual position, valid in both the old and the expanded parse. */
  logical: number;
}

/**
 * Resolve a visual tick and, when it lands on a `%` or `|xN` copy, write that copy's notes out
 * first — an edit to one copy must not change every copy. Expansion keeps the measure count, so
 * the played tick stays valid in the new parse.
 */
function prepareAt(notation: string, ts: TimeSignature, visualTick: number): Prepared {
  const parsed = parseRhythm(notation, ts);
  const lookup = findMeasureIndexFromVisualTick(parsed, visualTick);
  const logical = lookup.logicalMeasureStartTick + lookup.localTick;
  const expanded = expandSimileMeasure(notation, lookup.index, parsed);
  if (expanded === notation) return { notation, parsed, logical };
  const reparsed = parseRhythm(expanded, ts);
  // A `%` right after the copy repeats "the previous measure" — the one about to be edited. Write
  // it out too, while it still holds the original notes, or editing one copy changes the next.
  const following = reparsed.measureMapping[lookup.index + 1];
  if (following && expanded[following.sourceStringIndex] === '%') {
    const withFollowing = expandSimileMeasure(expanded, lookup.index + 1, reparsed);
    if (withFollowing !== expanded) return { notation: withFollowing, parsed: parseRhythm(withFollowing, ts), logical };
  }
  return { notation: expanded, parsed: reparsed, logical };
}

/** Repeat signs only — a replace refuses to overwrite one. Plain barlines may be overwritten. */
const REPEAT_SIGN = /\|:|:\||\|x\d|%/;

/**
 * Replace the played ticks [from, to) with `text`, at tick precision.
 *
 * The one primitive every edit shares. A note cut by either edge is split: the part before `from`
 * keeps its head, and the part after `to` gets its own. (Editing whole notes from a string index,
 * as replace and drop once did, swallowed the far half of a note tied across a barline.) A position
 * inside parser padding has no characters, so `text` is preceded by typed rests that fill the gap
 * and land it on its tick.
 *
 * Returns `null` when `keep` is `'refuse'` and the range would overwrite a repeat sign.
 */
function spliceTicks(
  notation: string,
  parsed: ParsedRhythm,
  ts: TimeSignature,
  from: number,
  to: number,
  text: string,
  keep: 'structure' | 'refuse',
): string | null {
  const start = mapLogicalToStringIndex(notation, from, parsed, ts);
  const startIndex = start.index;
  const endIndex = to > from ? Math.max(startIndex, mapLogicalToStringIndex(notation, to, parsed, ts, 'end').index) : startIndex;
  const removed = notation.slice(startIndex, endIndex);
  if (keep === 'refuse' && REPEAT_SIGN.test(removed)) return null;

  const gap = text ? Math.max(0, from - start.logicalReached) : 0;
  let right = notation.slice(endIndex);
  if (right.startsWith('-')) right = findNoteHead(notation, endIndex) + right.slice(1);
  const kept = keep === 'structure' ? structureOf(removed) : '';
  return notation.slice(0, startIndex) + '_'.repeat(gap) + text + kept + right;
}

/**
 * Overwrite `pattern`'s length of ticks from the start of `range` with `pattern` — the palette and
 * paste. The meter holds: a shorter pattern leaves the rest of a cut note in place, a longer one
 * overwrites what follows, and nothing after it moves. (The palette only offers patterns the
 * selection's length, so there the two lengths agree.)
 */
export function replaceRange(notation: string, ts: TimeSignature, range: VisualRange, pattern: string): string | null {
  const { notation: current, parsed, logical } = prepareAt(notation, ts, range.start);
  const next = spliceTicks(current, parsed, ts, logical, logical + getPatternDuration(pattern), pattern, 'refuse');
  return next === null || next === notation ? null : next;
}

/** Remove the notes in `range`. */
export function deleteRange(notation: string, ts: TimeSignature, range: VisualRange): string | null {
  const { notation: current, parsed, logical } = prepareAt(notation, ts, range.start);
  // The end is exclusive: a range ending on a barline resolves to the end of its own measure, not
  // to the start of the next visible one (after a section, past the hidden copies and `:|xN`).
  const logicalEnd = visualToLogicalTick(measureLayoutOf(parsed), range.end, 'end');
  const start = mapLogicalToStringIndex(current, logical, parsed, ts).index;
  const end = mapLogicalToStringIndex(current, logicalEnd, parsed, ts, 'end').index;
  if (end <= start) return null;
  // A range that crosses a barline or repeat sign deletes the notes on both sides and keeps the
  // sign. Splicing the raw slice once deleted the `|:` that opened a section.
  const next = dropEmptyStructure(current.slice(0, start) + structureOf(current.slice(start, end)) + current.slice(end));
  return next === notation ? null : next;
}

/** Move the notes in `range` so they start at `toVisual`. */
export function moveRange(notation: string, ts: TimeSignature, range: VisualRange, toVisual: number): string | null {
  if (toVisual >= range.start && toVisual < range.end) return null;
  const original = parseRhythm(notation, ts);
  const layout = measureLayoutOf(original);
  const fromStart = visualToLogicalTick(layout, range.start);
  const fromEnd = visualToLogicalTick(layout, range.end, 'end');
  const to = visualToLogicalTick(layout, toVisual);

  let current = notation;
  let parsed = original;
  for (const tick of [fromStart, to]) {
    const expanded = expandSimileMeasure(current, findMeasureIndexAtTick(parsed, tick).index, parsed);
    if (expanded !== current) {
      current = expanded;
      parsed = parseRhythm(current, ts);
    }
  }

  const start = mapLogicalToStringIndex(current, fromStart, parsed, ts).index;
  const end = mapLogicalToStringIndex(current, fromEnd, parsed, ts, 'end').index;
  const slice = current.slice(start, end);
  // Notes move; any barline or repeat sign inside the range stays where it was.
  const content = slice.replace(STRUCTURE, '').replace(/\s+/g, '');
  // Nothing to move: the range is padding the parser added (an implicit rest).
  if (!content) return null;
  const kept = structureOf(slice);

  let target = mapLogicalToStringIndex(current, to, parsed, ts).index;
  if (target >= end) target -= end - start - kept.length;
  const next = dropEmptyStructure(insertPatternAtIndex(current.slice(0, start) + kept + current.slice(end), target, content));
  return next === notation ? null : next;
}

/**
 * Drop `pattern` at a visual tick. `replace` overwrites from there; `insert` pushes later notes
 * right. A replace that would cross a barline or repeat sign is refused.
 */
export function dropPattern(
  notation: string,
  ts: TimeSignature,
  pattern: string,
  visualTick: number,
  mode: 'replace' | 'insert',
): string | null {
  const { notation: current, parsed, logical } = prepareAt(notation, ts, visualTick);
  const to = mode === 'insert' ? logical : logical + getPatternDuration(pattern);
  const next = spliceTicks(current, parsed, ts, logical, to, pattern, 'refuse');
  return next === null || next === notation ? null : next;
}

/**
 * Remove the last written note (Backspace with nothing selected). Repeat signs and barlines after
 * it stay; a repeat left with no notes inside is removed with it.
 */
export function deleteLastNote(notation: string): string | null {
  // The last note head, with its extension (`D---`, `____`), not followed by another note.
  const match = /([DTKSdtks][-]*|_+|%)(?=[^DTKSdtks_%]*$)/.exec(notation);
  if (!match) return notation.trim() ? '' : null;
  let next = notation.slice(0, match.index) + notation.slice(match.index + match[0].length);
  next = dropEmptyStructure(next);
  // Trailing plain barlines go too, but never the `|` of a closing `:|`.
  next = next.trimEnd();
  while (next.endsWith('|') && !next.endsWith(':|')) next = next.slice(0, -1).trimEnd();
  return next === notation ? null : next;
}

/**
 * The notation text of `range`, for the clipboard: the string's own characters, so a tie stays one
 * note and padding the parser added is not copied as typed rests. (Rebuilding it from parsed notes
 * did both.) Repeat signs and barlines are left out; a copy that should carry its repeat sign is
 * built by `buildNotationFromSelection`.
 */
export function copyRange(notation: string, ts: TimeSignature, range: VisualRange): string {
  const parsed = parseRhythm(notation, ts);
  const layout = measureLayoutOf(parsed);
  const from = visualToLogicalTick(layout, range.start);
  const to = visualToLogicalTick(layout, range.end, 'end');
  const start = mapLogicalToStringIndex(notation, from, parsed, ts).index;
  const end = mapLogicalToStringIndex(notation, to, parsed, ts, 'end').index;
  const text = notation.slice(start, Math.max(start, end)).replace(STRUCTURE, '').replace(/\s+/g, '');
  // A range starting mid-note (the far side of a tie) copies that part as its own note.
  return text.startsWith('-') ? findNoteHead(notation, start) + text.slice(1) : text;
}

const STROKE_CHAR: Record<string, string> = { dum: 'D', tak: 'T', ka: 'K', slap: 'S', rest: '_' };

/**
 * The sequencer's edit: make `sound` start at played tick `tick`, or with `null` remove the stroke
 * that starts there. A grid row is one sixteenth of the PLAYED timeline, copies and hidden passes
 * included, so `tick` is a played tick, not a drawn one.
 *
 * Edits the notation in place, like the score does. (The grid used to rebuild the whole notation
 * from its own model: it lost spaces and repeat signs, linked cells by its own arithmetic, and
 * left dashes with no note head.) Copies of a written measure follow it because they are repeats
 * of it; a click in a copy writes that copy out first and edits it alone.
 *
 * Grid semantics: a stroke holds until the next onset, so a stroke placed inside a held note
 * takes over the rest of it, and removing a stroke lets the note before it hold on — or leaves a
 * rest when nothing before it in the measure can hold.
 */
export function setStrokeAt(
  notation: string,
  ts: TimeSignature,
  tick: number,
  sound: 'dum' | 'tak' | 'ka' | 'slap' | 'rest' | null,
): string | null {
  const original = parseRhythm(notation, ts);
  const layout = measureLayoutOf(original);
  const played = layout.reduce((t, s) => t + s.durationTicks, 0);

  // Past the end: a single sixteenth after rests, in a measure of its own.
  if (tick >= played) {
    if (sound === null || sound === 'rest') return null;
    const sep = notation.trim() ? ' | ' : '';
    return notation.trimEnd() + sep + '_'.repeat(tick - played) + STROKE_CHAR[sound];
  }

  // Write out the copy being edited, as the score does.
  const measure = findMeasureIndexAtTick(original, tick).index;
  let current = expandSimileMeasure(notation, measure, original);
  let parsed = current === notation ? original : parseRhythm(current, ts);
  if (current !== notation) {
    const following = parsed.measureMapping[measure + 1];
    if (following && current[following.sourceStringIndex] === '%') {
      const withFollowing = expandSimileMeasure(current, measure + 1, parsed);
      if (withFollowing !== current) {
        current = withFollowing;
        parsed = parseRhythm(current, ts);
      }
    }
  }

  const at = mapLogicalToStringIndex(current, tick, parsed, ts);
  let i = at.index;
  while (i < current.length && /\s/.test(current[i])) i++;
  const gap = tick - at.logicalReached;
  const char = current[i] ?? '';

  // Inside padding the parser added: the string holds nothing here.
  if (gap > 0 || !/[DTKSdtks_-]/.test(char)) {
    if (sound === null) return null;
    const next = current.slice(0, at.index) + '_'.repeat(gap) + STROKE_CHAR[sound] + current.slice(at.index);
    return next === notation ? null : next;
  }

  const isHead = /[DTKSdtks]/.test(char) || (char === '_' && (i === 0 || current[i - 1] !== '_'));
  // The run of extension characters belonging to the note at `i`.
  let end = i + 1;
  const extension = char === '_' ? '_' : '-';
  while (end < current.length && current[end] === extension) end++;

  if (sound === null) {
    if (!isHead) return null; // nothing starts here
    const before = current.slice(0, i).replace(/\s+$/, '');
    const holdsFromBefore = /[DTKSdtks-]$/.test(before);
    // Clearing a rest with no stroke before it to hold over it leaves the rest.
    if (char === '_' && !holdsFromBefore) return null;
    const filler = holdsFromBefore ? '-' : '_';
    const next = current.slice(0, i) + filler.repeat(end - i) + current.slice(end);
    return next === notation ? null : next;
  }

  const head = STROKE_CHAR[sound];
  const fill = sound === 'rest' ? '_' : '-';
  // From `i` to the end of the note: the new stroke, holding for the rest of it.
  const next = current.slice(0, i) + head + fill.repeat(end - i - 1) + current.slice(end);
  return next === notation ? null : next;
}
