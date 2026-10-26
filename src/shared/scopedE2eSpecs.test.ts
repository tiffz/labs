import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain .mjs script module, no types
import { SCOPED_SMOKE_EXCLUDE, derivedAppSmokeSpecs, scopedSpecsForApp } from '../../scripts/scopedE2eSpecs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * App smoke specs are derived from their names, so a new `e2e/smoke/<app>-*.spec.ts` runs on that
 * app's PRs without a list edit. The hand list had drifted: `drums-toolbar-consistency` and
 * `encore-originals-title-editing` existed but never ran on their app's PRs.
 */
describe('scoped e2e specs are derived from file names', () => {
  it('selects every <app>-*.spec.ts for its app', () => {
    const encore = derivedAppSmokeSpecs('encore', ROOT);
    expect(encore).toContain('e2e/smoke/encore-originals-title-editing.spec.ts');
    expect(encore).toContain('e2e/smoke/encore-originals-bulk-play.spec.ts');
    expect(derivedAppSmokeSpecs('drums', ROOT)).toContain('e2e/smoke/drums-toolbar-consistency.spec.ts');
    expect(derivedAppSmokeSpecs('stanza', ROOT)).toContain('e2e/smoke/stanza-library.spec.ts');
  });

  it('leaves out the named exclusions, and only those', () => {
    expect(derivedAppSmokeSpecs('encore', ROOT)).not.toContain('e2e/smoke/encore-typing-latency.spec.ts');
    for (const excluded of Object.keys(SCOPED_SMOKE_EXCLUDE)) {
      expect(readdirSync(path.join(ROOT, 'e2e/smoke')), `${excluded} no longer exists; remove it from the exclusions`).toContain(
        path.basename(excluded),
      );
    }
  });

  it('does not take another app\'s specs by prefix', () => {
    // Prefixes end at the hyphen: "count" must not pick up "counter-…".
    const root = mkdtempSync(path.join(tmpdir(), 'scoped-e2e-'));
    mkdirSync(path.join(root, 'e2e/smoke'), { recursive: true });
    for (const f of ['count-tap.spec.ts', 'counter-reset.spec.ts', 'count-notes.ts']) {
      writeFileSync(path.join(root, 'e2e/smoke', f), '');
    }
    expect(derivedAppSmokeSpecs('count', root)).toEqual(['e2e/smoke/count-tap.spec.ts']);
  });

  it('keeps explicit entries and does not duplicate a derived one', () => {
    const explicit = ['e2e/smoke/encore-originals-bulk-play.spec.ts', { file: 'e2e/smoke/app-shells.spec.ts', grep: '/encore/' }];
    const all = scopedSpecsForApp('encore', explicit, ROOT);
    expect(all.filter((e: unknown) => e === 'e2e/smoke/encore-originals-bulk-play.spec.ts')).toHaveLength(1);
    expect(all).toContainEqual({ file: 'e2e/smoke/app-shells.spec.ts', grep: '/encore/' });
  });
});
