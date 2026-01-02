/**
 * Common chord progressions for the Chord Progression Generator
 * 
 * Progressions are defined using Roman numeral notation (e.g., I–V–vi–IV)
 */

import type { ChordProgressionConfig } from '../types';

export const COMMON_CHORD_PROGRESSIONS: ChordProgressionConfig[] = [
  {
    name: 'I–V–vi–IV',
    description: 'The most popular progression in pop music (e.g., C–G–Am–F)',
    progression: ['I', 'V', 'vi', 'IV'],
  },
  {
    name: 'vi–IV–I–V',
    description: 'Popular in pop and rock (e.g., Am–F–C–G)',
    progression: ['vi', 'IV', 'I', 'V'],
  },
  {
    name: 'I–vi–IV–V',
    description: 'Classic 50s progression (e.g., C–Am–F–G)',
    progression: ['I', 'vi', 'IV', 'V'],
  },
  {
    name: 'I–V–vi–iii–IV–I–IV–V',
    description: "Pachelbel's Canon",
    progression: ['I', 'V', 'vi', 'III', 'IV', 'I', 'IV', 'V'],
  },
  {
    name: 'I–IV–V–IV',
    description: 'Simple blues progression',
    progression: ['I', 'IV', 'V', 'IV'],
  },
  {
    name: 'ii–V–I',
    description: 'Jazz turnaround',
    progression: ['ii', 'V', 'I'],
  },
  {
    name: 'I–vi–ii–V',
    description: 'Jazz progression',
    progression: ['I', 'vi', 'ii', 'V'],
  },
  {
    name: 'vi–V–IV–V',
    description: 'Andalusian cadence',
    progression: ['vi', 'V', 'IV', 'V'],
  },
  {
    name: 'I–V–vi–V',
    description: 'Simple progression',
    progression: ['I', 'V', 'vi', 'V'],
  },
  {
    name: 'I–IV–vi–V',
    description: 'Popular progression',
    progression: ['I', 'IV', 'vi', 'V'],
  },
];

