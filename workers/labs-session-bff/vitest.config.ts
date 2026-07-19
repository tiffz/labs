import { defineConfig } from 'vitest/config';

/**
 * Worker tests run in a plain Node environment (Workers runtime APIs like
 * WebCrypto exist in Node 20+). The repo-root vitest config has `root: 'src'`,
 * which silently skipped these files — run via `npm run test:session-bff`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
