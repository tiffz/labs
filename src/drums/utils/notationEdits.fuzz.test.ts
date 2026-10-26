import { describe, expect, it } from 'vitest';
import { measureLayoutOf, parseRhythm } from '../../shared/rhythm/rhythmParser';
import { getSixteenthsPerMeasure } from '../../shared/rhythm/timeSignatureUtils';
import type { ParsedRhythm, TimeSignature } from '../types';
import { copyRange, deleteLastNote, deleteRange, dropPattern, moveRange, replaceRange } from './notationEdits';

/**
 * Random rhythms × random chains of edits, checked against a model that shares no code with the
 * editor.
 *
 * The model is the WRITTEN note list: every note the user typed, in order, ties merged, repeat
 * copies left out (they are generated, not written). Each edit's expected effect is a splice on
 * that list — replace swaps notes, delete removes them, move relocates them, insert adds them —
 * and the result's written list must match it exactly. That catches an edit landing on the wrong
 * note, the wrong measure, or the wrong section, which is the whole history of bugs here.
 *
 * Rhythms come from a seeded generator, so a failure names a seed that reproduces it.
 */

// ---- deterministic randomness -------------------------------------------------------------

function rngFrom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
  };
}
type Rng = ReturnType<typeof rngFrom>;

// ---- rhythm generator ----------------------------------------------------------------------

const METERS: TimeSignature[] = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 7, denominator: 8 },
];
const SOUNDS = ['D', 'T', 'K', 'S'] as const;
const DURATIONS = [1, 1, 2, 2, 2, 3, 4, 4, 6, 8];

function token(rng: Rng, duration: number): string {
  if (rng.chance(0.12)) return '_'.repeat(duration);
  return rng.pick(SOUNDS) + '-'.repeat(duration - 1);
}

/** Notes filling exactly `ticks`, with optional spaces between them. */
function fill(rng: Rng, ticks: number, spaces: boolean): string {
  let out = '';
  let left = ticks;
  while (left > 0) {
    const d = Math.min(left, rng.pick(DURATIONS));
    out += token(rng, d);
    left -= d;
    if (left > 0 && spaces && rng.chance(0.3)) out += ' ';
  }
  return out;
}

function generateRhythm(rng: Rng): { notation: string; ts: TimeSignature } {
  const ts = rng.pick(METERS);
  const spm = getSixteenthsPerMeasure(ts);
  const spaces = rng.chance(0.5);
  const parts: string[] = [];
  const segments = rng.int(1, 4);
  for (let s = 0; s < segments; s++) {
    const kind = rng.int(0, 9);
    if (kind <= 4) {
      // Plain run, notes free to cross barlines (ties), with or without explicit bars.
      const measures = rng.int(1, 3);
      if (rng.chance(0.5)) {
        parts.push(fill(rng, measures * spm, spaces));
      } else {
        parts.push(Array.from({ length: measures }, () => fill(rng, spm, spaces)).join('|'));
      }
    } else if (kind <= 7) {
      const measures = Array.from({ length: rng.int(1, 2) }, () => fill(rng, spm, spaces)).join('| ');
      const count = rng.pick(['', 'x2', 'x3']);
      parts.push(`|: ${measures} :|${count}`);
    } else if (kind === 8) {
      parts.push(`| ${fill(rng, spm, spaces)} |x${rng.int(2, 3)}`);
    } else {
      parts.push(`${fill(rng, spm, spaces)}|%`);
    }
  }
  // A short final measure: the parser pads it with an implicit rest.
  if (rng.chance(0.2)) parts.push(fill(rng, rng.int(1, spm - 1), spaces));
  // Joined with plain bars and left uncollapsed: an empty `| |` is valid, while collapsing bars
  // next to a repeat sign produced the ambiguous `:|:`.
  return { notation: parts.join(' | '), ts };
}

// ---- the model -----------------------------------------------------------------------------

interface WrittenNote {
  sound: string;
  duration: number;
}

/** Visible measures whose notes are written in the string (not a `%` / `|xN` / section copy). */
function writtenSlots(parsed: ParsedRhythm) {
  const copies = new Set(
    (parsed.repeats ?? []).flatMap((r) => (r.type === 'measure' ? r.repeatMeasures : [])),
  );
  return measureLayoutOf(parsed).filter((slot) => slot.visualStartTick !== null && !copies.has(slot.index));
}

interface DrawnNote extends WrittenNote {
  /** Index in the written list, or -1 for padding. */
  index: number;
  /** Drawn-score tick of the note's start. */
  pos: number;
  measure: number;
  /** Padding the parser added to a short measure: drawn, but not in the string. */
  implicit: boolean;
}

const soundOfChar: Record<string, string> = { D: 'dum', T: 'tak', K: 'ka', S: 'slap', _: 'rest' };

/** The written notes, read from the string's own characters — no parser involved. */
function writtenNotes(notation: string): WrittenNote[] {
  return (notation.match(/[DTKSdtks]-*|_+/g) ?? []).map((tok) => ({
    sound: soundOfChar[tok[0].toUpperCase()],
    duration: tok.length,
  }));
}

/**
 * Where each written note is drawn. The parser supplies positions and flags its own padding; the
 * string supplies the notes. Every other drawn note must match the next written note.
 */
function model(notation: string, ts: TimeSignature): { written: WrittenNote[]; drawn: DrawnNote[] } {
  const parsed = parseRhythm(notation, ts);
  const written = writtenNotes(notation);
  const drawn: DrawnNote[] = [];
  let next = 0;
  for (const slot of writtenSlots(parsed)) {
    let offset = 0;
    for (const note of parsed.measures[slot.index].notes) {
      const pos = slot.visualStartTick! + offset;
      offset += note.durationInSixteenths;
      if (note.isTiedFrom) {
        // A continuation of the note drawn last; the model counts it once.
        if (drawn.length) drawn[drawn.length - 1].duration += note.durationInSixteenths;
        continue;
      }
      drawn.push({ sound: note.sound, duration: note.durationInSixteenths, index: -1, pos, measure: slot.index, implicit: !!note.isPadding });
    }
  }
  for (const d of drawn) {
    if (d.implicit) continue;
    const w = written[next];
    if (w && w.sound === d.sound && w.duration === d.duration) {
      d.index = next++;
    } else {
      throw new Error(`model: drawn ${d.sound}${d.duration}@${d.pos} has no written note (next ${w ? w.sound + w.duration : 'none'})`);
    }
  }
  return { written, drawn };
}

/** Adjacent rests are one token in the string (`__` + `___` is `_____`), so compare them merged. */
function mergeRests(notes: WrittenNote[]): WrittenNote[] {
  const out: WrittenNote[] = [];
  for (const n of notes) {
    const last = out.at(-1);
    if (last && last.sound === 'rest' && n.sound === 'rest') last.duration += n.duration;
    else out.push({ ...n });
  }
  return out;
}

const sig = (notes: WrittenNote[]) => mergeRests(notes).map((n) => `${n.sound[0]}${n.duration}`).join(' ');

/** Repeat signs, ignoring any repeat left with no notes inside (an edit may remove that). */
function structure(notation: string): string {
  const withoutEmpty = notation.replace(/\|:[\s|]*:\|\s*(x\d+)?/g, ' ').replace(/(^|\|)[\s|]*\|x\d+/g, '$1');
  return (withoutEmpty.match(/\|:|:\|(x\d+)?|\|x\d+|%/g) ?? []).join(' ');
}

/**
 * Each repeat's signs and the written-note indices inside it, read from the string. A `%` holds the
 * measure before it; an `|xN` holds the notes since the previous bar.
 */
function repeatGroups(notation: string): Array<{ signs: string[]; notes: number[] }> {
  const groups: Array<{ signs: string[]; notes: number[]; at: number }> = [];
  const pattern = /\|:|:\|(?:x\d+)?|\|x\d+|%|\||[DTKSdtks]-*|_+/g;
  let noteIndex = 0;
  let section: { signs: string[]; notes: number[]; at: number } | null = null;
  let sinceBar: number[] = [];
  let previousMeasure: number[] = [];
  for (let m = pattern.exec(notation); m; m = pattern.exec(notation)) {
    const t = m[0];
    if (t === '|:') { section = { signs: ['|:'], notes: [], at: m.index }; sinceBar = []; }
    else if (t.startsWith(':|')) { if (section) { section.signs.push(t); groups.push(section); section = null; } sinceBar = []; }
    else if (/^\|x\d+$/.test(t)) { groups.push({ signs: [t], notes: sinceBar, at: m.index }); sinceBar = []; }
    // A `%` holds the measure it repeats: emptying that measure leaves it nothing to repeat.
    else if (t === '%') { groups.push({ signs: ['%'], notes: previousMeasure, at: m.index }); }
    else if (t === '|') { if (sinceBar.length) previousMeasure = sinceBar; sinceBar = []; }
    else { section?.notes.push(noteIndex); sinceBar.push(noteIndex); noteIndex++; }
  }
  // In string order, matching `structure()`. (Sorting by `indexOf` found the first `|x2` for all.)
  return groups.sort((a, b) => a.at - b.at);
}

function isSubsequence(small: string[], big: string[]): boolean {
  let i = 0;
  for (const token of big) if (token === small[i]) i++;
  return i === small.length;
}

// ---- operations ----------------------------------------------------------------------------

interface Outcome {
  name: string;
  next: string | null;
  /** The written list the edit must produce; `undefined` when only invariants apply. */
  expected?: WrittenNote[];
  /** What must PLAY afterwards, measure by measure (copies and hidden passes included). */
  played?: string;
  /** The edit writes out a `%` / `|xN` copy, so its repeat sign may go. */
  expandsCopy?: boolean;
  /** The edit targets something editable; refusing it is a failure, unless it changes nothing. */
  mustApply?: boolean;
  /** Written-note indices the edit removes, for deciding which repeats it may leave empty. */
  removed?: Set<number>;
}

/** Every measure that plays, in order: copies and hidden section passes included. */
const playedSig = (parsed: ParsedRhythm) =>
  parsed.measures.map((m) => m.notes.map((n) => `${n.sound[0]}${n.durationInSixteenths}`).join(' ')).join(' | ');

/**
 * The played timeline with every measure that plays `measure`'s notes rewritten by `edit`. That is
 * the measure itself, its `%`/`|xN` copies when it is their source, and its hidden section passes.
 */
function playedWith(parsed: ParsedRhythm, measure: number, edit: (notes: string[]) => string[], scope: 'source' | 'drawn'): string {
  const layout = measureLayoutOf(parsed);
  return parsed.measures
    .map((m, i) => {
      const notes = m.notes.map((n) => `${n.sound[0]}${n.durationInSixteenths}`);
      const hit = scope === 'source' ? layout[i].sourceIndex === measure : layout[i].drawnIndex === measure;
      return (hit ? edit(notes) : notes).join(' ');
    })
    .join(' | ');
}


function patternFor(rng: Rng, duration: number): { text: string; notes: WrittenNote[] } {
  const notes: WrittenNote[] = [];
  let text = '';
  let left = duration;
  while (left > 0) {
    const d = Math.min(left, rng.pick([1, 2, 2, 4]));
    const ch = rng.pick(['D', 'T', 'K', 'S']);
    text += ch + '-'.repeat(d - 1);
    notes.push({ sound: soundOfChar[ch], duration: d });
    left -= d;
  }
  return { text, notes };
}

function pickOp(rng: Rng, notation: string, ts: TimeSignature): Outcome | null {
  const { written, drawn } = model(notation, ts);
  const real = drawn.filter((n) => !n.implicit);
  if (real.length === 0) return null;
  const op = rng.int(0, 8);
  const note = rng.pick(real);

  if (op === 0) {
    // Replace one note with a same-length pattern. Its copies (`%`, `|xN`, hidden section
    // passes) must change with it; nothing else may.
    const pattern = patternFor(rng, note.duration);
    const expected = [...written.slice(0, note.index), ...pattern.notes, ...written.slice(note.index + 1)];
    const parsed = parseRhythm(notation, ts);
    const notes = parsed.measures[note.measure].notes;
    const k = notes.findIndex((_, i) => measureLayoutOf(parsed)[note.measure].visualStartTick! + notes.slice(0, i).reduce((t, n) => t + n.durationInSixteenths, 0) === note.pos);
    const tied = notes.some((n) => n.isTiedFrom || n.isTiedTo);
    const played = k < 0 || tied ? undefined : playedWith(parsed, note.measure,
      (ns) => [...ns.slice(0, k), ...pattern.notes.map((n) => `${n.sound[0]}${n.duration}`), ...ns.slice(k + 1)], 'source');
    return { name: `replace ${note.sound}${note.duration}@${note.pos} with ${pattern.text}`, next: replaceRange(notation, ts, { start: note.pos, end: note.pos + note.duration }, pattern.text), expected, played, mustApply: true };
  }
  if (op === 8) {
    // Copy a run of notes and paste it before another note.
    const after = real.filter((n) => n.index >= note.index);
    const take = after.slice(0, rng.int(1, Math.min(3, after.length)));
    const contiguous = take.every((n, i) => i === 0 || n.pos === take[i - 1].pos + take[i - 1].duration);
    if (!contiguous) return null;
    const end = take.at(-1)!.pos + take.at(-1)!.duration;
    const text = copyRange(notation, ts, { start: note.pos, end });
    const target = rng.pick(real);
    const copied = written.slice(note.index, note.index + take.length);
    const expected = [...written.slice(0, target.index), ...copied, ...written.slice(target.index)];
    return { name: `copy ${take.length} notes@${note.pos} ("${text}") and paste before @${target.pos}`, next: dropPattern(notation, ts, text, target.pos, 'insert'), expected, mustApply: true };
  }
  if (op === 7) {
    // Replace a whole `%` / `|xN` copy measure. It becomes its own written measure; its source and
    // the other copies keep playing the source's notes.
    const parsed = parseRhythm(notation, ts);
    const layout = measureLayoutOf(parsed);
    const copies = (parsed.repeats ?? []).flatMap((r) => (r.type === 'measure' ? r.repeatMeasures : []))
      .filter((i) => layout[i]?.visualStartTick !== null && layout[i] !== undefined);
    if (copies.length === 0) return null;
    const copy = rng.pick(copies);
    const spm = getSixteenthsPerMeasure(ts);
    const pattern = patternFor(rng, spm);
    const start = layout[copy].visualStartTick!;
    const played = playedWith(parsed, copy, () => pattern.notes.map((n) => `${n.sound[0]}${n.duration}`), 'drawn');
    return { name: `replace copy measure ${copy + 1}@${start} with ${pattern.text}`, next: replaceRange(notation, ts, { start, end: start + spm }, pattern.text), played, expandsCopy: true, mustApply: true };
  }
  if (op === 1) {
    // Replace a run of notes in one measure with a pattern of the same total length.
    const run = real.filter((n) => n.measure === note.measure && n.index >= note.index && n.pos >= note.pos);
    const take = run.slice(0, rng.int(1, Math.max(1, run.length)));
    const contiguous = take.every((n, i) => i === 0 || n.pos === take[i - 1].pos + take[i - 1].duration);
    if (!contiguous) return null;
    const total = take.reduce((t, n) => t + n.duration, 0);
    const pattern = patternFor(rng, total);
    const expected = [...written.slice(0, note.index), ...pattern.notes, ...written.slice(note.index + take.length)];
    return { name: `replace ${take.length} notes@${note.pos} with ${pattern.text}`, next: replaceRange(notation, ts, { start: note.pos, end: note.pos + total }, pattern.text), expected, mustApply: true };
  }
  if (op === 2) {
    // Delete a run of 1-3 notes.
    const after = real.filter((n) => n.index >= note.index);
    const take = after.slice(0, rng.int(1, Math.min(3, after.length)));
    const contiguous = take.every((n, i) => i === 0 || n.pos === take[i - 1].pos + take[i - 1].duration);
    if (!contiguous) return null;
    const end = take.at(-1)!.pos + take.at(-1)!.duration;
    const expected = [...written.slice(0, note.index), ...written.slice(note.index + take.length)];
    return { name: `delete ${take.length} notes@${note.pos}`, next: deleteRange(notation, ts, { start: note.pos, end }), expected, mustApply: true, removed: new Set(take.map((n) => n.index)) };
  }
  if (op === 3) {
    // Move one note before another note.
    const target = rng.pick(real);
    if (target.index === note.index || target.index === note.index + 1) return null;
    const without = [...written.slice(0, note.index), ...written.slice(note.index + 1)];
    const at = target.index > note.index ? target.index - 1 : target.index;
    const expected = [...without.slice(0, at), written[note.index], ...without.slice(at)];
    return { name: `move ${note.sound}${note.duration}@${note.pos} before @${target.pos}`, next: moveRange(notation, ts, { start: note.pos, end: note.pos + note.duration }, target.pos), expected, mustApply: true, removed: new Set([note.index]) };
  }
  if (op === 4) {
    // Drop-insert a pattern before a note.
    const pattern = patternFor(rng, rng.pick([1, 2, 4]));
    const expected = [...written.slice(0, note.index), ...pattern.notes, ...written.slice(note.index)];
    return { name: `insert ${pattern.text} before @${note.pos}`, next: dropPattern(notation, ts, pattern.text, note.pos, 'insert'), expected, mustApply: true };
  }
  if (op === 5) {
    // Drop-replace starting at a note, over exactly that note.
    const pattern = patternFor(rng, note.duration);
    const expected = [...written.slice(0, note.index), ...pattern.notes, ...written.slice(note.index + 1)];
    return { name: `drop-replace ${note.sound}${note.duration}@${note.pos} with ${pattern.text}`, next: dropPattern(notation, ts, pattern.text, note.pos, 'replace'), expected, mustApply: true };
  }
  // Backspace: the last thing typed goes — a trailing `%` measure, or else the last note.
  const endsWithSimile = (notation.match(/[DTKSdtks]-*|_+|%/g) ?? []).at(-1) === '%';
  return { name: 'delete last note', next: deleteLastNote(notation), expected: endsWithSimile ? written : written.slice(0, -1) };
}

// ---- the run -------------------------------------------------------------------------------

// 300 runs in about a second. For a deep soak: DRUMS_FUZZ_SEEDS=20000 npx vitest run <this file>
const RHYTHMS = Number(process.env.DRUMS_FUZZ_SEEDS) || 300;
const EDITS_PER_RHYTHM = 6;

function runSeed(seed: number): string | null {
  const rng = rngFrom(seed);
  let { notation } = generateRhythm(rng);
  const { ts } = generateRhythm(rngFrom(seed));
  if (!parseRhythm(notation, ts).isValid) return null;
  for (let step = 0; step < EDITS_PER_RHYTHM; step++) {
    let outcome: Outcome | null;
    try {
      outcome = pickOp(rng, notation, ts);
    } catch (error) {
      return `seed ${seed} step ${step}: threw ${(error as Error).message}\n  ${notation}`;
    }
    if (!outcome) continue;
    if (outcome.next === null) {
      // "No edit" is right only when the edit would change nothing. Skipping every null let a
      // broken edit pass by quietly refusing — a `%` copy edit returned null for every case.
      const unchanged = outcome.expected ? sig(outcome.expected) === sig(writtenNotes(notation)) : outcome.played === playedSig(parseRhythm(notation, ts));
      if (outcome.mustApply && !unchanged) return `seed ${seed} step ${step} ${outcome.name}: refused\n  ${notation}`;
      continue;
    }
    const { next, expected, name } = outcome;
    const where = `seed ${seed} step ${step} (${ts.numerator}/${ts.denominator}) ${name}\n  before: ${notation}\n  after:  ${next}`;

    if (!parseRhythm(next, ts).isValid && next.trim()) return `${where}\n  result does not parse`;
    // Replace and insert keep every repeat sign. Removing notes (delete, move, Backspace) may
    // also remove a repeat it emptied — but never add, reorder or rewrite one.
    const before = structure(notation).split(' ').filter(Boolean);
    const after = structure(next).split(' ').filter(Boolean);
    let ok: boolean;
    if (outcome.expandsCopy || name === 'delete last note') {
      // Writing out a copy drops its sign; Backspace drops a trailing `%` or a repeat it emptied.
      // Backspace's exact behaviour is pinned in notationEdits.test.ts.
      ok = isSubsequence(after, before);
    } else if (outcome.removed) {
      // Only a repeat whose every note the edit removed may go; every other one keeps its signs.
      const survivors = repeatGroups(notation).filter((g) => g.notes.some((i) => !outcome.removed!.has(i)) || g.notes.length === 0);
      ok = after.join(' ') === survivors.flatMap((g) => g.signs).join(' ');
    } else {
      ok = after.join(' ') === before.join(' ');
    }
    if (!ok) return `${where}\n  repeat signs changed: ${before.join(' ')} → ${after.join(' ')}`;
    if (outcome.played) {
      const got = playedSig(parseRhythm(next, ts));
      if (got !== outcome.played) return `${where}\n  expected to play: ${outcome.played}\n  plays:            ${got}`;
    }
    if (expected) {
      let got: string;
      try {
        // Also re-derives where every note is drawn, so a parse that disagrees with the string fails here.
        model(next, ts);
        got = sig(writtenNotes(next));
      } catch (error) {
        return `${where}\n  ${(error as Error).message}`;
      }
      if (got !== sig(expected)) return `${where}\n  expected: ${sig(expected)}\n  got:      ${got}`;
    }
    notation = next;
  }
  return null;
}

describe('notation edits under random rhythms and edit chains', () => {
  it('generates rhythms that parse, across every meter and repeat kind', () => {
    const seen = new Set<string>();
    let valid = 0;
    for (let seed = 1; seed <= RHYTHMS; seed++) {
      const { notation, ts } = generateRhythm(rngFrom(seed));
      if (!parseRhythm(notation, ts).isValid) continue;
      valid++;
      seen.add(`${ts.numerator}/${ts.denominator}`);
      if (notation.includes('|:')) seen.add('section');
      if (/\|x\d/.test(notation)) seen.add('measure repeat');
      if (notation.includes('%')) seen.add('simile');
    }
    expect(valid).toBeGreaterThan(RHYTHMS * 0.9);
    expect([...seen].sort()).toEqual(['2/4', '3/4', '4/4', '6/8', '7/8', 'measure repeat', 'section', 'simile'].sort());
  });

  it('every edit lands exactly where it was aimed', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= RHYTHMS; seed++) {
      const failure = runSeed(seed);
      if (failure) failures.push(failure);
    }
    expect({ failed: failures.length, first: failures.slice(0, 5) }).toEqual({ failed: 0, first: [] });
  });
});
