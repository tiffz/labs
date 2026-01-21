/**
 * Guitar Tab Parser
 *
 * Parses Ultimate Guitar guitar tab format and converts strumming patterns to darbuka notation.
 * Maps guitar strumming to darbuka sounds:
 * - d (Downstroke) -> D (Dum) - heavy beat
 * - u (Upstroke) -> K (Ka) or T (Tek) - lighter beat (user choice)
 * - PM (Palm Mute) -> S (Slap) - percussive thud
 * - . or space -> _ (Rest)
 */

import type { ParsedMeasure, DrumPattern } from './drumTabParser';

/** Pattern to match a guitar string line with label (e|---, B|---, etc.) */
const GUITAR_STRING_PATTERN = /^([eBGDAE])\|(.+)\|?$/i;

/** Pattern to match continuation tab lines (no string label, starts with -, number, or |) */
const TAB_CONTINUATION_PATTERN = /^[-0-9|]+.*[-0-9|]+$/;

/** Pattern to detect strumming metadata block at top of tab */
const STRUMMING_METADATA_PATTERN = /strumming[:\s|]*([DdUu.\s|]+)/i;

/** Pattern to detect strumming footer line below tab grid - matches lines with d, u, PM, spaces, dots, and bar separators */
const STRUMMING_FOOTER_PATTERN = /^[du\s.|]*(?:PM[du\s.|]*|[du][du\s.|]*)+$/i;

/** Pattern to detect section headers like [intro], [verse A], "Intro:", "Verse 1:", etc. */
const SECTION_HEADER_PATTERN = /^(?:\[([^\]]+)\]|([A-Za-z][\w\s]*\d*):)\s*$/i;

export interface GuitarTabParseOptions {
  /** Include downstrokes (d) as D. Default: true */
  includeDownstroke: boolean;
  /** Include upstrokes (u). Default: true */
  includeUpstroke: boolean;
  /** Map upstrokes to K (Ka) if true, T (Tek) if false. Default: true (Ka) */
  upstrokeAsKa: boolean;
  /** Include palm mutes (PM) as S. Default: true */
  includePalmMute: boolean;
}

export const DEFAULT_GUITAR_OPTIONS: GuitarTabParseOptions = {
  includeDownstroke: true,
  includeUpstroke: true,
  upstrokeAsKa: true,
  includePalmMute: true,
};

/** A detected section in the tab */
export interface GuitarTabSection {
  /** Section name (e.g., "intro", "verse A") */
  name: string;
  /** Strumming patterns in this section */
  patterns: string[];
  /** Converted notation for this section */
  notation: string;
}

export interface ParsedGuitarTab {
  /** The converted darbuka notation (full) */
  notation: string;
  /** Unique measures with repeat counts */
  uniqueMeasures: ParsedMeasure[];
  /** Simplified notation showing just unique patterns */
  simplifiedNotation: string;
  /** Number of measures detected */
  measureCount: number;
  /** Source of strumming data */
  strummingSource: 'metadata' | 'footer' | 'none';
  /** Which strumming elements were found */
  elementsFound: ('d' | 'u' | 'PM')[];
  /** Detected sections in the tab */
  sections: GuitarTabSection[];
  /** Frequent patterns found in the tab */
  patterns: DrumPattern[];
  /** Any warnings during parsing */
  warnings: string[];
}

/**
 * Detects if the given text appears to be a guitar tab format.
 */
export function isGuitarTab(text: string): boolean {
  if (!text || text.length < 20) return false;

  const lines = text.split('\n');
  let guitarStringCount = 0;
  let hasBarSeparator = false;
  let hasFretNumbers = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (GUITAR_STRING_PATTERN.test(trimmed)) {
      guitarStringCount++;
      // Check for fret numbers (digits)
      if (/\d/.test(trimmed)) {
        hasFretNumbers = true;
      }
    }
    if (trimmed.includes('|')) {
      hasBarSeparator = true;
    }
  }

  // Need at least 5 of 6 guitar string lines, bar separators, and fret numbers
  return guitarStringCount >= 5 && hasBarSeparator && hasFretNumbers;
}

/**
 * Extracts strumming patterns organized by section.
 * Returns patterns with section information preserved.
 */
function extractStrummingBySections(text: string): {
  sections: { name: string; patterns: string[] }[];
  source: 'metadata' | 'footer' | 'none';
} {
  const lines = text.split('\n');

  // First, try to find strumming metadata block at top
  const metadataMatch = text.match(STRUMMING_METADATA_PATTERN);
  if (metadataMatch) {
    return {
      sections: [{ name: 'Main', patterns: [metadataMatch[1].trim()] }],
      source: 'metadata',
    };
  }

  // Otherwise, look for footer strumming lines below tab grids, organized by section
  const sections: { name: string; patterns: string[] }[] = [];
  let currentSection = 'Main';
  let currentPatterns: string[] = [];
  let inTabBlock = false;
  let tabBlockEndIndex = -1;

  // Helper to check if a line is part of a tab block
  const isTabLine = (line: string): boolean => {
    return GUITAR_STRING_PATTERN.test(line) || TAB_CONTINUATION_PATTERN.test(line);
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Check for section header
    const sectionMatch = trimmed.match(SECTION_HEADER_PATTERN);
    if (sectionMatch) {
      // Save previous section if it has patterns
      if (currentPatterns.length > 0) {
        console.log(`[Guitar Parser] Saving section "${currentSection}" with ${currentPatterns.length} patterns`);
        sections.push({ name: currentSection, patterns: [...currentPatterns] });
        currentPatterns = [];
      }
      // Extract name from either [bracketed] format (group 1) or "Name:" format (group 2)
      currentSection = (sectionMatch[1] || sectionMatch[2] || '').trim();
      console.log(`[Guitar Parser] Found section header: "${currentSection}"`);
      inTabBlock = false;
      continue;
    }

    // Detect if we're in a tab block (labeled or continuation lines)
    if (isTabLine(trimmed)) {
      inTabBlock = true;
      tabBlockEndIndex = i;
    }

    // If we just exited a tab block and this line looks like strumming
    if (inTabBlock && i > tabBlockEndIndex) {
      // Check if this line contains strumming notation
      const strummingMatch = trimmed && STRUMMING_FOOTER_PATTERN.test(trimmed);
      console.log(`[Guitar Parser] Line ${i}: inTabBlock=${inTabBlock}, i > tabBlockEndIndex=${i > tabBlockEndIndex}, strummingMatch=${strummingMatch}, line="${trimmed.substring(0, 40)}..."`);
      if (strummingMatch) {
        console.log(`[Guitar Parser] ✓ Found strumming pattern for section "${currentSection}"`);
        currentPatterns.push(trimmed);
        inTabBlock = false;
      } else if (trimmed && !isTabLine(trimmed)) {
        // Non-strumming, non-tab line after tab block - reset
        console.log(`[Guitar Parser] Non-strumming line after tab, resetting`);
        inTabBlock = false;
      }
    }
  }

  // Save final section
  if (currentPatterns.length > 0) {
    console.log(`[Guitar Parser] Saving final section "${currentSection}" with ${currentPatterns.length} patterns`);
    sections.push({ name: currentSection, patterns: currentPatterns });
  }

  console.log(`[Guitar Parser] Total sections found: ${sections.length}`);
  if (sections.length > 0) {
    return { sections, source: 'footer' };
  }

  return { sections: [], source: 'none' };
}



/**
 * Splits a strumming line into bar phrases.
 * Uses explicit | separators if present, otherwise splits by gaps of 3+ spaces.
 */
function splitIntoBars(pattern: string): string[] {
  // If there are explicit bar separators, use them
  if (pattern.includes('|')) {
    return pattern.split(/\|/).map(b => b.trim()).filter(Boolean);
  }

  // Otherwise, split by gaps of 3+ spaces (visual bar boundaries in tabs)
  const bars = pattern.split(/\s{3,}/).map(b => b.trim()).filter(Boolean);

  if (bars.length > 0) {
    return bars;
  }

  // Fallback: treat the whole thing as one bar
  const trimmed = pattern.trim();
  return trimmed ? [trimmed] : [];
}

/**
 * Parses a single bar phrase into events.
 * A "bar phrase" is like "d d PM" - a compact representation of one bar's strumming.
 * Each strumming element gets normalized to fit 8 positions (8th note feel).
 */
function parseBarPhraseToEvents(phrase: string): ('d' | 'u' | 'PM' | 'rest')[] {
  const events: ('d' | 'u' | 'PM' | 'rest')[] = [];
  const trimmed = phrase.trim();

  if (!trimmed) return events;

  // Parse character by character, preserving position
  let i = 0;
  while (i < trimmed.length) {
    // Check for PM (2 chars)
    if (trimmed.slice(i, i + 2).toUpperCase() === 'PM') {
      events.push('PM');
      i += 2;
    } else if (trimmed[i].toLowerCase() === 'd') {
      events.push('d');
      i++;
    } else if (trimmed[i].toLowerCase() === 'u') {
      events.push('u');
      i++;
    } else if (trimmed[i] === ' ' || trimmed[i] === '.') {
      events.push('rest');
      i++;
    } else {
      // Skip other characters
      i++;
    }
  }

  return events;
}

/**
 * Normalizes a bar's events to 8 positions (standard 8th note bar representation).
 */
function normalizeBarTo8th(events: ('d' | 'u' | 'PM' | 'rest')[]): ('d' | 'u' | 'PM' | 'rest')[] {
  const targetLength = 8;

  if (events.length === 0) {
    return Array(targetLength).fill('rest');
  }

  // If already target length, return as-is
  if (events.length === targetLength) {
    return events;
  }

  // If shorter, pad with rests
  if (events.length < targetLength) {
    return [...events, ...Array(targetLength - events.length).fill('rest')];
  }

  // If longer, compress by sampling
  const ratio = events.length / targetLength;
  const result: ('d' | 'u' | 'PM' | 'rest')[] = [];

  for (let i = 0; i < targetLength; i++) {
    const sourceStart = Math.floor(i * ratio);
    const sourceEnd = Math.floor((i + 1) * ratio);

    // Take the most significant event in this range
    let bestEvent: 'd' | 'u' | 'PM' | 'rest' = 'rest';
    for (let j = sourceStart; j < sourceEnd && j < events.length; j++) {
      if (events[j] !== 'rest') {
        bestEvent = events[j];
        break;
      }
    }
    result.push(bestEvent);
  }

  return result;
}

/**
 * Parses a strumming pattern string into an array of strumming events.
 * Handles bar boundaries and normalizes timing.
 */
function parseStrummingToEvents(pattern: string): ('d' | 'u' | 'PM' | 'rest')[] {
  const bars = splitIntoBars(pattern);

  if (bars.length === 0) {
    return [];
  }

  const allEvents: ('d' | 'u' | 'PM' | 'rest')[] = [];

  for (const bar of bars) {
    // Parse the bar phrase
    const phraseEvents = parseBarPhraseToEvents(bar);
    // Normalize to 8 events per bar (8th note feel, then doubled to 16ths for output)
    const normalizedEvents = normalizeBarTo8th(phraseEvents);
    // Double each event to convert from 8th to 16th note grid
    for (const event of normalizedEvents) {
      allEvents.push(event);
      allEvents.push('rest');
    }
  }

  return allEvents;
}

/**
 * Converts strumming events to darbuka notation based on options.
 */
function convertToDarbuka(
  events: ('d' | 'u' | 'PM' | 'rest')[],
  options: GuitarTabParseOptions
): string {
  let notation = '';

  for (const event of events) {
    switch (event) {
      case 'd':
        notation += options.includeDownstroke ? 'D' : '_';
        break;
      case 'u':
        if (options.includeUpstroke) {
          notation += options.upstrokeAsKa ? 'K' : 'T';
        } else {
          notation += '_';
        }
        break;
      case 'PM':
        notation += options.includePalmMute ? 'S' : '_';
        break;
      case 'rest':
        notation += '_';
        break;
    }
  }

  return notation;
}

/**
 * Normalizes notation to 8th note pairs for cleaner output.
 * Similar to drum tab simplification.
 */
function simplifyToEighthNotes(notation: string): string {
  let result = '';

  for (let i = 0; i < notation.length; i += 2) {
    const pos1 = notation[i] || '_';
    const pos2 = notation[i + 1] || '_';

    const isHit = (c: string) => c === 'D' || c === 'T' || c === 'K' || c === 'S';
    const hit1 = isHit(pos1) ? pos1 : null;
    const hit2 = isHit(pos2) ? pos2 : null;

    if (hit1 && hit2) {
      result += hit1 + hit2;
    } else if (hit1) {
      result += hit1 + '-';
    } else if (hit2) {
      result += '_' + hit2;
    } else {
      result += '__';
    }
  }

  return result;
}

/**
 * Splits notation into measures of 16 sixteenth notes (standard 4/4).
 */
function splitIntoMeasures(notation: string): string[] {
  const measures: string[] = [];
  for (let i = 0; i < notation.length; i += 16) {
    const measure = notation.slice(i, i + 16);
    if (measure.length > 0) {
      measures.push(measure.padEnd(16, '_'));
    }
  }
  return measures;
}

/**
 * Groups consecutive identical measures.
 */
function groupRepeatingMeasures(measures: string[]): ParsedMeasure[] {
  if (measures.length === 0) return [];

  const groups: ParsedMeasure[] = [];
  let currentMeasure = measures[0];
  let count = 1;

  for (let i = 1; i < measures.length; i++) {
    if (measures[i] === currentMeasure) {
      count++;
    } else {
      groups.push({ notation: currentMeasure, count });
      currentMeasure = measures[i];
      count = 1;
    }
  }
  groups.push({ notation: currentMeasure, count });

  return groups;
}

/**
 * Creates a simplified notation showing unique patterns.
 */
function createSimplifiedNotation(groups: ParsedMeasure[]): string {
  const seen = new Set<string>();
  const uniquePatterns: string[] = [];

  for (const group of groups) {
    if (!seen.has(group.notation)) {
      seen.add(group.notation);
      uniquePatterns.push(group.notation);
    }
  }

  return uniquePatterns.join(' ');
}

/**
 * Cleans up the notation to only valid characters.
 */
function cleanupNotation(notation: string): string {
  return notation.replace(/[^DTKS_\-\s]/g, '_');
}

/**
 * Converts a single pattern string to notation.
 */
function convertPatternToNotation(
  pattern: string,
  options: GuitarTabParseOptions
): string {
  const events = parseStrummingToEvents(pattern);
  if (events.length === 0) return '';

  const rawNotation = convertToDarbuka(events, options);
  const eighthNoteNotation = simplifyToEighthNotes(rawNotation);
  return cleanupNotation(eighthNoteNotation);
}

/**
 * Main parser function for guitar tabs.
 */
export function parseGuitarTab(
  text: string,
  options: GuitarTabParseOptions = DEFAULT_GUITAR_OPTIONS
): ParsedGuitarTab {
  // Pre-process text to remove Ultimate Guitar [tab] tags
  // We reassign to 'text' parameter or create a new variable.
  // Since 'text' is an argument, we can reassign it or use a new var.
  // Using cleaner variable name 'cleanText'.
  const cleanText = text.replace(/\[\/?tab\]/gi, '');

  const warnings: string[] = [];

  // Extract strumming patterns by section
  const { sections: rawSections, source } = extractStrummingBySections(cleanText);

  if (source === 'none' || rawSections.length === 0) {
    warnings.push('No strumming pattern found in tab. Look for a line with d/u/PM below the tab grid.');
    return {
      notation: '',
      uniqueMeasures: [],
      simplifiedNotation: '',
      measureCount: 0,
      strummingSource: 'none',
      elementsFound: [],
      sections: [],
      patterns: [],
      warnings,
    };
  }

  // Convert each section's patterns
  const sections: GuitarTabSection[] = [];
  const allMeasures: string[] = [];
  const allEvents: ('d' | 'u' | 'PM' | 'rest')[] = [];

  for (const rawSection of rawSections) {
    const sectionNotations: string[] = [];

    for (const pattern of rawSection.patterns) {
      // Parse this pattern's events
      const patternEvents = parseStrummingToEvents(pattern);
      allEvents.push(...patternEvents);

      // Convert to notation
      const notation = convertPatternToNotation(pattern, options);
      if (notation) {
        sectionNotations.push(notation);
      }
    }

    if (sectionNotations.length > 0) {
      // Join without spaces for proper measure splitting
      const sectionNotationRaw = sectionNotations.join('');

      // Split into measures
      const sectionMeasures = splitIntoMeasures(sectionNotationRaw);
      allMeasures.push(...sectionMeasures);

      // For display, join with spaces
      sections.push({
        name: rawSection.name,
        patterns: rawSection.patterns,
        notation: sectionMeasures.join(' '),
      });
    }
  }

  if (allEvents.length === 0) {
    warnings.push('Could not parse strumming pattern.');
    return {
      notation: '',
      uniqueMeasures: [],
      simplifiedNotation: '',
      measureCount: 0,
      strummingSource: source,
      elementsFound: [],
      sections: [],
      patterns: [],
      warnings,
    };
  }

  // Detect which elements were found
  const elementsFound: ('d' | 'u' | 'PM')[] = [];
  if (allEvents.includes('d')) elementsFound.push('d');
  if (allEvents.includes('u')) elementsFound.push('u');
  if (allEvents.includes('PM')) elementsFound.push('PM');

  // Check if any selected options are actually present
  const hasDownstroke = options.includeDownstroke && allEvents.includes('d');
  const hasUpstroke = options.includeUpstroke && allEvents.includes('u');
  const hasPalmMute = options.includePalmMute && allEvents.includes('PM');

  if (!hasDownstroke && !hasUpstroke && !hasPalmMute) {
    warnings.push('No selected strumming elements found in pattern.');
    return {
      notation: '',
      uniqueMeasures: [],
      simplifiedNotation: '',
      measureCount: 0,
      strummingSource: source,
      elementsFound,
      sections,
      patterns: [],
      warnings,
    };
  }

  // Group repeating measures
  const groups = groupRepeatingMeasures(allMeasures);

  // Create outputs
  const fullNotation = allMeasures.join(' ');
  const simplifiedNotation = createSimplifiedNotation(groups);

  // Calculate patterns
  const patternCounts = new Map<string, number>();
  for (const measure of allMeasures) {
    const trimmed = measure.trim();
    patternCounts.set(trimmed, (patternCounts.get(trimmed) || 0) + 1);
  }

  const patterns: DrumPattern[] = Array.from(patternCounts.entries())
    .map(([notation, count]) => ({
      notation,
      count,
      frequency: count / allMeasures.length,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    notation: fullNotation,
    uniqueMeasures: groups,
    simplifiedNotation,
    measureCount: allMeasures.length,
    strummingSource: source,
    elementsFound,
    sections,
    patterns,
    warnings,
  };
}
