// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lyreflyDb } from '../db/lyreflyDb';
import { createPageNode, deleteLyreflyProject, saveLyreflyProject } from '../db/lyreflyProjectMutations';
import { createBlankComicProject } from '../types';
import { readComicsYamlPages, readSiteCatalog, type SiteCatalog } from './lyreflySiteCatalog';
import { applyLyreflySiteImport, planLyreflySiteImport, scriptHtmlFromAltText } from './lyreflySiteImport';

const fixture = (name: string): string => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

function tiffatielCatalog(): SiteCatalog {
  const catalog = readSiteCatalog(
    'https://tiffatiel.com/',
    JSON.parse(fixture('tiffatiel-index.page-data.json')),
    fixture('tiffatiel-home.html'),
  );
  const weddingPages = readComicsYamlPages('https://tiffatiel.com/', JSON.parse(fixture('tiffatiel-perfect-wedding.page-data.json')));
  // Only The Perfect Wedding's page list is in the fixtures; give the others a cover each.
  for (const comic of catalog.comics) {
    comic.pages = comic.key.endsWith(':perfect-wedding')
      ? weddingPages
      : [{ fileName: 'outer-front.png', imageUrl: `https://tiffatiel.com/static/${comic.key}/outer-front.png` }];
  }
  return catalog;
}

function slantCatalog(): SiteCatalog {
  return readSiteCatalog(
    'https://slantofrain.com/',
    JSON.parse(fixture('slantofrain-index.page-data.json')),
    fixture('slantofrain-home.html'),
  );
}

const fakeFetch = vi.fn(async () => ({
  ok: true,
  status: 200,
  blob: async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
}));

async function importSite(catalog: SiteCatalog, personaName = catalog.personaName!) {
  const plan = await planLyreflySiteImport(catalog, personaName);
  const result = await applyLyreflySiteImport(plan, { fetchImpl: fakeFetch as unknown as typeof fetch });
  return { plan, result };
}

async function snapshotIds() {
  return {
    projects: (await lyreflyDb.projects.toArray()).map((p) => p.id).sort(),
    pages: (await lyreflyDb.pageNodes.toArray()).map((p) => p.id).sort(),
    publications: (await lyreflyDb.archives.toArray()).flatMap((a) => a.publishLog.map((r) => r.id)).sort(),
    personas: (await lyreflyDb.personas.toArray()).map((p) => p.id).sort(),
    accounts: (await lyreflyDb.accounts.toArray()).map((a) => a.id).sort(),
  };
}

beforeEach(async () => {
  window.localStorage.clear();
  await Promise.all(lyreflyDb.tables.map((table) => table.clear()));
  fakeFetch.mockClear();
});

describe('importing tiffatiel.com', () => {
  it('creates every comic with its pages, publications, pen name, series and accounts', async () => {
    const { result } = await importSite(tiffatielCatalog());
    expect(result).toEqual({ created: 5, updated: 0, linked: 0, skippedDeleted: 0 });

    const wedding = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'The Perfect Wedding')!;
    expect(wedding.importKey).toBe('tiffatiel.com:perfect-wedding');
    expect(wedding.status).toBe('finished');
    expect(wedding.layoutOrder).toHaveLength(18);
    const firstPage = await lyreflyDb.pageNodes.get(wedding.layoutOrder[0]!);
    expect(firstPage?.displayName).toMatch(/front cover/i);

    const archive = await lyreflyDb.archives.get(wedding.archiveId!);
    expect(archive?.publishLog).toHaveLength(7);
    expect(archive?.publishLog.every((r) => r.publishedAt === '')).toBe(true);

    const [persona] = await lyreflyDb.personas.toArray();
    expect(persona?.name).toBe('Tiffatiel');
    expect(wedding.personaIds).toEqual([persona!.id]);

    const [series] = await lyreflyDb.series.toArray();
    expect(series?.title).toBe('Between Walks');
    const walks = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'Between Walks')!;
    expect(walks.seriesId).toBe(series!.id);
    // Credited to the pen name, though the series owns its own accounts.
    expect(walks.personaIds).toEqual([persona!.id]);

    const accounts = await lyreflyDb.accounts.toArray();
    expect(accounts.filter((a) => a.owner.kind === 'series' && a.owner.id === series!.id)).toHaveLength(4);
    expect(accounts.filter((a) => a.owner.kind === 'persona' && a.owner.id === persona!.id)).toHaveLength(7);
  });

  it('running it again adds nothing', async () => {
    await importSite(tiffatielCatalog());
    const before = await snapshotIds();
    const { result } = await importSite(tiffatielCatalog());
    expect(result).toEqual({ created: 0, updated: 5, linked: 0, skippedDeleted: 0 });
    expect(await snapshotIds()).toEqual(before);
  });

  it('a second device importing the same site derives the same rows, so sync cannot duplicate them', async () => {
    await importSite(tiffatielCatalog());
    const deviceA = await snapshotIds();
    await Promise.all(lyreflyDb.tables.map((table) => table.clear()));
    await importSite(tiffatielCatalog());
    expect(await snapshotIds()).toEqual(deviceA);
  });

  it('a comic deleted after import stays deleted when the import runs again', async () => {
    await importSite(tiffatielCatalog());
    const wedding = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'The Perfect Wedding')!;
    await deleteLyreflyProject(wedding);

    const { plan, result } = await importSite(tiffatielCatalog());
    expect(plan.comics.find((c) => c.comic.key.endsWith(':perfect-wedding'))?.action).toBe('skip-deleted');
    expect(result.skippedDeleted).toBe(1);
    expect(await lyreflyDb.projects.get(wedding.id)).toBeUndefined();
  });

  it('links an empty comic made by hand with the same title, and gives it the site pages', async () => {
    const mine = createBlankComicProject();
    mine.title = 'the perfect wedding';
    mine.brainstormHtml = '<p>My own note.</p>';
    await saveLyreflyProject(mine);

    const { result } = await importSite(tiffatielCatalog());
    expect(result).toEqual({ created: 4, updated: 0, linked: 1, skippedDeleted: 0 });
    const linked = await lyreflyDb.projects.get(mine.id);
    expect(linked?.importKey).toBe('tiffatiel.com:perfect-wedding');
    expect(linked?.layoutOrder).toHaveLength(18);
    expect(linked?.status).toBe('finished');
    // What you wrote stays; only blanks are filled.
    expect(linked?.brainstormHtml).toBe('<p>My own note.</p>');
    expect(linked?.title).toBe('the perfect wedding');
    expect((await lyreflyDb.archives.get(linked!.archiveId!))?.publishLog).toHaveLength(7);
  });

  it('leaves the art alone on a comic that has any page of its own', async () => {
    const mine = createBlankComicProject();
    mine.title = 'The Perfect Wedding';
    await saveLyreflyProject(mine);
    await createPageNode((await lyreflyDb.projects.get(mine.id))!, 'My sketch');

    await importSite(tiffatielCatalog());
    const linked = await lyreflyDb.projects.get(mine.id);
    expect(await lyreflyDb.pageNodes.where('projectId').equals(mine.id).count()).toBe(1);
    expect(linked?.layoutOrder).toHaveLength(1);
    expect(linked?.status).not.toBe('finished');
    expect(linked?.importKey).toBe('tiffatiel.com:perfect-wedding');
  });

  it('running it again keeps a series you deliberately removed', async () => {
    await importSite(tiffatielCatalog());
    const walks = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'Between Walks')!;
    await saveLyreflyProject({ ...walks, seriesId: null });
    await importSite(tiffatielCatalog());
    expect((await lyreflyDb.projects.get(walks.id))?.seriesId).toBeNull();
  });

  it('reuses a pen name you already have, matching it whatever the case', async () => {
    const now = new Date().toISOString();
    await lyreflyDb.personas.put({ id: 'mine', name: 'TIFFATIEL', updatedAt: now });
    await importSite(tiffatielCatalog());
    expect((await lyreflyDb.personas.toArray()).map((p) => p.id)).toEqual(['mine']);
  });
});

describe('when an import goes wrong', () => {
  it('a failed page download leaves no half-written comic, and earlier comics stay complete', async () => {
    let calls = 0;
    const failing = vi.fn(async () => {
      calls += 1;
      // The Perfect Wedding (first, 18 pages) downloads; Between Walks' cover fails.
      if (calls === 19) return { ok: false, status: 503, blob: async () => new Blob() };
      return { ok: true, status: 200, blob: async () => new Blob([new Uint8Array([1])], { type: 'image/png' }) };
    });
    const plan = await planLyreflySiteImport(tiffatielCatalog(), 'Tiffatiel');
    await expect(applyLyreflySiteImport(plan, { fetchImpl: failing as unknown as typeof fetch })).rejects.toThrow(/503/);

    const projects = await lyreflyDb.projects.toArray();
    expect(projects.map((p) => p.title)).toEqual(['The Perfect Wedding']);
    const orphanPages = (await lyreflyDb.pageNodes.toArray()).filter((n) => n.projectId !== projects[0]!.id);
    expect(orphanPages).toEqual([]);
  });

  it('re-running a stale plan after a failure updates what it already wrote instead of overwriting it', async () => {
    const plan = await planLyreflySiteImport(tiffatielCatalog(), 'Tiffatiel');
    await applyLyreflySiteImport(plan, { fetchImpl: fakeFetch as unknown as typeof fetch });
    const wedding = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'The Perfect Wedding')!;
    await saveLyreflyProject({ ...wedding, subtitle: 'my edit after import' });
    fakeFetch.mockClear();

    // Same plan object again: it still says "create" for every comic.
    const result = await applyLyreflySiteImport(plan, { fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result).toEqual({ created: 0, updated: 5, linked: 0, skippedDeleted: 0 });
    expect((await lyreflyDb.projects.get(wedding.id))?.subtitle).toBe('my edit after import');
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('a comic deleted between preview and import is skipped, not a crash', async () => {
    await importSite(tiffatielCatalog());
    const plan = await planLyreflySiteImport(tiffatielCatalog(), 'Tiffatiel');
    const wedding = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'The Perfect Wedding')!;
    await deleteLyreflyProject(wedding);
    const result = await applyLyreflySiteImport(plan, { fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result).toEqual({ created: 0, updated: 4, linked: 0, skippedDeleted: 1 });
  });
});

describe('importing slantofrain.com', () => {
  it('credits Petrichor Lin, files both issues under Slant of Rain, and keeps exact dates', async () => {
    await importSite(slantCatalog());
    const [persona] = await lyreflyDb.personas.toArray();
    const [series] = await lyreflyDb.series.toArray();
    expect(persona?.name).toBe('Petrichor Lin');
    expect(series?.title).toBe('Slant of Rain');

    const fighting = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'Fighting')!;
    expect(fighting.seriesId).toBe(series!.id);
    expect(fighting.brainstormHtml).toContain('Content warning: Domestic violence');
    const archive = await lyreflyDb.archives.get(fighting.archiveId!);
    expect(archive?.publishLog.map((r) => r.publishedAt)).toEqual(['2025-12-31T12:00:00.000Z']);

    const spread = (await lyreflyDb.pageNodes.where('projectId').equals(fighting.id).toArray()).find((n) => n.isSpread);
    expect(spread).toBeDefined();
  });

  it('seeds the script from page alt text', async () => {
    await importSite(slantCatalog());
    const fighting = (await lyreflyDb.projects.toArray()).find((p) => p.title === 'Fighting')!;
    const script = await lyreflyDb.scriptDocuments.get(fighting.scriptDocumentId);
    expect(script?.markdown).toContain('<p>Opening shot of a suburban house at night.</p>');
    expect(script?.markdown).toContain('Narration: When I was a kid, I wanted to learn how to fight.');
    expect(script?.blocks.length).toBeGreaterThan(0);
  });
});

describe('scriptHtmlFromAltText', () => {
  it('nests panels under the page and puts lead narration under panel one', () => {
    expect(
      scriptHtmlFromAltText([{ label: 'Page 1', altText: 'Narration: Once.\n1. Wide shot.\nMOM: Hi\n2. Close-up.' }]),
    ).toBe(
      '<ul><li><p>Page 1</p><ul>' +
        '<li><p>Wide shot.</p><ul><li><p>Narration: Once.</p></li><li><p>MOM: Hi</p></li></ul></li>' +
        '<li><p>Close-up.</p></li>' +
        '</ul></li></ul>',
    );
  });

  it('returns null rather than an empty script when no page has alt text', () => {
    expect(scriptHtmlFromAltText([{ label: 'Page 1' }])).toBeNull();
  });
});
