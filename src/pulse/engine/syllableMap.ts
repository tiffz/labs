export interface SyllableEntry {
  label: string;
  sampleId: string;
}

const COUNTING_TABLES: Record<number, Array<{ label: string; sampleId: string }>> = {
  2: [{ label: '+', sampleId: 'and' }],
  3: [
    { label: '+', sampleId: 'and' },
    { label: 'a', sampleId: 'uh' },
  ],
  4: [
    { label: 'e', sampleId: 'ee' },
    { label: '+', sampleId: 'and' },
    { label: 'a', sampleId: 'uh' },
  ],
  6: [
    { label: 'e', sampleId: 'ee' },
    { label: '+', sampleId: 'and' },
    { label: 'e', sampleId: 'ee' },
    { label: '+', sampleId: 'and' },
    { label: 'a', sampleId: 'uh' },
  ],
};

const TAKADIMI_CYCLE = ['ta', 'ka', 'di', 'mi'] as const;

const TAKADIMI_TABLES: Record<number, string[]> = {
  1: ['ta'],
  2: ['ta', 'di'],
  3: ['ta', 'ki', 'da'],
  4: ['ta', 'ka', 'di', 'mi'],
};

/**
 * Unified counting-mode syllable mapping for a single box inside a beat group.
 *
 * @param groupLength  Total number of boxes in this group (L).
 * @param index        0-based position of the box within the group.
 * @param beatNumber   1-indexed beat number for the group-start box.
 */
export function syllableForPosition(
  groupLength: number,
  index: number,
  beatNumber: number,
): SyllableEntry {
  if (index === 0) {
    return {
      label: String(beatNumber),
      sampleId: `beat-${Math.min(beatNumber, 12)}`,
    };
  }

  const table = COUNTING_TABLES[groupLength];
  if (table && index - 1 < table.length) {
    return table[index - 1];
  }

  // Numeric fallback for L=5, 7+
  return {
    label: String(index + 1),
    sampleId: `beat-${Math.min(index + 1, 12)}`,
  };
}

/**
 * Takadimi-mode label for a single box inside a beat group.
 * Uses standard takadimi patterns for L=1..4, cycles for larger groups.
 */
export function takadimiLabelForPosition(
  groupLength: number,
  index: number,
): string {
  const table = TAKADIMI_TABLES[groupLength];
  if (table) return table[index];
  return TAKADIMI_CYCLE[index % TAKADIMI_CYCLE.length];
}
