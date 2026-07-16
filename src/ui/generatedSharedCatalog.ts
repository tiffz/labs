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
    "id": "src-shared-a11y-focusable-ts-focusfirstfocusable",
    "name": "focusFirstFocusable",
    "path": "src/shared/a11y/focusable.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Focusable elements for menu/disclosure keyboard support.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-a11y-focusable-ts-getfocusableelements",
    "name": "getFocusableElements",
    "path": "src/shared/a11y/focusable.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Focusable elements for menu/disclosure keyboard support.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-a11y-focusable-ts-handlemenulistkeydown",
    "name": "handleMenuListKeyDown",
    "path": "src/shared/a11y/focusable.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Focusable elements for menu/disclosure keyboard support.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-a11y-usefocusmenuonopen-ts-usefocusmenuonopen",
    "name": "useFocusMenuOnOpen",
    "path": "src/shared/a11y/useFocusMenuOnOpen.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Move focus into a menu/panel when it opens (after paint).",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-a11y-uselabsdisclosuremenu-ts-labsdisclosuremenutriggera11y",
    "name": "LabsDisclosureMenuTriggerA11y",
    "path": "src/shared/a11y/useLabsDisclosureMenu.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "drums",
      "words",
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-a11y-uselabsdisclosuremenu-ts-uselabsdisclosuremenu",
    "name": "useLabsDisclosureMenu",
    "path": "src/shared/a11y/useLabsDisclosureMenu.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared trigger/menu ids + ARIA for disclosure menus (popover or in-page panel).",
    "tags": [],
    "appsUsing": [
      "drums",
      "words",
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
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
    "appsUsing": [],
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
    "appsUsing": [],
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
    "appsUsing": [],
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
    "id": "src-shared-audio-downbeatalignment-ts-beatoneanchorresolution",
    "name": "BeatOneAnchorResolution",
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
    "id": "src-shared-audio-downbeatalignment-ts-resolvebeatoneanchortime",
    "name": "resolveBeatOneAnchorTime",
    "path": "src/shared/audio/downbeatAlignment.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Resolve Beat 1 anchor time near `musicStartTime`. Essentia beat ticks often start many seconds into the track even when BPM is correct (wrong grid phase). When the current Beat 1 is implausibly late, or an early phase/onset aligns better with onsets, snap the grid to that anchor.",
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
    "id": "src-shared-audio-metronome-gridbuilder-ts-buildsubdivisiongrid",
    "name": "buildSubdivisionGrid",
    "path": "src/shared/audio/metronome/gridBuilder.ts",
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
    "id": "src-shared-audio-metronome-gridbuilder-ts-gridbuilderparams",
    "name": "GridBuilderParams",
    "path": "src/shared/audio/metronome/gridBuilder.ts",
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
    "id": "src-shared-audio-metronome-gridbuilder-ts-subdivgridentry",
    "name": "SubdivGridEntry",
    "path": "src/shared/audio/metronome/gridBuilder.ts",
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
    "id": "src-shared-audio-metronome-gridmetronomeplayback-ts-gridmetronomeplaybackprefs",
    "name": "GridMetronomePlaybackPrefs",
    "path": "src/shared/audio/metronome/gridMetronomePlayback.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-gridmetronomeplayback-ts-gridmetronomescheduler",
    "name": "GridMetronomeScheduler",
    "path": "src/shared/audio/metronome/gridMetronomePlayback.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "chords"
    ],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-gridmetronomeplayback-ts-gridsubdivdurationsec",
    "name": "gridSubdivDurationSec",
    "path": "src/shared/audio/metronome/gridMetronomePlayback.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
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
    "id": "src-shared-audio-metronome-metronomedrumsamples-ts-loadmetronomedrumsamples",
    "name": "loadMetronomeDrumSamples",
    "path": "src/shared/audio/metronome/metronomeDrumSamples.ts",
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
    "id": "src-shared-audio-metronome-metronomedrumsamples-ts-metronomedrumsound",
    "name": "MetronomeDrumSound",
    "path": "src/shared/audio/metronome/metronomeDrumSamples.ts",
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
    "id": "src-shared-audio-metronome-metronomedrumsamples-ts-playmetronomedrumsampleat",
    "name": "playMetronomeDrumSampleAt",
    "path": "src/shared/audio/metronome/metronomeDrumSamples.ts",
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
    "id": "src-shared-audio-metronome-metronomeengine-ts-metronomeengine",
    "name": "MetronomeEngine",
    "path": "src/shared/audio/metronome/MetronomeEngine.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Sample-accurate metronome engine using the Web Audio API look-ahead scheduling pattern. Decoupled from React — communicates via callbacks. Supports three simultaneous sound sources: human voice samples, the shared labs click.mp3, and drum sounds (dum/tak/ka), each with independent gain control and per-channel muting.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomegridpositions-ts-positioninsixteenthsforgridindex",
    "name": "positionInSixteenthsForGridIndex",
    "path": "src/shared/audio/metronome/metronomeGridPositions.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Map a subdivision-grid index to a **fractional** sixteenth-note position in the measure. Beat-aware (triplets divide each beat into equal thirds, not sixteenth slots).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomeraillabels-ts-activemetronomerailslotindex",
    "name": "activeMetronomeRailSlotIndex",
    "path": "src/shared/audio/metronome/metronomeRailLabels.ts",
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
    "id": "src-shared-audio-metronome-metronomeraillabels-ts-buildmetronomemeasurelabels",
    "name": "buildMetronomeMeasureLabels",
    "path": "src/shared/audio/metronome/metronomeRailLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "One measure of counting labels for a dense metronome rail (Count / Stanza).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomeraillabels-ts-metronomeraillabel",
    "name": "MetronomeRailLabel",
    "path": "src/shared/audio/metronome/metronomeRailLabels.ts",
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
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-getmetronomevisualdots",
    "name": "getMetronomeVisualDots",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Metronome dot positions aligned with the shared subdivision grid (Count / advanced prefs). Primary beats use tier `downbeat` | `beat`; finer slots use `subdivision`.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-getmetronomevisualpositions",
    "name": "getMetronomeVisualPositions",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-metronomedotidlefill",
    "name": "metronomeDotIdleFill",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-metronomedotradius",
    "name": "metronomeDotRadius",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-metronomedotradiuspx",
    "name": "metronomeDotRadiusPx",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-metronomedottier",
    "name": "MetronomeDotTier",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-metronomevisualdot",
    "name": "MetronomeVisualDot",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-metronomevisualdots-ts-shouldclickatvisualdot",
    "name": "shouldClickAtVisualDot",
    "path": "src/shared/audio/metronome/metronomeVisualDots.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Whether rhythm playback should audibly click at this visual dot.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-channelsneededforsubdivisionlevel",
    "name": "channelsNeededForSubdivisionLevel",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
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
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-enabled-subdivision-channel-gains",
    "name": "ENABLED_SUBDIVISION_CHANNEL_GAINS",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Suggested channel gains when a user enables finer subdivisions (off-beat sliders were at 0).",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-metronome-drum-for-subdivision",
    "name": "METRONOME_DRUM_FOR_SUBDIVISION",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-resolvedrhythmmetronomeclick",
    "name": "ResolvedRhythmMetronomeClick",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
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
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-resolvedrhythmmetronomedrum",
    "name": "ResolvedRhythmMetronomeDrum",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
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
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-resolvedrhythmmetronomevoice",
    "name": "ResolvedRhythmMetronomeVoice",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
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
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-resolverhythmmetronomeclick",
    "name": "resolveRhythmMetronomeClick",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Resolve whether a grid dot should audibly click during rhythm playback and at what gain. Mirrors MetronomeEngine channel gating (volumes, mutes, click source).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-resolverhythmmetronomedrum",
    "name": "resolveRhythmMetronomeDrum",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Resolve darbuka drum sample (dum/tak/ka) for a rhythm-playback metronome dot.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-resolverhythmmetronomevoice",
    "name": "resolveRhythmMetronomeVoice",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Resolve vocal count sample for a rhythm-playback metronome dot.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-rhythmmetronomeclickprefs",
    "name": "RhythmMetronomeClickPrefs",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
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
    "id": "src-shared-audio-metronome-rhythmmetronomeclick-ts-subdivisionvolumesforlevel",
    "name": "subdivisionVolumesForLevel",
    "path": "src/shared/audio/metronome/rhythmMetronomeClick.ts",
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
    "id": "src-shared-audio-metronome-schedulevoicesample-ts-schedulevoicesampleoncontext",
    "name": "scheduleVoiceSampleOnContext",
    "path": "src/shared/audio/metronome/scheduleVoiceSample.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Schedule a counting voice clip on an existing AudioContext (rhythm playback path).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-subdivisionclickschedule-ts-clickvolumeforsubdivision",
    "name": "clickVolumeForSubdivision",
    "path": "src/shared/audio/metronome/subdivisionClickSchedule.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Classify a click for accent hierarchy — mirrors .",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-subdivisionclickschedule-ts-metronomeclickmode",
    "name": "MetronomeClickMode",
    "path": "src/shared/audio/metronome/subdivisionClickSchedule.ts",
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
    "id": "src-shared-audio-metronome-subdivisionclickschedule-ts-scheduleclicksinbeatrange",
    "name": "scheduleClicksInBeatRange",
    "path": "src/shared/audio/metronome/subdivisionClickSchedule.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Enumerate metronome clicks between two quarter-note beat positions (inclusive of start, exclusive of end) for scored playback / count-in.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-subdivisionclickschedule-ts-scheduledclick",
    "name": "ScheduledClick",
    "path": "src/shared/audio/metronome/subdivisionClickSchedule.ts",
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
    "id": "src-shared-audio-metronome-subdivisionclickschedule-ts-slotsperquarterbeat",
    "name": "slotsPerQuarterBeat",
    "path": "src/shared/audio/metronome/subdivisionClickSchedule.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Map scales curriculum subdivision modes to grid slots per quarter beat.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-syllablemap-ts-syllableentry",
    "name": "SyllableEntry",
    "path": "src/shared/audio/metronome/syllableMap.ts",
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
    "id": "src-shared-audio-metronome-syllablemap-ts-syllableforposition",
    "name": "syllableForPosition",
    "path": "src/shared/audio/metronome/syllableMap.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Unified counting-mode syllable mapping for a single box inside a beat group.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-syllablemap-ts-takadimilabelforposition",
    "name": "takadimiLabelForPosition",
    "path": "src/shared/audio/metronome/syllableMap.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Takadimi-mode label for a single box inside a beat group. Uses standard takadimi patterns for L=1..4, cycles for larger groups.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-types-ts-beatcallback",
    "name": "BeatCallback",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-beatevent",
    "name": "BeatEvent",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-beatinfo",
    "name": "BeatInfo",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-eighthbaseslotspereighth",
    "name": "eighthBaseSlotsPerEighth",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Grid slots per eighth note for /8 meters.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-types-ts-getdefaultsubdivisionlevel",
    "name": "getDefaultSubdivisionLevel",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-types-ts-getsubdivisionoptions",
    "name": "getSubdivisionOptions",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-types-ts-isswinglevel",
    "name": "isSwingLevel",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-types-ts-metronomeconfig",
    "name": "MetronomeConfig",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-quietcountconfig",
    "name": "QuietCountConfig",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-sixteenthbaseslotspersixteenth",
    "name": "sixteenthBaseSlotsPerSixteenth",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Grid slots per sixteenth note for /16 meters. Level 1–2: one slot per sixteenth; level 3–4: two slots (32nd feel).",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-types-ts-slotsperbeat",
    "name": "slotsPerBeat",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Number of grid slots produced per quarter-note beat (for /4 meters). swing8 uses 3 slots per beat (triplet grid) where the middle slot is silent — this visually shows the \"long-short\" swing feel.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-metronome-types-ts-subdivisionchannel",
    "name": "SubdivisionChannel",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-subdivisionlevel",
    "name": "SubdivisionLevel",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-subdivisiontype",
    "name": "SubdivisionType",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-subdivisionvolumes",
    "name": "SubdivisionVolumes",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-subdivoption",
    "name": "SubdivOption",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-voice-subdiv-min-dur",
    "name": "VOICE_SUBDIV_MIN_DUR",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Minimum subdivision slot duration (seconds) for voicing subdivision syllables. Below this, only beat numbers are voiced to maintain clarity.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-voicemanifest",
    "name": "VoiceManifest",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-types-ts-voicemode",
    "name": "VoiceMode",
    "path": "src/shared/audio/metronome/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-metronome-voicepackloader-ts-voicepackloader",
    "name": "VoicePackLoader",
    "path": "src/shared/audio/metronome/voicePackLoader.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
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
    "id": "src-shared-audio-platform-audiopatternregistry-ts-appaudiopattern",
    "name": "AppAudioPattern",
    "path": "src/shared/audio/platform/audioPatternRegistry.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Approved audio patterns per music app — keep in sync with docs/SHARED_AUDIO_PLATFORM.md. Guardrail: audioPatternRegistry.test.ts",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-audiopatternregistry-ts-audio-pattern-registry",
    "name": "AUDIO_PATTERN_REGISTRY",
    "path": "src/shared/audio/platform/audioPatternRegistry.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Approved audio patterns per music app — keep in sync with docs/SHARED_AUDIO_PLATFORM.md. Guardrail: audioPatternRegistry.test.ts",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-audiopatternregistry-ts-clockpattern",
    "name": "ClockPattern",
    "path": "src/shared/audio/platform/audioPatternRegistry.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Approved audio patterns per music app — keep in sync with docs/SHARED_AUDIO_PLATFORM.md. Guardrail: audioPatternRegistry.test.ts",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-audiopatternregistry-ts-forbidden-reactive-patterns",
    "name": "FORBIDDEN_REACTIVE_PATTERNS",
    "path": "src/shared/audio/platform/audioPatternRegistry.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Patterns that must not appear in new grid-aligned audio code.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-audiopatternregistry-ts-schedulerpattern",
    "name": "SchedulerPattern",
    "path": "src/shared/audio/platform/audioPatternRegistry.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Approved audio patterns per music app — keep in sync with docs/SHARED_AUDIO_PLATFORM.md. Guardrail: audioPatternRegistry.test.ts",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-clocks-audioclocksource-ts-audioclocksource",
    "name": "AudioClockSource",
    "path": "src/shared/audio/platform/clocks/AudioClockSource.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Pluggable clock for slave-clock apps (loop transport, score, media timeline). Master-clock apps (Count/Midi standalone) use MetronomeEngine directly.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-clocks-audioclocksource-ts-beatposition",
    "name": "BeatPosition",
    "path": "src/shared/audio/platform/clocks/AudioClockSource.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Beat position in fractional beats from pattern/score start.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-clocks-audioclocksource-ts-beatspermeasure",
    "name": "beatsPerMeasure",
    "path": "src/shared/audio/platform/clocks/AudioClockSource.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Beat position in fractional beats from pattern/score start.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-clocks-index-ts-audioclocksource",
    "name": "AudioClockSource",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-index-ts-beatposition",
    "name": "BeatPosition",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-index-ts-beatspermeasure",
    "name": "beatsPerMeasure",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-index-ts-looptransportclock",
    "name": "LoopTransportClock",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-index-ts-masteraudioclock",
    "name": "MasterAudioClock",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-index-ts-mediatimelineclock",
    "name": "MediaTimelineClock",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-index-ts-mediatimelineclockoptions",
    "name": "MediaTimelineClockOptions",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-index-ts-scoretransportclock",
    "name": "ScoreTransportClock",
    "path": "src/shared/audio/platform/clocks/index.ts",
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
    "id": "src-shared-audio-platform-clocks-looptransportclock-ts-looptransportclock",
    "name": "LoopTransportClock",
    "path": "src/shared/audio/platform/clocks/LoopTransportClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "rhythmPlayer loop anchor — beats relative to loop start on AudioContext timeline.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-clocks-masteraudioclock-ts-masteraudioclock",
    "name": "MasterAudioClock",
    "path": "src/shared/audio/platform/clocks/MasterAudioClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Standalone metronome — AudioContext owns tempo from a fixed start time.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-clocks-mediatimelineclock-ts-mediatimelineclock",
    "name": "MediaTimelineClock",
    "path": "src/shared/audio/platform/clocks/MediaTimelineClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Stanza-style media-slaved clock. Maps media timeline → beats using calibration anchor.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-clocks-mediatimelineclock-ts-mediatimelineclockoptions",
    "name": "MediaTimelineClockOptions",
    "path": "src/shared/audio/platform/clocks/MediaTimelineClock.ts",
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
    "id": "src-shared-audio-platform-clocks-scoretransportclock-ts-scoretransportclock",
    "name": "ScoreTransportClock",
    "path": "src/shared/audio/platform/clocks/ScoreTransportClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "ScorePlaybackEngine beat position — optional BeatMap for rubato/video sync.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-hooks-uselookaheadbackingbeat-ts-uselookaheadbackingbeat",
    "name": "useLookAheadBackingBeat",
    "path": "src/shared/audio/platform/hooks/useLookAheadBackingBeat.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Schedules auxiliary backing patterns on the rhythmPlayer loop transport (look-ahead). Replaces reactive AudioPlayer.play() on metronome beat crossings.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-hooks-uselookaheadbackingbeat-ts-uselookaheadbackingbeatoptions",
    "name": "UseLookAheadBackingBeatOptions",
    "path": "src/shared/audio/platform/hooks/useLookAheadBackingBeat.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-hooks-usemediatimelinedrumscheduler-ts-createmediatimelinedrumscheduler",
    "name": "createMediaTimelineDrumScheduler",
    "path": "src/shared/audio/platform/hooks/useMediaTimelineDrumScheduler.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "playback-core",
    "description": "DrumScheduler for media-slaved hosts (Stanza). Invokes DrumAccompaniment callback with beat windows derived from media timeline + look-ahead.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-hooks-usemediatimelinedrumscheduler-ts-mediatimelinedrumscheduleroptions",
    "name": "MediaTimelineDrumSchedulerOptions",
    "path": "src/shared/audio/platform/hooks/useMediaTimelineDrumScheduler.ts",
    "kind": "hook",
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
    "id": "src-shared-audio-platform-hooks-useplatformmediametronome-ts-primeplatformmetronomeaudio",
    "name": "primePlatformMetronomeAudio",
    "path": "src/shared/audio/platform/hooks/usePlatformMediaMetronome.ts",
    "kind": "hook",
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
    "id": "src-shared-audio-platform-hooks-useplatformmediametronome-ts-useplatformmediametronome",
    "name": "usePlatformMediaMetronome",
    "path": "src/shared/audio/platform/hooks/usePlatformMediaMetronome.ts",
    "kind": "hook",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Media-slaved metronome with look-ahead click/voice scheduling on the subdivision grid.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-hooks-useplatformmediametronome-ts-useplatformmediametronomeoptions",
    "name": "UsePlatformMediaMetronomeOptions",
    "path": "src/shared/audio/platform/hooks/usePlatformMediaMetronome.ts",
    "kind": "hook",
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
    "id": "src-shared-audio-platform-index-ts-appaudiopattern",
    "name": "AppAudioPattern",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-audio-pattern-registry",
    "name": "AUDIO_PATTERN_REGISTRY",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-clockpattern",
    "name": "ClockPattern",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-createmediatimelinedrumscheduler",
    "name": "createMediaTimelineDrumScheduler",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-forbidden-reactive-patterns",
    "name": "FORBIDDEN_REACTIVE_PATTERNS",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-primeplatformmetronomeaudio",
    "name": "primePlatformMetronomeAudio",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-schedulerpattern",
    "name": "SchedulerPattern",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-uselookaheadbackingbeat",
    "name": "useLookAheadBackingBeat",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-index-ts-useplatformmediametronome",
    "name": "usePlatformMediaMetronome",
    "path": "src/shared/audio/platform/index.ts",
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
    "id": "src-shared-audio-platform-metronome-components-drumaccentsettingspanel-tsx-drumaccentsettingspanel",
    "name": "DrumAccentSettingsPanel",
    "path": "src/shared/audio/platform/metronome/components/DrumAccentSettingsPanel.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Shared accent + reverb controls — replaces Drums SettingsMenu accent rows and Words custom sliders.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-components-drumaccentsettingspanel-tsx-drumaccentsettingspanelprops",
    "name": "DrumAccentSettingsPanelProps",
    "path": "src/shared/audio/platform/metronome/components/DrumAccentSettingsPanel.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-components-labssplitactionbutton-tsx-labssplitactionbutton",
    "name": "LabsSplitActionButton",
    "path": "src/shared/audio/platform/metronome/components/LabsSplitActionButton.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-components-labssplitactionbutton-tsx-labssplitactionbuttonprops",
    "name": "LabsSplitActionButtonProps",
    "path": "src/shared/audio/platform/metronome/components/LabsSplitActionButton.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-components-metronomeadvancedsettingspanel-tsx-metronomeadvancedsettingspanel",
    "name": "MetronomeAdvancedSettingsPanel",
    "path": "src/shared/audio/platform/metronome/components/MetronomeAdvancedSettingsPanel.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-components-metronomeadvancedsettingspanel-tsx-metronomeadvancedsettingspanelprops",
    "name": "MetronomeAdvancedSettingsPanelProps",
    "path": "src/shared/audio/platform/metronome/components/MetronomeAdvancedSettingsPanel.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-components-metronomesplitcontrol-tsx-metronomesplitcontrol",
    "name": "MetronomeSplitControl",
    "path": "src/shared/audio/platform/metronome/components/MetronomeSplitControl.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": "metronome-split-control"
  },
  {
    "id": "src-shared-audio-platform-metronome-components-metronomesplitcontrol-tsx-metronomesplitcontrolprops",
    "name": "MetronomeSplitControlProps",
    "path": "src/shared/audio/platform/metronome/components/MetronomeSplitControl.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "components",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-applymetronomebusgain",
    "name": "applyMetronomeBusGain",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-count-metronome-defaults",
    "name": "COUNT_METRONOME_DEFAULTS",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-decodemetronomepreferences",
    "name": "decodeMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-default-subdivision-volumes",
    "name": "DEFAULT_SUBDIVISION_VOLUMES",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-defaultmetronomepreferences",
    "name": "defaultMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-drumaccentsettingspanel",
    "name": "DrumAccentSettingsPanel",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-encodemetronomepreferences",
    "name": "encodeMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-getplaybackappdefaultsubdivisionlevel",
    "name": "getPlaybackAppDefaultSubdivisionLevel",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-ismetronomenondefault",
    "name": "isMetronomeNonDefault",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-labssplitactionbutton",
    "name": "LabsSplitActionButton",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-metronomeadvancedsettingspanel",
    "name": "MetronomeAdvancedSettingsPanel",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-metronomeappearance",
    "name": "MetronomeAppearance",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-platform-metronome-index-ts-metronomeclicklevels",
    "name": "metronomeClickLevels",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-metronomepreferences",
    "name": "MetronomePreferences",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-platform-metronome-index-ts-metronomeruntimecoordinator",
    "name": "MetronomeRuntimeCoordinator",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-metronomesettingspanelclass",
    "name": "metronomeSettingsPanelClass",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-metronomesettingspopoverclass",
    "name": "metronomeSettingsPopoverClass",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-metronomesourceenabled",
    "name": "MetronomeSourceEnabled",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-platform-metronome-index-ts-metronomesplitcontrol",
    "name": "MetronomeSplitControl",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-metronomesplitcontrolclass",
    "name": "metronomeSplitControlClass",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-playback-app-metronome-defaults",
    "name": "PLAYBACK_APP_METRONOME_DEFAULTS",
    "path": "src/shared/audio/platform/metronome/index.ts",
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
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-resolvemetronomeappearance",
    "name": "resolveMetronomeAppearance",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-tometronomeengineconfig",
    "name": "toMetronomeEngineConfig",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-usemetronomepreferences",
    "name": "useMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "chords",
      "drums",
      "piano",
      "ui",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-index-ts-usemetronomepreferencesoptions",
    "name": "UseMetronomePreferencesOptions",
    "path": "src/shared/audio/platform/metronome/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
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
    "id": "src-shared-audio-platform-metronome-metronomeappearance-ts-metronomeappearance",
    "name": "MetronomeAppearance",
    "path": "src/shared/audio/platform/metronome/metronomeAppearance.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Host appearance tokens for — mirrors PlaybackFieldSelect pattern.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeappearance-ts-metronomesettingspanelclass",
    "name": "metronomeSettingsPanelClass",
    "path": "src/shared/audio/platform/metronome/metronomeAppearance.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Host appearance tokens for — mirrors PlaybackFieldSelect pattern.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeappearance-ts-metronomesettingspopoverclass",
    "name": "metronomeSettingsPopoverClass",
    "path": "src/shared/audio/platform/metronome/metronomeAppearance.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Host appearance tokens for — mirrors PlaybackFieldSelect pattern.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeappearance-ts-metronomesplitcontrolclass",
    "name": "metronomeSplitControlClass",
    "path": "src/shared/audio/platform/metronome/metronomeAppearance.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Host appearance tokens for — mirrors PlaybackFieldSelect pattern.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeappearance-ts-resolvemetronomeappearance",
    "name": "resolveMetronomeAppearance",
    "path": "src/shared/audio/platform/metronome/metronomeAppearance.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Host appearance tokens for — mirrors PlaybackFieldSelect pattern.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomebusgain-ts-applymetronomebusgain",
    "name": "applyMetronomeBusGain",
    "path": "src/shared/audio/platform/metronome/metronomeBusGain.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Apply an app-level metronome bus gain (0–1 mix slider) on top of advanced-panel Overall volume. Matches rhythm playback: legacyMetVolume × prefs.masterVolume.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeclicklevels-ts-metronome-downbeat-ceiling",
    "name": "METRONOME_DOWNBEAT_CEILING",
    "path": "src/shared/audio/platform/metronome/metronomeClickLevels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Downbeat ceiling before user gain slider. Shared from Stanza metronome UX.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeclicklevels-ts-metronome-downbeat-playback-rate",
    "name": "METRONOME_DOWNBEAT_PLAYBACK_RATE",
    "path": "src/shared/audio/platform/metronome/metronomeClickLevels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Downbeat ceiling before user gain slider. Shared from Stanza metronome UX.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeclicklevels-ts-metronome-offbeat-ratio",
    "name": "METRONOME_OFFBEAT_RATIO",
    "path": "src/shared/audio/platform/metronome/metronomeClickLevels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Downbeat ceiling before user gain slider. Shared from Stanza metronome UX.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeclicklevels-ts-metronomeclicklevels",
    "name": "metronomeClickLevels",
    "path": "src/shared/audio/platform/metronome/metronomeClickLevels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Downbeat ceiling before user gain slider. Shared from Stanza metronome UX.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-metronomeruntimecoordinator-ts-metronomeruntimecoordinator",
    "name": "MetronomeRuntimeCoordinator",
    "path": "src/shared/audio/platform/metronome/MetronomeRuntimeCoordinator.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coordinates metronome emission for slave-clock apps. Uses MetronomeEngine when advanced prefs active; legacy click path when defaults.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-count-metronome-defaults",
    "name": "COUNT_METRONOME_DEFAULTS",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-decodemetronomepreferences",
    "name": "decodeMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-default-metronome-drum-gain",
    "name": "DEFAULT_METRONOME_DRUM_GAIN",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-default-subdivision-volumes",
    "name": "DEFAULT_SUBDIVISION_VOLUMES",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-defaultmetronomelevelvolumes",
    "name": "defaultMetronomeLevelVolumes",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Default level sliders for the “Reset levels” control in advanced settings.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-defaultmetronomepreferences",
    "name": "defaultMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-encodemetronomepreferences",
    "name": "encodeMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-getplaybackappdefaultsubdivisionlevel",
    "name": "getPlaybackAppDefaultSubdivisionLevel",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-ismetronomenondefault",
    "name": "isMetronomeNonDefault",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-metronomeappdefaults",
    "name": "MetronomeAppDefaults",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-metronomepreferences",
    "name": "MetronomePreferences",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-metronomesourceenabled",
    "name": "MetronomeSourceEnabled",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-normalizemetronomepreferences",
    "name": "normalizeMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-preferences-ts-playback-app-metronome-defaults",
    "name": "PLAYBACK_APP_METRONOME_DEFAULTS",
    "path": "src/shared/audio/platform/metronome/preferences.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Coarsest grid for playback apps — quarter pulses in /4, eighth in /8.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-metronome-tometronomeengineconfig-ts-tometronomeengineconfig",
    "name": "toMetronomeEngineConfig",
    "path": "src/shared/audio/platform/metronome/toMetronomeEngineConfig.ts",
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
    "id": "src-shared-audio-platform-metronome-usemetronomepreferences-ts-usemetronomepreferences",
    "name": "useMetronomePreferences",
    "path": "src/shared/audio/platform/metronome/useMetronomePreferences.ts",
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
    "id": "src-shared-audio-platform-metronome-usemetronomepreferences-ts-usemetronomepreferencesoptions",
    "name": "UseMetronomePreferencesOptions",
    "path": "src/shared/audio/platform/metronome/useMetronomePreferences.ts",
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
    "id": "src-shared-audio-platform-mix-index-ts-accentmixstate",
    "name": "AccentMixState",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-audiomixchannels",
    "name": "AudioMixChannels",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-audiomixchannelspatch",
    "name": "AudioMixChannelsPatch",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-audiomixchannelstate",
    "name": "AudioMixChannelState",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-default-audio-mix",
    "name": "DEFAULT_AUDIO_MIX",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-labsaudiomixbus",
    "name": "LabsAudioMixBus",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-mergeaudiomix",
    "name": "mergeAudioMix",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-mixchannelstoplaybacksettings",
    "name": "mixChannelsToPlaybackSettings",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-playbacksettingstomixpatch",
    "name": "playbackSettingsToMixPatch",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-useaudiomixbus",
    "name": "useAudioMixBus",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-useaudiomixbusoptions",
    "name": "UseAudioMixBusOptions",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-index-ts-useplaybacksettingsmixsync",
    "name": "usePlaybackSettingsMixSync",
    "path": "src/shared/audio/platform/mix/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-labsaudiomixbus-ts-accentmixstate",
    "name": "AccentMixState",
    "path": "src/shared/audio/platform/mix/LabsAudioMixBus.ts",
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
    "id": "src-shared-audio-platform-mix-labsaudiomixbus-ts-audiomixchannels",
    "name": "AudioMixChannels",
    "path": "src/shared/audio/platform/mix/LabsAudioMixBus.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Normalized mix bus — apps map local storage into this shape.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-labsaudiomixbus-ts-audiomixchannelspatch",
    "name": "AudioMixChannelsPatch",
    "path": "src/shared/audio/platform/mix/LabsAudioMixBus.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Deep-partial patch for (volume-only updates preserve mute flags).",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-labsaudiomixbus-ts-audiomixchannelstate",
    "name": "AudioMixChannelState",
    "path": "src/shared/audio/platform/mix/LabsAudioMixBus.ts",
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
    "id": "src-shared-audio-platform-mix-labsaudiomixbus-ts-default-audio-mix",
    "name": "DEFAULT_AUDIO_MIX",
    "path": "src/shared/audio/platform/mix/LabsAudioMixBus.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-labsaudiomixbus-ts-labsaudiomixbus",
    "name": "LabsAudioMixBus",
    "path": "src/shared/audio/platform/mix/LabsAudioMixBus.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Unified mix calculations — wraps playbackVolumeMix for all apps.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-labsaudiomixbus-ts-mergeaudiomix",
    "name": "mergeAudioMix",
    "path": "src/shared/audio/platform/mix/LabsAudioMixBus.ts",
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
    "id": "src-shared-audio-platform-mix-playbacksettingsmixsync-ts-mixchannelstoplaybacksettings",
    "name": "mixChannelsToPlaybackSettings",
    "path": "src/shared/audio/platform/mix/playbackSettingsMixSync.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Hydrate playback-settings UI from persisted mix-bus channels.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-playbacksettingsmixsync-ts-playbacksettingstomixpatch",
    "name": "playbackSettingsToMixPatch",
    "path": "src/shared/audio/platform/mix/playbackSettingsMixSync.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Map playback-settings sliders into mix-bus channel volumes (preserves mute flags via merge).",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-mix-useaudiomixbus-ts-useaudiomixbus",
    "name": "useAudioMixBus",
    "path": "src/shared/audio/platform/mix/useAudioMixBus.ts",
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
    "id": "src-shared-audio-platform-mix-useaudiomixbus-ts-useaudiomixbusoptions",
    "name": "UseAudioMixBusOptions",
    "path": "src/shared/audio/platform/mix/useAudioMixBus.ts",
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
    "id": "src-shared-audio-platform-mix-useplaybacksettingsmixsync-ts-useplaybacksettingsmixsync",
    "name": "usePlaybackSettingsMixSync",
    "path": "src/shared/audio/platform/mix/usePlaybackSettingsMixSync.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Binds PlaybackSettings sliders to so effective gain matches UI. Use in Drums (and future apps) instead of duplicating metronome/accent channel state.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-players-createdrumaudioplayer-ts-createdrumaudioplayer",
    "name": "createDrumAudioPlayer",
    "path": "src/shared/audio/platform/players/createDrumAudioPlayer.ts",
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
    "id": "src-shared-audio-platform-players-createdrumaudioplayer-ts-createdrumaudioplayeroptions",
    "name": "CreateDrumAudioPlayerOptions",
    "path": "src/shared/audio/platform/players/createDrumAudioPlayer.ts",
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
    "id": "src-shared-audio-platform-players-createdrumaudioplayer-ts-drumaudioplayerfacade",
    "name": "DrumAudioPlayerFacade",
    "path": "src/shared/audio/platform/players/createDrumAudioPlayer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-players-index-ts-createdrumaudioplayer",
    "name": "createDrumAudioPlayer",
    "path": "src/shared/audio/platform/players/index.ts",
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
    "id": "src-shared-audio-platform-players-index-ts-createdrumaudioplayeroptions",
    "name": "CreateDrumAudioPlayerOptions",
    "path": "src/shared/audio/platform/players/index.ts",
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
    "id": "src-shared-audio-platform-players-index-ts-drumaudioplayerfacade",
    "name": "DrumAudioPlayerFacade",
    "path": "src/shared/audio/platform/players/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-drumscheduleradapter-ts-createdrumscheduleradapter",
    "name": "createDrumSchedulerAdapter",
    "path": "src/shared/audio/platform/scheduling/DrumSchedulerAdapter.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Implements DrumAccompaniment DrumScheduler via ScorePlaybackEngine or custom playAt.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-scheduling-drumscheduleradapter-ts-wiredrumaccompanimenttoengine",
    "name": "wireDrumAccompanimentToEngine",
    "path": "src/shared/audio/platform/scheduling/DrumSchedulerAdapter.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Implements DrumAccompaniment DrumScheduler via ScorePlaybackEngine or custom playAt.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-scheduling-index-ts-createdrumpatternschedulercallback",
    "name": "createDrumPatternSchedulerCallback",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-createdrumscheduleradapter",
    "name": "createDrumSchedulerAdapter",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-default-look-ahead-sec",
    "name": "DEFAULT_LOOK_AHEAD_SEC",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-drumhitplayat",
    "name": "DrumHitPlayAt",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-drumschedulercallback",
    "name": "DrumSchedulerCallback",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-hidden-tab-look-ahead-sec",
    "name": "HIDDEN_TAB_LOOK_AHEAD_SEC",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-lookaheadaudioscheduler",
    "name": "LookAheadAudioScheduler",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-scheduledrumpatternwindow",
    "name": "scheduleDrumPatternWindow",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-scheduledrumpatternwindowparams",
    "name": "ScheduleDrumPatternWindowParams",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-setdrumpatternplayatbridge",
    "name": "setDrumPatternPlayAtBridge",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-index-ts-wiredrumaccompanimenttoengine",
    "name": "wireDrumAccompanimentToEngine",
    "path": "src/shared/audio/platform/scheduling/index.ts",
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
    "id": "src-shared-audio-platform-scheduling-lookaheadaudioscheduler-ts-default-look-ahead-sec",
    "name": "DEFAULT_LOOK_AHEAD_SEC",
    "path": "src/shared/audio/platform/scheduling/LookAheadAudioScheduler.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-scheduling-lookaheadaudioscheduler-ts-hidden-tab-look-ahead-sec",
    "name": "HIDDEN_TAB_LOOK_AHEAD_SEC",
    "path": "src/shared/audio/platform/scheduling/LookAheadAudioScheduler.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-scheduling-lookaheadaudioscheduler-ts-lookaheadaudioscheduler",
    "name": "LookAheadAudioScheduler",
    "path": "src/shared/audio/platform/scheduling/LookAheadAudioScheduler.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Shared rAF + PreciseScheduler wrapper for look-ahead Web Audio scheduling.",
    "tags": [
      "audio",
      "api"
    ],
    "appsUsing": [],
    "exportType": "class",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-scheduling-scheduledrumpatternwindow-ts-createdrumpatternschedulercallback",
    "name": "createDrumPatternSchedulerCallback",
    "path": "src/shared/audio/platform/scheduling/scheduleDrumPatternWindow.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Build a ScorePlayback-compatible drum callback from pattern + volume refs.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-scheduling-scheduledrumpatternwindow-ts-drumhitplayat",
    "name": "DrumHitPlayAt",
    "path": "src/shared/audio/platform/scheduling/scheduleDrumPatternWindow.ts",
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
    "id": "src-shared-audio-platform-scheduling-scheduledrumpatternwindow-ts-drumschedulercallback",
    "name": "DrumSchedulerCallback",
    "path": "src/shared/audio/platform/scheduling/scheduleDrumPatternWindow.ts",
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
    "id": "src-shared-audio-platform-scheduling-scheduledrumpatternwindow-ts-scheduledrumpatternwindow",
    "name": "scheduleDrumPatternWindow",
    "path": "src/shared/audio/platform/scheduling/scheduleDrumPatternWindow.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Schedule drum pattern hits in a beat window — shared by DrumAccompaniment, ScorePlayback drum callback, and rhythmPlayer internals.",
    "tags": [
      "audio"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-audio-platform-scheduling-scheduledrumpatternwindow-ts-scheduledrumpatternwindowparams",
    "name": "ScheduleDrumPatternWindowParams",
    "path": "src/shared/audio/platform/scheduling/scheduleDrumPatternWindow.ts",
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
    "id": "src-shared-audio-platform-scheduling-scheduledrumpatternwindow-ts-setdrumpatternplayatbridge",
    "name": "setDrumPatternPlayAtBridge",
    "path": "src/shared/audio/platform/scheduling/scheduleDrumPatternWindow.ts",
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
    "id": "src-shared-beat-wholesongbeatanalysis-ts-beatoneanchormediatime",
    "name": "beatOneAnchorMediaTime",
    "path": "src/shared/beat/wholeSongBeatAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Absolute media time (seconds) for Beat 1 after analysis.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-color-convert-ts-colorstatetocss",
    "name": "colorStateToCss",
    "path": "src/shared/color/convert.ts",
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
    "id": "src-shared-color-convert-ts-colorstatetohex",
    "name": "colorStateToHex",
    "path": "src/shared/color/convert.ts",
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
    "id": "src-shared-color-convert-ts-hextocolorstate",
    "name": "hexToColorState",
    "path": "src/shared/color/convert.ts",
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
    "id": "src-shared-color-convert-ts-normalizehex",
    "name": "normalizeHex",
    "path": "src/shared/color/convert.ts",
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
    "id": "src-shared-color-extractpalette-ts-extractcolorsbymethod",
    "name": "extractColorsByMethod",
    "path": "src/shared/color/extractPalette.ts",
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
    "id": "src-shared-color-extractpalette-ts-extractdominantcolors",
    "name": "extractDominantColors",
    "path": "src/shared/color/extractPalette.ts",
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
    "id": "src-shared-color-extractpalette-ts-loadimagetoimagedata",
    "name": "loadImageToImageData",
    "path": "src/shared/color/extractPalette.ts",
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
    "id": "src-shared-color-extractpalette-ts-proposepalettesfromcolors",
    "name": "proposePalettesFromColors",
    "path": "src/shared/color/extractPalette.ts",
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
    "id": "src-shared-color-extractpalette-ts-proposepalettesfromimagefiles",
    "name": "proposePalettesFromImageFiles",
    "path": "src/shared/color/extractPalette.ts",
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
    "id": "src-shared-color-extractpalette-ts-proposepalettesfrompixels",
    "name": "proposePalettesFromPixels",
    "path": "src/shared/color/extractPalette.ts",
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
    "id": "src-shared-color-extractpalette-ts-sampleimagedatatopixels",
    "name": "sampleImageDataToPixels",
    "path": "src/shared/color/extractPalette.ts",
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
    "id": "src-shared-color-formatoklch-ts-clampcolorstate",
    "name": "clampColorState",
    "path": "src/shared/color/formatOklch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Lightness as 0–100% for CSS `oklch()` syntax.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-color-formatoklch-ts-formatoklchcss",
    "name": "formatOklchCss",
    "path": "src/shared/color/formatOklch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Standard CSS Color Level 4 oklch() string.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-color-formatoklch-ts-formatoklchlightnesspercent",
    "name": "formatOklchLightnessPercent",
    "path": "src/shared/color/formatOklch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Lightness as 0–100% for CSS `oklch()` syntax.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-color-harmony-ts-colorsfromharmony",
    "name": "colorsFromHarmony",
    "path": "src/shared/color/harmony.ts",
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
    "id": "src-shared-color-harmony-ts-harmonyoffsets",
    "name": "harmonyOffsets",
    "path": "src/shared/color/harmony.ts",
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
    "id": "src-shared-color-harmony-ts-mutedbridgepalette",
    "name": "mutedBridgePalette",
    "path": "src/shared/color/harmony.ts",
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
    "id": "src-shared-color-index-ts-clampcolorstate",
    "name": "clampColorState",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-clamptoprofile",
    "name": "clampToProfile",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-colorsfromharmony",
    "name": "colorsFromHarmony",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-colorstate",
    "name": "ColorState",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-colorstatetocss",
    "name": "colorStateToCss",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-colorstatetohex",
    "name": "colorStateToHex",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-dedupepaletteproposals",
    "name": "dedupePaletteProposals",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-default-palette-profile",
    "name": "DEFAULT_PALETTE_PROFILE",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-extractcolorsbymethod",
    "name": "extractColorsByMethod",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-extractdominantcolors",
    "name": "extractDominantColors",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-fitcolortogamut",
    "name": "fitColorToGamut",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-fitpalettetogamut",
    "name": "fitPaletteToGamut",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-formatoklchcss",
    "name": "formatOklchCss",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-formatoklchlightnesspercent",
    "name": "formatOklchLightnessPercent",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-generatepalettefromseed",
    "name": "generatePaletteFromSeed",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-generatepalettefromseedhex",
    "name": "generatePaletteFromSeedHex",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-generaterandompalettes",
    "name": "generateRandomPalettes",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-harmonyoffsets",
    "name": "harmonyOffsets",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-harmonysystem",
    "name": "HarmonySystem",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-hextocolorstate",
    "name": "hexToColorState",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-huedistance",
    "name": "hueDistance",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-injectcontrastanchors",
    "name": "injectContrastAnchors",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-lerpoklch",
    "name": "lerpOklch",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-loadimagetoimagedata",
    "name": "loadImageToImageData",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-mutedbridgepalette",
    "name": "mutedBridgePalette",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-normalizehex",
    "name": "normalizeHex",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-palette-mixed-mood-pool",
    "name": "PALETTE_MIXED_MOOD_POOL",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-palette-mood-presets",
    "name": "PALETTE_MOOD_PRESETS",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-palette-random-templates",
    "name": "PALETTE_RANDOM_TEMPLATES",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-paletteextractionmethod",
    "name": "PaletteExtractionMethod",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-palettegamutmode",
    "name": "PaletteGamutMode",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-palettegenerationprofile",
    "name": "PaletteGenerationProfile",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-palettemoodpreset",
    "name": "PaletteMoodPreset",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-paletteproposal",
    "name": "PaletteProposal",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-paletterandomtemplate",
    "name": "PaletteRandomTemplate",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-pickmixedmoodprofile",
    "name": "pickMixedMoodProfile",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-proposepalettesfromcolors",
    "name": "proposePalettesFromColors",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-proposepalettesfromimagefiles",
    "name": "proposePalettesFromImageFiles",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-proposepalettesfrompixels",
    "name": "proposePalettesFromPixels",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-resolvepaletteprofile",
    "name": "resolvePaletteProfile",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-index-ts-sampleimagedatatopixels",
    "name": "sampleImageDataToPixels",
    "path": "src/shared/color/index.ts",
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
    "id": "src-shared-color-lerpoklch-ts-huedistance",
    "name": "hueDistance",
    "path": "src/shared/color/lerpOklch.ts",
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
    "id": "src-shared-color-lerpoklch-ts-lerpoklch",
    "name": "lerpOklch",
    "path": "src/shared/color/lerpOklch.ts",
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
    "id": "src-shared-color-palettegamut-ts-fitcolortogamut",
    "name": "fitColorToGamut",
    "path": "src/shared/color/paletteGamut.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Reduce chroma until the color round-trips through sRGB hex without drift.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-color-palettegamut-ts-fitpalettetogamut",
    "name": "fitPaletteToGamut",
    "path": "src/shared/color/paletteGamut.ts",
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
    "id": "src-shared-color-palettegenerate-ts-dedupepaletteproposals",
    "name": "dedupePaletteProposals",
    "path": "src/shared/color/paletteGenerate.ts",
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
    "id": "src-shared-color-palettegenerate-ts-generatepalettefromseed",
    "name": "generatePaletteFromSeed",
    "path": "src/shared/color/paletteGenerate.ts",
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
    "id": "src-shared-color-palettegenerate-ts-generatepalettefromseedhex",
    "name": "generatePaletteFromSeedHex",
    "path": "src/shared/color/paletteGenerate.ts",
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
    "id": "src-shared-color-palettegenerate-ts-generaterandompalettes",
    "name": "generateRandomPalettes",
    "path": "src/shared/color/paletteGenerate.ts",
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
    "id": "src-shared-color-palettegenerate-ts-injectcontrastanchors",
    "name": "injectContrastAnchors",
    "path": "src/shared/color/paletteGenerate.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Synthesize tinted ink/paper extremes and optional neon accent from the palette hue story.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-color-palettepolish-ts-polishpalettecolors",
    "name": "polishPaletteColors",
    "path": "src/shared/color/palettePolish.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Push palettes toward clearer hue separation and stronger chroma.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-color-paletteprofile-ts-clamptoprofile",
    "name": "clampToProfile",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-default-palette-profile",
    "name": "DEFAULT_PALETTE_PROFILE",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-huewithinprofile",
    "name": "hueWithinProfile",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-palette-mixed-mood-pool",
    "name": "PALETTE_MIXED_MOOD_POOL",
    "path": "src/shared/color/paletteProfile.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Moods sampled when the Mixed preset is active (one per random gallery row).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-color-paletteprofile-ts-palette-mood-presets",
    "name": "PALETTE_MOOD_PRESETS",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-palette-random-templates",
    "name": "PALETTE_RANDOM_TEMPLATES",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-palettegamutmode",
    "name": "PaletteGamutMode",
    "path": "src/shared/color/paletteProfile.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "How aggressively to clip generated colors to sRGB display gamut.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-color-paletteprofile-ts-palettegenerationprofile",
    "name": "PaletteGenerationProfile",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-palettemoodpreset",
    "name": "PaletteMoodPreset",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-paletterandomtemplate",
    "name": "PaletteRandomTemplate",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-pickmixedmoodprofile",
    "name": "pickMixedMoodProfile",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-paletteprofile-ts-resolvepaletteprofile",
    "name": "resolvePaletteProfile",
    "path": "src/shared/color/paletteProfile.ts",
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
    "id": "src-shared-color-types-ts-colorstate",
    "name": "ColorState",
    "path": "src/shared/color/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Oklch color state used across Labs color tools.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-color-types-ts-harmonysystem",
    "name": "HarmonySystem",
    "path": "src/shared/color/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Oklch color state used across Labs color tools.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-color-types-ts-paletteextractionmethod",
    "name": "PaletteExtractionMethod",
    "path": "src/shared/color/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Oklch color state used across Labs color tools.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-color-types-ts-paletteproposal",
    "name": "PaletteProposal",
    "path": "src/shared/color/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Oklch color state used across Labs color tools.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-comic-blobshapes-ts-bendaydots",
    "name": "benDayDots",
    "path": "src/shared/comic/blobShapes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Procedural blob paths for low-fi comic mockups (no external assets).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-blobshapes-ts-blobellipsepath",
    "name": "blobEllipsePath",
    "path": "src/shared/comic/blobShapes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Procedural blob paths for low-fi comic mockups (no external assets).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-blobshapes-ts-blobheadpath",
    "name": "blobHeadPath",
    "path": "src/shared/comic/blobShapes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Procedural blob paths for low-fi comic mockups (no external assets).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-blobshapes-ts-bloblimbpath",
    "name": "blobLimbPath",
    "path": "src/shared/comic/blobShapes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Procedural blob paths for low-fi comic mockups (no external assets).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-blobshapes-ts-blobtorsopath",
    "name": "blobTorsoPath",
    "path": "src/shared/comic/blobShapes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Procedural blob paths for low-fi comic mockups (no external assets).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-blobshapes-ts-cityskylinepath",
    "name": "citySkylinePath",
    "path": "src/shared/comic/blobShapes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Procedural blob paths for low-fi comic mockups (no external assets).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-blobshapes-ts-naturehillspath",
    "name": "natureHillsPath",
    "path": "src/shared/comic/blobShapes.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Procedural blob paths for low-fi comic mockups (no external assets).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-charactermarkers-tsx-character-marker-labels",
    "name": "CHARACTER_MARKER_LABELS",
    "path": "src/shared/comic/characterMarkers.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-charactermarkers-tsx-character-marker-slots",
    "name": "CHARACTER_MARKER_SLOTS",
    "path": "src/shared/comic/characterMarkers.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-charactermarkers-tsx-characterheadpoint",
    "name": "characterHeadPoint",
    "path": "src/shared/comic/characterMarkers.tsx",
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
    "id": "src-shared-comic-charactermarkers-tsx-charactermarkerbox",
    "name": "characterMarkerBox",
    "path": "src/shared/comic/characterMarkers.tsx",
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
    "id": "src-shared-comic-charactermarkers-tsx-charactermarkerbox",
    "name": "CharacterMarkerBox",
    "path": "src/shared/comic/characterMarkers.tsx",
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
    "id": "src-shared-comic-charactermarkers-tsx-charactermarkerlayoutbox",
    "name": "characterMarkerLayoutBox",
    "path": "src/shared/comic/characterMarkers.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Layout overlap uses body box — excludes decorative shape tips above the head.",
    "tags": [
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-charactermarkers-tsx-charactermarkerpoint",
    "name": "characterMarkerPoint",
    "path": "src/shared/comic/characterMarkers.tsx",
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
    "id": "src-shared-comic-charactermarkers-tsx-charactertailanchor",
    "name": "characterTailAnchor",
    "path": "src/shared/comic/characterMarkers.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Tail target — shape-specific anchor (apex / circle top / square top).",
    "tags": [
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-charactermarkers-tsx-rendercharactermarker",
    "name": "renderCharacterMarker",
    "path": "src/shared/comic/characterMarkers.tsx",
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
    "id": "src-shared-comic-charactermarkers-tsx-renderhorizonscene",
    "name": "renderHorizonScene",
    "path": "src/shared/comic/characterMarkers.tsx",
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
    "id": "src-shared-comic-index-ts-adaptblockstopanelbudget",
    "name": "adaptBlocksToPanelBudget",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-anybubbletailsoverlap",
    "name": "anyBubbleTailsOverlap",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-bubblestailsoverlap",
    "name": "bubblesTailsOverlap",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-buildpanellayout",
    "name": "buildPanelLayout",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-comicboarddocument",
    "name": "ComicBoardDocument",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-defaultfillsforlayout",
    "name": "defaultFillsForLayout",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-defaultgeneratedlayout",
    "name": "defaultGeneratedLayout",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-generatedpanellayout",
    "name": "GeneratedPanelLayout",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-generatelayoutsforpanelcount",
    "name": "generateLayoutsForPanelCount",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-getlayoutsafeinsets",
    "name": "getLayoutSafeInsets",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-getlayoutsaferegion",
    "name": "getLayoutSafeRegion",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-layoutgenerateoptions",
    "name": "LayoutGenerateOptions",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-layoutheuristicid",
    "name": "LayoutHeuristicId",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-layoutpaneltextblocks",
    "name": "layoutPanelTextBlocks",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-layoutviolation",
    "name": "LayoutViolation",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-layoutviolationcode",
    "name": "LayoutViolationCode",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-maxdialogueblocksforpanel",
    "name": "maxDialogueBlocksForPanel",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-mockupdimensionsforprintspec",
    "name": "mockupDimensionsForPrintSpec",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-normalizepanelfill",
    "name": "normalizePanelFill",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-normalizesfxloudness",
    "name": "normalizeSfxLoudness",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-pagemockupspec",
    "name": "PageMockupSpec",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panel-character-ids",
    "name": "PANEL_CHARACTER_IDS",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panel-composition-ids",
    "name": "PANEL_COMPOSITION_IDS",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panel-composition-labels",
    "name": "PANEL_COMPOSITION_LABELS",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panel-layout-presets",
    "name": "PANEL_LAYOUT_PRESETS",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelbleedmode",
    "name": "PanelBleedMode",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelcaptionblock",
    "name": "PanelCaptionBlock",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelcharacterid",
    "name": "PanelCharacterId",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelcircleclipattrs",
    "name": "panelCircleClipAttrs",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelclippoint",
    "name": "PanelClipPoint",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelcompositionid",
    "name": "PanelCompositionId",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-paneldialogueblock",
    "name": "PanelDialogueBlock",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelfillkind",
    "name": "PanelFillKind",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelfillspec",
    "name": "PanelFillSpec",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panellayoutpresetid",
    "name": "PanelLayoutPresetId",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panellayoutspec",
    "name": "PanelLayoutSpec",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelmockupsvg",
    "name": "PanelMockupSvg",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelpixelbounds",
    "name": "panelPixelBounds",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelrect",
    "name": "PanelRect",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelsfxblock",
    "name": "PanelSfxBlock",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelshapeid",
    "name": "PanelShapeId",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-panelsvgpointsattr",
    "name": "panelSvgPointsAttr",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-paneltextblock",
    "name": "PanelTextBlock",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-paneltextkind",
    "name": "PanelTextKind",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-paneltextoverlay",
    "name": "PanelTextOverlay",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-random-composition-pool",
    "name": "RANDOM_COMPOSITION_POOL",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-randomcompositionid",
    "name": "randomCompositionId",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-randomcompositionsforpanels",
    "name": "randomCompositionsForPanels",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-readingorderforpanels",
    "name": "readingOrderForPanels",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-rendermockupcomposition",
    "name": "renderMockupComposition",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-resolvepanelclip",
    "name": "resolvePanelClip",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-resolvepanelcomposition",
    "name": "resolvePanelComposition",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-resolvepaneltext",
    "name": "resolvePanelText",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-resolvepaneltextblocks",
    "name": "resolvePanelTextBlocks",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-sfx-loudness-levels",
    "name": "SFX_LOUDNESS_LEVELS",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-sfxbasefontsize",
    "name": "sfxBaseFontSize",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-sfxloudness",
    "name": "SfxLoudness",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-sfxloudnessfontscale",
    "name": "sfxLoudnessFontScale",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-sfxrenderstyle",
    "name": "sfxRenderStyle",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-silhouettesvg",
    "name": "silhouetteSvg",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-stick-pose-ids",
    "name": "STICK_POSE_IDS",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-stickfiguresvg",
    "name": "stickFigureSvg",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-stickposeid",
    "name": "StickPoseId",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-validatepaneltextlayout",
    "name": "validatePanelTextLayout",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-index-ts-validatereadingorder",
    "name": "validateReadingOrder",
    "path": "src/shared/comic/index.ts",
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
    "id": "src-shared-comic-layoutgenerate-ts-defaultgeneratedlayout",
    "name": "defaultGeneratedLayout",
    "path": "src/shared/comic/layoutGenerate.ts",
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
    "id": "src-shared-comic-layoutgenerate-ts-generatedpanellayout",
    "name": "GeneratedPanelLayout",
    "path": "src/shared/comic/layoutGenerate.ts",
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
    "id": "src-shared-comic-layoutgenerate-ts-generatelayoutsforpanelcount",
    "name": "generateLayoutsForPanelCount",
    "path": "src/shared/comic/layoutGenerate.ts",
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
    "id": "src-shared-comic-layoutgenerate-ts-layoutgenerateoptions",
    "name": "LayoutGenerateOptions",
    "path": "src/shared/comic/layoutGenerate.ts",
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
    "id": "src-shared-comic-layoutgenerate-ts-layoutheuristicid",
    "name": "LayoutHeuristicId",
    "path": "src/shared/comic/layoutGenerate.ts",
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
    "id": "src-shared-comic-layoutpresets-ts-buildpanellayout",
    "name": "buildPanelLayout",
    "path": "src/shared/comic/layoutPresets.ts",
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
    "id": "src-shared-comic-layoutpresets-ts-defaultfillsforlayout",
    "name": "defaultFillsForLayout",
    "path": "src/shared/comic/layoutPresets.ts",
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
    "id": "src-shared-comic-layoutpresets-ts-panel-layout-presets",
    "name": "PANEL_LAYOUT_PRESETS",
    "path": "src/shared/comic/layoutPresets.ts",
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
    "id": "src-shared-comic-layoutpresets-ts-validatereadingorder",
    "name": "validateReadingOrder",
    "path": "src/shared/comic/layoutPresets.ts",
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
    "id": "src-shared-comic-mockupcompositioncatalog-ts-panel-composition-labels",
    "name": "PANEL_COMPOSITION_LABELS",
    "path": "src/shared/comic/mockupCompositionCatalog.ts",
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
    "id": "src-shared-comic-mockupcompositioncatalog-ts-random-composition-pool",
    "name": "RANDOM_COMPOSITION_POOL",
    "path": "src/shared/comic/mockupCompositionCatalog.ts",
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
    "id": "src-shared-comic-mockupcompositioncatalog-ts-randomcompositionid",
    "name": "randomCompositionId",
    "path": "src/shared/comic/mockupCompositionCatalog.ts",
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
    "id": "src-shared-comic-mockupcompositioncatalog-ts-randomcompositionsforpanels",
    "name": "randomCompositionsForPanels",
    "path": "src/shared/comic/mockupCompositionCatalog.ts",
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
    "id": "src-shared-comic-mockupcompositions-tsx-compositionbounds",
    "name": "CompositionBounds",
    "path": "src/shared/comic/mockupCompositions.tsx",
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
    "id": "src-shared-comic-mockupcompositions-tsx-rendermockupcomposition",
    "name": "renderMockupComposition",
    "path": "src/shared/comic/mockupCompositions.tsx",
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
    "id": "src-shared-comic-panelclippath-ts-panelcircleclipattrs",
    "name": "panelCircleClipAttrs",
    "path": "src/shared/comic/panelClipPath.ts",
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
    "id": "src-shared-comic-panelclippath-ts-panelcliptopixelpoints",
    "name": "panelClipToPixelPoints",
    "path": "src/shared/comic/panelClipPath.ts",
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
    "id": "src-shared-comic-panelclippath-ts-panelpixelbounds",
    "name": "panelPixelBounds",
    "path": "src/shared/comic/panelClipPath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Expand trim-space panel bounds when explicitly marked full-bleed.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-panelclippath-ts-panelpixelbounds",
    "name": "PanelPixelBounds",
    "path": "src/shared/comic/panelClipPath.ts",
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
    "id": "src-shared-comic-panelclippath-ts-panelsvgpointsattr",
    "name": "panelSvgPointsAttr",
    "path": "src/shared/comic/panelClipPath.ts",
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
    "id": "src-shared-comic-panelclippath-ts-resolvepanelclip",
    "name": "resolvePanelClip",
    "path": "src/shared/comic/panelClipPath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve polygon clip for a panel (normalized 0–1 inside its bounding box).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-panelfillresolve-ts-islegacystickfill",
    "name": "isLegacyStickFill",
    "path": "src/shared/comic/panelFillResolve.ts",
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
    "id": "src-shared-comic-panelfillresolve-ts-legacystickpose",
    "name": "legacyStickPose",
    "path": "src/shared/comic/panelFillResolve.ts",
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
    "id": "src-shared-comic-panelfillresolve-ts-normalizepanelfill",
    "name": "normalizePanelFill",
    "path": "src/shared/comic/panelFillResolve.ts",
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
    "id": "src-shared-comic-panelfillresolve-ts-resolvepanelcomposition",
    "name": "resolvePanelComposition",
    "path": "src/shared/comic/panelFillResolve.ts",
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
    "id": "src-shared-comic-panelfillresolve-ts-resolvepaneltext",
    "name": "resolvePanelText",
    "path": "src/shared/comic/panelFillResolve.ts",
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
    "id": "src-shared-comic-panelfillresolve-ts-resolvepaneltextblocks",
    "name": "resolvePanelTextBlocks",
    "path": "src/shared/comic/panelFillResolve.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve ordered text blocks, migrating legacy single `text` overlay when needed.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-panellayoutregion-ts-getlayoutsafeinsets",
    "name": "getLayoutSafeInsets",
    "path": "src/shared/comic/panelLayoutRegion.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Quiet-zone insets for generated panel layouts (Mixam-style best practice).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-panellayoutregion-ts-getlayoutsaferegion",
    "name": "getLayoutSafeRegion",
    "path": "src/shared/comic/panelLayoutRegion.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalized trim-space insets where panel gutters should stay inside (quiet zone).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-panellayoutregion-ts-layoutsafeinsets",
    "name": "LayoutSafeInsets",
    "path": "src/shared/comic/panelLayoutRegion.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalized trim-space insets where panel gutters should stay inside (quiet zone).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-panellayoutregion-ts-layoutsaferegion",
    "name": "LayoutSafeRegion",
    "path": "src/shared/comic/panelLayoutRegion.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Normalized trim-space insets where panel gutters should stay inside (quiet zone).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-panelmockupdimensions-ts-mockupdimensionsforprintspec",
    "name": "mockupDimensionsForPrintSpec",
    "path": "src/shared/comic/panelMockupDimensions.ts",
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
    "id": "src-shared-comic-panelmockupsvg-tsx-panelmockupsvg",
    "name": "PanelMockupSvg",
    "path": "src/shared/comic/PanelMockupSvg.tsx",
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
    "id": "src-shared-comic-panelmockupsvg-tsx-panelmockupsvgprops",
    "name": "PanelMockupSvgProps",
    "path": "src/shared/comic/PanelMockupSvg.tsx",
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
    "id": "src-shared-comic-panelreadingorder-ts-readingorderforpanels",
    "name": "readingOrderForPanels",
    "path": "src/shared/comic/panelReadingOrder.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Western comic reading order: group panels into horizontal rows by vertical overlap, sort rows top-to-bottom, panels within each row left-to-right.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-paneltextlayoutinvariants-ts-bubbletextbbox",
    "name": "bubbleTextBBox",
    "path": "src/shared/comic/panelTextLayoutInvariants.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Axis-aligned dialogue text region used for escape/readability checks.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-paneltextlayoutinvariants-ts-layoutviolation",
    "name": "LayoutViolation",
    "path": "src/shared/comic/panelTextLayoutInvariants.ts",
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
    "id": "src-shared-comic-paneltextlayoutinvariants-ts-layoutviolationcode",
    "name": "LayoutViolationCode",
    "path": "src/shared/comic/panelTextLayoutInvariants.ts",
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
    "id": "src-shared-comic-paneltextlayoutinvariants-ts-validatepaneltextlayout",
    "name": "validatePanelTextLayout",
    "path": "src/shared/comic/panelTextLayoutInvariants.ts",
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
    "id": "src-shared-comic-paneltextlayoutinvariants-ts-validatepaneltextlayoutoptions",
    "name": "ValidatePanelTextLayoutOptions",
    "path": "src/shared/comic/panelTextLayoutInvariants.ts",
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
    "id": "src-shared-comic-paneltextzones-ts-clampx",
    "name": "clampX",
    "path": "src/shared/comic/panelTextZones.ts",
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
    "id": "src-shared-comic-paneltextzones-ts-maxbubblehalfwidth",
    "name": "maxBubbleHalfWidth",
    "path": "src/shared/comic/panelTextZones.ts",
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
    "id": "src-shared-comic-paneltextzones-ts-paneltextzones",
    "name": "panelTextZones",
    "path": "src/shared/comic/panelTextZones.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Vertical bands for caption/dialogue vs character markers.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-paneltextzones-ts-paneltextzones",
    "name": "PanelTextZones",
    "path": "src/shared/comic/panelTextZones.ts",
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
    "id": "src-shared-comic-sfxlayoutgraphic-tsx-sfxlayoutgraphic",
    "name": "SfxLayoutGraphic",
    "path": "src/shared/comic/SfxLayoutGraphic.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Wireframe-safe SFX type treatments by loudness.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-sfxlayoutgraphic-tsx-sfxlayoutgraphicprops",
    "name": "SfxLayoutGraphicProps",
    "path": "src/shared/comic/SfxLayoutGraphic.tsx",
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
    "id": "src-shared-comic-sfxloudness-ts-normalizesfxloudness",
    "name": "normalizeSfxLoudness",
    "path": "src/shared/comic/sfxLoudness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SFX loudness → layout scale + wireframe-safe render treatments.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-sfxloudness-ts-sfxbasefontsize",
    "name": "sfxBaseFontSize",
    "path": "src/shared/comic/sfxLoudness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SFX loudness → layout scale + wireframe-safe render treatments.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-sfxloudness-ts-sfxloudnessfontscale",
    "name": "sfxLoudnessFontScale",
    "path": "src/shared/comic/sfxLoudness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Relative font scale vs panel baseline.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-sfxloudness-ts-sfxrenderstyle",
    "name": "sfxRenderStyle",
    "path": "src/shared/comic/sfxLoudness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SFX loudness → layout scale + wireframe-safe render treatments.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-sfxloudness-ts-sfxrenderstyle",
    "name": "SfxRenderStyle",
    "path": "src/shared/comic/sfxLoudness.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SFX loudness → layout scale + wireframe-safe render treatments.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbleforcelayout-ts-forceobstacle",
    "name": "ForceObstacle",
    "path": "src/shared/comic/speechBubbleForceLayout.ts",
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
    "id": "src-shared-comic-speechbubbleforcelayout-ts-placebubbleswithforce",
    "name": "placeBubblesWithForce",
    "path": "src/shared/comic/speechBubbleForceLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Headless fixed-tick d3-force placement for pre-sized bubbles. Mutates `bubbles` centers only; does not re-run after callers clamp/refit.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbleforcelayout-ts-placebubbleswithforceoptions",
    "name": "PlaceBubblesWithForceOptions",
    "path": "src/shared/comic/speechBubbleForceLayout.ts",
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
    "id": "src-shared-comic-speechbubbleforcelayout-ts-postclampbubbles",
    "name": "postClampBubbles",
    "path": "src/shared/comic/speechBubbleForceLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Bottom-up reading-order pack: anchor near characters, stack earlier bubbles above. Avoids crushing everyone onto the same maxY (the multi-bubble overlap failure mode).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblelayout-ts-captionlayout",
    "name": "CaptionLayout",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblelayout-ts-layoutbounds",
    "name": "LayoutBounds",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblelayout-ts-layoutpaneltextblocks",
    "name": "layoutPanelTextBlocks",
    "path": "src/shared/comic/speechBubbleLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Place captions, dialogue bubbles, and SFX in reading order with zoned layout. Default placer is headless d3-force (`placeMode: 'force'`). Scrapboard uses `slots`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblelayout-ts-paneltextlayout",
    "name": "PanelTextLayout",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblelayout-ts-paneltextlayoutitem",
    "name": "PanelTextLayoutItem",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblelayout-ts-paneltextlayoutoptions",
    "name": "PanelTextLayoutOptions",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblelayout-ts-paneltextlayoutplacemode",
    "name": "PanelTextLayoutPlaceMode",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblelayout-ts-sfxlayout",
    "name": "SfxLayout",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblelayout-ts-speechbubblelayout",
    "name": "SpeechBubbleLayout",
    "path": "src/shared/comic/speechBubbleLayout.ts",
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
    "id": "src-shared-comic-speechbubblepath-ts-bubble-font-family",
    "name": "BUBBLE_FONT_FAMILY",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-font-size",
    "name": "BUBBLE_FONT_SIZE",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-min-readable-font",
    "name": "BUBBLE_MIN_READABLE_FONT",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-pad-x",
    "name": "BUBBLE_PAD_X",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-pad-x-compact",
    "name": "BUBBLE_PAD_X_COMPACT",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-pad-y",
    "name": "BUBBLE_PAD_Y",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-pad-y-compact",
    "name": "BUBBLE_PAD_Y_COMPACT",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-padding-compact",
    "name": "BUBBLE_PADDING_COMPACT",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-padding-micro",
    "name": "BUBBLE_PADDING_MICRO",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-padding-minimal",
    "name": "BUBBLE_PADDING_MINIMAL",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubble-padding-standard",
    "name": "BUBBLE_PADDING_STANDARD",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubblebodybbox",
    "name": "bubbleBodyBBox",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubblemetrics",
    "name": "BubbleMetrics",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubblemetricsforlines",
    "name": "bubbleMetricsForLines",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubblepadding",
    "name": "BubblePadding",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubbleshape",
    "name": "BubbleShape",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubbletextblockheight",
    "name": "bubbleTextBlockHeight",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-bubbletextoffsety",
    "name": "bubbleTextOffsetY",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Nudge dialogue upward when the tail exits from the lower arc.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-charwidthforfont",
    "name": "charWidthForFont",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-fitbubblemetrics",
    "name": "fitBubbleMetrics",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-fitdialoguelines",
    "name": "fitDialogueLines",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Fit dialogue into panel width, shrinking font and re-wrapping until lines fit.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-fitdialoguelineswithinhalfh",
    "name": "fitDialogueLinesWithinHalfH",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Refit dialogue when vertical stack caps bubble height (shrink font / lines until text fits).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-lineheightforfont",
    "name": "lineHeightForFont",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-maxcharsforwidth",
    "name": "maxCharsForWidth",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-pickbubbleshape",
    "name": "pickBubbleShape",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Prefer rounded rects when vertical dialogue space is tight.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-roundrectbubblepathd",
    "name": "roundRectBubblePathD",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Rounded-rectangle body with a smooth cubic tail aimed at the speaker. Attachment stays near the bottom-center so sideways tips don't form sharp elbows.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-speechbubblepathd",
    "name": "speechBubblePathD",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Ellipse body with an integrated tail wedge aimed at (tailX, tailY). The body follows the ellipse arc between mouth points; the tail never chords through the interior.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-speechbubblepathforlayout",
    "name": "speechBubblePathForLayout",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-tailmouthchordcrossesinterior",
    "name": "tailMouthChordCrossesInterior",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when the straight chord between mouth points cuts through the bubble interior (legacy path bug — tail stroke crossed dialogue text).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-tailmouthgeometry",
    "name": "tailMouthGeometry",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mouth points + tail tip for layout/quality checks.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-tailmouthgeometry",
    "name": "TailMouthGeometry",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepath-ts-wrapdialoguetext",
    "name": "wrapDialogueText",
    "path": "src/shared/comic/speechBubblePath.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Comic speech bubble path + text-aware sizing.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepathgeometry-ts-auditbubblepathelement",
    "name": "auditBubblePathElement",
    "path": "src/shared/comic/speechBubblePathGeometry.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Browser/e2e helper — audit path `d` attributes without importing layout code.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepathgeometry-ts-pathgeometryviolation",
    "name": "PathGeometryViolation",
    "path": "src/shared/comic/speechBubblePathGeometry.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Geometric validation for rendered speech-bubble SVG paths and text placement. Complements layout invariants (speechBubbleQuality) with checks on the actual path `d` string and whether dialogue sits in the tail wedge.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepathgeometry-ts-pathgeometryviolationcode",
    "name": "PathGeometryViolationCode",
    "path": "src/shared/comic/speechBubblePathGeometry.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Geometric validation for rendered speech-bubble SVG paths and text placement. Complements layout invariants (speechBubbleQuality) with checks on the actual path `d` string and whether dialogue sits in the tail wedge.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepathgeometry-ts-validatebubblepathd",
    "name": "validateBubblePathD",
    "path": "src/shared/comic/speechBubblePathGeometry.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Validate a bubble path `d` string against expected geometry.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepathgeometry-ts-validatebubbletextplacement",
    "name": "validateBubbleTextPlacement",
    "path": "src/shared/comic/speechBubblePathGeometry.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Check dialogue block center is not inside the tail wedge below the bubble body.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblepathgeometry-ts-validatespeechbubblegeometry",
    "name": "validateSpeechBubbleGeometry",
    "path": "src/shared/comic/speechBubblePathGeometry.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Full path + text geometry for one laid-out bubble.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-bubblequalitythresholds",
    "name": "BubbleQualityThresholds",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Speech-bubble layout quality rules — benchmarks for readable comic dialogue. Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-bubblequalityviolation",
    "name": "BubbleQualityViolation",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Speech-bubble layout quality rules — benchmarks for readable comic dialogue. Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-bubblequalityviolationcode",
    "name": "BubbleQualityViolationCode",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Speech-bubble layout quality rules — benchmarks for readable comic dialogue. Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-default-bubble-quality-thresholds",
    "name": "DEFAULT_BUBBLE_QUALITY_THRESHOLDS",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Speech-bubble layout quality rules — benchmarks for readable comic dialogue. Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-expectbubblequality",
    "name": "expectBubbleQuality",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Speech-bubble layout quality rules — benchmarks for readable comic dialogue. Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-formatbubblequalityreport",
    "name": "formatBubbleQualityReport",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Speech-bubble layout quality rules — benchmarks for readable comic dialogue. Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-validatespeechbubblequality",
    "name": "validateSpeechBubbleQuality",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Stricter validation: geometry invariants + readability benchmarks.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblequality-ts-validatespeechbubblequalityoptions",
    "name": "ValidateSpeechBubbleQualityOptions",
    "path": "src/shared/comic/speechBubbleQuality.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Speech-bubble layout quality rules — benchmarks for readable comic dialogue. Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbleslotlayout-ts-adaptblockstopanelbudget",
    "name": "adaptBlocksToPanelBudget",
    "path": "src/shared/comic/speechBubbleSlotLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Merge consecutive same-speaker lines, put captions first, then trim to dialogue budget.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbleslotlayout-ts-maxdialogueblocksforpanel",
    "name": "maxDialogueBlocksForPanel",
    "path": "src/shared/comic/speechBubbleSlotLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Estimate how many active dialogue lines a panel can host at readable font.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbleslotlayout-ts-placeitemswithslots",
    "name": "placeItemsWithSlots",
    "path": "src/shared/comic/speechBubbleSlotLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Place bubbles with column bias + vertical stack. Always writes a placement; prefers conflict-free stacks, otherwise last-resort tiny centered stack.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbletailoverlap-ts-anybubbletailsoverlap",
    "name": "anyBubbleTailsOverlap",
    "path": "src/shared/comic/speechBubbleTailOverlap.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pairwise speech-bubble tail overlap checks (hard quality rule).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbletailoverlap-ts-bubblestailsoverlap",
    "name": "bubblesTailsOverlap",
    "path": "src/shared/comic/speechBubbleTailOverlap.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when two bubbles’ tails cross or a tail cuts the other’s dialogue box.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubbletailoverlap-ts-segmentsintersect",
    "name": "segmentsIntersect",
    "path": "src/shared/comic/speechBubbleTailOverlap.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Proper segment intersection (including colinear overlap).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-bubble-quality-soft-violations",
    "name": "BUBBLE_QUALITY_SOFT_VIOLATIONS",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Soft only when body may overhang with Bubble escape. Overlap, reading order, and tail_overlap are hard product rules (~98% bar).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-bubblequalitycase",
    "name": "BubbleQualityCase",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Batch runner for speech-bubble layout + quality validation. Used by Vitest matrix tests and `npm run test:bubble-quality`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-bubblequalitycaseresult",
    "name": "BubbleQualityCaseResult",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Batch runner for speech-bubble layout + quality validation. Used by Vitest matrix tests and `npm run test:bubble-quality`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-bubblequalitymatrixreport",
    "name": "BubbleQualityMatrixReport",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Batch runner for speech-bubble layout + quality validation. Used by Vitest matrix tests and `npm run test:bubble-quality`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-builddefaultbubblequalitycases",
    "name": "buildDefaultBubbleQualityCases",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Build a large matrix: layout presets × panels × stress block sets.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-formatbubblequalitymatrixreport",
    "name": "formatBubbleQualityMatrixReport",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Batch runner for speech-bubble layout + quality validation. Used by Vitest matrix tests and `npm run test:bubble-quality`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-runbubblequalitymatrix",
    "name": "runBubbleQualityMatrix",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Run layout + validateSpeechBubbleQuality for each case.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-runbubblequalitymatrixoptions",
    "name": "RunBubbleQualityMatrixOptions",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Batch runner for speech-bubble layout + quality validation. Used by Vitest matrix tests and `npm run test:bubble-quality`.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-comic-speechbubblevalidationharness-ts-stress-dialogue-block-sets",
    "name": "STRESS_DIALOGUE_BLOCK_SETS",
    "path": "src/shared/comic/speechBubbleValidationHarness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Stress block sets mirroring Scrapboard mad-libs exchanges.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-comic-stickfigures-ts-silhouettesvg",
    "name": "silhouetteSvg",
    "path": "src/shared/comic/stickFigures.ts",
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
    "id": "src-shared-comic-stickfigures-ts-stick-pose-ids",
    "name": "STICK_POSE_IDS",
    "path": "src/shared/comic/stickFigures.ts",
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
    "id": "src-shared-comic-stickfigures-ts-stickfiguresvg",
    "name": "stickFigureSvg",
    "path": "src/shared/comic/stickFigures.ts",
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
    "id": "src-shared-comic-stickfigures-ts-stickposeid",
    "name": "StickPoseId",
    "path": "src/shared/comic/stickFigures.ts",
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
    "id": "src-shared-comic-types-ts-comicboarddocument",
    "name": "ComicBoardDocument",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-pagemockupspec",
    "name": "PageMockupSpec",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panel-character-ids",
    "name": "PANEL_CHARACTER_IDS",
    "path": "src/shared/comic/types.ts",
    "kind": "model",
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
    "id": "src-shared-comic-types-ts-panel-composition-ids",
    "name": "PANEL_COMPOSITION_IDS",
    "path": "src/shared/comic/types.ts",
    "kind": "model",
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
    "id": "src-shared-comic-types-ts-panelbleedmode",
    "name": "PanelBleedMode",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelcaptionblock",
    "name": "PanelCaptionBlock",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelcharacterid",
    "name": "PanelCharacterId",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelclippoint",
    "name": "PanelClipPoint",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelcompositionid",
    "name": "PanelCompositionId",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-paneldialogueblock",
    "name": "PanelDialogueBlock",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelfillkind",
    "name": "PanelFillKind",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelfillspec",
    "name": "PanelFillSpec",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panellayoutpresetid",
    "name": "PanelLayoutPresetId",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panellayoutspec",
    "name": "PanelLayoutSpec",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelrect",
    "name": "PanelRect",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelsfxblock",
    "name": "PanelSfxBlock",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-panelshapeid",
    "name": "PanelShapeId",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-paneltextblock",
    "name": "PanelTextBlock",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-paneltextkind",
    "name": "PanelTextKind",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-paneltextoverlay",
    "name": "PanelTextOverlay",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-comic-types-ts-sfx-loudness-levels",
    "name": "SFX_LOUDNESS_LEVELS",
    "path": "src/shared/comic/types.ts",
    "kind": "model",
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
    "id": "src-shared-comic-types-ts-sfxloudness",
    "name": "SfxLoudness",
    "path": "src/shared/comic/types.ts",
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
    "id": "src-shared-components-anchoredpopover-tsx-anchoredpopover",
    "name": "AnchoredPopover",
    "path": "src/shared/components/AnchoredPopover.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Thin wrapper around MUI `Popover` that bakes in the two most common placement patterns used across apps so each app no longer re-specifies `anchorOrigin` / `transformOrigin` / `slotProps.paper.className`. Disables MUI Paper elevation so `--labs-popover-shadow` (app token) is the only shell shadow — div menus and portaled pickers match. See `src/shared/SHARED_UI_CONVENTIONS.md` and `docs/CHROME_UI_CONTRACT.md`.",
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
    "id": "src-shared-components-anchoredpopoverchrome-ts-labs-popover-chrome-sx",
    "name": "LABS_POPOVER_CHROME_SX",
    "path": "src/shared/components/anchoredPopoverChrome.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "MUI Paper chrome — must match `.labs-popover-surface` in labsChrome.css",
    "tags": [
      "components",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-anchoredpopoverchrome-ts-mergeanchoredpopoverpaperslot",
    "name": "mergeAnchoredPopoverPaperSlot",
    "path": "src/shared/components/anchoredPopoverChrome.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "MUI Paper chrome — must match `.labs-popover-surface` in labsChrome.css",
    "tags": [
      "components"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-components-appcompactslider-tsx-appcompactslider",
    "name": "AppCompactSlider",
    "path": "src/shared/components/AppCompactSlider.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Standard MUI slider with reliable rail/track clicks in dense layouts. Use for 0–1 gain rails; use this for latency, MIDI range, etc.",
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
    "id": "src-shared-components-appcompactslider-tsx-appcompactsliderprops",
    "name": "AppCompactSliderProps",
    "path": "src/shared/components/AppCompactSlider.tsx",
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
    "id": "src-shared-components-labsdisclosurechevron-tsx-labsdisclosurechevron",
    "name": "LabsDisclosureChevron",
    "path": "src/shared/components/LabsDisclosureChevron.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Filled disclosure chevron — same glyph as metronome split menus and Load Rhythm. Pointing down when expanded; rotate the wrapper −90° when collapsed.",
    "tags": [
      "components",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-labserrorboundary-tsx-labserrorboundary",
    "name": "LabsErrorBoundary",
    "path": "src/shared/components/LabsErrorBoundary.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared render-error boundary for Labs micro-apps. Recovery: Try again (clear boundary) or Reload (full page).",
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
    "id": "src-shared-components-labserrorboundary-tsx-labserrorboundaryprops",
    "name": "LabsErrorBoundaryProps",
    "path": "src/shared/components/LabsErrorBoundary.tsx",
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
    "id": "src-shared-components-labsfeedbacktoast-tsx-labsfeedbacktoast",
    "name": "LabsFeedbackToast",
    "path": "src/shared/components/LabsFeedbackToast.tsx",
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
    "id": "src-shared-components-labsfeedbacktoast-tsx-labsfeedbacktoastaction",
    "name": "LabsFeedbackToastAction",
    "path": "src/shared/components/LabsFeedbackToast.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Optional inline action (e.g. \"Open\") rendered between the message and the dismiss button.",
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
    "id": "src-shared-components-labsfeedbacktoast-tsx-labsfeedbacktoastprops",
    "name": "LabsFeedbackToastProps",
    "path": "src/shared/components/LabsFeedbackToast.tsx",
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
    "id": "src-shared-components-labsfeedbacktoast-tsx-labsfeedbacktoastseverity",
    "name": "LabsFeedbackToastSeverity",
    "path": "src/shared/components/LabsFeedbackToast.tsx",
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
    "id": "src-shared-components-labslistloadingstate-tsx-labslistloadingstate",
    "name": "LabsListLoadingState",
    "path": "src/shared/components/LabsListLoadingState.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Distinct loading affordance for list and table screens — use while async/local DB data is still resolving. Do not reuse empty-state copy or “Nothing here yet” patterns.",
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
    "id": "src-shared-components-labslistloadingstate-tsx-labslistloadingstateprops",
    "name": "LabsListLoadingStateProps",
    "path": "src/shared/components/LabsListLoadingState.tsx",
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
      "ui"
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
    "description": "Behavior defaults for inline drum embeds. Hosts pass a profile via and keep theming local (`notationStyle`, wrapper className). - **settings-panel** — chord playback popovers (Encore Originals, Chords chart). - **practice-rail** — preset chip grid behind Edit toggle + audible playback (Stanza practice rail). - **sidebar-compact** — full preset grid + audible playback (Piano sidebar). Host-owned pattern fields (Words section template row): spread the profile then override `{ hidePatternInput: true, hideDarbukaLink: true }`.",
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
    "id": "src-shared-components-music-keyinput-tsx-keyinputmenuprops",
    "name": "KeyInputMenuProps",
    "path": "src/shared/components/music/KeyInput.tsx",
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
    "id": "src-shared-components-music-keyinput-tsx-keymodetoggle",
    "name": "KeyModeToggle",
    "path": "src/shared/components/music/KeyInput.tsx",
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
    "id": "src-shared-components-music-keyinput-tsx-keymodetoggleprops",
    "name": "KeyModeToggleProps",
    "path": "src/shared/components/music/KeyInput.tsx",
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
    "id": "src-shared-components-music-keyinput-tsx-keyrelativeswitch",
    "name": "KeyRelativeSwitch",
    "path": "src/shared/components/music/KeyInput.tsx",
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
    "id": "src-shared-components-music-keyinput-tsx-keyrelativeswitchprops",
    "name": "KeyRelativeSwitchProps",
    "path": "src/shared/components/music/KeyInput.tsx",
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
    "id": "src-shared-components-music-keyinputmenuparts-tsx-keyinputmenu",
    "name": "KeyInputMenu",
    "path": "src/shared/components/music/KeyInputMenuParts.tsx",
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
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-keyinputmenuparts-tsx-keyinputmenuprops",
    "name": "KeyInputMenuProps",
    "path": "src/shared/components/music/KeyInputMenuParts.tsx",
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
    "id": "src-shared-components-music-keyinputmenuparts-tsx-keymodetoggle",
    "name": "KeyModeToggle",
    "path": "src/shared/components/music/KeyInputMenuParts.tsx",
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
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-keyinputmenuparts-tsx-keymodetoggleprops",
    "name": "KeyModeToggleProps",
    "path": "src/shared/components/music/KeyInputMenuParts.tsx",
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
    "id": "src-shared-components-music-keyinputmenuparts-tsx-keyrelativeswitch",
    "name": "KeyRelativeSwitch",
    "path": "src/shared/components/music/KeyInputMenuParts.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Switch to the relative major/minor partner (same key signature, new tonic).",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-keyinputmenuparts-tsx-keyrelativeswitchprops",
    "name": "KeyRelativeSwitchProps",
    "path": "src/shared/components/music/KeyInputMenuParts.tsx",
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
    "id": "src-shared-components-music-keyinputpicker-tsx-keyinputpicker",
    "name": "KeyInputPicker",
    "path": "src/shared/components/music/KeyInputPicker.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared major/minor key grid popover (used by full `KeyInput` and chip triggers).",
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
    "id": "src-shared-components-music-keyinputpicker-tsx-keyinputpickerprops",
    "name": "KeyInputPickerProps",
    "path": "src/shared/components/music/KeyInputPicker.tsx",
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
    "id": "src-shared-components-music-musicinputappearance-ts-musicinputappearance",
    "name": "MusicInputAppearance",
    "path": "src/shared/components/music/musicInputAppearance.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared closed-shell + portaled menu appearance for KeyInput / BpmInput.",
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
    "id": "src-shared-components-music-musicinputappearance-ts-musicinputrootclass",
    "name": "musicInputRootClass",
    "path": "src/shared/components/music/musicInputAppearance.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared closed-shell + portaled menu appearance for KeyInput / BpmInput.",
    "tags": [
      "components",
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
    "id": "src-shared-components-music-timesignatureinput-tsx-timesignatureinput",
    "name": "TimeSignatureInput",
    "path": "src/shared/components/music/TimeSignatureInput.tsx",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-ui",
    "description": "Shared meter picker — preset grid plus custom numerator/denominator and optional asymmetric grouping.",
    "tags": [
      "components",
      "music",
      "api",
      "react"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-components-music-timesignatureinput-tsx-timesignatureinputprops",
    "name": "TimeSignatureInputProps",
    "path": "src/shared/components/music/TimeSignatureInput.tsx",
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
      "drums"
    ],
    "exportType": "type",
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
    "description": "Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads). - **Local dev:** same-origin Vite route `/__encore/drive-public/…` (see `vite.config.ts`). - **Production:** when `VITE_LABS_SESSION_BFF_URL` is set, the session BFF proxies Drive server-side (avoids browser CORS/redirect failures and referrer mismatches). - **Fallback:** direct `googleapis.com` with `VITE_GOOGLE_API_KEY` (fragile on static hosting).",
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
    "description": "Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads). - **Local dev:** same-origin Vite route `/__encore/drive-public/…` (see `vite.config.ts`). - **Production:** when `VITE_LABS_SESSION_BFF_URL` is set, the session BFF proxies Drive server-side (avoids browser CORS/redirect failures and referrer mismatches). - **Fallback:** direct `googleapis.com` with `VITE_GOOGLE_API_KEY` (fragile on static hosting).",
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
    "id": "src-shared-drive-buildpublicdrivealtmediaurl-ts-publicdrivefetchroute",
    "name": "PublicDriveFetchRoute",
    "path": "src/shared/drive/buildPublicDriveAltMediaUrl.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads). - **Local dev:** same-origin Vite route `/__encore/drive-public/…` (see `vite.config.ts`). - **Production:** when `VITE_LABS_SESSION_BFF_URL` is set, the session BFF proxies Drive server-side (avoids browser CORS/redirect failures and referrer mismatches). - **Fallback:** direct `googleapis.com` with `VITE_GOOGLE_API_KEY` (fragile on static hosting).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-buildpublicdrivealtmediaurl-ts-resolvepublicdrivefetchroute",
    "name": "resolvePublicDriveFetchRoute",
    "path": "src/shared/drive/buildPublicDriveAltMediaUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads). - **Local dev:** same-origin Vite route `/__encore/drive-public/…` (see `vite.config.ts`). - **Production:** when `VITE_LABS_SESSION_BFF_URL` is set, the session BFF proxies Drive server-side (avoids browser CORS/redirect failures and referrer mismatches). - **Fallback:** direct `googleapis.com` with `VITE_GOOGLE_API_KEY` (fragile on static hosting).",
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
    "description": "Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads). - **Local dev:** same-origin Vite route `/__encore/drive-public/…` (see `vite.config.ts`). - **Production:** when `VITE_LABS_SESSION_BFF_URL` is set, the session BFF proxies Drive server-side (avoids browser CORS/redirect failures and referrer mismatches). - **Fallback:** direct `googleapis.com` with `VITE_GOOGLE_API_KEY` (fragile on static hosting).",
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
    "id": "src-shared-drive-createlabsportfoliodrivebackup-ts-createlabsportfoliodrivebackup",
    "name": "createLabsPortfolioDriveBackup",
    "path": "src/shared/drive/createLabsPortfolioDriveBackup.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared portfolio Drive backup hook factory — auto pull/push, merge, conflict, optional undo. App hooks supply envelope/merge/sync-meta callbacks via .",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-createlabsportfoliodrivebackup-ts-uselabsportfoliodrivebackupoptions",
    "name": "UseLabsPortfolioDriveBackupOptions",
    "path": "src/shared/drive/createLabsPortfolioDriveBackup.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared portfolio Drive backup hook factory — auto pull/push, merge, conflict, optional undo. App hooks supply envelope/merge/sync-meta callbacks via .",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
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
    "id": "src-shared-drive-drivefetch-ts-drivegetrevisionmedia",
    "name": "driveGetRevisionMedia",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Read the text body of a specific file revision (`revisions.get?alt=media`).",
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
    "exportType": "named",
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
    "id": "src-shared-drive-drivefetch-ts-drivelistrevisions",
    "name": "driveListRevisions",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "List a file's revision history (oldest → newest as Drive returns them). Used by data-loss recovery: an accidental empty overwrite can be undone by reading an older revision of the synced JSON. Note Drive auto-prunes unpinned revisions of non-Google files (≈100 revisions or 30 days), so recovery is time-sensitive.",
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
    "id": "src-shared-drive-drivefetch-ts-driverevisionrow",
    "name": "DriveRevisionRow",
    "path": "src/shared/drive/driveFetch.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "One stored revision of a Drive file (`revisions.list`). Drive keeps prior revisions of uploaded files.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
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
    "description": "Resumable Drive upload in 256 KiB–aligned chunks with status-query resume after network suspend / transient failures (replaces the old single full-file PUT).",
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
    "exportType": "named",
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
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-drive-drivefetcherrors-ts-drivehttperror",
    "name": "DriveHttpError",
    "path": "src/shared/drive/driveFetchErrors.ts",
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
    "id": "src-shared-drive-drivefetcherrors-ts-formatdriverequestfailure",
    "name": "formatDriveRequestFailure",
    "path": "src/shared/drive/driveFetchErrors.ts",
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
    "id": "src-shared-drive-drivefetcherrors-ts-istransientdrivehttpstatus",
    "name": "isTransientDriveHttpStatus",
    "path": "src/shared/drive/driveFetchErrors.ts",
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
    "id": "src-shared-drive-drivefetcherrors-ts-summarizedriveapierrorbody",
    "name": "summarizeDriveApiErrorBody",
    "path": "src/shared/drive/driveFetchErrors.ts",
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
    "id": "src-shared-drive-driveresumableupload-ts-drive-resumable-chunk-bytes",
    "name": "DRIVE_RESUMABLE_CHUNK_BYTES",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "~5 MiB chunks — large enough to be efficient, small enough to survive tab suspend.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-drive-resumable-chunk-multiple-bytes",
    "name": "DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive requires non-final chunks to be multiples of 256 KiB.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-driveresumableuploadinit",
    "name": "DriveResumableUploadInit",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive requires non-final chunks to be multiples of 256 KiB.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-driveuploadhttpresult",
    "name": "DriveUploadHttpResult",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive requires non-final chunks to be multiples of 256 KiB.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-driveuploadprogress",
    "name": "DriveUploadProgress",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive requires non-final chunks to be multiples of 256 KiB.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-driveuploadxhrput",
    "name": "driveUploadXhrPut",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "PUT via XHR — required because browser `fetch()` treats HTTP 308 as a redirect. Drive's resumable protocol uses 308 Resume Incomplete (often with no Location), which makes `fetch` fail the request even when the chunk was accepted.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-isretryabledriveuploadnetworkerror",
    "name": "isRetryableDriveUploadNetworkError",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive requires non-final chunks to be multiples of 256 KiB.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-nextbyteafterdriverange",
    "name": "nextByteAfterDriveRange",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Next byte offset to upload after a Range header (0 when nothing received yet).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-parsedriveresumablerangeheader",
    "name": "parseDriveResumableRangeHeader",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parse `Range: bytes=0-N` from a 308 response; returns last received byte index, or -1 if none.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-querydriveresumableuploadstatus",
    "name": "queryDriveResumableUploadStatus",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Empty PUT to learn how many bytes Drive already has for this session.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-resolveoffsetafterchunk308",
    "name": "resolveOffsetAfterChunk308",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "After a successful chunk PUT that returned 308: prefer Drive's Range cursor. If Range is missing (CORS), assume the chunk we just sent was accepted — otherwise multi-chunk browser uploads stall forever on the first chunk.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-uploaddrivefileresumablechunked",
    "name": "uploadDriveFileResumableChunked",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Chunked Drive resumable upload with status-query resume after network suspend / transient errors. Session URI expiry (404/410) restarts the upload from byte 0 a limited number of times. Chunk PUTs use XHR (not fetch): browser fetch treats Drive's 308 Resume Incomplete as a redirect and fails multi-chunk uploads even when Drive accepted the bytes.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-waitfordocumentvisible",
    "name": "waitForDocumentVisible",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Wait until the document is visible (Chrome suspends network when the tab is hidden).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-driveresumableupload-ts-xhrtimeoutmsforbytes",
    "name": "xhrTimeoutMsForBytes",
    "path": "src/shared/drive/driveResumableUpload.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive requires non-final chunks to be multiples of 256 KiB.",
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
    "description": "Default for all portfolio backup apps (Stanza, Gesture, Scales, Zine Box).",
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
    "description": "Portfolio merge prompt policy (ADR 0020). - **`silent_union`** (default, only supported policy) — never block pull on divergence alone. Run row analysis (`labsPortfolioConflictAnalysis`); open review UI only when `needsReview.length > 0`. Undo snapshots are the safety net. - **`prompt_when_both_edited`** — **deprecated**. Coarse whole-library dialog; always returns false from (treated as `silent_union`). See `docs/LOCAL_FIRST_SYNC.md` § Divergence vs conflict and ADR 0020.",
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
    "description": "Whether to show the **coarse** whole-library conflict dialog. Always `false` under ADR 0020 — use from `labsPortfolioConflictAnalysis` for true row-level conflicts.",
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
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-islabsdriveportfolioprogressplaceholder",
    "name": "isLabsDrivePortfolioProgressPlaceholder",
    "path": "src/shared/drive/labsDrivePortfolioLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when `ensureLabsDrivePortfolioProgressLayout` created an empty stub (not app data yet).",
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
    "id": "src-shared-drive-labsdriveportfoliolayout-ts-labs-drive-app-folder-lyrefly",
    "name": "LABS_DRIVE_APP_FOLDER_LYREFLY",
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
    "id": "src-shared-drive-labsdrivesyncmessages-ts-labsdrivesyncmessageistransientsuccess",
    "name": "labsDriveSyncMessageIsTransientSuccess",
    "path": "src/shared/drive/labsDriveSyncMessages.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Success/info copy that belongs in a dismissible toast, not a persistent account-menu alert.",
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
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-analyzeportfoliorows",
    "name": "analyzePortfolioRows",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Build a full conflict analysis for two maps of entities keyed by stable id.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-analyzeportfoliorowsoptions",
    "name": "AnalyzePortfolioRowsOptions",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Milliseconds since epoch (portfolio apps) or comparable numeric clocks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-classifyportfoliorow",
    "name": "classifyPortfolioRow",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Classify a single entity by whether local and/or remote moved past the last sync baselines. Mirrors Encore's `classifyRow` (ISO clocks there; numeric ms here).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-labsportfolioclock",
    "name": "LabsPortfolioClock",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Milliseconds since epoch (portfolio apps) or comparable numeric clocks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-labsportfolioclockfromiso",
    "name": "labsPortfolioClockFromIso",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parse an ISO timestamp to ms; returns 0 when missing/invalid.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-labsportfolioconflictanalysis",
    "name": "LabsPortfolioConflictAnalysis",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Milliseconds since epoch (portfolio apps) or comparable numeric clocks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-labsportfolioconflictrow",
    "name": "LabsPortfolioConflictRow",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Milliseconds since epoch (portfolio apps) or comparable numeric clocks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-labsportfoliorowclock",
    "name": "LabsPortfolioRowClock",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Milliseconds since epoch (portfolio apps) or comparable numeric clocks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-labsportfoliorowconflictclass",
    "name": "LabsPortfolioRowConflictClass",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Milliseconds since epoch (portfolio apps) or comparable numeric clocks.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfolioconflictanalysis-ts-shouldblocksyncforconflict",
    "name": "shouldBlockSyncForConflict",
    "path": "src/shared/drive/labsPortfolioConflictAnalysis.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when the user must resolve at least one row before sync continues.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfoliodrivebackuptypes-ts-labsportfoliodrivebackupconfig",
    "name": "LabsPortfolioDriveBackupConfig",
    "path": "src/shared/drive/labsPortfolioDriveBackupTypes.ts",
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
    "id": "src-shared-drive-labsportfoliodrivebackuptypes-ts-labsportfoliodrivebackupconflictbase",
    "name": "LabsPortfolioDriveBackupConflictBase",
    "path": "src/shared/drive/labsPortfolioDriveBackupTypes.ts",
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
    "id": "src-shared-drive-labsportfoliodrivebackuptypes-ts-labsportfoliodrivesyncmeta",
    "name": "LabsPortfolioDriveSyncMeta",
    "path": "src/shared/drive/labsPortfolioDriveBackupTypes.ts",
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
    "id": "src-shared-drive-labsportfoliodrivehistoryrecovery-ts-assessportfoliohistoryrecovery",
    "name": "assessPortfolioHistoryRecovery",
    "path": "src/shared/drive/labsPortfolioDriveHistoryRecovery.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Find entity ids that appear in any historical snapshot but not in the current local payload. `listEntityIds` should return stable ids (comic id, pack id, stanza row id, etc.).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfoliodrivehistoryrecovery-ts-portfoliohistoryrecoveryentry",
    "name": "PortfolioHistoryRecoveryEntry",
    "path": "src/shared/drive/labsPortfolioDriveHistoryRecovery.ts",
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
    "id": "src-shared-drive-labsportfoliodrivehistoryrecovery-ts-portfolioprogressrevisionsnapshot",
    "name": "PortfolioProgressRevisionSnapshot",
    "path": "src/shared/drive/labsPortfolioDriveHistoryRecovery.ts",
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
    "id": "src-shared-drive-labsportfoliodrivehistoryrecovery-ts-scanportfolioprogressrevisions",
    "name": "scanPortfolioProgressRevisions",
    "path": "src/shared/drive/labsPortfolioDriveHistoryRecovery.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Scan Google Drive revision history for a portfolio app's `progress.json`. Skips revisions that fail `parseEnvelope` (corrupt / placeholder).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfoliodrivehistoryrecovery-ts-scanportfolioprogressrevisionsresult",
    "name": "ScanPortfolioProgressRevisionsResult",
    "path": "src/shared/drive/labsPortfolioDriveHistoryRecovery.ts",
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
    "id": "src-shared-drive-labsportfoliodrivetombstones-ts-labsportfoliotombstone",
    "name": "LabsPortfolioTombstone",
    "path": "src/shared/drive/labsPortfolioDriveTombstones.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generic tombstone list helpers for portfolio Drive apps (union by id, cap, newest wins).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfoliodrivetombstones-ts-mergeportfoliotombstonelists",
    "name": "mergePortfolioTombstoneLists",
    "path": "src/shared/drive/labsPortfolioDriveTombstones.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generic tombstone list helpers for portfolio Drive apps (union by id, cap, newest wins).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfoliodrivetombstones-ts-normalizeportfoliotombstones",
    "name": "normalizePortfolioTombstones",
    "path": "src/shared/drive/labsPortfolioDriveTombstones.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generic tombstone list helpers for portfolio Drive apps (union by id, cap, newest wins).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-labsportfoliodrivetombstones-ts-portfoliotombstoneidset",
    "name": "portfolioTombstoneIdSet",
    "path": "src/shared/drive/labsPortfolioDriveTombstones.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Generic tombstone list helpers for portfolio Drive apps (union by id, cap, newest wins).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-drive-uselabsdriveportfolioautosync-ts-labsdriveportfoliolocalchangeevent",
    "name": "LabsDrivePortfolioLocalChangeEvent",
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
    "id": "src-shared-drive-uselabsportfoliohistoryrecovery-ts-uselabsportfoliohistoryrecovery",
    "name": "useLabsPortfolioHistoryRecovery",
    "path": "src/shared/drive/useLabsPortfolioHistoryRecovery.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drive `progress.json` revision scan + restore for portfolio apps that use a custom backup hook (Stanza, Gesture). Factory apps configure the same via `historyRecovery` on `createLabsPortfolioDriveBackup`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-drive-uselabsportfoliohistoryrecovery-ts-uselabsportfoliohistoryrecoveryoptions",
    "name": "UseLabsPortfolioHistoryRecoveryOptions",
    "path": "src/shared/drive/useLabsPortfolioHistoryRecovery.ts",
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
    "id": "src-shared-google-labsdrivebackupuitypes-ts-labsdrivehistoryrecoveryuiprops",
    "name": "LabsDriveHistoryRecoveryUiProps",
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
    "id": "src-shared-google-labsdrivesynctoast-tsx-labsdrivesynctoast",
    "name": "LabsDriveSyncToast",
    "path": "src/shared/google/LabsDriveSyncToast.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Transient Drive sync success toast (portfolio apps).",
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
    "id": "src-shared-google-labsportfolioconflictreviewdialog-tsx-labsportfolioconflictchoice",
    "name": "LabsPortfolioConflictChoice",
    "path": "src/shared/google/LabsPortfolioConflictReviewDialog.tsx",
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
    "id": "src-shared-google-labsportfolioconflictreviewdialog-tsx-labsportfolioconflictreviewdialog",
    "name": "LabsPortfolioConflictReviewDialog",
    "path": "src/shared/google/LabsPortfolioConflictReviewDialog.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Per-row conflict review for portfolio Drive apps (ADR 0020). Only `needsReview` rows are listed; non-overlapping edits auto-merge silently.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "default",
    "demoId": null
  },
  {
    "id": "src-shared-google-labsportfolioconflictreviewdialog-tsx-labsportfolioconflictreviewdialogprops",
    "name": "LabsPortfolioConflictReviewDialogProps",
    "path": "src/shared/google/LabsPortfolioConflictReviewDialog.tsx",
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
    "id": "src-shared-google-labsportfoliodrivehistoryrecoverdialog-tsx-labsportfoliodrivehistoryrecoverdialog",
    "name": "LabsPortfolioDriveHistoryRecoverDialog",
    "path": "src/shared/google/LabsPortfolioDriveHistoryRecoverDialog.tsx",
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
    "id": "src-shared-google-labsportfoliodrivehistoryrecoverdialog-tsx-labsportfoliodrivehistoryrecoverdialogprops",
    "name": "LabsPortfolioDriveHistoryRecoverDialogProps",
    "path": "src/shared/google/LabsPortfolioDriveHistoryRecoverDialog.tsx",
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
    "id": "src-shared-google-uselabsdrivesynctoastmessage-ts-uselabsdrivesynctoastmessage",
    "name": "useLabsDriveSyncToastMessage",
    "path": "src/shared/google/useLabsDriveSyncToastMessage.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Routes transient Drive sync success copy out of the account menu and into a dismissible toast.",
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
    "id": "src-shared-jobs-labsblockingjobitemprogress-ts-blockingjobitemprogress",
    "name": "BlockingJobItemProgress",
    "path": "src/shared/jobs/labsBlockingJobItemProgress.ts",
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
    "id": "src-shared-jobs-labsblockingjobitemprogress-ts-formatblockingjobitemprogresscaption",
    "name": "formatBlockingJobItemProgressCaption",
    "path": "src/shared/jobs/labsBlockingJobItemProgress.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Human-readable counts for snackbar caption under the progress bar.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-jobs-labsblockingjobitemprogress-ts-reportblockingjobitemprogress",
    "name": "reportBlockingJobItemProgress",
    "path": "src/shared/jobs/labsBlockingJobItemProgress.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Update blocking-job label + determinate bar for counted work (imports, uploads, batches).",
    "tags": [],
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
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-drumskeyboardshortcutsections",
    "name": "drumsKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Drums — mirrors existing in-app shortcuts.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-encorekeyboardshortcutsections",
    "name": "encoreKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Encore — undo/redo via LabsUndoProvider; originals chord paint shortcuts.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-keyboard-shortcuts-audit-apps",
    "name": "KEYBOARD_SHORTCUTS_AUDIT_APPS",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Audit note: add app-specific sections here as shortcuts are documented.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-keyboardshortcutsauditstatus",
    "name": "keyboardShortcutsAuditStatus",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared undo / redo entries for apps using .",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-labscommoneditingshortcutsection",
    "name": "labsCommonEditingShortcutSection",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared undo / redo entries for apps using .",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-labscommonhelpshortcutsection",
    "name": "labsCommonHelpShortcutSection",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared undo / redo entries for apps using .",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-labskeyboardshortcutshelpentry",
    "name": "labsKeyboardShortcutsHelpEntry",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared undo / redo entries for apps using .",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-labsundoredoshortcutentries",
    "name": "labsUndoRedoShortcutEntries",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Shared undo / redo entries for apps using .",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-sightkeyboardshortcutsections",
    "name": "sightKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Documented Color Sight practice shortcuts (see PracticePhase keyboard handlers).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-stanzakeyboardshortcutsections",
    "name": "stanzaKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Stanza — shared undo stack plus section editing shortcuts.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-commonshortcuts-ts-wordskeyboardshortcutsections",
    "name": "wordsKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/commonShortcuts.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Words in Rhythm — documented shortcuts (hotkey-only undo/redo via shared provider).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-drumskeyboardshortcutsections",
    "name": "drumsKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-encorekeyboardshortcutsections",
    "name": "encoreKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-formatshortcutkeytoken",
    "name": "formatShortcutKeyToken",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-iskeyboardshortcutshelpevent",
    "name": "isKeyboardShortcutsHelpEvent",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-keyboard-shortcuts-audit-apps",
    "name": "KEYBOARD_SHORTCUTS_AUDIT_APPS",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-keyboardshortcutsauditstatus",
    "name": "keyboardShortcutsAuditStatus",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labscommoneditingshortcutsection",
    "name": "labsCommonEditingShortcutSection",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labscommonhelpshortcutsection",
    "name": "labsCommonHelpShortcutSection",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labsismacplatform",
    "name": "labsIsMacPlatform",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labskeyboardshortcutentry",
    "name": "LabsKeyboardShortcutEntry",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labskeyboardshortcutsdialog",
    "name": "LabsKeyboardShortcutsDialog",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labskeyboardshortcutsection",
    "name": "LabsKeyboardShortcutSection",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labskeyboardshortcutshelpentry",
    "name": "labsKeyboardShortcutsHelpEntry",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labskeyboardshortcutshost",
    "name": "LabsKeyboardShortcutsHost",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labskeyboardshortcutstheme",
    "name": "LabsKeyboardShortcutsTheme",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labsmodifierkeylabel",
    "name": "labsModifierKeyLabel",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-labsundoredoshortcutentries",
    "name": "labsUndoRedoShortcutEntries",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-sightkeyboardshortcutsections",
    "name": "sightKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-stanzakeyboardshortcutsections",
    "name": "stanzaKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-uselabskeyboardshortcutshelp",
    "name": "useLabsKeyboardShortcutsHelp",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-uselabskeyboardshortcutsopen",
    "name": "useLabsKeyboardShortcutsOpen",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-index-ts-wordskeyboardshortcutsections",
    "name": "wordsKeyboardShortcutSections",
    "path": "src/shared/keyboardShortcuts/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`). ## Agent checklist - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's `*KeyboardShortcutSections()` helper (or add a new helper here) and wire + . - Reuse when the app mounts . - Theme the dialog with `theme=\"words\" | \"drums\" | \"encore\" | …` so kbd chips match the app. - Update when an app moves from partial → documented.",
    "tags": [],
    "appsUsing": [
      "drums",
      "words"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutlabels-ts-formatshortcutkeytoken",
    "name": "formatShortcutKeyToken",
    "path": "src/shared/keyboardShortcuts/labsKeyboardShortcutLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Material Design–style display label for a shortcut token.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutlabels-ts-iskeyboardshortcutshelpevent",
    "name": "isKeyboardShortcutsHelpEvent",
    "path": "src/shared/keyboardShortcuts/labsKeyboardShortcutLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Returns true when the event matches the keyboard shortcuts help chord.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutlabels-ts-labsismacplatform",
    "name": "labsIsMacPlatform",
    "path": "src/shared/keyboardShortcuts/labsKeyboardShortcutLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Platform modifier label for keyboard help (`Cmd` on macOS, `Ctrl` elsewhere).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutlabels-ts-labsmodifierkeylabel",
    "name": "labsModifierKeyLabel",
    "path": "src/shared/keyboardShortcuts/labsKeyboardShortcutLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Platform modifier label for keyboard help (`Cmd` on macOS, `Ctrl` elsewhere).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutsdialog-tsx-labskeyboardshortcutsdialog",
    "name": "LabsKeyboardShortcutsDialog",
    "path": "src/shared/keyboardShortcuts/LabsKeyboardShortcutsDialog.tsx",
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
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutsdialog-tsx-labskeyboardshortcutsdialogprops",
    "name": "LabsKeyboardShortcutsDialogProps",
    "path": "src/shared/keyboardShortcuts/LabsKeyboardShortcutsDialog.tsx",
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
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutshost-tsx-labskeyboardshortcutshost",
    "name": "LabsKeyboardShortcutsHost",
    "path": "src/shared/keyboardShortcuts/LabsKeyboardShortcutsHost.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mount once per app shell — wires Ctrl/Cmd+? (and ? when not typing) plus optional menu triggers.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutshost-tsx-labskeyboardshortcutshostprops",
    "name": "LabsKeyboardShortcutsHostProps",
    "path": "src/shared/keyboardShortcuts/LabsKeyboardShortcutsHost.tsx",
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
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutshostcontext-ts-labskeyboardshortcutshostcontext",
    "name": "LabsKeyboardShortcutsHostContext",
    "path": "src/shared/keyboardShortcuts/LabsKeyboardShortcutsHostContext.ts",
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
    "id": "src-shared-keyboardshortcuts-labskeyboardshortcutshostcontext-ts-labskeyboardshortcutshostcontextvalue",
    "name": "LabsKeyboardShortcutsHostContextValue",
    "path": "src/shared/keyboardShortcuts/LabsKeyboardShortcutsHostContext.ts",
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
    "id": "src-shared-keyboardshortcuts-types-ts-labskeyboardshortcutentry",
    "name": "LabsKeyboardShortcutEntry",
    "path": "src/shared/keyboardShortcuts/types.ts",
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
    "id": "src-shared-keyboardshortcuts-types-ts-labskeyboardshortcutsection",
    "name": "LabsKeyboardShortcutSection",
    "path": "src/shared/keyboardShortcuts/types.ts",
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
    "id": "src-shared-keyboardshortcuts-types-ts-labskeyboardshortcutstheme",
    "name": "LabsKeyboardShortcutsTheme",
    "path": "src/shared/keyboardShortcuts/types.ts",
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
    "id": "src-shared-keyboardshortcuts-uselabskeyboardshortcutshelp-ts-uselabskeyboardshortcutshelp",
    "name": "useLabsKeyboardShortcutsHelp",
    "path": "src/shared/keyboardShortcuts/useLabsKeyboardShortcutsHelp.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Opens keyboard shortcuts help on Ctrl/Cmd + ? (and Shift+/ on US layouts). Also opens on ? alone when focus is not in a text field (GitHub-style).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-keyboardshortcuts-uselabskeyboardshortcutsopen-ts-uselabskeyboardshortcutsopen",
    "name": "useLabsKeyboardShortcutsOpen",
    "path": "src/shared/keyboardShortcuts/useLabsKeyboardShortcutsOpen.ts",
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
    "id": "src-shared-music-chordchartprintexport-ts-buildchartprintexportoptions",
    "name": "buildChartPrintExportOptions",
    "path": "src/shared/music/chordChartPrintExport.ts",
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
    "id": "src-shared-music-chordchartprintexport-ts-buildchartprintheaderhtml",
    "name": "buildChartPrintHeaderHtml",
    "path": "src/shared/music/chordChartPrintExport.ts",
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
    "id": "src-shared-music-chordchartprintexport-ts-chartprintexportoptions",
    "name": "ChartPrintExportOptions",
    "path": "src/shared/music/chordChartPrintExport.ts",
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
    "id": "src-shared-music-chordchartprintexport-ts-isasciichartchordline",
    "name": "isAsciiChartChordLine",
    "path": "src/shared/music/chordChartPrintExport.ts",
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
    "exportType": "named",
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
    "id": "src-shared-music-chordcharttwocolumnexport-ts-boldasciichartexportspans",
    "name": "boldAsciiChartExportSpans",
    "path": "src/shared/music/chordChartTwoColumnExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "UTF-16 half-open ranges for section headers and chord-only lines (Google Docs bold).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
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
    "id": "src-shared-music-chordcharttwocolumnexport-ts-isasciichartchordline",
    "name": "isAsciiChartChordLine",
    "path": "src/shared/music/chordChartTwoColumnExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "True when every whitespace-separated token on the line is a chord symbol.",
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
    "id": "src-shared-music-chordpro-applysectionprogression-ts-applyprogressiontochartsection",
    "name": "applyProgressionToChartSection",
    "path": "src/shared/music/chordPro/applySectionProgression.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Map one chord per lyric line in a section, looping the progression as needed. Each line gets a single chord at the first word (column 0 when the line is empty).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-applysectionprogression-ts-applysectionprogressionresult",
    "name": "ApplySectionProgressionResult",
    "path": "src/shared/music/chordPro/applySectionProgression.ts",
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
    "id": "src-shared-music-chordpro-applysectionprogression-ts-countsectionprogressionlines",
    "name": "countSectionProgressionLines",
    "path": "src/shared/music/chordPro/applySectionProgression.ts",
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
    "id": "src-shared-music-chordpro-applysectionprogression-ts-linereceivessectionprogression",
    "name": "lineReceivesSectionProgression",
    "path": "src/shared/music/chordPro/applySectionProgression.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Lines that receive one chord when applying a section progression (lyric or chord-only).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
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
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-chartlayoutsectionplayablesteps",
    "name": "chartLayoutSectionPlayableSteps",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Playable steps for one section — used by section loop playback.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-chartlayouttoplayableplaybacksteps",
    "name": "chartLayoutToPlayablePlaybackSteps",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Playback steps with parseable chord symbols — matches `useChartChordPlayback`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-estimatechartplaybackdurationms",
    "name": "estimateChartPlaybackDurationMs",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Total chord-playback duration in ms at the given tempo.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-estimatechartplaybackmeasurecount",
    "name": "estimateChartPlaybackMeasureCount",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Total measures for duration estimate at the given layout.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-estimatemeasuresforline",
    "name": "estimateMeasuresForLine",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Heuristic measure count for duration display (not necessarily identical to paint playback). Short / chord-only lines often get one measure in real performance; longer lines with two chord changes use two.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-formatchartplaybackduration",
    "name": "formatChartPlaybackDuration",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Format playback duration as `m:ss` (rounded to whole seconds).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chartplaybacksequence-ts-sectionhasplayablechartsteps",
    "name": "sectionHasPlayableChartSteps",
    "path": "src/shared/music/chordPro/chartPlaybackSequence.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Assume 4/4: each lyric line spans two measures; one chord change per measure.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-music-chordpro-chordchartlayout-ts-linetextsimilarity",
    "name": "lineTextSimilarity",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "named",
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
    "id": "src-shared-music-chordpro-chordchartlayout-ts-matchwritelinestoprevious",
    "name": "matchWriteLinesToPrevious",
    "path": "src/shared/music/chordPro/chordChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "named",
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
    "description": "Structured chord chart layout (ChordPro ↔ sections/lines/markers). - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start). - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`. - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import. - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index. Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "named",
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
    "id": "src-shared-music-chordpro-chordlyricreconcile-ts-alignwordtokeneditscript",
    "name": "alignWordTokenEditScript",
    "path": "src/shared/music/chordPro/chordLyricReconcile.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Word-level edit script (Levenshtein backtrace).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordlyricreconcile-ts-linetextsimilarity",
    "name": "lineTextSimilarity",
    "path": "src/shared/music/chordPro/chordLyricReconcile.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Fraction of words preserved or replaced in place (not deleted).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordlyricreconcile-ts-matchwritelinestoprevious",
    "name": "matchWriteLinesToPrevious",
    "path": "src/shared/music/chordPro/chordLyricReconcile.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Pair write-mode lyric lines with previous section lines for chord carry-over.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordlyricreconcile-ts-reconcilechordsaftertextchange",
    "name": "reconcileChordsAfterTextChange",
    "path": "src/shared/music/chordPro/chordLyricReconcile.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Keep chord markers on the best matching lyric words after a line edit. Uses word-level alignment so synonym swaps and typos keep chords on the same slot.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordpro-chordlyricreconcile-ts-wordalignop",
    "name": "WordAlignOp",
    "path": "src/shared/music/chordPro/chordLyricReconcile.ts",
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
    "id": "src-shared-music-chordpro-chordprotext-ts-section-header-starts-on-annotation-re",
    "name": "SECTION_HEADER_STARTS_ON_ANNOTATION_RE",
    "path": "src/shared/music/chordPro/chordProText.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Optional trailing key hint on pasted section headers, e.g. `[Verse 1] - Starts on G3`.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
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
    "id": "src-shared-music-chordpro-chordprotext-ts-stripsectionheaderannotation",
    "name": "stripSectionHeaderAnnotation",
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
    "id": "src-shared-music-chordpro-georgiacoastpaste-fixture-ts-georgia-coast-paste",
    "name": "GEORGIA_COAST_PASTE",
    "path": "src/shared/music/chordPro/georgiaCoastPaste.fixture.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Chord-over-lyrics paste with annotated section headers (Starts on G3, etc.).",
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
    "description": "No JSDoc summary provided.",
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
    "id": "src-shared-music-chordprogressionseparators-ts-chord-progression-separator-examples",
    "name": "CHORD_PROGRESSION_SEPARATOR_EXAMPLES",
    "path": "src/shared/music/chordProgressionSeparators.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Human-readable separator examples for placeholders and errors.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressionseparators-ts-joinprogressiontokens",
    "name": "joinProgressionTokens",
    "path": "src/shared/music/chordProgressionSeparators.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Canonicalize separators to en-dash for display/export.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressionseparators-ts-normalizeprogressionseparators",
    "name": "normalizeProgressionSeparators",
    "path": "src/shared/music/chordProgressionSeparators.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Normalize arbitrary separators to en-dash (for preset lookup / fuzzy match).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressionseparators-ts-splitprogressioninput",
    "name": "splitProgressionInput",
    "path": "src/shared/music/chordProgressionSeparators.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Split a progression string into chord or roman tokens.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-chord-progression-separator-examples",
    "name": "CHORD_PROGRESSION_SEPARATOR_EXAMPLES",
    "path": "src/shared/music/chordProgressionText.ts",
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
    "exportType": "named",
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
    "id": "src-shared-music-chordprogressiontext-ts-joinprogressiontokens",
    "name": "joinProgressionTokens",
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
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordprogressiontext-ts-normalizeprogressionseparators",
    "name": "normalizeProgressionSeparators",
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
    "exportType": "named",
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
    "id": "src-shared-music-chordprogressiontext-ts-splitprogressioninput",
    "name": "splitProgressionInput",
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
    "exportType": "named",
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
      "piano",
      "words"
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
      "piano",
      "words"
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
    "id": "src-shared-music-chordsymboltokenpattern-ts-chord-symbol-token-global-re",
    "name": "CHORD_SYMBOL_TOKEN_GLOBAL_RE",
    "path": "src/shared/music/chordSymbolTokenPattern.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Global — finds chord tokens in a chord-only line.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordsymboltokenpattern-ts-chord-symbol-token-re",
    "name": "CHORD_SYMBOL_TOKEN_RE",
    "path": "src/shared/music/chordSymbolTokenPattern.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Anchored — validates a single chord token.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordsymboltokenpattern-ts-chord-symbol-token-re-i",
    "name": "CHORD_SYMBOL_TOKEN_RE_I",
    "path": "src/shared/music/chordSymbolTokenPattern.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Case-insensitive anchored variant (two-column export).",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
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
    "appsUsing": [
      "words"
    ],
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
      "piano",
      "words"
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
      "piano",
      "words"
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
      "piano",
      "words"
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
      "piano",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-chordtheory-ts-progressiontochordsinsongkey",
    "name": "progressionToChordsInSongKey",
    "path": "src/shared/music/chordTheory.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Resolve roman numerals in a full song key string (root + major/minor).",
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
      "piano",
      "words"
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
      "piano",
      "words"
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
    "id": "src-shared-music-exporttypes-ts-exportscoresheetrenderrequest",
    "name": "ExportScoreSheetRenderRequest",
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
    "id": "src-shared-music-exporttypes-ts-isscoreexportformat",
    "name": "isScoreExportFormat",
    "path": "src/shared/music/exportTypes.ts",
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
      "ui",
      "words"
    ],
    "exportType": "function",
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
    "id": "src-shared-music-lyrics-lyricstochartlayout-ts-chartdocumenttochartlayout",
    "name": "chartDocumentToChartLayout",
    "path": "src/shared/music/lyrics/lyricsToChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "ChordPro when present; otherwise infer sections from plain lyric paragraphs.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyrics-lyricstochartlayout-ts-chartlayoutfromplainlyrics",
    "name": "chartLayoutFromPlainLyrics",
    "path": "src/shared/music/lyrics/lyricsToChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Infer multi-section chart layout from plain lyrics (paragraph breaks, chorus repeats).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyrics-lyricstochartlayout-ts-parsedlyricsectionstochartlayout",
    "name": "parsedLyricSectionsToChartLayout",
    "path": "src/shared/music/lyrics/lyricsToChartLayout.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Turn Words-style section drafts into Encore chart layout (no chords).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyrics-pastedlyricsimport-ts-importplainlyricsfromclipboard",
    "name": "importPlainLyricsFromClipboard",
    "path": "src/shared/music/lyrics/pastedLyricsImport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Parse pasted plain lyrics into a structured chart (sections + inferred chorus/bridge).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyrics-pastedlyricsimport-ts-lookslikeplainlyricspaste",
    "name": "looksLikePlainLyricsPaste",
    "path": "src/shared/music/lyrics/pastedLyricsImport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Plain lyrics with paragraph breaks (caller should skip chord-chart pastes first).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-lyrics-pastedlyricsimport-ts-pastedlyricsimportsummary",
    "name": "PastedLyricsImportSummary",
    "path": "src/shared/music/lyrics/pastedLyricsImport.ts",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords",
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
      "chords"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-resolvesectionplaybacksettings-ts-resolvesectionplaybacksettings",
    "name": "resolveSectionPlaybackSettings",
    "path": "src/shared/music/resolveSectionPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Per-section playback override — unset fields inherit from song/session defaults.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-resolvesectionplaybacksettings-ts-sectionplaybackoverride",
    "name": "SectionPlaybackOverride",
    "path": "src/shared/music/resolveSectionPlaybackSettings.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Per-section playback override — unset fields inherit from song/session defaults.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-music-resolvesectionplaybacksettings-ts-sectionusescustomplayback",
    "name": "sectionUsesCustomPlayback",
    "path": "src/shared/music/resolveSectionPlaybackSettings.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Per-section playback override — unset fields inherit from song/session defaults.",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-music-songkeyformat-ts-formatrelativeparallelkey",
    "name": "formatRelativeParallelKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Format the relative major/minor partner, preserving the caller's short/long style.",
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
    "id": "src-shared-music-songkeyformat-ts-formatsongkey",
    "name": "formatSongKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Song key with optional mode (`C`, `Cm`, `D major`, `D minor`, …).",
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
    "id": "src-shared-music-songkeyformat-ts-formatsongkeybuttonlabel",
    "name": "formatSongKeyButtonLabel",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Compact label for toolbar buttons (`D maj`, `D min`).",
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
    "id": "src-shared-music-songkeyformat-ts-formatsongkeydisplay",
    "name": "formatSongKeyDisplay",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Human-readable key label for chips and summaries.",
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
    "id": "src-shared-music-songkeyformat-ts-isvalidsongkey",
    "name": "isValidSongKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Song key with optional mode (`C`, `Cm`, `D major`, `D minor`, …).",
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
    "id": "src-shared-music-songkeyformat-ts-parsesongkey",
    "name": "parseSongKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Song key with optional mode (`C`, `Cm`, `D major`, `D minor`, …).",
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
    "id": "src-shared-music-songkeyformat-ts-randomsongkey",
    "name": "randomSongKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Song key with optional mode (`C`, `Cm`, `D major`, `D minor`, …).",
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
    "id": "src-shared-music-songkeyformat-ts-relativeparallelkey",
    "name": "relativeParallelKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Relative major/minor partner (same key signature, different tonic).",
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
    "id": "src-shared-music-songkeyformat-ts-songkey",
    "name": "SongKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "music-core",
    "description": "Song key with optional mode (`C`, `Cm`, `D major`, `D minor`, …).",
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
    "id": "src-shared-music-songkeyformat-ts-transposesongkey",
    "name": "transposeSongKey",
    "path": "src/shared/music/songKeyFormat.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Transpose a song key by semitones while preserving major/minor quality.",
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
    "id": "src-shared-music-timesignaturepresets-ts-common-time-signature-presets",
    "name": "COMMON_TIME_SIGNATURE_PRESETS",
    "path": "src/shared/music/timeSignaturePresets.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Common meters — mirrors Drums / Count presets; asymmetric entries include default groupings.",
    "tags": [
      "music",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-music-timesignaturepresets-ts-default-time-signature",
    "name": "DEFAULT_TIME_SIGNATURE",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-formattimesignaturedisplay",
    "name": "formatTimeSignatureDisplay",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-formattimesignatureforwordsurl",
    "name": "formatTimeSignatureForWordsUrl",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-ispresettimesignature",
    "name": "isPresetTimeSignature",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-normalizetimesignature",
    "name": "normalizeTimeSignature",
    "path": "src/shared/music/timeSignaturePresets.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "Coerce partial / legacy rows to a valid meter (defaults to 4/4).",
    "tags": [
      "music"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-music-timesignaturepresets-ts-time-signature-denominators",
    "name": "TIME_SIGNATURE_DENOMINATORS",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-time-signature-numerator-max",
    "name": "TIME_SIGNATURE_NUMERATOR_MAX",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-time-signature-numerator-min",
    "name": "TIME_SIGNATURE_NUMERATOR_MIN",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-timesignaturegroupingkey",
    "name": "timeSignatureGroupingKey",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-timesignaturepreset",
    "name": "TimeSignaturePreset",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-music-timesignaturepresets-ts-timesignaturesequal",
    "name": "timeSignaturesEqual",
    "path": "src/shared/music/timeSignaturePresets.ts",
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
    "id": "src-shared-navigation-spalinkclick-ts-handlespalinkclick",
    "name": "handleSpaLinkClick",
    "path": "src/shared/navigation/spaLinkClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Attach to `<a href>` onClick: modifier/middle clicks use the browser; plain click prevents reload.",
    "tags": [],
    "appsUsing": [
      "drums",
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-navigation-spalinkclick-ts-handlesparowactivate",
    "name": "handleSpaRowActivate",
    "path": "src/shared/navigation/spaLinkClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Table/card row activation: open href in a new tab on modifier, else run onNavigate.",
    "tags": [],
    "appsUsing": [
      "drums",
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-navigation-spalinkclick-ts-ismodifiedornonprimaryclick",
    "name": "isModifiedOrNonPrimaryClick",
    "path": "src/shared/navigation/spaLinkClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Helpers for in-app links that must behave like normal browser links: modifier+click and middle-click open a new tab/window, href is copyable, and a plain primary click uses SPA navigation without a full reload.",
    "tags": [],
    "appsUsing": [
      "drums",
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-navigation-spalinkclick-ts-openapplinkinbackgroundtab",
    "name": "openAppLinkInBackgroundTab",
    "path": "src/shared/navigation/spaLinkClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Helpers for in-app links that must behave like normal browser links: modifier+click and middle-click open a new tab/window, href is copyable, and a plain primary click uses SPA navigation without a full reload.",
    "tags": [],
    "appsUsing": [
      "drums",
      "ui"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-navigation-spalinkclick-ts-resolveapplinkurl",
    "name": "resolveAppLinkUrl",
    "path": "src/shared/navigation/spaLinkClick.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve a hash, query, or path href against the current page for `window.open`.",
    "tags": [],
    "appsUsing": [
      "drums",
      "ui"
    ],
    "exportType": "function",
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
    "description": "Style configuration for the drum notation renderer. Note ink (stems, heads, barlines) uses `inkColor`; staff lines use `staffLineColor`.",
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
    "description": "Style configuration for the drum notation renderer. Note ink (stems, heads, barlines) uses `inkColor`; staff lines use `staffLineColor`.",
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
    "id": "src-shared-notation-drumsymbols-ts-drawabledrumsound",
    "name": "DrawableDrumSound",
    "path": "src/shared/notation/drumSymbols.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SVG path data for drum symbols",
    "tags": [
      "notation",
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
    "id": "src-shared-notation-drumsymbols-ts-drawdrumssymbollegendoncanvas",
    "name": "drawDrumsSymbolLegendOnCanvas",
    "path": "src/shared/notation/drumSymbols.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SVG path data for drum symbols",
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
    "id": "src-shared-notation-drumsymbols-ts-drawdrumsymboloncanvas",
    "name": "drawDrumSymbolOnCanvas",
    "path": "src/shared/notation/drumSymbols.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SVG path data for drum symbols",
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
    "id": "src-shared-notation-drumsymbols-ts-drums-symbol-legend",
    "name": "DRUMS_SYMBOL_LEGEND",
    "path": "src/shared/notation/drumSymbols.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "SVG path data for drum symbols",
    "tags": [
      "notation",
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
    "id": "src-shared-notation-metronomedotlayout-ts-buildsixteenthxmap",
    "name": "buildSixteenthXMap",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Map every sixteenth slot in the measure to X by interpolating between note onsets (and measure edges). Subdivisions land evenly in **time** between visible attacks.",
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
    "id": "src-shared-notation-metronomedotlayout-ts-layoutmetronomedotsinmeasure",
    "name": "layoutMetronomeDotsInMeasure",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resolve X under notehead centers; subdivisions interpolate between onsets in time.",
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
    "id": "src-shared-notation-metronomedotlayout-ts-metronome-dot-nudge-px",
    "name": "METRONOME_DOT_NUDGE_PX",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Nudge right when `headCenterX` is the VexFlow stem origin (Darbuka editor).",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-metronomedotlayout-ts-metronomedotplacement",
    "name": "MetronomeDotPlacement",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Nudge right when `headCenterX` is the VexFlow stem origin (Darbuka editor).",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-notation-metronomedotlayout-ts-metronomelayoutnoteanchor",
    "name": "MetronomeLayoutNoteAnchor",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Nudge right when `headCenterX` is the VexFlow stem origin (Darbuka editor).",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-notation-metronomedotlayout-ts-min-dot-edge-gap-px",
    "name": "MIN_DOT_EDGE_GAP_PX",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimum gap between dot edges when circles would otherwise overlap.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-metronomedotlayout-ts-noteheadcenterx",
    "name": "noteheadCenterX",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Nudge right when `headCenterX` is the VexFlow stem origin (Darbuka editor).",
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
    "id": "src-shared-notation-metronomedotlayout-ts-resolvemetronomedotxinmeasure",
    "name": "resolveMetronomeDotXInMeasure",
    "path": "src/shared/notation/metronomeDotLayout.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "X for one grid slot — note onsets snap to noteheads; others interpolate between anchors.",
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-notation-scoredisplayhelpers-ts-unionmetronomeglyphboundsvexflow",
    "name": "unionMetronomeGlyphBoundsVexFlow",
    "path": "src/shared/notation/scoreDisplayHelpers.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Notehead or rest glyph bounds for metronome dot alignment (after `draw()`).",
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "id": "src-shared-notation-vexflowfontexport-ts-buildvexflowsvgfontstyles",
    "name": "buildVexFlowSvgFontStyles",
    "path": "src/shared/notation/vexFlowFontExport.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "VexFlow SMuFL fonts used for notation glyphs rendered as SVG `<text>`.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-vexflowfontexport-ts-ensurevexflowfontsloaded",
    "name": "ensureVexFlowFontsLoaded",
    "path": "src/shared/notation/vexFlowFontExport.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "VexFlow SMuFL fonts used for notation glyphs rendered as SVG `<text>`.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-vexflowfontexport-ts-fetchvexflowfontdataurl",
    "name": "fetchVexFlowFontDataUrl",
    "path": "src/shared/notation/vexFlowFontExport.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "VexFlow SMuFL fonts used for notation glyphs rendered as SVG `<text>`.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-vexflowfontexport-ts-injectsvgstyle",
    "name": "injectSvgStyle",
    "path": "src/shared/notation/vexFlowFontExport.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "VexFlow SMuFL fonts used for notation glyphs rendered as SVG `<text>`.",
    "tags": [
      "notation"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-notation-vexflowfontexport-ts-vexflow-notation-fonts",
    "name": "VEXFLOW_NOTATION_FONTS",
    "path": "src/shared/notation/vexFlowFontExport.ts",
    "kind": "component",
    "stability": "stable",
    "owner": "shared-core",
    "description": "VexFlow SMuFL fonts used for notation glyphs rendered as SVG `<text>`.",
    "tags": [
      "notation",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-palette-applypalettetomockup-ts-applypalettetomockup",
    "name": "applyPaletteToMockup",
    "path": "src/shared/palette/applyPaletteToMockup.ts",
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
    "id": "src-shared-palette-applypalettetomockup-ts-mockuppaletteapplyresult",
    "name": "MockupPaletteApplyResult",
    "path": "src/shared/palette/applyPaletteToMockup.ts",
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
    "id": "src-shared-palette-applypalettetomockup-ts-mockuptintspec",
    "name": "MockupTintSpec",
    "path": "src/shared/palette/applyPaletteToMockup.ts",
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
    "id": "src-shared-palette-applypalettetomockup-ts-mockuptinttarget",
    "name": "MockupTintTarget",
    "path": "src/shared/palette/applyPaletteToMockup.ts",
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
    "id": "src-shared-palette-exportpalette-ts-exportpaletteascssvars",
    "name": "exportPaletteAsCssVars",
    "path": "src/shared/palette/exportPalette.ts",
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
    "id": "src-shared-palette-exportpalette-ts-exportpaletteashexrow",
    "name": "exportPaletteAsHexRow",
    "path": "src/shared/palette/exportPalette.ts",
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
    "id": "src-shared-palette-exportpalette-ts-exportpaletteasjson",
    "name": "exportPaletteAsJson",
    "path": "src/shared/palette/exportPalette.ts",
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
    "id": "src-shared-palette-index-ts-applypalettetomockup",
    "name": "applyPaletteToMockup",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-comicpalette",
    "name": "ComicPalette",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-createpalettefromhexes",
    "name": "createPaletteFromHexes",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-exportpaletteascssvars",
    "name": "exportPaletteAsCssVars",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-exportpaletteashexrow",
    "name": "exportPaletteAsHexRow",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-exportpaletteasjson",
    "name": "exportPaletteAsJson",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-mockuppaletteapplyresult",
    "name": "MockupPaletteApplyResult",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-paletteswatch",
    "name": "PaletteSwatch",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-parsecoolorsurl",
    "name": "parseCoolorsUrl",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-parsehexlistpaste",
    "name": "parseHexListPaste",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-index-ts-parsepalettepaste",
    "name": "parsePalettePaste",
    "path": "src/shared/palette/index.ts",
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
    "id": "src-shared-palette-parsecoolorsurl-ts-parsecoolorsurl",
    "name": "parseCoolorsUrl",
    "path": "src/shared/palette/parseCoolorsUrl.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parse Coolors palette URL or path like `cdb4db-ffc8dd-ffafcc`.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-palette-parsecoolorsurl-ts-parsecssvariablespaste",
    "name": "parseCssVariablesPaste",
    "path": "src/shared/palette/parseCoolorsUrl.ts",
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
    "id": "src-shared-palette-parsecoolorsurl-ts-parsehexlistpaste",
    "name": "parseHexListPaste",
    "path": "src/shared/palette/parseCoolorsUrl.ts",
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
    "id": "src-shared-palette-parsecoolorsurl-ts-parsepalettegenurlpaste",
    "name": "parsePalettegenUrlPaste",
    "path": "src/shared/palette/parseCoolorsUrl.ts",
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
    "id": "src-shared-palette-parsecoolorsurl-ts-parsepalettepaste",
    "name": "parsePalettePaste",
    "path": "src/shared/palette/parseCoolorsUrl.ts",
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
    "id": "src-shared-palette-types-ts-comicpalette",
    "name": "ComicPalette",
    "path": "src/shared/palette/types.ts",
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
    "id": "src-shared-palette-types-ts-createpalettefromhexes",
    "name": "createPaletteFromHexes",
    "path": "src/shared/palette/types.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-palette-types-ts-paletteswatch",
    "name": "PaletteSwatch",
    "path": "src/shared/palette/types.ts",
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
    "id": "src-shared-playback-measureclock-ts-measurestartaudiotimefromepoch",
    "name": "measureStartAudioTimeFromEpoch",
    "path": "src/shared/playback/measureClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Absolute AudioContext start time for chart/measure step `stepIndex`.",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-measureclock-ts-perfmstoaudiocontexttime",
    "name": "perfMsToAudioContextTime",
    "path": "src/shared/playback/measureClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Map a performance.now() target to an AudioContext timeline (works across contexts).",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-playback-measureclock-ts-playback-schedule-lead-ms",
    "name": "PLAYBACK_SCHEDULE_LEAD_MS",
    "path": "src/shared/playback/measureClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Lead time before the first scheduled hit (matches rhythmPlayer startup).",
    "tags": [
      "playback",
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-playback-measureclock-ts-secpersixteenthatbpm",
    "name": "secPerSixteenthAtBpm",
    "path": "src/shared/playback/measureClock.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "playback-core",
    "description": "Seconds per sixteenth note at the given BPM (quarter note = beat).",
    "tags": [
      "playback"
    ],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-rhythm-metronomeplaybackprefs-ts-torhythmmetronomeplaybackprefs",
    "name": "toRhythmMetronomePlaybackPrefs",
    "path": "src/shared/rhythm/metronomePlaybackPrefs.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Map platform metronome prefs to rhythm playback scheduler prefs.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [],
    "exportType": "function",
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
      "drums",
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
      "drums",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-getrhythmpresetfamilies",
    "name": "getRhythmPresetFamilies",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Type → meter nested families for the load-rhythm picker.",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
      "ui",
      "words"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-getrhythmpresetgroups",
    "name": "getRhythmPresetGroups",
    "path": "src/shared/rhythm/presetDatabase.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "Flattened groups (legacy); prefer .",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
      "ui",
      "words"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-rhythmpresetfamily",
    "name": "RhythmPresetFamily",
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
      "drums",
      "ui",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-rhythmpresetgroup",
    "name": "RhythmPresetGroup",
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
      "drums",
      "ui",
      "words"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-rhythm-presetdatabase-ts-rhythmpresetmetergroup",
    "name": "RhythmPresetMeterGroup",
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
      "drums",
      "ui",
      "words"
    ],
    "exportType": "type",
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
      "drums",
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
      "drums",
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
      "drums",
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
    "id": "src-shared-rhythm-rhythmplayer-ts-rhythmmetronomeplaybackprefs",
    "name": "RhythmMetronomePlaybackPrefs",
    "path": "src/shared/rhythm/rhythmPlayer.ts",
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
    "id": "src-shared-rhythm-rhythmplayer-ts-rhythmplayer",
    "name": "rhythmPlayer",
    "path": "src/shared/rhythm/rhythmPlayer.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "rhythm-core",
    "description": "No JSDoc summary provided.",
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
    "id": "src-shared-test-contrastauditcore-ts-contrast-audit-defaults",
    "name": "CONTRAST_AUDIT_DEFAULTS",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-contrastauditfailure",
    "name": "ContrastAuditFailure",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-contrastauditresult",
    "name": "ContrastAuditResult",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-contrastauditsuccess",
    "name": "ContrastAuditSuccess",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-contrastratio",
    "name": "contrastRatio",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-contrastviolation",
    "name": "ContrastViolation",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-layout-heuristic-defaults",
    "name": "LAYOUT_HEURISTIC_DEFAULTS",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-parsecsscolortorgb",
    "name": "parseCssColorToRgb",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-relativeluminance",
    "name": "relativeLuminance",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
    "tags": [],
    "appsUsing": [],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-test-contrastauditcore-ts-requiredcontrastratio",
    "name": "requiredContrastRatio",
    "path": "src/shared/test/contrastAuditCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained).",
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
    "id": "src-shared-test-horizontalscrollheuristiccore-ts-elementoverflowshorizontally",
    "name": "elementOverflowsHorizontally",
    "path": "src/shared/test/horizontalScrollHeuristicCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when an element is wider than its layout box (ignores tolerance).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-horizontalscrollheuristiccore-ts-evaluatehorizontalscrolloverflow",
    "name": "evaluateHorizontalScrollOverflow",
    "path": "src/shared/test/horizontalScrollHeuristicCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure horizontal overflow math — keep in sync with e2e/helpers/horizontalScrollHeuristic.ts",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-horizontalscrollheuristiccore-ts-horizontal-scroll-heuristic-defaults",
    "name": "HORIZONTAL_SCROLL_HEURISTIC_DEFAULTS",
    "path": "src/shared/test/horizontalScrollHeuristicCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure horizontal overflow math — keep in sync with e2e/helpers/horizontalScrollHeuristic.ts",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-horizontalscrollheuristiccore-ts-horizontalscrolloverflowresult",
    "name": "HorizontalScrollOverflowResult",
    "path": "src/shared/test/horizontalScrollHeuristicCore.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pure horizontal overflow math — keep in sync with e2e/helpers/horizontalScrollHeuristic.ts",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-test-interactionlatencycore-ts-audio-play-interaction-budget-ms",
    "name": "AUDIO_PLAY_INTERACTION_BUDGET_MS",
    "path": "src/shared/test/interactionLatencyCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Web Audio play/stop — audio context + parallel smoke CPU contention (see `drums-load-interaction.spec.ts`).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
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
    "description": "Hash/tab route switches — CI runners are slower than local dev (often ~900–1200ms on cold heavy tabs).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-labse2eharness-ts-islabse2eharness",
    "name": "isLabsE2eHarness",
    "path": "src/shared/test/labsE2eHarness.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "True when Playwright / Vite dev server runs e2e hooks. Never true on production Pages deploy.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
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
    "id": "src-shared-test-zineboxscrollperfcore-ts-formatzineboxscrollperfmessage",
    "name": "formatZineboxScrollPerfMessage",
    "path": "src/shared/test/zineboxScrollPerfCore.ts",
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
    "id": "src-shared-test-zineboxscrollperfcore-ts-getzineboxscrollperflimits",
    "name": "getZineboxScrollPerfLimits",
    "path": "src/shared/test/zineboxScrollPerfCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Local dev targets ~60fps; GitHub Actions uses shared CPU and software rendering.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-test-zineboxscrollperfcore-ts-zinebox-library-scroll-max-frame-ms",
    "name": "ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS",
    "path": "src/shared/test/zineboxScrollPerfCore.ts",
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
    "id": "src-shared-test-zineboxscrollperfcore-ts-zinebox-library-scroll-max-long-tasks",
    "name": "ZINEBOX_LIBRARY_SCROLL_MAX_LONG_TASKS",
    "path": "src/shared/test/zineboxScrollPerfCore.ts",
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
    "id": "src-shared-test-zineboxscrollperfcore-ts-zinebox-library-scroll-max-spike-ms",
    "name": "ZINEBOX_LIBRARY_SCROLL_MAX_SPIKE_MS",
    "path": "src/shared/test/zineboxScrollPerfCore.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Single-frame hitch during parallel CI or image decode — not sustained judder.",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-test-zineboxscrollperfcore-ts-zineboxscrollperfsample",
    "name": "ZineboxScrollPerfSample",
    "path": "src/shared/test/zineboxScrollPerfCore.ts",
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
    "exportType": "function",
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "appsUsing": [
      "words"
    ],
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
    "id": "src-shared-utils-labscrashlog-ts-appendlabscrashlogentry",
    "name": "appendLabsCrashLogEntry",
    "path": "src/shared/utils/labsCrashLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "IndexedDB crash log — local-first crash history (export via LabsDebugDock). Optional production beacon when `VITE_LABS_CRASH_BEACON_URL` is set — see docs/adr/0016-client-crash-telemetry.md",
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
    "id": "src-shared-utils-labscrashlog-ts-exportlabscrashlogjson",
    "name": "exportLabsCrashLogJson",
    "path": "src/shared/utils/labsCrashLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "IndexedDB crash log — local-first crash history (export via LabsDebugDock). Optional production beacon when `VITE_LABS_CRASH_BEACON_URL` is set — see docs/adr/0016-client-crash-telemetry.md",
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
    "id": "src-shared-utils-labscrashlog-ts-installlabscrashhandlers",
    "name": "installLabsCrashHandlers",
    "path": "src/shared/utils/labsCrashLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "IndexedDB crash log — local-first crash history (export via LabsDebugDock). Optional production beacon when `VITE_LABS_CRASH_BEACON_URL` is set — see docs/adr/0016-client-crash-telemetry.md",
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
    "id": "src-shared-utils-labscrashlog-ts-labscrashlogentry",
    "name": "LabsCrashLogEntry",
    "path": "src/shared/utils/labsCrashLog.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "IndexedDB crash log — local-first crash history (export via LabsDebugDock). Optional production beacon when `VITE_LABS_CRASH_BEACON_URL` is set — see docs/adr/0016-client-crash-telemetry.md",
    "tags": [
      "utils",
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
    "id": "src-shared-utils-labscrashlog-ts-preload-reload-cooldown-ms",
    "name": "PRELOAD_RELOAD_COOLDOWN_MS",
    "path": "src/shared/utils/labsCrashLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Minimum gap between stale-chunk auto-reloads. A second failure inside this window is treated as \"the asset is genuinely missing / offline\", so we stop and let the error boundary surface.",
    "tags": [
      "utils",
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
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-utils-labscrashlog-ts-readlabscrashlogentries",
    "name": "readLabsCrashLogEntries",
    "path": "src/shared/utils/labsCrashLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "IndexedDB crash log — local-first crash history (export via LabsDebugDock). Optional production beacon when `VITE_LABS_CRASH_BEACON_URL` is set — see docs/adr/0016-client-crash-telemetry.md",
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
    "id": "src-shared-utils-labscrashlog-ts-shouldreloadforpreloaderror",
    "name": "shouldReloadForPreloadError",
    "path": "src/shared/utils/labsCrashLog.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Decide whether to auto-reload after a failed dynamic import. The first failure (no prior reload, or one long enough ago) reloads to pick up the fresh post-deploy manifest. A failure shortly after a reload means reloading did not help — return false so we do not loop forever.",
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
    "id": "src-shared-utils-labsdownloadfilename-ts-buildchordchartdownloadfilename",
    "name": "buildChordChartDownloadFileName",
    "path": "src/shared/utils/labsDownloadFileName.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
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
    "id": "src-shared-utils-labsdownloadfilename-ts-buildlabsdownloadfilename",
    "name": "buildLabsDownloadFileName",
    "path": "src/shared/utils/labsDownloadFileName.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Build a human-readable download filename from ordered parts joined with ` - `. Example: `buildLabsDownloadFileName(['A Thousand Castles', 'Chord Chart'], 'pdf')` → `A Thousand Castles - Chord Chart.pdf`",
    "tags": [
      "utils"
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
    "id": "src-shared-utils-labsdownloadfilename-ts-labsdownloadfilenamewithextension",
    "name": "labsDownloadFileNameWithExtension",
    "path": "src/shared/utils/labsDownloadFileName.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Append an extension to an already-built stem (no part joining).",
    "tags": [
      "utils"
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
    "id": "src-shared-utils-labsdownloadfilename-ts-sanitizelabsdownloadfilestem",
    "name": "sanitizeLabsDownloadFileStem",
    "path": "src/shared/utils/labsDownloadFileName.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Strip characters illegal in cross-platform download filenames; keep readable spacing.",
    "tags": [
      "utils"
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
    "id": "src-shared-utils-labspdffromcanvas-ts-createpdfblobfromcanvas",
    "name": "createPdfBlobFromCanvas",
    "path": "src/shared/utils/labsPdfFromCanvas.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Lazy pdf-lib wrapper so score/PDF export does not pull pdf-lib into app main chunks.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-labspdffromcanvas-ts-pdffromcanvasoptions",
    "name": "PdfFromCanvasOptions",
    "path": "src/shared/utils/labsPdfFromCanvas.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-utils-labsplaybacksafecall-ts-labsplaybacksafecall",
    "name": "labsPlaybackSafeCall",
    "path": "src/shared/utils/labsPlaybackSafeCall.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Defensive wrappers for playback hot paths (RAF, media poll, Web Audio). Failures are logged and swallowed so one bad tick does not take down the app.",
    "tags": [
      "utils"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-labsplaybacksafecall-ts-labsplaybacksafecallasync",
    "name": "labsPlaybackSafeCallAsync",
    "path": "src/shared/utils/labsPlaybackSafeCall.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Defensive wrappers for playback hot paths (RAF, media poll, Web Audio). Failures are logged and swallowed so one bad tick does not take down the app.",
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
    "id": "src-shared-utils-svgtocanvas-ts-svgelementtocanvas",
    "name": "svgElementToCanvas",
    "path": "src/shared/utils/svgToCanvas.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-svgtocanvas-ts-svgelementtopngblob",
    "name": "svgElementToPngBlob",
    "path": "src/shared/utils/svgToCanvas.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-utils-svgtocanvas-ts-svgtocanvasoptions",
    "name": "SvgToCanvasOptions",
    "path": "src/shared/utils/svgToCanvas.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "utils",
      "api"
    ],
    "appsUsing": [
      "drums"
    ],
    "exportType": "interface",
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
    "id": "src-shared-utils-trailingslashrouting-ts-getlegacyappredirect",
    "name": "getLegacyAppRedirect",
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
    "id": "src-shared-utils-trailingslashrouting-ts-getlegacypalettegenredirect",
    "name": "getLegacyPalettegenRedirect",
    "path": "src/shared/utils/trailingSlashRouting.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Legacy Palette Generator URLs → /palette/ (query preserved; hash handled by static redirect HTML).",
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
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-artworkdimensionswithbleed",
    "name": "artworkDimensionsWithBleed",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-bleedconfig",
    "name": "BleedConfig",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-bleedforbinding",
    "name": "bleedForBinding",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-bleedguidepageside",
    "name": "BleedGuidePageSide",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-bleedoverlaypercents",
    "name": "bleedOverlayPercents",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-bleedoverlaypercents",
    "name": "BleedOverlayPercents",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-bleedvalueintrimunits",
    "name": "bleedValueInTrimUnits",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-convertprintunits",
    "name": "convertPrintUnits",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-default-bleed-config",
    "name": "DEFAULT_BLEED_CONFIG",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-default-mixam-trim-preset",
    "name": "DEFAULT_MIXAM_TRIM_PRESET",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-formatprintdimensions",
    "name": "formatPrintDimensions",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-mixam-binding-gutter-in",
    "name": "MIXAM_BINDING_GUTTER_IN",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Gutter (inner binding margin) per Mixam binding table. Staple: N/A.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-mixam-binding-labels",
    "name": "MIXAM_BINDING_LABELS",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-mixam-standard-bleed-in",
    "name": "MIXAM_STANDARD_BLEED_IN",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam standard bleed for interior pages (most items).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-mixam-standard-quiet-in",
    "name": "MIXAM_STANDARD_QUIET_IN",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam standard quiet area on outer edges (staple-bound default).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-mixam-trim-presets",
    "name": "MIXAM_TRIM_PRESETS",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam industry-standard trim sizes (finished page, without bleed).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-mixambindingtype",
    "name": "MixamBindingType",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-mixamtrimpreset",
    "name": "MixamTrimPreset",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-pixelsatdpi",
    "name": "pixelsAtDpi",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-printunit",
    "name": "PrintUnit",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-trimpresetbyid",
    "name": "trimPresetById",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedconfig-ts-trimsize",
    "name": "TrimSize",
    "path": "src/shared/zine/bleedConfig.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bleedguideoverlay-tsx-bleedguideoverlay",
    "name": "BleedGuideOverlay",
    "path": "src/shared/zine/BleedGuideOverlay.tsx",
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
    "id": "src-shared-zine-bleedguideoverlay-tsx-bleedguideoverlayprops",
    "name": "BleedGuideOverlayProps",
    "path": "src/shared/zine/BleedGuideOverlay.tsx",
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
    "id": "src-shared-zine-bookletpagelabels-ts-bookletreadingorderkey",
    "name": "bookletReadingOrderKey",
    "path": "src/shared/zine/bookletPageLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Reading-order sort key for Mixam booklet page numbers (cover first, back last).",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletpagelabels-ts-getbookletpagefilestem",
    "name": "getBookletPageFileStem",
    "path": "src/shared/zine/bookletPageLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Filename stem for a booklet page number (parsed by ).",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletpagelabels-ts-getbookletpagelabel",
    "name": "getBookletPageLabel",
    "path": "src/shared/zine/bookletPageLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Human-readable label for a booklet page number (Mixam / Zine Studio naming).",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletpagelabels-ts-labeltobookletpagenumber",
    "name": "labelToBookletPageNumber",
    "path": "src/shared/zine/bookletPageLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Reverse of for Lyrefly display names.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletpagelabels-ts-spreadlabelstopagepair",
    "name": "spreadLabelsToPagePair",
    "path": "src/shared/zine/bookletPageLabels.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parse spread display names like \"Back Cover - Front Cover\".",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletreadingorder-ts-bookletexplicitspread",
    "name": "BookletExplicitSpread",
    "path": "src/shared/zine/bookletReadingOrder.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Calculate the required number of content pages to make the total booklet a multiple of 4 (required for proper booklet folding).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletreadingorder-ts-bookletpageslot",
    "name": "BookletPageSlot",
    "path": "src/shared/zine/bookletReadingOrder.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Calculate the required number of content pages to make the total booklet a multiple of 4 (required for proper booklet folding).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletreadingorder-ts-bookletreadingpage",
    "name": "BookletReadingPage",
    "path": "src/shared/zine/bookletReadingOrder.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Calculate the required number of content pages to make the total booklet a multiple of 4 (required for proper booklet folding).",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletreadingorder-ts-bookletreadingpagestospreadviews",
    "name": "bookletReadingPagesToSpreadViews",
    "path": "src/shared/zine/bookletReadingOrder.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Pair reading-order pages into left/right spread views.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletreadingorder-ts-buildbookletreadingpages",
    "name": "buildBookletReadingPages",
    "path": "src/shared/zine/bookletReadingOrder.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Build booklet pages for READING order (Zine Studio book preview). - Front cover appears on the right of the first spread (blank left) - Inner front, content pages, inner back, back cover follow",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-bookletreadingorder-ts-calculaterequiredcontentpages",
    "name": "calculateRequiredContentPages",
    "path": "src/shared/zine/bookletReadingOrder.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Calculate the required number of content pages to make the total booklet a multiple of 4 (required for proper booklet folding).",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-buildmixamzip-ts-buildmixamzipblob",
    "name": "buildMixamZipBlob",
    "path": "src/shared/zine/buildMixamZip.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Build a ZIP blob from Mixam-named page files.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-buildmixamzip-ts-downloadblob",
    "name": "downloadBlob",
    "path": "src/shared/zine/buildMixamZip.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Trigger a browser download for a ZIP blob.",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-buildmixamzip-ts-mixamzipentry",
    "name": "MixamZipEntry",
    "path": "src/shared/zine/buildMixamZip.ts",
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
    "id": "src-shared-zine-comicscrollreader-tsx-comicscrollreader",
    "name": "ComicScrollReader",
    "path": "src/shared/zine/ComicScrollReader.tsx",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Vertical scroll comic reader — shared between Lyrefly preview and future Zine handoff.",
    "tags": [
      "api",
      "react"
    ],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-comicscrollreader-tsx-comicscrollreaderpage",
    "name": "ComicScrollReaderPage",
    "path": "src/shared/zine/ComicScrollReader.tsx",
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
    "id": "src-shared-zine-comicscrollreader-tsx-comicscrollreaderprops",
    "name": "ComicScrollReaderProps",
    "path": "src/shared/zine/ComicScrollReader.tsx",
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
    "id": "src-shared-zine-comicscrollreader-tsx-comicscrollreadervariant",
    "name": "ComicScrollReaderVariant",
    "path": "src/shared/zine/ComicScrollReader.tsx",
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
    "id": "src-shared-zine-downloadbleedtemplate-ts-bleedtemplatedownloadinput",
    "name": "BleedTemplateDownloadInput",
    "path": "src/shared/zine/downloadBleedTemplate.ts",
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
    "id": "src-shared-zine-downloadbleedtemplate-ts-bleedtemplatefilename",
    "name": "bleedTemplateFileName",
    "path": "src/shared/zine/downloadBleedTemplate.ts",
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
    "id": "src-shared-zine-downloadbleedtemplate-ts-downloadbleedtemplatepng",
    "name": "downloadBleedTemplatePng",
    "path": "src/shared/zine/downloadBleedTemplate.ts",
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
    "id": "src-shared-zine-index-ts-bleedconfigforlabsprintspec",
    "name": "bleedConfigForLabsPrintSpec",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-bleedguideoverlay",
    "name": "BleedGuideOverlay",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-bleedguideoverlayprops",
    "name": "BleedGuideOverlayProps",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-bleedinchesforlabsprintspec",
    "name": "bleedInchesForLabsPrintSpec",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-bleedtemplatedownloadinput",
    "name": "BleedTemplateDownloadInput",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-bleedtemplatefilename",
    "name": "bleedTemplateFileName",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-default-labs-print-spec",
    "name": "DEFAULT_LABS_PRINT_SPEC",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-downloadbleedtemplatepng",
    "name": "downloadBleedTemplatePng",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-labs-bleed-presets",
    "name": "LABS_BLEED_PRESETS",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-labs-dpi-presets",
    "name": "LABS_DPI_PRESETS",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-labsprintspec",
    "name": "LabsPrintSpec",
    "path": "src/shared/zine/index.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "type",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-labsprintspecsummary",
    "name": "labsPrintSpecSummary",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-index-ts-trimsizefromlabsprintspec",
    "name": "trimSizeFromLabsPrintSpec",
    "path": "src/shared/zine/index.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "No JSDoc summary provided.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "named",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-bleedconfigforlabsprintspec",
    "name": "bleedConfigForLabsPrintSpec",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-bleedinchesforlabsprintspec",
    "name": "bleedInchesForLabsPrintSpec",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-default-labs-print-spec",
    "name": "DEFAULT_LABS_PRINT_SPEC",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-labs-bleed-presets",
    "name": "LABS_BLEED_PRESETS",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-labs-dpi-presets",
    "name": "LABS_DPI_PRESETS",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "const",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-labsprintspec",
    "name": "LabsPrintSpec",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [
      "api"
    ],
    "appsUsing": [],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-labsprintspecsummary",
    "name": "labsPrintSpecSummary",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-labsprintspec-ts-trimsizefromlabsprintspec",
    "name": "trimSizeFromLabsPrintSpec",
    "path": "src/shared/zine/labsPrintSpec.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-mixamfilenames-ts-createmixampagefilename",
    "name": "createMixamPageFileName",
    "path": "src/shared/zine/mixamFileNames.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Single-page Mixam filename stem + extension (e.g. `page1.png`).",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-mixamfilenames-ts-createmixamspreadfilename",
    "name": "createMixamSpreadFileName",
    "path": "src/shared/zine/mixamFileNames.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Spread Mixam filename (e.g. `page2-page3.png`).",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-mixamfilenames-ts-mixamfilenamefromdisplayname",
    "name": "mixamFileNameFromDisplayName",
    "path": "src/shared/zine/mixamFileNames.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Derive a Mixam-style filename from a Lyrefly page display name. Falls back to a slug when the label is not a standard booklet name.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pagefileparser-ts-detectspread",
    "name": "detectSpread",
    "path": "src/shared/zine/pageFileParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Detects if a filename represents a double page spread.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pagefileparser-ts-extractpagenumber",
    "name": "extractPageNumber",
    "path": "src/shared/zine/pageFileParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Extracts page number from filename using naming conventions. Handles flexible naming patterns: - \"page1.png\", \"page_1.png\", \"1.png\" for single pages - \"file1.pdf\", \"page2.pdf\" for numbered pages - Special keywords: \"front\", \"back\", \"rear\", \"last\", \"inner\"",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pagefileparser-ts-parseandsortpagefiles",
    "name": "parseAndSortPageFiles",
    "path": "src/shared/zine/pageFileParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parsed comic page upload (Zine Studio / Mixam filename conventions). Shared across Zine Studio and Lyrefly art import.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pagefileparser-ts-parsedpagefile",
    "name": "ParsedPageFile",
    "path": "src/shared/zine/pageFileParser.ts",
    "kind": "model",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parsed comic page upload (Zine Studio / Mixam filename conventions). Shared across Zine Studio and Lyrefly art import.",
    "tags": [
      "api"
    ],
    "appsUsing": [
      "zines"
    ],
    "exportType": "interface",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pagefileparser-ts-parsepagefile",
    "name": "parsePageFile",
    "path": "src/shared/zine/pageFileParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parsed comic page upload (Zine Studio / Mixam filename conventions). Shared across Zine Studio and Lyrefly art import.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pagefileparser-ts-sortpagefilesbyorder",
    "name": "sortPageFilesByOrder",
    "path": "src/shared/zine/pageFileParser.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Parsed comic page upload (Zine Studio / Mixam filename conventions). Shared across Zine Studio and Lyrefly art import.",
    "tags": [],
    "appsUsing": [
      "zines"
    ],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pdfexport-ts-blobtodataurl",
    "name": "blobToDataUrl",
    "path": "src/shared/zine/pdfExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Convert a Blob to a data URL (for PDF embedding).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pdfexport-ts-createdistributionpdf",
    "name": "createDistributionPdf",
    "path": "src/shared/zine/pdfExport.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Sequential single-page PDF for digital reading (distribution format).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  },
  {
    "id": "src-shared-zine-pdfexport-ts-distributionpdfpage",
    "name": "DistributionPdfPage",
    "path": "src/shared/zine/pdfExport.ts",
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
    "id": "src-shared-zine-platformresize-ts-comic-platform-presets",
    "name": "COMIC_PLATFORM_PRESETS",
    "path": "src/shared/zine/platformResize.ts",
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
    "id": "src-shared-zine-platformresize-ts-comicplatformpreset",
    "name": "ComicPlatformPreset",
    "path": "src/shared/zine/platformResize.ts",
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
    "id": "src-shared-zine-platformresize-ts-comicplatformpresetid",
    "name": "ComicPlatformPresetId",
    "path": "src/shared/zine/platformResize.ts",
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
    "id": "src-shared-zine-platformresize-ts-resizeimageblobforplatform",
    "name": "resizeImageBlobForPlatform",
    "path": "src/shared/zine/platformResize.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "shared-core",
    "description": "Resize an image blob to a platform width preset (no-op when maxWidthPx is 0).",
    "tags": [],
    "appsUsing": [],
    "exportType": "function",
    "demoId": null
  }
] as const;
