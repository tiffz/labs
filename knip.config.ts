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
    'src/piano/index.html',
    'src/scales/index.html',
    'src/melodia/index.html',
    'src/agility/index.html',
    'src/encore/index.html',
    'src/stanza/index.html',
    'src/sight/index.html',
    'src/gesture/index.html',
    'src/zinebox/index.html',
    'src/muscle/index.html',
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
    'src/piano/main.tsx',
    'src/scales/main.tsx',
    'src/melodia/main.tsx',
    'src/pitch/main.tsx',
    'src/count/main.tsx',
    'src/words/main.tsx',
    'src/agility/main.tsx',
    'src/encore/main.tsx',
    'src/stanza/main.tsx',
    'src/sight/main.tsx',
    'src/gesture/main.tsx',
    'src/zinebox/main.tsx',
    'src/muscle/main.tsx',
    'src/ui/main.tsx',
    'src/corp/App.tsx',
    'src/**/*.test.{ts,tsx}',
    // CLI tools for beat finder analysis (run via npx tsx, not imported by app)
    'src/shared/beat/regression/tempoAnalysisRunner.ts',
    'src/shared/beat/regression/nodeAudio.ts',
    'scripts/analyze-tempo.ts',
    'scripts/melodia/ingest-folder.mts',
    'scripts/audit-pipeline.js',
    // Muscle Memory asset export CLIs (not imported by app bundle)
    'scripts/export-muscle-procedural-glbs.mjs',
    'scripts/export-muscle-z-anatomy-glbs.mjs',
    'scripts/sync-muscle-z-anatomy-bridge.mjs',
    // Story app: loaded only via import() in App.tsx; treat as entries so Knip does not flag exports.
    'src/story/components/BeatChart.tsx',
    'src/story/components/FixedStoryHeader.tsx',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'public/**/*.js',
  ],
  ignore: [
    // Each entry must have a // comment on the line above (enforced by check:knip-config).
    // Public scripts loaded by HTML files
    'public/scripts/analytics.js',
    // Shared homepage script (loaded by index.html, not bundled)
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
    // Drum symbol map exported for future notation hosts
    'src/shared/notation/drumSymbols.ts',
    // Deprecated/parked UI & systems (kept for future work but not referenced)
    'src/cats/components/ui/CatFact.tsx',
    // Parked notification queue UI (not wired in current Cats build)
    'src/cats/components/ui/NotificationQueue.tsx',
    // Parked notification hook (paired with NotificationQueue)
    'src/cats/hooks/useNotificationSystem.ts',
    // Parked notification seed data
    'src/cats/data/notificationData.ts',
    // Starter templates (copied into new apps; not imported by the build)
    'src/shared/templates/**',
    // Parked legacy bootstrap kept for reference
    'src/corp/main.ts',
    // Kimberly System: Content generation library with many unused exports (intentional API)
    'src/story/kimberly/**/*.ts',
    // Beat finder: deprecated exports kept for API compatibility (shared implementation)
    'src/shared/beat/experimental/fermataDetector.ts',
    // Experimental tempo-change detector (parked)
    'src/shared/beat/experimental/tempoChangeDetector.ts',
    // Node audio buffer helper for regression CLI only
    'src/shared/beat/regression/audioBuffer.ts',
    // BPM accuracy harness (manual benchmark)
    'src/shared/beat/bpmAccuracyTest.ts',
    // Count Me In: analysis/coaching features parked for future development
    'src/count/analysis/RhythmAnalyzer.ts',
    // Parked timing analysis helpers
    'src/count/analysis/timingAnalysis.ts',
    // Parked Quiet Count coaching UI
    'src/count/components/QuietCount.tsx',
    // Parked timing gauge component
    'src/count/components/TimingGauge.tsx',
    // Parked vocal fatigue guard UI
    'src/count/components/VocalFatigueGuard.tsx',
    // Parked rhythm analyzer hook
    'src/count/hooks/useRhythmAnalyzer.ts',
    // CI False Positives (Exports used in future/debugging or tests but flagged)
    'src/zines/utils/imageProcessor.ts', // processFiles used in specialized flows
    // PDF generator helpers used in specialized export flows
    'src/zines/utils/pdfGenerator.ts',
    // Spread organizer DPI helpers for future print flows
    'src/zines/utils/spreadOrganizer.ts',
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