import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/index.html',
    'src/cats/index.html',
    'src/zines/index.html',
    'src/corp/index.html',
    'src/drums/index.html',
    'src/story/index.html',
    'src/chords/index.html',
    'src/forms/index.html',
    'src/beat/index.html',
    'src/404.html',
    // Include TS entry points explicitly so transitive deps are tracked
    'src/cats/main.tsx',
    'src/zines/main.tsx',
    'src/corp/main.tsx',
    'src/drums/main.tsx',
    'src/story/main.tsx',
    'src/chords/main.tsx',
    'src/forms/main.tsx',
    'src/beat/main.tsx',
    'src/corp/App.tsx',
    'src/**/*.test.{ts,tsx}',
    // CLI tools for beat finder analysis (run via npx tsx, not imported by app)
    'src/beat/tests/tempoAnalysisRunner.ts',
    'src/beat/utils/nodeAudio.ts',
    'scripts/analyze-tempo.ts',
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
    // Shared module barrel exports (may have unused exports that are part of public API)
    'src/shared/audio/index.ts',
    'src/shared/rhythm/index.ts',
    // Shared audio utilities (standalone metronome player for future use)
    'src/shared/audio/metronomePlayer.ts',
    'src/shared/audio/audioPlayer.ts',
    // Shared notation components
    'src/shared/notation/index.ts',
    'src/shared/notation/drumSymbols.ts',
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
    // Kimberly System: Content generation library with many unused exports (intentional API)
    'src/story/kimberly/**/*.ts',
    // Beat finder: deprecated exports kept for API compatibility
    'src/beat/utils/experimental/fermataDetector.ts',
    'src/beat/utils/experimental/tempoChangeDetector.ts',
    'src/beat/utils/audioBuffer.ts',
    'src/beat/utils/bpmAccuracyTest.ts',
    'src/beat/utils/tempoDetectorCore.ts',
  ],
  ignoreDependencies: [
    // Dependencies used in HTML files or other non-TS contexts
  ],
  // Ignore exported types that are part of the public API or used in data structures
  ignoreExportsUsedInFile: true,
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