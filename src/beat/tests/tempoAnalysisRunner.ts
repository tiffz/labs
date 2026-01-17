/**
 * Tempo analysis runner for real audio fixtures.
 *
 * Usage:
 *   npx tsx src/beat/tests/tempoAnalysisRunner.ts public/.hidden/test-config.json
 *   npx tsx src/beat/tests/tempoAnalysisRunner.ts public/.hidden/test-config.json --id wish-my-life-away
 *   npx tsx src/beat/tests/tempoAnalysisRunner.ts public/.hidden/test-config.json --name "Let It Go"
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeBeat } from '../utils/beatAnalyzer';
import { analyzeChords } from '../utils/chordAnalyzer';
import { extractAudioBuffer, findMediaFile, isFFmpegAvailable } from '../utils/nodeAudio';

interface TestConfig {
  testCases: Array<{
    id: string;
    name: string;
    filepath: string;
    expected?: {
      bpm?: number;
      bpmTolerance?: number;
      key?: string;
      scale?: string;
      tempoVariance?: {
        hasFermata?: boolean;
        fermataLocations?: Array<{
          measure?: number;
          beat?: number;
          approximateTime?: number;
          description?: string;
        }>;
      };
    };
  }>;
}

function loadConfig(configPath: string): TestConfig {
  const fullPath = path.resolve(configPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config not found: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw) as TestConfig;
}

function formatResultLine(label: string, value: string): string {
  return `  ${label.padEnd(16)}${value}`;
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const configPath = args[0] ?? 'public/.hidden/test-config.json';
  const idFilterIndex = args.findIndex((arg) => arg === '--id');
  const nameFilterIndex = args.findIndex((arg) => arg === '--name');
  const idFilter = idFilterIndex >= 0 ? args[idFilterIndex + 1] : null;
  const nameFilter = nameFilterIndex >= 0 ? args[nameFilterIndex + 1] : null;
  const config = loadConfig(configPath);

  if (!isFFmpegAvailable()) {
    throw new Error('ffmpeg is required. Please install ffmpeg and retry.');
  }

  for (const testCase of config.testCases) {
    if (idFilter && testCase.id !== idFilter) {
      continue;
    }
    if (nameFilter && !testCase.name.toLowerCase().includes(nameFilter.toLowerCase())) {
      continue;
    }

    const resolvedPath = findMediaFile(testCase.filepath);
    if (!resolvedPath) {
      console.warn(`Skipping ${testCase.id}: file not found (${testCase.filepath})`);
      continue;
    }

    console.log(`\n=== ${testCase.name} ===`);
    const audioBuffer = await extractAudioBuffer(resolvedPath);
    const result = await analyzeBeat(audioBuffer as unknown as AudioBuffer);

    const fermatas = result.tempoRegions?.filter(r => r.type === 'fermata') ?? [];
    const fermataCount = fermatas.length;
    console.log(formatResultLine('Detected BPM:', result.bpm.toFixed(2)));
    console.log(formatResultLine('Confidence:', (result.confidence * 100).toFixed(1) + '%'));
    console.log(formatResultLine('Music start:', result.musicStartTime.toFixed(2) + 's'));
    console.log(formatResultLine('Music end:', result.musicEndTime.toFixed(2) + 's'));
    console.log(formatResultLine('Track duration:', audioBuffer.duration.toFixed(2) + 's'));
    console.log(formatResultLine('Fermatas:', `${fermataCount}`));
    if (fermatas.length > 0) {
      const fermataTimes = fermatas
        .map((region) => `${region.startTime.toFixed(2)}s→${region.endTime.toFixed(2)}s`)
        .join(', ');
      console.log(formatResultLine('Fermata times:', fermataTimes));
    }

    // Run chord/key analysis
    try {
      const chordResult = await analyzeChords(audioBuffer as unknown as AudioBuffer, result.beats);
      const keyDisplay = `${chordResult.key} ${chordResult.scale}`;
      console.log(formatResultLine('Detected Key:', keyDisplay));
      console.log(formatResultLine('Key Confidence:', (chordResult.keyConfidence * 100).toFixed(0) + '%'));
      
      // Check key expectation
      const expectedKey = testCase.expected?.key;
      const expectedScale = testCase.expected?.scale;
      if (expectedKey && expectedScale) {
        const keyMatches = chordResult.key === expectedKey && chordResult.scale === expectedScale;
        // Also check enharmonic equivalents (C# = Db, etc.)
        const enharmonics: Record<string, string> = {
          'C#': 'Db', 'Db': 'C#', 'D#': 'Eb', 'Eb': 'D#',
          'F#': 'Gb', 'Gb': 'F#', 'G#': 'Ab', 'Ab': 'G#', 'A#': 'Bb', 'Bb': 'A#',
        };
        const enharmonicMatch = chordResult.scale === expectedScale && 
          enharmonics[chordResult.key] === expectedKey;
        const pass = keyMatches || enharmonicMatch;
        console.log(formatResultLine('Key check:', `${pass ? 'PASS' : 'FAIL'} (expected ${expectedKey} ${expectedScale})`));
      }
    } catch (err) {
      console.log(formatResultLine('Key detection:', 'FAILED - ' + (err instanceof Error ? err.message : 'Unknown error')));
    }

    const expectedBpm = testCase.expected?.bpm;
    const tolerance = testCase.expected?.bpmTolerance ?? 0;
    if (expectedBpm !== undefined && tolerance > 0) {
      const delta = Math.abs(result.bpm - expectedBpm);
      const pass = delta <= tolerance;
      console.log(formatResultLine('BPM check:', `${pass ? 'PASS' : 'FAIL'} (±${tolerance}, Δ=${delta.toFixed(2)})`));
    }

    const expectedFermata = testCase.expected?.tempoVariance?.hasFermata;
    if (expectedFermata === true) {
      console.log(formatResultLine('Fermata check:', fermataCount > 0 ? 'PASS' : 'FAIL'));
    } else if (expectedFermata === false) {
      console.log(formatResultLine('Fermata check:', fermataCount === 0 ? 'PASS' : 'FAIL'));
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
