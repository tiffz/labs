import type { RomanNumeral } from '../../chords/types';

export interface CommonChordProgression {
  name: string;
  description?: string;
  progression: RomanNumeral[];
}

export const COMMON_CHORD_PROGRESSIONS: CommonChordProgression[] = [
  {
    name: 'I–V–vi–IV',
    description: 'Popular pop cadence',
    progression: ['I', 'V', 'vi', 'IV'],
  },
  {
    name: 'vi–IV–I–V',
    description: 'Modern pop and rock',
    progression: ['vi', 'IV', 'I', 'V'],
  },
  {
    name: 'I–vi–IV–V',
    description: 'Classic 50s progression',
    progression: ['I', 'vi', 'IV', 'V'],
  },
  {
    name: 'I–IV–V–IV',
    description: 'Simple blues-inspired loop',
    progression: ['I', 'IV', 'V', 'IV'],
  },
  {
    name: 'ii–V–I',
    description: 'Jazz turnaround',
    progression: ['ii', 'V', 'I'],
  },
  {
    name: 'I–vi–ii–V',
    description: 'Common jazz standard movement',
    progression: ['I', 'vi', 'ii', 'V'],
  },
  {
    name: 'vi–V–IV–V',
    description: 'Andalusian-like cadence',
    progression: ['vi', 'V', 'IV', 'V'],
  },
  {
    name: 'I–V–vi–iii–IV–I–IV–V',
    description: "Pachelbel's canon pattern",
    progression: ['I', 'V', 'vi', 'III', 'IV', 'I', 'IV', 'V'],
  },
];
