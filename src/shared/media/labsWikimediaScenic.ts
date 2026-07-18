import { classifyWikimediaLicense, type LabsWikimediaLicenseFilter } from './wikimediaLicense';

/** A single Wikimedia Commons search result. */
export type LabsWikimediaImageResult = {
  title: string;
  url: string;
  thumbUrl?: string;
  license: string;
};

/** Scenic seeds when Random has no search query — favor photo-like backgrounds. */
export const RANDOM_SCENIC_QUERIES = [
  'city street photograph',
  'forest path landscape',
  'beach horizon photograph',
  'mountain landscape photograph',
  'rainy street photograph',
  'park pathway photograph',
  'skyline photograph',
  'countryside field photograph',
  'cafe interior photograph',
  'library interior photograph',
  'bridge city photograph',
  'desert landscape photograph',
] as const;

interface WikimediaApiPage {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
}

interface WikimediaApiResponse {
  query?: { pages?: Record<string, WikimediaApiPage> };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

function pagesToResults(pages: Record<string, WikimediaApiPage>): LabsWikimediaImageResult[] {
  const next: LabsWikimediaImageResult[] = [];
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    const mime = info.mime ?? '';
    if (mime && !mime.startsWith('image/')) continue;
    if (mime.includes('svg')) continue;
    const licenseRaw = info.extmetadata?.LicenseShortName?.value ?? 'See Commons';
    next.push({
      title: (page.title ?? 'Image').replace(/^File:/, ''),
      url: info.url,
      thumbUrl: info.thumburl,
      license: stripHtml(licenseRaw),
    });
  }
  return next;
}

export async function fetchWikimediaResults(query: string): Promise<LabsWikimediaImageResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '160',
    origin: '*',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error('request failed');
  const data = (await res.json()) as WikimediaApiResponse;
  return pagesToResults(data.query?.pages ?? {});
}

function pickRandom<T>(items: readonly T[], seed?: number): T | undefined {
  if (items.length === 0) return undefined;
  if (seed === undefined) return items[Math.floor(Math.random() * items.length)];
  return items[Math.abs(seed) % items.length];
}

export function filterWikimediaResultsByLicense(
  results: LabsWikimediaImageResult[],
  licenseFilter: LabsWikimediaLicenseFilter,
): LabsWikimediaImageResult[] {
  if (licenseFilter === 'any') return results;
  return results.filter((result) => classifyWikimediaLicense(result.license) === licenseFilter);
}

/**
 * Scenic Commons pick for a specific search query (story scene / dialogue keyword bias).
 * Prefer filtered licenses when present; otherwise any result from the query.
 */
export async function fetchScenicWikimediaImageForQuery(
  query: string,
  seed = Date.now(),
  licenseFilter: LabsWikimediaLicenseFilter = 'any',
): Promise<LabsWikimediaImageResult | null> {
  const q = query.trim() || pickRandom(RANDOM_SCENIC_QUERIES, seed) || 'landscape photograph';
  const next = await fetchWikimediaResults(q);
  const licensed = filterWikimediaResultsByLicense(next, licenseFilter);
  const pool = licensed.length > 0 ? licensed : next;
  return pickRandom(pool, seed >> 3) ?? null;
}

/**
 * One scenic Commons pick for Scrapboard Randomize-all / Random buttons.
 * Prefer filtered licenses when present; otherwise any result from the scenic query.
 */
export async function fetchRandomScenicWikimediaImage(
  seed = Date.now(),
  licenseFilter: LabsWikimediaLicenseFilter = 'any',
): Promise<LabsWikimediaImageResult | null> {
  const q = pickRandom(RANDOM_SCENIC_QUERIES, seed) ?? 'landscape photograph';
  return fetchScenicWikimediaImageForQuery(q, seed, licenseFilter);
}
