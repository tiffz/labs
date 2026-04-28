/**
 * Batch-ingest MusicXML files into normalized Melodia JSON + reports.
 *
 * Usage:
 *   npx tsx scripts/melodia/ingest-folder.mts <inputDir> <outputDir> [--level=1] [--fail-on-error]
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { DOMParser } from 'linkedom';
import { parseMusicXmlFromDocument } from '../../src/shared/music/parseMusicXml.ts';
import { normalizePianoScore } from '../../src/shared/music/melodiaPipeline/normalize.ts';
import type { NormalizedMelodiaExercise } from '../../src/shared/music/melodiaPipeline/types.ts';

function parseArgs(argv: string[]): {
  inputDir: string;
  outputDir: string;
  level: number;
  failOnError: boolean;
} {
  const rest = argv.slice(2).filter((a) => !a.startsWith('--'));
  const inputDir = rest[0];
  const outputDir = rest[1];
  if (!inputDir || !outputDir) {
    console.error('Usage: tsx scripts/melodia/ingest-folder.mts <inputDir> <outputDir> [--level=1] [--fail-on-error]');
    process.exit(2);
  }
  let level = 1;
  const levelArg = argv.find((a) => a.startsWith('--level='));
  if (levelArg) level = Math.max(1, parseInt(levelArg.split('=')[1] ?? '1', 10) || 1);
  const failOnError = argv.includes('--fail-on-error');
  return { inputDir, outputDir, level, failOnError };
}

function xmlFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => {
      const e = extname(f).toLowerCase();
      return e === '.xml' || e === '.musicxml';
    })
    .map((f) => join(dir, f));
}

function ingestFile(path: string, level: number): NormalizedMelodiaExercise {
  const raw = readFileSync(path, 'utf8');
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'text/xml');
  const score = parseMusicXmlFromDocument(doc as unknown as Document);
  const base = basename(path, extname(path)).replace(/[^\w-]+/g, '-');
  const id = `melodia-ingest-${base}`;
  return normalizePianoScore(score, { id, sourceFile: basename(path), melodiaLevel: level });
}

async function main(): Promise<void> {
  const { inputDir, outputDir, level, failOnError } = parseArgs(process.argv);
  mkdirSync(outputDir, { recursive: true });

  const files = xmlFiles(inputDir);
  const jsonlLines: string[] = [];
  const summaries: string[] = [];
  const flagCounts = new Map<string, number>();
  let errorCount = 0;

  for (const file of files) {
    let normalized: NormalizedMelodiaExercise;
    try {
      normalized = ingestFile(file, level);
    } catch (e) {
      errorCount += 1;
      const msg = e instanceof Error ? e.message : String(e);
      summaries.push(`- **${basename(file)}**: ERROR — ${msg}`);
      console.error(basename(file), msg);
      continue;
    }

    const outPath = join(outputDir, `${normalized.id}.json`);
    writeFileSync(outPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    jsonlLines.push(JSON.stringify(normalized));
    for (const f of normalized.validation_report) {
      flagCounts.set(f.code, (flagCounts.get(f.code) ?? 0) + 1);
    }
    const errs = normalized.validation_report.filter((f) => f.severity === 'error');
    if (errs.length) errorCount += 1;
    summaries.push(
      `- **${basename(file)}** → \`${basename(outPath)}\` — flags: ${normalized.validation_report.length} (${errs.length} error)`,
    );
  }

  writeFileSync(join(outputDir, 'corpus.jsonl'), `${jsonlLines.join('\n')}\n`, 'utf8');

  const flagSummary = [...flagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n');

  const report = `# Melodia ingest report

Input: \`${inputDir}\`
Output: \`${outputDir}\`
Melodia level: ${level}
Files processed: ${files.length}

## Per file

${summaries.join('\n')}

## Flag counts

| Code | Count |
|------|-------|
${flagSummary || '| (none) | 0 |'}

## Exit

${failOnError && errorCount ? `**${errorCount} file(s) or measures with errors** (\`--fail-on-error\`).` : 'OK'}
`;
  writeFileSync(join(outputDir, 'REPORT.md'), report, 'utf8');

  if (failOnError && errorCount > 0) {
    process.exit(1);
  }
}

void main();
