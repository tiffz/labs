// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { putSketchbookSeed } from '../db/sketchbookMutations';
import { lyreflyDb } from '../db/lyreflyDb';
import type { SketchbookSeed } from '../types';
import { LyreflyPromoteError, lyreflyWorkIdForSeed, promoteSketchbookSeed } from './promoteSketchbookSeed';

describe('promoteSketchbookSeed', () => {
  beforeEach(async () => {
    await lyreflyDb.projects.clear();
    await lyreflyDb.scriptDocuments.clear();
    await lyreflyDb.visualDevAssets.clear();
    await lyreflyDb.visualDevBlobs.clear();
    await lyreflyDb.sketchbookSeeds.clear();
    await lyreflyDb.sketchbookBlobs.clear();
    await lyreflyDb.dirtySync.clear();
  });

  it('copies notes, link, and image into the new comic', async () => {
    const seed: SketchbookSeed = {
      id: crypto.randomUUID(),
      kind: 'idea',
      title: 'Star boat',
      bodyHtml: 'A boat that sails by starlight.',
      tags: [],
      status: 'active',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [
        {
          id: crypto.randomUUID(),
          kind: 'link',
          url: 'https://example.com/mood',
          title: 'Mood board',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'att-image-1',
          kind: 'image',
          title: 'Rough cover',
          fileName: 'cover.png',
          mimeType: 'image/png',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    const imageBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    await putSketchbookSeed(seed, null, new Map([['att-image-1', imageBlob]]));

    const project = await promoteSketchbookSeed(seed);
    expect(project.title).toBe('Star boat');
    expect(project.brainstormHtml).toBe('A boat that sails by starlight.');

    const assets = await lyreflyDb.visualDevAssets.where('projectId').equals(project.id).toArray();
    expect(assets.some((asset) => asset.kind === 'link' && asset.url === 'https://example.com/mood')).toBe(
      true,
    );
    expect(assets.some((asset) => asset.kind === 'image' && asset.title === 'Rough cover')).toBe(true);

    const promoted = await lyreflyDb.sketchbookSeeds.get(seed.id);
    expect(promoted?.status).toBe('promoted');
    expect(promoted?.promotedProjectId).toBe(project.id);
  });

  function bareSeed(patch: Partial<SketchbookSeed> = {}): SketchbookSeed {
    const now = new Date().toISOString();
    return { id: 'seed-1', kind: 'idea', title: 'Moon girl', tags: [], status: 'active', sortOrder: 1, createdAt: now, updatedAt: now, ...patch };
  }

  it('starts the comic on the Workbench', async () => {
    const project = await promoteSketchbookSeed(bareSeed());
    expect(project.developingAt).toBeTruthy();
  });

  // Two devices (or a retry) developing the same note must land on one comic, one script, one
  // copy of each asset. Random ids made two of everything.
  it('developing the same note twice makes one comic with one of each asset', async () => {
    const seed = bareSeed({ url: 'https://example.com/ref' });
    const first = await promoteSketchbookSeed(seed);
    await promoteSketchbookSeed({ ...seed, status: 'active' });
    expect(first.id).toBe(lyreflyWorkIdForSeed(seed.id));
    expect(await lyreflyDb.projects.count()).toBe(1);
    expect(await lyreflyDb.scriptDocuments.count()).toBe(1);
    expect(await lyreflyDb.visualDevAssets.count()).toBe(1);
  });

  it('references a file the note already has on Drive instead of copying it', async () => {
    const seed = bareSeed({
      attachments: [{ id: 'art-1', kind: 'image', fileName: 'moon.png', mimeType: 'image/png', createdAt: '' }],
      blobDriveFileIds: { 'art-1': 'drive-moon' },
    });
    const project = await promoteSketchbookSeed(seed);
    const [asset] = await lyreflyDb.visualDevAssets.where('projectId').equals(project.id).toArray();
    expect(asset).toMatchObject({ driveFileId: 'drive-moon', fileName: 'moon.png' });
    expect(await lyreflyDb.visualDevBlobs.count()).toBe(0);
  });

  // The old code skipped the missing image and hid the note anyway.
  it('refuses, writing nothing, when an attachment is neither here nor on Drive', async () => {
    const seed = bareSeed({
      attachments: [{ id: 'art-2', kind: 'image', fileName: 'lost.png', createdAt: '' }],
    });
    await lyreflyDb.sketchbookSeeds.put(seed);
    await expect(promoteSketchbookSeed(seed)).rejects.toThrow(LyreflyPromoteError);
    expect(await lyreflyDb.projects.count()).toBe(0);
    expect((await lyreflyDb.sketchbookSeeds.get(seed.id))?.status).toBe('active');
  });
});
