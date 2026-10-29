// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SCRIPT_HTML } from '../script/defaultScriptSample';
import { createBlankComicProject, createBlankScriptDocument, type ComicProject } from '../types';
import { lyreflyDb } from './lyreflyDb';
import { LyreflyMergeError, mergeLyreflyWork, planLyreflyWorkMerge } from './lyreflyMergeWorks';

async function work(title: string, patch: Partial<ComicProject> = {}, scriptHtml?: string): Promise<ComicProject> {
  const project = { ...createBlankComicProject(), title, ...patch };
  await lyreflyDb.projects.put(project);
  const script = { ...createBlankScriptDocument(project.id), id: project.scriptDocumentId };
  if (scriptHtml !== undefined) script.markdown = scriptHtml;
  await lyreflyDb.scriptDocuments.put(script);
  return project;
}

async function merge(sourceId: string, targetId: string): Promise<ComicProject> {
  return mergeLyreflyWork(await planLyreflyWorkMerge(sourceId, targetId));
}

beforeEach(async () => {
  await lyreflyDb.delete();
  await lyreflyDb.open();
});

describe('merging one work into another', () => {
  // A Far Away Moon (a script) into 600 Million Steps (the finished comic, sample script only).
  it('the target gains the notes and script; the source is archived, not deleted', async () => {
    const steps = await work('600 Million Steps', { status: 'finished' }, DEFAULT_SCRIPT_HTML);
    const moon = await work('A Far Away Moon', { brainstormHtml: '<p>Moon girl</p>' }, '<ul><li>Page 1</li></ul>');

    await merge(moon.id, steps.id);

    const target = await lyreflyDb.projects.get(steps.id);
    expect(target?.brainstormHtml).toContain('Moon girl');
    expect(target?.status).toBe('finished');
    const script = await lyreflyDb.scriptDocuments.get(steps.scriptDocumentId);
    // The sample script is not the owner's, so it is replaced, not kept above the real one.
    expect(script?.markdown).toBe('<h2>A Far Away Moon</h2><ul><li>Page 1</li></ul>');

    const source = await lyreflyDb.projects.get(moon.id);
    expect(source).toMatchObject({ status: 'archived', mergedIntoId: steps.id });
    expect(await lyreflyDb.scriptDocuments.get(moon.scriptDocumentId)).toBeDefined();
  });

  it("keeps the target's own script and adds the source's under its title", async () => {
    const a = await work('A', {}, '<ul><li>Page 1</li></ul>');
    const b = await work('B', {}, '<ul><li>Page 9</li></ul>');
    await merge(b.id, a.id);
    expect((await lyreflyDb.scriptDocuments.get(a.scriptDocumentId))?.markdown).toBe(
      '<ul><li>Page 1</li></ul><h2>B</h2><ul><li>Page 9</li></ul>',
    );
  });

  it('carries brainstorm assets, referencing Drive files rather than copying them', async () => {
    const a = await work('A');
    const b = await work('B');
    await lyreflyDb.visualDevAssets.put({
      id: 'ref', projectId: b.id, kind: 'image', title: 'Moon', tags: [],
      fileName: 'moon.png', driveFileId: 'drive-moon', createdAt: '', updatedAt: '',
    });
    await merge(b.id, a.id);
    const carried = await lyreflyDb.visualDevAssets.where('projectId').equals(a.id).toArray();
    expect(carried).toEqual([expect.objectContaining({ driveFileId: 'drive-moon', title: 'Moon' })]);
    // The source keeps its own row: nothing is moved out from under it.
    expect(await lyreflyDb.visualDevAssets.get('ref')).toMatchObject({ projectId: b.id });
  });

  it('refuses, writing nothing, when the source has pages', async () => {
    const a = await work('A');
    const b = await work('B');
    await lyreflyDb.pageNodes.put({
      id: 'p1', projectId: b.id, isSpread: false, activeRevisionId: null, revisionIds: [], createdAt: '', updatedAt: '',
    });
    await expect(planLyreflyWorkMerge(b.id, a.id)).rejects.toThrow(LyreflyMergeError);
    expect((await lyreflyDb.projects.get(b.id))?.mergedIntoId).toBeUndefined();
  });

  // A summary stub's script has not downloaded; merging would lose the real one.
  it('refuses when either script has not reached this device', async () => {
    const a = await work('A');
    const stub = { ...createBlankComicProject(), title: 'Stub' };
    await lyreflyDb.projects.put(stub);
    await expect(planLyreflyWorkMerge(stub.id, a.id)).rejects.toThrow(/not finished syncing/);
    await expect(planLyreflyWorkMerge(a.id, stub.id)).rejects.toThrow(/not finished syncing/);
  });

  it('refuses merging a work into itself or into one already merged away', async () => {
    const a = await work('A');
    const b = await work('B', { mergedIntoId: 'elsewhere' });
    await expect(planLyreflyWorkMerge(a.id, a.id)).rejects.toThrow(LyreflyMergeError);
    await expect(planLyreflyWorkMerge(a.id, b.id)).rejects.toThrow(/Merge into that one/);
  });
});
