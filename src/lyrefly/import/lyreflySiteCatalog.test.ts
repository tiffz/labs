// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseAndSortPageFiles } from '../../shared/zine/pageFileParser';
import { readComicsYamlPages, readSiteCatalog, SiteCatalogError } from './lyreflySiteCatalog';

// Trimmed copies of what the two live sites served on 2026-10-26 (image placeholders removed).
const fixture = (name: string): string => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');
const json = (name: string): unknown => JSON.parse(fixture(name));

describe('tiffatiel.com (one YAML entry per comic)', () => {
  const catalog = readSiteCatalog(
    'https://tiffatiel.com/',
    json('tiffatiel-index.page-data.json'),
    fixture('tiffatiel-home.html'),
  );

  it('credits the pen name from the footer', () => {
    expect(catalog.personaName).toBe('Tiffatiel');
  });

  it('finds all five comics with stable keys', () => {
    expect(catalog.comics.map((c) => c.key)).toEqual([
      'tiffatiel.com:perfect-wedding',
      'tiffatiel.com:between-walks',
      'tiffatiel.com:i-like-you',
      'tiffatiel.com:mayas-best-friend',
      'tiffatiel.com:elizas-wish',
    ]);
  });

  it('turns post links into publications and leaves the date unknown, not invented', () => {
    const wedding = catalog.comics.find((c) => c.key === 'tiffatiel.com:perfect-wedding')!;
    expect(wedding.publications.map((p) => p.platform).sort()).toEqual(
      ['Bluesky', 'Mixam', 'Tapas', 'Tumblr', 'WEBTOON', 'Website', 'X'].sort(),
    );
    expect(wedding.publications.every((p) => p.publishedAt === '')).toBe(true);
    expect(wedding.seriesKey).toBeUndefined();
  });

  it('makes Between Walks a series that owns its four accounts, not a pen name', () => {
    expect(catalog.series).toEqual([{ key: 'tiffatiel.com:between-walks', title: 'Between Walks' }]);
    const seriesAccounts = catalog.accounts.filter((a) => a.owner.kind === 'series');
    expect(seriesAccounts.map((a) => `${a.platform}:${a.handle}`).sort()).toEqual(
      ['Facebook:betweenwalks', 'Instagram:betweenwalks', 'Tumblr:betweenwalks.art', 'X:betweenwalks'].sort(),
    );
    const walks = catalog.comics.find((c) => c.key === 'tiffatiel.com:between-walks')!;
    expect(walks.seriesKey).toBe('tiffatiel.com:between-walks');
    // Its print listing is still a publication.
    expect(walks.publications.map((p) => p.platform)).toContain('Mixam');
  });

  it('gives the pen name the site and the six footer accounts (email is not an account)', () => {
    const personaAccounts = catalog.accounts.filter((a) => a.owner.kind === 'persona');
    expect(personaAccounts.map((a) => `${a.platform}:${a.handle}`).sort()).toEqual(
      [
        'Bluesky:tiffatiel.bsky.social',
        'Facebook:Tiffatiel',
        'Instagram:tiffatiel',
        'Threads:tiffatiel',
        'Tumblr:tiffatiel',
        'Website:tiffatiel.com',
        'X:tiffatiel',
      ].sort(),
    );
  });

  it('reads a comic page into covers and pages in reading order', () => {
    const pages = readComicsYamlPages('https://tiffatiel.com/', json('tiffatiel-perfect-wedding.page-data.json'));
    expect(pages).toHaveLength(18);
    expect(pages[0]!.imageUrl).toMatch(/^https:\/\/tiffatiel\.com\/static\/.+\/outer-front\.png$/);
    const order = parseAndSortPageFiles(pages.map((p) => new File([], p.fileName))).map((p) => p.file.name);
    expect(order[0]).toBe('outer-front.png');
    expect(order.at(-1)).toBe('outer-back.png');
    expect(order.slice(1, 4)).toEqual(['1.png', '2.png', '3.png']);
  });
});

describe('slantofrain.com (one folder per issue)', () => {
  const catalog = readSiteCatalog(
    'https://slantofrain.com/',
    json('slantofrain-index.page-data.json'),
    fixture('slantofrain-home.html'),
  );

  it('credits Petrichor Lin and makes the site a series that owns the website', () => {
    expect(catalog.personaName).toBe('Petrichor Lin');
    expect(catalog.series).toEqual([{ key: 'slantofrain.com:site', title: 'Slant of Rain' }]);
    expect(catalog.accounts).toEqual([
      {
        platform: 'Website',
        handle: 'slantofrain.com',
        url: 'https://slantofrain.com/',
        owner: { kind: 'series', seriesKey: 'slantofrain.com:site' },
      },
    ]);
  });

  it('reads both issues with exact dates, content warnings, pages and alt text', () => {
    const fighting = catalog.comics.find((c) => c.key === 'slantofrain.com:1-fighting')!;
    expect(fighting.title).toBe('Fighting');
    expect(fighting.contentWarnings).toEqual(['Domestic violence']);
    expect(fighting.publications).toEqual([
      { url: 'https://slantofrain.com/1', platform: 'Website', publishedAt: '2025-12-31T12:00:00.000Z' },
    ]);
    expect(fighting.pages).toHaveLength(14);
    expect(fighting.pages!.find((p) => p.fileName === 'Page_1.png')?.altText).toMatch(/^Narration: When I was a kid/);
    const order = parseAndSortPageFiles(fighting.pages!.map((p) => new File([], p.fileName))).map((p) => p.file.name);
    expect(order[0]).toBe('Outer_Front.png');
    expect(order.at(-1)).toBe('Outer_Back.png');
  });
});

it('refuses a site it cannot read instead of returning an empty catalog', () => {
  expect(() => readSiteCatalog('https://example.com/', { result: { data: {} } }, '')).toThrow(SiteCatalogError);
});
