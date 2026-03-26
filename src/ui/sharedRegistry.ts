export type SharedModuleKind = 'component' | 'hook' | 'utility' | 'model' | 'service' | 'doc';
export type SharedModuleStability = 'stable' | 'beta' | 'experimental';

export interface SharedModuleRecord {
  id: string;
  name: string;
  path: string;
  kind: SharedModuleKind;
  stability: SharedModuleStability;
  owner: string;
  purpose: string;
  themingHooks?: string[];
  tags: string[];
}

export const SHARED_MODULES: ReadonlyArray<SharedModuleRecord> = [
  {
    id: 'music-bpm-input',
    name: 'BpmInput',
    path: 'src/shared/components/music/BpmInput.tsx',
    kind: 'component',
    stability: 'stable',
    owner: 'shared-ui',
    purpose: 'Reusable BPM control with presets, stepper, and slider.',
    themingHooks: ['--bpm-*', 'dropdownClassName'],
    tags: ['music', 'input', 'tempo'],
  },
  {
    id: 'music-key-input',
    name: 'KeyInput',
    path: 'src/shared/components/music/KeyInput.tsx',
    kind: 'component',
    stability: 'stable',
    owner: 'shared-ui',
    purpose: 'Reusable key selector with chip-grid popover and semitone step controls.',
    themingHooks: ['--key-*', 'dropdownClassName'],
    tags: ['music', 'input', 'key'],
  },
  {
    id: 'music-progression-input',
    name: 'ChordProgressionInput',
    path: 'src/shared/components/music/ChordProgressionInput.tsx',
    kind: 'component',
    stability: 'stable',
    owner: 'shared-ui',
    purpose: 'Progression text input with searchable presets and key-aware resolved labels.',
    themingHooks: ['appearance', '--cp-*', 'dropdownClassName', 'inlineMenuClassName'],
    tags: ['music', 'input', 'progression'],
  },
  {
    id: 'music-style-input',
    name: 'ChordStyleInput',
    path: 'src/shared/components/music/ChordStyleInput.tsx',
    kind: 'component',
    stability: 'stable',
    owner: 'shared-ui',
    purpose: 'Reusable style picker for rhythm/voicing pattern selection.',
    themingHooks: ['appearance', '--cs-*', 'dropdownClassName', 'inlineMenuClassName'],
    tags: ['music', 'input', 'style'],
  },
  {
    id: 'music-progression-parser',
    name: 'parseProgressionText',
    path: 'src/shared/music/chordProgressionText.ts',
    kind: 'utility',
    stability: 'stable',
    owner: 'music-core',
    purpose: 'Parses Roman numeral or chord-symbol progression text with key inference.',
    tags: ['music', 'parser'],
  },
  {
    id: 'music-common-progressions',
    name: 'COMMON_CHORD_PROGRESSIONS',
    path: 'src/shared/music/commonChordProgressions.ts',
    kind: 'model',
    stability: 'stable',
    owner: 'music-core',
    purpose: 'Canonical shared progression preset data used across apps.',
    tags: ['music', 'data', 'preset'],
  },
  {
    id: 'playback-autoscroll',
    name: 'scrollPlaybackTarget',
    path: 'src/shared/utils/playbackAutoScroll.ts',
    kind: 'utility',
    stability: 'stable',
    owner: 'playback-core',
    purpose: 'Shared playback-follow scrolling behavior for long score/timeline surfaces.',
    tags: ['playback', 'scroll'],
  },
  {
    id: 'ui-tooltip',
    name: 'AppTooltip',
    path: 'src/shared/components/AppTooltip.tsx',
    kind: 'component',
    stability: 'stable',
    owner: 'shared-ui',
    purpose: 'Standard tooltip primitive used across apps.',
    tags: ['ui', 'overlay', 'accessibility'],
  },
  {
    id: 'theme-doc',
    name: 'THEMING_DECISIONS',
    path: 'src/shared/components/music/THEMING_DECISIONS.md',
    kind: 'doc',
    stability: 'stable',
    owner: 'shared-ui',
    purpose: 'Token-level theming contract for shared music controls.',
    tags: ['docs', 'theming'],
  },
];
