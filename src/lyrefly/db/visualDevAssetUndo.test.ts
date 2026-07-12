import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { lyreflyDb } from '../db/lyreflyDb';
import {
  createVisualDevAsset,
  deleteVisualDevAsset,
  restoreVisualDevAsset,
  snapshotVisualDevAssetForUndo,
} from '../db/lyreflyProjectMutations';

describe('visual dev asset undo restore', () => {
  const projectId = 'project-undo-test';

  beforeEach(async () => {
    await lyreflyDb.visualDevAssets.clear();
    await lyreflyDb.visualDevBlobs.clear();
  });

  afterEach(async () => {
    await lyreflyDb.visualDevAssets.clear();
    await lyreflyDb.visualDevBlobs.clear();
  });

  it('restores a deleted asset with its blob', async () => {
    const file = new File(['pixels'], 'hero.png', { type: 'image/png' });
    const asset = await createVisualDevAsset(projectId, {
      kind: 'image',
      title: 'Hero sketch',
      file,
      markdown: 'Neon alley lighting',
    });

    const snapshot = await snapshotVisualDevAssetForUndo(asset);
    await deleteVisualDevAsset(asset);

    expect(await lyreflyDb.visualDevAssets.get(asset.id)).toBeUndefined();
    expect(await lyreflyDb.visualDevBlobs.get(asset.id)).toBeUndefined();

    await restoreVisualDevAsset(snapshot);

    const restored = await lyreflyDb.visualDevAssets.get(asset.id);
    expect(restored?.markdown).toBe('Neon alley lighting');
    expect(restored?.fileName).toBe('hero.png');
    expect(await lyreflyDb.visualDevBlobs.get(asset.id)).toBeDefined();
  });
});
