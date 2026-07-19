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

  it('stanza uses media-timeline look-ahead patterns after platform migration', () => {
    const stanza = AUDIO_PATTERN_REGISTRY.stanza!;
    expect(stanza.clock).toBe('media-timeline');
    expect(stanza.metronomeScheduler).toBe('look-ahead-precise');
    expect(stanza.drumScheduler).toBe('look-ahead-precise');
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
