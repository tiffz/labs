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
    "exportType": "named",
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
    "appsUsing": [],
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
    "appsUsing": [],
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
    "appsUsing": [],
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
      "chords",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-getcompensateddetune-ts-getcompensateddetune",
    "name": "getCompensatedDetune",
    "path": "src/shared/audio/getCompensatedDetune.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Compensate pitch shift induced by playback-rate changes on an `AudioBufferSourceNode`. `AudioBufferSourceNode.detune` is in cents; changing `playbackRate` also shifts perceived pitch by `1200 * log2(rate)` cents. This returns the detune value so net pitch matches `transposeSemitones` at the given playback rate (same formula as Find the Beat / `useBeatSync`).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-audio-mediatransposemirror-ts-mediatransposemirror",
    "name": "MediaTransposeMirror",
    "path": "src/shared/audio/mediaTransposeMirror.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Plays a decoded local track through `AudioBufferSourceNode` (detune) while the `<audio>` / `<video>` element stays the transport clock (often silent: `volume = 0`).",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
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
    "id": "src-shared-auth-hashemail-ts-isemailhashallowed",
    "name": "isEmailHashAllowed",
    "path": "src/shared/auth/hashEmail.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalize email before hashing (lowercase + trim).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-auth-hashemail-ts-normalizeemailforhash",
    "name": "normalizeEmailForHash",
    "path": "src/shared/auth/hashEmail.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalize email before hashing (lowercase + trim).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-auth-hashemail-ts-parseallowedemailhashesfromenv",
    "name": "parseAllowedEmailHashesFromEnv",
    "path": "src/shared/auth/hashEmail.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parse comma-separated hex hashes from env (empty = no one allowed).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-auth-hashemail-ts-sha256hexofemail",
    "name": "sha256HexOfEmail",
    "path": "src/shared/auth/hashEmail.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SHA-256 hex digest of UTF-8 email (normalized).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysis-ioitempohint-ts-inferquarternotebpmfromonsets",
    "name": "inferQuarterNoteBpmFromOnsets",
    "path": "src/shared/beat/analysis/ioiTempoHint.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Estimate quarter-note BPM from onset times using IOI histogram peaks. Returns null when there is not enough evidence.",
    "tags": [],
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
    "id": "src-shared-beat-analysis-sectionaltempo-ts-analyzesectiontempowindows",
    "name": "analyzeSectionTempoWindows",
    "path": "src/shared/beat/analysis/sectionalTempo.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Analyze tempo variations across overlapping windows.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysis-sectionaltempo-ts-sectiontempowindow",
    "name": "SectionTempoWindow",
    "path": "src/shared/beat/analysis/sectionalTempo.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared sectional tempo analysis utilities.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysis-tempoutils-ts-normalizetorange",
    "name": "normalizeToRange",
    "path": "src/shared/beat/analysis/tempoUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalize BPM to a wide safe range (50-200) for comparison only. This does NOT make octave decisions - it just ensures tempos are in a comparable range for grouping or change detection.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysisversion-ts-analysismetadata",
    "name": "AnalysisMetadata",
    "path": "src/shared/beat/analysisVersion.ts",
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
    "id": "src-shared-beat-analysisversion-ts-beat-analysis-engine-version",
    "name": "BEAT_ANALYSIS_ENGINE_VERSION",
    "path": "src/shared/beat/analysisVersion.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysisversion-ts-beat-analysis-schema-version",
    "name": "BEAT_ANALYSIS_SCHEMA_VERSION",
    "path": "src/shared/beat/analysisVersion.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysisversion-ts-beat-analysis-version",
    "name": "BEAT_ANALYSIS_VERSION",
    "path": "src/shared/beat/analysisVersion.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-beat-analysisversion-ts-isanalysisversionstale",
    "name": "isAnalysisVersionStale",
    "path": "src/shared/beat/analysisVersion.ts",
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
    "id": "src-shared-beat-analysisversion-ts-persistedanalysisbundle",
    "name": "PersistedAnalysisBundle",
    "path": "src/shared/beat/analysisVersion.ts",
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
    "id": "src-shared-beat-beatrefinement-ts-mergebeatgrids",
    "name": "mergeBeatGrids",
    "path": "src/shared/beat/beatRefinement.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Merge beat grids from multiple algorithms Keeps beats that have multi-source support",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-beatrefinement-ts-snapbeatstoonsets",
    "name": "snapBeatsToOnsets",
    "path": "src/shared/beat/beatRefinement.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Snap beats to nearby audio onsets using onset detection",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-bpmaccuracytest-ts-bpmaccuracyresult",
    "name": "BpmAccuracyResult",
    "path": "src/shared/beat/bpmAccuracyTest.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "BPM Accuracy Test Tests our BPM detection accuracy by comparing detected BPM against onset alignment scores. This is a self-contained test that doesn't require ground-truth BPM values. Usage: - Import and call testBpmAccuracy with an AudioBuffer - Or run via browser console for interactive testing The test detects onsets from the audio, then scores how well different BPM values align with those onsets. If a significantly different BPM scores better than our detected BPM, it suggests our detection could be improved.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-bpmaccuracytest-ts-comparebpms",
    "name": "compareBpms",
    "path": "src/shared/beat/bpmAccuracyTest.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Test multiple BPM values and return detailed comparison Useful for debugging which BPM best matches the audio",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-bpmaccuracytest-ts-formatbpmaccuracyreport",
    "name": "formatBpmAccuracyReport",
    "path": "src/shared/beat/bpmAccuracyTest.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Format test results for console output",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-bpmaccuracytest-ts-runquickbpmaccuracytest",
    "name": "runQuickBpmAccuracyTest",
    "path": "src/shared/beat/bpmAccuracyTest.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Quick BPM accuracy test that skips redundant tempo detection This is faster than testBpmAccuracy because it uses pre-computed BPM and confidence values instead of re-running tempo detection.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-bpmaccuracytest-ts-testbpmaccuracy",
    "name": "testBpmAccuracy",
    "path": "src/shared/beat/bpmAccuracyTest.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Test BPM detection accuracy for an audio buffer",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-decodemediaforbeat-ts-analysisprogress",
    "name": "AnalysisProgress",
    "path": "src/shared/beat/decodeMediaForBeat.ts",
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
    "id": "src-shared-beat-decodemediaforbeat-ts-decodemediatobuffer",
    "name": "decodeMediaToBuffer",
    "path": "src/shared/beat/decodeMediaForBeat.ts",
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
    "id": "src-shared-beat-decodemediaforbeat-ts-yieldtomainthread",
    "name": "yieldToMainThread",
    "path": "src/shared/beat/decodeMediaForBeat.ts",
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
    "id": "src-shared-beat-detectsongkey-ts-detectedsongkey",
    "name": "DetectedSongKey",
    "path": "src/shared/beat/detectSongKey.ts",
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
    "id": "src-shared-beat-detectsongkey-ts-detectsongkeyfrombuffer",
    "name": "detectSongKeyFromBuffer",
    "path": "src/shared/beat/detectSongKey.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Lightweight key guess from uploaded audio (Essentia KeyExtractor consensus). Used by Stanza original-key field; tempo analysis stays separate.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-detectsongkey-ts-musickeyfromdetected",
    "name": "musicKeyFromDetected",
    "path": "src/shared/beat/detectSongKey.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Map Essentia/chord key detection output to the shared 12-key display set.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-essentiasingleton-ts-essentiainstance",
    "name": "EssentiaInstance",
    "path": "src/shared/beat/essentiaSingleton.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Single Essentia.js WASM instance for Find-the-Beat analysis, Stanza segment tempo, Piano chroma, and other shared audio ML entry points.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-beat-essentiasingleton-ts-getessentia",
    "name": "getEssentia",
    "path": "src/shared/beat/essentiaSingleton.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Initialize Essentia.js WASM module (cached singleton).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-fermatadetector-ts-detectfermatas",
    "name": "detectFermatas",
    "path": "src/shared/beat/experimental/fermataDetector.ts",
    "kind": "utility",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Detect fermatas in audio",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-fermatadetector-ts-fermatacandidate",
    "name": "FermataCandidate",
    "path": "src/shared/beat/experimental/fermataDetector.ts",
    "kind": "model",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Fermata Detector (Experimental) Detects fermatas (held notes/pauses) in audio using inter-onset interval (IOI) analysis. Fermatas are characterized by: 1. Longer-than-expected gaps between note onsets 2. Energy profile showing sustained tone or silence (not just quiet passage) 3. Return to normal rhythm after the held section",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-fermatadetector-ts-fermatadetectionresult",
    "name": "FermataDetectionResult",
    "path": "src/shared/beat/experimental/fermataDetector.ts",
    "kind": "model",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Fermata Detector (Experimental) Detects fermatas (held notes/pauses) in audio using inter-onset interval (IOI) analysis. Fermatas are characterized by: 1. Longer-than-expected gaps between note onsets 2. Energy profile showing sustained tone or silence (not just quiet passage) 3. Return to normal rhythm after the held section",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-fermatadetector-ts-mergefermataregions",
    "name": "mergeFermataRegions",
    "path": "src/shared/beat/experimental/fermataDetector.ts",
    "kind": "utility",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Merge overlapping or adjacent fermata regions",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-tempochangedetector-ts-combinetemporegions",
    "name": "combineTempoRegions",
    "path": "src/shared/beat/experimental/tempoChangeDetector.ts",
    "kind": "utility",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Combine fermata detection and tempo change detection results Interleaves fermata regions with steady tempo regions",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-tempochangedetector-ts-detecttempochanges",
    "name": "detectTempoChanges",
    "path": "src/shared/beat/experimental/tempoChangeDetector.ts",
    "kind": "utility",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Detect tempo changes in audio using windowed analysis",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-tempochangedetector-ts-tempochangeresult",
    "name": "TempoChangeResult",
    "path": "src/shared/beat/experimental/tempoChangeDetector.ts",
    "kind": "model",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Tempo Change Detector (Experimental) Detects tempo changes in audio using windowed BPM analysis. Identifies sections with different steady tempos (like \"Defying Gravity\"). Algorithm: 1. Run tempo detection on overlapping windows 2. Track BPM stability within each window 3. Find change points where consecutive stable windows have different BPMs 4. Correlate with section boundaries",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-experimental-tempochangedetector-ts-tempowindow",
    "name": "TempoWindow",
    "path": "src/shared/beat/experimental/tempoChangeDetector.ts",
    "kind": "model",
    "stability": "experimental",
    "owner": "shared-core",
    "description": "Tempo Change Detector (Experimental) Detects tempo changes in audio using windowed BPM analysis. Identifies sections with different steady tempos (like \"Defying Gravity\"). Algorithm: 1. Run tempo detection on overlapping windows 2. Track BPM stability within each window 3. Find change points where consecutive stable windows have different BPMs 4. Correlate with section boundaries",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-adjustbeatsforgaps",
    "name": "adjustBeatsForGaps",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Adjust beat positions to account for gaps (fermatas/pauses) When there's a gap in the music (like a fermata), the beat grid continues mathematically but the music pauses. This causes all subsequent beats to be out of sync. This function shifts beats after each gap to realign with where the music actually resumes.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-analysisprogresscallback",
    "name": "AnalysisProgressCallback",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Progress callback type for analysis",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-analyzebeat",
    "name": "analyzeBeat",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Analyze audio buffer for BPM and beat information Uses ensemble of Essentia.js algorithms for improved accuracy",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-beatanalysisresult",
    "name": "BeatAnalysisResult",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Beat Analyzer using Essentia.js Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port for accurate BPM detection using the RhythmExtractor2013 algorithm. Shared implementation for Find the Beat and Stanza segment analysis.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-combinetemporegions",
    "name": "combineTempoRegions",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Beat Analyzer using Essentia.js Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port for accurate BPM detection using the RhythmExtractor2013 algorithm. Shared implementation for Find the Beat and Stanza segment analysis.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-detectfermatas",
    "name": "detectFermatas",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Beat Analyzer using Essentia.js Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port for accurate BPM detection using the RhythmExtractor2013 algorithm. Shared implementation for Find the Beat and Stanza segment analysis.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-detecttempochanges",
    "name": "detectTempoChanges",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Beat Analyzer using Essentia.js Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port for accurate BPM detection using the RhythmExtractor2013 algorithm. Shared implementation for Find the Beat and Stanza segment analysis.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-getessentia",
    "name": "getEssentia",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Beat Analyzer using Essentia.js Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port for accurate BPM detection using the RhythmExtractor2013 algorithm. Shared implementation for Find the Beat and Stanza segment analysis.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-findthebeatanalyzer-ts-mergefermataregions",
    "name": "mergeFermataRegions",
    "path": "src/shared/beat/findTheBeatAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Beat Analyzer using Essentia.js Uses the industry-standard Essentia library (from MTG/UPF) via its WASM port for accurate BPM detection using the RhythmExtractor2013 algorithm. Shared implementation for Find the Beat and Stanza segment analysis.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-gapfermatadetector-ts-detectgaponsets",
    "name": "detectGapOnsets",
    "path": "src/shared/beat/gapFermataDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Gap-based Fermata Detector Lightweight single-pass fermata detection. Analyzes inter-onset intervals (IOI) to find gaps significantly longer than the expected beat interval, then validates with simple energy analysis. This approach is much faster than binary search because it: - Computes onsets once with a single energy-based pass - Uses simple RMS for energy validation - Single O(n) pass through onset array",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-gapfermatadetector-ts-detectgapsforresync",
    "name": "detectGapsForResync",
    "path": "src/shared/beat/gapFermataDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detect gaps in onset pattern for beat grid resync This is used to find places where the beat grid needs to be shifted to stay aligned with the actual music after pauses/fermatas.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-gapfermatadetector-ts-gapwithresync",
    "name": "GapWithResync",
    "path": "src/shared/beat/gapFermataDetector.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "A gap that requires beat grid resync",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-gapfermatadetector-ts-getonsetpresetfortempo",
    "name": "getOnsetPresetForTempo",
    "path": "src/shared/beat/gapFermataDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Gap-based Fermata Detector Lightweight single-pass fermata detection. Analyzes inter-onset intervals (IOI) to find gaps significantly longer than the expected beat interval, then validates with simple energy analysis. This approach is much faster than binary search because it: - Computes onsets once with a single energy-based pass - Uses simple RMS for energy validation - Single O(n) pass through onset array",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-measureutils-ts-extendtomeasureboundary",
    "name": "extendToMeasureBoundary",
    "path": "src/shared/beat/measureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Extend a time to the nearest measure boundary that expands the range. For start times: snap backward (floor) For end times: snap forward (ceil) Uses a small epsilon for floating point comparisons to ensure times that are very close to a boundary are treated as being on that boundary.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-measureutils-ts-generatemeasurelabel",
    "name": "generateMeasureLabel",
    "path": "src/shared/beat/measureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generate a measure-based label for a section (e.g., \"M1-8\", \"M48\").",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-measureutils-ts-getmeasureduration",
    "name": "getMeasureDuration",
    "path": "src/shared/beat/measureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Calculate the duration of one measure in seconds.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-measureutils-ts-getmeasurenumber",
    "name": "getMeasureNumber",
    "path": "src/shared/beat/measureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Get the 1-indexed measure number for a given time. Returns 0 if the time is before musicStartTime.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-measureutils-ts-snaptomeasurestart",
    "name": "snapToMeasureStart",
    "path": "src/shared/beat/measureUtils.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Snap a time to the nearest measure boundary (either before or after).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-onsetalignmentscorer-ts-alignmentanalysis",
    "name": "AlignmentAnalysis",
    "path": "src/shared/beat/onsetAlignmentScorer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Onset Alignment Scorer Evaluates how well a given BPM aligns with detected audio onsets. This provides an objective measure of BPM accuracy without requiring human listening evaluation. The approach: 1. Detect onsets from audio (note attacks, beat positions) 2. For each candidate BPM, generate a theoretical beat grid 3. For each beat in the grid, find the nearest onset 4. Score based on how close beats are to onsets A good BPM will have beats that consistently land near onsets. A bad BPM will have beats that often fall between onsets.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-onsetalignmentscorer-ts-alignmentonsetoptions",
    "name": "AlignmentOnsetOptions",
    "path": "src/shared/beat/onsetAlignmentScorer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Onset Alignment Scorer Evaluates how well a given BPM aligns with detected audio onsets. This provides an objective measure of BPM accuracy without requiring human listening evaluation. The approach: 1. Detect onsets from audio (note attacks, beat positions) 2. For each candidate BPM, generate a theoretical beat grid 3. For each beat in the grid, find the nearest onset 4. Score based on how close beats are to onsets A good BPM will have beats that consistently land near onsets. A bad BPM will have beats that often fall between onsets.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-onsetalignmentscorer-ts-alignmentscore",
    "name": "AlignmentScore",
    "path": "src/shared/beat/onsetAlignmentScorer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Onset Alignment Scorer Evaluates how well a given BPM aligns with detected audio onsets. This provides an objective measure of BPM accuracy without requiring human listening evaluation. The approach: 1. Detect onsets from audio (note attacks, beat positions) 2. For each candidate BPM, generate a theoretical beat grid 3. For each beat in the grid, find the nearest onset 4. Score based on how close beats are to onsets A good BPM will have beats that consistently land near onsets. A bad BPM will have beats that often fall between onsets.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-onsetalignmentscorer-ts-analyzealignment",
    "name": "analyzeAlignment",
    "path": "src/shared/beat/onsetAlignmentScorer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Analyze alignment for multiple candidate BPMs",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-onsetalignmentscorer-ts-calculatealignmentscore",
    "name": "calculateAlignmentScore",
    "path": "src/shared/beat/onsetAlignmentScorer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Calculate alignment score for a specific BPM against detected onsets",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-onsetalignmentscorer-ts-detectalignmentonsets",
    "name": "detectAlignmentOnsets",
    "path": "src/shared/beat/onsetAlignmentScorer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detect onsets for alignment diagnostics with optional skip ranges.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-onsetalignmentscorer-ts-formatalignmentreport",
    "name": "formatAlignmentReport",
    "path": "src/shared/beat/onsetAlignmentScorer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Format alignment analysis as a readable report",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-audiobuffer-ts-createaudiobuffer",
    "name": "createAudioBuffer",
    "path": "src/shared/beat/regression/audioBuffer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Create a UniversalAudioBuffer from raw audio samples",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-audiobuffer-ts-isaudiobuffer",
    "name": "isAudioBuffer",
    "path": "src/shared/beat/regression/audioBuffer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Type guard to check if an object is a UniversalAudioBuffer",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-audiobuffer-ts-universalaudiobuffer",
    "name": "UniversalAudioBuffer",
    "path": "src/shared/beat/regression/audioBuffer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimal audio buffer interface for cross-platform compatibility",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-nodeaudio-ts-extractaudiobuffer",
    "name": "extractAudioBuffer",
    "path": "src/shared/beat/regression/nodeAudio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Extract audio from a video/audio file and return as UniversalAudioBuffer",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-nodeaudio-ts-findmediafile",
    "name": "findMediaFile",
    "path": "src/shared/beat/regression/nodeAudio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Find a media file by name, searching common directories",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-nodeaudio-ts-isffmpegavailable",
    "name": "isFFmpegAvailable",
    "path": "src/shared/beat/regression/nodeAudio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Check if ffmpeg is available",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-nodeaudio-ts-listavailablemediafiles",
    "name": "listAvailableMediaFiles",
    "path": "src/shared/beat/regression/nodeAudio.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "List available media files in the hidden directory",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-syntheticaudiogenerator-ts-bpmtestcase",
    "name": "BpmTestCase",
    "path": "src/shared/beat/regression/syntheticAudioGenerator.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Test case definition for BPM detection testing",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-syntheticaudiogenerator-ts-generatesyntheticaudio",
    "name": "generateSyntheticAudio",
    "path": "src/shared/beat/regression/syntheticAudioGenerator.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generate a synthetic audio buffer with a known BPM Returns a MockAudioBuffer that can be used with our detection algorithms",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-syntheticaudiogenerator-ts-mockaudiobuffer",
    "name": "MockAudioBuffer",
    "path": "src/shared/beat/regression/syntheticAudioGenerator.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimal AudioBuffer-like interface for testing",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-syntheticaudiogenerator-ts-octave-ambiguity-test-cases",
    "name": "OCTAVE_AMBIGUITY_TEST_CASES",
    "path": "src/shared/beat/regression/syntheticAudioGenerator.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Octave ambiguity test cases (tempos that could be detected at half/double) Uses realistic 'mixed' patterns to give proper onset density cues Focused on the core reliable range (70-105 BPM)",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-syntheticaudiogenerator-ts-standard-bpm-test-cases",
    "name": "STANDARD_BPM_TEST_CASES",
    "path": "src/shared/beat/regression/syntheticAudioGenerator.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Standard test suite covering various BPM ranges and patterns Uses 'mixed' type for most tests as it provides realistic onset density Note: Synthetic audio has different characteristics than real music. Very slow (<70) and very fast (>120) tempos may have octave ambiguity.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-syntheticaudiogenerator-ts-syntheticaudioconfig",
    "name": "SyntheticAudioConfig",
    "path": "src/shared/beat/regression/syntheticAudioGenerator.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Configuration for synthetic audio generation",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorcore-ts-analyzesections",
    "name": "analyzeSections",
    "path": "src/shared/beat/regression/tempoDetectorCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Analyze tempo variations across different sections of the song",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorcore-ts-analyzetempocomplete",
    "name": "analyzeTempoComplete",
    "path": "src/shared/beat/regression/tempoDetectorCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Complete tempo analysis",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorcore-ts-detectmusicstart",
    "name": "detectMusicStart",
    "path": "src/shared/beat/regression/tempoDetectorCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detect the music start time (when audio becomes significant)",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorcore-ts-detectonsets",
    "name": "detectOnsets",
    "path": "src/shared/beat/regression/tempoDetectorCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Energy-based onset detection Detects sudden increases in audio energy that typically correspond to note attacks, drum hits, etc.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorcore-ts-estimatetempo",
    "name": "estimateTempo",
    "path": "src/shared/beat/regression/tempoDetectorCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Estimate tempo from onset times using autocorrelation Autocorrelation finds periodicities in the onset pattern, which is more robust than simple IOI histograms.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorcore-ts-sectionalanalysis",
    "name": "SectionalAnalysis",
    "path": "src/shared/beat/regression/tempoDetectorCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Result of sectional tempo analysis",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorcore-ts-tempoanalysisresult",
    "name": "TempoAnalysisResult",
    "path": "src/shared/beat/regression/tempoDetectorCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Result of tempo analysis",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorinterface-ts-gettempodetector",
    "name": "getTempoDetector",
    "path": "src/shared/beat/regression/tempoDetectorInterface.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Get a tempo detector by ID",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorinterface-ts-listtempodetectors",
    "name": "listTempoDetectors",
    "path": "src/shared/beat/regression/tempoDetectorInterface.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "List all available tempo detectors",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorinterface-ts-registertempodetector",
    "name": "registerTempoDetector",
    "path": "src/shared/beat/regression/tempoDetectorInterface.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Register a tempo detector",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorinterface-ts-tempodetectionresult",
    "name": "TempoDetectionResult",
    "path": "src/shared/beat/regression/tempoDetectorInterface.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Result from a tempo detection algorithm",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorinterface-ts-tempodetector",
    "name": "TempoDetector",
    "path": "src/shared/beat/regression/tempoDetectorInterface.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Common interface for tempo detection algorithms",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectorinterface-ts-tempodetectors",
    "name": "tempoDetectors",
    "path": "src/shared/beat/regression/tempoDetectorInterface.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Registry of available tempo detection algorithms",
    "tags": [],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectors-ts-autocorrelationdetector",
    "name": "autocorrelationDetector",
    "path": "src/shared/beat/regression/tempoDetectors.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Tempo Detector Implementations Provides implementations of different tempo detection algorithms wrapped in a common interface for easy comparison.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectors-ts-essentiaensembledetector",
    "name": "essentiaEnsembleDetector",
    "path": "src/shared/beat/regression/tempoDetectors.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Tempo Detector Implementations Provides implementations of different tempo detection algorithms wrapped in a common interface for easy comparison.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-regression-tempodetectors-ts-ioihistogramdetector",
    "name": "ioiHistogramDetector",
    "path": "src/shared/beat/regression/tempoDetectors.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Tempo Detector Implementations Provides implementations of different tempo detection algorithms wrapped in a common interface for easy comparison.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectionaltempoanalyzer-ts-analyzetempovariation",
    "name": "analyzeTempoVariation",
    "path": "src/shared/beat/sectionalTempoAnalyzer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Analyze tempo variations across sections of the song.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectionaltempoanalyzer-ts-sectiontempo",
    "name": "SectionTempo",
    "path": "src/shared/beat/sectionalTempoAnalyzer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Sectional Tempo Analyzer Analyzes tempo variations across different sections of a song. This helps diagnose whether: 1. The song has a constant tempo (and we're detecting wrong BPM) 2. The song has variable tempo (musicians speed up/slow down) 3. The song has distinct tempo changes at specific points",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectionaltempoanalyzer-ts-tempovariationreport",
    "name": "TempoVariationReport",
    "path": "src/shared/beat/sectionalTempoAnalyzer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Sectional Tempo Analyzer Analyzes tempo variations across different sections of a song. This helps diagnose whether: 1. The song has a constant tempo (and we're detecting wrong BPM) 2. The song has variable tempo (musicians speed up/slow down) 3. The song has distinct tempo changes at specific points",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetectiontypes-ts-sectiondetectionchordevent",
    "name": "SectionDetectionChordEvent",
    "path": "src/shared/beat/sectionDetectionTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimal chord event shape for section detection (harmonic boundary hints).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetectiontypes-ts-sectiondetectionkeychange",
    "name": "SectionDetectionKeyChange",
    "path": "src/shared/beat/sectionDetectionTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimal chord event shape for section detection (harmonic boundary hints).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-chordevent",
    "name": "ChordEvent",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Section Detector using Self-Similarity Matrix (SSM) analysis Detects song sections (verse, chorus, etc.) by: 1. Extracting MFCC features per frame using Essentia.js 2. Building a self-similarity matrix (spectral and/or chord-based) 3. Detecting novelty peaks using a checkerboard kernel 4. Snapping boundaries to beat/measure/chord positions",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-detectsections",
    "name": "detectSections",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Section Detector using Self-Similarity Matrix (SSM) analysis Detects song sections (verse, chorus, etc.) by: 1. Extracting MFCC features per frame using Essentia.js 2. Building a self-similarity matrix (spectral and/or chord-based) 3. Detecting novelty peaks using a checkerboard kernel 4. Snapping boundaries to beat/measure/chord positions",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-extendtomeasureboundary",
    "name": "extendToMeasureBoundary",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Section Detector using Self-Similarity Matrix (SSM) analysis Detects song sections (verse, chorus, etc.) by: 1. Extracting MFCC features per frame using Essentia.js 2. Building a self-similarity matrix (spectral and/or chord-based) 3. Detecting novelty peaks using a checkerboard kernel 4. Snapping boundaries to beat/measure/chord positions",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-keychangeinfo",
    "name": "KeyChangeInfo",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detect sections in an audio buffer",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-mergesections",
    "name": "mergeSections",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Merge adjacent sections",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-section",
    "name": "Section",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Section Detector using Self-Similarity Matrix (SSM) analysis Detects song sections (verse, chorus, etc.) by: 1. Extracting MFCC features per frame using Essentia.js 2. Building a self-similarity matrix (spectral and/or chord-based) 3. Detecting novelty peaks using a checkerboard kernel 4. Snapping boundaries to beat/measure/chord positions",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-sectiondetectionresult",
    "name": "SectionDetectionResult",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Section Detector using Self-Similarity Matrix (SSM) analysis Detects song sections (verse, chorus, etc.) by: 1. Extracting MFCC features per frame using Essentia.js 2. Building a self-similarity matrix (spectral and/or chord-based) 3. Detecting novelty peaks using a checkerboard kernel 4. Snapping boundaries to beat/measure/chord positions",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-splitsection",
    "name": "splitSection",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Split a section at a specific time",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-sectiondetector-ts-updatesectionboundary",
    "name": "updateSectionBoundary",
    "path": "src/shared/beat/sectionDetector.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Update a section boundary",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-segmentbeatanalysis-ts-analyzebeatformediatimerange",
    "name": "analyzeBeatForMediaTimeRange",
    "path": "src/shared/beat/segmentBeatAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Decode uploaded media, analyze only `[rangeStartSec, rangeEndSec]`, and map the first-beat offset back to absolute media time. Does not assume section edges align to downbeats.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-segmentbeatanalysis-ts-analyzebeatformediatimerangeparams",
    "name": "AnalyzeBeatForMediaTimeRangeParams",
    "path": "src/shared/beat/segmentBeatAnalysis.ts",
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
    "id": "src-shared-beat-segmentbeatanalysis-ts-segmentbeatanalysisprogress",
    "name": "SegmentBeatAnalysisProgress",
    "path": "src/shared/beat/segmentBeatAnalysis.ts",
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
    "id": "src-shared-beat-segmentbeatanalysis-ts-segmentbeatanalysisresult",
    "name": "SegmentBeatAnalysisResult",
    "path": "src/shared/beat/segmentBeatAnalysis.ts",
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
    "id": "src-shared-beat-sliceaudiobuffer-ts-sliceaudiobuffer",
    "name": "sliceAudioBuffer",
    "path": "src/shared/beat/sliceAudioBuffer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Copy a wall-clock subrange of an AudioBuffer into a new buffer (t=0 at slice start).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-suggestsectionmarkers-ts-sectionstosuggestedmarkers",
    "name": "sectionsToSuggestedMarkers",
    "path": "src/shared/beat/suggestSectionMarkers.ts",
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
    "id": "src-shared-beat-suggestsectionmarkers-ts-suggestedsectionmarker",
    "name": "SuggestedSectionMarker",
    "path": "src/shared/beat/suggestSectionMarkers.ts",
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
    "id": "src-shared-beat-tempoensemble-ts-detecttempoensemble",
    "name": "detectTempoEnsemble",
    "path": "src/shared/beat/tempoEnsemble.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detect tempo using ensemble of algorithms",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-tempoensemble-ts-ensembleresult",
    "name": "EnsembleResult",
    "path": "src/shared/beat/tempoEnsemble.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Tempo Ensemble Detection Uses multiple tempo estimation algorithms and computes consensus to improve accuracy and detect/resolve octave errors (60 vs 120 vs 240 BPM).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-tempoensemble-ts-tempoestimate",
    "name": "TempoEstimate",
    "path": "src/shared/beat/tempoEnsemble.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Tempo Ensemble Detection Uses multiple tempo estimation algorithms and computes consensus to improve accuracy and detect/resolve octave errors (60 vs 120 vs 240 BPM).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-createdefaultregion",
    "name": "createDefaultRegion",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Create a default steady region for the entire track",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-createsteadyregion",
    "name": "createSteadyRegion",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Create a steady tempo region with consistent defaults.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-findbpmfortime",
    "name": "findBpmForTime",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Find the BPM at a given time from tempo regions.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-generateregionid",
    "name": "generateRegionId",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generate unique ID for a tempo region",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-steadyregionoptions",
    "name": "SteadyRegionOptions",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Type of tempo region - 'steady': Consistent tempo throughout the region - 'fermata': Brief held note/pause (typically < 2 measures) - 'rubato': Free tempo section with no clear beat - 'accelerando': Gradually speeding up - 'ritardando': Gradually slowing down",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-tempoanalysisresult",
    "name": "TempoAnalysisResult",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Result of tempo analysis including all detected regions",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-temporegion",
    "name": "TempoRegion",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "A region of audio with specific tempo characteristics",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-beat-temporegions-ts-tempotype",
    "name": "TempoType",
    "path": "src/shared/beat/tempoRegions.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Type of tempo region - 'steady': Consistent tempo throughout the region - 'fermata': Brief held note/pause (typically < 2 measures) - 'rubato': Free tempo section with no clear beat - 'accelerando': Gradually speeding up - 'ritardando': Gradually slowing down",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-beat-wholesongbeatanalysis-ts-analysismetadata",
    "name": "AnalysisMetadata",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-wholesongbeatanalysis-ts-beat-analysis-version",
    "name": "BEAT_ANALYSIS_VERSION",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-wholesongbeatanalysis-ts-calibrationfrombeatanalysis",
    "name": "calibrationFromBeatAnalysis",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
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
    "id": "src-shared-beat-wholesongbeatanalysis-ts-isanalysisversionstale",
    "name": "isAnalysisVersionStale",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-wholesongbeatanalysis-ts-markanalysisbundlestale",
    "name": "markAnalysisBundleStale",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
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
    "id": "src-shared-beat-wholesongbeatanalysis-ts-persistedanalysisbundle",
    "name": "PersistedAnalysisBundle",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-beat-wholesongbeatanalysis-ts-runwholesongbeatanalysis",
    "name": "runWholeSongBeatAnalysis",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
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
    "id": "src-shared-beat-wholesongbeatanalysis-ts-runwholesongbeatanalysisparams",
    "name": "RunWholeSongBeatAnalysisParams",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
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
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "default",
    "demoId": "anchored-popover"
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
    "id": "src-shared-components-applinearvolumeslider-tsx-applinearvolumeslider",
    "name": "AppLinearVolumeSlider",
    "path": "src/shared/components/AppLinearVolumeSlider.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Standard **0–1 linear gain** slider for mix rails and similar (MUI `Slider` with safe defaults). Prefer this over ad-hoc `Slider` copies so rail / track clicks stay reliable in tight layouts. When the displayed value comes from async storage (e.g. Dexie + live query), use **local state** in `onChange` and persist in `onChangeCommitted` (or after `await persist`) so the thumb does not fight stale props mid-drag.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "default",
    "demoId": "app-linear-volume-slider"
  },
  {
    "id": "src-shared-components-applinearvolumeslider-tsx-applinearvolumesliderprops",
    "name": "AppLinearVolumeSliderProps",
    "path": "src/shared/components/AppLinearVolumeSlider.tsx",
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
      "ui"
    ],
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
    "description": "Thin wrapper around MUI Slider that adapts callbacks to app legacy range events. When `valueLabelDisplay` is `auto` or `on`, adds `app-slider--with-value-label` so the thumb tooltip is not clipped (see appSlider.css and SHARED_UI_CONVENTIONS.md).",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums",
      "forms",
      "piano",
      "ui",
      "words",
      "zines"
    ],
    "exportType": "default",
    "demoId": "app-slider"
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
    "id": "src-shared-components-labsdebugdock-tsx-labs-debug-dock-height-var",
    "name": "LABS_DEBUG_DOCK_HEIGHT_VAR",
    "path": "src/shared/components/LabsDebugDock.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Written to `:root` while is mounted; apps subtract this from `100dvh`.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums",
      "piano"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-labsdebugdock-tsx-labs-debug-panel-height-var",
    "name": "LABS_DEBUG_PANEL_HEIGHT_VAR",
    "path": "src/shared/components/LabsDebugDock.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Legacy alias kept for Scales (`scales.css`); synced to the same pixel height.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums",
      "piano"
    ],
    "exportType": "const",
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
    "description": "Written to `:root` while is mounted; apps subtract this from `100dvh`.",
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
    "description": "Written to `:root` while is mounted; apps subtract this from `100dvh`.",
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
    "id": "src-shared-components-music-chordplaybacksettingspanel-tsx-chordplaybacksettingspanel",
    "name": "ChordPlaybackSettingsPanel",
    "path": "src/shared/components/music/ChordPlaybackSettingsPanel.tsx",
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
      "ui"
    ],
    "exportType": "function",
    "demoId": "chord-playback-settings-panel"
  },
  {
    "id": "src-shared-components-music-chordplaybacksettingspanel-tsx-chordplaybacksettingspanelprops",
    "name": "ChordPlaybackSettingsPanelProps",
    "path": "src/shared/components/music/ChordPlaybackSettingsPanel.tsx",
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
      "ui"
    ],
    "exportType": "type",
    "demoId": null
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
    "id": "src-shared-components-music-darbukatrainericonlink-tsx-darbukatrainericonlink",
    "name": "DarbukaTrainerIconLink",
    "path": "src/shared/components/music/DarbukaTrainerIconLink.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Compact external link to Darbuka Trainer (`/drums/`) with shared tooltip + icon styling.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-darbukatrainericonlink-tsx-darbukatrainericonlinkprops",
    "name": "DarbukaTrainerIconLinkProps",
    "path": "src/shared/components/music/DarbukaTrainerIconLink.tsx",
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
      "words"
    ],
    "exportType": "type",
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
      "piano",
      "words"
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
      "piano",
      "words"
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
      "piano",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-deprecatedinlinedarbukalinkplacement",
    "name": "DeprecatedInlineDarbukaLinkPlacement",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Where the compact Darbuka Trainer link renders inside .",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-getinlinedrumuxprops",
    "name": "getInlineDrumUxProps",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Where the compact Darbuka Trainer link renders inside .",
    "tags": [
      "components",
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
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-inline-darbuka-link-ux",
    "name": "INLINE_DARBUKA_LINK_UX",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared Darbuka deep-link props for inline drum panels (icon + tooltip).",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-inline-drum-panel-ux",
    "name": "INLINE_DRUM_PANEL_UX",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Where the compact Darbuka Trainer link renders inside .",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-inline-drum-presets-only-ux",
    "name": "INLINE_DRUM_PRESETS_ONLY_UX",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Where the compact Darbuka Trainer link renders inside .",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-inline-drum-profiles",
    "name": "INLINE_DRUM_PROFILES",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Behavior defaults for inline drum embeds. Hosts pass a profile via and keep theming local (`notationStyle`, wrapper className). - **settings-panel** — chord playback popovers (Encore Originals, Chords chart). - **practice-rail** — compact preset picker + audible playback (Stanza mix rail). - **sidebar-compact** — full preset grid + audible playback (Piano sidebar). Host-owned pattern fields (Words section template row): spread the profile then override `{ hidePatternInput: true, hideDarbukaLink: true }`.",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-inlinedarbukalinkplacement",
    "name": "InlineDarbukaLinkPlacement",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Where the compact Darbuka Trainer link renders inside .",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-inlinedrumuxprofile",
    "name": "InlineDrumUxProfile",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Host picks a profile — not individual layout props.",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-inlinedrumuxprofileprops",
    "name": "InlineDrumUxProfileProps",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Props bundled by / .",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "piano",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-inlinedrumuxdefaults-ts-resolvedarbukalinkplacement",
    "name": "resolveDarbukaLinkPlacement",
    "path": "src/shared/components/music/inlineDrumUxDefaults.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Where the compact Darbuka Trainer link renders inside .",
    "tags": [
      "components",
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
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-numericstepperfield-tsx-numericstepperfield",
    "name": "NumericStepperField",
    "path": "src/shared/components/music/NumericStepperField.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Value + ▲▼ stepper row used inside ./BpmInput.tsx shells (`shared-bpm-stepper`, `shared-bpm-value`, `shared-bpm-arrows`). BPM-agnostic chrome only — domain copy and clamping live in the parent.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "function",
    "demoId": "numeric-stepper-field"
  },
  {
    "id": "src-shared-components-music-numericstepperfield-tsx-numericstepperfieldprops",
    "name": "NumericStepperFieldProps",
    "path": "src/shared/components/music/NumericStepperField.tsx",
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
      "ui"
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
    "id": "src-shared-components-music-playbackfieldselect-ts-forwardwheeltopagescroller",
    "name": "forwardWheelToPageScroller",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Forward wheel events on an invisible backdrop to the page scroll container.",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-isplaybackfieldselectpopovertarget",
    "name": "isPlaybackFieldSelectPopoverTarget",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "True when `target` is inside a portaled playback field select menu (sound, style, …).",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-playback-field-select-popover-class",
    "name": "PLAYBACK_FIELD_SELECT_POPOVER_CLASS",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Class on the portaled Popover root — hosts must treat clicks inside as in-panel.",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-playback-field-select-words-z-index",
    "name": "PLAYBACK_FIELD_SELECT_WORDS_Z_INDEX",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Words section-style menus use 2600; nested sound pickers must sit above them.",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-playback-field-select-z-index",
    "name": "PLAYBACK_FIELD_SELECT_Z_INDEX",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Above floating panels (e.g. Encore playback settings) so nested menus paint on top.",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-playbackfieldselectappearance",
    "name": "PlaybackFieldSelectAppearance",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared closed-trigger + menu shell appearance for playback pickers (sound, chord style, …).",
    "tags": [
      "components",
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
    "id": "src-shared-components-music-playbackfieldselect-ts-playbackfieldselectmenuappearance",
    "name": "PlaybackFieldSelectMenuAppearance",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Menu paper variant — app skins get their own list chrome; generic hosts use default.",
    "tags": [
      "components",
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
    "id": "src-shared-components-music-playbackfieldselect-ts-playbackfieldselectmenuclass",
    "name": "playbackFieldSelectMenuClass",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared closed-trigger + menu shell appearance for playback pickers (sound, chord style, …).",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-playbackfieldselectpopoverslotprops",
    "name": "playbackFieldSelectPopoverSlotProps",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared closed-trigger + menu shell appearance for playback pickers (sound, chord style, …).",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-playbackfieldselectrootclass",
    "name": "playbackFieldSelectRootClass",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared closed-trigger + menu shell appearance for playback pickers (sound, chord style, …).",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-playbackfloatingpanelslotprops",
    "name": "playbackFloatingPanelSlotProps",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Floating settings / tool panels that may host nested playback field selects.",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-resolveplaybackfieldselectappearance",
    "name": "resolvePlaybackFieldSelectAppearance",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Map richer host appearance tokens (e.g. ChordStyleInput skins) onto the shared trigger API.",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselect-ts-resolveplaybackfieldselectmenuappearance",
    "name": "resolvePlaybackFieldSelectMenuAppearance",
    "path": "src/shared/components/music/playbackFieldSelect.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared closed-trigger + menu shell appearance for playback pickers (sound, chord style, …).",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselecttrigger-tsx-playbackfieldselecttrigger",
    "name": "PlaybackFieldSelectTrigger",
    "path": "src/shared/components/music/PlaybackFieldSelectTrigger.tsx",
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
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackfieldselecttrigger-tsx-playbackfieldselecttriggerprops",
    "name": "PlaybackFieldSelectTriggerProps",
    "path": "src/shared/components/music/PlaybackFieldSelectTrigger.tsx",
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
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbacksoundselect-tsx-playbackfieldselectappearance",
    "name": "PlaybackFieldSelectAppearance",
    "path": "src/shared/components/music/PlaybackSoundSelect.tsx",
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
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbacksoundselect-tsx-playbacksoundselect",
    "name": "PlaybackSoundSelect",
    "path": "src/shared/components/music/PlaybackSoundSelect.tsx",
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
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": "playback-sound-select"
  },
  {
    "id": "src-shared-components-music-playbacksoundselect-tsx-playbacksoundselectprops",
    "name": "PlaybackSoundSelectProps",
    "path": "src/shared/components/music/PlaybackSoundSelect.tsx",
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
      "chords",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackspeedcontrol-tsx-playbackspeedcontrol",
    "name": "PlaybackSpeedControl",
    "path": "src/shared/components/music/PlaybackSpeedControl.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared playback-speed input with stepper, slider, and preset chips. Uses the same shell / dropdown tokens as .",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "default",
    "demoId": "playback-speed-control"
  },
  {
    "id": "src-shared-components-music-playbackspeedcontrol-tsx-playbackspeedcontrolprops",
    "name": "PlaybackSpeedControlProps",
    "path": "src/shared/components/music/PlaybackSpeedControl.tsx",
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
      "ui"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-playbackvolumerow-tsx-playbackvolumerow",
    "name": "PlaybackVolumeRow",
    "path": "src/shared/components/music/PlaybackVolumeRow.tsx",
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
      "chords",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": "playback-volume-row"
  },
  {
    "id": "src-shared-components-music-playbackvolumerow-tsx-playbackvolumerowprops",
    "name": "PlaybackVolumeRowProps",
    "path": "src/shared/components/music/PlaybackVolumeRow.tsx",
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
      "chords",
      "ui",
      "words"
    ],
    "exportType": "type",
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
    "id": "src-shared-components-music-slidermilestonelabels-tsx-slidermilestoneitem",
    "name": "SliderMilestoneItem",
    "path": "src/shared/components/music/sliderMilestoneLabels.tsx",
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
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-slidermilestonelabels-tsx-slidermilestonelabels",
    "name": "SliderMilestoneLabels",
    "path": "src/shared/components/music/sliderMilestoneLabels.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Tick labels under rails inside BPM / speed dropdowns.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-slidermilestonelabels-tsx-slidermilestonelabelsprops",
    "name": "SliderMilestoneLabelsProps",
    "path": "src/shared/components/music/sliderMilestoneLabels.tsx",
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
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-slidermilestoneutils-ts-buildslidermilestones",
    "name": "buildSliderMilestones",
    "path": "src/shared/components/music/sliderMilestoneUtils.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Map slider tick values to horizontal positions under the rail (linear scale).",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-slidermilestoneutils-ts-pickbpmslidermilestones",
    "name": "pickBpmSliderMilestones",
    "path": "src/shared/components/music/sliderMilestoneUtils.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "BPM dropdown milestones: min, 100, 200, max — dropping ticks that would crowd (e.g. 200 + 220 when max is 220 in Words in Rhythm).",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-slidermilestoneutils-ts-slidermilestonealign",
    "name": "SliderMilestoneAlign",
    "path": "src/shared/components/music/sliderMilestoneUtils.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-slidermilestoneutils-ts-slidermilestoneitem",
    "name": "SliderMilestoneItem",
    "path": "src/shared/components/music/sliderMilestoneUtils.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-components-richtexteditor-tsx-richtexteditor",
    "name": "RichTextEditor",
    "path": "src/shared/components/RichTextEditor.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-richtexteditor-tsx-richtexteditorprops",
    "name": "RichTextEditorProps",
    "path": "src/shared/components/RichTextEditor.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-richtextlinkhoverpopover-tsx-richtextlinkhoverpopover",
    "name": "RichTextLinkHoverPopover",
    "path": "src/shared/components/RichTextLinkHoverPopover.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-richtextlinkhoverpopover-tsx-richtextlinkhoverpopoverprops",
    "name": "RichTextLinkHoverPopoverProps",
    "path": "src/shared/components/RichTextLinkHoverPopover.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
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
    "id": "src-shared-components-userichtextlinkhover-ts-richtextlinkhovercontroller",
    "name": "RichTextLinkHoverController",
    "path": "src/shared/components/useRichTextLinkHover.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-userichtextlinkhover-ts-richtextlinkhoverstate",
    "name": "RichTextLinkHoverState",
    "path": "src/shared/components/useRichTextLinkHover.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-components-userichtextlinkhover-ts-selectlinkdomrange",
    "name": "selectLinkDomRange",
    "path": "src/shared/components/useRichTextLinkHover.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-userichtextlinkhover-ts-userichtextlinkhover",
    "name": "useRichTextLinkHover",
    "path": "src/shared/components/useRichTextLinkHover.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "No JSDoc summary provided.",
    "tags": [
      "components"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "description": "Poll practice debug log (piano + scales debug docks). Pass a `useCallback` tick.",
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
    "id": "src-shared-dexie-resolvedexielivequery-ts-resolvedexielivequery",
    "name": "resolveDexieLiveQuery",
    "path": "src/shared/dexie/resolveDexieLiveQuery.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Dexie `useLiveQuery` returns `undefined` until the first emission — not an empty result. Use this helper so UI can distinguish loading from a real empty library. Reference: Encore `songsHydrated` in `EncoreLibraryContext.tsx`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-dom-resolveeventtargetelement-ts-ispointerinsideselector",
    "name": "isPointerInsideSelector",
    "path": "src/shared/dom/resolveEventTargetElement.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when the event target lies inside an element matching `selector` (or inside `root`).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-dom-resolveeventtargetelement-ts-resolveeventtargetelement",
    "name": "resolveEventTargetElement",
    "path": "src/shared/dom/resolveEventTargetElement.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve a pointer/focus event target to an Element for DOM traversal (`closest`, `matches`). Clicks on text inside buttons often set `event.target` to a Text node, which has no `closest`.",
    "tags": [],
    "appsUsing": [],
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
    "id": "src-shared-drive-buildpublicdrivealtmediaurl-ts-buildpublicdrivealtmediaurl",
    "name": "buildPublicDriveAltMediaUrl",
    "path": "src/shared/drive/buildPublicDriveAltMediaUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when guest Drive reads should use `/{origin}/__encore/drive-public/…` (Vite dev only).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-buildpublicdrivealtmediaurl-ts-buildpublicdrivefilemetadataurl",
    "name": "buildPublicDriveFileMetadataUrl",
    "path": "src/shared/drive/buildPublicDriveAltMediaUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Same-origin proxy or direct API key `files.get` metadata (for shortcut resolution before `alt=media`).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-buildpublicdrivealtmediaurl-ts-buildpublicdriveurlopts",
    "name": "BuildPublicDriveUrlOpts",
    "path": "src/shared/drive/buildPublicDriveAltMediaUrl.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when guest Drive reads should use `/{origin}/__encore/drive-public/…` (Vite dev only).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-buildpublicdrivealtmediaurl-ts-ispublicdriveguestfetchconfigured",
    "name": "isPublicDriveGuestFetchConfigured",
    "path": "src/shared/drive/buildPublicDriveAltMediaUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when the app can attempt a guest snapshot / public Drive JSON read.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-buildpublicdrivealtmediaurl-ts-shouldusepublicdrivesameoriginproxy",
    "name": "shouldUsePublicDriveSameOriginProxy",
    "path": "src/shared/drive/buildPublicDriveAltMediaUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when guest Drive reads should use `/{origin}/__encore/drive-public/…` (Vite dev only).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-computefilemd5hex-ts-computefilemd5hex",
    "name": "computeFileMd5Hex",
    "path": "src/shared/drive/computeFileMd5Hex.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "MD5 hex digest aligned with Google Drive `md5Checksum` (lowercase hex).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivecollectpdffilesrecursive-ts-drivecollectpdffilesrecursive",
    "name": "driveCollectPdfFilesRecursive",
    "path": "src/shared/drive/driveCollectPdfFilesRecursive.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Breadth-first walk: collects PDF files in the root folder and nested subfolders.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivecollectpdffilesrecursive-ts-drivecollectpdfsoptions",
    "name": "DriveCollectPdfsOptions",
    "path": "src/shared/drive/driveCollectPdfFilesRecursive.ts",
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
    "id": "src-shared-drive-drivecollectpdffilesrecursive-ts-drivecollectpdfsresult",
    "name": "DriveCollectPdfsResult",
    "path": "src/shared/drive/driveCollectPdfFilesRecursive.ts",
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
    "id": "src-shared-drive-drivecollectpdffilesrecursive-ts-drivepdfdedupekey",
    "name": "drivePdfDedupeKey",
    "path": "src/shared/drive/driveCollectPdfFilesRecursive.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Stable key for deduping direct PDF rows and shortcuts to the same target file.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivecollectpdffilesrecursive-ts-drivepdfimportcandidate",
    "name": "DrivePdfImportCandidate",
    "path": "src/shared/drive/driveCollectPdfFilesRecursive.ts",
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
    "id": "src-shared-drive-drivecollectpdffilesrecursive-ts-isdrivepdffile",
    "name": "isDrivePdfFile",
    "path": "src/shared/drive/driveCollectPdfFilesRecursive.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivecreateanyonereaderpermission",
    "name": "driveCreateAnyoneReaderPermission",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivecreatefolder",
    "name": "driveCreateFolder",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivecreatejsonfile",
    "name": "driveCreateJsonFile",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivecreateshortcut",
    "name": "driveCreateShortcut",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivefilecontentfingerprint",
    "name": "DriveFileContentFingerprint",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivefilehasanyonereader",
    "name": "driveFileHasAnyoneReader",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Returns true when the file has at least one `type:'anyone'` reader (or writer/commenter) permission. Paginates `permissions.list` so an `anyone` entry on a later page is not missed. Caller must hold a token with `drive.metadata.readonly` (or `drive` / `drive.file` if owned/shared with app).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-drivefilelistrow",
    "name": "DriveFileListRow",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivegetfilecontentfingerprint",
    "name": "driveGetFileContentFingerprint",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Content fingerprint for duplicate-upload detection (follows shortcuts to the media file).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-drivegetfilemetadata",
    "name": "driveGetFileMetadata",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivegetjson",
    "name": "driveGetJson",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivegetmedia",
    "name": "driveGetMedia",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivegetmediaarraybuffer",
    "name": "driveGetMediaArrayBuffer",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Binary `alt=media` read (audio/video/pdf bytes). Prefer over for non-text bodies.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-drivehttperror",
    "name": "DriveHttpError",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-drivelistfiles",
    "name": "driveListFiles",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-drivemovefile",
    "name": "driveMoveFile",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Move a file so it is filed under `newParentId`. Removes prior parent folder ids except any that already match `newParentId`. Uses Drive `addParents` / `removeParents` (v3).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-drivepatchfiledescription",
    "name": "drivePatchFileDescription",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Update a file or folder description (visible in Drive UI).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-drivepatchjsonmedia",
    "name": "drivePatchJsonMedia",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-driverenamefile",
    "name": "driveRenameFile",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Rename a file (does not move parents).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-driveresolvefileformedia",
    "name": "driveResolveFileForMedia",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Walks shortcut rows to the file Drive will serve for `alt=media` (target id). Rejects unresolved shortcuts or chains longer than `maxDepth`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-driveresolvethumbnaillink",
    "name": "driveResolveThumbnailLink",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "OAuth-backed thumbnail URL for a Drive file (or shortcut → target). Returns null when Drive does not expose `thumbnailLink`, on permission errors, or after transient retries fail.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-drivetrashfile",
    "name": "driveTrashFile",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Trash a Drive file (reversible from the Drive UI for ~30 days). The sharded sync uses this for per-row deletes so a stray double-click in the UI does not vaporize the user's only copy.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-driveuploadfileresumable",
    "name": "driveUploadFileResumable",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resumable upload (single PUT) for arbitrary binary size within browser memory.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-etagfromdriveresponse",
    "name": "etagFromDriveResponse",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive v3 rejects `etag` in `fields` masks; use the HTTP `ETag` response header for concurrency (`If-Match`).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-formatdriverequestfailure",
    "name": "formatDriveRequestFailure",
    "path": "src/shared/drive/driveFetch.ts",
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
    "id": "src-shared-drive-drivefetch-ts-google-drive-shortcut-mime",
    "name": "GOOGLE_DRIVE_SHORTCUT_MIME",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google Drive shortcut row; follow `shortcutDetails.targetId` before `alt=media`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-pickpreferreddrivelistfileid",
    "name": "pickPreferredDriveListFileId",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pick one Drive file id from a list: keep when it still appears (stable guest URLs), otherwise the most recently modified row. Empty / missing ids are skipped.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetch-ts-summarizedriveapierrorbody",
    "name": "summarizeDriveApiErrorBody",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Extract a human-readable line from a Drive v3 JSON error body (falls back to trimmed text).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-fetchpublicdrivemediabytes-ts-fetchpublicdrivefilemetadata",
    "name": "fetchPublicDriveFileMetadata",
    "path": "src/shared/drive/fetchPublicDriveMediaBytes.ts",
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
    "id": "src-shared-drive-fetchpublicdrivemediabytes-ts-fetchpublicdrivemediawithapikey",
    "name": "fetchPublicDriveMediaWithApiKey",
    "path": "src/shared/drive/fetchPublicDriveMediaBytes.ts",
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
    "id": "src-shared-drive-fetchpublicdrivemediabytes-ts-ispublicdrivefilemetadatareadable",
    "name": "isPublicDriveFileMetadataReadable",
    "path": "src/shared/drive/fetchPublicDriveMediaBytes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when `files.get` metadata succeeds with the browser Drive API key (no OAuth). Matches what anonymous guests can do — Encore’s OAuth scopes often **cannot** call `permissions.list` on the same file even when it is “Anyone with the link”, so snapshot publishing uses this as a second probe after the OAuth permission check.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-fetchpublicdrivemediabytes-ts-publicdrivefilemetadata",
    "name": "PublicDriveFileMetadata",
    "path": "src/shared/drive/fetchPublicDriveMediaBytes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Guest read of file bytes via browser API key (`VITE_GOOGLE_API_KEY`). The file must be readable with `anyoneWithLink` / `anyone` Drive permissions (same model as Encore guest snapshots).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-fetchpublicdrivemediabytes-ts-publicdrivemediaerror",
    "name": "PublicDriveMediaError",
    "path": "src/shared/drive/fetchPublicDriveMediaBytes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-drive-fetchpublicdrivemediabytes-ts-resolvepublicdrivefileformedia",
    "name": "resolvePublicDriveFileForMedia",
    "path": "src/shared/drive/fetchPublicDriveMediaBytes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "For API-key reads, walk shortcut rows to the binary target id (same as OAuth ).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-infermediamimetype-ts-infermediamimetype",
    "name": "inferMediaMimeType",
    "path": "src/shared/drive/inferMediaMimeType.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Best-effort MIME for uploads and drag/drop routing. Trusts real `audio/*` and `video/*` types; otherwise guesses from the filename extension.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-assesslabsdrivebackupconflict",
    "name": "assessLabsDriveBackupConflict",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared Drive backup conflict assessment (Stanza, Scales, future apps). App hooks supply envelope-specific \"has remote content\" checks.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-labs-portfolio-merge-prompt-policy-default",
    "name": "LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Default for new portfolio backup apps (Gesture, Scales, …).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-labsdriveconflictassessment",
    "name": "LabsDriveConflictAssessment",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared Drive backup conflict assessment (Stanza, Scales, future apps). App hooks supply envelope-specific \"has remote content\" checks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-labsdriveconflictreason",
    "name": "LabsDriveConflictReason",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared Drive backup conflict assessment (Stanza, Scales, future apps). App hooks supply envelope-specific \"has remote content\" checks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-labsdrivesyncmetafields",
    "name": "LabsDriveSyncMetaFields",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared Drive backup conflict assessment (Stanza, Scales, future apps). App hooks supply envelope-specific \"has remote content\" checks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-labsportfoliolocalchangedsinceisobackup",
    "name": "labsPortfolioLocalChangedSinceIsoBackup",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Compare a local monotonic clock (ms) to the last exported backup timestamp.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-labsportfoliomergepromptpolicy",
    "name": "LabsPortfolioMergePromptPolicy",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "When to show before pull/backup. - **`silent_union`** (default) — merge in the background; undo snapshots are the safety net. Use when app merge is union-based and cannot drop local edits. - **`prompt_when_both_edited`** — prompt when cloud diverged and local changed since last backup. Use only when merge heuristics can hide meaningful differences or replace-only is a common intentional choice (Stanza section markers). See `docs/LOCAL_FIRST_SYNC.md` § Portfolio merge prompt policy.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-shouldpromptbeforeportfoliomerge",
    "name": "shouldPromptBeforePortfolioMerge",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared Drive backup conflict assessment (Stanza, Scales, future apps). App hooks supply envelope-specific \"has remote content\" checks.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivebackuptypes-ts-shouldpromptportfoliomerge",
    "name": "shouldPromptPortfolioMerge",
    "path": "src/shared/drive/labsDriveBackupTypes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared Drive backup conflict assessment (Stanza, Scales, future apps). App hooks supply envelope-specific \"has remote content\" checks.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivefolderpasteorbrowseblock-tsx-labsdrivefolderpasteorbrowseblock",
    "name": "LabsDriveFolderPasteOrBrowseBlock",
    "path": "src/shared/drive/LabsDriveFolderPasteOrBrowseBlock.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Paste a Drive folder URL or id, verify when signed in, open Drive in a new tab. Matches Encore bulk-import folder UX ( ).",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivefolderpasteorbrowseblock-tsx-labsdrivefolderpasteorbrowseblockprops",
    "name": "LabsDriveFolderPasteOrBrowseBlockProps",
    "path": "src/shared/drive/LabsDriveFolderPasteOrBrowseBlock.tsx",
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
    "id": "src-shared-drive-labsdrivefolderurl-ts-labsdrivefolderurl",
    "name": "labsDriveFolderUrl",
    "path": "src/shared/drive/labsDriveFolderUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Stable URL for a Drive app folder when the folder id is known (account menu \"Open in Drive\").",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliobackupconstants-ts-labs-drive-auto-pull-interval-ms",
    "name": "LABS_DRIVE_AUTO_PULL_INTERVAL_MS",
    "path": "src/shared/drive/labsDrivePortfolioBackupConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Silent re-pull interval while the tab is visible (cross-device sync).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliobackupconstants-ts-labs-drive-auto-pull-min-interval-ms",
    "name": "LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS",
    "path": "src/shared/drive/labsDrivePortfolioBackupConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimum ms between visibility-triggered silent re-pulls.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliobackupconstants-ts-labs-drive-auto-push-debounce-ms",
    "name": "LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS",
    "path": "src/shared/drive/labsDrivePortfolioBackupConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Debounced auto-push quiet period (Stanza, Scales, Gesture portfolio apps).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliobackupconstants-ts-labs-drive-auto-push-min-interval-ms",
    "name": "LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS",
    "path": "src/shared/drive/labsDrivePortfolioBackupConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimum ms between consecutive auto-pushes on the same session.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliodedupfolders-ts-findlabsdrivestanzastemaudiofolderid",
    "name": "findLabsDriveStanzaStemAudioFolderId",
    "path": "src/shared/drive/labsDrivePortfolioDedupFolders.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Read-only lookup — does not create portfolio folders. Used by Encore upload dedup to index Stanza stem bytes without importing Stanza.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliodedupfolders-ts-labs-drive-stanza-stem-audio-folder",
    "name": "LABS_DRIVE_STANZA_STEM_AUDIO_FOLDER",
    "path": "src/shared/drive/labsDrivePortfolioDedupFolders.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mix-layer bytes folder under `Tiff Zhang Labs/Stanza/` (same name as Stanza app).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-ensurelabsdriveportfolioprogresslayout",
    "name": "ensureLabsDrivePortfolioProgressLayout",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-getlabsdriveprogressfilemeta",
    "name": "getLabsDriveProgressFileMeta",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labs-drive-app-folder-gesture",
    "name": "LABS_DRIVE_APP_FOLDER_GESTURE",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labs-drive-app-folder-scales",
    "name": "LABS_DRIVE_APP_FOLDER_SCALES",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labs-drive-app-folder-stanza",
    "name": "LABS_DRIVE_APP_FOLDER_STANZA",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labs-drive-app-folder-zinebox",
    "name": "LABS_DRIVE_APP_FOLDER_ZINEBOX",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labs-drive-progress-file",
    "name": "LABS_DRIVE_PROGRESS_FILE",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labs-drive-root-folder",
    "name": "LABS_DRIVE_ROOT_FOLDER",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labsdriveportfolioprogressrefs",
    "name": "LabsDrivePortfolioProgressRefs",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-readlabsdriveprogressjson",
    "name": "readLabsDriveProgressJson",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-writelabsdriveprogressjson",
    "name": "writeLabsDriveProgressJson",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Portfolio Drive layout for Tiff Zhang Labs micro-apps (separate from Encore's `Encore_App` tree). Requesting `https://www.googleapis.com/auth/drive.file` only (via the app's GIS token request). This app cannot see files created by other apps or the user's personal documents outside what Drive's `drive.file` scope allows — only files the app creates or opens through this flow.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivesyncguard-ts-labsdriveautopushallowed",
    "name": "labsDriveAutoPushAllowed",
    "path": "src/shared/drive/labsDriveSyncGuard.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Whether debounced auto-push to Drive is allowed this session. Auto-push must not run until a successful pull (or explicit manual backup) so a fresh/sparse device cannot overwrite richer cloud data.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivesyncmessages-ts-formatlabsdrivesyncerror",
    "name": "formatLabsDriveSyncError",
    "path": "src/shared/drive/labsDriveSyncMessages.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Map sync errors to user-visible account-menu copy (portfolio apps).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivesyncmessages-ts-labs-drive-sign-in-to-sync-label",
    "name": "LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL",
    "path": "src/shared/drive/labsDriveSyncMessages.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivesyncmessages-ts-labs-drive-sync-paused-idle-message",
    "name": "LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE",
    "path": "src/shared/drive/labsDriveSyncMessages.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivesyncmessages-ts-labsdrivesyncmessageisfailure",
    "name": "labsDriveSyncMessageIsFailure",
    "path": "src/shared/drive/labsDriveSyncMessages.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when message should render as error in LabsAccountMenu.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivesyncmessages-ts-labsdrivesyncmessageneedssignin",
    "name": "labsDriveSyncMessageNeedsSignIn",
    "path": "src/shared/drive/labsDriveSyncMessages.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when message should render as warning (reconnect) in LabsAccountMenu.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsdrivesyncmessages-ts-labsdrivesyncoperation",
    "name": "LabsDriveSyncOperation",
    "path": "src/shared/drive/labsDriveSyncMessages.ts",
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
    "id": "src-shared-drive-parsedrivefolderurl-ts-isdrivefolderbrowserurl",
    "name": "isDriveFolderBrowserUrl",
    "path": "src/shared/drive/parseDriveFolderUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when the URL is a Drive **folder** browser link (not a file).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-parsedrivefolderurl-ts-parsedrivefileidfromurlorid",
    "name": "parseDriveFileIdFromUrlOrId",
    "path": "src/shared/drive/parseDriveFolderUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Extract Google Drive file id from common URL shapes or raw id.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-parsedrivefolderurl-ts-parsedrivefolderidfromurlorid",
    "name": "parseDriveFolderIdFromUrlOrId",
    "path": "src/shared/drive/parseDriveFolderUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Extract folder id from Drive folder URLs or a raw folder id string.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-parsedrivefolderurl-ts-parsedrivefolderidfromuserinput",
    "name": "parseDriveFolderIdFromUserInput",
    "path": "src/shared/drive/parseDriveFolderUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Folder id from multiline paste / URL / raw id. Folder URLs via , then single-line token via .",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-resolvedrivefolderfromuserinput-ts-drive-folder-mime-type",
    "name": "DRIVE_FOLDER_MIME_TYPE",
    "path": "src/shared/drive/resolveDriveFolderFromUserInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-resolvedrivefolderfromuserinput-ts-resolvedrivefolderfromuserinput",
    "name": "resolveDriveFolderFromUserInput",
    "path": "src/shared/drive/resolveDriveFolderFromUserInput.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parse pasted text, then confirm via Drive that the id is a folder (not a file). Follows Drive shortcuts when they point at a folder.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-resolvedrivefolderfromuserinput-ts-resolvedrivefolderfromuserinputerr",
    "name": "ResolveDriveFolderFromUserInputErr",
    "path": "src/shared/drive/resolveDriveFolderFromUserInput.ts",
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
    "id": "src-shared-drive-resolvedrivefolderfromuserinput-ts-resolvedrivefolderfromuserinputok",
    "name": "ResolveDriveFolderFromUserInputOk",
    "path": "src/shared/drive/resolveDriveFolderFromUserInput.ts",
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
    "id": "src-shared-drive-resolvedrivefolderfromuserinput-ts-resolvedrivefolderfromuserinputresult",
    "name": "ResolveDriveFolderFromUserInputResult",
    "path": "src/shared/drive/resolveDriveFolderFromUserInput.ts",
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
    "id": "src-shared-drive-resolvevitegoogleapikeyfordev-ts-applydevgoogleapikeyfromgithub",
    "name": "applyDevGoogleApiKeyFromGitHub",
    "path": "src/shared/drive/resolveViteGoogleApiKeyForDev.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Set `process.env.VITE_GOOGLE_API_KEY` when missing locally and resolvable (files or GitHub).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-resolvevitegoogleapikeyfordev-ts-fetchgoogleapikeyfromgithubactionsvariable",
    "name": "fetchGoogleApiKeyFromGitHubActionsVariable",
    "path": "src/shared/drive/resolveViteGoogleApiKeyForDev.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Read `VITE_GOOGLE_API_KEY` from GitHub Actions variables (repo, then `github-pages` env).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-resolvevitegoogleapikeyfordev-ts-readlabsviteenvfiles",
    "name": "readLabsViteEnvFiles",
    "path": "src/shared/drive/resolveViteGoogleApiKeyForDev.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve VITE_GOOGLE_API_KEY for local dev: `.env.local` / `.env.development` first, then GitHub Actions **variables** via `gh` (secrets are write-only and cannot be fetched).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-resolvevitegoogleapikeyfordev-ts-resolvevitegoogleapikeyfordev",
    "name": "resolveViteGoogleApiKeyForDev",
    "path": "src/shared/drive/resolveViteGoogleApiKeyForDev.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve VITE_GOOGLE_API_KEY for local dev: `.env.local` / `.env.development` first, then GitHub Actions **variables** via `gh` (secrets are write-only and cannot be fetched).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-uselabsdriveportfolioautosync-ts-uselabsdriveportfolioautosync",
    "name": "useLabsDrivePortfolioAutoSync",
    "path": "src/shared/drive/useLabsDrivePortfolioAutoSync.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared session lifecycle for portfolio Drive backup apps: - Silent auto-pull on session start, periodically while visible, and on tab focus - Debounced auto-push after local edits (gated by allowAutoPush)",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-uselabsdriveportfolioautosync-ts-uselabsdriveportfolioautosyncoptions",
    "name": "UseLabsDrivePortfolioAutoSyncOptions",
    "path": "src/shared/drive/useLabsDrivePortfolioAutoSync.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-clearpersistedgoogleidentity",
    "name": "clearPersistedGoogleIdentity",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-clearpersistedgooglesession",
    "name": "clearPersistedGoogleSession",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-encore-google-session-storage-key",
    "name": "ENCORE_GOOGLE_SESSION_STORAGE_KEY",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Exported so other modules (notably `EncoreAuthContext`'s cross-tab `storage` listener) can compare against the canonical key without re-declaring it. Don't change this string without also writing a migration — it's the storage namespace for Encore's Google session.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-encoregoogletokenstorage-ts-encoregooglepersistedidentity",
    "name": "EncoreGooglePersistedIdentity",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Identity hint persisted **separately** from the access token so the account UI can keep showing \"Signed in as foo@bar.com\" after a 1-hour Google access token expires. The browser can no longer call Drive (so writes will fail until the user clicks \"Sign in again\"), but kicking the user back to the full-screen sign-in gate every hour was the loudest source of \"Encore keeps making me sign in\" complaints. Identity stays put until the user explicitly signs out / disconnects.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-google-encoregoogletokenstorage-ts-encoregooglepersistedsession",
    "name": "EncoreGooglePersistedSession",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-islikelygoogleauthrejection",
    "name": "isLikelyGoogleAuthRejection",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Heuristic: is a thrown error from `userinfo` (or `finalizeGoogleSession`) likely caused by an **invalid / revoked token** vs. something transient (network, 5xx, timeout)? We use this so the session-restore path only nukes the saved token when Google actually rejected it. Network blips used to silently sign the user out — the kind of thing that prompts \"Encore makes me re-login constantly\" complaints.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-encoregoogletokenstorage-ts-ispersistedsessionstillfresh",
    "name": "isPersistedSessionStillFresh",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-labs-encore-google-identity-changed-event",
    "name": "LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Fired on this window after identity is written or cleared. The native `storage` event does not run in the tab that performed `localStorage.setItem`, so hooks like listen for this to stay in sync after Drive token flows.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-encoregoogletokenstorage-ts-readpersistedgoogleidentity",
    "name": "readPersistedGoogleIdentity",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-readpersistedgooglesession",
    "name": "readPersistedGoogleSession",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-writepersistedgoogleidentity",
    "name": "writePersistedGoogleIdentity",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-encoregoogletokenstorage-ts-writepersistedgooglesession",
    "name": "writePersistedGoogleSession",
    "path": "src/shared/google/encoreGoogleTokenStorage.ts",
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
    "id": "src-shared-google-formatlabsdriveinstant-ts-formatlabsdriveinstant",
    "name": "formatLabsDriveInstant",
    "path": "src/shared/google/formatLabsDriveInstant.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Human-readable timestamp for Drive backup / sync captions (today, yesterday, or Mon DD).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-googletokenclient-ts-requestgoogleaccesstoken",
    "name": "requestGoogleAccessToken",
    "path": "src/shared/google/googleTokenClient.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "GIS `initTokenClient` + `requestAccessToken` can flash a consent UI if several calls overlap (silent refresh + visibility + bootstrap). Serialize so only one token exchange runs at a time.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-googletokenclient-ts-revokegoogleaccesstokenbesteffort",
    "name": "revokeGoogleAccessTokenBestEffort",
    "path": "src/shared/google/googleTokenClient.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "GIS `initTokenClient` + `requestAccessToken` can flash a consent UI if several calls overlap (silent refresh + visibility + bootstrap). Serialize so only one token exchange runs at a time.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsaccountmenu-tsx-labsaccountbackupslotprops",
    "name": "LabsAccountBackupSlotProps",
    "path": "src/shared/google/LabsAccountMenu.tsx",
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
    "id": "src-shared-google-labsaccountmenu-tsx-labsaccountmenu",
    "name": "LabsAccountMenu",
    "path": "src/shared/google/LabsAccountMenu.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimal account + Labs app strip + Google Drive backup (test) block. Apps pass theme-specific `appearance` and `renderBackupButton` for Encore / Stanza / Scales styling. When Google is configured but there is no **persisted Labs Google identity** yet, renders a sign-in entry point (same Encore `localStorage` keys) instead of hiding entirely.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsaccountmenu-tsx-labsaccountmenuappearance",
    "name": "LabsAccountMenuAppearance",
    "path": "src/shared/google/LabsAccountMenu.tsx",
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
    "id": "src-shared-google-labsaccountmenu-tsx-labsaccountmenuprops",
    "name": "LabsAccountMenuProps",
    "path": "src/shared/google/LabsAccountMenu.tsx",
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
    "id": "src-shared-google-labsdriveaccountmenu-tsx-labsdriveaccountmenu",
    "name": "LabsDriveAccountMenu",
    "path": "src/shared/google/LabsDriveAccountMenu.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Account menu with shared Google Drive backup UX: back up, restore picker, Open in Drive, and optional conflict dialog. Apps supply from their hook/context.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdriveaccountmenu-tsx-labsdriveaccountmenuprops",
    "name": "LabsDriveAccountMenuProps",
    "path": "src/shared/google/LabsDriveAccountMenu.tsx",
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
    "id": "src-shared-google-labsdrivebackupactionrow-tsx-labsdrivebackupactionrow",
    "name": "LabsDriveBackupActionRow",
    "path": "src/shared/google/LabsDriveBackupActionRow.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdrivebackupactionrow-tsx-labsdrivebackupactionrowprops",
    "name": "LabsDriveBackupActionRowProps",
    "path": "src/shared/google/LabsDriveBackupActionRow.tsx",
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
    "id": "src-shared-google-labsdrivebackupuitypes-ts-labsdrivebackupuiprops",
    "name": "LabsDriveBackupUiProps",
    "path": "src/shared/google/labsDriveBackupUiTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive restore + folder link actions rendered under the backup block.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdrivebackupuitypes-ts-labsdriveconflictuiprops",
    "name": "LabsDriveConflictUiProps",
    "path": "src/shared/google/labsDriveBackupUiTypes.ts",
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
    "id": "src-shared-google-labsdrivebackupuitypes-ts-labsdriverestoredialogcopy",
    "name": "LabsDriveRestoreDialogCopy",
    "path": "src/shared/google/labsDriveBackupUiTypes.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Copy for the manual restore picker (shared across Drive-synced Labs apps).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdrivebackupuitypes-ts-labsdriverestoredriveoption",
    "name": "LabsDriveRestoreDriveOption",
    "path": "src/shared/google/labsDriveBackupUiTypes.ts",
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
    "id": "src-shared-google-labsdrivebackupuitypes-ts-labsdriveundosnapshotitem",
    "name": "LabsDriveUndoSnapshotItem",
    "path": "src/shared/google/labsDriveBackupUiTypes.ts",
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
    "id": "src-shared-google-labsdriveconflictdialog-tsx-labsdriveconflictdialog",
    "name": "LabsDriveConflictDialog",
    "path": "src/shared/google/LabsDriveConflictDialog.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdriverestoredialog-tsx-labsdriverestoredialog",
    "name": "LabsDriveRestoreDialog",
    "path": "src/shared/google/LabsDriveRestoreDialog.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdrivetestergate-ts-getlabsdrivebackuprestrictionhashesfromenv",
    "name": "getLabsDriveBackupRestrictionHashesFromEnv",
    "path": "src/shared/google/labsDriveTesterGate.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Optional deploy-time restriction; empty set means backup is open to all signed-in users.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdrivetestergate-ts-isemailallowedlabsdrivebackup",
    "name": "isEmailAllowedLabsDriveBackup",
    "path": "src/shared/google/labsDriveTesterGate.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Optional restriction list for Stanza / Scales Drive backup (`VITE_LABS_DRIVE_TESTER_HASHES`). When unset, any signed-in Google user may use Drive backup (GA default). `resolveLabsDriveTesterHashSets` remains for legacy Encore allowlist fallback in tests only.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsdrivetestergate-ts-resolvelabsdrivetesterhashsets",
    "name": "resolveLabsDriveTesterHashSets",
    "path": "src/shared/google/labsDriveTesterGate.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Optional restriction list for Stanza / Scales Drive backup (`VITE_LABS_DRIVE_TESTER_HASHES`). When unset, any signed-in Google user may use Drive backup (GA default). `resolveLabsDriveTesterHashSets` remains for legacy Encore allowlist fallback in tests only.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-ensurelabsgoogleaccesstokenfordrive",
    "name": "ensureLabsGoogleAccessTokenForDrive",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Returns a usable access token for Drive + userinfo. Nuclear sign-in posture (see [ADR 0011](../../../docs/adr/0011-labs-stanza-scales-no-background-google-refresh.md)): 1. If the locally-persisted Encore session is still fresh, validate it via userinfo and return. Userinfo is a plain HTTPS call — no Google Identity Services iframe / popup involved. 2. Otherwise: when `interactive: false` (background callers), throw immediately — callers must retry from a user gesture. When `interactive: true`, open exactly one GIS popup. The silent `prompt: 'none'` path that used to sit between (1) and (2) has been removed: it was the documented source of ghost iframes / phantom popups that accumulated across Stanza / Scales tabs (see ADR 0010 for the Encore-side rationale and ADR 0011 for the shared-layer extension).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-ensurelabsgoogleaccesstokenfordriveimport",
    "name": "ensureLabsGoogleAccessTokenForDriveImport",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Token for bulk import from pasted Drive folders (includes ). Pass `upgradeScopes: true` from a button click when download fails or before the first import.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-labs-google-drive-file-scope",
    "name": "LABS_GOOGLE_DRIVE_FILE_SCOPE",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimal scopes for portfolio Drive backup (incremental auth on user action). `drive.file` — files created by this app only, per Google's restricted-scope contract.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-labs-google-drive-import-scopes",
    "name": "LABS_GOOGLE_DRIVE_IMPORT_SCOPES",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "User-visible copy when GIS needs a popup from a click (not from automatic page load).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-labs-google-drive-readonly-scope",
    "name": "LABS_GOOGLE_DRIVE_READONLY_SCOPE",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Adds `drive.readonly` so apps can download PDFs (or other files) from folders the user pastes or can already open in Drive. Listing works with `drive.metadata.readonly` alone; `alt=media` needs read access to file bytes.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-labs-google-drive-session-scopes",
    "name": "LABS_GOOGLE_DRIVE_SESSION_SCOPES",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Scopes for Labs Drive token refresh (Stanza/Scales + shared storage with Encore). Matches Encore `GOOGLE_SCOPES` so `writePersistedGoogleSession` from Labs apps does not replace Encore’s token with a narrower one (which would break YouTube / Drive metadata in Encore).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-labs-google-interactive-drive-auth-hint",
    "name": "LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "User-visible copy when GIS needs a popup from a click (not from automatic page load).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-labsgoogleinteractiveauthrequirederror",
    "name": "LabsGoogleInteractiveAuthRequiredError",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Thrown when a fresh token needs GIS interactive (popup) auth — must run from a user gesture.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogledriveaccess-ts-reconnectlabsgoogledrivesession",
    "name": "reconnectLabsGoogleDriveSession",
    "path": "src/shared/google/labsGoogleDriveAccess.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Clears the cached access token and opens Google sign-in from a user gesture. Keeps the remembered email as a login hint. Use from Account → Sign in again.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgoogleoauthredirecturi-ts-resolvelabsgoogleoauthredirecturi",
    "name": "resolveLabsGoogleOAuthRedirectUri",
    "path": "src/shared/google/labsGoogleOAuthRedirectUri.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "OAuth `redirect_uri` for GIS `initTokenClient`. Must **exactly** match an entry under \"Authorized redirect URIs\" in Google Cloud Console. Resolution order: 1. `VITE_GOOGLE_OAUTH_REDIRECT_URI` when set (full URL). 2. Else `{origin}/encore` — Encore is the canonical OAuth surface; Stanza/Scales reuse the same client id and **must not** default to `/stanza` or `/scales` unless those URIs are registered. Using `/encore` avoids silent GIS failures when only Encore’s redirect is configured. No trailing slash — match Console entries like `https://labs.example.com/encore`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-getlabsgooglesessionconsumeridfrompath",
    "name": "getLabsGoogleSessionConsumerIdFromPath",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Labs micro-apps on this site that read the shared Google identity (`encore_google_*` keys).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-labs-google-session-consumers",
    "name": "LABS_GOOGLE_SESSION_CONSUMERS",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Labs micro-apps on this site that read the shared Google identity (`encore_google_*` keys).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-labsgooglesessionconsumerid",
    "name": "LabsGoogleSessionConsumerId",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Labs micro-apps on this site that read the shared Google identity (`encore_google_*` keys).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-labsgooglesessionconsumermeta",
    "name": "LabsGoogleSessionConsumerMeta",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Labs micro-apps on this site that read the shared Google identity (`encore_google_*` keys).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-labsgooglesessiontouches",
    "name": "LabsGoogleSessionTouches",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Labs micro-apps on this site that read the shared Google identity (`encore_google_*` keys).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-readlabsgooglesessiontouches",
    "name": "readLabsGoogleSessionTouches",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Labs micro-apps on this site that read the shared Google identity (`encore_google_*` keys).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-touchlabsgooglesessionconsumer",
    "name": "touchLabsGoogleSessionConsumer",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Record that the user opened this Labs app (same browser profile).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesessionconsumers-ts-uselabsgooglesessiontouches",
    "name": "useLabsGoogleSessionTouches",
    "path": "src/shared/google/labsGoogleSessionConsumers.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Epoch ms touch map; refreshes on storage (other tabs), window focus, and same-tab touches.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesigninbutton-tsx-labsgooglesigninbutton",
    "name": "LabsGoogleSignInButton",
    "path": "src/shared/google/LabsGoogleSignInButton.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Branded “Sign in with Google” control for GIS token flows. Renders the multicolor G mark with required clear space; triggers `onClick` to run `requestGoogleAccessToken` from the parent.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsgooglesigninbutton-tsx-labsgooglesigninbuttonprops",
    "name": "LabsGoogleSignInButtonProps",
    "path": "src/shared/google/LabsGoogleSignInButton.tsx",
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
    "id": "src-shared-google-loadgisscript-ts-fetchgoogleuserprofile",
    "name": "fetchGoogleUserProfile",
    "path": "src/shared/google/loadGisScript.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google OAuth2 userinfo (includes `given_name` / `name` when the account provides them).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-loadgisscript-ts-friendlygoogledisplayname",
    "name": "friendlyGoogleDisplayName",
    "path": "src/shared/google/loadGisScript.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Prefer given name, then first token of full name, then a title-cased email local-part.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-loadgisscript-ts-googletokenclient",
    "name": "GoogleTokenClient",
    "path": "src/shared/google/loadGisScript.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "GIS TokenClient interface. We rely on the documented surface (`requestAccessToken`) plus the commonly-used mutable `callback` / `error_callback` fields so a single client can be reused across multiple `requestAccessToken` calls without re-running `initTokenClient`. Re-running `initTokenClient` is the documented cause of the `accounts.google.com/gsi/transform` iframe accumulation we saw in user reports — each new client mounts another hidden iframe that GIS does not garbage-collect until the page unloads.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-google-loadgisscript-ts-googleuserprofile",
    "name": "GoogleUserProfile",
    "path": "src/shared/google/loadGisScript.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "GIS TokenClient interface. We rely on the documented surface (`requestAccessToken`) plus the commonly-used mutable `callback` / `error_callback` fields so a single client can be reused across multiple `requestAccessToken` calls without re-running `initTokenClient`. Re-running `initTokenClient` is the documented cause of the `accounts.google.com/gsi/transform` iframe accumulation we saw in user reports — each new client mounts another hidden iframe that GIS does not garbage-collect until the page unloads.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-google-loadgisscript-ts-loadgoogleidentityscript",
    "name": "loadGoogleIdentityScript",
    "path": "src/shared/google/loadGisScript.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "GIS TokenClient interface. We rely on the documented surface (`requestAccessToken`) plus the commonly-used mutable `callback` / `error_callback` fields so a single client can be reused across multiple `requestAccessToken` calls without re-running `initTokenClient`. Re-running `initTokenClient` is the documented cause of the `accounts.google.com/gsi/transform` iframe accumulation we saw in user reports — each new client mounts another hidden iframe that GIS does not garbage-collect until the page unloads.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-uselabsencoregooglesession-ts-uselabsencoregoogleidentity",
    "name": "useLabsEncoreGoogleIdentity",
    "path": "src/shared/google/useLabsEncoreGoogleSession.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Re-reads Encore-persisted Google identity from `localStorage` on sibling-tab `storage` events, window `focus`, and same-tab custom events. **Never** calls Google Identity Services — see [ADR 0011](../../../docs/adr/0011-labs-stanza-scales-no-background-google-refresh.md). Stability note (load-bearing): `setIdentity` is gated by . `readPersistedGoogleIdentity` returns a fresh object every call (JSON parse); without this guard, repeated focus / storage events would push a new reference into state on every fire, thrashing downstream consumers. History: this hook previously fired a one-shot silent `prompt: 'none'` token request on mount to \"backfill\" an identity when none was persisted yet. That path was the documented source of ghost iframes / phantom popups across Stanza / Scales tabs (the GIS hidden iframe leaks one per silent attempt). Per ADR 0011 the backfill was removed: users now click Sign in once when the persisted identity is missing or expired.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-google-uselabsgoogledriveneedssignin-ts-uselabsgoogledriveneedssignin",
    "name": "useLabsGoogleDriveNeedsSignIn",
    "path": "src/shared/google/useLabsGoogleDriveNeedsSignIn.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when the user has a remembered Labs Google identity but no fresh access token (Drive sync paused until they sign in again from a button click).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-hooks-usechartchordplayback-ts-usechartchordplayback",
    "name": "useChartChordPlayback",
    "path": "src/shared/hooks/useChartChordPlayback.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-hooks-usechartchordplayback-ts-usechartchordplaybackoptions",
    "name": "UseChartChordPlaybackOptions",
    "path": "src/shared/hooks/useChartChordPlayback.ts",
    "kind": "hook",
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
    "id": "src-shared-hooks-usechartchordplayback-ts-usechartchordplaybackresult",
    "name": "UseChartChordPlaybackResult",
    "path": "src/shared/hooks/useChartChordPlayback.ts",
    "kind": "hook",
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
    "id": "src-shared-hooks-usedragdrophighlight-ts-dragdrophighlighthandlers",
    "name": "DragDropHighlightHandlers",
    "path": "src/shared/hooks/useDragDropHighlight.ts",
    "kind": "hook",
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
    "id": "src-shared-hooks-usedragdrophighlight-ts-usedragdrophighlight",
    "name": "useDragDropHighlight",
    "path": "src/shared/hooks/useDragDropHighlight.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Depth-counter drag highlight — avoids flicker when crossing child elements. Used by and Encore section drop targets.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-hooks-usedragdrophighlight-ts-usedragdrophighlightoptions",
    "name": "UseDragDropHighlightOptions",
    "path": "src/shared/hooks/useDragDropHighlight.ts",
    "kind": "hook",
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
    "id": "src-shared-hooks-usepopoverscrollanchorsync-ts-collectpopoverscrollparents",
    "name": "collectPopoverScrollParents",
    "path": "src/shared/hooks/usePopoverScrollAnchorSync.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Scrollable ancestors of the anchor — includes Labs `.in-scroll-region` when present.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-hooks-usepopoverscrollanchorsync-ts-popoveranchorel",
    "name": "popoverAnchorEl",
    "path": "src/shared/hooks/usePopoverScrollAnchorSync.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Prefer a getter so MUI reads a fresh rect on each reposition.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-hooks-usepopoverscrollanchorsync-ts-usepopoverscrollanchorsync",
    "name": "usePopoverScrollAnchorSync",
    "path": "src/shared/hooks/usePopoverScrollAnchorSync.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Keeps MUI `Popover` anchored while nested scroll containers move (e.g. Encore `.in-scroll-region`). MUI only listens to `window` scroll when `disableScrollLock` is set; this fills the gap for in-app scroll regions.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-hooks-usesampledpianopreload-ts-usesampledpianopreload",
    "name": "useSampledPianoPreload",
    "path": "src/shared/hooks/useSampledPianoPreload.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Preloads sampled piano when `soundType` is `piano-sampled`. Reuses one instance for the caller's playback hook and mirrors global Salamander load state across Labs apps on the same page.",
    "tags": [],
    "appsUsing": [
      "chords",
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-labsblockingjobhandle",
    "name": "LabsBlockingJobHandle",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-labsblockingjobprovider",
    "name": "LabsBlockingJobProvider",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-labsblockingjobproviderprops",
    "name": "LabsBlockingJobProviderProps",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-labsblockingjobsactive",
    "name": "labsBlockingJobsActive",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-labsblockingjobsapi",
    "name": "LabsBlockingJobsApi",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-labsstartblockingjoboptions",
    "name": "LabsStartBlockingJobOptions",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-uselabsblockingjobs",
    "name": "useLabsBlockingJobs",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobcontext-tsx-uselabsblockingjobsvisible",
    "name": "useLabsBlockingJobsVisible",
    "path": "src/shared/jobs/LabsBlockingJobContext.tsx",
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
    "id": "src-shared-jobs-labsblockingjobprogressbar-tsx-labsblockingjobprogressbar",
    "name": "LabsBlockingJobProgressBar",
    "path": "src/shared/jobs/LabsBlockingJobProgressBar.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-layout-appshelllayout-tsx-appshelllayout",
    "name": "AppShellLayout",
    "path": "src/shared/layout/AppShellLayout.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared column → workbench → scroll → content + footer shell. Pair with `app-shell-layout.css` and app-specific token overrides. Stanza uses which maps Stanza class names onto this structure.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-layout-appshelllayout-tsx-appshelllayoutprops",
    "name": "AppShellLayoutProps",
    "path": "src/shared/layout/AppShellLayout.tsx",
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
    "id": "src-shared-music-chordchartasciiexport-ts-alignchordsoverlyricline",
    "name": "alignChordsOverLyricLine",
    "path": "src/shared/music/chordChartAsciiExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Align chord tokens over lyric words (monospace ASCII chart lines).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordchartasciiexport-ts-chartlayouttoasciiexport",
    "name": "chartLayoutToAsciiExport",
    "path": "src/shared/music/chordChartAsciiExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Build a monospace ASCII chord chart from structured chart layout.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordchartasciiexport-ts-copytexttoclipboard",
    "name": "copyTextToClipboard",
    "path": "src/shared/music/chordChartAsciiExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Align chord tokens over lyric words (monospace ASCII chart lines).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordchartprintexport-ts-asciicharttexttoprinthtml",
    "name": "asciiChartTextToPrintHtml",
    "path": "src/shared/music/chordChartPrintExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Render monospace ASCII chart text as styled HTML lines for print/PDF.",
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
    "id": "src-shared-music-chordchartprintexport-ts-isasciichartchordline",
    "name": "isAsciiChartChordLine",
    "path": "src/shared/music/chordChartPrintExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "True when every whitespace-separated token on the line is a chord symbol.",
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
    "id": "src-shared-music-chordchartprintexport-ts-openmonospacechartprintwindow",
    "name": "openMonospaceChartPrintWindow",
    "path": "src/shared/music/chordChartPrintExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Open a print-friendly view for a chord chart (Save as PDF via browser print).",
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
    "id": "src-shared-music-chordcharttwocolumnexport-ts-boldsectionheaderspans",
    "name": "boldSectionHeaderSpans",
    "path": "src/shared/music/chordChartTwoColumnExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "UTF-16 half-open ranges for section header lines like `[Verse 1]`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordcharttwocolumnexport-ts-chartlayouttotwocolumnexport",
    "name": "chartLayoutToTwoColumnExport",
    "path": "src/shared/music/chordChartTwoColumnExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Split chart sections across two columns for print / Google Docs export.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordcharttwocolumnexport-ts-twocolumnchartexport",
    "name": "TwoColumnChartExport",
    "path": "src/shared/music/chordChartTwoColumnExport.ts",
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
    "id": "src-shared-music-chordinstrumentsession-ts-chordinstrumentsession",
    "name": "ChordInstrumentSession",
    "path": "src/shared/music/chordInstrumentSession.ts",
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
    "id": "src-shared-music-chordinstrumentsession-ts-sampledpianoloadstate",
    "name": "SampledPianoLoadState",
    "path": "src/shared/music/chordInstrumentSession.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
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
    "id": "src-shared-music-chordplaybacksettings-ts-chart-chord-playback-time-signature",
    "name": "CHART_CHORD_PLAYBACK_TIME_SIGNATURE",
    "path": "src/shared/music/chordPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chart chord playback assumes 4/4 (two quarter-note measures per lyric line).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordplaybacksettings-ts-chordplaybacksettings",
    "name": "ChordPlaybackSettings",
    "path": "src/shared/music/chordPlaybackSettings.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chart chord playback assumes 4/4 (two quarter-note measures per lyric line).",
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
    "id": "src-shared-music-chordplaybacksettings-ts-default-chord-playback-settings",
    "name": "DEFAULT_CHORD_PLAYBACK_SETTINGS",
    "path": "src/shared/music/chordPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chart chord playback assumes 4/4 (two quarter-note measures per lyric line).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [
      "ui"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordplaybacksettings-ts-effectivechordplaybackvelocity",
    "name": "effectiveChordPlaybackVelocity",
    "path": "src/shared/music/chordPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chart chord playback assumes 4/4 (two quarter-note measures per lyric line).",
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
    "id": "src-shared-music-chordplaybacksettings-ts-effectivedrumplaybackvolume",
    "name": "effectiveDrumPlaybackVolume",
    "path": "src/shared/music/chordPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chart chord playback assumes 4/4 (two quarter-note measures per lyric line).",
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
    "id": "src-shared-music-chordplaybacksettings-ts-loadchordplaybacksettings",
    "name": "loadChordPlaybackSettings",
    "path": "src/shared/music/chordPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chart chord playback assumes 4/4 (two quarter-note measures per lyric line).",
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
    "id": "src-shared-music-chordplaybacksettings-ts-savechordplaybacksettings",
    "name": "saveChordPlaybackSettings",
    "path": "src/shared/music/chordPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chart chord playback assumes 4/4 (two quarter-note measures per lyric line).",
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
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-chart-playback-beats-per-measure",
    "name": "CHART_PLAYBACK_BEATS_PER_MEASURE",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Assume 4/4: each lyric line spans two measures; one chord change per measure.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-chart-playback-measures-per-line",
    "name": "CHART_PLAYBACK_MEASURES_PER_LINE",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Assume 4/4: each lyric line spans two measures; one chord change per measure.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-chartlayouttoplaybacksequence",
    "name": "chartLayoutToPlaybackSequence",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Build a measure-aligned playback schedule: two measures per lyric line, chord at each measure boundary, holding/repeating the previous chord when a line has fewer changes.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-chartplaybackmeasuredurationms",
    "name": "chartPlaybackMeasureDurationMs",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "One measure duration in ms at the given tempo (4/4).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-chartplaybackstep",
    "name": "ChartPlaybackStep",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Assume 4/4: each lyric line spans two measures; one chord change per measure.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-assignchordcharindicesfromcolumns",
    "name": "assignChordCharIndicesFromColumns",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Assign char indices from chord-over-lyrics column positions.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-chartlayout",
    "name": "ChartLayout",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-chordmarker",
    "name": "ChordMarker",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-groupchordsbytokenstart",
    "name": "groupChordsByTokenStart",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Group chord markers by lyric word-start for paint/export (supports duplicate indices).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-infersectiontype",
    "name": "inferSectionType",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-layouttowritedocument",
    "name": "layoutToWriteDocument",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Plain-text document for Write Mode (headers + lyrics, no chord tokens).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-linetoken",
    "name": "LineToken",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-lyricline",
    "name": "LyricLine",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-movechordbyid",
    "name": "moveChordById",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-newlineid",
    "name": "newLineId",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-parsechordprotochartlayout",
    "name": "parseChordProToChartLayout",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Parse a ChordPro document into structured chart layout.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-parsewritedocumenttolayout",
    "name": "parseWriteDocumentToLayout",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Apply Write Mode edits while preserving chord markers via index reconciliation.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-reconcilechordsaftertextchange",
    "name": "reconcileChordsAfterTextChange",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shift chord indices after a single-line text edit (prefix/suffix diff).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-removechordbyid",
    "name": "removeChordById",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-replacechordbyid",
    "name": "replaceChordById",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-sectiontype",
    "name": "SectionType",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-serializechartlayouttochordpro",
    "name": "serializeChartLayoutToChordPro",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Serialize structured layout back to ChordPro for Drive / IndexedDB storage.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-slugsectionid",
    "name": "slugSectionId",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-snapchordcolumntocharindex",
    "name": "snapChordColumnToCharIndex",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Map a monospace chord-line column to a lyric word-start index. Columns past the lyric length snap to the last word (common for trailing chords).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-songsection",
    "name": "SongSection",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-tokenizelyricline",
    "name": "tokenizeLyricLine",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Split a lyric line into word/whitespace tokens with character start indices.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-updatelineinlayout",
    "name": "updateLineInLayout",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordchartlayout-ts-upsertchordatindex",
    "name": "upsertChordAtIndex",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Replace every chord at `charIndex` with a single new marker (does not append a sibling).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-chordprolyricsnippet",
    "name": "chordProLyricSnippet",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Plain lyric snippet for library cards (no chords, collapsed whitespace).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-chordprosection",
    "name": "ChordProSection",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Matches inline ChordPro chord tokens like `[Fm]`, `[Bbmaj7]`, `[C/E]`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-chordprosectiontypekey",
    "name": "chordProSectionTypeKey",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Section type key for inheritance, e.g. `Verse 1` → `Verse`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-chordprosegment",
    "name": "ChordProSegment",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Matches inline ChordPro chord tokens like `[Fm]`, `[Bbmaj7]`, `[C/E]`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-extractchordsymbolsfromtext",
    "name": "extractChordSymbolsFromText",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Extract ordered chord symbols from a line or section body.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-ischordprosectionheaderline",
    "name": "isChordProSectionHeaderLine",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Matches inline ChordPro chord tokens like `[Fm]`, `[Bbmaj7]`, `[C/E]`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-parsechordproline",
    "name": "parseChordProLine",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Split a single line into alternating chord and lyric segments.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-parsechordprosectionheader",
    "name": "parseChordProSectionHeader",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Matches inline ChordPro chord tokens like `[Fm]`, `[Bbmaj7]`, `[C/E]`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-parsechordprosections",
    "name": "parseChordProSections",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Matches inline ChordPro chord tokens like `[Fm]`, `[Bbmaj7]`, `[C/E]`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-semitonesbetweenkeys",
    "name": "semitonesBetweenKeys",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Matches inline ChordPro chord tokens like `[Fm]`, `[Bbmaj7]`, `[C/E]`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-stripchordbrackets",
    "name": "stripChordBrackets",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Remove all `[...]` chord tokens for lyrics-only view.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordprotext-ts-transposechordprodocument",
    "name": "transposeChordProDocument",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Transpose all inline chords by semitones (key change).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-fixtures-ts-meet-me-around-lyric",
    "name": "MEET_ME_AROUND_LYRIC",
    "path": "src/shared/music/chordPro/fixtures.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Lyric line used in import tests: two chords on “around”.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-fixtures-ts-meet-me-moon-paste",
    "name": "MEET_ME_MOON_PASTE",
    "path": "src/shared/music/chordPro/fixtures.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared chord-chart fixtures for unit tests (import layout, paint, multi-chord words). Canonical source for “Meet Me on the Moon” paste regressions — see `pastedChartImport.test.ts`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-pastedchartimport-ts-extractchartportionforimport",
    "name": "extractChartPortionForImport",
    "path": "src/shared/music/chordPro/pastedChartImport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Long brainstorm + chart pastes: keep the trailing chord-chart block instead of treating prose above as lyric lines in an anonymous section.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-pastedchartimport-ts-importpastedchartfromclipboard",
    "name": "importPastedChartFromClipboard",
    "path": "src/shared/music/chordPro/pastedChartImport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Detect, optionally excerpt, and parse clipboard chart text for Originals Write mode.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-pastedchartimport-ts-ischordonlyline",
    "name": "isChordOnlyLine",
    "path": "src/shared/music/chordPro/pastedChartImport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "True when the line is only chord symbols (and whitespace / punctuation).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-pastedchartimport-ts-lookslikepastedchart",
    "name": "looksLikePastedChart",
    "path": "src/shared/music/chordPro/pastedChartImport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chord symbol token — roots, qualities, slash bass, parenthetical extensions. Intentionally permissive so pasted charts preserve symbols the playback engine may not parse.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-pastedchartimport-ts-parsepastedcharttochartlayout",
    "name": "parsePastedChartToChartLayout",
    "path": "src/shared/music/chordPro/pastedChartImport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Parse pasted chart text (chord-over-lyrics, plain headers, or inline ChordPro) into app layout.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-pastedchartimport-ts-pastedchartimportsummary",
    "name": "PastedChartImportSummary",
    "path": "src/shared/music/chordPro/pastedChartImport.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chord symbol token — roots, qualities, slash bass, parenthetical extensions. Intentionally permissive so pasted charts preserve symbols the playback engine may not parse.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
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
    "id": "src-shared-music-chordsymboldisplay-ts-chordnotationmode",
    "name": "ChordNotationMode",
    "path": "src/shared/music/chordSymbolDisplay.ts",
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
    "id": "src-shared-music-chordsymboldisplay-ts-chordsymboltoromandisplay",
    "name": "chordSymbolToRomanDisplay",
    "path": "src/shared/music/chordSymbolDisplay.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Map a chord symbol to roman numeral display in the song key (falls back to letters).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordsymboldisplay-ts-formatchordfordisplay",
    "name": "formatChordForDisplay",
    "path": "src/shared/music/chordSymbolDisplay.ts",
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
    "id": "src-shared-music-chordsymboltotheorychord-ts-chordsymboltotheorychord",
    "name": "chordSymbolToTheoryChord",
    "path": "src/shared/music/chordSymbolToTheoryChord.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Map a chart chord symbol (e.g. `Fm`, `Bbmaj7`) to shared voicing input.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtheory-ts-getscalepitchclasses",
    "name": "getScalePitchClasses",
    "path": "src/shared/music/chordTheory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared chord theory helpers used by multiple music apps.",
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
      "chords",
      "piano"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtheory-ts-harmonicmodefromsongkey",
    "name": "harmonicModeFromSongKey",
    "path": "src/shared/music/chordTheory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared chord theory helpers used by multiple music apps.",
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
      "chords",
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
      "chords",
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtheory-ts-songkeytotonic",
    "name": "songKeyToTonic",
    "path": "src/shared/music/chordTheory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared chord theory helpers used by multiple music apps.",
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
      "chords",
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
      "piano",
      "ui"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-musicinputconstants-ts-transposemusickey",
    "name": "transposeMusicKey",
    "path": "src/shared/music/musicInputConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Transpose a key root by semitones; returns a label.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "piano",
      "ui"
    ],
    "exportType": "function",
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
    "id": "src-shared-music-playbackrateconstants-ts-clampplaybackrate",
    "name": "clampPlaybackRate",
    "path": "src/shared/music/playbackRateConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Local audio/video element and YouTube embed (YouTube may snap to nearest supported rate).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-playbackrateconstants-ts-default-playback-rate-max",
    "name": "DEFAULT_PLAYBACK_RATE_MAX",
    "path": "src/shared/music/playbackRateConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Local audio/video element and YouTube embed (YouTube may snap to nearest supported rate).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-playbackrateconstants-ts-default-playback-rate-min",
    "name": "DEFAULT_PLAYBACK_RATE_MIN",
    "path": "src/shared/music/playbackRateConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Local audio/video element and YouTube embed (YouTube may snap to nearest supported rate).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-playbackrateconstants-ts-default-playback-rate-step",
    "name": "DEFAULT_PLAYBACK_RATE_STEP",
    "path": "src/shared/music/playbackRateConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Local audio/video element and YouTube embed (YouTube may snap to nearest supported rate).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-playbackrateconstants-ts-default-speed-menu-presets",
    "name": "DEFAULT_SPEED_MENU_PRESETS",
    "path": "src/shared/music/playbackRateConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Preset chips in the speed menu — denser near 1× for practice tweaks.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-playbackrateconstants-ts-formatplaybackratedraft",
    "name": "formatPlaybackRateDraft",
    "path": "src/shared/music/playbackRateConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Local audio/video element and YouTube embed (YouTube may snap to nearest supported rate).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-playbackrateconstants-ts-formatplaybackratelabel",
    "name": "formatPlaybackRateLabel",
    "path": "src/shared/music/playbackRateConstants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Local audio/video element and YouTube embed (YouTube may snap to nearest supported rate).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-playbackvolumemix-ts-buildeffectiveauxiliarydrumgain",
    "name": "buildEffectiveAuxiliaryDrumGain",
    "path": "src/shared/music/playbackVolumeMix.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Backing beat / auxiliary drum hits: same master × channel scaling as chord gain.",
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
    "id": "src-shared-music-playbackvolumemix-ts-buildeffectivechannelgain",
    "name": "buildEffectiveChannelGain",
    "path": "src/shared/music/playbackVolumeMix.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Scale a 0–100 channel through master mute/volume to a 0–1 gain.",
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
    "id": "src-shared-music-playbackvolumemix-ts-buildeffectivedrumplaybacksettings",
    "name": "buildEffectiveDrumPlaybackSettings",
    "path": "src/shared/music/playbackVolumeMix.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Scale drum playback settings by master + drums mixer channels.",
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
    "id": "src-shared-music-playbackvolumemix-ts-channelvolumeinput",
    "name": "ChannelVolumeInput",
    "path": "src/shared/music/playbackVolumeMix.ts",
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
    "id": "src-shared-music-playbackvolumemix-ts-masterdrummixinput",
    "name": "MasterDrumMixInput",
    "path": "src/shared/music/playbackVolumeMix.ts",
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
    "id": "src-shared-music-sampledpianoloadstate-ts-idle-sampled-piano-load-state",
    "name": "IDLE_SAMPLED_PIANO_LOAD_STATE",
    "path": "src/shared/music/sampledPianoLoadState.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared load progress for across playback UIs.",
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
    "id": "src-shared-music-sampledpianoloadstate-ts-sampledpianoloadcaption",
    "name": "sampledPianoLoadCaption",
    "path": "src/shared/music/sampledPianoLoadState.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared load progress for across playback UIs.",
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
    "id": "src-shared-music-sampledpianoloadstate-ts-sampledpianoloadpercent",
    "name": "sampledPianoLoadPercent",
    "path": "src/shared/music/sampledPianoLoadState.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared load progress for across playback UIs.",
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
    "id": "src-shared-music-sampledpianoloadstate-ts-sampledpianoloadstate",
    "name": "SampledPianoLoadState",
    "path": "src/shared/music/sampledPianoLoadState.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Shared load progress for across playback UIs.",
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
    "id": "src-shared-music-scheduledrummeasure-ts-createchartdrumaudioplayer",
    "name": "createChartDrumAudioPlayer",
    "path": "src/shared/music/scheduleDrumMeasure.ts",
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
    "id": "src-shared-music-scheduledrummeasure-ts-scheduledrummeasure",
    "name": "scheduleDrumMeasure",
    "path": "src/shared/music/scheduleDrumMeasure.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Schedule one measure of drum pattern at absolute AudioContext times.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-scheduledrummeasure-ts-scheduledrummeasureparams",
    "name": "ScheduleDrumMeasureParams",
    "path": "src/shared/music/scheduleDrumMeasure.ts",
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
    "id": "src-shared-music-schedulestyledchordmeasure-ts-schedulestyledchordmeasure",
    "name": "scheduleStyledChordMeasure",
    "path": "src/shared/music/scheduleStyledChordMeasure.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Schedule styled chord hits across one measure using Web Audio absolute times.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-schedulestyledchordmeasure-ts-schedulestyledchordmeasureparams",
    "name": "ScheduleStyledChordMeasureParams",
    "path": "src/shared/music/scheduleStyledChordMeasure.ts",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "ui",
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
      "ui",
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
      "ui",
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
      "piano"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-wordsappdeeplink-ts-buildwordsappdeeplink",
    "name": "buildWordsAppDeepLink",
    "path": "src/shared/music/wordsAppDeepLink.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Build a Words in Rhythm URL preloaded with chart sections.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-wordsappdeeplink-ts-chartlayouttowordssections",
    "name": "chartLayoutToWordsSections",
    "path": "src/shared/music/wordsAppDeepLink.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Convert Encore Originals chart layout into Words in Rhythm section payloads.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-wordsappdeeplink-ts-wordsappdeeplinkoptions",
    "name": "WordsAppDeepLinkOptions",
    "path": "src/shared/music/wordsAppDeepLink.ts",
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
    "id": "src-shared-notation-drumnotationmini-tsx-computemininotationlayout",
    "name": "computeMiniNotationLayout",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Derive VexFlow layout from the requested render height (host apps tune density via `height`).",
    "tags": [
      "notation",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
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
    "id": "src-shared-notation-drumnotationmini-tsx-estimatemininotationrenderwidth",
    "name": "estimateMiniNotationRenderWidth",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimum SVG width so dense 16th patterns do not collide with the end barline.",
    "tags": [
      "notation",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-mininotationnoteheadbounds",
    "name": "MiniNotationNoteheadBounds",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Notehead bounds in SVG coordinates (after VexFlow draw).",
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
    "exportType": "type",
    "demoId": null
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
    "description": "Style configuration for the drum notation renderer. Use a single `inkColor` for staff lines, barlines, noteheads, stems, beams, and time signature.",
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
    "id": "src-shared-notation-drumnotationmini-tsx-notationstyleinput",
    "name": "NotationStyleInput",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Style configuration for the drum notation renderer. Use a single `inkColor` for staff lines, barlines, noteheads, stems, beams, and time signature.",
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
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-readmininotationnoteheadbounds",
    "name": "readMiniNotationNoteheadBounds",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Read the painted notehead box so symbols can center on the glyph, not the stem origin.",
    "tags": [
      "notation",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-resolveminidrumsymboldrawy",
    "name": "resolveMiniDrumSymbolDrawY",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Y argument for so symbols land in the top symbol band.",
    "tags": [
      "notation",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-resolveminidrumsymbolscale",
    "name": "resolveMiniDrumSymbolScale",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Scale drum symbols for compact mini hosts; explicit overrides are clamped to stay legible.",
    "tags": [
      "notation",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-resolveminidrumsymbolyoffset",
    "name": "resolveMiniDrumSymbolYOffset",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Vertical offset passed to so path geometry sits above the notehead.",
    "tags": [
      "notation",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-drumnotationmini-tsx-resolvenotationstyle",
    "name": "resolveNotationStyle",
    "path": "src/shared/notation/DrumNotationMini.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve a preset name or custom style object to a full .",
    "tags": [
      "notation",
      "react"
    ],
    "appsUsing": [
      "piano",
      "ui",
      "words"
    ],
    "exportType": "function",
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
      "drums",
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
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-index-ts-computemininotationlayout",
    "name": "computeMiniNotationLayout",
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
    "id": "src-shared-notation-index-ts-durationtovexflow",
    "name": "durationToVexFlow",
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
    "id": "src-shared-notation-index-ts-estimatemininotationrenderwidth",
    "name": "estimateMiniNotationRenderWidth",
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
    "id": "src-shared-notation-index-ts-isdottedduration",
    "name": "isDottedDuration",
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
    "id": "src-shared-notation-index-ts-isdottedsixteenthduration",
    "name": "isDottedSixteenthDuration",
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
    "id": "src-shared-notation-index-ts-keyedhighlightsyncoptions",
    "name": "KeyedHighlightSyncOptions",
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
    "id": "src-shared-notation-index-ts-notationstyleinput",
    "name": "NotationStyleInput",
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
    "id": "src-shared-notation-index-ts-paintsvgdescendants",
    "name": "paintSvgDescendants",
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
    "id": "src-shared-notation-index-ts-readmininotationnoteheadbounds",
    "name": "readMiniNotationNoteheadBounds",
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
    "id": "src-shared-notation-index-ts-reapplyactivekeyhighlight",
    "name": "reapplyActiveKeyHighlight",
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
    "id": "src-shared-notation-index-ts-resolveminidrumsymboldrawy",
    "name": "resolveMiniDrumSymbolDrawY",
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
    "id": "src-shared-notation-index-ts-resolveminidrumsymbolscale",
    "name": "resolveMiniDrumSymbolScale",
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
    "id": "src-shared-notation-index-ts-resolveminidrumsymbolyoffset",
    "name": "resolveMiniDrumSymbolYOffset",
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
    "id": "src-shared-notation-index-ts-resolvenotationstyle",
    "name": "resolveNotationStyle",
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
    "id": "src-shared-notation-index-ts-rhythmtemplatevariationcontrols",
    "name": "RhythmTemplateVariationControls",
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
    "id": "src-shared-notation-index-ts-rhythmtemplatevariationcontrolsprops",
    "name": "RhythmTemplateVariationControlsProps",
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
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-notation-index-ts-setsvgelementcolor",
    "name": "setSvgElementColor",
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
    "id": "src-shared-notation-index-ts-setvexflownotegroupcolor",
    "name": "setVexFlowNoteGroupColor",
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
    "id": "src-shared-notation-index-ts-sixteenthtickstovexflowduration",
    "name": "sixteenthTicksToVexFlowDuration",
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
    "id": "src-shared-notation-index-ts-svgcolorfillmode",
    "name": "SvgColorFillMode",
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
    "id": "src-shared-notation-index-ts-synckeyedsvghighlights",
    "name": "syncKeyedSvgHighlights",
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
    "id": "src-shared-notation-index-ts-vexflowdurationtobeats",
    "name": "vexFlowDurationToBeats",
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
    "id": "src-shared-notation-playbacksvghighlight-ts-highlightmininoteoptions",
    "name": "HighlightMiniNoteOptions",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared SVG paint helpers for playback highlight sync across VexFlow renderers. See PLAYBACK_RENDERING_AUDIT.md § highlight sync helper.",
    "tags": [
      "notation",
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
    "id": "src-shared-notation-playbacksvghighlight-ts-highlightvexflowmininotegroup",
    "name": "highlightVexFlowMiniNoteGroup",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Post-draw highlight for read-only mini notation (DrumNotationMini). Marks the note group and paints noteheads, stems, and beamed stem lines.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-playbacksvghighlight-ts-keyedhighlightsyncoptions",
    "name": "KeyedHighlightSyncOptions",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared SVG paint helpers for playback highlight sync across VexFlow renderers. See PLAYBACK_RENDERING_AUDIT.md § highlight sync helper.",
    "tags": [
      "notation",
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
    "id": "src-shared-notation-playbacksvghighlight-ts-paintsvgdescendants",
    "name": "paintSvgDescendants",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Paint paths/circles under a symbol group (drum symbols: stroke-driven).",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-playbacksvghighlight-ts-reapplyactivekeyhighlight",
    "name": "reapplyActiveKeyHighlight",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Re-apply highlight on a single key after element-map replacement (post-redraw).",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-playbacksvghighlight-ts-setsvgelementcolor",
    "name": "setSvgElementColor",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Apply stroke/fill color to one SVG element (VexFlow note groups, symbols, paths).",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-playbacksvghighlight-ts-setvexflownotegroupcolor",
    "name": "setVexFlowNoteGroupColor",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Toggle fill/stroke on a VexFlow note group. Noteheads are `<text>`; stems/ledger lines are `<path>`.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-playbacksvghighlight-ts-svgcolorfillmode",
    "name": "SvgColorFillMode",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared SVG paint helpers for playback highlight sync across VexFlow renderers. See PLAYBACK_RENDERING_AUDIT.md § highlight sync helper.",
    "tags": [
      "notation",
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
    "id": "src-shared-notation-playbacksvghighlight-ts-synckeyedsvghighlights",
    "name": "syncKeyedSvgHighlights",
    "path": "src/shared/notation/playbackSvgHighlight.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Diff previous vs active keyed highlights without rebuilding SVG. Used by Chords and similar keyed note-group maps. After replacing `elementMap` (full SVG redraw), clear `previousKeysRef` first so active keys re-paint.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-rhythmtemplatevariationcontrols-tsx-rhythmtemplatevariationcontrols",
    "name": "RhythmTemplateVariationControls",
    "path": "src/shared/notation/RhythmTemplateVariationControls.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Previous / next carousel for preset rhythm variations (e.g. Maqsum ka ornaments). Shared by DrumAccompaniment, DrumNotationMini, and Words in Rhythm.",
    "tags": [
      "notation",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-rhythmtemplatevariationcontrols-tsx-rhythmtemplatevariationcontrolsprops",
    "name": "RhythmTemplateVariationControlsProps",
    "path": "src/shared/notation/RhythmTemplateVariationControls.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "interface",
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
    "id": "src-shared-notation-scoredisplayhelpers-ts-applygreytosvgelement",
    "name": "applyGreyToSVGElement",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-applynotestyle",
    "name": "applyNoteStyle",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-attachpianofingering",
    "name": "attachPianoFingering",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Piano fingerings: `StringNumber` uses stem/beam extents for above (stem up) and below (stem down), so beamed triplets align on a row instead of stair-stepping with each notehead (`FretHandFinger` / `Annotation`). `StringNumber.draw()` recomputes Y from stem extents and **does not** apply `setOffsetY` for ABOVE/BELOW, so clearance vs dense beams is tuned via `radius` (still no visible circle when `setDrawCircle(false)`).",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-bass-8va-threshold",
    "name": "BASS_8VA_THRESHOLD",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-chord-font-size",
    "name": "CHORD_FONT_SIZE",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-closestwrongpitchdelta",
    "name": "closestWrongPitchDelta",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-createaccidentaltracker",
    "name": "createAccidentalTracker",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-drawcodaglyph",
    "name": "drawCodaGlyph",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-drawnavigationlabel",
    "name": "drawNavigationLabel",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-drawsegnoglyph",
    "name": "drawSegnoGlyph",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-duration-complexity-weight",
    "name": "DURATION_COMPLEXITY_WEIGHT",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-findottavaruns",
    "name": "findOttavaRuns",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-finger-crossing-box-fill",
    "name": "FINGER_CROSSING_BOX_FILL",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-finger-crossing-box-stroke",
    "name": "FINGER_CROSSING_BOX_STROKE",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-flat-order",
    "name": "FLAT_ORDER",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-getbeamgroups",
    "name": "getBeamGroups",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-getbeamgroupsfornotes",
    "name": "getBeamGroupsForNotes",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-getkeyaccidentalmap",
    "name": "getKeyAccidentalMap",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-getkeysignatureinfo",
    "name": "getKeySignatureInfo",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-getvexflowkey",
    "name": "getVexflowKey",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-greyed-current",
    "name": "GREYED_CURRENT",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-greyed-note",
    "name": "GREYED_NOTE",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-greyed-staff",
    "name": "GREYED_STAFF",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-key-flats",
    "name": "KEY_FLATS",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-key-normalize",
    "name": "KEY_NORMALIZE",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-key-sharps",
    "name": "KEY_SHARPS",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-liveactivenotematched",
    "name": "liveActiveNoteMatched",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-lyric-font-size",
    "name": "LYRIC_FONT_SIZE",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-renderottavabracket",
    "name": "renderOttavaBracket",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-result-colors",
    "name": "RESULT_COLORS",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-semitone-to-pixel-shift",
    "name": "SEMITONE_TO_PIXEL_SHIFT",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-sharp-order",
    "name": "SHARP_ORDER",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-treble-8va-threshold",
    "name": "TREBLE_8VA_THRESHOLD",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-unionnoteheadboundsvexflow",
    "name": "unionNoteheadBoundsVexFlow",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Union of each VexFlow `NoteHead` bbox only (no stems, flags, or modifiers). DOM-based mapping was flaky (`getSVGElement` / `getScreenCTM` edge cases); this uses the same layout numbers VexFlow already computed after `draw()`.",
    "tags": [
      "notation"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-wrong-pitch-ghost-max-distance",
    "name": "WRONG_PITCH_GHOST_MAX_DISTANCE",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-vexflowduration-ts-isdottedsixteenthduration",
    "name": "isDottedSixteenthDuration",
    "path": "src/shared/notation/vexFlowDuration.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Whether a sixteenth-grid duration should render with a dot in VexFlow.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-vexflowduration-ts-sixteenthtickstovexflowduration",
    "name": "sixteenthTicksToVexFlowDuration",
    "path": "src/shared/notation/vexFlowDuration.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Maps duration in sixteenths to a VexFlow duration string.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-vexflowduration-ts-vexflowdurationtobeats",
    "name": "vexFlowDurationToBeats",
    "path": "src/shared/notation/vexFlowDuration.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Converts a VexFlow duration string to beats in the given time-signature denominator. Tokens: `w`, `h`, `q`, `8`, `16`; `d` = dotted; `r` = rest (same duration).",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "function",
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
      "chords",
      "words"
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
      "chords",
      "words"
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
      "chords",
      "words"
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
      "chords",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-playback-audiocontextlifecycle-ts-primeaudiocontext",
    "name": "primeAudioContext",
    "path": "src/shared/playback/audioContextLifecycle.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Start resuming a suspended context synchronously on a user gesture (click/tap). Pair with after any awaited work.",
    "tags": [
      "playback"
    ],
    "appsUsing": [
      "chords",
      "words"
    ],
    "exportType": "function",
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
    "id": "src-shared-playback-instruments-salamanderpianosamplepool-ts-ensuresalamanderpianosamples",
    "name": "ensureSalamanderPianoSamples",
    "path": "src/shared/playback/instruments/salamanderPianoSamplePool.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Loads Salamander piano samples once per page session. Subsequent callers (any Labs app) reuse decoded buffers from 's URL cache.",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-salamanderpianosamplepool-ts-getsalamanderpianoloadstate",
    "name": "getSalamanderPianoLoadState",
    "path": "src/shared/playback/instruments/salamanderPianoSamplePool.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-salamanderpianosamplepool-ts-getsalamandersampleentries",
    "name": "getSalamanderSampleEntries",
    "path": "src/shared/playback/instruments/salamanderPianoSamplePool.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-salamanderpianosamplepool-ts-issalamanderpianoready",
    "name": "isSalamanderPianoReady",
    "path": "src/shared/playback/instruments/salamanderPianoSamplePool.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-salamanderpianosamplepool-ts-resetsalamanderpianosamplepoolfortests",
    "name": "resetSalamanderPianoSamplePoolForTests",
    "path": "src/shared/playback/instruments/salamanderPianoSamplePool.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Test-only reset — not for production callers.",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-instruments-salamanderpianosamplepool-ts-subscribesalamanderpianoloadstate",
    "name": "subscribeSalamanderPianoLoadState",
    "path": "src/shared/playback/instruments/salamanderPianoSamplePool.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-rhythm-builddarbukaediturl-ts-builddarbukaediturl",
    "name": "buildDarbukaEditUrl",
    "path": "src/shared/rhythm/buildDarbukaEditUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-builddarbukaediturl-ts-darbuka-trainer-link-tooltip",
    "name": "DARBUKA_TRAINER_LINK_TOOLTIP",
    "path": "src/shared/rhythm/buildDarbukaEditUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-builddarbukaediturl-ts-darbukatrainerlinkparams",
    "name": "DarbukaTrainerLinkParams",
    "path": "src/shared/rhythm/buildDarbukaEditUrl.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-builddarbukaediturl-ts-resolvedarbukatrainerhref",
    "name": "resolveDarbukaTrainerHref",
    "path": "src/shared/rhythm/buildDarbukaEditUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-rhythm-drumplaybacknotepointer-ts-drumplaybacknotepointer",
    "name": "DrumPlaybackNotePointer",
    "path": "src/shared/rhythm/drumPlaybackNotePointer.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-drumplaybacknotepointer-ts-resolvedrumplaybacknotepointer",
    "name": "resolveDrumPlaybackNotePointer",
    "path": "src/shared/rhythm/drumPlaybackNotePointer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Map elapsed seconds within a looping pattern to the active drum note.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-drumplaybacknotepointer-ts-sixteenthspermeasurefortimesignature",
    "name": "sixteenthsPerMeasureForTimeSignature",
    "path": "src/shared/rhythm/drumPlaybackNotePointer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-rhythm-presetdatabase-ts-findrhythmtemplatepresetbynotation",
    "name": "findRhythmTemplatePresetByNotation",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Find the preset family that owns this notation (base pattern or any variation).",
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
    "id": "src-shared-rhythm-presetdatabase-ts-gettemplatepresetvariationindex",
    "name": "getTemplatePresetVariationIndex",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Index of the active variation for a preset notation, or -1 when none match.",
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
    "id": "src-shared-rhythm-presetdatabase-ts-gettemplatepresetvariations",
    "name": "getTemplatePresetVariations",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Variations for a preset rhythm in the requested meter (e.g. Maqsum ka ornaments in 4/4). Returns an empty array when the preset id is unknown or has no compatible variations.",
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
    "id": "src-shared-rhythm-presetdatabase-ts-rhythmtemplatevariation",
    "name": "RhythmTemplateVariation",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Resolved preset variation for a target meter (notation + display label).",
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
    "id": "src-shared-session-labsgooglesessionport-ts-clearlabsgooglesessioneverywhere",
    "name": "clearLabsGoogleSessionEverywhere",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Clear local session storage and BFF cookie.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-getgoogleaccesstokenviabff",
    "name": "getGoogleAccessTokenViaBff",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Returns a fresh access token when BFF is enabled: uses persisted token if fresh, else BFF refresh. When BFF refresh and interactive sign-in fail recoverably, returns null (caller should use GIS).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-islabsgooglesessionbffenabled",
    "name": "isLabsGoogleSessionBffEnabled",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011). When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the Cloudflare Worker. GIS `prompt: 'none'` is never used.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-isrecoverablebffsigninfailure",
    "name": "isRecoverableBffSignInFailure",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "When the BFF URL is configured but the Worker is down or misconfigured, callers may fall back to legacy GIS interactive sign-in (ADR 0010). User-aborted popups stay on the BFF error path.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-labs-google-oauth-broadcast-channel",
    "name": "LABS_GOOGLE_OAUTH_BROADCAST_CHANNEL",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011). When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the Cloudflare Worker. GIS `prompt: 'none'` is never used.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-labs-google-oauth-done-message",
    "name": "LABS_GOOGLE_OAUTH_DONE_MESSAGE",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011). When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the Cloudflare Worker. GIS `prompt: 'none'` is never used.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-labs-google-oauth-done-path",
    "name": "LABS_GOOGLE_OAUTH_DONE_PATH",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011). When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the Cloudflare Worker. GIS `prompt: 'none'` is never used.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-labsgooglebfftokenresponse",
    "name": "LabsGoogleBffTokenResponse",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011). When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the Cloudflare Worker. GIS `prompt: 'none'` is never used.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-labsgoogleoauthdonemessage",
    "name": "LabsGoogleOAuthDoneMessage",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011). When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the Cloudflare Worker. GIS `prompt: 'none'` is never used.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-persistlabsgooglebffsession",
    "name": "persistLabsGoogleBffSession",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Persist BFF token response to shared Encore session storage + identity.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-readlabssessionbffurl",
    "name": "readLabsSessionBffUrl",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "BFF base URL without trailing slash, or null when disabled.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-refreshgoogleaccesstokenviabff",
    "name": "refreshGoogleAccessTokenViaBff",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Refresh the Google access token via the session BFF (HttpOnly cookie auth). Single-flight: concurrent callers share one request. After 429, blocks retries briefly.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-signinwithgoogleviabff",
    "name": "signInWithGoogleViaBff",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Opens the BFF OAuth popup (user gesture required). Resolves with fresh access token metadata.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-signoutgoogleviabff",
    "name": "signOutGoogleViaBff",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011). When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the Cloudflare Worker. GIS `prompt: 'none'` is never used.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-labsgooglesessionport-ts-tryrefreshgoogleaccesstokenviabff",
    "name": "tryRefreshGoogleAccessTokenViaBff",
    "path": "src/shared/session/labsGoogleSessionPort.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Try BFF refresh when enabled. Returns null when BFF is disabled or refresh fails.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-session-uselabsgooglesessionrefresh-ts-uselabsgooglesessionrefresh",
    "name": "useLabsGoogleSessionRefresh",
    "path": "src/shared/session/useLabsGoogleSessionRefresh.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "When the session BFF is enabled, schedule a single proactive refresh shortly before the persisted access token expires. Uses HTTPS fetch only — never GIS.",
    "tags": [],
    "appsUsing": [],
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
    "id": "src-shared-test-auditlogging-ts-isverboseaudit",
    "name": "isVerboseAudit",
    "path": "src/shared/test/auditLogging.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Gate verbose audit / diagnostic logging behind VITEST_VERBOSE_AUDIT=true so presubmit and CI stay quiet while local debugging stays easy.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-auditlogging-ts-logauditfailures",
    "name": "logAuditFailures",
    "path": "src/shared/test/auditLogging.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Log failure details only when the audit fails (always useful in CI).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-auditlogging-ts-logverboseaudit",
    "name": "logVerboseAudit",
    "path": "src/shared/test/auditLogging.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Gate verbose audit / diagnostic logging behind VITEST_VERBOSE_AUDIT=true so presubmit and CI stay quiet while local debugging stays easy.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-deterministicrandom-ts-createseededrandom",
    "name": "createSeededRandom",
    "path": "src/shared/test/deterministicRandom.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Seeded pseudo-random generator for deterministic unit tests. Prefer fixed fixtures when possible; use this when variation is required.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-deterministicrandom-ts-pickdeterministic",
    "name": "pickDeterministic",
    "path": "src/shared/test/deterministicRandom.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pick `items[index % items.length]` — deterministic cross-product sampling.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-gesturescrollperfcore-ts-collections-scroll-max-frame-ms",
    "name": "COLLECTIONS_SCROLL_MAX_FRAME_MS",
    "path": "src/shared/test/gestureScrollPerfCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Target ~60fps — allow one missed frame plus scheduler slack on CI.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-gesturescrollperfcore-ts-collections-scroll-max-long-tasks",
    "name": "COLLECTIONS_SCROLL_MAX_LONG_TASKS",
    "path": "src/shared/test/gestureScrollPerfCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Long tasks (>50ms) during a short scroll burst should stay rare.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-gesturescrollperfcore-ts-formatgesturescrollperfmessage",
    "name": "formatGestureScrollPerfMessage",
    "path": "src/shared/test/gestureScrollPerfCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Target ~60fps — allow one missed frame plus scheduler slack on CI.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-gesturescrollperfcore-ts-gesturescrollperfsample",
    "name": "GestureScrollPerfSample",
    "path": "src/shared/test/gestureScrollPerfCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Target ~60fps — allow one missed frame plus scheduler slack on CI.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-gesturescrollperfcore-ts-summarizegesturescrollframes",
    "name": "summarizeGestureScrollFrames",
    "path": "src/shared/test/gestureScrollPerfCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Target ~60fps — allow one missed frame plus scheduler slack on CI.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-interactionlatencycore-ts-default-interaction-budget-ms",
    "name": "DEFAULT_INTERACTION_BUDGET_MS",
    "path": "src/shared/test/interactionLatencyCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared interaction latency budgets for Playwright smokes and CUJ docs. CI machines vary — keep budgets generous but catch multi-second regressions.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-interactionlatencycore-ts-formatinteractionbudgetmessage",
    "name": "formatInteractionBudgetMessage",
    "path": "src/shared/test/interactionLatencyCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Format for assertion messages and CUJ tables.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-interactionlatencycore-ts-iswithininteractionbudget",
    "name": "isWithinInteractionBudget",
    "path": "src/shared/test/interactionLatencyCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Returns true when measured latency is within budget (inclusive).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-interactionlatencycore-ts-relaxed-interaction-budget-ms",
    "name": "RELAXED_INTERACTION_BUDGET_MS",
    "path": "src/shared/test/interactionLatencyCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared interaction latency budgets for Playwright smokes and CUJ docs. CI machines vary — keep budgets generous but catch multi-second regressions.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-interactionlatencycore-ts-tab-navigation-budget-ms",
    "name": "TAB_NAVIGATION_BUDGET_MS",
    "path": "src/shared/test/interactionLatencyCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Hash/tab route switches — CI runners vary; keep generous vs DEFAULT_INTERACTION_BUDGET_MS.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-layoutheuristicscore-ts-contrastratio",
    "name": "contrastRatio",
    "path": "src/shared/test/layoutHeuristicsCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure layout heuristic math — unit-tested; keep in sync with e2e/helpers/layoutHeuristics.ts browser fn.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-layoutheuristicscore-ts-edgeinsetpx",
    "name": "edgeInsetPx",
    "path": "src/shared/test/layoutHeuristicsCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure layout heuristic math — unit-tested; keep in sync with e2e/helpers/layoutHeuristics.ts browser fn.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-layoutheuristicscore-ts-layout-heuristic-defaults",
    "name": "LAYOUT_HEURISTIC_DEFAULTS",
    "path": "src/shared/test/layoutHeuristicsCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure layout heuristic math — unit-tested; keep in sync with e2e/helpers/layoutHeuristics.ts browser fn.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-layoutheuristicscore-ts-parsecsscolortorgb",
    "name": "parseCssColorToRgb",
    "path": "src/shared/test/layoutHeuristicsCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure layout heuristic math — unit-tested; keep in sync with e2e/helpers/layoutHeuristics.ts browser fn.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-layoutheuristicscore-ts-relativeluminance",
    "name": "relativeLuminance",
    "path": "src/shared/test/layoutHeuristicsCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure layout heuristic math — unit-tested; keep in sync with e2e/helpers/layoutHeuristics.ts browser fn.",
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
    "id": "src-shared-thirdparty-politenetworkpause-ts-polite-third-party-page-gap-ms",
    "name": "POLITE_THIRD_PARTY_PAGE_GAP_MS",
    "path": "src/shared/thirdParty/politeNetworkPause.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Small delays between back-to-back third-party HTTP calls (pagination, retries) so bursts are less likely to trip provider rate limits or anti-automation heuristics.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-thirdparty-politenetworkpause-ts-sleepms",
    "name": "sleepMs",
    "path": "src/shared/thirdParty/politeNetworkPause.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Small delays between back-to-back third-party HTTP calls (pagination, retries) so bursts are less likely to trip provider rate limits or anti-automation heuristics.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-ui-theme-stanzathemebase-ts-stanza-theme-overrides",
    "name": "STANZA_THEME_OVERRIDES",
    "path": "src/shared/ui/theme/stanzaThemeBase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Canonical Stanza brand + surface colors. Drives `getAppTheme('stanza')`. Warm cream surfaces and near-Apple neutrals; pink stays the single accent. (Full-page wash still lives in `src/stanza/stanza.css`.)",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
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
    "id": "src-shared-undo-labsundocontrols-tsx-labsundocontrols",
    "name": "LabsUndoControls",
    "path": "src/shared/undo/LabsUndoControls.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Undo / redo icon buttons wired to . Hotkeys remain active app-wide; these controls expose the same stack in the UI.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundocontrols-tsx-labsundocontrolsprops",
    "name": "LabsUndoControlsProps",
    "path": "src/shared/undo/LabsUndoControls.tsx",
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
    "id": "src-shared-undo-labsundoshortcutlabel-ts-labsredoshortcutlabel",
    "name": "labsRedoShortcutLabel",
    "path": "src/shared/undo/labsUndoShortcutLabel.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Platform-appropriate label for Labs app-level undo/redo tooltips.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-undo-labsundoshortcutlabel-ts-labsundoshortcutlabel",
    "name": "labsUndoShortcutLabel",
    "path": "src/shared/undo/labsUndoShortcutLabel.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Platform-appropriate label for Labs app-level undo/redo tooltips.",
    "tags": [],
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
    "id": "src-shared-utils-base64url-ts-encodebase64urlutf8",
    "name": "encodeBase64UrlUtf8",
    "path": "src/shared/utils/base64Url.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "UTF-8 string ↔ base64url (no padding) for URL-safe payloads.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
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
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-utils-filematchesaccept-ts-filematchesaccept",
    "name": "fileMatchesAccept",
    "path": "src/shared/utils/fileMatchesAccept.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Whether `file` matches an `<input accept>`-style filter (mime globs + extensions).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
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
      "chords",
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-promisewithtimeout-ts-promisewithtimeout",
    "name": "promiseWithTimeout",
    "path": "src/shared/utils/promiseWithTimeout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Ensures callers never wait forever if a third-party OAuth callback never fires (blocked popups / iframes / stalled GIS).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-readdatatransferentryfiles-ts-collectdatatransferdropsnapshot",
    "name": "collectDataTransferDropSnapshot",
    "path": "src/shared/utils/readDataTransferEntryFiles.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Snapshots drop payload synchronously during the `drop` handler. Must run before any `await`.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-readdatatransferentryfiles-ts-datatransferdrop",
    "name": "DataTransferDrop",
    "path": "src/shared/utils/readDataTransferEntryFiles.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-utils-readdatatransferentryfiles-ts-datatransferdropsnapshot",
    "name": "DataTransferDropSnapshot",
    "path": "src/shared/utils/readDataTransferEntryFiles.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Captured synchronously during `drop` — DataTransfer is cleared after the event turn.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-utils-readdatatransferentryfiles-ts-readdatatransferdrop",
    "name": "readDataTransferDrop",
    "path": "src/shared/utils/readDataTransferEntryFiles.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Reads dropped files from a DataTransfer, traversing folders when the browser exposes `webkitGetAsEntry` (required for folder drag-and-drop).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-readdatatransferentryfiles-ts-readdatatransferdropbatches",
    "name": "readDataTransferDropBatches",
    "path": "src/shared/utils/readDataTransferEntryFiles.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "One batch per dropped folder when multiple top-level directories are present.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-readdatatransferentryfiles-ts-readdatatransferdropfromsnapshot",
    "name": "readDataTransferDropFromSnapshot",
    "path": "src/shared/utils/readDataTransferEntryFiles.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Traverses a synchronous snapshot (folder tree reads may await).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-readdatatransferentryfiles-ts-snapshothasmultipletoplevelfolders",
    "name": "snapshotHasMultipleTopLevelFolders",
    "path": "src/shared/utils/readDataTransferEntryFiles.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when snapshot files span multiple top-level folder roots (multi-folder drag).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-richtextcontent-ts-isrichtextempty",
    "name": "isRichTextEmpty",
    "path": "src/shared/utils/richTextContent.ts",
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
    "id": "src-shared-utils-richtextcontent-ts-normalizerichtextlinkhref",
    "name": "normalizeRichTextLinkHref",
    "path": "src/shared/utils/richTextContent.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalize user-entered URLs for TipTap link marks (blocks script/data URLs).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-richtextcontent-ts-plainorhtmltoeditorhtml",
    "name": "plainOrHtmlToEditorHtml",
    "path": "src/shared/utils/richTextContent.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "TipTap `setContent` input: empty → empty doc; values that already look like HTML pass through; otherwise treated as legacy plain text (paragraphs split on blank lines).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-richtextcontent-ts-richtextlinkpreview",
    "name": "richTextLinkPreview",
    "path": "src/shared/utils/richTextContent.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Human-readable lines for link hover cards (hostname + full URL).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-richtextcontent-ts-richtextlinkpreview",
    "name": "RichTextLinkPreview",
    "path": "src/shared/utils/richTextContent.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-utils-richtextcontent-ts-richtextplaintext",
    "name": "richTextPlainText",
    "path": "src/shared/utils/richTextContent.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Plain text for previews / counts. Not a security sanitizer.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
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
    "id": "src-shared-utils-trailingslashrouting-ts-getlegacybeatredirect",
    "name": "getLegacyBeatRedirect",
    "path": "src/shared/utils/trailingSlashRouting.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Legacy Find the Beat URLs → Stanza (query preserved; hash handled by static redirect HTML).",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-triggerblobdownload-ts-triggerblobdownload",
    "name": "triggerBlobDownload",
    "path": "src/shared/utils/triggerBlobDownload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Trigger a browser download for an in-memory blob (revokes the object URL after a short delay).",
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
  },
  {
    "id": "src-shared-youtube-describeyoutubeplayererror-ts-describeyoutubeplayererror",
    "name": "describeYoutubePlayerError",
    "path": "src/shared/youtube/describeYoutubePlayerError.ts",
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
    "id": "src-shared-youtube-describeyoutubeplayererror-ts-describeyoutubeplayererroropts",
    "name": "DescribeYoutubePlayerErrorOpts",
    "path": "src/shared/youtube/describeYoutubePlayerError.ts",
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
    "id": "src-shared-youtube-describeyoutubeplayererror-ts-isyoutubeembedblockederror",
    "name": "isYoutubeEmbedBlockedError",
    "path": "src/shared/youtube/describeYoutubePlayerError.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "YouTube IFrame API `onError` codes where embedding is disallowed.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-youtube-describeyoutubeplayererror-ts-youtubeembedblockedbarhint",
    "name": "youtubeEmbedBlockedBarHint",
    "path": "src/shared/youtube/describeYoutubePlayerError.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "One-line hint for compact playback UI when embed is blocked.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-youtube-describeyoutubeplayererror-ts-youtubeplaybackbartitle",
    "name": "youtubePlaybackBarTitle",
    "path": "src/shared/youtube/describeYoutubePlayerError.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Hide raw `Video · {id}` placeholders in playback chrome.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-youtube-labsyoutubeiframeapi-ts-ensureyoutubeiframeapi",
    "name": "ensureYouTubeIframeApi",
    "path": "src/shared/youtube/labsYouTubeIframeApi.ts",
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
    "id": "src-shared-youtube-labsyoutubeiframeapi-ts-readyoutubeiframeapi",
    "name": "readYouTubeIframeApi",
    "path": "src/shared/youtube/labsYouTubeIframeApi.ts",
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
    "id": "src-shared-youtube-labsyoutubeiframeapi-ts-ytplayerinstance",
    "name": "YtPlayerInstance",
    "path": "src/shared/youtube/labsYouTubeIframeApi.ts",
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
    "id": "src-shared-youtube-labsyoutubeplayer-tsx-labsyoutubecontroller",
    "name": "LabsYouTubeController",
    "path": "src/shared/youtube/LabsYouTubePlayer.tsx",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-youtube-labsyoutubeplayer-tsx-labsyoutubeplaybackstate",
    "name": "LabsYouTubePlaybackState",
    "path": "src/shared/youtube/LabsYouTubePlayer.tsx",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-youtube-labsyoutubeplayer-tsx-labsyoutubeplayer",
    "name": "LabsYouTubePlayer",
    "path": "src/shared/youtube/LabsYouTubePlayer.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-youtube-labsyoutubeplayer-tsx-labsyoutubeplayerprops",
    "name": "LabsYouTubePlayerProps",
    "path": "src/shared/youtube/LabsYouTubePlayer.tsx",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  }
] as const;
