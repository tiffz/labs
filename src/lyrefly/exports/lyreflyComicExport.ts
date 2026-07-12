import type { ComicProject, PageNode, PageRevision } from '../types';
import { loadRevisionBlobUrl } from '../db/lyreflyProjectMutations';
import {
  blobToDataUrl,
  buildMixamZipBlob,
  createDistributionPdf,
  downloadBlob,
  mixamFileNameFromDisplayName,
  resizeImageBlobForPlatform,
  type ComicPlatformPreset,
  type ComicPlatformPresetId,
  COMIC_PLATFORM_PRESETS,
} from '../../shared/zine';

export type LyreflyExportPage = {
  node: PageNode;
  revision: PageRevision;
  blob: Blob;
  dataUrl: string;
};

export async function loadLyreflyExportPages(
  project: ComicProject,
  pageNodes: PageNode[],
  revisions: PageRevision[],
  options?: { revisionByPageId?: Record<string, string>; strictRevisionMap?: boolean },
): Promise<LyreflyExportPage[]> {
  const byId = new Map(pageNodes.map((node) => [node.id, node]));
  const revisionsByNode = new Map<string, PageRevision[]>();
  for (const revision of revisions) {
    const list = revisionsByNode.get(revision.pageNodeId) ?? [];
    list.push(revision);
    revisionsByNode.set(revision.pageNodeId, list);
  }

  const strict = options?.strictRevisionMap && options.revisionByPageId;
  const layoutOrder = strict
    ? project.layoutOrder.filter((nodeId) => options.revisionByPageId![nodeId])
    : project.layoutOrder;

  const loaded: LyreflyExportPage[] = [];
  for (const nodeId of layoutOrder) {
    const node = byId.get(nodeId);
    if (!node) continue;
    const nodeRevisions = revisionsByNode.get(node.id) ?? [];
    const overrideId = options?.revisionByPageId?.[node.id];
    if (strict && !overrideId) continue;
    const active =
      (overrideId ? nodeRevisions.find((revision) => revision.id === overrideId) : undefined) ??
      nodeRevisions.find((revision) => revision.id === node.activeRevisionId) ??
      nodeRevisions[nodeRevisions.length - 1];
    if (!active) continue;

    const objectUrl = await loadRevisionBlobUrl(active.id);
    if (!objectUrl) continue;
    const response = await fetch(objectUrl);
    const blob = await response.blob();
    URL.revokeObjectURL(objectUrl);
    const dataUrl = await blobToDataUrl(blob);
    loaded.push({ node, revision: active, blob, dataUrl });
  }

  return loaded;
}

export async function downloadLyreflyMixamZip(
  project: ComicProject,
  pages: readonly LyreflyExportPage[],
): Promise<void> {
  const entries = pages.map((page) => ({
    fileName: mixamFileNameFromDisplayName(page.node.displayName ?? 'Page', {
      isSpread: page.node.isSpread,
      mimeType: page.revision.mimeType,
    }),
    blob: page.blob,
  }));
  const zip = await buildMixamZipBlob(entries);
  const safeTitle = project.title.replace(/[^\w\s-]+/g, '').trim() || 'comic';
  downloadBlob(zip, `${safeTitle} - Mixam pages.zip`);
}

export async function downloadLyreflyDistributionPdf(
  project: ComicProject,
  pages: readonly LyreflyExportPage[],
  onProgress?: (progress: number) => void,
): Promise<void> {
  const pdf = await createDistributionPdf(
    pages.map((page) => ({
      label: page.node.displayName ?? 'Page',
      dataUrl: page.dataUrl,
    })),
    onProgress,
  );
  const safeTitle = project.title.replace(/[^\w\s-]+/g, '').trim() || 'comic';
  downloadBlob(pdf, `${safeTitle}.pdf`);
}

export async function downloadLyreflyPlatformZip(
  project: ComicProject,
  pages: readonly LyreflyExportPage[],
  presetId: ComicPlatformPresetId,
): Promise<void> {
  const preset: ComicPlatformPreset = COMIC_PLATFORM_PRESETS[presetId];
  const entries = await Promise.all(
    pages.map(async (page, index) => {
      const resized = await resizeImageBlobForPlatform(page.blob, preset);
      return {
        fileName: `${String(index + 1).padStart(2, '0')}-${mixamFileNameFromDisplayName(
          page.node.displayName ?? `Page ${index + 1}`,
          { isSpread: page.node.isSpread, mimeType: page.revision.mimeType },
        ).replace(/\.[^.]+$/, '.jpg')}`,
        blob: resized,
      };
    }),
  );
  const zip = await buildMixamZipBlob(entries);
  const safeTitle = project.title.replace(/[^\w\s-]+/g, '').trim() || 'comic';
  downloadBlob(zip, `${safeTitle} - ${preset.label}.zip`);
}
