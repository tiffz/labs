import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ignore agent-isolation worktrees **nested under this checkout** (`<root>/.claude/worktrees/...`),
 * which are full copies of the repo and would double-run every spec.
 *
 * Anchored to `configDir`, and a RegExp rather than a glob, for two separate reasons:
 *
 * 1. Playwright matches `testIgnore` against the ABSOLUTE file path, so the bare `**<slash>.claude/**`
 *    glob this replaces also matched every spec whenever the checkout itself lived under a
 *    `.claude/` directory — i.e. while working *inside* one of those worktrees, where it silently
 *    reduced the suite to "No tests found" and made the pre-push e2e gate unrunnable.
 * 2. A checkout path may contain glob metacharacters (this repo lives in
 *    `labs [second checkout]`, where `[...]` is a character class), so an anchored *glob* would
 *    silently fail to match and let the nested worktrees back in.
 */
const NESTED_AGENT_WORKTREES = new RegExp(
  `^${escapeRegExp(configDir + path.sep + '.claude' + path.sep)}`,
);

export default defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['./e2e/visual/visualLastRunReporter.ts'],
  ],
  // Discover tests in app folders (e.g., src/cats/e2e, src/zines/e2e, src/corp/e2e) and legacy root e2e/
  testDir: '.',
  testMatch: [
    'src/**/e2e/**/*.spec.ts',
    'e2e/**/*.spec.ts',
  ],
  testIgnore: [NESTED_AGENT_WORKTREES],
  timeout: 30_000,
  retries: 0,
  // Cap local parallelism to keep peak memory low. Playwright's default (~50% of
  // cores → 4 Chromium here) spikes RAM on a 16GB dev machine and can push it
  // into swap, slowing renders enough to flake the tail-end playback specs during
  // the pre-push. CI runners have dedicated RAM and keep the default for speed.
  // Override locally with LABS_E2E_WORKERS.
  workers: process.env.CI
    ? undefined
    : Number(process.env.LABS_E2E_WORKERS) || 2,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:5173',
    ignoreHTTPSErrors: true,
    video: 'off',
    // Capture a trace + screenshot on failure in CI. `on-first-retry` never
    // fired here because retries are 0, so CI e2e failures used to ship no
    // trace at all — the single biggest e2e triage tax. `retain-on-failure`
    // does not need retries and does not mask flakes.
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'e2e',
      testIgnore: ['**/*.visual.spec.ts', NESTED_AGENT_WORKTREES],
    },
    {
      name: 'visual',
      testMatch: ['**/*.visual.spec.ts'],
      // Font/glyph stabilization waits can take 15-22s each on cold CI; the
      // default 30s budget was routinely tight. Flakes still get fixed, not retried.
      timeout: 60_000,
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        timezoneId: 'UTC',
        reducedMotion: 'reduce',
      },
    },
    ...(process.env.VISUAL_MULTI_BROWSER === 'true'
      ? [
        {
          name: 'visual-firefox',
          testMatch: ['**/*.visual.spec.ts'],
          timeout: 60_000,
          use: {
            browserName: 'firefox' as const,
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1,
            timezoneId: 'UTC',
            reducedMotion: 'reduce' as const,
          },
        },
        {
          name: 'visual-webkit',
          testMatch: ['**/*.visual.spec.ts'],
          timeout: 60_000,
          use: {
            browserName: 'webkit' as const,
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1,
            timezoneId: 'UTC',
            reducedMotion: 'reduce' as const,
          },
        },
      ]
      : []),
  ],
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  // LABS_E2E_PREVIEW=1 serves a production build via `vite preview` instead of the
  // dev server (pre-compiled assets, closer to CI/prod). Run `npm run build` first.
  webServer: {
    command: process.env.LABS_E2E_PREVIEW
      ? 'vite preview --host 127.0.0.1 --strictPort --port=5173'
      : 'vite --open=false --strictPort --port=5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 60_000,
  },
});


