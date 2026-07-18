import type { SketchbookSeedKind } from '../types';

export type SketchbookImportItem = {
  kind: SketchbookSeedKind;
  title: string;
  bodyHtml?: string;
  occurredOn?: string;
};

export type SketchbookImportFileResult = {
  fileName: string;
  items: SketchbookImportItem[];
  /** Lines/entries that could not be parsed (JSONL) — surfaced as an import warning. */
  skippedCount: number;
};

const HEADING_RE = /^##\s+(.+?)\s*$/;
const MONTH_NAMES: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/** Parses `Dec 23, 2025` / `December 23, 2025` / `2025-12-23` into an ISO `YYYY-MM-DD`. Returns undefined if unrecognized. */
export function parseFlashDateToIso(raw: string): string | undefined {
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const wordMatch = trimmed.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (wordMatch) {
    const [, monthWord, day, year] = wordMatch;
    const month = MONTH_NAMES[monthWord!.slice(0, 3).toLowerCase()];
    if (month) return `${year}-${month}-${day!.padStart(2, '0')}`;
  }

  return undefined;
}

/**
 * Parses the Sketchbook bulk-import Markdown convention:
 *
 * ```
 * ## Daily Flash 87 - Dec 23, 2025 - A group of friends
 * Body text until the next heading…
 * ```
 *
 * Each `##` heading starts a new entry. Text before the first heading is ignored unless
 * the file has no headings at all, in which case the whole file becomes one idea.
 */
export function parseSketchbookMarkdownImport(text: string): SketchbookImportItem[] {
  const lines = text.split(/\r?\n/);
  const items: SketchbookImportItem[] = [];

  let currentHeading: string | null = null;
  let currentBody: string[] = [];
  let sawHeading = false;

  const flush = (): void => {
    if (currentHeading === null) return;
    items.push(buildDailyFlashFromHeading(currentHeading, currentBody.join('\n').trim()));
  };

  for (const line of lines) {
    const match = line.match(HEADING_RE);
    if (match) {
      flush();
      sawHeading = true;
      currentHeading = match[1]!;
      currentBody = [];
    } else if (currentHeading !== null) {
      currentBody.push(line);
    }
  }
  flush();

  if (!sawHeading) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const firstLine = trimmed.split(/\r?\n/)[0]!.trim();
    const rest = trimmed.slice(firstLine.length).trim();
    return [
      {
        kind: 'idea',
        title: firstLine.slice(0, 120) || 'Untitled idea',
        bodyHtml: rest || undefined,
      },
    ];
  }

  return items;
}

function buildDailyFlashFromHeading(heading: string, body: string): SketchbookImportItem {
  const parts = heading.split(/\s+-\s+/);
  const label = parts[0]?.trim();
  const dateStr = parts[1]?.trim();
  const titlePart = parts.length > 2 ? parts.slice(2).join(' - ').trim() : undefined;
  const occurredOn = dateStr ? parseFlashDateToIso(dateStr) : undefined;

  const title = titlePart && label ? `${label} - ${titlePart}` : titlePart || label || heading;

  return {
    kind: 'daily_flash',
    title: title.slice(0, 160),
    bodyHtml: body || undefined,
    occurredOn,
  };
}

type SketchbookJsonlRow = {
  title?: unknown;
  body?: unknown;
  createdAt?: unknown;
};

/**
 * Parses one JSON object per line: `{"title":"...","body":"...","createdAt":"2025-12-23"}`.
 * Blank lines are skipped. Lines that fail to parse or lack a usable title are counted as skipped.
 */
export function parseSketchbookJsonlImport(text: string): { items: SketchbookImportItem[]; skippedCount: number } {
  const items: SketchbookImportItem[] = [];
  let skippedCount = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    let row: SketchbookJsonlRow;
    try {
      row = JSON.parse(line) as SketchbookJsonlRow;
    } catch {
      skippedCount += 1;
      continue;
    }

    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const body = typeof row.body === 'string' ? row.body.trim() : '';
    if (!title && !body) {
      skippedCount += 1;
      continue;
    }

    const occurredOn = typeof row.createdAt === 'string' ? parseFlashDateToIso(row.createdAt.trim()) ?? row.createdAt.trim() : undefined;

    items.push({
      kind: 'daily_flash',
      title: (title || body.split('\n')[0] || 'Untitled flash').slice(0, 160),
      bodyHtml: body || undefined,
      occurredOn,
    });
  }

  return { items, skippedCount };
}

export function isSketchbookImportFileName(fileName: string): boolean {
  return /\.(md|txt|jsonl)$/i.test(fileName);
}

/** Dispatches on file extension. Returns `null` for unsupported extensions (e.g. `.pdf`). */
export function parseSketchbookImportFile(fileName: string, text: string): SketchbookImportFileResult | null {
  if (/\.jsonl$/i.test(fileName)) {
    const { items, skippedCount } = parseSketchbookJsonlImport(text);
    return { fileName, items, skippedCount };
  }
  if (/\.(md|txt)$/i.test(fileName)) {
    return { fileName, items: parseSketchbookMarkdownImport(text), skippedCount: 0 };
  }
  return null;
}
