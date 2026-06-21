import { CHORD_STYLE_OPTIONS } from '../../shared/music/chordStyleOptions';
import type { SongKey } from '../../shared/music/songKeyFormat';
import { songKeyToTonic } from '../../shared/music/chordTheory';
import { getRandomPopularChordProgressionInKey } from '../../shared/music/randomChordProgression';
import type { SongSection } from '../../shared/music/songSections';
import { getTemplateSyncopationScore, pickRandom } from './appRhythmHelpers';
import type { RandomizeMode } from './randomizeModes';

export function pickContrastingTemplate(
  pool: string[],
  referenceNotation: string | null
): string {
  if (!referenceNotation) return pickRandom(pool);
  const baseline = getTemplateSyncopationScore(referenceNotation);
  const scored = pool
    .map((notation) => ({
      notation,
      score: getTemplateSyncopationScore(notation),
    }))
    .sort((a, b) => Math.abs(b.score - baseline) - Math.abs(a.score - baseline));
  return scored[0]?.notation ?? pickRandom(pool);
}

export function applyRandomizationTransform(
  previous: SongSection[],
  params: {
    mode: RandomizeMode;
    sectionId?: string;
    nextKey: SongKey;
    templateNotationPool: string[];
  }
): SongSection[] {
  const { mode, sectionId, nextKey, templateNotationPool } = params;
  const targetIds = new Set(
    previous
      .filter((section) => !section.isLocked)
      .filter((section) => !sectionId || section.id === sectionId)
      .map((section) => section.id)
  );
  if (targetIds.size === 0) return previous;

  const progressionKey = songKeyToTonic(nextKey);
  const verseBaseProgression = getRandomPopularChordProgressionInKey(progressionKey).display;
  const chorusProgression =
    Math.random() < 0.68
      ? verseBaseProgression
      : getRandomPopularChordProgressionInKey(progressionKey).display;
  let bridgeProgression = getRandomPopularChordProgressionInKey(progressionKey).display;
  for (let attempts = 0; attempts < 4; attempts += 1) {
    if (
      bridgeProgression !== verseBaseProgression &&
      bridgeProgression !== chorusProgression
    ) {
      break;
    }
    bridgeProgression = getRandomPopularChordProgressionInKey(progressionKey).display;
  }
  const verseTemplate = pickRandom(templateNotationPool);
  const chorusTemplate =
    Math.random() < 0.72
      ? pickContrastingTemplate(templateNotationPool, verseTemplate)
      : verseTemplate;
  const bridgeTemplate = pickContrastingTemplate(
    templateNotationPool,
    chorusTemplate
  );
  const next = previous.map((section) => {
    if (!targetIds.has(section.id)) return section;
    const shouldRerollPhrasing =
      mode === 'phrasing' || mode === 'rhythm' || mode === 'everything';
    const shouldRerollChords = mode === 'chords' || mode === 'everything';
    const shouldRerollGroove = mode === 'rhythm' || mode === 'everything';
    const sectionProgression =
      section.type === 'bridge'
        ? bridgeProgression
        : section.type === 'chorus'
          ? chorusProgression
          : verseBaseProgression;
    const sectionTemplate =
      section.type === 'bridge'
        ? bridgeTemplate
        : section.type === 'chorus'
          ? chorusTemplate
          : verseTemplate;
    return {
      ...section,
      rhythmVariationSeed: shouldRerollPhrasing
        ? section.rhythmVariationSeed + 1
        : section.rhythmVariationSeed,
      soundVariationSeed: shouldRerollPhrasing
        ? section.soundVariationSeed + 1
        : section.soundVariationSeed,
      chordProgressionInput: shouldRerollChords
        ? sectionProgression
        : section.chordProgressionInput,
      chordStyleId:
        mode === 'everything'
          ? pickRandom(CHORD_STYLE_OPTIONS).id
          : section.chordStyleId,
      templateNotation: shouldRerollGroove
        ? sectionTemplate
        : section.templateNotation,
    };
  });

  let previousChorusLyrics = '';
  return next.map((section) => {
    if (section.type !== 'chorus') return section;
    const normalized = section.lyrics.trim().replace(/\s+/g, ' ');
    const linked = normalized.length > 0 && normalized === previousChorusLyrics;
    previousChorusLyrics = normalized || previousChorusLyrics;
    return {
      ...section,
      linkedToPreviousChorusLyrics: linked,
      linkedToPreviousChorusTemplate: true,
    };
  });
}
