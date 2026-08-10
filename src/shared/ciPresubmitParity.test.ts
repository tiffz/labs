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

  it('every exemption states a reason', () => {
    for (const [script, reason] of Object.entries(INTENTIONALLY_NOT_IN_PRESUBMIT)) {
      expect(reason.length, `${script} needs a real reason`).toBeGreaterThan(15);
    }
  });
});
