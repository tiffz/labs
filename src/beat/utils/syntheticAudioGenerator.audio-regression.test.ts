import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateSyntheticAudio, type SyntheticAudioConfig } from './syntheticAudioGenerator';
import {
  hashFloat32Pcm,
  loadHashManifest,
  saveHashManifest,
  type AudioHashManifest,
} from '../../shared/test/audioRegression';

const BASELINE_PATH = path.resolve(
  __dirname,
  '../regression/baselines/synthetic-audio.hashes.json'
);
const REPORT_PATH = path.resolve(
  __dirname,
  '../regression/reports/synthetic-audio.latest.json'
);

type Fixture = {
  id: string;
  config: SyntheticAudioConfig;
};

const FIXTURES: Fixture[] = [
  {
    id: 'click_70bpm_seed7001',
    config: { bpm: 70, duration: 16, type: 'click', seed: 7001 },
  },
  {
    id: 'drum_pattern_85bpm_seed8501',
    config: { bpm: 85, duration: 20, type: 'drumPattern', seed: 8501 },
  },
  {
    id: 'mixed_98bpm_seed9801',
    config: { bpm: 98, duration: 18, type: 'mixed', seed: 9801 },
  },
  {
    id: 'mixed_92bpm_humanized_seed9201',
    config: { bpm: 92, duration: 22, type: 'mixed', humanize: 0.4, seed: 9201 },
  },
  {
    id: 'drum_pattern_84bpm_noisy_seed8401',
    config: { bpm: 84, duration: 22, type: 'drumPattern', noiseLevel: 0.2, seed: 8401 },
  },
  {
    id: 'fractional_72_5bpm_seed72501',
    config: { bpm: 72.5, duration: 21, type: 'mixed', seed: 72501 },
  },
];

function renderHashes(): AudioHashManifest {
  return Object.fromEntries(
    FIXTURES.map(({ id, config }) => {
      const audio = generateSyntheticAudio(config);
      const hash = hashFloat32Pcm(audio.getChannelData(0));
      return [id, hash];
    })
  );
}

describe('Synthetic audio strict regression hashes', () => {
  it('matches committed hashes for all canonical fixtures', () => {
    const actual = renderHashes();
    const reportDir = path.dirname(REPORT_PATH);
    mkdirSync(reportDir, { recursive: true });

    if (process.env.UPDATE_AUDIO_BASELINES === 'true') {
      saveHashManifest(BASELINE_PATH, actual);
      writeFileSync(
        REPORT_PATH,
        `${JSON.stringify({ mode: 'update', updated: true, actual }, null, 2)}\n`,
        'utf-8'
      );
      return;
    }

    const expected = loadHashManifest(BASELINE_PATH);
    const driftMessages: string[] = [];

    for (const { id } of FIXTURES) {
      if (!expected[id]) {
        driftMessages.push(`[missing baseline] ${id}`);
        continue;
      }
      if (expected[id] !== actual[id]) {
        driftMessages.push(
          `[hash mismatch] ${id}\n  expected: ${expected[id]}\n  actual:   ${actual[id]}`
        );
      }
    }

    for (const expectedId of Object.keys(expected)) {
      if (!actual[expectedId]) {
        driftMessages.push(`[stale baseline id] ${expectedId}`);
      }
    }
    writeFileSync(
      REPORT_PATH,
      `${JSON.stringify(
        {
          mode: 'verify',
          expected,
          actual,
          drifts: driftMessages,
        },
        null,
        2
      )}\n`,
      'utf-8'
    );

    expect(
      driftMessages,
      `Audio regression drift detected.\n${driftMessages.join('\n')}\n\n` +
        'If these changes are intentional, run: npm run test:audio:regression:update'
    ).toHaveLength(0);
  });
});
