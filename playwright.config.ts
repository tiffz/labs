import { defineConfig } from '@playwright/test';

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
  // Never discover specs inside agent-isolation worktrees (harness copies of the
  // whole repo under .claude/worktrees/) — they would double-run and flake.
  testIgnore: ['**/.claude/**'],
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
      testIgnore: ['**/*.visual.spec.ts', '**/.claude/**'],
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
  webServer: {
    command: 'vite --open=false --strictPort --port=5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 60_000,
  },
});


