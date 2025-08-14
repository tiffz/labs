import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Discover tests in app folders (e.g., src/cats/e2e, src/zines/e2e, src/corp/e2e) and legacy root e2e/
  testDir: '.',
  testMatch: [
    'src/**/e2e/**/*.spec.ts',
    'e2e/**/*.spec.ts',
  ],
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
    ignoreHTTPSErrors: true,
    video: 'off',
    screenshot: 'off',
    trace: 'off',
  },
  webServer: {
    command: 'vite --host --open=false --strictPort --port=5173',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 60_000,
  },
});


