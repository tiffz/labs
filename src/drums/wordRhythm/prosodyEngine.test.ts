import { describe, expect, it } from 'vitest';
import { parseRhythm } from '../utils/rhythmParser';
import { generateWordRhythm } from './prosodyEngine';

describe('generateWordRhythm', () => {
  const timeSignature = { numerator: 4, denominator: 4 } as const;

  it('produces parseable notation', () => {
    const result = generateWordRhythm('coconut avocado grapes', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const parsed = parseRhythm(result.notation, timeSignature);
    expect(result.notation.length).toBeGreaterThan(0);
    expect(parsed.isValid).toBe(true);
    expect(result.dictionaryCount + result.heuristicCount + result.unresolvedCount).toBe(
      result.analyses.length
    );
  });

  it('marks unresolved words in strict dictionary mode', () => {
    const result = generateWordRhythm('zzzzqql inventedword', {
      strictDictionaryMode: true,
      timeSignature,
      variationSeed: 0,
    });

    expect(result.unresolvedCount).toBeGreaterThan(0);
    expect(result.heuristicCount).toBe(0);
  });

  it('enables heuristic fallback when strict mode is off', () => {
    const result = generateWordRhythm('zzzzqql inventedword', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    expect(result.heuristicCount).toBeGreaterThan(0);
    expect(result.unresolvedCount).toBe(0);
  });

  it('preserves full word letters in syllable splits', () => {
    const result = generateWordRhythm('grapes coconut', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const grapes = result.analyses.find((analysis) => analysis.word.toLowerCase() === 'grapes');
    expect(grapes).toBeDefined();
    expect(grapes?.syllables.join('')).toBe('grapes');
  });

  it('splits shoreline naturally as shore-line', () => {
    const result = generateWordRhythm('shoreline', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const shoreline = result.analyses.find((analysis) => analysis.word.toLowerCase() === 'shoreline');
    expect(shoreline).toBeDefined();
    expect(shoreline?.syllables).toEqual(['shore', 'line']);
  });

  it('keeps isolated 16th rests limited in default mapping', () => {
    const result = generateWordRhythm('ta ka di mi ta ka ju no coconut avocado grapes on a vine', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    // Small numbers of single rests can happen with dotted/tied phrasing, but should stay constrained.
    const isolated = [...result.notation.matchAll(/(^|[^_])_([^_]|$)/g)];
    expect(isolated.length).toBeLessThanOrEqual(2);
  });

  it('supports varied pulse values for generated phrasing', () => {
    const result = generateWordRhythm('ta ka di mi ta ka ju no', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 1,
    });

    const parsed = parseRhythm(result.notation, timeSignature);
    const noteDurations = parsed.measures
      .flatMap((measure) => measure.notes)
      .filter((note) => note.sound !== 'rest')
      .map((note) => note.durationInSixteenths);

    expect(noteDurations.length).toBeGreaterThan(0);
    expect(noteDurations.some((duration) => duration >= 3)).toBe(true);
  });

  it('prefers keeping long words together across barlines', () => {
    const result = generateWordRhythm('extraordinary coconut', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const extraordinaryHits = result.hits.filter((hit) => hit.word.toLowerCase() === 'extraordinary');
    expect(extraordinaryHits.length).toBeGreaterThan(1);

    const measureIndices = extraordinaryHits.map((hit) => Math.floor(hit.startSixteenth / 16));
    const uniqueMeasures = new Set(measureIndices);
    expect(uniqueMeasures.size).toBeLessThanOrEqual(2);
  });

  it('biases new lyric lines to start on new measures', () => {
    const result = generateWordRhythm('banana\ncoconut', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const coconutFirstSyllable = result.hits.find(
      (hit) => hit.word.toLowerCase() === 'coconut' && hit.syllableIndex === 0
    );
    expect(coconutFirstSyllable).toBeDefined();
    expect((coconutFirstSyllable?.startSixteenth ?? -1) % 16).toBe(0);
    expect((coconutFirstSyllable?.startSixteenth ?? 0)).toBeGreaterThan(0);
  });

  it('preserves input casing in syllable display data', () => {
    const result = generateWordRhythm('SunRise', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const analysis = result.analyses[0];
    expect(analysis).toBeDefined();
    expect(analysis.syllables.join('')).toBe('SunRise');
  });

  it('treats contraction "won\'t" as a single syllable', () => {
    const result = generateWordRhythm("won't", {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const analysis = result.analyses[0];
    expect(analysis).toBeDefined();
    expect(analysis.syllables.length).toBe(1);
  });

  it('speeds up long words with faster subdivisions', () => {
    const result = generateWordRhythm('watermelon watermelon', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 1,
    });

    const watermelonHits = result.hits.filter((hit) => hit.word.toLowerCase() === 'watermelon');
    expect(watermelonHits.length).toBeGreaterThanOrEqual(4);
    expect(watermelonHits.some((hit) => hit.durationSixteenths === 1)).toBe(true);
  });

  it('variation seed creates different groove outputs', () => {
    const seedA = generateWordRhythm('sunrise on the shoreline with watermelon dreams', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 1,
    });
    const seedB = generateWordRhythm('sunrise on the shoreline with watermelon dreams', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 4,
    });

    expect(seedA.notation).not.toBe(seedB.notation);
  });

  it('follows major-beat drum heuristics in 4/4', () => {
    const result = generateWordRhythm('ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const byPosition = new Map<number, 'D' | 'T' | 'K' | '_'>();
    result.hits.forEach((hit) => {
      const pos = hit.startSixteenth % 16;
      if (!byPosition.has(pos)) byPosition.set(pos, hit.stroke);
    });

    if (byPosition.has(0)) expect(byPosition.get(0)).toBe('D');
    if (byPosition.has(8)) expect(byPosition.get(8)).toBe('D');
    if (byPosition.has(4)) expect(byPosition.get(4)).toBe('T');
    if (byPosition.has(12)) expect(byPosition.get(12)).toBe('T');
  });

  it('avoids repeated ka filler strokes', () => {
    const result = generateWordRhythm('banana avocado coconut pomegranate', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const strokes = result.hits.map((hit) => hit.stroke);
    for (let index = 1; index < strokes.length; index += 1) {
      expect(!(strokes[index] === 'K' && strokes[index - 1] === 'K')).toBe(true);
    }
  });
});
