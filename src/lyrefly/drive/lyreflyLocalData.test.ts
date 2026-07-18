import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { lyreflyDb } from '../db/lyreflyDb';
import { writeLyreflyLocalPayload } from './lyreflyLocalData';

describe('writeLyreflyLocalPayload', () => {
  beforeEach(async () => {
    await lyreflyDb.projects.clear();
  });

  it('creates gallery stubs without copying projectFolderId (keeps first hydrate honest)', async () => {
    await writeLyreflyLocalPayload({
      projects: [
        {
          id: 'proj-1',
          title: "Eliza's Wish",
          status: 'draft',
          updatedAt: '2026-07-17T00:00:00.000Z',
          pageCount: 12,
          projectFolderId: 'drive-folder-abc',
        },
      ],
    });

    const stub = await lyreflyDb.projects.get('proj-1');
    expect(stub?.title).toBe("Eliza's Wish");
    expect(stub?.pageCount).toBe(12);
    expect(stub?.projectFolderId).toBeUndefined();
  });

  it('updates an existing project projectFolderId from the summary', async () => {
    await writeLyreflyLocalPayload({
      projects: [
        {
          id: 'proj-1',
          title: 'Comic',
          status: 'draft',
          updatedAt: '2026-07-17T00:00:00.000Z',
        },
      ],
    });
    await writeLyreflyLocalPayload({
      projects: [
        {
          id: 'proj-1',
          title: 'Comic',
          status: 'draft',
          updatedAt: '2026-07-17T01:00:00.000Z',
          projectFolderId: 'drive-folder-abc',
        },
      ],
    });

    const row = await lyreflyDb.projects.get('proj-1');
    expect(row?.projectFolderId).toBe('drive-folder-abc');
  });
});
