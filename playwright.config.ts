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
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
    ignoreHTTPSErrors: true,
    video: 'off',
    screenshot: 'off',
    trace: process.env.CI ? 'on-first-retry' : 'off',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'e2e',
      testIgnore: ['**/*.visual.spec.ts'],
    },
    {
      name: 'visual',
      testMatch: ['**/*.visual.spec.ts'],
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    ...(process.env.VISUAL_MULTI_BROWSER === 'true'
      ? [
        {
          name: 'visual-firefox',
          testMatch: ['**/*.visual.spec.ts'],
          use: {
            browserName: 'firefox' as const,
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1,
          },
        },
        {
          name: 'visual-webkit',
          testMatch: ['**/*.visual.spec.ts'],
          use: {
            browserName: 'webkit' as const,
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1,
          },
        },
      ]
      : []),
  ],
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  webServer: {
    command: 'vite --host --open=false --strictPort --port=5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 60_000,
  },
});


