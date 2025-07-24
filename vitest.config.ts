import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/cats/test/setupTests.ts',
    pool: 'vmThreads',
    testTimeout: 15000,
    // CI-friendly settings
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Retry flaky tests in CI
    retry: process.env.CI ? 2 : 0,
  },
}); 