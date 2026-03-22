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
    expect(
      result.dictionaryCount + result.heuristicCount + result.unresolvedCount
    ).toBe(result.analyses.length);
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

    const grapes = result.analyses.find(
      (analysis) => analysis.word.toLowerCase() === 'grapes'
    );
    expect(grapes).toBeDefined();
    expect(grapes?.syllables.join('')).toBe('grapes');
  });

  it('splits shoreline naturally as shore-line', () => {
    const result = generateWordRhythm('shoreline', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const shoreline = result.analyses.find(
      (analysis) => analysis.word.toLowerCase() === 'shoreline'
    );
    expect(shoreline).toBeDefined();
    expect(shoreline?.syllables).toEqual(['shore', 'line']);
  });

  it('keeps isolated 16th rests limited in default mapping', () => {
    const result = generateWordRhythm(
      'ta ka di mi ta ka ju no coconut avocado grapes on a vine',
      {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: 0,
      }
    );

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

    const extraordinaryHits = result.hits.filter(
      (hit) => hit.word.toLowerCase() === 'extraordinary'
    );
    expect(extraordinaryHits.length).toBeGreaterThan(1);

    const measureIndices = extraordinaryHits.map((hit) =>
      Math.floor(hit.startSixteenth / 16)
    );
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
    expect(coconutFirstSyllable?.startSixteenth ?? 0).toBeGreaterThan(0);
  });

  it('can bias extra empty space between dense lyric lines', () => {
    const result = generateWordRhythm(
      'sunrise on the shoreline\nblazing heat under open skies forever',
      {
        strictDictionaryMode: false,
        timeSignature,
        rhythmVariationSeed: 0,
        soundVariationSeed: 0,
        generationSettings: {
          lineBreakGapBias: 100,
        },
      }
    );

    const secondLineFirstWord = result.hits.find(
      (hit) => hit.word.toLowerCase() === 'blazing' && hit.syllableIndex === 0
    );
    expect(secondLineFirstWord).toBeDefined();
    expect((secondLineFirstWord?.startSixteenth ?? 0) % 16).toBeGreaterThan(0);
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

  it('treats curly-apostrophe contraction "won’t" as a single syllable', () => {
    const result = generateWordRhythm('won’t', {
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

    const watermelonHits = result.hits.filter(
      (hit) => hit.word.toLowerCase() === 'watermelon'
    );
    expect(watermelonHits.length).toBeGreaterThanOrEqual(4);
    expect(watermelonHits.some((hit) => hit.durationSixteenths === 1)).toBe(
      true
    );
  });

  it('variation seed creates different groove outputs', () => {
    const seedA = generateWordRhythm(
      'sunrise on the shoreline with watermelon dreams',
      {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: 1,
      }
    );
    const seedB = generateWordRhythm(
      'sunrise on the shoreline with watermelon dreams',
      {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: 4,
      }
    );

    expect(seedA.notation).not.toBe(seedB.notation);
  });

  it('sound variation seed changes stroke choices with stable rhythm seed', () => {
    const soundA = generateWordRhythm(
      'sunrise on the shoreline with watermelon dreams',
      {
        strictDictionaryMode: false,
        timeSignature,
        rhythmVariationSeed: 0,
        soundVariationSeed: 1,
      }
    );
    const soundB = generateWordRhythm(
      'sunrise on the shoreline with watermelon dreams',
      {
        strictDictionaryMode: false,
        timeSignature,
        rhythmVariationSeed: 0,
        soundVariationSeed: 2,
      }
    );

    const strokesA = soundA.hits.map((hit) => hit.stroke).join('');
    const strokesB = soundB.hits.map((hit) => hit.stroke).join('');
    expect(strokesA).not.toBe(strokesB);
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
      expect(!(strokes[index] === 'K' && strokes[index - 1] === 'K')).toBe(
        true
      );
    }
  });

  it('canonicalizes fully empty strict-mode output as one full-measure rest', () => {
    const result = generateWordRhythm('zzzzqql', {
      strictDictionaryMode: true,
      timeSignature,
      variationSeed: 0,
    });
    expect(result.notation).toBe('________________');
  });

  it('drops redundant all-rest measures between lyric lines', () => {
    const result = generateWordRhythm('banana\n\n\ncoconut', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });
    const measures = result.notation.split('|');
    if (measures.length > 1) {
      expect(measures.some((measure) => /^_+$/.test(measure))).toBe(false);
    }
  });

  it('adventurous settings produce dotted and sixteenth variety', () => {
    const result = generateWordRhythm(
      'watermelon extraordinary imagination over oceans',
      {
        strictDictionaryMode: false,
        timeSignature,
        rhythmVariationSeed: 7,
        soundVariationSeed: 3,
        generationSettings: {
          adventurousness: 95,
          dottedBias: 100,
          sixteenthBias: 90,
          tieCrossingBias: 100,
          midMeasureRestBias: 0,
        },
      }
    );
    const parsed = parseRhythm(result.notation, timeSignature);
    const sounding = parsed.measures
      .flatMap((measure) => measure.notes)
      .filter((note) => note.sound !== 'rest');
    expect(sounding.some((note) => note.durationInSixteenths === 1)).toBe(true);
    expect(sounding.some((note) => note.isDotted)).toBe(true);
  });

  it('template bias steers durations toward template pulse', () => {
    const result = generateWordRhythm(
      'sunrise over shoreline ocean wind through palm trees',
      {
        strictDictionaryMode: false,
        timeSignature,
        rhythmVariationSeed: 2,
        soundVariationSeed: 2,
        generationSettings: {
          templateNotation: 'D-T-__T-D---T---',
          templateBias: 100,
          motifVariation: 0,
          adventurousness: 30,
          dottedBias: 0,
          sixteenthBias: 0,
        },
      }
    );
    const firstDurations = result.hits
      .slice(0, 8)
      .map((hit) => hit.durationSixteenths);
    expect(firstDurations.length).toBeGreaterThan(0);
    expect(
      firstDurations.every((duration) => duration === 2 || duration === 4)
    ).toBe(true);
  });

  it('high template influence preserves dotted-like values without losing readability', () => {
    const result = generateWordRhythm('sunrise brings the blazing heat', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 2,
      soundVariationSeed: 1,
      generationSettings: {
        templateNotation: 'D--KD-T-D--KD-T-',
        templateBias: 100,
      },
    });

    const continuationHits = result.hits.filter(
      (hit) => hit.continuationOfPrevious
    );
    const hasDottedLikeDuration = result.hits.some(
      (hit) => hit.durationSixteenths === 3
    );
    expect(continuationHits.length > 0 || hasDottedLikeDuration).toBe(true);
    if (continuationHits.length > 0) {
      expect(continuationHits.every((hit) => hit.syllable === '')).toBe(true);
    }
  });

  it('90% template influence stays close to template-locked groove', () => {
    const source = 'sunrise on the shoreline ocean wind through palm trees';
    const strict = generateWordRhythm(source, {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 3,
      soundVariationSeed: 2,
      generationSettings: {
        templateNotation: 'D-T-__T-D---T---',
        templateBias: 100,
        motifVariation: 0,
      },
    });
    const nearStrict = generateWordRhythm(source, {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 3,
      soundVariationSeed: 2,
      generationSettings: {
        templateNotation: 'D-T-__T-D---T---',
        templateBias: 90,
        motifVariation: 0,
      },
    });

    const strictDurations = strict.hits.map((hit) => hit.durationSixteenths);
    const nearDurations = nearStrict.hits.map((hit) => hit.durationSixteenths);
    const comparedLength = Math.min(
      strictDurations.length,
      nearDurations.length
    );
    const sameCount = strictDurations
      .slice(0, comparedLength)
      .filter((duration, index) => duration === nearDurations[index]).length;

    expect(comparedLength).toBeGreaterThan(0);
    expect(sameCount / comparedLength).toBeGreaterThanOrEqual(0.64);
  });

  it('locks ayoub swing anchors with dotted starts at high template influence', () => {
    const result = generateWordRhythm('ta ta ta ta ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 5,
      soundVariationSeed: 5,
      generationSettings: {
        templateNotation: 'D--KD-T-D--KD-T-',
        templateBias: 100,
        motifVariation: 0,
        adventurousness: 0,
        dottedBias: 0,
        sixteenthBias: 0,
      },
    });
    const firstEight = result.hits.slice(0, 8);
    const dottedLikeCount = firstEight.filter(
      (hit) => hit.durationSixteenths === 3
    ).length;
    expect(firstEight.length).toBeGreaterThanOrEqual(4);
    expect(firstEight[0]?.durationSixteenths).toBe(3);
    expect(dottedLikeCount).toBeGreaterThanOrEqual(2);
  });

  it('preserves malfuf 3-3-2 grouping under strict template influence', () => {
    const result = generateWordRhythm('ta ta ta ta ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 1,
      soundVariationSeed: 1,
      generationSettings: {
        templateNotation: 'D--T--T-D--T--T-',
        templateBias: 100,
        motifVariation: 0,
        adventurousness: 0,
        dottedBias: 0,
        sixteenthBias: 0,
      },
    });

    const firstSix = result.hits
      .slice(0, 6)
      .map((hit) => hit.durationSixteenths);
    expect(firstSix).toEqual([3, 3, 2, 3, 3, 2]);
  });
});
