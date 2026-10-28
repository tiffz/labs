import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CI_YML = path.join(REPO_ROOT, '.github/workflows/ci.yml');

describe('CI scoped check parity', () => {
  const ciYaml = fs.readFileSync(CI_YML, 'utf8');

  it('passes push parent SHA to scoped e2e (not bare run-scoped-e2e.mjs)', () => {
    expect(ciYaml).toMatch(/run-scoped-e2e\.mjs "\$\{\{ github\.event\.before \}\}"/);
  });

  it('passes PR base ref to scoped e2e', () => {
    expect(ciYaml).toMatch(
      /run-scoped-e2e\.mjs "origin\/\$\{\{ github\.base_ref \}\}"/,
    );
  });

  it('mirrors the same base-ref pattern for scoped Vitest', () => {
    expect(ciYaml).toMatch(/run-changed-app-tests\.mjs "\$\{\{ github\.event\.before \}\}"/);
    expect(ciYaml).toMatch(
      /run-changed-app-tests\.mjs "origin\/\$\{\{ github\.base_ref \}\}"/,
    );
  });
});

/**
 * An app-only PR runs Vitest for that app alone — in CI's scoped mode and in `test:changed-apps`,
 * which share `run-changed-app-tests.mjs`. Shared tests that scan app code must still run, or the
 * PR that breaks them merges green (#287: an unguarded Lyrefly Drive downloader slipped past
 * `sidecarBatchTolerance.test.ts`, which was not on the old hand-written list of three).
 */
describe('scoped Vitest always runs the repo-wide guards', () => {
  const SCRIPTS = path.join(REPO_ROOT, 'scripts');

  it('the runner takes its guard set from the derivation, not a list', () => {
    const runner = fs.readFileSync(path.join(SCRIPTS, 'run-changed-app-tests.mjs'), 'utf8');
    expect(runner).toMatch(/import \{ listRepoWideGuardTests \} from '\.\/repoWideGuardTests\.mjs'/);
    expect(runner).toMatch(/npx vitest run \$\{repoWideGuards\.join\(' '\)\}/);
  });

  it('enrols every shared test that reads source off disk', async () => {
    const { listRepoWideGuardTests } = await import('../../scripts/repoWideGuardTests.mjs');
    const guards = listRepoWideGuardTests(REPO_ROOT);

    // Named anchors: the guard that #287 slipped past, and the three the old list held.
    expect(guards).toEqual(
      expect.arrayContaining([
        'src/shared/drive/sidecarBatchTolerance.test.ts',
        'src/shared/componentSizeGuardrails.test.ts',
        'src/shared/sharedModuleCycles.test.ts',
        'src/shared/importBoundaries.test.ts',
      ]),
    );

    // Independent of the derivation's own regex: any shared test that calls a file-reading API.
    const readers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.test\.tsx?$/.test(entry.name)) {
          const rel = path.relative(REPO_ROOT, full).split(path.sep).join('/');
          if (/(regression|audit|stress|benchmark|integration)/i.test(entry.name)) continue;
          if (/\b(readdirSync|readFileSync|globSync|readdir|readFile)\(|import\.meta\.glob/.test(fs.readFileSync(full, 'utf8'))) {
            readers.push(rel);
          }
        }
      }
    };
    walk(path.join(REPO_ROOT, 'src/shared'));
    expect(readers.length).toBeGreaterThan(10);
    expect(readers.filter((rel) => !guards.includes(rel))).toEqual([]);
  });
});
