import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import playwrightConfig from '../../playwright.config';

/**
 * Guardrails for test-tooling config that broke pushes in the 2026-07 session and
 * must not silently regress:
 *
 *  1. Agent-isolation worktrees (`.claude/worktrees/<id>/`, full repo copies) must
 *     be excluded from every repo-globbing tool — ESLint (`eslint .`), Playwright
 *     (`testDir: '.'`), Vitest — or they recurse into the copies and blow up on
 *     unresolved plugins / double-run specs.
 *  2. Local Playwright + Vitest parallelism is capped so the pre-push suite does
 *     not exhaust RAM on a dev machine and flake the render-sensitive specs. CI is
 *     intentionally uncapped (dedicated RAM), so the caps are `!CI`-gated.
 *
 * Text assertions (not config imports) so they are robust to ESM/CJS and the
 * conditional CI branches inside the configs.
 */
const root = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

type IgnoreEntry = string | RegExp;

function toArray(value: unknown): IgnoreEntry[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]) as IgnoreEntry[];
}

/**
 * Minimal glob matcher — enough for the patterns Playwright configs actually use (`**`, `*`, `?`).
 * Inlined rather than pulling in `minimatch`, which is only a transitive dependency here.
 */
function globToRegExp(glob: string): RegExp {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i]!;
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1; // `**/` also matches zero directories
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') out += '[^/]';
    else out += ch.replace(/[.+^${}()|[\]\\]/, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

/** Playwright matches `testIgnore` against the absolute file path. */
function matchesAny(entries: IgnoreEntry[], absolutePath: string): boolean {
  return entries.some((entry) =>
    entry instanceof RegExp ? entry.test(absolutePath) : globToRegExp(entry).test(absolutePath),
  );
}

describe('tooling excludes .claude/worktrees from discovery', () => {
  it('ESLint flat config ignores .claude/worktrees', () => {
    expect(read('eslint.config.js')).toContain('.claude/worktrees/');
  });

  it('Playwright testIgnore excludes nested worktree specs but keeps this checkout’s own', () => {
    // Behavioural, not a string match. The previous version asserted the literal `**/.claude/**`
    // appeared twice — which is exactly the pattern that broke: matched against the ABSOLUTE path,
    // it also excluded every spec whenever the checkout itself lived under `.claude/` (i.e. while
    // working inside an agent worktree), silently reducing the suite to "No tests found". A string
    // assertion cannot tell those two cases apart; matching real paths can.
    const ignores = [
      ...toArray(playwrightConfig.testIgnore),
      ...toArray(playwrightConfig.projects?.find((p) => p.name === 'e2e')?.testIgnore),
    ];
    expect(ignores.length).toBeGreaterThanOrEqual(2);

    const nestedWorktreeSpec = resolve(root, '.claude/worktrees/agent-x/e2e/smoke/app-shells.spec.ts');
    const ownSpec = resolve(root, 'e2e/smoke/app-shells.spec.ts');

    expect(matchesAny(ignores, nestedWorktreeSpec)).toBe(true);
    expect(matchesAny(ignores, ownSpec)).toBe(false);
  });

  it('Vitest exclude drops .claude worktrees', () => {
    expect(read('vite.config.ts')).toContain("'.claude/**'");
  });

  it('.claude/worktrees is gitignored so it can never be committed', () => {
    expect(read('.gitignore')).toMatch(/\.claude\/worktrees/);
  });
});

describe('local test parallelism is capped to bound pre-push memory', () => {
  it('Playwright caps local workers (CI keeps the default)', () => {
    const cfg = read('playwright.config.ts');
    // Must gate on CI and cap locally, or a 16GB dev machine swaps during the e2e run.
    expect(cfg).toMatch(/workers:\s*process\.env\.CI/);
    expect(cfg).toContain('LABS_E2E_WORKERS');
  });

  it('Vitest caps local maxWorkers (CI keeps 6)', () => {
    const cfg = read('vite.config.ts');
    expect(cfg).toMatch(/maxWorkers:\s*process\.env\.CI\s*\?\s*6/);
    expect(cfg).toContain('LABS_VITEST_WORKERS');
  });
});
