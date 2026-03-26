 
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
      "beat",
      "chords",
      "drums",
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
      "beat",
      "chords",
      "drums",
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
      "beat",
      "chords",
      "drums",
      "words"
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
      "beat",
      "piano"
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
      "beat",
      "piano"
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
      "beat",
      "piano"
    ],
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
      "beat",
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
    "id": "shared-music-architecture",
    "name": "Music Architecture",
    "path": "src/shared/music/ARCHITECTURE.md",
    "kind": "doc",
    "stability": "stable",
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
    "id": "src-shared-music-randomization-ts-randomkey",
    "name": "randomKey",
    "path": "src/shared/music/randomization.ts",
    "kind": "utility",
    "stability": "stable",
    "owner": "music-core",
    "description": "No JSDoc summary provided.",
    "tags": [
      "music"
    ],
    "appsUsing": [
      "chords",
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
      "beat",
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
      "beat",
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
      "beat",
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
    "appsUsing": [],
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
    "appsUsing": [],
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
    "demoId": "drum-notation-mini"
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
      "chords",
      "piano"
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
      "chords",
      "piano"
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
      "chords",
      "piano"
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
      "chords",
      "piano"
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
      "chords",
      "piano"
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
      "chords",
      "piano"
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
      "chords",
      "piano"
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
      "piano",
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
      "piano",
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
      "piano",
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
      "piano",
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
      "piano",
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
      "piano",
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
      "piano",
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
      "piano",
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
      "piano",
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
      "chords",
      "drums"
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
      "chords",
      "drums"
    ],
    "exportType": "interface",
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
      "beat",
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
      "beat",
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
      "beat",
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
      "beat",
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
      "beat",
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
      "beat",
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
      "beat",
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
      "beat",
      "drums"
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
      "beat",
      "drums"
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
      "beat",
      "drums"
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
      "beat",
      "drums"
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
      "beat",
      "drums"
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
      "beat",
      "drums"
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
      "beat",
      "drums"
    ],
    "exportType": "function",
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
      "drums",
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
      "drums",
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
    "description": "Calculate beat grouping in sixteenths for a given time signature",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "drums",
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
    "description": "Gets the default beat grouping for a time signature - Compound time signatures (6/8, 9/8, 12/8): groups of 3 - Asymmetric time signatures: custom grouping or defaults - Regular time signatures (4/4, 2/4): groups of 4 sixteenths (quarter notes)",
    "tags": [
      "rhythm"
    ],
    "appsUsing": [
      "beat",
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums",
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
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
      "drums"
    ],
    "exportType": "interface",
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
      "words",
      "zines"
    ],
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
      "piano",
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
      "piano",
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
      "piano",
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
      "words",
      "zines"
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
