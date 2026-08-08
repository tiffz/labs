import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_PATTERN_REGISTRY,
  FORBIDDEN_REACTIVE_PATTERNS,
  WALL_CLOCK_FORBIDDEN_FILES,
} from './audioPatternRegistry';

describe('audioPatternRegistry', () => {
  it('registers all music apps with playback', () => {
    for (const app of ['count', 'midi', 'drums', 'words', 'piano', 'stanza', 'chords', 'encore']) {
      expect(AUDIO_PATTERN_REGISTRY[app], app).toBeDefined();
    }
  });

  it('records stanza as the media-slaved reactive poll it actually is', () => {
    // This assertion previously read 'look-ahead-precise' for both schedulers and
    // 'labs-audio-mix-bus' for the bus. Stanza uses NONE of those: the drum and metronome drivers
    // are media-slaved polls built on rAF/timers rather than `LookAheadAudioScheduler`, and there
    // is not a single `LabsAudioMixBus` usage under `src/stanza`. Because this file compares a
    // string literal in the registry to a string literal in the test, it certified the claim and
    // the divergence stayed invisible to CI while a cluster of audio bugs shipped.
    //
    // Keep this row TRUE. It is a description, not an aspiration — if Stanza migrates onto the
    // shared scheduler, change the code first and this row second. The behavioural protection for
    // the properties that actually matter lives in `backgroundPlaybackGuardrails.test.ts`.
    const stanza = AUDIO_PATTERN_REGISTRY.stanza!;
    expect(stanza.clock).toBe('media-timeline');
    expect(stanza.metronomeScheduler).toBe('reactive-poll');
    expect(stanza.drumScheduler).toBe('reactive-poll');
    expect(stanza.mixBus).toBe('legacy-local');
  });

  it('forbids reintroducing reactive Stanza metronome hook in app code', () => {
    const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const stanzaDir = path.join(srcRoot, 'stanza');
    const violations: string[] = [];

    function scan(dir: string): void {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (entry.name.includes('.test.')) continue;
        const text = fs.readFileSync(full, 'utf8');
        for (const forbidden of FORBIDDEN_REACTIVE_PATTERNS) {
          if (text.includes(forbidden)) {
            violations.push(`${path.relative(srcRoot, full)}: ${forbidden}`);
          }
        }
      }
    }

    scan(stanzaDir);
    expect(violations).toEqual([]);
  });

  it('keeps migrated transports off wall-clock note scheduling (setTimeout/setInterval)', () => {
    const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const violations: string[] = [];
    for (const { file, patterns } of WALL_CLOCK_FORBIDDEN_FILES) {
      const full = path.join(srcRoot, file);
      const text = fs.readFileSync(full, 'utf8');
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          violations.push(`${file}: ${pattern} — use LookAheadAudioScheduler, not a wall-clock note timer`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
