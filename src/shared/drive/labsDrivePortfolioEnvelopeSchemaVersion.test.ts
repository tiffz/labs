import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Enumeration guard for the placeholder cloud-clobber class (Finding #23).
 *
 * `isLabsDrivePortfolioProgressPlaceholder` identifies the empty layout stub ONLY by its explicit
 * `_placeholder === true` flag — never by `schemaVersion`. For that invariant to hold, no app's real
 * envelope may ship `schemaVersion: 0`, because a 0 there once meant "empty stub" and any lingering
 * reader keyed on it would treat rich cloud data as empty and let the next push clobber it.
 *
 * This is a source scan rather than a `build*DriveEnvelope()` call because `src/shared/**` must not
 * import app code (import boundaries); the same fs-scan pattern is used by
 * `labsPortfolioDriveHookGuardrails.test.ts`. It asserts the integer literal each builder writes for
 * `schemaVersion` is >= 1.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Every portfolio app's Drive-envelope module (the file that defines `build*DriveEnvelope`). */
const APP_ENVELOPE_MODULES = [
  'src/gesture/drive/gestureDriveEnvelope.ts',
  'src/lyrefly/drive/lyreflyDriveEnvelope.ts',
  'src/scales/drive/scalesDriveEnvelope.ts',
  'src/stanza/drive/stanzaDriveEnvelope.ts',
  'src/zinebox/drive/zineboxDriveEnvelope.ts',
];

/** All `schemaVersion: <number>` literals a builder assigns into its returned envelope object. */
function schemaVersionLiterals(source: string): number[] {
  const out: number[] = [];
  const re = /schemaVersion:\s*(\d+)/g;
  let match: RegExpExecArray | null = null;
  while ((match = re.exec(source)) !== null) {
    out.push(Number(match[1]));
  }
  return out;
}

describe('portfolio Drive envelope schemaVersion invariant', () => {
  it('every app envelope module exists and assigns a schemaVersion literal', () => {
    for (const rel of APP_ENVELOPE_MODULES) {
      const abs = path.join(REPO_ROOT, rel);
      expect(fs.existsSync(abs), `${rel} missing`).toBe(true);
      const versions = schemaVersionLiterals(fs.readFileSync(abs, 'utf8'));
      expect(versions.length, `${rel}: no schemaVersion literal found`).toBeGreaterThan(0);
    }
  });

  it('no app envelope ships schemaVersion 0 (that number is reserved for the empty stub)', () => {
    const violations: string[] = [];
    for (const rel of APP_ENVELOPE_MODULES) {
      const source = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      for (const version of schemaVersionLiterals(source)) {
        if (!Number.isInteger(version) || version < 1) {
          violations.push(`${rel}: schemaVersion ${version} — must be >= 1`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
