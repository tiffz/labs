import type { TimeSignature } from '../../shared/rhythm/types';
import {
  DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
  generateWordRhythm,
  type WordRhythmGenerationSettings,
  type WordRhythmResult,
} from './prosodyEngine';
import { mergePartialGenerationSettings } from './generationSettingsCodec';
import { getRhythmTemplatePresets } from '../../shared/rhythm/presetDatabase';
import { createDefaultSection, type SongSection } from '../../shared/music/songSections';
import type { Key } from '../../shared/music/chordTypes';
import { DRUM_SAMPLE_URLS } from '../../shared/audio/drumSampleUrls';

export const DEFAULT_LYRICS = `Sunrise on the shoreline
Ocean wind through palm trees`;

export const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};

export const TIME_SIGNATURE_OPTIONS: Array<
  Pick<TimeSignature, 'numerator' | 'denominator'>
> = [
  { numerator: 4, denominator: 4 },
  { numerator: 6, denominator: 8 },
];

export const TEMPLATE_PRESETS = getRhythmTemplatePresets(DEFAULT_TIME_SIGNATURE).map(
  (preset) => ({
    id: preset.id,
    label: preset.label,
    notation: preset.notation,
  })
);

export type TemplatePreset = (typeof TEMPLATE_PRESETS)[number];

export const BACKING_FALLBACK_TEMPLATE = 'D---D---D---D---';
export const DRUM_SOUNDS = { ...DRUM_SAMPLE_URLS } as const;

export const APP_DEFAULT_GENERATION_SETTINGS: WordRhythmGenerationSettings =
  mergePartialGenerationSettings(DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS, {
    templateNotation: TEMPLATE_PRESETS[0].notation,
  });

export const SECTION_CREATE_DEFAULTS = {
  templateNotation: TEMPLATE_PRESETS[0].notation,
};

export const DEFAULT_WORD_RESULT: WordRhythmResult = generateWordRhythm(DEFAULT_LYRICS, {
  strictDictionaryMode: false,
  timeSignature: DEFAULT_TIME_SIGNATURE,
  rhythmVariationSeed: 0,
  soundVariationSeed: 0,
  generationSettings: APP_DEFAULT_GENERATION_SETTINGS,
});

export const DEFAULT_SONG_KEY: Key = 'C';

export const DEFAULT_SECTIONS: SongSection[] = [
  {
    ...createDefaultSection('verse', SECTION_CREATE_DEFAULTS),
    id: 'default-verse-1',
    lyrics: DEFAULT_LYRICS,
    chordProgressionInput: 'G-C-Am-F',
    chordStyleId: 'simple',
    templateNotation: APP_DEFAULT_GENERATION_SETTINGS.templateNotation ?? '',
  },
  {
    ...createDefaultSection('chorus', SECTION_CREATE_DEFAULTS),
    id: 'default-chorus-1',
    lyrics: `Find the fire burning by the sea
So you can come and dance with me`,
    chordProgressionInput: 'G-C-Am-F',
    chordStyleId: 'one-per-beat',
    templateNotation: 'D--KD-T-D--KD-T-',
  },
];

export const CHORD_PARSE_REGEX = /^([A-G](?:#|b)?)(maj7|m7|m|7|sus2|sus4|dim|aug)?$/i;

export const URL_PARAM_LYRICS = 'l';
export const URL_PARAM_PATTERN = 'pat';
export const URL_PARAM_PATTERN_B64 = 'pat64';
export const URL_PARAM_BPM = 'bpm';
export const URL_PARAM_TIME = 'time';
export const URL_PARAM_METRONOME = 'met';
export const URL_PARAM_AUTOFOLLOW = 'af';
export const URL_PARAM_GENERATION_SETTINGS = 'gs';
export const URL_PARAM_DRUMS_VOLUME = 'dvol';
export const URL_PARAM_CHORD_SOUND = 'csnd';
export const URL_PARAM_CHORD_VOLUME = 'cvol';
export const URL_PARAM_CHORD_KEY = 'ckey';
export const URL_PARAM_SECTIONS = 'song';

export const URL_HISTORY_DEBOUNCE_MS = 900;
export const URL_HISTORY_REPLACE_DEBOUNCE_PARAMS = new Set<string>([
  URL_PARAM_SECTIONS,
  URL_PARAM_BPM,
  URL_PARAM_GENERATION_SETTINGS,
  URL_PARAM_DRUMS_VOLUME,
  URL_PARAM_CHORD_VOLUME,
]);

export const MAX_UNDO_HISTORY = 120;
