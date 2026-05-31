export type RandomizeMode = 'phrasing' | 'groove' | 'rhythm' | 'chords' | 'everything';

export const RANDOMIZE_MODE_OPTIONS: Array<{
  mode: RandomizeMode;
  label: string;
  tooltip: string;
}> = [
  {
    mode: 'phrasing',
    label: 'Phrasing',
    tooltip: 'Rerolls rhythms and articulation while preserving section templates.',
  },
  {
    mode: 'groove',
    label: 'Groove',
    tooltip: 'Randomizes rhythm templates while preserving phrasing.',
  },
  {
    mode: 'rhythm',
    label: 'Rhythm',
    tooltip: 'Randomizes both groove templates and phrasing.',
  },
  {
    mode: 'chords',
    label: 'Chords',
    tooltip: 'Randomizes chord progressions while keeping current grooves.',
  },
  {
    mode: 'everything',
    label: 'Everything',
    tooltip: 'Randomizes phrasing, grooves, chords, key, style, and tempo.',
  },
];
