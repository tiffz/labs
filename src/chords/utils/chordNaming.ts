/**
 * Chord naming utilities for displaying chord symbols
 */

import type { Chord, ChordQuality } from '../types';

/**
 * Formats a chord quality for display
 */
function formatQuality(quality: ChordQuality): string {
  const qualityMap: Record<ChordQuality, string> = {
    major: '',
    minor: 'm',
    diminished: 'dim',
    augmented: 'aug',
    sus2: 'sus2',
    sus4: 'sus4',
    dominant7: '7',
    major7: 'maj7',
    minor7: 'm7',
  };
  
  return qualityMap[quality] || '';
}

/**
 * Formats a chord name for display (e.g., "C", "Am", "G/B")
 */
export function formatChordName(chord: Chord): string {
  let name = chord.root;
  
  // Add quality suffix
  const qualityStr = formatQuality(chord.quality);
  if (qualityStr) {
    name += qualityStr;
  }
  
  // Add inversion slash notation if inverted
  if (chord.inversion && chord.inversion > 0) {
    // For now, just show the root - can be enhanced to show bass note
    // This is a simplified version
  }
  
  return name;
}

