import { loadSketchbookBlob } from '../db/sketchbookMutations';
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { createVisualDevAsset, saveLyreflyProject } from '../db/lyreflyProjectMutations';
import {
  createBlankComicProject,
  createBlankScriptDocument,
  type ComicProject,
  type SketchbookSeed,
  type VisualDevAssetKind,
} from '../types';

function fileFromBlob(blob: Blob, fileName: string, mimeType?: string): File {
  return new File([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
}

async function copySketchbookBlobAsConcept(
  projectId: string,
  options: {
    blobId: string;
    kind: VisualDevAssetKind;
    title: string;
    fileName?: string;
    mimeType?: string;
  },
): Promise<void> {
  const blob = await loadSketchbookBlob(options.blobId);
  if (!blob) return;
  const fileName = options.fileName || `${options.title || 'attachment'}.bin`;
  await createVisualDevAsset(projectId, {
    kind: options.kind,
    title: options.title || fileName,
    file: fileFromBlob(blob, fileName, options.mimeType),
  });
}

/**
 * Promote a sketchbook entry into a new comic:
 * - notes → project brainstorm
 * - links → brainstorm reference assets
 * - art/files → concept shelf assets
 */
export async function promoteSketchbookSeed(seed: SketchbookSeed): Promise<ComicProject> {
  const project = createBlankComicProject();
  project.title = seed.title?.trim() || 'Untitled comic';
  project.subtitle = seed.logline ?? seed.bodyHtml?.split('\n')[0];
  project.pipelineStatus = 'fleshing_out';
  project.brainstormHtml = seed.bodyHtml;

  const script = createBlankScriptDocument(project.id);
  script.id = project.scriptDocumentId;
  await lyreflyDb.scriptDocuments.put(script);
  await markLyreflyDirtyRow('script', script.id, 'upsert', project.id);

  if (seed.url?.trim()) {
    await createVisualDevAsset(project.id, {
      kind: 'link',
      title: seed.title?.trim() || seed.url.trim(),
      url: seed.url.trim(),
    });
  }

  if (seed.kind === 'image' || seed.kind === 'file') {
    await copySketchbookBlobAsConcept(project.id, {
      blobId: seed.id,
      kind: seed.kind === 'image' ? 'image' : 'reference',
      title: seed.title?.trim() || seed.fileName || 'Sketchbook art',
      fileName: seed.fileName,
      mimeType: seed.mimeType,
    });
  }

  for (const attachment of seed.attachments ?? []) {
    if (attachment.kind === 'link' && attachment.url?.trim()) {
      await createVisualDevAsset(project.id, {
        kind: 'link',
        title: attachment.title?.trim() || attachment.url.trim(),
        url: attachment.url.trim(),
        markdown: attachment.notes,
      });
      continue;
    }
    if (attachment.kind === 'image' || attachment.kind === 'file') {
      await copySketchbookBlobAsConcept(project.id, {
        blobId: attachment.id,
        kind: attachment.kind === 'image' ? 'image' : 'reference',
        title: attachment.title?.trim() || attachment.fileName || 'Sketchbook art',
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
      });
    }
  }

  const now = new Date().toISOString();
  await lyreflyDb.sketchbookSeeds.put({
    ...seed,
    status: 'promoted',
    promotedProjectId: project.id,
    updatedAt: now,
  });
  await markLyreflyDirtyRow('sketchbook_seed', seed.id, 'upsert');
  await saveLyreflyProject(project, { immediate: true });
  return project;
}
