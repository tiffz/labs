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
    "id": "src-shared-audio-latencycalibration-ts-calibrationpipschedule",
    "name": "CalibrationPipSchedule",
    "path": "src/shared/audio/latencyCalibration.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Play a calibration pip and estimate round-trip delay (ms) from pip to mic onset via the same energy detection family as the pitch loop.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-latencycalibration-ts-findonsetindexinpcm",
    "name": "findOnsetIndexInPcm",
    "path": "src/shared/audio/latencyCalibration.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Used by tests: find onset sample index in offline PCM after warmup.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-latencycalibration-ts-measureroundtriplatencyms",
    "name": "measureRoundTripLatencyMs",
    "path": "src/shared/audio/latencyCalibration.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Measure round-trip style delay: ms from expected pip audibility to first strong onset on mic. Headphones prevent acoustic coupling — caller should use manual latency instead.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-latencycalibration-ts-schedulecalibrationpip",
    "name": "scheduleCalibrationPip",
    "path": "src/shared/audio/latencyCalibration.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Play a short sine pip starting at ctx.currentTime + delaySec.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-audio-precisionscore-ts-computeprecisionscore",
    "name": "computePrecisionScore",
    "path": "src/shared/audio/precisionScore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Combine rhythmic delta (ms) and pitch cents into a single 0–100 precision score.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-precisionscore-ts-precisionsample",
    "name": "PrecisionSample",
    "path": "src/shared/audio/precisionScore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Combine rhythmic delta (ms) and pitch cents into a single 0–100 precision score.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
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
    "id": "src-shared-audio-rhythmguard-ts-applylatencycompensation",
    "name": "applyLatencyCompensation",
    "path": "src/shared/audio/rhythmGuard.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Nearest grid subdivision instant to a vocal onset, in session-relative seconds, and signed delta in milliseconds (positive = late vs target). `latencyCompensationMs` is subtracted from the raw onset offset so measured microphone delay does not inflate \"late\" judgements (see scales mic pipeline).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-rhythmguard-ts-beats-per-measure",
    "name": "BEATS_PER_MEASURE",
    "path": "src/shared/audio/rhythmGuard.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Nearest grid subdivision instant to a vocal onset, in session-relative seconds, and signed delta in milliseconds (positive = late vs target). `latencyCompensationMs` is subtracted from the raw onset offset so measured microphone delay does not inflate \"late\" judgements (see scales mic pipeline).",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-rhythmguard-ts-expectednotecountforexercise",
    "name": "expectedNoteCountForExercise",
    "path": "src/shared/audio/rhythmGuard.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Nearest grid subdivision instant to a vocal onset, in session-relative seconds, and signed delta in milliseconds (positive = late vs target). `latencyCompensationMs` is subtracted from the raw onset offset so measured microphone delay does not inflate \"late\" judgements (see scales mic pipeline).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-rhythmguard-ts-nearestgridtargetsec",
    "name": "nearestGridTargetSec",
    "path": "src/shared/audio/rhythmGuard.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Absolute session time → nearest click target within [0, totalDuration].",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-rhythmguard-ts-nearestrhythmhit",
    "name": "NearestRhythmHit",
    "path": "src/shared/audio/rhythmGuard.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Nearest grid subdivision instant to a vocal onset, in session-relative seconds, and signed delta in milliseconds (positive = late vs target). `latencyCompensationMs` is subtracted from the raw onset offset so measured microphone delay does not inflate \"late\" judgements (see scales mic pipeline).",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-beats-per-measure",
    "name": "BEATS_PER_MEASURE",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "4/4 subdivision clock: binary (quarter/eighth/sixteenth) and triplet eighth grids. Uses AudioContext.currentTime for scheduling oscillator clicks.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-buildclickschedule",
    "name": "buildClickSchedule",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Schedule click times (seconds from session start) for metronome playback.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-clampbpm",
    "name": "clampBpm",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "4/4 subdivision clock: binary (quarter/eighth/sixteenth) and triplet eighth grids. Uses AudioContext.currentTime for scheduling oscillator clicks.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-clickschedule",
    "name": "ClickSchedule",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "4/4 subdivision clock: binary (quarter/eighth/sixteenth) and triplet eighth grids. Uses AudioContext.currentTime for scheduling oscillator clicks.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-runmetronomeloopoptions",
    "name": "RunMetronomeLoopOptions",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "4/4 subdivision clock: binary (quarter/eighth/sixteenth) and triplet eighth grids. Uses AudioContext.currentTime for scheduling oscillator clicks.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-schedulemetronomeclicks",
    "name": "scheduleMetronomeClicks",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Schedule clicks starting at `startAudioTime`. Returns cancel function.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-slotdurationsec",
    "name": "slotDurationSec",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Duration of one subdivision slot in seconds.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-slotspermeasure",
    "name": "slotsPerMeasure",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Number of metronome pulses per measure for a uniform grid.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-singintimeclock-ts-subdivisiongrid",
    "name": "SubdivisionGrid",
    "path": "src/shared/audio/singInTimeClock.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "4/4 subdivision clock: binary (quarter/eighth/sixteenth) and triplet eighth grids. Uses AudioContext.currentTime for scheduling oscillator clicks.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-vocalduetplayback-ts-guidetone",
    "name": "GuideTone",
    "path": "src/shared/audio/vocalDuetPlayback.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Vocal duet playback: user recording on left, sine tones on right (parity with Melodia duet helper).",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-vocalduetplayback-ts-playvocalwithsineguide",
    "name": "playVocalWithSineGuide",
    "path": "src/shared/audio/vocalDuetPlayback.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Vocal duet playback: user recording on left, sine tones on right (parity with Melodia duet helper).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-vocalduetplayback-ts-vocalduethandle",
    "name": "VocalDuetHandle",
    "path": "src/shared/audio/vocalDuetPlayback.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Vocal duet playback: user recording on left, sine tones on right (parity with Melodia duet helper).",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-wakelock-ts-releasewakelock",
    "name": "releaseWakeLock",
    "path": "src/shared/audio/wakeLock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Screen Wake Lock utility for music apps. Prevents the device screen from dimming/locking during active playback. Uses the Screen Wake Lock API where available and gracefully no-ops on unsupported browsers. The lock is automatically re-acquired when the tab regains visibility, since browsers release the sentinel when a tab is hidden.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-wakelock-ts-requestwakelock",
    "name": "requestWakeLock",
    "path": "src/shared/audio/wakeLock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Screen Wake Lock utility for music apps. Prevents the device screen from dimming/locking during active playback. Uses the Screen Wake Lock API where available and gracefully no-ops on unsupported browsers. The lock is automatically re-acquired when the tab regains visibility, since browsers release the sentinel when a tab is hidden.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
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
    "id": "src-shared-components-anchoredpopover-tsx-anchoredpopover",
    "name": "AnchoredPopover",
    "path": "src/shared/components/AnchoredPopover.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Thin wrapper around MUI `Popover` that bakes in the two most common placement patterns used across apps so each app no longer re-specifies `anchorOrigin` / `transformOrigin` / `slotProps.paper.className`. Adopt this primitive in new code; migrate existing call sites opportunistically. See `src/shared/SHARED_UI_CONVENTIONS.md` for the current adoption status.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-anchoredpopover-tsx-anchoredpopoverplacement",
    "name": "AnchoredPopoverPlacement",
    "path": "src/shared/components/AnchoredPopover.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-anchoredpopover-tsx-anchoredpopoverprops",
    "name": "AnchoredPopoverProps",
    "path": "src/shared/components/AnchoredPopover.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "beat"
    ],
    "exportType": "interface",
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
    "id": "src-shared-components-dragdropfileupload-tsx-dragdropfileupload",
    "name": "DragDropFileUpload",
    "path": "src/shared/components/DragDropFileUpload.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared drag-and-drop file uploader. - Click anywhere on the zone (or focus + Enter / Space) opens the OS picker. - Drag-over highlights the zone; drop calls `onFiles` with the dropped files filtered against `accept` (mime + extension). - Keyboard accessible; renders a hidden `<input type=\"file\">` so the click / keyboard fallbacks both work. Reused across Encore's bulk-score and bulk-performance-video imports; extracted here so other apps can adopt the same UX in one line. Surfaces use the theme primary/secondary palette so Encore’s fuchsia/violet tokens read as one calm drop target (not a generic grey slab).",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-dragdropfileupload-tsx-dragdropfileuploadprops",
    "name": "DragDropFileUploadProps",
    "path": "src/shared/components/DragDropFileUpload.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared drag-and-drop file uploader. - Click anywhere on the zone (or focus + Enter / Space) opens the OS picker. - Drag-over highlights the zone; drop calls `onFiles` with the dropped files filtered against `accept` (mime + extension). - Keyboard accessible; renders a hidden `<input type=\"file\">` so the click / keyboard fallbacks both work. Reused across Encore's bulk-score and bulk-performance-video imports; extracted here so other apps can adopt the same UX in one line. Surfaces use the theme primary/secondary palette so Encore’s fuchsia/violet tokens read as one calm drop target (not a generic grey slab).",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-inputsourcesmenu-tsx-inputsourcesmenu",
    "name": "InputSourcesMenu",
    "path": "src/shared/components/InputSourcesMenu.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared \"input sources\" menu used by the piano and scales apps. Renders a chip-shaped trigger summarizing the current MIDI + microphone state, plus a popover panel with rows for each source and (optionally) a microphone device selector. All copy, layout, spacing, typography, and state-derived labels live in this component so both apps stay visually in lockstep. Apps are expected to pass *state only* (connected devices, toggle callbacks) — they should not restate status text, hint text, or trigger labels. Visuals follow Material 3 tokens: 32dp pill trigger, 48dp rows, 36dp circular icon badges, level-2 menu elevation, labelMedium/titleSmall/ bodySmall type scale.",
    "tags": [
      "components",
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
    "id": "src-shared-components-inputsourcesmenu-tsx-inputsourcesmenuprops",
    "name": "InputSourcesMenuProps",
    "path": "src/shared/components/InputSourcesMenu.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared \"input sources\" menu used by the piano and scales apps. Renders a chip-shaped trigger summarizing the current MIDI + microphone state, plus a popover panel with rows for each source and (optionally) a microphone device selector. All copy, layout, spacing, typography, and state-derived labels live in this component so both apps stay visually in lockstep. Apps are expected to pass *state only* (connected devices, toggle callbacks) — they should not restate status text, hint text, or trigger labels. Visuals follow Material 3 tokens: 32dp pill trigger, 48dp rows, 36dp circular icon badges, level-2 menu elevation, labelMedium/titleSmall/ bodySmall type scale.",
    "tags": [
      "components",
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
    "id": "src-shared-components-inputsourcesmenu-tsx-midideviceentry",
    "name": "MidiDeviceEntry",
    "path": "src/shared/components/InputSourcesMenu.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "A single MIDI device entry. Rows are rendered only for connected devices.",
    "tags": [
      "components",
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
    "id": "src-shared-components-labsdebugdock-tsx-labsdebugdock",
    "name": "LabsDebugDock",
    "path": "src/shared/components/LabsDebugDock.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared chrome for URL-gated debug UIs: collapse, copy JSON bundle for LLM/IDE paste, app label.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums",
      "piano"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-labsdebugdock-tsx-labsdebugdocklayout",
    "name": "LabsDebugDockLayout",
    "path": "src/shared/components/LabsDebugDock.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums",
      "piano"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-labsdebugdock-tsx-labsdebugdockprops",
    "name": "LabsDebugDockProps",
    "path": "src/shared/components/LabsDebugDock.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums",
      "piano"
    ],
    "exportType": "type",
    "demoId": null
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
    "id": "src-shared-components-skiptomain-tsx-skiptomain",
    "name": "SkipToMain",
    "path": "src/shared/components/SkipToMain.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "A visually-hidden-until-focused skip link. Render as the first focusable element in an app so keyboard/screen-reader users can bypass repeated navigation and jump straight to the app's primary `<main id=\"main\">` landmark. Styling lives in `public/styles/shared.css` (`.skip-to-main`) so every app that links the shared baseline picks it up without additional CSS wiring.",
    "tags": [
      "components",
      "api",
      "react"
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
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-debug-copylabsdebugbundle-ts-buildlabsdebugbundle",
    "name": "buildLabsDebugBundle",
    "path": "src/shared/debug/copyLabsDebugBundle.ts",
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
    "id": "src-shared-debug-copylabsdebugbundle-ts-copylabsdebugbundletoclipboard",
    "name": "copyLabsDebugBundleToClipboard",
    "path": "src/shared/debug/copyLabsDebugBundle.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Serializes a small JSON bundle for pasting into an IDE or LLM session.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-copylabsdebugbundle-ts-labsdebugbundle",
    "name": "LabsDebugBundle",
    "path": "src/shared/debug/copyLabsDebugBundle.ts",
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
    "id": "src-shared-debug-debuglogpostbody-ts-debuglogpostentry",
    "name": "DebugLogPostEntry",
    "path": "src/shared/debug/debugLogPostBody.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalizes POST bodies sent to Vite's `/__debug_log` middleware. Supports: - Batched `{ logs: [...] }` from ../utils/serverLogger.ts ServerLogger - Single-object payloads (e.g. cats index.html early error hook)",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-debug-debuglogpostbody-ts-parsedebuglogpostbody",
    "name": "parseDebugLogPostBody",
    "path": "src/shared/debug/debugLogPostBody.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parses JSON body from `/__debug_log` into zero or more log lines to print.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-debuglogpostbody-ts-printdebuglogentriestoconsole",
    "name": "printDebugLogEntriesToConsole",
    "path": "src/shared/debug/debugLogPostBody.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Prints one batch of entries to the Node console (used by Vite dev middleware).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-labsdebuglog-ts-labsdebug",
    "name": "labsDebug",
    "path": "src/shared/debug/labsDebugLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Structured debug logging for labs apps. When `?debug` or `?dev` is enabled in dev, messages go to the browser console and to ../utils/serverLogger.ts ServerLogger (Vite `/__debug_log`). Use for non-hot-path diagnostics; keep payloads small.",
    "tags": [],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-debug-practicedebugpanelshared-ts-practice-debug-clear-button-style",
    "name": "PRACTICE_DEBUG_CLEAR_BUTTON_STYLE",
    "path": "src/shared/debug/practiceDebugPanelShared.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared UI bits for piano/scales practice debug docks (jscpd dedupe target).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-debug-practicedebugpanelshared-ts-practice-debug-empty-message",
    "name": "PRACTICE_DEBUG_EMPTY_MESSAGE",
    "path": "src/shared/debug/practiceDebugPanelShared.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared UI bits for piano/scales practice debug docks (jscpd dedupe target).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-debug-practicedebugpanelshared-ts-practice-debug-event-colors",
    "name": "PRACTICE_DEBUG_EVENT_COLORS",
    "path": "src/shared/debug/practiceDebugPanelShared.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared UI bits for piano/scales practice debug docks (jscpd dedupe target).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-debug-practicedebugpanelshared-ts-practicedebugmiditoname",
    "name": "practiceDebugMidiToName",
    "path": "src/shared/debug/practiceDebugPanelShared.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared UI bits for piano/scales practice debug docks (jscpd dedupe target).",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-readlabsdebugparams-ts-islabsdebugenabled",
    "name": "isLabsDebugEnabled",
    "path": "src/shared/debug/readLabsDebugParams.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when `debug` and/or `dev` is set in a way that enables labs debug tooling. - `?debug`, `?debug=`, `?debug=1`, `?debug=true`, … → on - `?dev=1` (cats legacy) → on - `?debug=false`, `?debug=0`, … → off",
    "tags": [],
    "appsUsing": [
      "cats",
      "drums",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-readlabsdebugparams-ts-islabsoverlayenabled",
    "name": "isLabsOverlayEnabled",
    "path": "src/shared/debug/readLabsDebugParams.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cats-style overlay flag (`?overlay=1` / `?overlay=true`).",
    "tags": [],
    "appsUsing": [
      "cats",
      "drums",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-readlabsdebugparams-ts-readlabsdebugfromlocation",
    "name": "readLabsDebugFromLocation",
    "path": "src/shared/debug/readLabsDebugParams.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Read from the browser location; safe to call when `window` is undefined (SSR/tests).",
    "tags": [],
    "appsUsing": [
      "cats",
      "drums",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-usepracticedebuglogeffects-ts-usepracticedebuglogpoll",
    "name": "usePracticeDebugLogPoll",
    "path": "src/shared/debug/usePracticeDebugLogEffects.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Poll practice debug log at 200ms (piano + scales debug docks). Pass a `useCallback` tick.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-debug-usepracticedebuglogeffects-ts-usepracticedebuglogscrolltoend",
    "name": "usePracticeDebugLogScrollToEnd",
    "path": "src/shared/debug/usePracticeDebugLogEffects.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Keep a fixed-height log scrolled to the latest line.",
    "tags": [],
    "appsUsing": [
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drawing-catmullrombezier-ts-catmullrompath",
    "name": "catmullRomPath",
    "path": "src/shared/drawing/catmullRomBezier.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Catmull-Rom spline as SVG path (same algorithm as MelodiaInkTrace.utils).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-islabslocalhost",
    "name": "isLabsLocalHost",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-labs-analytics-consent-accepted",
    "name": "LABS_ANALYTICS_CONSENT_ACCEPTED",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-labs-analytics-consent-declined",
    "name": "LABS_ANALYTICS_CONSENT_DECLINED",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-labs-analytics-consent-storage-key",
    "name": "LABS_ANALYTICS_CONSENT_STORAGE_KEY",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-labs-analytics-script-path",
    "name": "LABS_ANALYTICS_SCRIPT_PATH",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "GA loader script (only injected after consent).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-labscookiebannercopy",
    "name": "labsCookieBannerCopy",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-labscookiebannerpreviewrequested",
    "name": "labsCookieBannerPreviewRequested",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when the URL search string includes the preview flag (leading ? optional).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-shoulddeferbanneruntildomcontentloaded",
    "name": "shouldDeferBannerUntilDomContentLoaded",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-shouldexitcookiescriptbeforestorage",
    "name": "shouldExitCookieScriptBeforeStorage",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "First gate in the browser script: on localhost/127 without preview, exit before reading storage (no banner, no GA — dev default).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-shouldloadanalyticsforstoredchoice",
    "name": "shouldLoadAnalyticsForStoredChoice",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-legal-labscookieconsentpolicy-ts-shouldstopwithoutanalyticsforstoredchoice",
    "name": "shouldStopWithoutAnalyticsForStoredChoice",
    "path": "src/shared/legal/labsCookieConsentPolicy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js). **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored. The Vite dev server and `vite build` rebuild it automatically when this file or `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off build without Vite: `npm run build:labs-cookie-consent`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
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
    "id": "src-shared-music-chordstylingcompatibility-ts-getcompatiblestylingstrategies",
    "name": "getCompatibleStylingStrategies",
    "path": "src/shared/music/chordStylingCompatibility.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Gets all styling strategies compatible with a time signature.",
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
    "id": "src-shared-music-chordstylingcompatibility-ts-isstrategycompatiblewithtimesignature",
    "name": "isStrategyCompatibleWithTimeSignature",
    "path": "src/shared/music/chordStylingCompatibility.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Returns true when the given strategy has at least one pattern defined for the given time signature.",
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
    "id": "src-shared-music-chordstylingstrategies-ts-chord-styling-strategies",
    "name": "CHORD_STYLING_STRATEGIES",
    "path": "src/shared/music/chordStylingStrategies.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Time-signature-aware metadata for chord styling strategies. The underlying pattern strings live in `chordStylingPatterns.ts`; this module exposes which time signatures each strategy supports so pickers can filter options and callers can validate user choices. Credit: Strategy taxonomy inspired by the Piano for Singers course by Brenda Earle Stokes — https://pianoandvoicewithbrenda.com/piano-for-singers-the-complete-guide/",
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
    "id": "src-shared-music-chordstylingstrategies-ts-chordstylingstrategyconfig",
    "name": "ChordStylingStrategyConfig",
    "path": "src/shared/music/chordStylingStrategies.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Time-signature-aware metadata for chord styling strategies. The underlying pattern strings live in `chordStylingPatterns.ts`; this module exposes which time signatures each strategy supports so pickers can filter options and callers can validate user choices. Credit: Strategy taxonomy inspired by the Piano for Singers course by Brenda Earle Stokes — https://pianoandvoicewithbrenda.com/piano-for-singers-the-complete-guide/",
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
    "id": "src-shared-music-chordstylingstrategies-ts-getavailablechordstyletimesignatures",
    "name": "getAvailableChordStyleTimeSignatures",
    "path": "src/shared/music/chordStylingStrategies.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Returns the de-duplicated set of time signatures that at least one chord styling strategy supports, sorted by denominator then numerator.",
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
    "id": "src-shared-music-drumrhythmmidievents-ts-builddrummidieventsfromparsedrhythm",
    "name": "buildDrumMidiEventsFromParsedRhythm",
    "path": "src/shared/music/drumRhythmMidiEvents.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "GM drum-map MIDI events (channel 9) for a parsed rhythm, repeated `loopCount` times. Used by drums and words export adapters (same layout as legacy per-app copies).",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
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
    "id": "src-shared-music-importscore-ts-importformat",
    "name": "ImportFormat",
    "path": "src/shared/music/importScore.ts",
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
    "id": "src-shared-music-importscore-ts-importprogress",
    "name": "ImportProgress",
    "path": "src/shared/music/importScore.ts",
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
    "id": "src-shared-music-importscore-ts-importresult",
    "name": "ImportResult",
    "path": "src/shared/music/importScore.ts",
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
    "id": "src-shared-music-importscore-ts-importscore",
    "name": "importScore",
    "path": "src/shared/music/importScore.ts",
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
    "id": "src-shared-music-melodiapipeline-categorize-ts-bucketformaxinterval",
    "name": "bucketForMaxInterval",
    "path": "src/shared/music/melodiaPipeline/categorize.ts",
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
    "id": "src-shared-music-melodiapipeline-categorize-ts-categorizecorpus",
    "name": "categorizeCorpus",
    "path": "src/shared/music/melodiaPipeline/categorize.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Categorize a list of exercises into difficulty buckets and produce a `linearPath.json`-shaped output. Exercises flagged for manual review are **excluded** from `exerciseIds`/`buckets` (still preserved in `categorized` for diagnostics). Default ordering: stepwise → thirds → fourths → mixed; within a bucket, preserve incoming order (which the caller can pre-sort by id, level, etc.).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-categorize-ts-categorizedentry",
    "name": "CategorizedEntry",
    "path": "src/shared/music/melodiaPipeline/categorize.ts",
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
    "id": "src-shared-music-melodiapipeline-categorize-ts-categorizeexercise",
    "name": "categorizeExercise",
    "path": "src/shared/music/melodiaPipeline/categorize.ts",
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
    "id": "src-shared-music-melodiapipeline-categorize-ts-difficultybucket",
    "name": "DifficultyBucket",
    "path": "src/shared/music/melodiaPipeline/categorize.ts",
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
    "id": "src-shared-music-melodiapipeline-categorize-ts-linearpathoutput",
    "name": "LinearPathOutput",
    "path": "src/shared/music/melodiaPipeline/categorize.ts",
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
    "id": "src-shared-music-melodiapipeline-categorize-ts-maxmelodicintervalsemitones",
    "name": "maxMelodicIntervalSemitones",
    "path": "src/shared/music/melodiaPipeline/categorize.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Returns the largest absolute melodic interval (semitones) between consecutive sounded notes in the melody part. Rests reset the previous pitch so jumps across rests do not inflate the bucket.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-hrmf-ts-collectpitchsequence",
    "name": "collectPitchSequence",
    "path": "src/shared/music/melodiaPipeline/hrmf.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Duration token for profile, e.g. `quarter`, `eighth+dotted`",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-hrmf-ts-collectrhythmicprofile",
    "name": "collectRhythmicProfile",
    "path": "src/shared/music/melodiaPipeline/hrmf.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Duration token for profile, e.g. `quarter`, `eighth+dotted`",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-hrmf-ts-durationtoken",
    "name": "durationToken",
    "path": "src/shared/music/melodiaPipeline/hrmf.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Duration token for profile, e.g. `quarter`, `eighth+dotted`",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-hrmf-ts-pianoscoretohrmf",
    "name": "pianoScoreToHrmf",
    "path": "src/shared/music/melodiaPipeline/hrmf.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Human-readable music format: `{num}/{den}|m1|m2|...` where each measure is space-separated `{pitches}({beats})` events; beats are in quarter-note units.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-normalize-ts-decomposedeficittorests",
    "name": "decomposeDeficitToRests",
    "path": "src/shared/music/melodiaPipeline/normalize.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Greedily decompose `deficit` quarter-beats into a list of rest tokens drawn from `REST_DURATIONS` (largest-first). Always terminates because the smallest token is `sixteenth` (0.25 beats); deficits not divisible by 0.25 are floored — but those typically only come from validator-reported errors and we'd rather emit a slightly-shorter measure than spin forever.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-normalize-ts-normalizeoptions",
    "name": "NormalizeOptions",
    "path": "src/shared/music/melodiaPipeline/normalize.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-normalize-ts-normalizepianoscore",
    "name": "normalizePianoScore",
    "path": "src/shared/music/melodiaPipeline/normalize.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-partutils-ts-pickmelodypart",
    "name": "pickMelodyPart",
    "path": "src/shared/music/melodiaPipeline/partUtils.ts",
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
    "id": "src-shared-music-melodiapipeline-types-ts-melodiacurriculumexercise",
    "name": "MelodiaCurriculumExercise",
    "path": "src/shared/music/melodiaPipeline/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "One row in the shipped Melodia curriculum (learner app).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-types-ts-normalizedmelodiaexercise",
    "name": "NormalizedMelodiaExercise",
    "path": "src/shared/music/melodiaPipeline/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Output of the MusicXML ingest / normalization step (pipeline + JSON on disk).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-types-ts-pedagogicalflag",
    "name": "PedagogicalFlag",
    "path": "src/shared/music/melodiaPipeline/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-types-ts-pedagogicalflagcode",
    "name": "PedagogicalFlagCode",
    "path": "src/shared/music/melodiaPipeline/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-types-ts-pedagogicalseverity",
    "name": "PedagogicalSeverity",
    "path": "src/shared/music/melodiaPipeline/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-melodiapipeline-validators-ts-comparetwonormalizations",
    "name": "compareTwoNormalizations",
    "path": "src/shared/music/melodiaPipeline/validators.ts",
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
    "id": "src-shared-music-melodiapipeline-validators-ts-detectintervaloutliers",
    "name": "detectIntervalOutliers",
    "path": "src/shared/music/melodiaPipeline/validators.ts",
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
    "id": "src-shared-music-melodiapipeline-validators-ts-infersuspiciousaccidentals",
    "name": "inferSuspiciousAccidentals",
    "path": "src/shared/music/melodiaPipeline/validators.ts",
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
    "id": "src-shared-music-melodiapipeline-validators-ts-runallmelodiavalidators",
    "name": "runAllMelodiaValidators",
    "path": "src/shared/music/melodiaPipeline/validators.ts",
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
    "id": "src-shared-music-melodiapipeline-validators-ts-validatemeasureintegrity",
    "name": "validateMeasureIntegrity",
    "path": "src/shared/music/melodiaPipeline/validators.ts",
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
    "id": "src-shared-music-melodiavexfirstmeasure-ts-drawmelodiafirstmeasurepreview",
    "name": "drawMelodiaFirstMeasurePreview",
    "path": "src/shared/music/melodiaVexFirstMeasure.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Renders the first measure of the melody part into `container` (replaces inner HTML).",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "ui"
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
    "id": "src-shared-music-parsemidi-ts-midiendoftrackevent",
    "name": "MidiEndOfTrackEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-midievent",
    "name": "MidiEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-midifile",
    "name": "MidiFile",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-midikeysignatureevent",
    "name": "MidiKeySignatureEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-midinoteoffevent",
    "name": "MidiNoteOffEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-midinoteonevent",
    "name": "MidiNoteOnEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-midisettempoevent",
    "name": "MidiSetTempoEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-miditimesignatureevent",
    "name": "MidiTimeSignatureEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-miditracknameevent",
    "name": "MidiTrackNameEvent",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemidi-ts-parsemidi",
    "name": "parseMidi",
    "path": "src/shared/music/parseMidi.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Minimal types mirroring midi-json-parser-worker's output, so the core logic can be tested without the web-worker dependency.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemusicxml-ts-parsedsections",
    "name": "ParsedSections",
    "path": "src/shared/music/parseMusicXml.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemusicxml-ts-parsemusicxml",
    "name": "parseMusicXml",
    "path": "src/shared/music/parseMusicXml.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-parsemusicxml-ts-parsemusicxmlfromdocument",
    "name": "parseMusicXmlFromDocument",
    "path": "src/shared/music/parseMusicXml.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Parse partwise MusicXML from an existing (browser DOM or Node linkedom/happy-dom).",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-acousticinput-ts-acousticinput",
    "name": "AcousticInput",
    "path": "src/shared/music/pitch/acousticInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Thin lifecycle wrapper around . Each app used to maintain its own copy (`src/piano/utils/acousticInput.ts`, `src/scales/utils/acousticInput.ts`) which drifted subtly over time. Use this factory so both apps stay on the same semantics.",
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
    "id": "src-shared-music-pitch-acousticinput-ts-acousticinputcallbacks",
    "name": "AcousticInputCallbacks",
    "path": "src/shared/music/pitch/acousticInput.ts",
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
    "id": "src-shared-music-pitch-acousticinput-ts-acousticinputdebughooks",
    "name": "AcousticInputDebugHooks",
    "path": "src/shared/music/pitch/acousticInput.ts",
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
    "id": "src-shared-music-pitch-acousticinput-ts-acousticinputfactoryoptions",
    "name": "AcousticInputFactoryOptions",
    "path": "src/shared/music/pitch/acousticInput.ts",
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
    "appsUsing": [],
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
    "appsUsing": [],
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
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-pitch-microphonepitchinput-ts-microphonepitchinputoptions",
    "name": "MicrophonePitchInputOptions",
    "path": "src/shared/music/pitch/microphonePitchInput.ts",
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
    "id": "src-shared-music-scales-ts-scalevariant",
    "name": "ScaleVariant",
    "path": "src/shared/music/scales.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Variant of a minor scale. `natural` is the default (and the only variant that applies when `quality === 'major'`); `harmonic` and `melodic` are minor-only. Direction asymmetry of melodic minor: The melodic minor scale is *direction-dependent* by historical convention. Ascending uses raised 6 + raised 7 (like a major scale with a flat 3rd); descending reverts to natural minor. This means a single `melodic-minor` scale plays *different note sets* on the way up versus the way down — the only built-in scale form in this codebase that does so. Future contributors: do NOT collapse this into a single interval array. The asymmetry is musical, not a bug.",
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "appsUsing": [
      "piano"
    ],
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
    "id": "src-shared-practice-pitchmatch-ts-deriveoctaveoffsetforhand",
    "name": "deriveOctaveOffsetForHand",
    "path": "src/shared/practice/pitchMatch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Like , but when both hands are playing the same pitch classes at different octaves we need to split the played bag by which octave belongs to which hand. Pass `prefer: 'highest'` to anchor the right hand to the topmost pitch-class match, or `prefer: 'lowest'` to anchor the left hand to the bottommost. Returns null when no pitch class of `played` matches any of `expectedPitches`.",
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
    "id": "src-shared-rhythm-presetintegrity-ts-collectrhythmpresetintegrityissues",
    "name": "collectRhythmPresetIntegrityIssues",
    "path": "src/shared/rhythm/presetIntegrity.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Returns human-readable issues (empty when the database passes all checks).",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetintegrity-ts-getpresetreferencenotation",
    "name": "getPresetReferenceNotation",
    "path": "src/shared/rhythm/presetIntegrity.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Reference skeleton for a variation: native base, 2/4 mapping, doubled 4/4 mapping, or 6/8 pattern.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetintegrity-ts-referenceattackskeletonmatches",
    "name": "referenceAttackSkeletonMatches",
    "path": "src/shared/rhythm/presetIntegrity.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "True if every reference stroke onset (dum/tak/ka/slap) lines up with the same stroke at that tick in the variant. Extra ornamental attacks between reference onsets are allowed (e.g. ka inside a long dum in the ASCII notation).",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-test-mocks-audio-ts-createmockaudiocontext",
    "name": "createMockAudioContext",
    "path": "src/shared/test/mocks/audio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Canonical AudioContext / OfflineAudioContext mocks for tests. Re-exports the long-standing helpers in `src/shared/audio/__test__/mockAudioContext.ts` and adds an OfflineAudioContext factory used by rendering tests. Prefer these over hand-rolling per-test mocks so assertions stay stable as the real audio layer evolves.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-audio-ts-createmockgainnode",
    "name": "createMockGainNode",
    "path": "src/shared/test/mocks/audio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Canonical AudioContext / OfflineAudioContext mocks for tests. Re-exports the long-standing helpers in `src/shared/audio/__test__/mockAudioContext.ts` and adds an OfflineAudioContext factory used by rendering tests. Prefer these over hand-rolling per-test mocks so assertions stay stable as the real audio layer evolves.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-audio-ts-createmockofflineaudiocontext",
    "name": "createMockOfflineAudioContext",
    "path": "src/shared/test/mocks/audio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimal OfflineAudioContext fake. Enough for \"did rendering complete?\" style tests; do not use for numerical DSP assertions.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-audio-ts-createmocksourcenode",
    "name": "createMockSourceNode",
    "path": "src/shared/test/mocks/audio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Canonical AudioContext / OfflineAudioContext mocks for tests. Re-exports the long-standing helpers in `src/shared/audio/__test__/mockAudioContext.ts` and adds an OfflineAudioContext factory used by rendering tests. Prefer these over hand-rolling per-test mocks so assertions stay stable as the real audio layer evolves.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-audio-ts-mockaudiocontext",
    "name": "MockAudioContext",
    "path": "src/shared/test/mocks/audio.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Canonical AudioContext / OfflineAudioContext mocks for tests. Re-exports the long-standing helpers in `src/shared/audio/__test__/mockAudioContext.ts` and adds an OfflineAudioContext factory used by rendering tests. Prefer these over hand-rolling per-test mocks so assertions stay stable as the real audio layer evolves.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-audio-ts-mockofflineaudiocontext",
    "name": "MockOfflineAudioContext",
    "path": "src/shared/test/mocks/audio.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Canonical AudioContext / OfflineAudioContext mocks for tests. Re-exports the long-standing helpers in `src/shared/audio/__test__/mockAudioContext.ts` and adds an OfflineAudioContext factory used by rendering tests. Prefer these over hand-rolling per-test mocks so assertions stay stable as the real audio layer evolves.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-fetch-ts-mockfetch",
    "name": "mockFetch",
    "path": "src/shared/test/mocks/fetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Install a mocked global `fetch` that resolves to a configurable JSON body. ```ts import { mockFetch } from '../../shared/test/mocks/fetch'; beforeEach(() => { mockFetch({ status: 'ok' }); }); ``` Returns the underlying mock so tests can assert on calls or override the implementation for specific URLs.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-fetch-ts-restorefetch",
    "name": "restoreFetch",
    "path": "src/shared/test/mocks/fetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Restore whatever `fetch` was present before a test mocked it. Pair with a `const original = globalThis.fetch` snapshot in `beforeEach`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-mocks-lazy-ts-synchronouslazystub",
    "name": "synchronousLazyStub",
    "path": "src/shared/test/mocks/lazy.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Create a synchronous stand-in for a `React.lazy`-loaded component. Use this to neutralize the dynamic-import tax in unit tests where the lazy-load behavior is not under test. ```ts import { synchronousLazyStub } from '../../shared/test/mocks/lazy'; vi.mock('./BeatChart', () => ({ default: synchronousLazyStub<{}>('BeatChart'), })); ``` The returned component renders a minimal DOM node so presence assertions still work. Pass a custom renderer when the surrounding test needs to observe specific markup from the lazy subtree. This helper is intentionally tiny; it exists to make the pattern discoverable and uniform across apps. Long-form migration for story/App.test.tsx, piano/ImportModal.test.tsx, drums/App.test.tsx, and zines/App.test.tsx is tracked in Phase 1 of the codebase-health plan.",
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
    "id": "src-shared-undo-islabsundohotkeysuppressedtarget-ts-islabsundohotkeysuppressedtarget",
    "name": "isLabsUndoHotkeySuppressedTarget",
    "path": "src/shared/undo/isLabsUndoHotkeySuppressedTarget.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "When true, Encore/Labs app-level undo should not run so the browser or widget can handle ⌘Z / Ctrl+Z (e.g. text field typing undo).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundocontext-tsx-labsundocommit",
    "name": "LabsUndoCommit",
    "path": "src/shared/undo/LabsUndoContext.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundocontext-tsx-labsundocontextvalue",
    "name": "LabsUndoContextValue",
    "path": "src/shared/undo/LabsUndoContext.tsx",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundocontext-tsx-labsundoprovider",
    "name": "LabsUndoProvider",
    "path": "src/shared/undo/LabsUndoContext.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundocontext-tsx-uselabsundo",
    "name": "useLabsUndo",
    "path": "src/shared/undo/LabsUndoContext.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundostack-ts-combineundocommits",
    "name": "combineUndoCommits",
    "path": "src/shared/undo/labsUndoStack.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Combine many small commits into a single undo entry. Pass an async function that receives a `queue`; call `queue.push({ undo, redo })` for each individual mutation as it commits. After the function resolves, the collected entries are folded into a single commit on the stack so the user undoes them as one action. Order semantics: - On undo, individual commits are reversed in *reverse* order (LIFO), so the last write is undone first. This matches a sequential redo of the original operations. - On redo, individual commits are replayed in their original (FIFO) order. If the function throws, partial entries are *not* committed (caller is responsible for any compensating cleanup). If the function pushes zero entries, nothing is added to the stack.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundostack-ts-createlabsundostack",
    "name": "createLabsUndoStack",
    "path": "src/shared/undo/labsUndoStack.ts",
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
    "id": "src-shared-undo-labsundostack-ts-labsundobatchqueue",
    "name": "LabsUndoBatchQueue",
    "path": "src/shared/undo/labsUndoStack.ts",
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
    "id": "src-shared-undo-labsundostack-ts-labsundocommit",
    "name": "LabsUndoCommit",
    "path": "src/shared/undo/labsUndoStack.ts",
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
    "id": "src-shared-undo-labsundostack-ts-labsundostack",
    "name": "LabsUndoStack",
    "path": "src/shared/undo/labsUndoStack.ts",
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
    "id": "src-shared-undo-labsundostack-ts-labsundostacksnapshot",
    "name": "LabsUndoStackSnapshot",
    "path": "src/shared/undo/labsUndoStack.ts",
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
    "id": "src-shared-utils-devlog-ts-devlog",
    "name": "devLog",
    "path": "src/shared/utils/devLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Dev-only diagnostic console logger. Verbose traces (beat grid alignment, drift correction, gap filtering, etc.) are valuable while developing but should not ship to production consoles or telemetry. `devLog` writes to `console.log` in dev builds and no-ops in production — no runtime branching at each call site. Prefer this over `console.log` anywhere the `no-console` ESLint rule fires for intentional debug output. For user-visible warnings keep `console.warn` / `console.error`, which the rule already allows.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "beat"
    ],
    "exportType": "const",
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
