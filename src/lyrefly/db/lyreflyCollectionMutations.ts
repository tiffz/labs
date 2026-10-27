/**
 * Collections: create, rename, archive, delete, fill from a Drive folder, and start a comic from
 * a few pieces.
 *
 * Pieces point at the owner's own Drive files (ADR 0029): Lyrefly reads them and never edits,
 * moves or trashes them. A file someone else owns is copied into `Lyrefly/collections/` first, so
 * a collection never depends on another person's Drive. "Make a comic" copies the images into
 * the new comic, so reworking a page can never touch the original piece.
 */
import {
  driveCreateFolder,
  driveGetMediaBlob,
  driveListFiles,
  driveResolveThumbnailLink,
} from '../../shared/drive/driveFetch';
import { escapeDriveQueryLiteral } from '../../shared/drive/escapeDriveQueryLiteral';
import { executeDriveFileImport, planDriveFileImport } from '../../shared/drive/importDriveFile';
import { LABS_DRIVE_APP_FOLDER_LYREFLY } from '../../shared/drive/labsDrivePortfolioLayout';
import { ensureLabsDrivePortfolioProgressLayout } from '../../shared/drive/labsDrivePortfolioLayout';
import { parseDriveFolderIdFromUserInput } from '../../shared/drive/parseDriveFolderUrl';
import { lyreflyStableId } from '../import/lyreflySiteImport';
import { createBlankComicProject, createBlankScriptDocument } from '../types';
import type { ComicProject, LyreflyCollection, LyreflyCollectionPiece } from '../types';
import { notifyLyreflyLocalChange } from './lyreflyChangeBus';
import { lyreflyDb, markLyreflyDirtyRow } from './lyreflyDb';
import { addPageRevisionFromFile, createPageNode, saveLyreflyProject } from './lyreflyProjectMutations';

const now = (): string => new Date().toISOString();

export async function createLyreflyCollection(title: string, status: LyreflyCollection['status'] = 'ongoing'): Promise<LyreflyCollection> {
  const at = now();
  const row: LyreflyCollection = { id: crypto.randomUUID(), title: title.trim() || 'Untitled collection', status, createdAt: at, updatedAt: at };
  await lyreflyDb.collections.put(row);
  notifyLyreflyLocalChange();
  return row;
}

export async function updateLyreflyCollection(
  collection: LyreflyCollection,
  patch: Partial<Pick<LyreflyCollection, 'title' | 'notes' | 'status'>>,
): Promise<void> {
  await lyreflyDb.collections.put({ ...collection, ...patch, updatedAt: now() });
  notifyLyreflyLocalChange();
}

/** Delete a collection and its pieces. Marker rows sync the delete; the Drive files are untouched. */
export async function deleteLyreflyCollection(collection: LyreflyCollection): Promise<void> {
  const at = now();
  await lyreflyDb.transaction('rw', [lyreflyDb.collections, lyreflyDb.collectionPieces], async () => {
    await lyreflyDb.collections.put({ ...collection, deletedAt: at, updatedAt: at });
    const pieces = await lyreflyDb.collectionPieces.where('collectionId').equals(collection.id).toArray();
    for (const p of pieces) {
      if (!p.deletedAt) await lyreflyDb.collectionPieces.put({ ...p, deletedAt: at, updatedAt: at });
    }
  });
  notifyLyreflyLocalChange();
}

export async function updateLyreflyPiece(
  piece: LyreflyCollectionPiece,
  patch: Partial<Pick<LyreflyCollectionPiece, 'title' | 'notes' | 'occurredOn'>>,
): Promise<void> {
  await lyreflyDb.collectionPieces.put({ ...piece, ...patch, updatedAt: now() });
  notifyLyreflyLocalChange();
}

/** Remove a piece from its collection. Only Lyrefly's record goes; the Drive file stays. */
export async function deleteLyreflyPiece(piece: LyreflyCollectionPiece): Promise<void> {
  const at = now();
  await lyreflyDb.collectionPieces.put({ ...piece, deletedAt: at, updatedAt: at });
  notifyLyreflyLocalChange();
}

/** "12.png" before "100.png": numbers in names compare as numbers. */
export function comparePieceFileNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/** Title from a file name, or nothing when the name is just a number ("12.png" says no more than its position). */
export function pieceTitleFromFileName(fileName: string): string | undefined {
  const stem = fileName.replace(/\.[^.]+$/, '').trim();
  return /^\d+$/.test(stem) || !stem ? undefined : stem;
}

const IMAGE = /^image\//;

async function ensureCollectionsFolder(accessToken: string): Promise<string> {
  const { appFolderId } = await ensureLabsDrivePortfolioProgressLayout(accessToken, LABS_DRIVE_APP_FOLDER_LYREFLY);
  const q = `name='collections' and mimeType='application/vnd.google-apps.folder' and '${appFolderId}' in parents and trashed=false`;
  const existing = (await driveListFiles(accessToken, q)).files?.[0] as { id?: string } | undefined;
  return existing?.id ?? (await driveCreateFolder(accessToken, 'collections', appFolderId)).id;
}

export type AddFromFolderResult = { added: number; alreadyHere: number; skipped: number };

/**
 * Add every image in a Drive folder to a collection. Re-adding the same folder adds only what is
 * new: a piece's id comes from the collection and the Drive file it ends up pointing at.
 */
export async function addLyreflyPiecesFromDriveFolder(
  collection: LyreflyCollection,
  folderLinkOrId: string,
  accessToken: string,
  onProgress: (label: string) => void = () => {},
): Promise<AddFromFolderResult> {
  const folderId = parseDriveFolderIdFromUserInput(folderLinkOrId);
  if (!folderId) throw new Error('That is not a Google Drive folder link.');

  const files: { id: string; name: string; mimeType?: string }[] = [];
  let pageToken: string | undefined;
  do {
    const list = await driveListFiles(
      accessToken,
      `'${escapeDriveQueryLiteral(folderId)}' in parents and trashed=false`,
      'nextPageToken,files(id,name,mimeType)',
      200,
      pageToken,
    );
    files.push(...((list.files ?? []) as typeof files));
    pageToken = list.nextPageToken;
  } while (pageToken);

  const images = files.filter((f) => f.mimeType && IMAGE.test(f.mimeType)).sort((a, b) => comparePieceFileNames(a.name, b.name));
  const existing = await lyreflyDb.collectionPieces.where('collectionId').equals(collection.id).toArray();
  let nextOrder = existing.reduce((max, p) => Math.max(max, p.order), -1) + 1;
  const result: AddFromFolderResult = { added: 0, alreadyHere: 0, skipped: files.length - images.length };
  let copyFolderId: string | null = null;

  for (const [i, file] of images.entries()) {
    onProgress(`Adding ${i + 1} of ${images.length}: ${file.name}`);
    const planned = await planDriveFileImport(accessToken, file.id, { accepts: (c) => Boolean(c.mimeType && IMAGE.test(c.mimeType)) });
    if (!planned.ok) {
      result.skipped += 1;
      continue;
    }
    // Already added (as a reference, or as the copy made last time)?
    const sourceId = planned.plan.kind === 'reference' ? planned.plan.fileId : planned.plan.sourceFileId;
    const sourceKey = lyreflyStableId(`piece-source:${collection.id}:${sourceId}`);
    if (existing.some((p) => p.id === sourceKey)) {
      result.alreadyHere += 1;
      continue;
    }
    if (planned.plan.kind === 'copy') copyFolderId ??= await ensureCollectionsFolder(accessToken);
    const imported = await executeDriveFileImport(planned.plan, { accessToken, parentFolderId: copyFolderId ?? '' });
    const at = now();
    const piece: LyreflyCollectionPiece = {
      id: sourceKey,
      collectionId: collection.id,
      title: pieceTitleFromFileName(file.name),
      driveFileId: imported.fileId,
      fileName: file.name,
      mimeType: file.mimeType ?? 'image/png',
      order: nextOrder++,
      createdAt: at,
      updatedAt: at,
    };
    await lyreflyDb.collectionPieces.put(piece);
    result.added += 1;
  }

  if (!collection.sourceUrl) {
    await lyreflyDb.collections.put({
      ...collection,
      sourceUrl: `https://drive.google.com/drive/folders/${folderId}`,
      updatedAt: now(),
    });
  }
  notifyLyreflyLocalChange({ immediate: true });
  return result;
}

/** A small cached thumbnail, fetched once per device. Null when Drive offers none (try again later). */
export async function loadLyreflyPieceThumb(piece: LyreflyCollectionPiece, accessToken: string): Promise<Blob | null> {
  const cached = await lyreflyDb.pieceThumbs.get(piece.driveFileId);
  if (cached?.blob && cached.blob.size > 0) return cached.blob;
  const link = await driveResolveThumbnailLink(accessToken, piece.driveFileId);
  if (!link) return null;
  const res = await fetch(link.replace(/=s\d+$/, '=s480'), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const blob = await res.blob();
  if (blob.size === 0) return null;
  await lyreflyDb.pieceThumbs.put({ driveFileId: piece.driveFileId, blob });
  return blob;
}

/**
 * Start a comic from pieces, in the order given. Each image is copied into the comic as a page,
 * so the comic can be redrawn without touching the collection. Returns the new comic's id.
 */
export async function makeLyreflyComicFromPieces(
  pieces: readonly LyreflyCollectionPiece[],
  title: string,
  accessToken: string,
  onProgress: (label: string) => void = () => {},
): Promise<string> {
  if (pieces.length === 0) throw new Error('Pick at least one piece.');
  // Download everything first, so a failure leaves no half-built comic.
  const files: File[] = [];
  for (const [i, piece] of pieces.entries()) {
    onProgress(`Copying ${i + 1} of ${pieces.length}`);
    const blob = await driveGetMediaBlob(accessToken, piece.driveFileId);
    files.push(new File([blob], piece.fileName, { type: blob.type || piece.mimeType }));
  }

  const at = now();
  let project: ComicProject = { ...createBlankComicProject(at), title: title.trim() || 'Untitled comic', status: 'wip' };
  const script = createBlankScriptDocument(project.id, at);
  project.scriptDocumentId = script.id;
  const collectionTitles = new Map(
    (await lyreflyDb.collections.bulkGet([...new Set(pieces.map((p) => p.collectionId))]))
      .filter((c): c is LyreflyCollection => Boolean(c))
      .map((c) => [c.id, c.title] as const),
  );
  project.brainstormHtml = `<p>Started from ${pieces
    .map((p) => `${collectionTitles.get(p.collectionId) ?? 'a collection'}: ${p.title ?? p.fileName}`)
    .join(', ')}.</p>`;
  await lyreflyDb.scriptDocuments.put(script);
  project = await saveLyreflyProject(project);

  for (const [i, piece] of pieces.entries()) {
    const node = await createPageNode(project, piece.title ?? `Page ${i + 1}`);
    await addPageRevisionFromFile(node, files[i]!, 'From collection', { stage: 'final' });
    project = (await lyreflyDb.projects.get(project.id))!;
  }

  // Remember where each piece went, so the collection can show it.
  for (const piece of pieces) {
    const current = await lyreflyDb.collectionPieces.get(piece.id);
    if (!current) continue;
    await lyreflyDb.collectionPieces.put({
      ...current,
      usedInProjectIds: [...new Set([...(current.usedInProjectIds ?? []), project.id])],
      updatedAt: now(),
    });
  }
  await markLyreflyDirtyRow('project', project.id, 'upsert', project.id);
  notifyLyreflyLocalChange({ immediate: true });
  return project.id;
}
