import { parseDriveFileIdFromUrlOrId } from '../../shared/drive/parseDriveFolderUrl';
import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import { hostnameMatches, tryParseUrl } from '../../shared/url/safeUrlHost';
import { richTextLinkPreview } from '../../shared/utils/richTextContent';
import type { VisualDevAsset, VisualDevAssetKind } from '../types';

export function conceptShelfOpenUrl(asset: VisualDevAsset): string | undefined {
  if (asset.url?.trim()) return asset.url.trim();
  if (asset.driveFileId?.trim()) {
    return `https://drive.google.com/file/d/${encodeURIComponent(asset.driveFileId)}/view`;
  }
  return undefined;
}

export function inferConceptLabelFromUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url) return 'Reference';

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'docs.google.com') {
      if (/\/document\//i.test(url)) return 'Google Doc';
      if (/\/spreadsheets\//i.test(url)) return 'Google Sheet';
      if (/\/presentation\//i.test(url)) return 'Google Slides';
      if (/\/forms\//i.test(url)) return 'Google Form';
      return 'Google Docs';
    }
    if (host === 'drive.google.com') return 'Google Drive file';
    if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'YouTube video';
    if (host.endsWith('notion.so') || host.endsWith('notion.site')) return 'Notion page';
  } catch {
    /* fall through */
  }

  return richTextLinkPreview(url).title || url;
}

export function inferConceptKindFromUrl(url: string): VisualDevAssetKind {
  if (hostnameMatches(url, 'docs.google.com')) {
    const parsed = tryParseUrl(url);
    if (parsed && /\/document\//i.test(parsed.pathname)) return 'reference';
  }
  if (hostnameMatches(url, 'drive.google.com')) return 'reference';
  if (/\.pdf($|\?)/i.test(url) || url.toLowerCase().includes('pdf')) return 'reference';
  return assetKindForLink(url);
}

function assetKindForLink(url: string): VisualDevAssetKind {
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return 'moodboard';
  return 'reference';
}

export function inferConceptKindFromFile(file: File): VisualDevAssetKind {
  const mime = inferMediaMimeType(file);
  if (mime.startsWith('image/')) {
    return file.name.toLowerCase().includes('sketch') ? 'sketch' : 'image';
  }
  return 'reference';
}

export type ConceptShelfCreateInput = {
  kind: VisualDevAssetKind;
  title: string;
  url?: string;
  markdown?: string;
  driveFileId?: string;
  file?: File;
};

export function buildConceptShelfCreateInput(
  rawUrl: string,
  label: string,
  notes: string,
  file?: File,
): ConceptShelfCreateInput | null {
  const url = rawUrl.trim();
  const noteText = notes.trim();
  const title = label.trim();

  if (file) {
    return {
      kind: inferConceptKindFromFile(file),
      title: title || file.name.replace(/\.[^.]+$/, ''),
      file,
    };
  }

  if (!url && !noteText) return null;

  if (!url) {
    return {
      kind: 'note',
      title: title || 'Idea note',
      markdown: noteText,
    };
  }

  const driveId = parseDriveFileIdFromUrlOrId(url);
  const kind = inferConceptKindFromUrl(url);

  return {
    kind,
    title: title || inferConceptLabelFromUrl(url),
    url: driveId ? undefined : url,
    driveFileId: driveId ?? undefined,
    markdown: noteText || undefined,
  };
}

export function conceptShelfKindCaption(kind: VisualDevAssetKind): string {
  switch (kind) {
    case 'image':
      return 'Image';
    case 'sketch':
      return 'Sketch';
    case 'moodboard':
      return 'Moodboard';
    case 'reference':
      return 'Reference';
    case 'note':
      return 'Note';
    case 'link':
      return 'Link';
    default:
      return 'Reference';
  }
}

export function isConceptGalleryVisual(asset: VisualDevAsset): boolean {
  if (asset.kind === 'image' || asset.kind === 'sketch') return true;
  if (asset.kind === 'note' || asset.kind === 'link') return false;
  return Boolean(asset.fileName);
}

export function partitionConceptShelfAssets(assets: VisualDevAsset[]): {
  gallery: VisualDevAsset[];
  references: VisualDevAsset[];
} {
  const gallery: VisualDevAsset[] = [];
  const references: VisualDevAsset[] = [];
  for (const asset of assets) {
    if (isConceptGalleryVisual(asset)) gallery.push(asset);
    else references.push(asset);
  }
  return { gallery, references };
}
