// AUTO-GENERATED FILE: scripts/generate-shared-catalog.mjs
// Do not edit manually. Run: npm run generate:shared-catalog

export type SharedCatalogKind = 'component' | 'hook' | 'utility' | 'model' | 'service' | 'doc';
export type SharedCatalogStability = 'stable' | 'beta' | 'experimental';

export interface SharedCatalogEntry {
  id: string;
  name: string;
  path: string;
  kind: SharedCatalogKind;
  stability: SharedCatalogStability;
  owner: string;
  description: string;
  tags: string[];
  appsUsing: string[];
  exportType: string;
  demoId: string | null;
}

export const SHARED_CATALOG: ReadonlyArray<SharedCatalogEntry> = [
  {
    "id": "src-shared-audio-test-mockaudiocontext-ts-createmockaudiocontext",
    "name": "createMockAudioContext",
    "path": "src/shared/audio/__test__/mockAudioContext.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Create a fake AudioContext with controllable time. Advance time by setting `ctx._time = 1.5`.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-test-mockaudiocontext-ts-createmockgainnode",
    "name": "createMockGainNode",
    "path": "src/shared/audio/__test__/mockAudioContext.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Minimal mock GainNode with spied AudioParam.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-test-mockaudiocontext-ts-createmocksourcenode",
    "name": "createMockSourceNode",
    "path": "src/shared/audio/__test__/mockAudioContext.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Minimal mock AudioBufferSourceNode.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-test-mockaudiocontext-ts-mockaudiocontext",
    "name": "MockAudioContext",
    "path": "src/shared/audio/__test__/mockAudioContext.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Minimal mock GainNode with spied AudioParam.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-audioplayer-ts-audioplayer",
    "name": "AudioPlayer",
    "path": "src/shared/audio/audioPlayer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Audio player using Web Audio API for precise timing and volume control Preloads sounds and provides a simple play interface with dynamic volume RELIABILITY FEATURES: - Automatically resumes suspended AudioContext (browser autoplay policy compliance) - Handles visibility changes to prevent audio issues when tab is backgrounded - Provides health check API for playback system to verify audio is working",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-audioplayer-ts-audioplayerconfig",
    "name": "AudioPlayerConfig",
    "path": "src/shared/audio/audioPlayer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Configuration for the audio player",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-audioplayer-ts-createmetronomeplayer",
    "name": "createMetronomePlayer",
    "path": "src/shared/audio/audioPlayer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Create a pre-configured audio player for metronome-only usage",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-beatanalyzer-ts-analysisprogresscallback",
    "name": "AnalysisProgressCallback",
    "path": "src/shared/audio/beatAnalyzer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-beatanalyzer-ts-analyzebeat",
    "name": "analyzeBeat",
    "path": "src/shared/audio/beatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-beatanalyzer-ts-beatanalysisresult",
    "name": "BeatAnalysisResult",
    "path": "src/shared/audio/beatAnalyzer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-beatanalyzer-ts-getessentia",
    "name": "getEssentia",
    "path": "src/shared/audio/beatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-clickservice-ts-loadclicksample",
    "name": "loadClickSample",
    "path": "src/shared/audio/clickService.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "beat"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-clickservice-ts-loadedclicksample",
    "name": "LoadedClickSample",
    "path": "src/shared/audio/clickService.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "beat"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-clickservice-ts-playclicksampleat",
    "name": "playClickSampleAt",
    "path": "src/shared/audio/clickService.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "beat"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-downbeatalignment-ts-alignbeatgridtodownbeat",
    "name": "alignBeatGridToDownbeat",
    "path": "src/shared/audio/downbeatAlignment.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Align beat grid to the first actual downbeat. Handles songs with pickup notes by finding which onset in the opening measures is most likely to be beat 1, based on: - Onset strength (energy) - How well subsequent beats align with detected onsets",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-downbeatalignment-ts-downbeatalignmentresult",
    "name": "DownbeatAlignmentResult",
    "path": "src/shared/audio/downbeatAlignment.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Downbeat Alignment Handles songs with pickup notes by finding which onset in the opening measures is most likely to be beat 1, based on: - Onset strength (energy) - How well subsequent beats align with detected onsets",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-drumsampleurls-ts-click-sample-url",
    "name": "CLICK_SAMPLE_URL",
    "path": "src/shared/audio/drumSampleUrls.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-drumsampleurls-ts-drum-sample-urls",
    "name": "DRUM_SAMPLE_URLS",
    "path": "src/shared/audio/drumSampleUrls.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-audioplayer",
    "name": "AudioPlayer",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-audioplayerconfig",
    "name": "AudioPlayerConfig",
    "path": "src/shared/audio/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-convertreverbstrengthtowetlevel",
    "name": "convertReverbStrengthToWetLevel",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-createmetronomeplayer",
    "name": "createMetronomePlayer",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-createreverb",
    "name": "createReverb",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-generatefallbackimpulseresponse",
    "name": "generateFallbackImpulseResponse",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-loadimpulseresponse",
    "name": "loadImpulseResponse",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-metronomecallback",
    "name": "MetronomeCallback",
    "path": "src/shared/audio/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-metronomeplayer",
    "name": "MetronomePlayer",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-reverbnodes",
    "name": "ReverbNodes",
    "path": "src/shared/audio/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-index-ts-updatereverblevel",
    "name": "updateReverbLevel",
    "path": "src/shared/audio/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronomeplayer-ts-metronomecallback",
    "name": "MetronomeCallback",
    "path": "src/shared/audio/metronomePlayer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Callback for when a metronome beat occurs Parameters: measureIndex, positionInSixteenths, isDownbeat (true for first beat of measure)",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronomeplayer-ts-metronomeplayer",
    "name": "MetronomePlayer",
    "path": "src/shared/audio/metronomePlayer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Standalone metronome player for playing click tracks Can be synced to an external time source (like audio playback)",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronomeplayer-ts-metronomeresolution",
    "name": "MetronomeResolution",
    "path": "src/shared/audio/metronomePlayer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Callback for when a metronome beat occurs Parameters: measureIndex, positionInSixteenths, isDownbeat (true for first beat of measure)",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-precisescheduler-ts-precisescheduler",
    "name": "PreciseScheduler",
    "path": "src/shared/audio/preciseScheduler.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "PreciseScheduler — shared utility for robust Web Audio scheduling. Provides the common infrastructure that any rAF + AudioContext look-ahead engine needs: loop management, async race protection, source/timeout tracking, and clean gain ramp-down on stop. This is a composition utility — engines hold an instance and delegate lifecycle calls rather than extending a base class.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-reverb-ts-convertreverbstrengthtowetlevel",
    "name": "convertReverbStrengthToWetLevel",
    "path": "src/shared/audio/reverb.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Convert reverb strength percentage (0-100) to wet level with professional curve This function provides a non-linear mapping that preserves dry signal at lower settings",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-reverb-ts-createreverb",
    "name": "createReverb",
    "path": "src/shared/audio/reverb.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Create a reverb node with dry/wet mix control Uses provided impulse response or generates a fallback Enhanced with pre-delay and high-frequency damping for more natural sound",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-reverb-ts-generatefallbackimpulseresponse",
    "name": "generateFallbackImpulseResponse",
    "path": "src/shared/audio/reverb.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Generate a simple impulse response buffer for reverb (fallback) Creates a decaying noise burst that simulates room reverb",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-reverb-ts-loadimpulseresponse",
    "name": "loadImpulseResponse",
    "path": "src/shared/audio/reverb.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Load impulse response from a URL",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-reverb-ts-reverbnodes",
    "name": "ReverbNodes",
    "path": "src/shared/audio/reverb.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Load impulse response from a URL",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-reverb-ts-updatereverblevel",
    "name": "updateReverbLevel",
    "path": "src/shared/audio/reverb.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Update reverb wet level with improved dry/wet balance Uses non-linear curve to preserve dry signal at lower settings",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysis-onsets-ts-detectonsets",
    "name": "detectOnsets",
    "path": "src/shared/beat/analysis/onsets.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detect onsets in audio using energy-based detection.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysis-onsets-ts-minimalaudiobuffer",
    "name": "MinimalAudioBuffer",
    "path": "src/shared/beat/analysis/onsets.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared onset detection utilities. Centralizes onset detection so analysis, benchmarks, and refinement use consistent logic with preset parameter sets.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysis-onsets-ts-onsetdetectionoptions",
    "name": "OnsetDetectionOptions",
    "path": "src/shared/beat/analysis/onsets.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared onset detection utilities. Centralizes onset detection so analysis, benchmarks, and refinement use consistent logic with preset parameter sets.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysis-onsets-ts-onsetpreset",
    "name": "OnsetPreset",
    "path": "src/shared/beat/analysis/onsets.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared onset detection utilities. Centralizes onset detection so analysis, benchmarks, and refinement use consistent logic with preset parameter sets.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-appslider-tsx-appslider",
    "name": "AppSlider",
    "path": "src/shared/components/AppSlider.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Thin wrapper around MUI Slider that adapts callbacks to app legacy range events.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "forms",
      "piano",
      "words",
      "zines"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-apptooltip-tsx-apptooltip",
    "name": "AppTooltip",
    "path": "src/shared/components/AppTooltip.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared tooltip primitive with consistent delays, styling, and disabled-child handling.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "story",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "app-tooltip"
  },
  {
    "id": "src-shared-components-diceicon-tsx-diceicon",
    "name": "DiceIcon",
    "path": "src/shared/components/DiceIcon.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared dice icon used for randomize actions in music controls.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "chords",
      "story",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "dice-icon"
  },
  {
    "id": "src-shared-components-metronometogglebutton-tsx-metronometogglebutton",
    "name": "MetronomeToggleButton",
    "path": "src/shared/components/MetronomeToggleButton.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared metronome toggle control used across playback-oriented apps.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "metronome-toggle"
  },
  {
    "id": "src-shared-components-music-bpminput-tsx-bpminput",
    "name": "BpmInput",
    "path": "src/shared/components/music/BpmInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared tempo input with stepper, slider, and optional preset menu.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "bpm-input"
  },
  {
    "id": "src-shared-components-music-chordprogressioninput-tsx-chordprogressioninput",
    "name": "ChordProgressionInput",
    "path": "src/shared/components/music/ChordProgressionInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared chord progression editor with preset picking and key-aware resolution.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "chord-progression-input"
  },
  {
    "id": "src-shared-components-music-chordstyleinput-tsx-chordstyleinput",
    "name": "ChordStyleInput",
    "path": "src/shared/components/music/ChordStyleInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared style picker for chord playback and arrangement strategies.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "chord-style-input"
  },
  {
    "id": "src-shared-components-music-chordstyleinput-tsx-chordstylemenu",
    "name": "ChordStyleMenu",
    "path": "src/shared/components/music/ChordStyleInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Reusable option menu used by `ChordStyleInput` in popover and inline layouts.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-chordstyleinput-tsx-chordstyleoptionlike",
    "name": "ChordStyleOptionLike",
    "path": "src/shared/components/music/ChordStyleInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Generic option contract consumed by `ChordStyleInput`.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-drumaccompaniment-tsx-drumaccompaniment",
    "name": "DrumAccompaniment",
    "path": "src/shared/components/music/DrumAccompaniment.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Precise drum scheduling via the playback engine's look-ahead scheduler",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "piano"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-drumaccompaniment-tsx-drumscheduler",
    "name": "DrumScheduler",
    "path": "src/shared/components/music/DrumAccompaniment.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Precise drum scheduling via the playback engine's look-ahead scheduler",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-drumaccompaniment-tsx-drumtemplatebuttonprops",
    "name": "DrumTemplateButtonProps",
    "path": "src/shared/components/music/DrumAccompaniment.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Precise drum scheduling via the playback engine's look-ahead scheduler",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-keyinput-tsx-keyinput",
    "name": "KeyInput",
    "path": "src/shared/components/music/KeyInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared musical key input with optional semitone stepping and randomized selection.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "key-input"
  },
  {
    "id": "src-shared-components-music-keyinput-tsx-keyinputmenu",
    "name": "KeyInputMenu",
    "path": "src/shared/components/music/KeyInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Reusable key-preset menu shown inside `KeyInput` popovers.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-keyinput-tsx-keyinputmenuprops",
    "name": "KeyInputMenuProps",
    "path": "src/shared/components/music/KeyInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Menu contract for selecting one key from a normalized key set.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-onscreenpianokeyboard-tsx-onscreenpianokeyboard",
    "name": "OnscreenPianoKeyboard",
    "path": "src/shared/components/music/OnscreenPianoKeyboard.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-sharedexportpopover-tsx-sharedexportpopover",
    "name": "SharedExportPopover",
    "path": "src/shared/components/music/SharedExportPopover.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "shared-export-popover"
  },
  {
    "id": "src-shared-midi-midiinput-ts-getmidiinput",
    "name": "getMidiInput",
    "path": "src/shared/midi/midiInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-midi-midiinput-ts-midiinput",
    "name": "MidiInput",
    "path": "src/shared/midi/midiInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "shared-music-architecture",
    "name": "Music Architecture",
    "path": "src/shared/music/ARCHITECTURE.md",
    "kind": "doc",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared music ownership and dependency boundary guidance.",
    "tags": [
      "docs",
      "architecture"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "words"
    ],
    "exportType": "doc",
    "demoId": null
  },
  {
    "id": "src-shared-music-audiocodecs-ts-audiobuffertomp3",
    "name": "audioBufferToMp3",
    "path": "src/shared/music/audioCodecs.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-audiocodecs-ts-audiobuffertowav",
    "name": "audioBufferToWav",
    "path": "src/shared/music/audioCodecs.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-audiocodecs-ts-encodeaudiobuffer",
    "name": "encodeAudioBuffer",
    "path": "src/shared/music/audioCodecs.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordmatcher-ts-matcheschord",
    "name": "matchesChord",
    "path": "src/shared/music/chordMatcher.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Parses chord symbols and matches user-played pitch classes against expected chords. Accepts any voicing/inversion as long as all required pitch classes are present.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordmatcher-ts-parsechordsymbol",
    "name": "parseChordSymbol",
    "path": "src/shared/music/chordMatcher.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Parses chord symbols and matches user-played pitch classes against expected chords. Accepts any voicing/inversion as long as all required pitch classes are present.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordmatcher-ts-parsedchord",
    "name": "ParsedChord",
    "path": "src/shared/music/chordMatcher.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Parses chord symbols and matches user-played pitch classes against expected chords. Accepts any voicing/inversion as long as all required pitch classes are present.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressioncompletion-ts-buildsectionchordsymbols",
    "name": "buildSectionChordSymbols",
    "path": "src/shared/music/chordProgressionCompletion.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressioncompletion-ts-computecompletionpadmeasures",
    "name": "computeCompletionPadMeasures",
    "path": "src/shared/music/chordProgressionCompletion.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-inferkeyfromchordsymbols",
    "name": "inferKeyFromChordSymbols",
    "path": "src/shared/music/chordProgressionText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-parsechordsymboltoken",
    "name": "parseChordSymbolToken",
    "path": "src/shared/music/chordProgressionText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-parsedchordtoken",
    "name": "ParsedChordToken",
    "path": "src/shared/music/chordProgressionText.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-parsedprogressiontext",
    "name": "ParsedProgressionText",
    "path": "src/shared/music/chordProgressionText.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-parseprogressiontext",
    "name": "parseProgressionText",
    "path": "src/shared/music/chordProgressionText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-parseprogressiontextoptions",
    "name": "ParseProgressionTextOptions",
    "path": "src/shared/music/chordProgressionText.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstylehits-ts-chordhit",
    "name": "ChordHit",
    "path": "src/shared/music/chordStyleHits.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstylehits-ts-getchordhitsforstyle",
    "name": "getChordHitsForStyle",
    "path": "src/shared/music/chordStyleHits.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Returns chord-hit timing hints for visual/arrangement apps. Derived from shared chord style patterns so newly added styles work automatically without switch updates.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstyleoptions-ts-chord-style-options",
    "name": "CHORD_STYLE_OPTIONS",
    "path": "src/shared/music/chordStyleOptions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstyleoptions-ts-chordstyleid",
    "name": "ChordStyleId",
    "path": "src/shared/music/chordStyleOptions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstyleoptions-ts-chordstyleoption",
    "name": "ChordStyleOption",
    "path": "src/shared/music/chordStyleOptions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstylingpatterns-ts-chord-styling-patterns",
    "name": "CHORD_STYLING_PATTERNS",
    "path": "src/shared/music/chordStylingPatterns.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstylingpatterns-ts-chordpatternconfig",
    "name": "ChordPatternConfig",
    "path": "src/shared/music/chordStylingPatterns.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstylingpatterns-ts-chordstylingpattern",
    "name": "ChordStylingPattern",
    "path": "src/shared/music/chordStylingPatterns.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstylingpatterns-ts-keytotimesignature",
    "name": "keyToTimeSignature",
    "path": "src/shared/music/chordStylingPatterns.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordstylingpatterns-ts-timesignaturetokey",
    "name": "timeSignatureToKey",
    "path": "src/shared/music/chordStylingPatterns.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtheory-ts-harmonicmode",
    "name": "HarmonicMode",
    "path": "src/shared/music/chordTheory.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared chord theory helpers used by multiple music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtheory-ts-progressiontochords",
    "name": "progressionToChords",
    "path": "src/shared/music/chordTheory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared chord theory helpers used by multiple music apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtheory-ts-romannumeraltochord",
    "name": "romanNumeralToChord",
    "path": "src/shared/music/chordTheory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared chord theory helpers used by multiple music apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-chord",
    "name": "Chord",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-chordprogressionconfig",
    "name": "ChordProgressionConfig",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-chordquality",
    "name": "ChordQuality",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-chordstylingstrategy",
    "name": "ChordStylingStrategy",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-key",
    "name": "Key",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-romannumeral",
    "name": "RomanNumeral",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-timesignature",
    "name": "TimeSignature",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtypes-ts-voicingoptions",
    "name": "VoicingOptions",
    "path": "src/shared/music/chordTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonical chord-domain types shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordvoicing-ts-generatevoicing",
    "name": "generateVoicing",
    "path": "src/shared/music/chordVoicing.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chord voicing utilities shared across chord-driven apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-commonchordprogressions-ts-common-chord-progressions",
    "name": "COMMON_CHORD_PROGRESSIONS",
    "path": "src/shared/music/commonChordProgressions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-commonchordprogressions-ts-commonchordprogression",
    "name": "CommonChordProgression",
    "path": "src/shared/music/commonChordProgressions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "ui"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exportservice-ts-executeexport",
    "name": "executeExport",
    "path": "src/shared/music/exportService.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-exportservice-ts-formatduration",
    "name": "formatDuration",
    "path": "src/shared/music/exportService.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-default-export-quality",
    "name": "DEFAULT_EXPORT_QUALITY",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-export-formats",
    "name": "EXPORT_FORMATS",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportaudiorenderrequest",
    "name": "ExportAudioRenderRequest",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportaudiorenderresult",
    "name": "ExportAudioRenderResult",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportexecutionrequest",
    "name": "ExportExecutionRequest",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportexecutionresult",
    "name": "ExportExecutionResult",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportformat",
    "name": "ExportFormat",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportformatdescriptor",
    "name": "ExportFormatDescriptor",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportmetadata",
    "name": "ExportMetadata",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportmidirenderrequest",
    "name": "ExportMidiRenderRequest",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportpreview",
    "name": "ExportPreview",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportqualitysettings",
    "name": "ExportQualitySettings",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportsourceadapter",
    "name": "ExportSourceAdapter",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-exportstem",
    "name": "ExportStem",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-exporttypes-ts-midirenderpayload",
    "name": "MidiRenderPayload",
    "path": "src/shared/music/exportTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyricsectionparser-ts-lookslikefullsonglyrics",
    "name": "looksLikeFullSongLyrics",
    "path": "src/shared/music/lyricSectionParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyricsectionparser-ts-parsedlyricsectiondraft",
    "name": "ParsedLyricSectionDraft",
    "path": "src/shared/music/lyricSectionParser.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyricsectionparser-ts-parselyricsections",
    "name": "parseLyricSections",
    "path": "src/shared/music/lyricSectionParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-midiaudiorender-ts-rendermidieventstoaudiobuffer",
    "name": "renderMidiEventsToAudioBuffer",
    "path": "src/shared/music/midiAudioRender.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-midibuilder-ts-buildsingletrackmidi",
    "name": "buildSingleTrackMidi",
    "path": "src/shared/music/midiBuilder.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-midibuilder-ts-midinoteevent",
    "name": "MidiNoteEvent",
    "path": "src/shared/music/midiBuilder.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-musicinputconstants-ts-all-keys",
    "name": "ALL_KEYS",
    "path": "src/shared/music/musicInputConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "piano",
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-musicinputconstants-ts-common-bpms",
    "name": "COMMON_BPMS",
    "path": "src/shared/music/musicInputConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "piano",
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-musicinputconstants-ts-default-bpm-max",
    "name": "DEFAULT_BPM_MAX",
    "path": "src/shared/music/musicInputConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "piano",
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-musicinputconstants-ts-default-bpm-min",
    "name": "DEFAULT_BPM_MIN",
    "path": "src/shared/music/musicInputConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "piano",
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-musicinputconstants-ts-display-keys-12",
    "name": "DISPLAY_KEYS_12",
    "path": "src/shared/music/musicInputConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "piano",
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-musicinputconstants-ts-musickey",
    "name": "MusicKey",
    "path": "src/shared/music/musicInputConstants.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "piano",
      "ui"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-notemath-ts-miditofrequency",
    "name": "midiToFrequency",
    "path": "src/shared/music/noteMath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-microphonepitchinput-ts-microphonedevice",
    "name": "MicrophoneDevice",
    "path": "src/shared/music/pitch/microphonePitchInput.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-microphonepitchinput-ts-microphonepitchinput",
    "name": "MicrophonePitchInput",
    "path": "src/shared/music/pitch/microphonePitchInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-microphonepitchinput-ts-microphonepitchinputcallbacks",
    "name": "MicrophonePitchInputCallbacks",
    "path": "src/shared/music/pitch/microphonePitchInput.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-pitchdetection-ts-detectpitchfrequency",
    "name": "detectPitchFrequency",
    "path": "src/shared/music/pitch/pitchDetection.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "YIN-based monophonic pitch detection helpers shared across music apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-pitchdetection-ts-detectpitchinfo",
    "name": "detectPitchInfo",
    "path": "src/shared/music/pitch/pitchDetection.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "YIN-based monophonic pitch detection helpers shared across music apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-pitchdetection-ts-frequencytomidi",
    "name": "frequencyToMidi",
    "path": "src/shared/music/pitch/pitchDetection.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "YIN-based monophonic pitch detection helpers shared across music apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-pitchdetection-ts-getcentsoff",
    "name": "getCentsOff",
    "path": "src/shared/music/pitch/pitchDetection.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "YIN-based monophonic pitch detection helpers shared across music apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-pitchdetection-ts-miditonotename",
    "name": "midiToNoteName",
    "path": "src/shared/music/pitch/pitchDetection.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "YIN-based monophonic pitch detection helpers shared across music apps.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-pitchdetection-ts-pitchinfo",
    "name": "PitchInfo",
    "path": "src/shared/music/pitch/pitchDetection.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "YIN-based monophonic pitch detection helpers shared across music apps.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-randomchordprogression-ts-getrandompopularchordprogression",
    "name": "getRandomPopularChordProgression",
    "path": "src/shared/music/randomChordProgression.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-randomchordprogression-ts-getrandompopularchordprogressioninkey",
    "name": "getRandomPopularChordProgressionInKey",
    "path": "src/shared/music/randomChordProgression.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-randomchordprogression-ts-randompopularchordprogressionresult",
    "name": "RandomPopularChordProgressionResult",
    "path": "src/shared/music/randomChordProgression.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-randomization-ts-all-keys",
    "name": "ALL_KEYS",
    "path": "src/shared/music/randomization.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-chromatic-notes",
    "name": "CHROMATIC_NOTES",
    "path": "src/shared/music/scales.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-default-score",
    "name": "DEFAULT_SCORE",
    "path": "src/shared/music/scales.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-direction",
    "name": "Direction",
    "path": "src/shared/music/scales.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-exercisetype",
    "name": "ExerciseType",
    "path": "src/shared/music/scales.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-generatechromaticscore",
    "name": "generateChromaticScore",
    "path": "src/shared/music/scales.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-generateexercisescore",
    "name": "generateExerciseScore",
    "path": "src/shared/music/scales.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-major-keys",
    "name": "MAJOR_KEYS",
    "path": "src/shared/music/scales.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-minor-keys",
    "name": "MINOR_KEYS",
    "path": "src/shared/music/scales.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-scales-ts-subdivision",
    "name": "Subdivision",
    "path": "src/shared/music/scales.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-duration-beats",
    "name": "DURATION_BEATS",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-duration-vexflow",
    "name": "DURATION_VEXFLOW",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-durationtobeats",
    "name": "durationToBeats",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-generatenoteid",
    "name": "generateNoteId",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-key",
    "name": "Key",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-microphonedevice",
    "name": "MicrophoneDevice",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-mididevice",
    "name": "MidiDevice",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-miditofrequency",
    "name": "midiToFrequency",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-miditonotename",
    "name": "midiToNoteName",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-miditopitchstring",
    "name": "midiToPitchString",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-miditopitchstringforkey",
    "name": "midiToPitchStringForKey",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-noteduration",
    "name": "NoteDuration",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-pianoscore",
    "name": "PianoScore",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-repeatbarline",
    "name": "RepeatBarline",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-scoremeasure",
    "name": "ScoreMeasure",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-scorenavigation",
    "name": "ScoreNavigation",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-scorenote",
    "name": "ScoreNote",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-scorepart",
    "name": "ScorePart",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-scoretypes-ts-voltabracket",
    "name": "VoltaBracket",
    "path": "src/shared/music/scoreTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-songsections-ts-createdefaultsection",
    "name": "createDefaultSection",
    "path": "src/shared/music/songSections.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-songsections-ts-createsectionid",
    "name": "createSectionId",
    "path": "src/shared/music/songSections.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-songsections-ts-findpreviouschorus",
    "name": "findPreviousChorus",
    "path": "src/shared/music/songSections.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-songsections-ts-songsection",
    "name": "SongSection",
    "path": "src/shared/music/songSections.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-songsections-ts-songsectiontype",
    "name": "SongSectionType",
    "path": "src/shared/music/songSections.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-soundoptions-ts-sound-options",
    "name": "SOUND_OPTIONS",
    "path": "src/shared/music/soundOptions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-soundoptions-ts-soundoptions",
    "name": "SoundOptions",
    "path": "src/shared/music/soundOptions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-soundoptions-ts-soundtype",
    "name": "SoundType",
    "path": "src/shared/music/soundOptions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-chromaticforkey",
    "name": "chromaticForKey",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-flat-chromatic",
    "name": "FLAT_CHROMATIC",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-flat-keys",
    "name": "FLAT_KEYS",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-normalizepitchclass",
    "name": "normalizePitchClass",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-note-to-pitch-class",
    "name": "NOTE_TO_PITCH_CLASS",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-pitchclassfornote",
    "name": "pitchClassForNote",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-sharp-chromatic",
    "name": "SHARP_CHROMATIC",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-spellpitchclass",
    "name": "spellPitchClass",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-spellrootforkey",
    "name": "spellRootForKey",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-theory-pitchclass-ts-usesflatspelling",
    "name": "usesFlatSpelling",
    "path": "src/shared/music/theory/pitchClass.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-drumnotationmini",
    "name": "DrumNotationMini",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Compact drum notation renderer for playback visualization Shows a single measure with optional note highlighting",
    "tags": [
      "notation",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "drum-notation-mini"
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-notation-styles",
    "name": "NOTATION_STYLES",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Predefined style presets",
    "tags": [
      "notation",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-notationstyle",
    "name": "NotationStyle",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Style configuration for the drum notation renderer",
    "tags": [
      "notation",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumsymbols-ts-drawdrumsymbol",
    "name": "drawDrumSymbol",
    "path": "src/shared/notation/drumSymbols.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Draw a drum symbol on an SVG element",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumsymbols-ts-getdrumsymbolchar",
    "name": "getDrumSymbolChar",
    "path": "src/shared/notation/drumSymbols.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Get the symbol character for a drum sound (for text display)",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-index-ts-drawdrumsymbol",
    "name": "drawDrumSymbol",
    "path": "src/shared/notation/index.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-notation-index-ts-drumnotationmini",
    "name": "DrumNotationMini",
    "path": "src/shared/notation/index.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-notation-index-ts-getdrumsymbolchar",
    "name": "getDrumSymbolChar",
    "path": "src/shared/notation/index.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-notation-index-ts-notation-styles",
    "name": "NOTATION_STYLES",
    "path": "src/shared/notation/index.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-notation-index-ts-notationstyle",
    "name": "NotationStyle",
    "path": "src/shared/notation/index.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplay-tsx-ghostnote",
    "name": "GhostNote",
    "path": "src/shared/notation/ScoreDisplay.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplay-tsx-scoredisplay",
    "name": "ScoreDisplay",
    "path": "src/shared/notation/ScoreDisplay.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api",
      "react"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-playback-audiocontextlifecycle-ts-attachaudiocontextlifecycle",
    "name": "attachAudioContextLifecycle",
    "path": "src/shared/playback/audioContextLifecycle.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [
      "beat",
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-audiocontextlifecycle-ts-createmanagedaudiocontext",
    "name": "createManagedAudioContext",
    "path": "src/shared/playback/audioContextLifecycle.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [
      "beat",
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-audiocontextlifecycle-ts-ensureaudiocontextrunning",
    "name": "ensureAudioContextRunning",
    "path": "src/shared/playback/audioContextLifecycle.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [
      "beat",
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-audiocontextlifecycle-ts-managedaudiocontext",
    "name": "ManagedAudioContext",
    "path": "src/shared/playback/audioContextLifecycle.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instrumentfactory-ts-createinstrumentforsoundtype",
    "name": "createInstrumentForSoundType",
    "path": "src/shared/playback/instrumentFactory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instrumentfactory-ts-instrumentfactoryoptions",
    "name": "InstrumentFactoryOptions",
    "path": "src/shared/playback/instrumentFactory.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instrumentfactory-ts-sharedsoundtype",
    "name": "SharedSoundType",
    "path": "src/shared/playback/instrumentFactory.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-baseinstrument",
    "name": "BaseInstrument",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-instrument",
    "name": "Instrument",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-loadingprogresscallback",
    "name": "LoadingProgressCallback",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-pianosynthesizer",
    "name": "PianoSynthesizer",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-playnoteparams",
    "name": "PlayNoteParams",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-sampledpiano",
    "name": "SampledPiano",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-sampleloadingstate",
    "name": "SampleLoadingState",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-simplesynthesizer",
    "name": "SimpleSynthesizer",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-index-ts-waveformtype",
    "name": "WaveformType",
    "path": "src/shared/playback/instruments/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instruments exports",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-instrument-ts-baseinstrument",
    "name": "BaseInstrument",
    "path": "src/shared/playback/instruments/instrument.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Base class providing common functionality for instruments",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-instrument-ts-instrument",
    "name": "Instrument",
    "path": "src/shared/playback/instruments/instrument.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instrument Interface Abstract interface for all sound generators. This allows the scheduler to be completely decoupled from how sounds are actually produced. Future implementations could include: - PianoSynthesizer (oscillator-based piano) - SampledPiano (real piano samples) - DrumMachine (drum samples) - FMSynthesizer (FM synthesis)",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-instrument-ts-playnoteparams",
    "name": "PlayNoteParams",
    "path": "src/shared/playback/instruments/instrument.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Instrument Interface Abstract interface for all sound generators. This allows the scheduler to be completely decoupled from how sounds are actually produced. Future implementations could include: - PianoSynthesizer (oscillator-based piano) - SampledPiano (real piano samples) - DrumMachine (drum samples) - FMSynthesizer (FM synthesis)",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-pianosynth-ts-pianosynthesizer",
    "name": "PianoSynthesizer",
    "path": "src/shared/playback/instruments/pianoSynth.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Piano Synthesizer (Enhanced) Creates a realistic piano-like sound using: - Multiple sine wave oscillators with slight detuning (simulates string inharmonicity) - Velocity-dependent timbre (harder hits = brighter sound) - Per-harmonic decay rates (higher harmonics decay faster) - Subtle modulation on long notes for natural movement - Exponential decay curves for natural piano-like sound",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampledpiano-ts-sampledpiano",
    "name": "SampledPiano",
    "path": "src/shared/playback/instruments/sampledPiano.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Sampled Piano Synthesizer Plays real piano samples with: - Velocity-based sample selection - Pitch shifting for notes between sample points - Natural decay (lets samples ring naturally) - Subtle modulation for long notes (adds life/movement) - Smooth release when notes end",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampledpiano-ts-sampleloadingstate",
    "name": "SampleLoadingState",
    "path": "src/shared/playback/instruments/sampledPiano.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Loading state",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampleloader-ts-findbestsample",
    "name": "findBestSample",
    "path": "src/shared/playback/instruments/sampleLoader.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Find the best sample for a given MIDI note from loaded samples Returns the sample and the pitch shift needed (in semitones)",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampleloader-ts-loadedsample",
    "name": "LoadedSample",
    "path": "src/shared/playback/instruments/sampleLoader.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Loaded sample with decoded buffer",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampleloader-ts-loadingprogresscallback",
    "name": "LoadingProgressCallback",
    "path": "src/shared/playback/instruments/sampleLoader.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Loading progress callback",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampleloader-ts-loadsamples",
    "name": "loadSamples",
    "path": "src/shared/playback/instruments/sampleLoader.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Load multiple samples with progress tracking",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampleloader-ts-notetomidi",
    "name": "noteToMidi",
    "path": "src/shared/playback/instruments/sampleLoader.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Convert note name to MIDI number",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampleloader-ts-sampleentry",
    "name": "SampleEntry",
    "path": "src/shared/playback/instruments/sampleLoader.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Sample map entry",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-sampleloader-ts-velocitylayer",
    "name": "VelocityLayer",
    "path": "src/shared/playback/instruments/sampleLoader.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Velocity layer configuration",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-simplesynth-ts-simplesynthesizer",
    "name": "SimpleSynthesizer",
    "path": "src/shared/playback/instruments/simpleSynth.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Simple Synthesizer Basic waveform synthesizer (sine, square, sawtooth, triangle) with simple exponential decay envelope.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-simplesynth-ts-waveformtype",
    "name": "WaveformType",
    "path": "src/shared/playback/instruments/simpleSynth.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Simple Synthesizer Basic waveform synthesizer (sine, square, sawtooth, triangle) with simple exponential decay envelope.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-playback-scheduler-ts-playbackscheduler",
    "name": "PlaybackScheduler",
    "path": "src/shared/playback/scheduler.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Small reusable scheduler for playback loops. Keeps setInterval handling centralized and testable.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-scheduler-ts-scheduleroptions",
    "name": "SchedulerOptions",
    "path": "src/shared/playback/scheduler.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-scoreplayback-ts-beatmap",
    "name": "BeatMap",
    "path": "src/shared/playback/scorePlayback.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Interface for variable-tempo beat mapping (e.g. from video sync).",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-scoreplayback-ts-getscoreplaybackengine",
    "name": "getScorePlaybackEngine",
    "path": "src/shared/playback/scorePlayback.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Interface for variable-tempo beat mapping (e.g. from video sync).",
    "tags": [
      "playback"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-scoreplayback-ts-resolveplaybackorder",
    "name": "resolvePlaybackOrder",
    "path": "src/shared/playback/scorePlayback.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Resolve the actual playback order of measures, handling repeats, voltas, and D.S. al Coda navigation. Used by both the playback engine and the video-to-score correlation.",
    "tags": [
      "playback"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-scoreplayback-ts-scoreplaybackengine",
    "name": "ScorePlaybackEngine",
    "path": "src/shared/playback/scorePlayback.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Interface for variable-tempo beat mapping (e.g. from video sync).",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-track-ts-track",
    "name": "Track",
    "path": "src/shared/playback/track.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Track - Encapsulates a single instrument track with its events and gain control Each track has: - Its own list of note events - Its own instrument instance - Its own gain control (for mixing) - Shared transport (they all sync to the same clock)",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-transport-ts-transport",
    "name": "Transport",
    "path": "src/shared/playback/transport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Transport - Manages time and position for playback Key principle: Position is ALWAYS derived from AudioContext.currentTime, never stored as separate state that can drift.",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-playback-types-ts-noteevent",
    "name": "NoteEvent",
    "path": "src/shared/playback/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Shared types for the playback system",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-types-ts-noteparams",
    "name": "NoteParams",
    "path": "src/shared/playback/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Shared types for the playback system",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-practice-freetempoinput-ts-canadvancewhilewaitingforrelease",
    "name": "canAdvanceWhileWaitingForRelease",
    "path": "src/shared/practice/freeTempoInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-freetempoinput-ts-getlatestattacktime",
    "name": "getLatestAttackTime",
    "path": "src/shared/practice/freeTempoInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-freetemponavigation-ts-findnextfreetempoposition",
    "name": "findNextFreeTempoPosition",
    "path": "src/shared/practice/freeTempoNavigation.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Scan forward through practiced parts to find the next non-rest note position.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-pitchmatch-ts-deriveoctaveoffset",
    "name": "deriveOctaveOffset",
    "path": "src/shared/practice/pitchMatch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detect the octave offset (multiple of 12) between played and expected pitches by matching pitch classes and averaging the deltas. Returns null if no pitch-class match is found.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-pitchmatch-ts-pitchclassdistance",
    "name": "pitchClassDistance",
    "path": "src/shared/practice/pitchMatch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimum semitone distance between two pitch classes (0–6). Returns 0 when both notes are the same pitch class regardless of octave.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-clearall",
    "name": "clearAll",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-clearexpectedtimes",
    "name": "clearExpectedTimes",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-getallmidinoteontimes",
    "name": "getAllMidiNoteOnTimes",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-getmidinoteontime",
    "name": "getMidiNoteOnTime",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-getnoteexpectedtime",
    "name": "getNoteExpectedTime",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-getrecentmidipresses",
    "name": "getRecentMidiPresses",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Get all MIDI note-on times that were pressed within `windowMs` of now. Returns both currently-held AND recently-released notes.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-isnoteheld",
    "name": "isNoteHeld",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-prunestale",
    "name": "pruneStale",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Prune note-on timestamps older than STALE_MS for released notes. Held notes are always kept.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-recordmidinoteoff",
    "name": "recordMidiNoteOff",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-recordmidinoteon",
    "name": "recordMidiNoteOn",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-recordnoteexpectedtime",
    "name": "recordNoteExpectedTime",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared timing store that bypasses React's state/effect pipeline entirely. Both the MIDI input handler and the audio engine write timestamps here directly at event time, and practice evaluation reads them for grading. All times are in performance.now() milliseconds. Note-on times are retained after release so that evaluations running slightly after the key-up can still see what was pressed. Stale entries are pruned periodically.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-practicetimingstore-ts-refreshheldnotes",
    "name": "refreshHeldNotes",
    "path": "src/shared/practice/practiceTimingStore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Reset press timestamps for all currently-held MIDI keys to the given time. Called at loop boundaries and practice start so that keys held across a boundary are treated as if freshly pressed at the new loop's beat 0.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-practice-types-ts-practicenoteresult",
    "name": "PracticeNoteResult",
    "path": "src/shared/practice/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-practice-types-ts-practicerun",
    "name": "PracticeRun",
    "path": "src/shared/practice/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-practice-types-ts-practicesession",
    "name": "PracticeSession",
    "path": "src/shared/practice/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-practice-types-ts-timingjudgment",
    "name": "TimingJudgment",
    "path": "src/shared/practice/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-drumaudioplayer-ts-audioplayer",
    "name": "audioPlayer",
    "path": "src/shared/rhythm/drumAudioPlayer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Drum-specific audio player that wraps the shared AudioPlayer with pre-configured drum sounds and reverb settings",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-index-ts-parsenotation",
    "name": "parseNotation",
    "path": "src/shared/rhythm/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-index-ts-parserhythm",
    "name": "parseRhythm",
    "path": "src/shared/rhythm/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-getpresetnotation",
    "name": "getPresetNotation",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-getrhythmtemplatepresets",
    "name": "getRhythmTemplatePresets",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-learnmorelink",
    "name": "LearnMoreLink",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-rhythm-database",
    "name": "RHYTHM_DATABASE",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "ui",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-rhythmdefinition",
    "name": "RhythmDefinition",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-rhythmtemplatepreset",
    "name": "RhythmTemplatePreset",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-rhythmvariation",
    "name": "RhythmVariation",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmparser-ts-detectidenticalmeasures",
    "name": "detectIdenticalMeasures",
    "path": "src/shared/rhythm/rhythmParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmparser-ts-expandselectiontorepeats",
    "name": "expandSelectionToRepeats",
    "path": "src/shared/rhythm/rhythmParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Expand a visual tick range to include all iterations of repeated measures. Handles two types of repeats: 1. **Section repeats** (`|: ... :|x3`): Ghost measures are hidden in visual space. The user selects the source measure(s), and this function includes the hidden ghost iterations in the unrolled range. 2. **Measure repeats** (`|x3`): Ghost measures are visible in visual space (rendered as simile/% symbols). The user selects only the source measure, and this function detects that it belongs to a repeat group and includes all iterations.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmparser-ts-findmeasureindexattick",
    "name": "findMeasureIndexAtTick",
    "path": "src/shared/rhythm/rhythmParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Finds the Logical Measure Index (Expanded/Visual Index) corresponding to a specific tick position. This replaces naive `Math.floor(tick / 16)` calculations which fail when measures are overfull/underfull. It iterates the Expanded Timeline (via measureMapping) to match VexFlow's coordinate system.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmparser-ts-findmeasureindexfromvisualtick",
    "name": "findMeasureIndexFromVisualTick",
    "path": "src/shared/rhythm/rhythmParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Maps a VISUAL tick position (from VexFlow click/drag) to the actual logical measure index. This is critical because VexFlow HIDES section repeats (ghosts), creating a Compressed Visual Timeline that differs from the Expanded Logical Timeline. Logic must match VexFlowRenderer's hiddenMeasureIndices calculation.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmparser-ts-parsenotation",
    "name": "parseNotation",
    "path": "src/shared/rhythm/rhythmParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmparser-ts-parserhythm",
    "name": "parseRhythm",
    "path": "src/shared/rhythm/rhythmParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmparser-ts-preprocessrepeats",
    "name": "preprocessRepeats",
    "path": "src/shared/rhythm/rhythmParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmplayer-ts-metronomecallback",
    "name": "MetronomeCallback",
    "path": "src/shared/rhythm/rhythmPlayer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Callback for when a metronome beat occurs Parameters: measureIndex, noteIndex, isDownbeat (true for first beat of measure)",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmplayer-ts-notehighlightcallback",
    "name": "NoteHighlightCallback",
    "path": "src/shared/rhythm/rhythmPlayer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Callback for when a note starts playing Parameters: measureIndex, noteIndex within that measure",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-rhythmplayer-ts-rhythmplayer",
    "name": "rhythmPlayer",
    "path": "src/shared/rhythm/rhythmPlayer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Callback for when a note starts playing Parameters: measureIndex, noteIndex within that measure",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-formatbeatgrouping",
    "name": "formatBeatGrouping",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Formats a beat grouping array as a string (e.g., [3, 3, 2] => \"3+3+2\")",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-getbeatgroupinfo",
    "name": "getBeatGroupInfo",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Calculates which beat group a note position belongs to",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-getbeatgroupinginsixteenths",
    "name": "getBeatGroupingInSixteenths",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Convert beat grouping to sixteenths. - For /4: values are in quarter-note beats → multiply by 4 - For /8: values are in eighth notes → multiply by 2 - For /16: values are already in sixteenths",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-getdefaultbeatgrouping",
    "name": "getDefaultBeatGrouping",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Gets the default beat grouping for a time signature - Compound time signatures (6/8, 9/8, 12/8): groups of 3 - Asymmetric time signatures: custom grouping or defaults - Regular time signatures (4/4, 2/4): one group per beat (values add up to numerator)",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-getsixteenthspermeasure",
    "name": "getSixteenthsPerMeasure",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Calculate the number of sixteenth notes per measure for a given time signature",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-isasymmetrictimesignature",
    "name": "isAsymmetricTimeSignature",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Determines if a time signature is asymmetric (e.g., 5/8, 7/8, 11/8) Asymmetric time signatures have /8 denominator and numerator NOT divisible by 3",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-iscompoundtimesignature",
    "name": "isCompoundTimeSignature",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Determines if a time signature is compound (e.g., 6/8, 9/8, 12/8) Compound time signatures have /8 denominator and numerator divisible by 3",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-parsebeatgrouping",
    "name": "parseBeatGrouping",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Parses a beat grouping string (e.g., \"3+3+2\") into an array of numbers",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-timesignatureutils-ts-validatebeatgrouping",
    "name": "validateBeatGrouping",
    "path": "src/shared/rhythm/timeSignatureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Validates that a beat grouping sums to the correct total",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-default-playback-settings",
    "name": "DEFAULT_PLAYBACK_SETTINGS",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-drumsound",
    "name": "DrumSound",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-measure",
    "name": "Measure",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-measuredefinition",
    "name": "MeasureDefinition",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Measure repeat: consecutive identical measures shown with % simile symbol",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-measurerepeat",
    "name": "MeasureRepeat",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-note",
    "name": "Note",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-noteduration",
    "name": "NoteDuration",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-parsedrhythm",
    "name": "ParsedRhythm",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-playbacksettings",
    "name": "PlaybackSettings",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-repeatmarker",
    "name": "RepeatMarker",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Union type for all repeat markers",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-sectionrepeat",
    "name": "SectionRepeat",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Section repeat: multi-measure phrase with repeat barlines |: ... :|",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-types-ts-timesignature",
    "name": "TimeSignature",
    "path": "src/shared/rhythm/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [
      "beat",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-useplayback-ts-useplayback",
    "name": "usePlayback",
    "path": "src/shared/rhythm/usePlayback.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Custom hook for managing playback state and controls",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-a11y-ts-runa11yaudit",
    "name": "runA11yAudit",
    "path": "src/shared/test/a11y.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-audioregression-ts-audiohashmanifest",
    "name": "AudioHashManifest",
    "path": "src/shared/test/audioRegression.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-audioregression-ts-hashfloat32pcm",
    "name": "hashFloat32Pcm",
    "path": "src/shared/test/audioRegression.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-audioregression-ts-loadhashmanifest",
    "name": "loadHashManifest",
    "path": "src/shared/test/audioRegression.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-audioregression-ts-savehashmanifest",
    "name": "saveHashManifest",
    "path": "src/shared/test/audioRegression.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-testutils-ts-createtesttimeout",
    "name": "createTestTimeout",
    "path": "src/shared/test/testUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Promise-based timeout for tests that automatically cleans up",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-testutils-ts-mockanimationframe",
    "name": "mockAnimationFrame",
    "path": "src/shared/test/testUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mock requestAnimationFrame for tests",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-testutils-ts-mockcleanup",
    "name": "MockCleanup",
    "path": "src/shared/test/testUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mock cleanup utilities",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-test-testutils-ts-setuptestcleanup",
    "name": "setupTestCleanup",
    "path": "src/shared/test/testUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Convenience function to set up standard test cleanup Usage in test files: const cleanup = setupTestCleanup(); // In tests, use: cleanup.timers.setTimeout(() => {...}, 100); cleanup.dom.createElement('div', { id: 'test' }); cleanup.mocks.spyOn(console, 'log');",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-testutils-ts-testcleanup",
    "name": "TestCleanup",
    "path": "src/shared/test/testUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comprehensive test cleanup manager",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-test-testutils-ts-timercleanup",
    "name": "TimerCleanup",
    "path": "src/shared/test/testUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Timer cleanup utilities",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-ui-icons-materialiconglyphreadiness-ts-maxwidthformaterialglyph",
    "name": "maxWidthForMaterialGlyph",
    "path": "src/shared/ui/icons/materialIconGlyphReadiness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Heuristic: material icon ligature names (e.g. \"directions_run\") are much wider when rendered as plain text than when shaped as a single glyph. Used to avoid removing `icons-pending` (and to gate visual baselines) before real icons have painted. Important: icons inside fixed-size flex buttons often report a **narrow** getBoundingClientRect() even while ligature plaintext is still painting (flex min-size / clipping), so we always confirm with an off-DOM measurement when the in-layout box looks \"glyph-sized\".",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-ui-icons-materialiconglyphreadiness-ts-visiblematerialiconslookready",
    "name": "visibleMaterialIconsLookReady",
    "path": "src/shared/ui/icons/materialIconGlyphReadiness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Heuristic: material icon ligature names (e.g. \"directions_run\") are much wider when rendered as plain text than when shaped as a single glyph. Used to avoid removing `icons-pending` (and to gate visual baselines) before real icons have painted. Important: icons inside fixed-size flex buttons often report a **narrow** getBoundingClientRect() even while ligature plaintext is still painting (flex min-size / clipping), so we always confirm with an off-DOM measurement when the in-layout box looks \"glyph-sized\".",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-ui-icons-materialiconsbootstrap-ts-initmaterialiconruntime",
    "name": "initMaterialIconRuntime",
    "path": "src/shared/ui/icons/materialIconsBootstrap.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "beat",
      "cats",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "ui",
      "words",
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-ui-theme-apptheme-ts-appthemeid",
    "name": "AppThemeId",
    "path": "src/shared/ui/theme/appTheme.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "beat",
      "cats",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "ui",
      "words",
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-ui-theme-apptheme-ts-getapptheme",
    "name": "getAppTheme",
    "path": "src/shared/ui/theme/appTheme.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "beat",
      "cats",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "ui",
      "words",
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-analytics-ts-appanalytics",
    "name": "AppAnalytics",
    "path": "src/shared/utils/analytics.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "words",
      "zines"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-utils-analytics-ts-appid",
    "name": "AppId",
    "path": "src/shared/utils/analytics.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "words",
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-utils-analytics-ts-createappanalytics",
    "name": "createAppAnalytics",
    "path": "src/shared/utils/analytics.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Create a namespaced analytics helper for a micro-app. All events are automatically tagged with `micro_app` and `content_group` so GA4 reports can be filtered by app and category. Returns a no-op implementation when `window.labsAnalytics` is absent (e.g. dev mode or ad-blockers) so callers never need null checks.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "words",
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-hashstate-ts-gethashvalues",
    "name": "getHashValues",
    "path": "src/shared/utils/hashState.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Look up a key in parsed pairs, returning its values or undefined.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-hashstate-ts-hashpair",
    "name": "HashPair",
    "path": "src/shared/utils/hashState.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generic compact key-value encoder/decoder for URL hash fragments. Convention: pairs are separated by `.`, sub-values within a pair by `-`. Keys are a short prefix (1-3 chars) immediately followed by the first value. Example: #g100-50-0.q100-74-59-27.cv5 This format avoids characters that require URL encoding in hash fragments (%, +, /, =, &, space).",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-utils-hashstate-ts-parsehash",
    "name": "parseHash",
    "path": "src/shared/utils/hashState.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parse a hash fragment (without the leading `#`) into key-value pairs.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-hashstate-ts-serializehash",
    "name": "serializeHash",
    "path": "src/shared/utils/hashState.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Serialize key-value pairs into a hash fragment (without the leading `#`).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-playbackautoscroll-ts-playbackautoscrolloptions",
    "name": "PlaybackAutoScrollOptions",
    "path": "src/shared/utils/playbackAutoScroll.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-utils-playbackautoscroll-ts-playbackautoscrollstate",
    "name": "PlaybackAutoScrollState",
    "path": "src/shared/utils/playbackAutoScroll.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-utils-playbackautoscroll-ts-scrollplaybacktarget",
    "name": "scrollPlaybackTarget",
    "path": "src/shared/utils/playbackAutoScroll.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Scrolls playback target smoothly with jitter guards: - only when marker changes (for example, line index), - throttled by min interval, - skipped for tiny deltas.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "beat",
      "chords",
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-serverlogger-ts-installserverlogger",
    "name": "installServerLogger",
    "path": "src/shared/utils/serverLogger.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Install server logging and error handling for a micro-app Call this BEFORE importing any other app modules to capture import-time errors",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "beat",
      "cats",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "ui",
      "words",
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-serverlogger-ts-resetserverloggerfortesting",
    "name": "resetServerLoggerForTesting",
    "path": "src/shared/utils/serverLogger.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Server Logger - Sends console logs to Vite dev server terminal Shared utility for all micro-apps in the labs project",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "beat",
      "cats",
      "chords",
      "corp",
      "drums",
      "forms",
      "piano",
      "story",
      "ui",
      "words",
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-trailingslashrouting-ts-buildappbasepathsfromentrypaths",
    "name": "buildAppBasePathsFromEntryPaths",
    "path": "src/shared/utils/trailingSlashRouting.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-trailingslashrouting-ts-getcanonicaltrailingslashredirect",
    "name": "getCanonicalTrailingSlashRedirect",
    "path": "src/shared/utils/trailingSlashRouting.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlhistory-ts-cancelpendinghistoryupdates",
    "name": "cancelPendingHistoryUpdates",
    "path": "src/shared/utils/urlHistory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cancel all pending throttled history timers without flushing. Call in test teardown (`afterEach`) to prevent timers from firing after the test environment is destroyed.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "chords",
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlhistory-ts-flushpendinghistoryupdates",
    "name": "flushPendingHistoryUpdates",
    "path": "src/shared/utils/urlHistory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Force-flush all pending throttled history updates. Useful in tests that check URL state immediately after a sync call.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "chords",
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlhistory-ts-getchangedqueryparams",
    "name": "getChangedQueryParams",
    "path": "src/shared/utils/urlHistory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "chords",
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlhistory-ts-gethistoryupdatestrategy",
    "name": "getHistoryUpdateStrategy",
    "path": "src/shared/utils/urlHistory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "chords",
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlhistory-ts-historyupdatestrategy",
    "name": "HistoryUpdateStrategy",
    "path": "src/shared/utils/urlHistory.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "chords",
      "drums"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlhistory-ts-throttledpushstate",
    "name": "throttledPushState",
    "path": "src/shared/utils/urlHistory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Throttled `history.pushState`. Same coalescing behavior as `throttledReplaceState` but creates a new history entry.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "chords",
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlhistory-ts-throttledreplacestate",
    "name": "throttledReplaceState",
    "path": "src/shared/utils/urlHistory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Throttled `history.replaceState`. Coalesces rapid calls so the browser's rate limit (100 per 10s) is never exceeded. The most recent URL is always written within `THROTTLE_MS` of the last call.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "chords",
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlparams-ts-parseoptionalnumberparam",
    "name": "parseOptionalNumberParam",
    "path": "src/shared/utils/urlParams.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlrouting-ts-subscribetopopstate",
    "name": "subscribeToPopState",
    "path": "src/shared/utils/urlRouting.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlrouting-ts-syncurlwithhistory",
    "name": "syncUrlWithHistory",
    "path": "src/shared/utils/urlRouting.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlrouting-ts-urlroutinghistorystate",
    "name": "UrlRoutingHistoryState",
    "path": "src/shared/utils/urlRouting.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-utils-urlrouting-ts-urlroutingsyncoptions",
    "name": "UrlRoutingSyncOptions",
    "path": "src/shared/utils/urlRouting.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  }
] as const;
