import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/index.html',
    'src/cats/index.html',
    'src/zines/index.html',
    'src/drums/index.html',
    'src/story/index.html',
    'src/chords/index.html',
    'src/forms/index.html',
    'src/beat/index.html',
    'src/piano/index.html',
    'src/scales/index.html',
    'src/melodia/index.html',
    'src/agility/index.html',
    'src/encore/index.html',
    'src/pitch/index.html',
    'src/count/index.html',
    'src/words/index.html',
    'src/ui/index.html',
    'src/drums/universal_tom/index.html',
    'src/404.html',
    // Include TS entry points explicitly so transitive deps are tracked
    'src/cats/main.tsx',
    'src/zines/main.tsx',
    'src/corp/main.tsx',
    'src/drums/main.tsx',
    'src/drums/universal_tom/main.tsx',
    'src/story/main.tsx',
    'src/chords/main.tsx',
    'src/forms/main.tsx',
    'src/beat/main.tsx',
    'src/piano/main.tsx',
    'src/scales/main.tsx',
    'src/melodia/main.tsx',
    'src/pitch/main.tsx',
    'src/count/main.tsx',
    'src/words/main.tsx',
    'src/agility/main.tsx',
    'src/encore/main.tsx',
    'src/ui/main.tsx',
    'src/corp/App.tsx',
    'src/**/*.test.{ts,tsx}',
    // CLI tools for beat finder analysis (run via npx tsx, not imported by app)
    'src/beat/tests/tempoAnalysisRunner.ts',
    'src/beat/utils/nodeAudio.ts',
    'scripts/analyze-tempo.ts',
    'scripts/melodia/ingest-folder.mts',
    'scripts/audit-pipeline.js',
    // Story app: loaded only via import() in App.tsx; treat as entries so Knip does not flag exports.
    'src/story/components/BeatChart.tsx',
    'src/story/components/FixedStoryHeader.tsx',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'public/**/*.js',
  ],
  ignore: [
    // Public scripts loaded by HTML files
    'public/scripts/analytics.js',
    'public/scripts/shared.js',
    // Kill-switch service worker deployed to purge stale vite-plugin-pwa SWs
    'public/sw.js',
    // Test setup files and utilities
    'src/shared/test/setupTests.ts',
    // Shared test mocks (imported on demand by new tests; Phase 1 scaffold)
    'src/shared/test/mocks/**',
    // Shared module barrel exports (may have unused exports that are part of public API)
    'src/shared/audio/index.ts',
    // Shared audio utilities (standalone metronome player for future use)
    'src/shared/audio/audioPlayer.ts',
    // Shared notation components
    'src/shared/notation/index.ts',
    'src/shared/notation/drumSymbols.ts',
    // Deprecated/parked UI & systems (kept for future work but not referenced)
    'src/cats/components/ui/CatFact.tsx',
    'src/cats/components/ui/NotificationQueue.tsx',
    'src/cats/hooks/useNotificationSystem.ts',
    'src/cats/data/notificationData.ts',
    // Parked legacy bootstrap kept for reference
    'src/corp/main.ts',
    // Kimberly System: Content generation library with many unused exports (intentional API)
    'src/story/kimberly/**/*.ts',
    // Beat finder: deprecated exports kept for API compatibility
    'src/beat/utils/experimental/fermataDetector.ts',
    'src/beat/utils/experimental/tempoChangeDetector.ts',
    'src/beat/utils/audioBuffer.ts',
    'src/beat/utils/bpmAccuracyTest.ts',
    // Count Me In: analysis/coaching features parked for future development
    'src/count/analysis/RhythmAnalyzer.ts',
    'src/count/analysis/timingAnalysis.ts',
    'src/count/components/QuietCount.tsx',
    'src/count/components/TimingGauge.tsx',
    'src/count/components/VocalFatigueGuard.tsx',
    'src/count/hooks/useRhythmAnalyzer.ts',
    // CI False Positives (Exports used in future/debugging or tests but flagged)
    'src/beat/utils/sectionalTempoAnalyzer.ts', // default export used in CLI/tests
    'src/zines/utils/imageProcessor.ts', // processFiles used in specialized flows
    'src/zines/utils/pdfGenerator.ts', // getCompressionDescription, downloadPDF
    'src/zines/utils/spreadOrganizer.ts', // estimateDPI, etc. helper utils
  ],
  ignoreDependencies: [
    // Spawned from scripts/audit-pipeline.js (not part of the import graph)
    'jscpd',
    'code-auditor-mcp',
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