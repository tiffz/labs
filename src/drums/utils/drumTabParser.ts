/**
 * Drum Tab Parser
 *
 * Parses Ultimate Guitar drum tab format and converts to darbuka notation.
 * Maps Western drum components to darbuka sounds:
 * - BD (Bass Drum) -> D (Dum)
 * - SD (Snare Drum) -> T (Tek)
 * - HH (Hi-Hat) -> K (Ka) - only on beats where BD/SD don't play
 */

/** Drum component codes found in tabs */
const DRUM_COMPONENTS = ['BD', 'SD', 'HH', 'CC', 'RC', 'ST', 'LT', 'FT', 'SR'] as const;
type DrumComponent = (typeof DRUM_COMPONENTS)[number];

/** Characters that indicate a hit on that beat */
const HIT_CHARS = new Set(['o', 'O', 'x', 'X']);

/** Characters that indicate a double hit (two sixteenths) */
const DOUBLE_HIT_CHARS = new Set(['d', 'D']);

/** Pattern to match a drum component line */
const DRUM_LINE_PATTERN = /^(BD|SD|HH|CC|RC|ST|LT|FT|SR)\s+(.+)$/i;

/** Pattern to detect if text looks like a drum tab */
const DRUM_TAB_DETECTION_PATTERN = /^(BD|SD|HH|CC|RC|ST|LT|FT|SR)\s+[-xoXO|d\s]+$/im;

export interface ParsedMeasure {
  notation: string;
  count: number; // How many times this pattern repeats consecutively
}

export interface DrumTabParseOptions {
  /** Include bass drum (BD) hits as D. Default: true */
  includeBass: boolean;
  /** Include snare drum (SD) hits as T. Default: true */
  includeSnare: boolean;
  /** Include hi-hat (HH) hits as K. Default: false */
  includeHiHat: boolean;
}

export const DEFAULT_PARSE_OPTIONS: DrumTabParseOptions = {
  includeBass: true,
  includeSnare: true,
  includeHiHat: false,
};

export interface ParsedDrumTab {
  /** The converted darbuka notation (full) */
  notation: string;
  /** Unique measures with repeat counts */
  uniqueMeasures: ParsedMeasure[];
  /** Simplified notation showing just unique patterns */
  simplifiedNotation: string;
  /** Number of measures detected */
  measureCount: number;
  /** Which drum components were found in the tab */
  componentsFound: DrumComponent[];
  /** Any warnings during parsing */
  warnings: string[];
}

/**
 * Detects if the given text appears to be a drum tab format.
 */
export function isDrumTab(text: string): boolean {
  if (!text || text.length < 10) return false;

  const lines = text.split('\n');
  let drumLineCount = 0;
  let hasBarseparator = false;

  for (const line of lines) {
    if (DRUM_TAB_DETECTION_PATTERN.test(line.trim())) {
      drumLineCount++;
    }
    if (line.includes('|')) {
      hasBarseparator = true;
    }
  }

  return drumLineCount >= 2 && hasBarseparator;
}

/**
 * Extracts timing data for each component, properly handling continuations.
 */
function extractDrumData(text: string): Map<DrumComponent, string> {
  const result = new Map<DrumComponent, string>();
  const lines = text.split('\n');

  let blockComponentOrder: DrumComponent[] = [];
  let blockData = new Map<DrumComponent, string>();
  let continuationIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (blockData.size > 0) {
        for (const [comp, data] of blockData) {
          const existing = result.get(comp) || '';
          result.set(comp, existing + data);
        }
        blockData = new Map();
        blockComponentOrder = [];
        continuationIndex = 0;
      }
      continue;
    }

    const match = trimmed.match(DRUM_LINE_PATTERN);
    if (match) {
      const component = match[1].toUpperCase() as DrumComponent;
      const timing = match[2];

      if (!blockComponentOrder.includes(component)) {
        blockComponentOrder.push(component);
      }
      blockData.set(component, (blockData.get(component) || '') + timing);
      continuationIndex = 0;
    } else if (blockComponentOrder.length > 0 && trimmed.match(/^[-xoXO|d\s]+$/)) {
      if (continuationIndex < blockComponentOrder.length) {
        const component = blockComponentOrder[continuationIndex];
        blockData.set(component, (blockData.get(component) || '') + trimmed);
        continuationIndex++;
        if (continuationIndex >= blockComponentOrder.length) {
          continuationIndex = 0;
        }
      }
    } else if (blockData.size > 0) {
      for (const [comp, data] of blockData) {
        const existing = result.get(comp) || '';
        result.set(comp, existing + data);
      }
      blockData = new Map();
      blockComponentOrder = [];
      continuationIndex = 0;
    }
  }

  if (blockData.size > 0) {
    for (const [comp, data] of blockData) {
      const existing = result.get(comp) || '';
      result.set(comp, existing + data);
    }
  }

  return result;
}

/**
 * Cleans a timing string by removing bar separators and normalizing.
 * Returns an array of hit positions (true = hit, false = no hit).
 */
function parseTimingToHits(timing: string): boolean[] {
  const hits: boolean[] = [];

  for (const char of timing) {
    if (char === '|' || char === ' ') {
      continue;
    }
    if (HIT_CHARS.has(char) || DOUBLE_HIT_CHARS.has(char)) {
      hits.push(true);
      // For double hits, add an extra hit
      if (DOUBLE_HIT_CHARS.has(char)) {
        hits.push(true);
      }
    } else {
      hits.push(false);
    }
  }

  return hits;
}

/**
 * Converts hit arrays to darbuka notation based on selected options.
 * Priority order: BD (D) > SD (T) > HH (K)
 * Only includes components that are enabled in options.
 */
function convertToDarbuka(
  bdHits: boolean[],
  sdHits: boolean[],
  hhHits: boolean[],
  maxLength: number,
  options: DrumTabParseOptions
): string {
  let notation = '';

  for (let i = 0; i < maxLength; i++) {
    const hasBd = options.includeBass && (bdHits[i] || false);
    const hasSd = options.includeSnare && (sdHits[i] || false);
    const hasHh = options.includeHiHat && (hhHits[i] || false);

    // Priority: BD > SD > HH
    if (hasBd) {
      notation += 'D';
    } else if (hasSd) {
      notation += 'T';
    } else if (hasHh) {
      notation += 'K';
    } else {
      notation += '_';
    }
  }

  return notation;
}

/**
 * Simplifies notation while preserving important 16th note details.
 * - If both positions have hits → output both (e.g., "DD", "DT", "KK")
 * - If only first has hit → output 8th note (e.g., "D-", "K-")
 * - If only second has hit → output offbeat (e.g., "_D", "_K")
 * - If neither has hit → output 8th rest ("__")
 * 
 * This preserves double-hits like "oo" in drum tabs as "DD" in darbuka notation.
 * Priority when combining: D > T > K
 */
function simplifyToEighthNotes(notation: string): string {
  let result = '';
  
  for (let i = 0; i < notation.length; i += 2) {
    const pos1 = notation[i] || '_';
    const pos2 = notation[i + 1] || '_';
    
    // Check for hits (D, T, or K)
    const isHit = (c: string) => c === 'D' || c === 'T' || c === 'K';
    const hit1 = isHit(pos1) ? pos1 : null;
    const hit2 = isHit(pos2) ? pos2 : null;
    
    if (hit1 && hit2) {
      // Both positions have hits - output both (preserves "oo" → "DD")
      result += hit1 + hit2;
    } else if (hit1) {
      // Only first position has hit - extend to 8th note
      result += hit1 + '-';
    } else if (hit2) {
      // Only second position has hit - offbeat 16th
      result += '_' + hit2;
    } else {
      // Both rests
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
  // 16 sixteenth notes per measure in 4/4
  for (let i = 0; i < notation.length; i += 16) {
    const measure = notation.slice(i, i + 16);
    if (measure.length > 0) {
      // Pad incomplete measures
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
  // Get unique patterns (deduplicated)
  const seen = new Set<string>();
  const uniquePatterns: string[] = [];

  for (const group of groups) {
    if (!seen.has(group.notation)) {
      seen.add(group.notation);
      uniquePatterns.push(group.notation);
    }
  }

  // Join with spaces between measures
  return uniquePatterns.join(' ');
}

/**
 * Cleans up the notation.
 * Valid characters: D, T, K, - (extension), _ (rest), and whitespace.
 */
function cleanupNotation(notation: string): string {
  // Just ensure we only have valid characters
  return notation.replace(/[^DTK_\-\s]/g, '_');
}

/**
 * Main parser function.
 */
export function parseDrumTab(
  text: string,
  options: DrumTabParseOptions = DEFAULT_PARSE_OPTIONS
): ParsedDrumTab {
  const warnings: string[] = [];
  const drumData = extractDrumData(text);

  const componentsFound: DrumComponent[] = [];
  for (const comp of DRUM_COMPONENTS) {
    if (drumData.has(comp)) {
      componentsFound.push(comp);
    }
  }

  const bdData = drumData.get('BD');
  const sdData = drumData.get('SD');
  const hhData = drumData.get('HH');

  // Check if we have any of the selected components
  const hasBd = options.includeBass && bdData;
  const hasSd = options.includeSnare && sdData;
  const hasHh = options.includeHiHat && hhData;

  if (!hasBd && !hasSd && !hasHh) {
    warnings.push('No selected drum components found in tab');
    return {
      notation: '',
      uniqueMeasures: [],
      simplifiedNotation: '',
      measureCount: 0,
      componentsFound,
      warnings,
    };
  }

  // Parse timing data
  const bdHits = bdData ? parseTimingToHits(bdData) : [];
  const sdHits = sdData ? parseTimingToHits(sdData) : [];
  const hhHits = hhData ? parseTimingToHits(hhData) : [];

  // Find the shortest length to ensure alignment
  // Only consider lengths of components that are enabled
  const lengths: number[] = [];
  if (options.includeBass && bdHits.length > 0) lengths.push(bdHits.length);
  if (options.includeSnare && sdHits.length > 0) lengths.push(sdHits.length);
  if (options.includeHiHat && hhHits.length > 0) lengths.push(hhHits.length);
  
  const maxLength = lengths.length > 0 ? Math.min(...lengths) : 0;

  if (maxLength === 0) {
    warnings.push('No timing data found in tab');
    return {
      notation: '',
      uniqueMeasures: [],
      simplifiedNotation: '',
      measureCount: 0,
      componentsFound,
      warnings,
    };
  }

  // Convert to darbuka notation (16th notes)
  const rawNotation = convertToDarbuka(bdHits, sdHits, hhHits, maxLength, options);

  // Simplify to 8th notes for cleaner output
  const eighthNoteNotation = simplifyToEighthNotes(rawNotation);

  // Split into measures (16 sixteenth notes per measure)
  const measures = splitIntoMeasures(eighthNoteNotation);

  // Clean up each measure
  const cleanedMeasures = measures.map(m => cleanupNotation(m));

  // Group repeating measures
  const groups = groupRepeatingMeasures(cleanedMeasures);

  // Create outputs
  const fullNotation = cleanedMeasures.join(' ');
  const simplifiedNotation = createSimplifiedNotation(groups);

  return {
    notation: fullNotation,
    uniqueMeasures: groups,
    simplifiedNotation,
    measureCount: measures.length,
    componentsFound,
    warnings,
  };
}

