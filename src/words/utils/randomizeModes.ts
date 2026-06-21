export type RandomizeMode = 'phrasing' | 'rhythm' | 'chords' | 'everything';

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
    mode: 'rhythm',
    label: 'Rhythm & groove',
    tooltip: 'Randomizes rhythm templates and phrasing together.',
  },
  {
    mode: 'chords',
    label: 'Chords',
    tooltip: 'Randomizes chord progressions while keeping the current rhythm.',
  },
  {
    mode: 'everything',
    label: 'Everything',
    tooltip: 'Randomizes phrasing, rhythm templates, chords, key, style, and tempo.',
  },
];
