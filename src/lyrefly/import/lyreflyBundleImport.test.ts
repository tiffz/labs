// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { lyreflyDb } from '../db/lyreflyDb';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import { deleteSketchbookSeed } from '../db/sketchbookMutations';
import { createBlankComicProject } from '../types';
import {
  applyLyreflyBundleImport,
  LyreflyBundleError,
  parseLyreflyBundle,
  planLyreflyBundleImport,
  type LyreflyBundleV1,
} from './lyreflyBundleImport';

// A made-up tracker: the owner's real one is personal and never lives in this repo.
function bundle(): LyreflyBundleV1 {
  return {
    format: 'lyrefly-bundle',
    version: 1,
    source: 'Test tracker',
    comics: [
      {
        key: 'test:lantern',
        title: 'The Lantern',
        pipelineStatus: 'ready_to_draw',
        priorityRank: 1,
        scriptHtml: '<ul><li><p>Page 1</p><ul><li><p>Wide shot</p></li></ul></li></ul>',
        links: [{ title: 'Lantern script', url: 'https://docs.google.com/document/d/abc' }],
      },
      {
        key: 'test:tide',
        title: 'Tide Pool',
        pipelineStatus: 'fleshing_out',
        priorityRank: 2,
        brainstormHtml: '<h3>Setting</h3><p>A shore at low tide.</p>',
      },
    ],
    seeds: [
      { key: 'test:seed:kite', kind: 'idea', title: 'Kite', body: 'A kite that will not land.\n- It drifts for years.' },
      {
        key: 'test:flash:rain',
        kind: 'daily_flash',
        title: 'Rain',
        occurredOn: '2025-10-07',
        links: [{ title: 'Draft', url: 'https://docs.google.com/document/d/rain' }],
      },
    ],
  };
}

async function importBundle(b: LyreflyBundleV1 = bundle()) {
  return applyLyreflyBundleImport(await planLyreflyBundleImport(parseLyreflyBundle(b)));
}

async function counts() {
  return {
    projects: await lyreflyDb.projects.count(),
    links: await lyreflyDb.visualDevAssets.count(),
    seeds: await lyreflyDb.sketchbookSeeds.count(),
    scripts: await lyreflyDb.scriptDocuments.count(),
  };
}

const byTitle = async (title: string) => (await lyreflyDb.projects.toArray()).find((p) => p.title === title)!;

beforeEach(async () => {
  window.localStorage.clear();
  await Promise.all(lyreflyDb.tables.map((t) => t.clear()));
});

describe('parseLyreflyBundle', () => {
  it.each([
    [{ format: 'something-else' }, /not a Lyrefly bundle/],
    [{ ...bundle(), version: 2 }, /version 2/],
    [{ ...bundle(), comics: [bundle().comics[0], bundle().comics[0]] }, /used twice/],
    [{ ...bundle(), comics: [{ ...bundle().comics[0], pipelineStatus: 'done' }] }, /unknown status/],
    [{ ...bundle(), seeds: [{ ...bundle().seeds[1], occurredOn: 'Oct 7' }] }, /YYYY-MM-DD/],
    // The Sketchbook shows an idea's body as text, so HTML would appear as literal tags.
    [{ ...bundle(), seeds: [{ ...bundle().seeds[0], body: '<ul><li><p>tags</p></li></ul>' }] }, /plain text/],
  ])('refuses a malformed file with a reason (%#)', (raw, reason) => {
    expect(() => parseLyreflyBundle(raw)).toThrow(LyreflyBundleError);
    expect(() => parseLyreflyBundle(raw)).toThrow(reason);
  });
});

describe('importing a bundle', () => {
  it('creates comics in the queue with their stage, notes, script and links, and the ideas', async () => {
    expect(await importBundle()).toEqual({ comicsCreated: 2, comicsUpdated: 0, ideasAdded: 2, collectionsCreated: 0, piecesAdded: 0 });

    const lantern = await byTitle('The Lantern');
    expect(lantern).toMatchObject({ pipelineStatus: 'ready_to_draw', priorityRank: 1, status: 'wip' });
    expect(lantern.stageCompletion).toEqual({ brainstorm: true, script: true });
    expect((await lyreflyDb.scriptDocuments.get(lantern.scriptDocumentId))?.markdown).toContain('Wide shot');
    const links = await lyreflyDb.visualDevAssets.where('projectId').equals(lantern.id).toArray();
    expect(links.map((l) => [l.kind, l.url])).toEqual([['link', 'https://docs.google.com/document/d/abc']]);

    expect((await byTitle('Tide Pool')).brainstormHtml).toContain('low tide');

    const seeds = await lyreflyDb.sketchbookSeeds.toArray();
    expect(seeds.find((s) => s.title === 'Kite')?.bodyHtml).toBe('A kite that will not land.\n- It drifts for years.');
    const rain = seeds.find((s) => s.title === 'Rain')!;
    expect(rain).toMatchObject({ kind: 'daily_flash', occurredOn: '2025-10-07', status: 'active' });
    expect(rain.attachments?.map((a) => a.url)).toEqual(['https://docs.google.com/document/d/rain']);
  });

  it('running it again adds nothing', async () => {
    await importBundle();
    const before = await counts();
    expect(await importBundle()).toEqual({ comicsCreated: 0, comicsUpdated: 2, ideasAdded: 0, collectionsCreated: 0, piecesAdded: 0 });
    expect(await counts()).toEqual(before);
  });

  it('never overwrites what you changed in Lyrefly since', async () => {
    await importBundle();
    const lantern = await byTitle('The Lantern');
    await saveLyreflyProject({ ...lantern, priorityRank: 7, pipelineStatus: 'complete', brainstormHtml: '<p>mine</p>' });
    await lyreflyDb.scriptDocuments.update(lantern.scriptDocumentId, { markdown: '<p>my rewrite</p>' });

    await importBundle();
    const after = await byTitle('The Lantern');
    expect(after).toMatchObject({ priorityRank: 7, pipelineStatus: 'complete', brainstormHtml: '<p>mine</p>' });
    expect((await lyreflyDb.scriptDocuments.get(lantern.scriptDocumentId))?.markdown).toBe('<p>my rewrite</p>');
  });

  it('fills in a comic you already have by the same title instead of duplicating it', async () => {
    const mine = createBlankComicProject();
    mine.title = 'tide pool';
    mine.brainstormHtml = '<p>my own notes</p>';
    await saveLyreflyProject(mine);

    const plan = await planLyreflyBundleImport(parseLyreflyBundle(bundle()));
    expect(plan.comics.find((c) => c.comic.key === 'test:tide')?.action).toBe('link');
    await applyLyreflyBundleImport(plan);

    const linked = await lyreflyDb.projects.get(mine.id);
    expect(linked).toMatchObject({ importKey: 'test:tide', pipelineStatus: 'fleshing_out', priorityRank: 2 });
    expect(linked?.brainstormHtml).toBe('<p>my own notes</p>');
    expect(await lyreflyDb.projects.count()).toBe(2);
  });

  it('an idea you deleted after importing stays deleted when you import again', async () => {
    await importBundle();
    const kite = (await lyreflyDb.sketchbookSeeds.toArray()).find((s) => s.title === 'Kite')!;
    await deleteSketchbookSeed(kite);

    const plan = await planLyreflyBundleImport(parseLyreflyBundle(bundle()));
    expect(plan.seeds.find((s) => s.seed.key === 'test:seed:kite')?.action).toBe('deleted');
    await applyLyreflyBundleImport(plan);
    const row = await lyreflyDb.sketchbookSeeds.get(kite.id);
    expect(row?.deletedAt).toBeDefined();
    expect(row?.status).toBe('archived');
  });
});
