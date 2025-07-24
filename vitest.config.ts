import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/cats/test/setupTests.ts',
    pool: 'vmThreads',
    testTimeout: 10000,
  },
}); 