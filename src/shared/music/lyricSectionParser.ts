import type { SongSectionType } from './songSections';

export interface ParsedLyricSectionDraft {
  type: SongSectionType;
  title: string;
  lyrics: string;
  normalizedLyrics: string;
  suggestedChorusLink: boolean;
}

const HEADER_REGEX =
  /^\s*\[?\s*(verse|chorus|bridge|intro|outro|pre-chorus)(?:\s+\d+)?\s*\]?\s*[:-]?\s*$/i;

function normalizeLyrics(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionTypeFromHeader(raw: string): SongSectionType {
  const value = raw.toLowerCase();
  if (value.includes('chorus') || value.includes('pre-chorus')) return 'chorus';
  if (value.includes('bridge') || value.includes('outro')) return 'bridge';
  return 'verse';
}

function inferPatternType(index: number): SongSectionType {
  const pattern: SongSectionType[] = [
    'verse',
    'chorus',
    'verse',
    'chorus',
    'bridge',
    'chorus',
  ];
  if (index < pattern.length) return pattern[index];
  return index % 2 === 0 ? 'verse' : 'chorus';
}

function splitByExplicitHeaders(input: string): ParsedLyricSectionDraft[] {
  const lines = input.split(/\r?\n/);
  const drafts: ParsedLyricSectionDraft[] = [];
  let currentType: SongSectionType | null = null;
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    const lyrics = currentLines.join('\n').trim();
    if (!lyrics || !currentType) return;
    drafts.push({
      type: currentType,
      title: currentTitle || currentType,
      lyrics,
      normalizedLyrics: normalizeLyrics(lyrics),
      suggestedChorusLink: false,
    });
  };

  lines.forEach((line) => {
    const match = line.match(HEADER_REGEX);
    if (match) {
      flush();
      currentType = sectionTypeFromHeader(match[1] ?? '');
      currentTitle = line.trim().replace(/[:-]+$/, '');
      currentLines = [];
      return;
    }
    currentLines.push(line);
  });
  flush();
  return drafts;
}

function splitByParagraphs(input: string): ParsedLyricSectionDraft[] {
  const blocks = input
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.map((lyrics, index) => ({
    type: inferPatternType(index),
    title: `Section ${index + 1}`,
    lyrics,
    normalizedLyrics: normalizeLyrics(lyrics),
    suggestedChorusLink: false,
  }));
}

export function looksLikeFullSongLyrics(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const explicitHeaderCount = trimmed
    .split(/\r?\n/)
    .filter((line) => HEADER_REGEX.test(line)).length;
  if (explicitHeaderCount >= 2) return true;
  const blocks = trimmed.split(/\n\s*\n+/).filter((block) => block.trim().length > 0);
  if (blocks.length >= 3) return true;
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.length >= 12 && blocks.length >= 2;
}

export function parseLyricSections(input: string): ParsedLyricSectionDraft[] {
  const explicit = splitByExplicitHeaders(input);
  const baseDrafts = explicit.length > 0 ? explicit : splitByParagraphs(input);
  if (baseDrafts.length === 0) return [];

  const counts = new Map<string, number>();
  baseDrafts.forEach((draft) => {
    if (!draft.normalizedLyrics) return;
    counts.set(draft.normalizedLyrics, (counts.get(draft.normalizedLyrics) ?? 0) + 1);
  });

  let firstChorusIndex = -1;
  const withInferredTypes = baseDrafts.map((draft, index) => {
    const repeated = (counts.get(draft.normalizedLyrics) ?? 0) >= 2;
    let type = draft.type;
    if (repeated) type = 'chorus';
    if (firstChorusIndex < 0 && type === 'chorus') firstChorusIndex = index;
    return { ...draft, type };
  });

  if (firstChorusIndex < 0 && withInferredTypes.length >= 2) {
    firstChorusIndex = 1;
    withInferredTypes[1] = { ...withInferredTypes[1], type: 'chorus' };
  }

  const bridgeIndex = withInferredTypes.length >= 5 ? withInferredTypes.length - 2 : -1;
  if (
    bridgeIndex >= 0 &&
    withInferredTypes[bridgeIndex] &&
    withInferredTypes[bridgeIndex].type !== 'chorus'
  ) {
    withInferredTypes[bridgeIndex] = {
      ...withInferredTypes[bridgeIndex],
      type: 'bridge',
    };
  }

  const seenChorusLyrics = new Set<string>();
  return withInferredTypes.map((draft) => {
    if (draft.type !== 'chorus') return draft;
    const shouldLink =
      draft.normalizedLyrics.length > 0 && seenChorusLyrics.has(draft.normalizedLyrics);
    seenChorusLyrics.add(draft.normalizedLyrics);
    return { ...draft, suggestedChorusLink: shouldLink };
  });
}
