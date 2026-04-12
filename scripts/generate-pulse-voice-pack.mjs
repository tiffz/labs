#!/usr/bin/env node
/**
 * Pulse Voice Pack Generator
 *
 * Generates sample-accurate voice counting samples for the Pulse metronome
 * using macOS neural TTS (`say`) and ffmpeg post-processing.
 *
 * Uses phrase-context generation: each syllable is synthesized within a
 * comma-separated carrier phrase so the TTS engine produces consistent
 * prosody and timbre, then individual words are extracted via silence
 * detection at the comma pauses.
 *
 * Requirements: macOS with `say`, ffmpeg installed.
 *
 * Usage:
 *   node scripts/generate-pulse-voice-pack.mjs
 *   node scripts/generate-pulse-voice-pack.mjs --voice "Samantha"
 *   node scripts/generate-pulse-voice-pack.mjs --dry-run
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_VOICE = 'Samantha';
const SAMPLE_RATE = 48000;
const PEAK_DB = -3;
const FADE_OUT_MS = 20;
const SILENCE_THRESHOLD_DB = -40;

const SPEECH_RATE = 250;
const HIGH_PASS_FREQ = 200;
const LOUDNORM_I = -14;
const SUBDIV_MAX_DURATION_SEC = 0.15;

const SUBDIV_CATEGORIES = new Set(['eighth', 'sixteenth', 'triplet', 'takadimi']);


const OUTPUT_DIR = resolve(
  import.meta.dirname,
  '..',
  'public',
  'pulse',
  'voice',
);

const TEMP_DIR = join(OUTPUT_DIR, '.tmp');

// ---------------------------------------------------------------------------
// Phrase Groups
// ---------------------------------------------------------------------------

/**
 * Each group defines a comma-separated carrier phrase and which words to
 * extract. Commas force the TTS engine to insert clear pauses between words
 * while maintaining consistent voice quality across the phrase.
 */
const PHRASE_GROUPS = [
  {
    id: 'beats',
    words: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'],
    syllables: [
      { id: 'beat-1',  word: 0,  text: 'One',    category: 'beat' },
      { id: 'beat-2',  word: 1,  text: 'Two',    category: 'beat' },
      { id: 'beat-3',  word: 2,  text: 'Three',  category: 'beat' },
      { id: 'beat-4',  word: 3,  text: 'Four',   category: 'beat' },
      { id: 'beat-5',  word: 4,  text: 'Five',   category: 'beat' },
      { id: 'beat-6',  word: 5,  text: 'Six',    category: 'beat' },
      { id: 'beat-7',  word: 6,  text: 'Seven',  category: 'beat' },
      { id: 'beat-8',  word: 7,  text: 'Eight',  category: 'beat' },
      { id: 'beat-9',  word: 8,  text: 'Nine',   category: 'beat' },
      { id: 'beat-10', word: 9,  text: 'Ten',    category: 'beat' },
      { id: 'beat-11', word: 10, text: 'Eleven', category: 'beat' },
      { id: 'beat-12', word: 11, text: 'Twelve', category: 'beat' },
    ],
  },
  {
    id: 'counting',
    words: ['One', 'Ee', 'And', 'Uh', 'Two', 'Ee', 'And', 'Uh'],
    syllables: [
      { id: 'ee',  word: 1, text: 'ee',  category: 'sixteenth' },
      { id: 'and', word: 2, text: 'and', category: 'eighth' },
      { id: 'uh',  word: 3, text: 'uh',  category: 'sixteenth' },
    ],
  },
  {
    id: 'counting-ext',
    words: ['Ta', 'La', 'Ta', 'La'],
    syllables: [
      { id: 'la', word: 1, text: 'La', category: 'counting' },
    ],
  },
  {
    id: 'triplet',
    words: ['Ta', 'Ki', 'Da', 'Ta', 'Ki', 'Da'],
    syllables: [
      { id: 'ta', word: 0, text: 'Ta', category: 'triplet' },
      { id: 'ki', word: 1, text: 'Ki', category: 'triplet' },
      { id: 'da', word: 2, text: 'Da', category: 'triplet' },
    ],
  },
  {
    id: 'takadimi',
    words: ['Ta', 'Ka', 'Di', 'Mi', 'Ta', 'Ka', 'Di', 'Mi'],
    syllables: [
      { id: 'di', word: 2, text: 'Di', category: 'takadimi' },
      { id: 'mi', word: 3, text: 'Mi', category: 'takadimi' },
    ],
  },
  {
    id: 'takadimi-ka',
    words: ['Ki', 'Ka', 'Ki', 'Ka'],
    syllables: [
      { id: 'ka', word: 1, text: 'Ka', category: 'takadimi' },
    ],
  },
];

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const voiceIdx = args.indexOf('--voice');
const voice = voiceIdx !== -1 ? args[voiceIdx + 1] : DEFAULT_VOICE;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd) {
  if (dryRun) {
    console.log(`  [dry-run] ${cmd}`);
    return '';
  }
  return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function preflight() {
  try {
    execSync('which say', { stdio: 'pipe' });
  } catch {
    console.error('ERROR: macOS `say` command not found. This script requires macOS.');
    process.exit(1);
  }
  try {
    execSync('which ffmpeg', { stdio: 'pipe' });
  } catch {
    console.error('ERROR: ffmpeg not found. Install via: brew install ffmpeg');
    process.exit(1);
  }

  const voiceList = execSync('say --voice="?"', { encoding: 'utf-8' });
  if (!voiceList.includes(voice)) {
    console.error(`ERROR: Voice "${voice}" not found. Available voices:`);
    console.error(voiceList);
    console.error(
      '\nTo install more voices: System Settings > Accessibility > Spoken Content > System Voice > Manage Voices',
    );
    process.exit(1);
  }
}

function getWavDuration(filePath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: 'utf-8' },
  );
  return parseFloat(out.trim());
}

/**
 * Detect silence boundaries in an audio file to find word segments.
 * Commas in the TTS phrase create clear ~200ms pauses that are easy to detect.
 * Returns an array of { start, end } for each detected word.
 */
function detectWordBoundaries(wavPath, expectedWordCount) {
  const result = execSync(
    `ffmpeg -i "${wavPath}" -af "silencedetect=noise=-30dB:d=0.08" -f null /dev/null 2>&1`,
    { encoding: 'utf-8', shell: true },
  );

  const silenceStarts = [];
  const silenceEnds = [];

  for (const line of result.split('\n')) {
    const startMatch = line.match(/silence_start:\s*([\d.]+)/);
    if (startMatch) silenceStarts.push(parseFloat(startMatch[1]));

    const endMatch = line.match(/silence_end:\s*([\d.]+)/);
    if (endMatch) silenceEnds.push(parseFloat(endMatch[1]));
  }

  const totalDuration = getWavDuration(wavPath);
  const words = [];
  const silenceCount = Math.min(silenceStarts.length, silenceEnds.length);

  if (silenceCount >= expectedWordCount - 1) {
    let wordStart = 0;
    for (let i = 0; i < silenceCount; i++) {
      const wordEnd = silenceStarts[i];
      if (wordEnd > wordStart + 0.005) {
        words.push({ start: wordStart, end: wordEnd });
      }
      wordStart = silenceEnds[i];
    }
    if (wordStart < totalDuration - 0.01) {
      words.push({ start: wordStart, end: totalDuration });
    }
  }

  if (words.length === expectedWordCount) {
    return words;
  }

  // Fallback: uniform time-division
  console.log(`    (silence detection found ${words.length}/${silenceCount} words, expected ${expectedWordCount} — using uniform split)`);
  const segDuration = totalDuration / expectedWordCount;
  const uniform = [];
  for (let i = 0; i < expectedWordCount; i++) {
    uniform.push({ start: i * segDuration, end: (i + 1) * segDuration });
  }
  return uniform;
}

/**
 * Post-process a raw word segment into a final sample.
 * Uniform processing for all samples: high-pass, silence trim, optional
 * duration cap, loudnorm, fade-out.
 */
function postProcessSample(inputPath, outputPath, category) {
  const isSubdiv = SUBDIV_CATEGORIES.has(category);
  const fadeOutSec = FADE_OUT_MS / 1000;

  const cleanPath = outputPath.replace('.wav', '_clean.wav');
  const filterChain = [
    `highpass=f=${HIGH_PASS_FREQ}`,
    `silenceremove=start_periods=1:start_threshold=${SILENCE_THRESHOLD_DB}dB:start_silence=0`,
    'aresample=async=1',
  ].join(',');

  run(`ffmpeg -y -i "${inputPath}" -af "${filterChain}" -ar ${SAMPLE_RATE} -ac 1 "${cleanPath}"`);

  let duration = getWavDuration(cleanPath);

  if (isSubdiv && duration > SUBDIV_MAX_DURATION_SEC) {
    const trimmedPath = cleanPath.replace('_clean.wav', '_trimmed.wav');
    run(`ffmpeg -y -i "${cleanPath}" -af "atrim=end=${SUBDIV_MAX_DURATION_SEC}" -ar ${SAMPLE_RATE} -ac 1 "${trimmedPath}"`);
    run(`mv "${trimmedPath}" "${cleanPath}"`);
    duration = getWavDuration(cleanPath);
  }

  const fadeStart = Math.max(0, duration - fadeOutSec);
  const normFilter = [
    `loudnorm=I=${LOUDNORM_I}:TP=${PEAK_DB}:LRA=7`,
    `afade=t=out:st=${fadeStart.toFixed(4)}:d=${fadeOutSec}`,
  ].join(',');

  run(`ffmpeg -y -i "${cleanPath}" -af "${normFilter}" -ar ${SAMPLE_RATE} -ac 1 "${outputPath}"`);

  if (existsSync(cleanPath)) unlinkSync(cleanPath);

  return getWavDuration(outputPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Pulse Voice Pack Generator (phrase-context mode)');
  console.log(`  Voice:       ${voice}`);
  console.log(`  Sample rate: ${SAMPLE_RATE} Hz`);
  console.log(`  Speech rate: ${SPEECH_RATE} WPM`);
  console.log(`  High-pass:   ${HIGH_PASS_FREQ} Hz`);
  console.log(`  Loudnorm:    ${LOUDNORM_I} LUFS`);
  console.log(`  Peak:        ${PEAK_DB} dBFS`);
  console.log(`  Output:      ${OUTPUT_DIR}`);
  console.log(`  Dry run:     ${dryRun}`);
  console.log('');

  preflight();

  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(TEMP_DIR, { recursive: true });

  const manifest = { version: 1, voice, sampleRate: SAMPLE_RATE, samples: [] };

  for (const group of PHRASE_GROUPS) {
    const phrase = group.words.join(', ');
    console.log(`  Phrase group: "${group.id}" — "${phrase}"`);

    const phraseAiff = join(TEMP_DIR, `${group.id}_phrase.aiff`);
    const phraseWav = join(TEMP_DIR, `${group.id}_phrase.wav`);

    run(`say -v "${voice}" -r ${SPEECH_RATE} -o "${phraseAiff}" "${phrase}"`);

    if (dryRun) {
      for (const syl of group.syllables) {
        manifest.samples.push({
          id: syl.id, text: syl.text, category: syl.category,
          file: `${syl.id}.wav`, duration: 0,
        });
        console.log(`    ${syl.id.padEnd(10)} "${syl.text}" ... skipped`);
      }
      continue;
    }

    run(`ffmpeg -y -i "${phraseAiff}" -ar ${SAMPLE_RATE} -ac 1 "${phraseWav}"`);

    const wordCount = group.words.length;
    const boundaries = detectWordBoundaries(phraseWav, wordCount);

    for (const syl of group.syllables) {
      process.stdout.write(`    ${syl.id.padEnd(10)} "${syl.text}" (word ${syl.word}) ... `);

      const seg = boundaries[syl.word];
      if (!seg) {
        console.log('FAILED (no segment)');
        continue;
      }

      const padStart = Math.max(0, seg.start - 0.005);
      const padEnd = seg.end + 0.005;
      const rawPath = join(TEMP_DIR, `${syl.id}_raw.wav`);
      run(`ffmpeg -y -i "${phraseWav}" -af "atrim=start=${padStart.toFixed(4)}:end=${padEnd.toFixed(4)},asetpts=PTS-STARTPTS" -ar ${SAMPLE_RATE} -ac 1 "${rawPath}"`);

      const wavPath = join(OUTPUT_DIR, `${syl.id}.wav`);
      const duration = postProcessSample(rawPath, wavPath, syl.category);

      manifest.samples.push({
        id: syl.id,
        text: syl.text,
        category: syl.category,
        file: `${syl.id}.wav`,
        duration: Math.round(duration * 1000),
      });
      console.log(`${Math.round(duration * 1000)}ms`);
    }
  }

  // Write manifest
  const manifestPath = join(OUTPUT_DIR, 'manifest.json');
  if (!dryRun) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(`\n  Manifest: ${manifestPath}`);

  // Clean up temp
  if (!dryRun && existsSync(TEMP_DIR)) {
    for (const f of readdirSync(TEMP_DIR)) unlinkSync(join(TEMP_DIR, f));
    execSync(`rmdir "${TEMP_DIR}"`);
  }

  const totalSamples = PHRASE_GROUPS.reduce((s, g) => s + g.syllables.length, 0);
  console.log(`\nDone. ${totalSamples} samples generated.`);
}

main();
