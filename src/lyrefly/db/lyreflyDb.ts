import Dexie, { type EntityTable } from 'dexie';

import type {
  ComicArchiveBinder,
  ComicArtVersion,
  ComicCharacter,
  ComicMacroSnapshot,
  ComicProject,
  LyreflyDirtySyncRow,
  PageMockup,
  PageNode,
  PageReference,
  PageRevision,
  ScriptDocument,
  SketchbookSeed,
  VisualDevAsset,
} from '../types';
import { lyreflyDirtySyncRowKey } from '../types';

export type LyreflyRevisionBlob = {
  revisionId: string;
  blob: Blob;
};

export type LyreflyVisualDevBlob = {
  assetId: string;
  blob: Blob;
};

export type LyreflySketchbookBlob = {
  seedId: string;
  blob: Blob;
};

export class LyreflyDb extends Dexie {
  projects!: EntityTable<ComicProject, 'id'>;
  pageNodes!: EntityTable<PageNode, 'id'>;
  pageRevisions!: EntityTable<PageRevision, 'id'>;
  revisionBlobs!: EntityTable<LyreflyRevisionBlob, 'revisionId'>;
  visualDevAssets!: EntityTable<VisualDevAsset, 'id'>;
  visualDevBlobs!: EntityTable<LyreflyVisualDevBlob, 'assetId'>;
  scriptDocuments!: EntityTable<ScriptDocument, 'id'>;
  snapshots!: EntityTable<ComicMacroSnapshot, 'id'>;
  artVersions!: EntityTable<ComicArtVersion, 'id'>;
  archives!: EntityTable<ComicArchiveBinder, 'id'>;
  dirtySync!: EntityTable<LyreflyDirtySyncRow, 'id'>;
  sketchbookSeeds!: EntityTable<SketchbookSeed, 'id'>;
  comicCharacters!: EntityTable<ComicCharacter, 'id'>;
  pageReferences!: EntityTable<PageReference, 'id'>;
  pageMockups!: EntityTable<PageMockup, 'id'>;
  sketchbookBlobs!: EntityTable<LyreflySketchbookBlob, 'seedId'>;

  constructor() {
    super('lyrefly');
    this.version(1).stores({
      projects: 'id, status, updatedAt',
      pageNodes: 'id, projectId',
      pageRevisions: 'id, pageNodeId',
      revisionBlobs: 'revisionId',
      visualDevAssets: 'id, projectId',
      visualDevBlobs: 'assetId',
      scriptDocuments: 'id, projectId',
      snapshots: 'id, projectId',
      archives: 'id, projectId',
      dirtySync: 'id, kind, projectId, updatedAt',
    });
    this.version(2).stores({
      projects: 'id, status, updatedAt',
      pageNodes: 'id, projectId',
      pageRevisions: 'id, pageNodeId',
      revisionBlobs: 'revisionId',
      visualDevAssets: 'id, projectId',
      visualDevBlobs: 'assetId',
      scriptDocuments: 'id, projectId',
      snapshots: 'id, projectId',
      artVersions: 'id, projectId',
      archives: 'id, projectId',
      dirtySync: 'id, kind, projectId, updatedAt',
    });
    this.version(3).stores({
      projects: 'id, status, updatedAt, pipelineStatus, priorityRank',
      pageNodes: 'id, projectId',
      pageRevisions: 'id, pageNodeId',
      revisionBlobs: 'revisionId',
      visualDevAssets: 'id, projectId',
      visualDevBlobs: 'assetId',
      scriptDocuments: 'id, projectId',
      snapshots: 'id, projectId',
      artVersions: 'id, projectId',
      archives: 'id, projectId',
      dirtySync: 'id, kind, projectId, updatedAt',
      sketchbookSeeds: 'id, status, sortOrder, updatedAt',
      comicCharacters: 'id, projectId, name',
      pageReferences: 'id, projectId, scriptPageKey',
      pageMockups: 'id, projectId, scriptPageKey',
    });
    this.version(4).stores({
      projects: 'id, status, updatedAt, pipelineStatus, priorityRank',
      pageNodes: 'id, projectId',
      pageRevisions: 'id, pageNodeId',
      revisionBlobs: 'revisionId',
      visualDevAssets: 'id, projectId',
      visualDevBlobs: 'assetId',
      scriptDocuments: 'id, projectId',
      snapshots: 'id, projectId',
      artVersions: 'id, projectId',
      archives: 'id, projectId',
      dirtySync: 'id, kind, projectId, updatedAt',
      sketchbookSeeds: 'id, status, sortOrder, updatedAt',
      sketchbookBlobs: 'seedId',
      comicCharacters: 'id, projectId, name',
      pageReferences: 'id, projectId, scriptPageKey',
      pageMockups: 'id, projectId, scriptPageKey',
    });
  }
}

export const lyreflyDb = new LyreflyDb();

export async function markLyreflyDirtyRow(
  kind: LyreflyDirtySyncRow['kind'],
  rowId: string,
  action: LyreflyDirtySyncRow['action'],
  projectId?: string,
): Promise<void> {
  await lyreflyDb.dirtySync.put({
    id: lyreflyDirtySyncRowKey(kind, rowId),
    kind,
    rowId,
    action,
    projectId,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearLyreflyDirtyRow(
  kind: LyreflyDirtySyncRow['kind'],
  rowId: string,
): Promise<void> {
  await lyreflyDb.dirtySync.delete(lyreflyDirtySyncRowKey(kind, rowId));
}

export async function listLyreflyDirtyRows(): Promise<LyreflyDirtySyncRow[]> {
  return lyreflyDb.dirtySync.toArray();
}
