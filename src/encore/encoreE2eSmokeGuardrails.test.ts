import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('Encore e2e smoke guardrails', () => {
  it('originals queue smokes use shared gotoEncoreOriginalsQueue helper', () => {
    const offenders: string[] = [];
    const smokeDir = path.join(REPO_ROOT, 'e2e', 'smoke');
    for (const file of fs.readdirSync(smokeDir)) {
      if (!file.endsWith('.spec.ts')) continue;
      const full = path.join(smokeDir, file);
      const source = fs.readFileSync(full, 'utf8');
      if (!source.includes('e2eOriginalsQueue=1')) continue;
      if (!source.includes('gotoEncoreOriginalsQueue')) {
        offenders.push(file);
      }
    }
    expect(offenders, 'Import e2e/helpers/encoreOriginalsQueue.ts for Dexie seed stability').toEqual([]);
  });

  it('EncoreMainShell documents keep-alive list tabs', () => {
    const shell = fs.readFileSync(
      path.join(REPO_ROOT, 'src', 'encore', 'components', 'EncoreMainShell.tsx'),
      'utf8',
    );
    expect(shell).toMatch(/listSectionVisited/);
    expect(shell).toMatch(/display:\s*none|display:\s*'none'/);
  });
});
