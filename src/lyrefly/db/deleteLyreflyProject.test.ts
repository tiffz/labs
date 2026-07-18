import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { lyreflyDb } from './lyreflyDb';
import {
  addPageRevisionFromFile,
  createPageNode,
  createVisualDevAsset,
  deleteLyreflyProject,
  saveLyreflyProject,
} from './lyreflyProjectMutations';
import { listLyreflyProjectTombstones } from '../drive/lyreflyDriveTombstones';
import { createBlankComicProject } from '../types';

describe('deleteLyreflyProject', () => {
  beforeEach(async () => {
    await lyreflyDb.projects.clear();
    await lyreflyDb.pageNodes.clear();
    await lyreflyDb.pageRevisions.clear();
    await lyreflyDb.revisionBlobs.clear();
    await lyreflyDb.visualDevAssets.clear();
    await lyreflyDb.visualDevBlobs.clear();
    window.localStorage.clear();
  });

  it('removes all rows scoped to the project and records a Drive tombstone', async () => {
    const project = await saveLyreflyProject(createBlankComicProject());
    const node = await createPageNode(project, 'Page 1');
    await addPageRevisionFromFile(node, new File(['pixels'], 'p1.png', { type: 'image/png' }), 'v1');
    await createVisualDevAsset(project.id, {
      kind: 'image',
      title: 'Concept',
      file: new File(['sketch'], 'sketch.png', { type: 'image/png' }),
    });

    await deleteLyreflyProject(project);

    expect(await lyreflyDb.projects.get(project.id)).toBeUndefined();
    expect(await lyreflyDb.pageNodes.where('projectId').equals(project.id).count()).toBe(0);
    expect(await lyreflyDb.pageRevisions.where('pageNodeId').equals(node.id).count()).toBe(0);
    expect(await lyreflyDb.visualDevAssets.where('projectId').equals(project.id).count()).toBe(0);

    const tombstones = listLyreflyProjectTombstones();
    expect(tombstones.some((t) => t.id === project.id)).toBe(true);
  });

  it('does not resurrect the deleted project through union merge with a remote that still lists it', async () => {
    const project = await saveLyreflyProject(createBlankComicProject());
    await deleteLyreflyProject(project);

    const { mergeLyreflySyncPayload } = await import('../drive/lyreflyDriveMerge');
    const { lyreflyTombstoneProjectIdsFromRemote } = await import('../drive/lyreflyDriveTombstones');

    const remotePayload = { projects: [{ id: project.id, title: project.title, status: 'draft' as const, updatedAt: new Date().toISOString() }] };
    const localPayload = { projects: [] as typeof remotePayload.projects };
    const tombstoneProjectIds = lyreflyTombstoneProjectIdsFromRemote(undefined);
    tombstoneProjectIds.add(project.id);

    const { payload } = mergeLyreflySyncPayload(localPayload, remotePayload, { tombstoneProjectIds });
    expect(payload.projects.some((p) => p.id === project.id)).toBe(false);
  });
});
