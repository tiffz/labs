import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * "Reference it if the user owns it, copy it if not" has exactly one owner:
 * `src/shared/drive/importDriveFile.ts` (ADR 0029).
 *
 * It used to live inline in Encore's performance editor, which read ownership from a shortcut row
 * and so stored pointers at friends' files. Every other paste-a-Drive-link path skipped the check.
 * A second copy of the rule is how that happens again, so this scan fails on one.
 *
 * The file set is derived from the tree, not listed, so a new module is covered by existing.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', '..');

const PRIMITIVE = 'shared/drive/importDriveFile.ts';

/** Who may do each thing, and why. Anything not named here must go through the primitive. */
const RULES = [
  {
    what: 'read Drive ownership (ownedByMe)',
    pattern: /\bownedByMe\b/,
    allowed: new Map([
      [PRIMITIVE, 'the one place that decides reference vs copy'],
      ['shared/drive/driveFetch.ts', 'declares the metadata field'],
    ]),
  },
  {
    what: 'copy a Drive file (copyDriveFileToMyDrive)',
    pattern: /\bcopyDriveFileToMyDrive\s*\(/,
    allowed: new Map([
      [PRIMITIVE, 'executes copy plans'],
      ['shared/drive/copyDriveFileToMyDrive.ts', 'defines it'],
    ]),
  },
  {
    what: 'call files.copy (driveCopyFile)',
    pattern: /\bdriveCopyFile\s*\(/,
    allowed: new Map([
      ['shared/drive/copyDriveFileToMyDrive.ts', 'server-side copy leg'],
      ['shared/drive/driveFetch.ts', 'defines it'],
    ]),
  },
] as const;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      out.push(...sourceFiles(abs));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      out.push(abs);
    }
  }
  return out;
}

/** Comments may explain the rule; only code can break it. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Generated files copy doc comments into string literals (the /ui/ catalog quotes this module's
 * JSDoc), so a mention there is documentation, not a second implementation.
 */
const GENERATED = /(^|\/)generated[A-Z][^/]*\.tsx?$/;

const files = sourceFiles(SRC)
  .filter((abs) => !GENERATED.test(abs))
  .map((abs) => ({
    rel: path.relative(SRC, abs).split(path.sep).join('/'),
    code: stripComments(fs.readFileSync(abs, 'utf8')),
  }));

describe('Drive file import has one owner', () => {
  it('scans the source tree', () => {
    expect(files.length).toBeGreaterThan(500);
    expect(files.some((f) => f.rel === PRIMITIVE)).toBe(true);
  });

  for (const rule of RULES) {
    it(`only named modules ${rule.what}`, () => {
      // A rename must break this test, not silently empty it.
      for (const rel of rule.allowed.keys()) {
        const file = files.find((f) => f.rel === rel);
        expect(file, `${rel} moved; update the allowlist`).toBeDefined();
        expect(
          rule.pattern.test(file!.code),
          `${rel} no longer matches; update the pattern`
        ).toBe(true);
      }
      const violations = files
        .filter((f) => !rule.allowed.has(f.rel) && rule.pattern.test(f.code))
        .map((f) => f.rel);
      expect(
        violations,
        `These modules ${rule.what} directly. Use planDriveFileImport / executeDriveFileImport from ${PRIMITIVE}.`
      ).toEqual([]);
    });
  }
});
