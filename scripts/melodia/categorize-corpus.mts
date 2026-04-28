/**
 * Categorize a normalized Melodia corpus (`corpus.jsonl`) into difficulty
 * buckets (stepwise / thirds / fourths / mixed) and write a
 * `linearPath.json` suitable for `src/melodia/curriculum/path.json`.
 *
 * Usage:
 *   npx tsx scripts/melodia/categorize-corpus.mts <corpusJsonl> <outputJson>
 *
 * Exercises flagged with `manualReview: true` are excluded from the linear
 * path but still listed in the `categorized` field for triage.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { categorizeCorpus } from '../../src/shared/music/melodiaPipeline/categorize.ts';
import type { NormalizedMelodiaExercise } from '../../src/shared/music/melodiaPipeline/types.ts';

function parseArgs(argv: string[]): { input: string; output: string } {
  const rest = argv.slice(2).filter((a) => !a.startsWith('--'));
  const input = rest[0];
  const output = rest[1];
  if (!input || !output) {
    console.error('Usage: tsx scripts/melodia/categorize-corpus.mts <corpusJsonl> <outputJson>');
    process.exit(2);
  }
  return { input, output };
}

function readCorpusJsonl(path: string): NormalizedMelodiaExercise[] {
  const raw = readFileSync(path, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as NormalizedMelodiaExercise);
}

function main(): void {
  const { input, output } = parseArgs(process.argv);
  const exercises = readCorpusJsonl(input);
  const result = categorizeCorpus(exercises);
  const slim = {
    version: result.version,
    generatedBy: result.generatedBy,
    exerciseIds: result.exerciseIds,
  };
  writeFileSync(output, `${JSON.stringify(slim, null, 2)}\n`, 'utf8');
  const counts = (
    Object.entries(result.buckets) as Array<[string, string[]]>
  ).map(([k, v]) => `${k}=${v.length}`).join(' ');
  const skipped = result.categorized.filter((e) => e.manualReview).length;
  console.log(
    `categorized ${exercises.length} exercises → ${result.exerciseIds.length} usable (skipped ${skipped} manualReview); ${counts}`,
  );
}

main();
