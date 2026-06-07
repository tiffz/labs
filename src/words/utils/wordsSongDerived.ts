import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { SyllableHit, WordRhythmResult } from './prosodyEngine';
import { DEFAULT_WORD_RESULT } from './wordsAppDefaults';
import type { SectionRenderPlan } from './wordsSectionPlans';

export function buildHitMap(
  parsedRhythm: ReturnType<typeof parseRhythm>,
  generatedHits: SyllableHit[]
): Map<string, SyllableHit> {
  const map = new Map<string, SyllableHit>();
  let hitIndex = 0;
  parsedRhythm.measures.forEach((measure, measureIndex) => {
    measure.notes.forEach((note, noteIndex) => {
      if (note.sound === 'rest' || note.sound === 'simile') return;
      const hit = generatedHits[hitIndex];
      if (hit) {
        map.set(`${measureIndex}-${noteIndex}`, hit);
      }
      hitIndex += 1;
    });
  });
  return map;
}

export { buildDarbukaEditUrl } from '../../shared/rhythm/buildDarbukaEditUrl';

export function estimateSongDuration(
  parsedMeasures: ReturnType<typeof parseRhythm>['measures'],
  bpm: number
): string {
  const totalSixteenths = parsedMeasures.reduce(
    (measureSum, measure) =>
      measureSum +
      measure.notes.reduce(
        (noteSum, note) => noteSum + note.durationInSixteenths,
        0
      ),
    0
  );
  const seconds = Math.max(0, (totalSixteenths / 4) * (60 / Math.max(1, bpm)));
  const wholeSeconds = Math.round(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remaining = wholeSeconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export function mergeSectionRenderResults(
  sectionRenderPlans: SectionRenderPlan[],
  sixteenthsPerMeasure: number
): WordRhythmResult {
  const mergedNotation = sectionRenderPlans
    .map((plan) => plan.sectionNotation)
    .filter((value) => value.trim().length > 0)
    .join('|');
  const mergedAnalyses = sectionRenderPlans.flatMap((plan) => plan.result.analyses);
  const mergedHits: SyllableHit[] = [];
  sectionRenderPlans.forEach((plan) => {
    const sectionStartSixteenth = plan.startMeasure * sixteenthsPerMeasure;
    plan.result.hits.forEach((hit) => {
      mergedHits.push({
        ...hit,
        startSixteenth: hit.startSixteenth + sectionStartSixteenth,
      });
    });
  });
  return {
    notation: mergedNotation || DEFAULT_WORD_RESULT.notation,
    analyses: mergedAnalyses,
    hits: mergedHits,
    dictionaryCount: sectionRenderPlans.reduce(
      (sum, plan) => sum + plan.result.dictionaryCount,
      0
    ),
    heuristicCount: sectionRenderPlans.reduce(
      (sum, plan) => sum + plan.result.heuristicCount,
      0
    ),
    unresolvedCount: sectionRenderPlans.reduce(
      (sum, plan) => sum + plan.result.unresolvedCount,
      0
    ),
  };
}
