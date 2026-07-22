import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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

describe('tooling excludes .claude/worktrees from discovery', () => {
  it('ESLint flat config ignores .claude/worktrees', () => {
    expect(read('eslint.config.js')).toContain('.claude/worktrees/');
  });

  it('Playwright testIgnore excludes .claude worktrees (top-level and the e2e project)', () => {
    // testDir is '.', so without this Playwright discovers spec copies in worktrees.
    // Two occurrences required: top-level + the e2e project (which overrides top-level).
    const matches = read('playwright.config.ts').match(/\*\*\/\.claude\/\*\*/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
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
