import type { NoteValueBias, WordRhythmGenerationSettings } from './prosodyEngine';

export interface GenerationRuleDefinition {
  key: keyof WordRhythmGenerationSettings;
  label: string;
  help: string;
}

export const TEMPLATE_MUTATION_RULES: GenerationRuleDefinition[] = [
  {
    key: 'fillRests',
    label: 'Fill rests',
    help: 'Replace rests in the template with notes, adding rhythmic density.',
  },
  {
    key: 'subdivideNotes',
    label: 'Subdivide notes',
    help: 'Break longer notes into shorter patterns derived from common darbuka patterns.',
  },
  {
    key: 'mergeNotes',
    label: 'Merge notes',
    help: 'Collapse adjacent template hits into longer notes, preferring beat boundaries. Gives a sparser, more spacious feel.',
  },
];

export const WORD_SHAPING_RULES: GenerationRuleDefinition[] = [
  {
    key: 'naturalWordRhythm',
    label: 'Natural word rhythm',
    help: 'Shape syllable durations to match natural speech rhythm. e.g. "watermelon" = four fast notes.',
  },
];

export const NOTE_VALUE_LABELS: Array<{ key: keyof NoteValueBias; label: string }> = [
  { key: 'sixteenth', label: '16th' },
  { key: 'eighth', label: '8th' },
  { key: 'dotted', label: 'Dotted' },
  { key: 'quarter', label: 'Quarter' },
];

export const BIAS_LEVELS: Array<{ label: string; value: number }> = [
  { label: 'None', value: 0 },
  { label: 'Some', value: 50 },
  { label: 'A lot', value: 90 },
];
