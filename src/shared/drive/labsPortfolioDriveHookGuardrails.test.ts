import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Custom portfolio Drive hooks — document why factory is insufficient before adding here. */
const PORTFOLIO_DRIVE_HOOK_ALLOWLIST = new Set([
  'src/gesture/hooks/useGestureDriveBackup.ts', // pack upload + merge; not portfolio-json-only
  'src/stanza/hooks/useStanzaDriveBackup.ts', // custom media hydrate + row review (ADR 0020)
]);

const PORTFOLIO_DRIVE_HOOKS = [
  'src/gesture/hooks/useGestureDriveBackup.ts',
  'src/stanza/hooks/useStanzaDriveBackup.ts',
  'src/scales/hooks/useScalesDriveBackup.ts',
  'src/zinebox/hooks/useZineboxDriveBackup.ts',
  'src/lyrefly/hooks/useLyreflyDriveBackup.ts',
];

const FACTORY_IMPORT_RE = /createLabsPortfolioDriveBackup/;

describe('portfolio Drive hook guardrails', () => {
  it('portfolio apps use createLabsPortfolioDriveBackup or an explicit allowlist entry', () => {
    const violations: string[] = [];

    for (const rel of PORTFOLIO_DRIVE_HOOKS) {
      const abs = path.join(REPO_ROOT, rel);
      expect(fs.existsSync(abs), `${rel} missing`).toBe(true);
      if (PORTFOLIO_DRIVE_HOOK_ALLOWLIST.has(rel)) continue;

      const source = fs.readFileSync(abs, 'utf8');
      if (!FACTORY_IMPORT_RE.test(source)) {
        violations.push(
          `${rel} must use createLabsPortfolioDriveBackup (or add to PORTFOLIO_DRIVE_HOOK_ALLOWLIST with rationale)`,
        );
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
