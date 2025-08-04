import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/index.html',
    'src/cats/index.html',
    'src/zines/index.html',
    'src/404.html',
    'src/**/*.test.{ts,tsx}',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'public/**/*.js',
  ],
  ignore: [
    // Main entry points that appear unused but are loaded by HTML
    'src/cats/main.tsx',
    'src/zines/main.tsx',
    // Public scripts loaded by HTML files
    'public/scripts/analytics.js',
    'public/scripts/shared.js',
    // Test setup files
    'src/shared/test/setupTests.ts',
  ],
  ignoreDependencies: [
    // Dependencies used in HTML files or other non-TS contexts
  ],
  // Ignore exported types that are part of the public API or used in data structures
  ignoreExportsUsedInFile: {
    type: true, // Allow types to be exported even if only used in the same file
  },
  rules: {
    types: 'off', // Disable unused type checking as they're often part of public APIs
  },
  vite: {
    config: 'vite.config.ts',
  },
  // Ignore vitest setup file resolution 
  ignoreUnresolved: ['./shared/test/setupTests.ts'],
};

export default config;