/**
 * Chord styling strategies based on Piano for Singers course
 * 
 * This file now just provides metadata. The actual patterns are defined in
 * chordStylingPatterns.ts using human-readable notation.
 * 
 * Credit: These chord styling strategies are inspired by the Piano for Singers course
 * by Brenda Earle Stokes. Learn more at: https://pianoandvoicewithbrenda.com/piano-for-singers-the-complete-guide/
 */

import type { ChordStylingStrategy, TimeSignature } from '../types';
import { CHORD_STYLING_PATTERNS, keyToTimeSignature } from './chordStylingPatterns';

export interface ChordStylingStrategyConfig {
  name: string;
  description: string;
  compatibleTimeSignatures: TimeSignature[];
  attribution?: string;
}

/**
 * Generate compatible time signatures from patterns
 */
function getCompatibleTimeSignatures(strategy: ChordStylingStrategy): TimeSignature[] {
  const patternConfig = CHORD_STYLING_PATTERNS[strategy];
  if (!patternConfig) return [];
  
  return Object.keys(patternConfig.patterns).map(keyToTimeSignature);
}

export const CHORD_STYLING_STRATEGIES: Record<ChordStylingStrategy, ChordStylingStrategyConfig> = {
  simple: {
    name: CHORD_STYLING_PATTERNS.simple.name,
    description: CHORD_STYLING_PATTERNS.simple.description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('simple'),
  },
  'one-per-beat': {
    name: CHORD_STYLING_PATTERNS['one-per-beat'].name,
    description: CHORD_STYLING_PATTERNS['one-per-beat'].description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('one-per-beat'),
  },
  'oom-pahs': {
    name: CHORD_STYLING_PATTERNS['oom-pahs'].name,
    description: CHORD_STYLING_PATTERNS['oom-pahs'].description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('oom-pahs'),
    attribution: CHORD_STYLING_PATTERNS['oom-pahs'].attribution,
  },
  waltz: {
    name: CHORD_STYLING_PATTERNS.waltz.name,
    description: CHORD_STYLING_PATTERNS.waltz.description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('waltz'),
    attribution: CHORD_STYLING_PATTERNS.waltz.attribution,
  },
  'pop-rock-ballad': {
    name: CHORD_STYLING_PATTERNS['pop-rock-ballad'].name,
    description: CHORD_STYLING_PATTERNS['pop-rock-ballad'].description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('pop-rock-ballad'),
    attribution: CHORD_STYLING_PATTERNS['pop-rock-ballad'].attribution,
  },
  'pop-rock-uptempo': {
    name: CHORD_STYLING_PATTERNS['pop-rock-uptempo'].name,
    description: CHORD_STYLING_PATTERNS['pop-rock-uptempo'].description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('pop-rock-uptempo'),
    attribution: CHORD_STYLING_PATTERNS['pop-rock-uptempo'].attribution,
  },
  jazzy: {
    name: CHORD_STYLING_PATTERNS.jazzy.name,
    description: CHORD_STYLING_PATTERNS.jazzy.description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('jazzy'),
    attribution: CHORD_STYLING_PATTERNS.jazzy.attribution,
  },
  tresillo: {
    name: CHORD_STYLING_PATTERNS.tresillo.name,
    description: CHORD_STYLING_PATTERNS.tresillo.description,
    compatibleTimeSignatures: getCompatibleTimeSignatures('tresillo'),
    attribution: CHORD_STYLING_PATTERNS.tresillo.attribution,
  },
};

