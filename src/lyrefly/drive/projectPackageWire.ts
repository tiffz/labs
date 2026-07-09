import type { ComicProject, PageNode, PageRevision, ScriptDocument, VisualDevAsset } from '../types';
import {
  LYREFLY_ARCHIVE_FILE,
  LYREFLY_LAYOUT_FILE,
  LYREFLY_PAGE_NODE_FILE,
  LYREFLY_PAGE_REVISIONS_FILE,
  LYREFLY_SCRIPT_JSON_FILE,
  LYREFLY_SCRIPT_MD_FILE,
  LYREFLY_VISUAL_DEV_INDEX_FILE,
} from './constants';

export interface LyreflyLayoutWireV1 {
  schemaVersion: 1;
  order: string[];
}

export interface LyreflyPageRevisionsWireV1 {
  schemaVersion: 1;
  revisions: PageRevision[];
  deletedRevisionIds?: Array<{ id: string; removedAt: string }>;
}

export interface LyreflyVisualDevIndexWireV1 {
  schemaVersion: 1;
  assets: VisualDevAsset[];
}

export function buildLayoutWire(order: readonly string[]): LyreflyLayoutWireV1 {
  return { schemaVersion: 1, order: [...order] };
}

export function parseLayoutWire(json: string): LyreflyLayoutWireV1 {
  const data = JSON.parse(json) as Partial<LyreflyLayoutWireV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported layout version.');
  if (!Array.isArray(data.order)) throw new Error('Layout is missing order.');
  return { schemaVersion: 1, order: data.order.map(String) };
}

export function serializeLayoutWire(wire: LyreflyLayoutWireV1): string {
  return JSON.stringify(wire);
}

export function serializeProjectJson(project: ComicProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(json: string): ComicProject {
  return JSON.parse(json) as ComicProject;
}

export function serializePageNodeJson(node: PageNode): string {
  return JSON.stringify(node, null, 2);
}

export function parsePageNodeJson(json: string): PageNode {
  return JSON.parse(json) as PageNode;
}

export function buildPageRevisionsWire(revisions: readonly PageRevision[]): LyreflyPageRevisionsWireV1 {
  return { schemaVersion: 1, revisions: [...revisions] };
}

export function parsePageRevisionsWire(json: string): LyreflyPageRevisionsWireV1 {
  const data = JSON.parse(json) as Partial<LyreflyPageRevisionsWireV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported revisions version.');
  if (!Array.isArray(data.revisions)) throw new Error('Revisions index is missing revisions array.');
  return {
    schemaVersion: 1,
    revisions: data.revisions as PageRevision[],
    deletedRevisionIds: data.deletedRevisionIds,
  };
}

export function serializePageRevisionsWire(wire: LyreflyPageRevisionsWireV1): string {
  return JSON.stringify(wire, null, 2);
}

export function serializeScriptMarkdown(markdown: string): string {
  return markdown;
}

export function serializeScriptDocumentJson(doc: ScriptDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function parseScriptDocumentJson(json: string): ScriptDocument {
  return JSON.parse(json) as ScriptDocument;
}

export function buildVisualDevIndexWire(assets: readonly VisualDevAsset[]): LyreflyVisualDevIndexWireV1 {
  return { schemaVersion: 1, assets: [...assets] };
}

export function parseVisualDevIndexWire(json: string): LyreflyVisualDevIndexWireV1 {
  const data = JSON.parse(json) as Partial<LyreflyVisualDevIndexWireV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported visual-dev index version.');
  if (!Array.isArray(data.assets)) throw new Error('Visual-dev index is missing assets array.');
  return { schemaVersion: 1, assets: data.assets as VisualDevAsset[] };
}

export function serializeVisualDevIndexWire(wire: LyreflyVisualDevIndexWireV1): string {
  return JSON.stringify(wire, null, 2);
}

/** Relative paths within a project package folder. */
export const LyreflyProjectPaths = {
  project: LYREFLY_LAYOUT_FILE.replace('layout.json', 'project.json'),
  layout: LYREFLY_LAYOUT_FILE,
  scriptMd: `script/${LYREFLY_SCRIPT_MD_FILE}`,
  scriptJson: `script/${LYREFLY_SCRIPT_JSON_FILE}`,
  pageNode: (pageNodeId: string) => `pages/${pageNodeId}/${LYREFLY_PAGE_NODE_FILE}`,
  pageRevisions: (pageNodeId: string) => `pages/${pageNodeId}/${LYREFLY_PAGE_REVISIONS_FILE}`,
  pageRevisionBlob: (pageNodeId: string, fileName: string) =>
    `pages/${pageNodeId}/revisions/${fileName}`,
  visualDevIndex: `${LYREFLY_VISUAL_DEV_INDEX_FILE.split('/')[0] ?? 'visual-dev'}/index.json`.replace(
    'index.json/index.json',
    'visual-dev/index.json',
  ),
  visualDevAsset: (fileName: string) => `visual-dev/assets/${fileName}`,
  archive: `archive/${LYREFLY_ARCHIVE_FILE}`,
  snapshot: (snapshotId: string) => `snapshots/${snapshotId}.json`,
} as const;

// Fix visualDevIndex path
export function lyreflyVisualDevIndexPath(): string {
  return 'visual-dev/index.json';
}

export function lyreflyArchivePath(): string {
  return `archive/${LYREFLY_ARCHIVE_FILE}`;
}
