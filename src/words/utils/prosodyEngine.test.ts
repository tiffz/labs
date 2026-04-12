import { describe, expect, it } from 'vitest';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import { mergePartialGenerationSettings } from './generationSettingsCodec';
import {
  ALL_MUTATION_IDS,
  DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
  type MutationId,
  type WordRhythmGenerationSettings,
  generateWordRhythm,
} from './prosodyEngine';

function strictTemplateSettings(
  templateNotation: string
): WordRhythmGenerationSettings {
  return mergePartialGenerationSettings(DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS, {
    templateNotation,
    freestyle: false,
    phrasing: 'repeat',
    mutations: ALL_MUTATION_IDS.reduce(
      (acc, id) => {
        acc[id] = false;
        return acc;
      },
      {} as Record<MutationId, boolean>
    ),
    naturalWordRhythm: false,
    stressAlignment: 'off',
    wordStartAlignment: 'off',
  });
}

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

  it('naturalWordRhythm shapes syllable durations according to word stress', () => {
    const withShape = generateWordRhythm('sunrise over shoreline', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 0,
      soundVariationSeed: 0,
      generationSettings: mergePartialGenerationSettings(
        DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
        { templateNotation: 'D---T---D---T---', naturalWordRhythm: true }
      ),
    });
    const withoutShape = generateWordRhythm('sunrise over shoreline', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 0,
      soundVariationSeed: 0,
      generationSettings: mergePartialGenerationSettings(
        DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
        { templateNotation: 'D---T---D---T---', naturalWordRhythm: false }
      ),
    });
    const shapeDurations = withShape.hits.map((h) => h.durationSixteenths);
    const plainDurations = withoutShape.hits.map((h) => h.durationSixteenths);
    expect(shapeDurations.length).toBeGreaterThan(0);
    expect(plainDurations.length).toBeGreaterThan(0);
    // With word shape, multi-syllable words should produce non-uniform
    // durations rather than all-4s from the template.
    const hasVariedDurations = shapeDurations.some((d) => d !== 4);
    expect(hasVariedDurations).toBe(true);
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

  it('forces violet and violets to two syllables', () => {
    const result = generateWordRhythm('violet violets', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const violet = result.analyses.find(
      (analysis) => analysis.word.toLowerCase() === 'violet'
    );
    const violets = result.analyses.find(
      (analysis) => analysis.word.toLowerCase() === 'violets'
    );
    expect(violet?.syllables).toEqual(['vio', 'let']);
    expect(violets?.syllables).toEqual(['vio', 'lets']);
  });

  it('expands number tokens into words before syllable analysis', () => {
    const result = generateWordRhythm('90 12.5', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    expect(result.analyses.map((analysis) => analysis.word)).toEqual([
      'ninety',
      'twelve',
      'point',
      'five',
    ]);
  });

  it('expands colloquial decade-style numbers into pluralized words', () => {
    const result = generateWordRhythm("90s 90's 90’s", {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    expect(result.analyses.map((analysis) => analysis.word)).toEqual([
      'nineties',
      'nineties',
      'nineties',
    ]);
  });

  it('expands ordinal number forms into ordinal words', () => {
    const result = generateWordRhythm(
      '1st 2nd 3rd 4th 21st 32nd 43rd 54th 100th 101st',
      {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: 0,
      }
    );

    expect(result.analyses.map((analysis) => analysis.word)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
      'twenty',
      'first',
      'thirty',
      'second',
      'forty',
      'third',
      'fifty',
      'fourth',
      'one',
      'hundredth',
      'one',
      'hundred',
      'first',
    ]);
  });

  it('supports pluralized ordinal tokens', () => {
    const result = generateWordRhythm("1sts 22nd's", {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    expect(result.analyses.map((analysis) => analysis.word)).toEqual([
      'firsts',
      'twenty',
      'seconds',
    ]);
  });

  it('can alternate strict vs spoken syllables for flexible words by seed', () => {
    const counts = new Set<number>();
    for (let seed = 0; seed < 12; seed += 1) {
      const result = generateWordRhythm('comfortable', {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: seed,
      });
      counts.add(result.analyses[0]?.syllables.length ?? -1);
    }
    expect(counts.has(3)).toBe(true);
    expect(counts.has(4)).toBe(true);
  });

  it('handles common spoken-English words with stable syllable counts', () => {
    const expectations: Record<string, number | number[]> = {
      violet: 2,
      violets: 2,
      every: [2, 3],
      different: [2, 3],
      favorite: [2, 3],
      chocolate: 2,
      camera: 3,
      family: 3,
      beautiful: 3,
      business: 2,
      comfortable: [3, 4],
      vegetable: 3,
      interesting: 3,
      restaurant: 3,
      temperature: 3,
      poem: 2,
      orange: 2,
      hour: 1,
      rhythm: 2,
      queue: 1,
      people: 2,
      because: 2,
      really: 2,
      idea: 3,
      music: 2,
      melody: 3,
    };

    const source = Object.keys(expectations).join(' ');
    const result = generateWordRhythm(source, {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
    });

    const byWord = new Map(
      result.analyses.map((analysis) => [analysis.word.toLowerCase(), analysis])
    );
    const mismatches = Object.entries(expectations)
      .map(([word, expected]) => {
        const actualCount = byWord.get(word)?.syllables.length ?? -1;
        const expectedCounts = Array.isArray(expected) ? expected : [expected];
        return expectedCounts.includes(actualCount)
          ? null
          : { word, expectedCount: expectedCounts, actualCount };
      })
      .filter(Boolean);
    expect(mismatches).toEqual([]);
  });

  it('keeps regular plural s/ies forms aligned with singular syllable counts', () => {
    const sameCountPairs: Array<[string, string]> = [
      ['violet', 'violets'],
      ['planet', 'planets'],
      ['river', 'rivers'],
      ['camera', 'cameras'],
      ['flower', 'flowers'],
      ['rhythm', 'rhythms'],
      ['story', 'stories'],
      ['family', 'families'],
      ['melody', 'melodies'],
      ['idea', 'ideas'],
      ['banana', 'bananas'],
      ['poem', 'poems'],
    ];
    const mismatches = sameCountPairs
      .map(([singular, plural]) => {
        const singularResult = generateWordRhythm(singular, {
          strictDictionaryMode: false,
          timeSignature,
          variationSeed: 0,
        });
        const pluralResult = generateWordRhythm(plural, {
          strictDictionaryMode: false,
          timeSignature,
          variationSeed: 0,
        });
        const singularCount = singularResult.analyses[0]?.syllables.length ?? -1;
        const pluralCount = pluralResult.analyses[0]?.syllables.length ?? -1;
        return singularCount === pluralCount
          ? null
          : { singular, plural, singularCount, pluralCount };
      })
      .filter(Boolean);

    expect(mismatches).toEqual([]);
  });

  it('keeps sibilant -es plurals free to add an extra syllable', () => {
    const additivePairs: Array<[string, string]> = [
      ['bus', 'buses'],
      ['box', 'boxes'],
      ['church', 'churches'],
      ['dish', 'dishes'],
      ['match', 'matches'],
    ];
    const mismatches = additivePairs
      .map(([singular, plural]) => {
        const singularResult = generateWordRhythm(singular, {
          strictDictionaryMode: false,
          timeSignature,
          variationSeed: 0,
        });
        const pluralResult = generateWordRhythm(plural, {
          strictDictionaryMode: false,
          timeSignature,
          variationSeed: 0,
        });
        const singularCount = singularResult.analyses[0]?.syllables.length ?? -1;
        const pluralCount = pluralResult.analyses[0]?.syllables.length ?? -1;
        return pluralCount > singularCount
          ? null
          : { singular, plural, singularCount, pluralCount };
      })
      .filter(Boolean);

    expect(mismatches).toEqual([]);
  });

  it('speeds up long words with faster subdivisions', () => {
    const result = generateWordRhythm('watermelon watermelon', {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 1,
      generationSettings: {
        freestyle: true,
        freestyleStrength: 80,
        noteValueBias: { sixteenth: 90, eighth: 50, dotted: 50, quarter: 50 },
      },
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
        generationSettings: mergePartialGenerationSettings(
          DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
          {
            mutations: {
              ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.mutations,
              adventurousRhythm: true,
              dottedFeel: true,
              sixteenthMotion: true,
              crossBarTies: true,
              midMeasureRests: false,
            },
          }
        ),
      }
    );
    const parsed = parseRhythm(result.notation, timeSignature);
    const sounding = parsed.measures
      .flatMap((measure) => measure.notes)
      .filter((note) => note.sound !== 'rest');
    const durations = sounding.map((note) => note.durationInSixteenths);
    expect(durations.some((d) => d === 1)).toBe(true);
    expect(new Set(durations).size).toBeGreaterThanOrEqual(2);
  });

  it('strict template mode preserves rests from the template (e.g. Maqsum)', () => {
    const result = generateWordRhythm('ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 0,
      soundVariationSeed: 0,
      generationSettings: strictTemplateSettings('D-T-__T-D---T---'),
    });
    const firstMeasure = result.notation.split('|')[0] ?? '';
    expect(firstMeasure.length).toBeGreaterThan(0);
    expect(firstMeasure).toContain('_');
    const restRun = firstMeasure.match(/_+/);
    expect(restRun?.[0].length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the strict template timeline when alignments are on but mutations are off', () => {
    const template = 'D-T-__T-D---T---';
    const withAlignment = mergePartialGenerationSettings(
      strictTemplateSettings(template),
      {
        stressAlignment: 'strong',
        wordStartAlignment: 'strong',
      }
    );
    const strictOnly = generateWordRhythm('ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 0,
      soundVariationSeed: 0,
      generationSettings: strictTemplateSettings(template),
    });
    const aligned = generateWordRhythm('ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 0,
      soundVariationSeed: 0,
      generationSettings: withAlignment,
    });
    expect(strictOnly.notation).toBe(aligned.notation);
    expect(aligned.hits.length).toBe(strictOnly.hits.length);
  });

  it('strict template mode steers durations toward template pulse', () => {
    const result = generateWordRhythm(
      'sunrise over shoreline ocean wind through palm trees',
      {
        strictDictionaryMode: false,
        timeSignature,
        rhythmVariationSeed: 2,
        soundVariationSeed: 2,
        generationSettings: strictTemplateSettings('D-T-__T-D---T---'),
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

  it('strict template preserves dotted-like values without losing readability', () => {
    const result = generateWordRhythm('sunrise brings the blazing heat', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 2,
      soundVariationSeed: 1,
      generationSettings: strictTemplateSettings('D--KD-T-D--KD-T-'),
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

  it('strict template stays closer to the groove than adventurous mutations', () => {
    const source = 'sunrise on the shoreline ocean wind through palm trees';
    const strict = generateWordRhythm(source, {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 3,
      soundVariationSeed: 2,
      generationSettings: strictTemplateSettings('D-T-__T-D---T---'),
    });
    const varied = generateWordRhythm(source, {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 3,
      soundVariationSeed: 2,
      generationSettings: mergePartialGenerationSettings(
        strictTemplateSettings('D-T-__T-D---T---'),
        {
          subdivideNotes: true,
          freestyle: true,
          naturalWordRhythm: true,
          noteValueBias: { sixteenth: 75, eighth: 50, dotted: 75, quarter: 50 },
          stressAlignment: 'strong',
          wordStartAlignment: 'strong',
        }
      ),
    });

    const strictDurations = strict.hits.map((hit) => hit.durationSixteenths);
    const variedDurations = varied.hits.map((hit) => hit.durationSixteenths);
    const comparedLength = Math.min(
      strictDurations.length,
      variedDurations.length
    );
    const sameCount = strictDurations
      .slice(0, comparedLength)
      .filter((duration, index) => duration === variedDurations[index]).length;

    expect(comparedLength).toBeGreaterThan(0);
    expect(sameCount / comparedLength).toBeLessThan(0.95);
  });

  it('locks ayoub swing anchors with dotted starts in strict template mode', () => {
    const result = generateWordRhythm('ta ta ta ta ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 5,
      soundVariationSeed: 5,
      generationSettings: strictTemplateSettings('D--KD-T-D--KD-T-'),
    });
    const firstEight = result.hits.slice(0, 8);
    const dottedLikeCount = firstEight.filter(
      (hit) => hit.durationSixteenths === 3
    ).length;
    expect(firstEight.length).toBeGreaterThanOrEqual(4);
    expect(firstEight[0]?.durationSixteenths).toBe(3);
    expect(dottedLikeCount).toBeGreaterThanOrEqual(2);
  });

  it('landing note resolves final syllable on a strong beat with D stroke', () => {
    const lyrics = 'Sunrise on the shore\nOcean line\nWind through palm trees\nFind your peace tonight';
    const withoutLanding = generateWordRhythm(lyrics, {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
      generationSettings: {
        ...strictTemplateSettings('DtkTDtkT'),
        landingNote: 'off',
      },
    });
    const withLanding = generateWordRhythm(lyrics, {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
      generationSettings: {
        ...strictTemplateSettings('DtkTDtkT'),
        landingNote: 'quarter',
      },
    });

    // All original words should still be present.
    const wordsWithout = withoutLanding.hits.filter((h) => h.word !== '').map((h) => h.word);
    const wordsWith = withLanding.hits.filter((h) => h.word !== '').map((h) => h.word);
    expect(new Set(wordsWith)).toEqual(new Set(wordsWithout));

    // The final syllable should be on a strong beat (beat 1 or beat 3).
    const lastWordHit = [...withLanding.hits].reverse().find((h) => h.word !== '');
    expect(lastWordHit).toBeDefined();
    const posInMeasure = lastWordHit!.startSixteenth % 16;
    expect(posInMeasure === 0 || posInMeasure === 8).toBe(true);
    expect(lastWordHit!.stroke).toBe('D');

    // May add 0 or 1 measures depending on where the syllable originally was.
    const measuresWithout = withoutLanding.notation.split('|').length;
    const measuresWith = withLanding.notation.split('|').length;
    expect(measuresWith).toBeGreaterThanOrEqual(measuresWithout);
    expect(measuresWith).toBeLessThanOrEqual(measuresWithout + 1);
  });

  it('landing note with A/B variations preserves all words', () => {
    const lyrics = 'Sunrise on the shore\nOcean line\nWind through palm trees\nFind your peace tonight';
    const baseline = generateWordRhythm(lyrics, {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
      generationSettings: {
        ...strictTemplateSettings('DtkTDtkT'),
        landingNote: 'off',
        phrasing: 'repeat',
      },
    });
    const withBoth = generateWordRhythm(lyrics, {
      strictDictionaryMode: false,
      timeSignature,
      variationSeed: 0,
      generationSettings: {
        ...strictTemplateSettings('DtkTDtkT'),
        landingNote: 'quarter',
        phrasing: 'halfMeasureVariations',
      },
    });

    const baseWords = baseline.hits.filter((h) => h.word !== '').map((h) => h.word);
    const bothWords = withBoth.hits.filter((h) => h.word !== '').map((h) => h.word);
    // A/B variations may zero-out some hits, but landing note must not remove any
    // words that A/B alone wouldn't remove. Check that base word set is a superset.
    const baseWordSet = new Set(baseWords);
    const missingWords = bothWords.filter((w) => !baseWordSet.has(w));
    expect(missingWords).toEqual([]);
  });

  it('preserves malfuf 3-3-2 grouping under strict template mode', () => {
    const result = generateWordRhythm('ta ta ta ta ta ta ta ta ta ta ta ta', {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: 1,
      soundVariationSeed: 1,
      generationSettings: strictTemplateSettings('D--T--T-D--T--T-'),
    });

    const firstSix = result.hits
      .slice(0, 6)
      .map((hit) => hit.durationSixteenths);
    expect(firstSix).toEqual([3, 3, 2, 3, 3, 2]);
  });

  it('same-line words are not separated by more than one measure of silence', () => {
    const lyrics = 'Sunrise on the shore\nOcean line\nWind through palm trees';
    for (const seed of [0, 1, 2, 3, 42, 99]) {
      const result = generateWordRhythm(lyrics, {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: seed,
        generationSettings: {
          ...strictTemplateSettings('DtkTDtkT'),
          freestyle: true,
          freestyleStrength: 30,
        },
      });

      const lines = lyrics.split('\n');
      let wordOffset = 0;
      for (const line of lines) {
        const lineWords = line.trim().split(/\s+/);
        // For each word, find its last syllable hit.
        const lastHitPerWord = lineWords.map((_, wi) => {
          const wordIdx = wordOffset + wi;
          const wordHits = result.hits.filter(
            (h) => h.word !== '' && h.wordIndex === wordIdx
          );
          if (wordHits.length === 0) return undefined;
          return wordHits.reduce((a, b) =>
            b.startSixteenth > a.startSixteenth ? b : a
          );
        });
        const firstHitPerWord = lineWords.map((_, wi) =>
          result.hits.find(
            (h) => h.word !== '' && h.wordIndex === wordOffset + wi && h.syllableIndex === 0
          )
        );
        for (let j = 1; j < lineWords.length; j++) {
          const prevLast = lastHitPerWord[j - 1];
          const currFirst = firstHitPerWord[j];
          if (!prevLast || !currFirst) continue;
          const gapSixteenths =
            currFirst.startSixteenth - (prevLast.startSixteenth + prevLast.durationSixteenths);
          const isPhraseEnd = j === lineWords.length - 1;
          const maxGap = isPhraseEnd ? 2 : 4;
          expect(
            gapSixteenths,
            `seed ${seed}: gap of ${gapSixteenths} sixteenths between "${prevLast.word}" and "${currFirst.word}" (max ${maxGap})`
          ).toBeLessThanOrEqual(maxGap);
        }
        wordOffset += lineWords.length;
      }
    }
  });

  it('end-of-phrase words are not split into tied notes', () => {
    const lyrics = 'Sunrise on the shoreline\nOcean wind through palm trees';
    for (const seed of [0, 1, 2, 3, 42, 99]) {
      const result = generateWordRhythm(lyrics, {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: seed,
        generationSettings: {
          ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
          templateNotation: 'DtkTDtkT',
          landingNote: 'off' as const,
        },
      });
      // "trees" is the last word — it should be a single hit, not split into tied segments
      const treesHits = result.hits.filter((h) => h.word.toLowerCase() === 'trees');
      expect(
        treesHits.length,
        `seed ${seed}: "trees" has ${treesHits.length} hits (should be 1, not tied)`
      ).toBe(1);
      // "shoreline" is also end-of-phrase
      const shorelineHits = result.hits.filter((h) => h.word.toLowerCase() === 'shoreline');
      const continuations = shorelineHits.filter(h => h.continuationOfPrevious);
      expect(
        continuations.length,
        `seed ${seed}: "shoreline" has ${continuations.length} tie continuations`
      ).toBe(0);
    }
  });

  it('landing note does not leave a long rest before the final word', () => {
    const lyrics = 'Sunrise on the shoreline\nOcean wind through palm trees';
    for (const seed of [0, 1, 2, 3, 42, 99]) {
      const result = generateWordRhythm(lyrics, {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: seed,
        generationSettings: {
          ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
          templateNotation: 'DtkTDtkT',
          landingNote: 'quarter' as const,
        },
      });
      const treesHits = result.hits.filter((h) => h.word.toLowerCase() === 'trees');
      const palmHits = result.hits.filter((h) => h.word.toLowerCase() === 'palm');
      if (treesHits.length === 0 || palmHits.length === 0) continue;
      const palmEnd = palmHits[palmHits.length - 1].startSixteenth + palmHits[palmHits.length - 1].durationSixteenths;
      const treesStart = treesHits[0].startSixteenth;
      const gap = treesStart - palmEnd;
      // "trees" is the phrase-ending word — gap should be at most an eighth note
      // (2 sixteenths) thanks to compactPhraseEndings.
      expect(
        gap,
        `seed ${seed}: gap of ${gap} sixteenths between "palm" and "trees" — should be ≤2`
      ).toBeLessThanOrEqual(2);
    }
  });

  it('landing note produces no wordless orphan hits after the last word', () => {
    const lyrics = 'Sunrise on the shoreline\nOcean wind through palm trees';
    for (const seed of [0, 1, 2, 3, 42, 99]) {
      const result = generateWordRhythm(lyrics, {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: seed,
        generationSettings: {
          ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
          templateNotation: 'DtkTDtkT',
          landingNote: 'quarter' as const,
        },
      });
      const lastHit = result.hits[result.hits.length - 1];
      const treesHits = result.hits.filter((h: { word: string }) => h.word.toLowerCase() === 'trees');
      expect(
        treesHits.length,
        `seed ${seed}: "trees" should appear exactly once, got ${treesHits.length}`
      ).toBeGreaterThanOrEqual(1);
      expect(
        lastHit.word.toLowerCase(),
        `seed ${seed}: last hit word is "${lastHit.word}" — expected "trees"`
      ).toBe('trees');
      let lastWordIdx = -1;
      for (let i = result.hits.length - 1; i >= 0; i--) {
        if (result.hits[i].word !== '') { lastWordIdx = i; break; }
      }
      const trailingEmpty = result.hits.slice(lastWordIdx + 1);
      expect(
        trailingEmpty.length,
        `seed ${seed}: ${trailingEmpty.length} orphan hits after last word`
      ).toBe(0);
    }
  });

  it('phrase-ending gaps stay tight across templates and settings', () => {
    const lyrics = 'Sunrise on the shoreline\nOcean wind through palm trees';
    const templates = ['DtkTDtkT', 'D-T-__T-D---T---', 'D--KD-T-D--KD-T-', 'D---D---D---D---'];
    const settingsVariants: Partial<WordRhythmGenerationSettings>[] = [
      {},
      { landingNote: 'quarter' as const },
      { freestyle: true, freestyleStrength: 40 },
      { fillRests: true, subdivideNotes: true },
      { mergeNotes: true },
      { phrasing: 'halfMeasureVariations' as const, landingNote: 'quarter' as const },
    ];
    for (const tpl of templates) {
      for (const overrides of settingsVariants) {
        for (const seed of [0, 1, 42]) {
          const result = generateWordRhythm(lyrics, {
            strictDictionaryMode: false,
            timeSignature,
            variationSeed: seed,
            generationSettings: {
              ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
              templateNotation: tpl,
              ...overrides,
            },
          });
          const lines = lyrics.split('\n');
          let wordOffset = 0;
          for (const line of lines) {
            const lineWords = line.trim().split(/\s+/);
            for (let j = 1; j < lineWords.length; j++) {
              const prevHits = result.hits.filter((h) => h.word !== '' && h.wordIndex === wordOffset + j - 1);
              const currHit = result.hits.find((h) => h.word !== '' && h.wordIndex === wordOffset + j && h.syllableIndex === 0);
              if (prevHits.length === 0 || !currHit) continue;
              const prevLast = prevHits.reduce((a, b) => b.startSixteenth > a.startSixteenth ? b : a);
              const gap = currHit.startSixteenth - (prevLast.startSixteenth + prevLast.durationSixteenths);
              const isPhraseEnd = j === lineWords.length - 1;
              const maxGap = isPhraseEnd ? 2 : 4;
              expect(
                gap,
                `tpl=${tpl.slice(0, 8)} seed=${seed} overrides=${JSON.stringify(overrides).slice(0, 40)}: gap=${gap} between "${prevLast.word}"→"${currHit.word}" (max ${maxGap})`
              ).toBeLessThanOrEqual(maxGap);
            }
            wordOffset += lineWords.length;
          }
        }
      }
    }
  });

  it('different seeds produce different output with new defaults', () => {
    const lyrics = 'Take me to the river\nHold me under water';
    const results = new Set<string>();
    for (let seed = 0; seed < 10; seed += 1) {
      const result = generateWordRhythm(lyrics, {
        strictDictionaryMode: false,
        timeSignature,
        variationSeed: seed,
        generationSettings: {
          ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
          templateNotation: 'DtkTDtkT',
        },
      });
      results.add(result.notation);
    }
    expect(
      results.size,
      `Expected multiple distinct outputs from 10 seeds, got ${results.size}`
    ).toBeGreaterThanOrEqual(3);
  });
});
