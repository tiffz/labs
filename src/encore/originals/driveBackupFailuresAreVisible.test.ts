import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A Drive upload may never fail silently.
 *
 * Both take-upload paths used to end in `catch {}`. The take saved locally either way, so quota
 * exceeded, a revoked token, a zero-byte file and "you are offline" all looked exactly like
 * success — the row simply read "On this device", which is true, indistinguishable from being
 * signed out, and one lost laptop away from gone. This is the only failure class in the app that
 * cannot be undone, and it was the one with no error path at all.
 *
 * Derived rather than enumerated, deliberately. The last two guardrail gaps in this repo were both
 * hand-maintained lists that silently stopped covering the code that mattered: `check:ui-copy`
 * walked only `.tsx` while the copy lived in `.ts`, and the background-playback guard named two
 * drivers while the shared scheduler behind everything went unchecked. So this finds the upload
 * sites by looking for the upload calls, and a new one is enrolled by existing.
 */
const originalsDir = resolve(__dirname, '.');

/** Calls that write bytes to Drive. A file containing one is an upload path. */
const UPLOAD_CALL = /uploadOriginalTakeToDrive\s*\(|uploadWithDuplicateCheck\s*\(|driveUploadFileResumable\s*\(/;

/** `catch {` or `catch (e) {` whose body holds nothing but whitespace and comments. */
const SILENT_CATCH = /catch\s*(?:\([^)]*\))?\s*\{(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*\}/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__test__') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('Drive backup failures are visible', () => {
  const uploadPaths = walk(originalsDir).filter((f) => UPLOAD_CALL.test(readFileSync(f, 'utf8')));

  it('finds the upload paths it is meant to guard', () => {
    // Fails loudly if the upload helpers are renamed, rather than passing on an empty set.
    expect(uploadPaths.length, 'no Drive upload call sites found under originals/').toBeGreaterThan(
      0
    );
  });

  it.each(uploadPaths.map((f) => [f.slice(f.indexOf('src/')), f]))(
    '%s does not swallow a Drive error',
    (_label, file) => {
      const source = readFileSync(file as string, 'utf8');
      const silent = source.match(SILENT_CATCH) ?? [];
      expect(
        silent,
        `${_label} uploads to Drive and has a catch block with an empty body. A failed backup must ` +
          `reach the user: record it (useDriveBackupFailures) so the take shows why it is not ` +
          `backed up and can be retried. "Saved locally" is not "backed up".`
      ).toEqual([]);
    }
  );
});
