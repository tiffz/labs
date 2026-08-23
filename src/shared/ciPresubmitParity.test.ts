import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every blocking CI check must also run in `presubmit`.
 *
 * When it does not, the loop is: run presubmit, see green, push, wait ~10 minutes, and only then
 * discover a gate you never had the chance to see. `check:react-hooks-ratchet` and
 * `check:agent-guidance` both drifted out of presubmit this way and turned CI red on `main` and
 * `dev-integration` for many consecutive runs. Adding them back cost 7 seconds of presubmit time.
 *
 * This is the machine check that replaces "remember to keep them in sync". Adding a new blocking
 * job to `ci.yml` without a presubmit counterpart now fails here, locally, in milliseconds.
 *
 * Scope: `npm run` invocations in CI's fast static-analysis jobs. Heavyweight stages (build, full
 * Vitest, full e2e, visual) are deliberately excluded — presubmit runs scoped equivalents by
 * design (see `docs/CI_PATH_SCOPING.md`), and forcing the full versions locally is the thing that
 * makes people skip presubmit entirely.
 */

const root = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

/**
 * Scripts CI runs that presubmit intentionally covers differently or not at all.
 * Every entry needs a reason — an unexplained entry here is how the gap reopens.
 */
const INTENTIONALLY_NOT_IN_PRESUBMIT: Record<string, string> = {
  // Generators, not gates: presubmit verifies freshness via check:shared-catalog instead.
  'generate:shared-catalog': 'generator; presubmit asserts freshness with check:shared-catalog',
  // Heavy stages presubmit runs in scoped form.
  build: 'presubmit runs the production build as its own stage',
  typecheck: 'run by presubmit under a different label',
  lint: 'run by presubmit under a different label',
  knip: 'run by presubmit under a different label',
};

/**
 * Gates presubmit runs that CI deliberately does not. Same contract as the map above: an
 * unexplained entry is how the gap reopens.
 */
const INTENTIONALLY_NOT_IN_CI: Record<string, string> = {
  // Nothing yet. When this map gains an entry, the reason must say why a developer skipping
  // presubmit is allowed to bypass that gate entirely.
};

function ciScripts(): Set<string> {
  const yml = read('.github/workflows/ci.yml');
  const found = new Set<string>();
  for (const m of yml.matchAll(/run:\s*npm run ([a-zA-Z0-9:_-]+)/g)) {
    found.add(m[1]);
  }
  return found;
}

function presubmitScripts(): Set<string> {
  // presubmit-parallel.mjs is the static-check list; the sequential/timing wrappers call into it.
  const sources = ['scripts/presubmit-parallel.mjs', 'scripts/presubmit.sh'];
  const found = new Set<string>();
  for (const rel of sources) {
    let text: string;
    try {
      text = read(rel);
    } catch {
      continue;
    }
    for (const m of text.matchAll(/['"]([a-zA-Z0-9:_-]+)['"]/g)) found.add(m[1]);
  }
  return found;
}

describe('CI / presubmit parity', () => {
  it('every npm script CI runs is also reachable from presubmit', () => {
    const ci = ciScripts();
    const pre = presubmitScripts();

    const missing = [...ci]
      .filter((s) => s.startsWith('check:') || s.startsWith('generate:') || s.startsWith('muscle:'))
      .filter((s) => !pre.has(s))
      .filter((s) => !(s in INTENTIONALLY_NOT_IN_PRESUBMIT));

    expect(
      missing,
      'Blocking CI checks with no presubmit counterpart. Add them to scripts/presubmit-parallel.mjs, ' +
        'or record why not in INTENTIONALLY_NOT_IN_PRESUBMIT with a reason.',
    ).toEqual([]);
  });

  it('the two gates that actually drifted are present', () => {
    // Named explicitly so a future refactor of the parsing above cannot silently pass while these
    // are absent. These are the ones that turned CI red.
    const pre = presubmitScripts();
    expect(pre.has('check:react-hooks-ratchet')).toBe(true);
    expect(pre.has('check:agent-guidance')).toBe(true);
  });

  /**
   * The other direction, which went unchecked for months and hid a real gap.
   *
   * Parity was only ever asserted CI → presubmit, so a gate could live in presubmit and never run
   * in CI. That is what happened to the full typecheck: CI ran `typecheck` (tsconfig.app.json,
   * which excludes *.test.ts, *.spec.*, e2e/** and audits/**) while the full-config compile ran
   * only in presubmit, on a laptop. A type error in any test file therefore could not fail CI —
   * and five of them reached a push before anyone noticed.
   *
   * A one-directional parity check is the `guardrail-coverage-gap` class applied to CI itself: it
   * was green the whole time, and it read as proof the two were in sync.
   */
  it('every gate presubmit enforces also runs in CI', () => {
    const ci = ciScripts();
    const pre = presubmitScripts();

    // Only the static gates; presubmit's scoped test/build stages have CI equivalents under
    // different names by design (docs/CI_PATH_SCOPING.md).
    const presubmitOnly = [...pre]
      .filter((s) => s.startsWith('check:'))
      .filter((s) => !ci.has(s))
      .filter((s) => !(s in INTENTIONALLY_NOT_IN_CI));

    expect(
      presubmitOnly,
      'Gates that run in presubmit but not in CI. A developer who skips presubmit bypasses these ' +
        'entirely, and CI reports green. Add them to .github/workflows/ci.yml, or record why not ' +
        'in INTENTIONALLY_NOT_IN_CI with a reason.',
    ).toEqual([]);
  });

  it('CI typechecks test files, not just app sources', () => {
    // The specific regression above, pinned. tsconfig.app.json excludes tests; if CI ever drops
    // back to the app-only config, a broken test file stops being a CI failure.
    const yml = read('.github/workflows/ci.yml');
    expect(
      yml.includes('npm run typecheck:full'),
      'CI must run typecheck:full (tsconfig.json). tsconfig.app.json excludes *.test.ts, ' +
        '*.spec.*, e2e/** and audits/**, so an app-only typecheck cannot fail on a test-file ' +
        'type error.',
    ).toBe(true);
  });

  it('every exemption states a reason', () => {
    for (const [script, reason] of Object.entries(INTENTIONALLY_NOT_IN_PRESUBMIT)) {
      expect(reason.length, `${script} needs a real reason`).toBeGreaterThan(15);
    }
  });
});
