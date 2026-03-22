export function computeCompletionPadMeasures(
  baseMeasureCount: number,
  progressionLength: number
): number {
  if (baseMeasureCount <= 0 || progressionLength <= 1) return 0;
  return (progressionLength - (baseMeasureCount % progressionLength)) % progressionLength;
}

export function buildSectionChordSymbols(
  progressionChordSymbols: string[],
  sectionMeasureCount: number,
  totalMeasureCount: number = sectionMeasureCount
): string[] {
  const safeSectionMeasureCount = Math.max(0, sectionMeasureCount);
  const safeTotalMeasureCount = Math.max(safeSectionMeasureCount, totalMeasureCount);
  const progressionLength = progressionChordSymbols.length;
  if (progressionLength === 0 || safeTotalMeasureCount === 0) return [];

  const symbols: string[] = [];
  for (let offset = 0; offset < safeSectionMeasureCount; offset += 1) {
    symbols.push(progressionChordSymbols[offset % progressionLength] ?? '');
  }

  if (safeTotalMeasureCount > safeSectionMeasureCount) {
    const lastSectionChord =
      symbols[Math.max(0, safeSectionMeasureCount - 1)] ??
      progressionChordSymbols[Math.max(0, progressionLength - 1)] ??
      '';
    while (symbols.length < safeTotalMeasureCount) {
      symbols.push(lastSectionChord);
    }
  }

  return symbols;
}
