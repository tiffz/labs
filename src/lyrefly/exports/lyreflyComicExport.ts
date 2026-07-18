import type { ComicProject, PageNode, PageRevision } from '../types';
import { loadRevisionBlobUrl } from '../db/lyreflyProjectMutations';
import {
  blobToDataUrl,
  buildMixamZipBlob,
  composeVerticalScrollBlob,
  createDistributionPdf,
  createFacingSpreadPdf,
  downloadBlob,
  mixamFileNameFromDisplayName,
  resizeImageBlobForPlatform,
  splitSpreadImage,
  type ComicPlatformPreset,
  type ComicPlatformPresetId,
  type FacingSpreadPdfFormat,
  COMIC_PLATFORM_PRESETS,
} from '../../shared/zine';
import { buildLabsDownloadFileName } from '../../shared/utils/labsDownloadFileName';
import { buildComicSpreadViews } from '../utils/comicSpreadViews';

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
  downloadBlob(pdf, buildLabsDownloadFileName([project.title || 'comic'], 'pdf'));
}

/** Single long JPEG matching scroll preview order (spreads split left→right). */
export async function downloadLyreflyScrollImage(
  project: ComicProject,
  pages: readonly LyreflyExportPage[],
): Promise<void> {
  const segments: string[] = [];
  for (const page of pages) {
    if (page.node.isSpread) {
      const [left, right] = await splitSpreadImage(page.dataUrl);
      segments.push(left, right);
    } else {
      segments.push(page.dataUrl);
    }
  }
  const blob = await composeVerticalScrollBlob(segments);
  downloadBlob(blob, buildLabsDownloadFileName([project.title || 'comic', 'Scroll'], 'jpg'));
}

/** Book-preview PDF: facing spreads — digital (screen) or print-ready (keeps blank pads). */
export async function downloadLyreflyBookSpreadPdf(
  project: ComicProject,
  pages: readonly LyreflyExportPage[],
  format: FacingSpreadPdfFormat,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const previewPages = pages.map((page) => ({
    id: page.node.id,
    label: page.node.displayName ?? 'Page',
    imageUrl: page.dataUrl,
    isSpread: page.node.isSpread,
  }));
  const views = buildComicSpreadViews(previewPages);
  const pdf = await createFacingSpreadPdf(views, format, onProgress);
  const formatLabel = format === 'print' ? 'Print' : 'Digital';
  downloadBlob(
    pdf,
    buildLabsDownloadFileName([project.title || 'comic', 'Book', formatLabel], 'pdf'),
  );
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
