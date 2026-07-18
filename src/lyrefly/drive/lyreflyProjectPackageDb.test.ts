import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { lyreflyDb } from '../db/lyreflyDb';
import { createBlankComicProject, createBlankScriptDocument } from '../types';
import type { PageNode, PageRevision, VisualDevAsset } from '../types';
import { applyLyreflyProjectPackageToDb, buildLyreflyProjectPackageFromDb } from './lyreflyProjectPackageDb';

async function clearAllLyreflyTables(): Promise<void> {
  await lyreflyDb.projects.clear();
  await lyreflyDb.pageNodes.clear();
  await lyreflyDb.pageRevisions.clear();
  await lyreflyDb.revisionBlobs.clear();
  await lyreflyDb.visualDevAssets.clear();
  await lyreflyDb.visualDevBlobs.clear();
  await lyreflyDb.scriptDocuments.clear();
  await lyreflyDb.snapshots.clear();
  await lyreflyDb.archives.clear();
}

function makePageNode(projectId: string, overrides: Partial<PageNode> = {}): PageNode {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    projectId,
    displayName: 'Page 1',
    isSpread: false,
    activeRevisionId: null,
    revisionIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRevision(pageNodeId: string, overrides: Partial<PageRevision> = {}): PageRevision {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    pageNodeId,
    label: 'v1',
    stage: 'other',
    fileName: 'page1.png',
    mimeType: 'image/png',
    width: 0,
    height: 0,
    importedAt: now,
    createdAt: now,
    ...overrides,
  };
}

describe('buildLyreflyProjectPackageFromDb', () => {
  beforeEach(async () => {
    await clearAllLyreflyTables();
  });

  it('returns null when the project does not exist locally', async () => {
    expect(await buildLyreflyProjectPackageFromDb('missing')).toBeNull();
  });

  it('assembles project, pages, script, visual dev, and archive from Dexie', async () => {
    const project = createBlankComicProject();
    project.archiveId = crypto.randomUUID();
    project.modules.archive = true;
    const scriptDoc = createBlankScriptDocument(project.id);
    scriptDoc.id = project.scriptDocumentId;
    await lyreflyDb.projects.put(project);
    await lyreflyDb.scriptDocuments.put(scriptDoc);
    await lyreflyDb.archives.put({
      id: project.archiveId,
      projectId: project.id,
      publishLog: [],
      pressEntries: [],
      salesLedger: [],
    });

    const node = makePageNode(project.id);
    const revision = makeRevision(node.id);
    await lyreflyDb.pageNodes.put(node);
    await lyreflyDb.pageRevisions.put(revision);

    const asset: VisualDevAsset = {
      id: crypto.randomUUID(),
      projectId: project.id,
      kind: 'image',
      title: 'Hero sketch',
      tags: [],
      fileName: 'hero.png',
      mimeType: 'image/png',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
    await lyreflyDb.visualDevAssets.put(asset);

    const pkg = await buildLyreflyProjectPackageFromDb(project.id);
    expect(pkg).not.toBeNull();
    expect(pkg?.project.id).toBe(project.id);
    expect(pkg?.pageNodes.get(node.id)?.revisions).toHaveLength(1);
    expect(pkg?.visualDevAssets).toHaveLength(1);
    expect(pkg?.script?.document.id).toBe(scriptDoc.id);
    expect(pkg?.archive?.id).toBe(project.archiveId);
  });
});

describe('applyLyreflyProjectPackageToDb', () => {
  beforeEach(async () => {
    await clearAllLyreflyTables();
  });

  it('fully hydrates a brand-new project on an empty device', async () => {
    const project = createBlankComicProject();
    project.layoutOrder = ['n1'];
    project.pageCount = 1;
    project.brainstormHtml = '<p>Ideas</p>';
    const node = makePageNode(project.id, { id: 'n1' });
    const revision = makeRevision(node.id, { id: 'r1' });
    const nodeUpdated = { ...node, activeRevisionId: revision.id, revisionIds: [revision.id] };

    await applyLyreflyProjectPackageToDb({
      project,
      layoutOrder: project.layoutOrder,
      pageNodes: new Map([[node.id, { node: nodeUpdated, revisions: [revision] }]]),
      visualDevAssets: [],
      snapshots: [],
    });

    const stored = await lyreflyDb.projects.get(project.id);
    expect(stored?.brainstormHtml).toBe('<p>Ideas</p>');
    expect(stored?.layoutOrder).toEqual(['n1']);
    expect(stored?.pageCount).toBe(1);
    expect(await lyreflyDb.pageNodes.get('n1')).toBeDefined();
    expect(await lyreflyDb.pageRevisions.get('r1')).toBeDefined();
  });

  it('field-merges same-id pages (local wins when clocks equal/newer) and unions layoutOrder', async () => {
    const project = createBlankComicProject();
    project.layoutOrder = ['local-page'];
    project.pageCount = 1;
    project.projectFolderId = 'already-synced-folder';
    await lyreflyDb.projects.put(project);

    const localNode = makePageNode(project.id, {
      id: 'local-page',
      displayName: 'My local edit',
      updatedAt: '2026-07-17T12:00:00.000Z',
    });
    await lyreflyDb.pageNodes.put(localNode);

    const remoteNode = makePageNode(project.id, { id: 'remote-page', displayName: 'From another device' });
    const remoteProject = { ...project, layoutOrder: ['local-page', 'remote-page'], pageCount: 2 };

    await applyLyreflyProjectPackageToDb({
      project: remoteProject,
      layoutOrder: remoteProject.layoutOrder,
      pageNodes: new Map([
        [
          'local-page',
          {
            node: {
              ...localNode,
              displayName: 'Remote overwrite attempt',
              updatedAt: '2026-07-17T11:00:00.000Z',
            },
            revisions: [],
          },
        ],
        ['remote-page', { node: remoteNode, revisions: [] }],
      ]),
      visualDevAssets: [],
      snapshots: [],
    });

    const keptLocal = await lyreflyDb.pageNodes.get('local-page');
    expect(keptLocal?.displayName).toBe('My local edit');

    const addedRemote = await lyreflyDb.pageNodes.get('remote-page');
    expect(addedRemote?.displayName).toBe('From another device');

    const stored = await lyreflyDb.projects.get(project.id);
    expect(stored?.layoutOrder).toEqual(['local-page', 'remote-page']);
    expect(stored?.pageCount).toBe(2);
  });

  it('adopts newer same-id remote page edits after hydrate', async () => {
    const project = createBlankComicProject();
    project.layoutOrder = ['p1'];
    project.projectFolderId = 'folder';
    await lyreflyDb.projects.put(project);
    await lyreflyDb.pageNodes.put(
      makePageNode(project.id, {
        id: 'p1',
        displayName: 'Old name',
        updatedAt: '2026-07-17T10:00:00.000Z',
      }),
    );

    await applyLyreflyProjectPackageToDb({
      project: { ...project, updatedAt: '2026-07-17T12:00:00.000Z' },
      layoutOrder: ['p1'],
      pageNodes: new Map([
        [
          'p1',
          {
            node: makePageNode(project.id, {
              id: 'p1',
              displayName: 'Renamed on other device',
              updatedAt: '2026-07-17T12:00:00.000Z',
            }),
            revisions: [],
          },
        ],
      ]),
      visualDevAssets: [],
      snapshots: [],
    });

    expect((await lyreflyDb.pageNodes.get('p1'))?.displayName).toBe('Renamed on other device');
  });

  it('keeps filled local brainstorm over empty newer remote after hydrate', async () => {
    const project = createBlankComicProject();
    project.projectFolderId = 'already-synced-folder';
    project.brainstormHtml = '<p>My local brainstorm</p>';
    project.updatedAt = '2026-07-17T12:00:00.000Z';
    await lyreflyDb.projects.put(project);

    const remoteProject = {
      ...project,
      brainstormHtml: '<p></p>',
      updatedAt: '2026-07-17T13:00:00.000Z',
    };

    await applyLyreflyProjectPackageToDb({
      project: remoteProject,
      layoutOrder: project.layoutOrder,
      pageNodes: new Map(),
      visualDevAssets: [],
      snapshots: [],
    });

    const stored = await lyreflyDb.projects.get(project.id);
    expect(stored?.brainstormHtml).toBe('<p>My local brainstorm</p>');
  });

  it('merges newer remote script markdown onto an existing local script doc', async () => {
    const project = createBlankComicProject();
    project.projectFolderId = 'folder';
    await lyreflyDb.projects.put(project);
    const localDoc = createBlankScriptDocument(project.id);
    localDoc.id = project.scriptDocumentId;
    localDoc.markdown = 'local draft';
    localDoc.updatedAt = '2026-07-17T10:00:00.000Z';
    await lyreflyDb.scriptDocuments.put(localDoc);

    const remoteDoc = {
      ...localDoc,
      markdown: 'remote finished script',
      updatedAt: '2026-07-17T12:00:00.000Z',
    };

    await applyLyreflyProjectPackageToDb({
      project,
      layoutOrder: [],
      script: { markdown: remoteDoc.markdown, document: remoteDoc },
      pageNodes: new Map(),
      visualDevAssets: [],
      snapshots: [],
    });

    expect((await lyreflyDb.scriptDocuments.get(localDoc.id))?.markdown).toBe(
      'remote finished script',
    );
  });
});
