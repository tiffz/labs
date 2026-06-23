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
