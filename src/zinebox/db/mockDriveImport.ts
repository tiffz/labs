import { zineboxDb } from './zineboxDb';
import type { ZineboxComic, ZineboxReadStatus } from '../types';

const SOURCES = ['Shortbox', 'Itch.io', 'Gumroad', 'Silver Sprocket'] as const;

const SOURCE_COLORS: Record<(typeof SOURCES)[number], string> = {
  Shortbox: '#c4c0d4',
  'Itch.io': '#d4b8b8',
  Gumroad: '#dfc4d4',
  'Silver Sprocket': '#b8cfc0',
};

const TITLES = [
  'Issue 01 — Opening Night',
  'Issue 02 — Ghost Lines',
  'Issue 03 — Night Market',
  'Issue 04 — Static Bloom',
  'Issue 05 — Paper Sun',
  'Issue 06 — Hollow City',
  'Issue 07 — Signal Fire',
  'Issue 08 — Quiet Riot',
  'Issue 09 — Moon Pool',
  'Issue 10 — Last Train',
  'Issue 11 — Soft Circuit',
  'Issue 12 — Red Weather',
  'Issue 01 — Starter Pack',
  'Issue 02 — Field Notes',
  'Issue 03 — Ink Storm',
  'Issue 04 — Side Quest',
  'Issue 05 — Deep Cut',
  'Issue 06 — After Hours',
  'Issue 07 — Pocket Universe',
  'Issue 08 — Final Form',
];

function makeCoverThumbnail(source: string, title: string): string {
  const color = SOURCE_COLORS[source as keyof typeof SOURCE_COLORS] ?? '#ff1493';
  const label = title.replace(/^Issue \d+ — /, '').slice(0, 12);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240" viewBox="0 0 160 240">
    <rect width="160" height="240" fill="${color}"/>
    <rect x="12" y="12" width="136" height="216" fill="#fdfcfb" stroke="#c8c4be" stroke-width="1"/>
    <text x="20" y="48" font-family="Inter, sans-serif" font-size="10" fill="#9c9691">${source}</text>
    <text x="20" y="120" font-family="Inter, sans-serif" font-size="13" font-weight="500" fill="#484440">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function readStatusForIndex(index: number): ZineboxReadStatus {
  if (index % 5 === 0) return 'finished';
  if (index % 3 === 0) return 'in_progress';
  return 'unread';
}

function progressForStatus(status: ZineboxReadStatus, index: number): number {
  if (status === 'finished') return 100;
  if (status === 'in_progress') return 20 + (index % 4) * 15;
  return 0;
}

export function buildMockComics(): ZineboxComic[] {
  return TITLES.map((title, index) => {
    const source = SOURCES[index % SOURCES.length] ?? 'Shortbox';
    const issueNum = String((index % 12) + 1).padStart(2, '0');
    const readStatus = readStatusForIndex(index);
    return {
      id: `comic-${index + 1}`,
      title,
      source,
      fileId: `drive-file-${index + 1}`,
      filename: `issue-${issueNum}.pdf`,
      coverThumbnailBase64: makeCoverThumbnail(source, title),
      readStatus,
      progressPercentage: progressForStatus(readStatus, index),
      storageKind: 'sample',
      tags: source === 'Shortbox' ? ['Shortbox', 'sample'] : ['sample'],
    };
  });
}

export async function mockImportFromDrive(options?: { force?: boolean }): Promise<number> {
  const existing = await zineboxDb.comics.count();
  if (existing > 0 && !options?.force) return existing;

  if (options?.force) {
    await zineboxDb.comics.clear();
  }

  const comics = buildMockComics();
  await zineboxDb.comics.bulkPut(comics);
  return comics.length;
}
