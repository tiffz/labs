/** Human-readable label for a booklet page number (Mixam / Zine Studio naming). */
export function getBookletPageLabel(pageNum: number): string {
  if (pageNum === 0) return 'Front Cover';
  if (pageNum === -0.5) return 'Inner Front';
  if (pageNum === -1) return 'Inner Back';
  if (pageNum === -2 || pageNum === -3) return 'Back Cover';
  if (pageNum > 0) return `Page ${pageNum}`;
  return `Page ${pageNum}`;
}

/** Reverse of {@link getBookletPageLabel} for Lyrefly display names. */
export function labelToBookletPageNumber(label: string): number | null {
  const trimmed = label.trim();
  if (trimmed === 'Front Cover') return 0;
  if (trimmed === 'Inner Front') return -0.5;
  if (trimmed === 'Inner Back') return -1;
  if (trimmed === 'Back Cover') return -2;
  const pageMatch = trimmed.match(/^Page (\d+)$/i);
  if (pageMatch) return Number(pageMatch[1]);
  return null;
}

/** Parse spread display names like "Back Cover - Front Cover". */
export function spreadLabelsToPagePair(label: string): [number, number] | null {
  const parts = label.split(' - ').map((part) => part.trim());
  if (parts.length !== 2) return null;
  const left = labelToBookletPageNumber(parts[0]!);
  const right = labelToBookletPageNumber(parts[1]!);
  if (left === null || right === null) return null;
  return [left, right];
}

/** Filename stem for a booklet page number (parsed by {@link extractPageNumber}). */
export function getBookletPageFileStem(pageNum: number): string {
  if (pageNum === 0) return 'front';
  if (pageNum === -0.5) return 'innerfront';
  if (pageNum === -1) return 'innerback';
  if (pageNum === -2 || pageNum === -3) return 'back';
  return `page${pageNum}`;
}
