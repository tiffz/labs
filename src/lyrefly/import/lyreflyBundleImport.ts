/**
 * Import a Lyrefly bundle: a JSON file of comics and Sketchbook ideas gathered from somewhere else
 * (a tracker doc, an old notes app). The owner's material is personal, so it travels as a file
 * they pick, never in this repo.
 *
 * Safe to run again, like the site import: every row gets an id derived from the entry's `key`,
 * so a second run finds what the first wrote. It fills gaps and never overwrites: a comic's queue
 * place, notes or script that already exist are left as they are, and an idea deleted since the
 * last run stays deleted (its marker row holds the same id).
 *
 * Collections carry images. The bundle names each image by file, and the owner picks the files
 * along with the bundle: the old sources (a Google Photos album, a retired site) do not let a
 * browser read their images, so they are downloaded first and imported from disk.
 */
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { parseScriptHtml } from '../script/scriptHtmlParser';
import { analyzeScriptPacing } from '../script/scriptPacingAnalyzer';
import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import { createBlankComicProject } from '../types';
import type {
  ComicProject,
  LyreflyCollection,
  LyreflyCollectionPiece,
  LyreflyPipelineStatus,
  SketchbookSeed,
  VisualDevAsset,
} from '../types';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { lyreflyStableId } from './lyreflySiteImport';
import {
  addLyreflyPiecesFromDriveFolder,
  ensureLyreflyCollectionFolder,
  uploadLyreflyPieceFile,
} from '../db/lyreflyCollectionMutations';
import { parseDriveFolderIdFromUserInput } from '../../shared/drive/parseDriveFolderUrl';

export type LyreflyBundleLink = { title: string; url: string };

export type LyreflyBundleComic = {
  /** Stable across re-runs, unique within the bundle's source (`tracker:the-flame`). */
  key: string;
  title: string;
  pipelineStatus?: LyreflyPipelineStatus;
  /** Queue order: lower comes first. */
  priorityRank?: number;
  /** Brainstorm notes: story bible, loglines (HTML). */
  brainstormHtml?: string;
  /** Script in Lyrefly's nested-list form (HTML). */
  scriptHtml?: string;
  links?: LyreflyBundleLink[];
};

export type LyreflyBundleSeed = {
  key: string;
  kind: 'idea' | 'daily_flash';
  title: string;
  /**
   * Plain text, newlines kept: the Sketchbook stores an idea's notes as text (in a field named
   * `bodyHtml` for history's sake), and shows any tags literally.
   */
  body?: string;
  /** YYYY-MM-DD */
  occurredOn?: string;
  links?: LyreflyBundleLink[];
};

export type LyreflyBundlePiece = {
  /** Unique within its collection. */
  key: string;
  /** Name of an image picked along with the bundle. */
  file: string;
  title?: string;
  /** Plain text: a caption, alt text. */
  notes?: string;
  /** YYYY-MM-DD */
  occurredOn?: string;
  /** Where the piece was first posted. */
  sourceUrl?: string;
};

export type LyreflyBundleCollection = {
  key: string;
  title: string;
  /** Old work goes in as `archived`: kept and searchable, folded out of the way. */
  status: LyreflyCollection['status'];
  notes?: string;
  sourceUrl?: string;
  /**
   * A Google Drive folder of the owner's images. They are linked where they are, never copied
   * (ADR 0029), and re-importing links only what is new in the folder.
   */
  driveFolder?: string;
  /** In reading order. */
  pieces: LyreflyBundlePiece[];
};

export type LyreflyBundleV1 = {
  format: 'lyrefly-bundle';
  version: 1;
  /** Shown in the preview ("from Tiff's Story Tracker"). */
  source: string;
  comics: LyreflyBundleComic[];
  seeds: LyreflyBundleSeed[];
  collections?: LyreflyBundleCollection[];
};

export class LyreflyBundleError extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PIPELINE: ReadonlySet<string> = new Set(['fleshing_out', 'ready_to_draw', 'complete']);

function isLink(v: unknown): v is LyreflyBundleLink {
  return Boolean(v) && typeof (v as LyreflyBundleLink).url === 'string' && typeof (v as LyreflyBundleLink).title === 'string';
}

/** Validate a parsed file. Anything malformed is an error with a reason, never a partial import. */
export function parseLyreflyBundle(raw: unknown): LyreflyBundleV1 {
  const b = raw as Partial<LyreflyBundleV1>;
  if (b?.format !== 'lyrefly-bundle') throw new LyreflyBundleError('This file is not a Lyrefly bundle.');
  if (b.version !== 1) throw new LyreflyBundleError(`Bundle version ${String(b.version)} is not supported.`);
  if (!Array.isArray(b.comics) || !Array.isArray(b.seeds)) throw new LyreflyBundleError('The bundle has no comics or ideas list.');
  const keys = new Set<string>();
  const checkKey = (key: unknown, what: string) => {
    if (typeof key !== 'string' || !key.trim()) throw new LyreflyBundleError(`A ${what} has no key.`);
    if (keys.has(key)) throw new LyreflyBundleError(`The key "${key}" is used twice.`);
    keys.add(key);
  };
  for (const c of b.comics) {
    checkKey(c?.key, 'comic');
    if (typeof c.title !== 'string' || !c.title.trim()) throw new LyreflyBundleError(`Comic "${c.key}" has no title.`);
    if (c.pipelineStatus !== undefined && !PIPELINE.has(c.pipelineStatus)) {
      throw new LyreflyBundleError(`Comic "${c.title}" has an unknown status "${c.pipelineStatus}".`);
    }
    if (c.links && !c.links.every(isLink)) throw new LyreflyBundleError(`Comic "${c.title}" has a malformed link.`);
  }
  for (const s of b.seeds) {
    checkKey(s?.key, 'idea');
    if (s.kind !== 'idea' && s.kind !== 'daily_flash') throw new LyreflyBundleError(`Idea "${s.key}" has an unknown kind.`);
    if (typeof s.title !== 'string' || !s.title.trim()) throw new LyreflyBundleError(`Idea "${s.key}" has no title.`);
    if (s.body !== undefined && /<\/?[a-z][^>]*>/i.test(s.body)) {
      throw new LyreflyBundleError(`Idea "${s.title}" has HTML in its body; ideas are plain text.`);
    }
    if (s.occurredOn !== undefined && !DATE.test(s.occurredOn)) {
      throw new LyreflyBundleError(`Idea "${s.title}" has a date that is not YYYY-MM-DD.`);
    }
    if (s.links && !s.links.every(isLink)) throw new LyreflyBundleError(`Idea "${s.title}" has a malformed link.`);
  }
  if (b.collections !== undefined && !Array.isArray(b.collections)) throw new LyreflyBundleError('The collections are not a list.');
  for (const c of b.collections ?? []) {
    checkKey(c?.key, 'collection');
    if (typeof c.title !== 'string' || !c.title.trim()) throw new LyreflyBundleError(`Collection "${c.key}" has no title.`);
    if (c.status !== 'ongoing' && c.status !== 'archived') {
      throw new LyreflyBundleError(`Collection "${c.title}" has an unknown status "${String(c.status)}".`);
    }
    if (c.driveFolder !== undefined && !parseDriveFolderIdFromUserInput(c.driveFolder)) {
      throw new LyreflyBundleError(`Collection "${c.title}" has a Drive folder that is not a folder link.`);
    }
    if (!Array.isArray(c.pieces)) throw new LyreflyBundleError(`Collection "${c.title}" has no pieces list.`);
    const pieceKeys = new Set<string>();
    for (const p of c.pieces) {
      if (typeof p?.key !== 'string' || !p.key.trim()) throw new LyreflyBundleError(`A piece in "${c.title}" has no key.`);
      if (pieceKeys.has(p.key)) throw new LyreflyBundleError(`The piece key "${p.key}" is used twice in "${c.title}".`);
      pieceKeys.add(p.key);
      if (typeof p.file !== 'string' || !p.file.trim()) throw new LyreflyBundleError(`Piece "${p.key}" in "${c.title}" names no file.`);
      if (p.occurredOn !== undefined && !DATE.test(p.occurredOn)) {
        throw new LyreflyBundleError(`Piece "${p.key}" in "${c.title}" has a date that is not YYYY-MM-DD.`);
      }
    }
  }
  return b as LyreflyBundleV1;
}

export type BundleComicAction = 'create' | 'update' | 'link';
export type BundleSeedAction = 'create' | 'exists' | 'deleted';
/** `missing`: the bundle names a file that was not picked with it. */
export type BundlePieceAction = 'create' | 'exists' | 'deleted' | 'missing';

export type BundleCollectionPlan = {
  collection: LyreflyBundleCollection;
  collectionId: string;
  action: BundleSeedAction;
  pieces: { piece: LyreflyBundlePiece; pieceId: string; file?: File; action: BundlePieceAction }[];
};

export type LyreflyBundlePlan = {
  bundle: LyreflyBundleV1;
  comics: { comic: LyreflyBundleComic; projectId: string; action: BundleComicAction }[];
  seeds: { seed: LyreflyBundleSeed; seedId: string; action: BundleSeedAction }[];
  collections: BundleCollectionPlan[];
};

/** Pieces the import will upload. */
export function bundlePiecesToUpload(plan: LyreflyBundlePlan): number {
  return plan.collections.reduce((n, c) => n + c.pieces.filter((p) => p.action === 'create').length, 0);
}

/** Collections that will link a Drive folder (a deleted one stays deleted). */
export function bundleFoldersToLink(plan: LyreflyBundlePlan): BundleCollectionPlan[] {
  return plan.collections.filter((c) => c.collection.driveFolder && c.action !== 'deleted');
}

/** Drive sign-in is needed only to upload or to link. */
export function bundleNeedsDrive(plan: LyreflyBundlePlan): boolean {
  return bundlePiecesToUpload(plan) > 0 || bundleFoldersToLink(plan).length > 0;
}

const lower = (s: string): string => s.trim().toLowerCase();

export async function planLyreflyBundleImport(
  bundle: LyreflyBundleV1,
  /** Images picked along with the bundle, matched to pieces by file name. */
  files: readonly File[] = [],
): Promise<LyreflyBundlePlan> {
  const projects = await lyreflyDb.projects.toArray();
  const comics = bundle.comics.map((comic) => {
    const stableId = lyreflyStableId(`project:${comic.key}`);
    const existing =
      projects.find((p) => p.importKey === comic.key || p.id === stableId) ??
      projects.find((p) => lower(p.title) === lower(comic.title));
    const action: BundleComicAction = !existing
      ? 'create'
      : existing.importKey === comic.key || existing.id === stableId
        ? 'update'
        : 'link';
    return { comic, projectId: existing?.id ?? stableId, action };
  });
  const seeds = [];
  for (const seed of bundle.seeds) {
    const seedId = lyreflyStableId(`seed:${seed.key}`);
    const existing = await lyreflyDb.sketchbookSeeds.get(seedId);
    const action: BundleSeedAction = !existing ? 'create' : existing.deletedAt ? 'deleted' : 'exists';
    seeds.push({ seed, seedId, action });
  }
  const byName = new Map(files.map((f) => [f.name, f] as const));
  const collections: BundleCollectionPlan[] = [];
  for (const collection of bundle.collections ?? []) {
    const collectionId = lyreflyStableId(`collection:${collection.key}`);
    const existing = await lyreflyDb.collections.get(collectionId);
    const action: BundleSeedAction = !existing ? 'create' : existing.deletedAt ? 'deleted' : 'exists';
    const pieces = [];
    for (const piece of collection.pieces) {
      const pieceId = lyreflyStableId(`piece:${collection.key}:${piece.key}`);
      const file = byName.get(piece.file);
      const row = action === 'deleted' ? undefined : await lyreflyDb.collectionPieces.get(pieceId);
      // A deleted collection takes its pieces with it: re-importing must not bring them back.
      const pieceAction: BundlePieceAction =
        action === 'deleted' || row?.deletedAt ? 'deleted' : row ? 'exists' : file ? 'create' : 'missing';
      pieces.push({ piece, pieceId, file, action: pieceAction });
    }
    collections.push({ collection, collectionId, action, pieces });
  }
  return { bundle, comics, seeds, collections };
}

/** Stages a tracker status implies are done: "ready to draw" means the story and script are. */
function stagesDone(status: LyreflyPipelineStatus | undefined): Partial<Record<LyreflyWorkflowStage, boolean>> | undefined {
  if (status === 'ready_to_draw') return { brainstorm: true, script: true };
  if (status === 'complete') return { brainstorm: true, script: true, thumbs: true, art: true, publish: true };
  return undefined;
}

async function addLinks(projectId: string, comicKey: string, links: readonly LyreflyBundleLink[] | undefined): Promise<void> {
  if (!links?.length) return;
  const existing = await lyreflyDb.visualDevAssets.where('projectId').equals(projectId).toArray();
  const known = new Set(existing.map((a) => a.url).filter(Boolean));
  const now = new Date().toISOString();
  for (const link of links) {
    if (known.has(link.url)) continue;
    known.add(link.url);
    const asset: VisualDevAsset = {
      id: lyreflyStableId(`link:${comicKey}:${link.url}`),
      projectId,
      kind: 'link',
      title: link.title,
      url: link.url,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await lyreflyDb.visualDevAssets.put(asset);
    await markLyreflyDirtyRow('visual_dev', asset.id, 'upsert', projectId);
  }
}

async function writeScript(project: ComicProject, html: string): Promise<void> {
  const current = await lyreflyDb.scriptDocuments.get(project.scriptDocumentId);
  if (current && !isRichTextEmpty(current.markdown)) return; // never overwrite a script
  const blocks = parseScriptHtml(html);
  await lyreflyDb.scriptDocuments.put({
    id: project.scriptDocumentId,
    projectId: project.id,
    markdown: html,
    blocks,
    pacingWarnings: analyzeScriptPacing(blocks),
    updatedAt: new Date().toISOString(),
  });
  await markLyreflyDirtyRow('script', project.scriptDocumentId, 'upsert', project.id);
}

export type LyreflyBundleResult = {
  comicsCreated: number;
  comicsUpdated: number;
  ideasAdded: number;
  collectionsCreated: number;
  piecesAdded: number;
  /** Images linked from Drive folders, in place. */
  piecesLinked: number;
};

export type ApplyBundleOptions = {
  /** Asked for once, and only when there are images to upload. */
  getAccessToken?: () => Promise<string>;
  onProgress?: (label: string) => void;
};

export async function applyLyreflyBundleImport(
  plan: LyreflyBundlePlan,
  { getAccessToken, onProgress = () => {} }: ApplyBundleOptions = {},
): Promise<LyreflyBundleResult> {
  const result: LyreflyBundleResult = { comicsCreated: 0, comicsUpdated: 0, ideasAdded: 0, collectionsCreated: 0, piecesAdded: 0, piecesLinked: 0 };
  const tables = [
    lyreflyDb.projects,
    lyreflyDb.scriptDocuments,
    lyreflyDb.visualDevAssets,
    lyreflyDb.sketchbookSeeds,
    lyreflyDb.dirtySync,
  ];
  try {
    for (const { comic, projectId } of plan.comics) {
      await lyreflyDb.transaction('rw', tables, async () => {
        const now = new Date().toISOString();
        // The database decides, not the plan: a re-run or a sync may have written it meanwhile.
        const existing = await lyreflyDb.projects.get(projectId);
        const project: ComicProject = existing
          ? {
              ...existing,
              importKey: existing.importKey ?? comic.key,
              pipelineStatus: existing.pipelineStatus ?? comic.pipelineStatus,
              priorityRank: existing.priorityRank ?? comic.priorityRank,
              stageCompletion: existing.stageCompletion ?? stagesDone(comic.pipelineStatus),
              brainstormHtml: isRichTextEmpty(existing.brainstormHtml) ? comic.brainstormHtml : existing.brainstormHtml,
              updatedAt: now,
            }
          : {
              ...createBlankComicProject(now),
              id: projectId,
              scriptDocumentId: lyreflyStableId(`script:${comic.key}`),
              title: comic.title,
              status: comic.pipelineStatus === 'complete' ? 'finished' : 'wip',
              importKey: comic.key,
              pipelineStatus: comic.pipelineStatus,
              priorityRank: comic.priorityRank,
              stageCompletion: stagesDone(comic.pipelineStatus),
              brainstormHtml: comic.brainstormHtml,
            };
        await lyreflyDb.projects.put(project);
        await markLyreflyDirtyRow('project', project.id, 'upsert', project.id);
        if (comic.scriptHtml) await writeScript(project, comic.scriptHtml);
        await addLinks(project.id, comic.key, comic.links);
        if (existing) result.comicsUpdated += 1;
        else result.comicsCreated += 1;
      });
    }

    const baseSort = await lyreflyDb.sketchbookSeeds.count();
    for (const [i, { seed, seedId }] of plan.seeds.entries()) {
      // Present already, or deleted since an earlier run (its marker holds this id): leave it.
      if (await lyreflyDb.sketchbookSeeds.get(seedId)) continue;
      const now = new Date().toISOString();
      const row: SketchbookSeed = {
        id: seedId,
        kind: seed.kind,
        title: seed.title,
        bodyHtml: seed.body,
        occurredOn: seed.occurredOn,
        attachments: seed.links?.map((link) => ({
          id: lyreflyStableId(`seed-link:${seed.key}:${link.url}`),
          kind: 'link' as const,
          title: link.title,
          url: link.url,
          createdAt: now,
        })),
        tags: [],
        status: 'active',
        sortOrder: baseSort + i,
        createdAt: now,
        updatedAt: now,
      };
      await lyreflyDb.sketchbookSeeds.put(row);
      await markLyreflyDirtyRow('sketchbook_seed', row.id, 'upsert');
      result.ideasAdded += 1;
    }

    await applyCollections(plan, result, getAccessToken, onProgress);
  } finally {
    notifyLyreflyLocalChange({ immediate: true });
  }
  return result;
}

async function applyCollections(
  plan: LyreflyBundlePlan,
  result: LyreflyBundleResult,
  getAccessToken: ApplyBundleOptions['getAccessToken'],
  onProgress: (label: string) => void,
): Promise<void> {
  const total = bundlePiecesToUpload(plan);
  if (bundleNeedsDrive(plan) && !getAccessToken) throw new LyreflyBundleError('Sign in to Google Drive to import images.');
  let token: string | null = null;
  let uploaded = 0;
  for (const { collection, collectionId, pieces } of plan.collections) {
    let row = await lyreflyDb.collections.get(collectionId);
    if (row?.deletedAt) continue;
    if (!row) {
      const at = new Date().toISOString();
      row = {
        id: collectionId,
        title: collection.title,
        status: collection.status,
        notes: collection.notes,
        sourceUrl: collection.sourceUrl,
        createdAt: at,
        updatedAt: at,
      } satisfies LyreflyCollection;
      await lyreflyDb.collections.put(row);
      result.collectionsCreated += 1;
    }
    let folderId: string | null = null;
    for (const [order, { piece, pieceId, file, action }] of pieces.entries()) {
      if (action !== 'create' || !file) continue;
      // Each piece is written as soon as its upload lands, so a stopped import resumes from here.
      if (await lyreflyDb.collectionPieces.get(pieceId)) continue;
      onProgress(`Uploading ${uploaded + 1} of ${total}: ${file.name}`);
      token ??= await getAccessToken!();
      folderId ??= await ensureLyreflyCollectionFolder(row.title, token);
      const driveFileId = await uploadLyreflyPieceFile(file, folderId, token);
      const at = new Date().toISOString();
      await lyreflyDb.collectionPieces.put({
        id: pieceId,
        collectionId,
        title: piece.title,
        notes: piece.notes,
        occurredOn: piece.occurredOn,
        sourceUrl: piece.sourceUrl,
        driveFileId,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        order,
        createdAt: at,
        updatedAt: at,
      } satisfies LyreflyCollectionPiece);
      uploaded += 1;
      result.piecesAdded += 1;
    }
    if (collection.driveFolder) {
      token ??= await getAccessToken!();
      onProgress(`Linking ${row.title} from Drive`);
      const linked = await addLyreflyPiecesFromDriveFolder(row, collection.driveFolder, token, onProgress);
      result.piecesLinked += linked.added;
    }
  }
}
