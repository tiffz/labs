import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SLIDER_IMPORT = /import\s+Slider\s+from\s+['"]@mui\/material\/Slider['"]/;
const LOCAL_MIDI_TO_PITCH = /function\s+midiToPitch\s*\(/;
const CHORD_ADAPTER_IMPORT =
  /from\s+['"][^'"]*chords\/utils\/(chordTheory|chordVoicing)['"]/;

/**
 * App paths allowed to import raw MUI Slider (non-volume primitives or specialized UX).
 */
const SLIDER_ALLOWLIST_PREFIXES = [
  'shared/components/AppSlider.tsx',
  'shared/components/AppLinearVolumeSlider.tsx',
  'shared/components/AppCompactSlider.tsx',
  'sight/',
  'agility/',
];

function collectTsFiles(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
}

describe('shared UI reuse guardrails', () => {
  it('forbids raw MUI Slider imports outside the allowlist', () => {
    const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const files: string[] = [];
    collectTsFiles(srcRoot, files);

    const violations: string[] = [];

    for (const file of files) {
      const rel = path.relative(srcRoot, file).replaceAll(path.sep, '/');
      if (SLIDER_ALLOWLIST_PREFIXES.some((prefix) => rel.startsWith(prefix) || rel.endsWith(prefix))) {
        continue;
      }
      const text = fs.readFileSync(file, 'utf8');
      if (SLIDER_IMPORT.test(text)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });

  it('forbids local midiToPitch helpers outside shared (use scoreTypes)', () => {
    const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const files: string[] = [];
    collectTsFiles(srcRoot, files);
    const violations: string[] = [];

    for (const file of files) {
      const rel = path.relative(srcRoot, file).replaceAll(path.sep, '/');
      if (rel.startsWith('shared/')) continue;
      const text = fs.readFileSync(file, 'utf8');
      if (LOCAL_MIDI_TO_PITCH.test(text)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });

  it('forbids imports of removed chords adapter shims', () => {
    const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const files: string[] = [];
    collectTsFiles(srcRoot, files);
    const violations: string[] = [];

    for (const file of files) {
      const rel = path.relative(srcRoot, file).replaceAll(path.sep, '/');
      const text = fs.readFileSync(file, 'utf8');
      if (CHORD_ADAPTER_IMPORT.test(text)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });

});
