import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/index.html',
    'src/cats/index.html',
    'src/zines/index.html',
    'src/corp/index.html',
    'src/drums/index.html',
    'src/404.html',
    // Include TS entry points explicitly so transitive deps are tracked
    'src/cats/main.tsx',
    'src/zines/main.tsx',
    'src/corp/main.tsx',
    'src/drums/main.tsx',
    'src/corp/App.tsx',
    'src/**/*.test.{ts,tsx}',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'public/**/*.js',
  ],
  ignore: [
    // Public scripts loaded by HTML files
    'public/scripts/analytics.js',
    'public/scripts/shared.js',
    // Test setup files
    'src/shared/test/setupTests.ts',
    // Deprecated/parked UI & systems (kept for future work but not referenced)
    'src/cats/components/ui/CatFact.tsx',
    'src/cats/components/ui/NotificationQueue.tsx',
    'src/cats/hooks/useNotificationSystem.ts',
    'src/cats/data/notificationData.ts',
    'src/cats/services/CatPositionService.ts',
    // Legacy inline script references in corp index.html may reference constants shadowing TS exports
    'src/corp/index.html',
    // Parked legacy bootstrap kept for reference
    'src/corp/main.ts',
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
    exports: 'warn', // Allow some unused exports (e.g., tuning constants) without failing CI
  },
  vite: {
    config: 'vite.config.ts',
  },
  // Ignore vitest setup file resolution 
  ignoreUnresolved: ['./shared/test/setupTests.ts'],
};

export default config;