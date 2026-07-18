import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { putSketchbookSeed } from '../db/sketchbookMutations';
import { lyreflyDb } from '../db/lyreflyDb';
import type { SketchbookSeed } from '../types';
import { promoteSketchbookSeed } from './promoteSketchbookSeed';

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
});
