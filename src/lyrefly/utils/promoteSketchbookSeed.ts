import { richTextPlainText } from '../../shared/utils/richTextContent';
import { loadSketchbookBlob } from '../db/sketchbookMutations';
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { createVisualDevAsset, saveLyreflyProject } from '../db/lyreflyProjectMutations';
import { lyreflyStableId } from '../import/lyreflyStableId';
import {
  createBlankComicProject,
  createBlankScriptDocument,
  type ComicProject,
  type SketchbookSeed,
  type VisualDevAssetKind,
} from '../types';

/** A seed attachment (or the seed's own file) that cannot be carried into the comic. */
export class LyreflyPromoteError extends Error {}

type PlannedAsset =
  | { id: string; kind: 'link'; title: string; url: string; markdown?: string }
  | {
      id: string;
      kind: VisualDevAssetKind;
      title: string;
      fileName: string;
      mimeType?: string;
      /** The seed's own Drive file: referenced, never copied (ADR 0031). */
      driveFileId?: string;
      blob?: Blob;
    };

/** Ids derive from the seed, so developing the same note on two devices makes one comic. */
export function lyreflyWorkIdForSeed(seedId: string): string {
  return lyreflyStableId(`work-from-seed:${seedId}`);
}

function plainFirstLine(html: string | undefined): string | undefined {
  return richTextPlainText(html?.split('\n')[0]) || undefined;
}

async function planFile(
  seed: SketchbookSeed,
  blobId: string,
  kind: VisualDevAssetKind,
  title: string,
  fileName: string | undefined,
  mimeType: string | undefined,
): Promise<PlannedAsset> {
  const name = fileName || `${title || 'attachment'}.bin`;
  const id = lyreflyStableId(`work-from-seed:${seed.id}:asset:${blobId}`);
  const driveFileId = seed.blobDriveFileIds?.[blobId];
  if (driveFileId) return { id, kind, title, fileName: name, mimeType, driveFileId };
  const blob = await loadSketchbookBlob(blobId);
  if (!blob) throw new LyreflyPromoteError(`"${name}" is not on this device or in Drive yet. Sync, then try again.`);
  return { id, kind, title, fileName: name, mimeType, blob };
}

/** Everything the comic will get, checked before anything is written. */
async function planAssets(seed: SketchbookSeed): Promise<PlannedAsset[]> {
  const planned: PlannedAsset[] = [];
  const title = seed.title?.trim();
  if (seed.url?.trim()) {
    planned.push({
      id: lyreflyStableId(`work-from-seed:${seed.id}:link`),
      kind: 'link',
      title: title || seed.url.trim(),
      url: seed.url.trim(),
    });
  }
  if (seed.kind === 'image' || seed.kind === 'file') {
    planned.push(
      await planFile(
        seed,
        seed.id,
        seed.kind === 'image' ? 'image' : 'reference',
        title || seed.fileName || 'Sketchbook art',
        seed.fileName,
        seed.mimeType,
      ),
    );
  }
  for (const attachment of seed.attachments ?? []) {
    if (attachment.kind === 'link' && attachment.url?.trim()) {
      planned.push({
        id: lyreflyStableId(`work-from-seed:${seed.id}:asset:${attachment.id}`),
        kind: 'link',
        title: attachment.title?.trim() || attachment.url.trim(),
        url: attachment.url.trim(),
        markdown: attachment.notes,
      });
    } else if (attachment.kind === 'image' || attachment.kind === 'file') {
      planned.push(
        await planFile(
          seed,
          attachment.id,
          attachment.kind === 'image' ? 'image' : 'reference',
          attachment.title?.trim() || attachment.fileName || 'Sketchbook art',
          attachment.fileName,
          attachment.mimeType,
        ),
      );
    }
  }
  return planned;
}

/**
 * "Start developing" a Sketchbook note: it becomes a comic on the Workbench.
 * - notes → brainstorm; links → references; art and files → concept assets
 * - files the seed already has on Drive are referenced in place, not copied
 * - every id derives from the seed, so a second device, or a retry, lands on the same rows
 * - throws `LyreflyPromoteError`, having written nothing, when an attachment cannot be carried
 */
export async function promoteSketchbookSeed(seed: SketchbookSeed): Promise<ComicProject> {
  const projectId = lyreflyWorkIdForSeed(seed.id);
  const existing = await lyreflyDb.projects.get(projectId);
  const assets = existing ? [] : await planAssets(seed);

  let project: ComicProject;
  if (existing) {
    project = existing;
  } else {
    const now = new Date().toISOString();
    project = { ...createBlankComicProject(now), id: projectId };
    project.scriptDocumentId = lyreflyStableId(`work-from-seed:${seed.id}:script`);
    project.title = seed.title?.trim() || 'Untitled comic';
    project.subtitle = seed.logline ?? plainFirstLine(seed.bodyHtml);
    project.brainstormHtml = seed.bodyHtml;
    project.developingAt = now;

    const script = { ...createBlankScriptDocument(project.id, now), id: project.scriptDocumentId };
    await lyreflyDb.scriptDocuments.put(script);
    await markLyreflyDirtyRow('script', script.id, 'upsert', project.id);

    for (const asset of assets) {
      if (asset.kind === 'link' && 'url' in asset) {
        await createVisualDevAsset(project.id, {
          id: asset.id,
          kind: 'link',
          title: asset.title,
          url: asset.url,
          markdown: asset.markdown,
        });
      } else if ('fileName' in asset) {
        await createVisualDevAsset(project.id, {
          id: asset.id,
          kind: asset.kind,
          title: asset.title,
          driveFileId: asset.driveFileId,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          file: asset.blob
            ? new File([asset.blob], asset.fileName, {
                type: asset.mimeType || asset.blob.type || 'application/octet-stream',
              })
            : undefined,
        });
      }
    }
    await saveLyreflyProject(project, { immediate: true });
  }

  await lyreflyDb.sketchbookSeeds.put({
    ...seed,
    status: 'promoted',
    promotedProjectId: project.id,
    updatedAt: new Date().toISOString(),
  });
  await markLyreflyDirtyRow('sketchbook_seed', seed.id, 'upsert');
  return project;
}
