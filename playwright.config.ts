import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
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
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 60_000,
  },
});


