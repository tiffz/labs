import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

/**
 * Loaded at RUNTIME with a computed specifier so TypeScript does not pull `playwright.config.ts`
 * into the typechecked program — it is deliberately outside `tsconfig.app.json`, and importing it
 * statically surfaced unrelated pre-existing type debt. Vitest still resolves it through Vite, so
 * these assertions run against the real exported values, not text.
 */
type PlaywrightConfigShape = {
  testIgnore?: IgnoreEntry | IgnoreEntry[];
  projects?: Array<{ name?: string; testIgnore?: IgnoreEntry | IgnoreEntry[] }>;
};

async function loadPlaywrightConfig(): Promise<PlaywrightConfigShape> {
  // Vite serves modules over http:, so `import.meta.url` is not a filesystem URL here. Resolve
  // against the repo root instead and let Vitest transform the TS config.
  const specifier = resolve(root, 'playwright.config.ts');
  const mod = (await import(/* @vite-ignore */ specifier)) as { default: PlaywrightConfigShape };
  return mod.default;
}

describe('tooling excludes .claude/worktrees from discovery', () => {
  it('ESLint flat config ignores .claude/worktrees', () => {
    expect(read('eslint.config.js')).toContain('.claude/worktrees/');
  });

  it('Playwright testIgnore excludes nested worktree specs but keeps this checkout’s own', async () => {
    const playwrightConfig = await loadPlaywrightConfig();
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

describe('every way of starting a dev server agrees on the port', () => {
  /*
   * `scripts/labs-dev-port.mjs` decides which port a checkout owns — the main
   * checkout keeps 5173, every linked worktree derives its own — because
   * Playwright reuses an existing server outside CI, so a stray dev server from
   * ANOTHER checkout silently serves its code instead of yours. Root cause
   * class `stale-server-verification`.
   *
   * Playwright asked that module. `.husky/pre-push` asked it. `npm run dev` did
   * NOT, and bound 5173 from anywhere — which is the one entry point where it
   * matters most, because it is the one a person types. Starting a dev server
   * by hand in a worktree either collided with the main checkout or served this
   * branch's code on the port every other tool believes is the main checkout.
   *
   * So this asserts the answer is asked for, in every place that starts a
   * server, rather than asserting a number.
   */
  it('vite.config.ts takes its dev port from the shared resolver', () => {
    const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');
    expect(
      config,
      'vite.config.ts should import the port resolver rather than defaulting to 5173',
    ).toMatch(/from '\.\/scripts\/labs-dev-port\.mjs'/);
    expect(
      config,
      'server.port should come from resolveDevServerPort, so `npm run dev` binds the port ' +
        'this checkout owns',
    ).toMatch(/port:\s*resolveDevServerPort\(/);
    expect(
      config,
      'strictPort, so a collision fails loudly instead of sliding to the next port and ' +
        'leaving two checkouts one apart',
    ).toMatch(/strictPort:\s*true/);
  });

  it('the resolver gives a linked worktree its own port and the main checkout 5173', async () => {
    const { DEFAULT_DEV_PORT, resolveDevServerPort } = await import(
      '../../scripts/labs-dev-port.mjs'
    );

    /*
     * Behavioural, against real directories, because the resolver decides
     * main-vs-linked by whether `.git` is a directory or a `gitdir:` pointer
     * FILE. A made-up path has neither and silently reads as the main
     * checkout — which is how the first version of this test passed itself.
     */
    const tmp = mkdtempSync(join(tmpdir(), 'labs-dev-port-'));
    const mainCheckout = join(tmp, 'main');
    const linkedA = join(tmp, 'alpha');
    const linkedB = join(tmp, 'beta');
    mkdirSync(join(mainCheckout, '.git'), { recursive: true });
    mkdirSync(linkedA, { recursive: true });
    mkdirSync(linkedB, { recursive: true });
    writeFileSync(join(linkedA, '.git'), `gitdir: ${mainCheckout}/.git/worktrees/alpha\n`);
    writeFileSync(join(linkedB, '.git'), `gitdir: ${mainCheckout}/.git/worktrees/beta\n`);

    try {
      expect(resolveDevServerPort(mainCheckout, {}), 'the main checkout keeps 5173').toBe(
        DEFAULT_DEV_PORT,
      );

      const a = resolveDevServerPort(linkedA, {});
      const b = resolveDevServerPort(linkedB, {});
      expect(a, 'a linked worktree must not take the main checkout port').not.toBe(
        DEFAULT_DEV_PORT,
      );
      expect(b).not.toBe(DEFAULT_DEV_PORT);
      expect(a, 'two worktrees must not collide with each other').not.toBe(b);
      // Deterministic, so a worktree reuses its own server across runs rather
      // than stranding a fresh Vite on every invocation.
      expect(resolveDevServerPort(linkedA, {})).toBe(a);
      // An explicit override still wins, for CI and for pinning by hand.
      expect(resolveDevServerPort(linkedA, { LABS_E2E_PORT: '4321' })).toBe(4321);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
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
