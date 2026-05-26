import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import type { EncoreMiscResource, EncoreMiscResourceKind, EncoreSong } from '../types';

export function resourceLinkOpenUrl(resource: EncoreMiscResource): string | undefined {
  if (resource.url?.trim()) return resource.url.trim();
  if (resource.driveFileId?.trim()) {
    return `https://drive.google.com/file/d/${encodeURIComponent(resource.driveFileId)}/view`;
  }
  return undefined;
}

export function inferResourceKindFromUrl(url: string): EncoreMiscResourceKind {
  if (/docs\.google\.com\/document/i.test(url)) return 'google-doc';
  if (/\.pdf($|\?)/i.test(url) || url.toLowerCase().includes('pdf')) return 'pdf';
  return 'link';
}

export function inferResourceKindFromFile(file: File): EncoreMiscResourceKind {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('text/')) return 'text';
  return 'file';
}

export function createResourceFromUrl(rawUrl: string, label?: string): EncoreMiscResource | null {
  const url = rawUrl.trim();
  if (!url) return null;

  const driveId = parseDriveFileIdFromUrlOrId(url);
  if (driveId) {
    return {
      id: crypto.randomUUID(),
      kind: inferResourceKindFromUrl(url),
      label: label?.trim() || 'Drive file',
      driveFileId: driveId,
      createdAt: new Date().toISOString(),
    };
  }

  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) return null;

  return {
    id: crypto.randomUUID(),
    kind: inferResourceKindFromUrl(url),
    label: label?.trim() || url,
    url,
    createdAt: new Date().toISOString(),
  };
}

export function createResourceFromLocalFile(file: File): EncoreMiscResource {
  return {
    id: crypto.randomUUID(),
    kind: inferResourceKindFromFile(file),
    label: file.name,
    url: URL.createObjectURL(file),
    mimeType: file.type || undefined,
    createdAt: new Date().toISOString(),
  };
}

export function createResourceFromDriveFile(
  driveFileId: string,
  opts?: { label?: string; mimeType?: string },
): EncoreMiscResource {
  const id = driveFileId.trim();
  const label = opts?.label?.trim() || 'File';
  const mime = opts?.mimeType ?? '';
  let kind: EncoreMiscResourceKind = 'file';
  if (mime === 'application/pdf') kind = 'pdf';
  else if (mime.startsWith('audio/')) kind = 'audio';
  else if (mime.startsWith('text/')) kind = 'text';

  return {
    id: crypto.randomUUID(),
    kind,
    label,
    driveFileId: id,
    mimeType: mime || undefined,
    createdAt: new Date().toISOString(),
  };
}

export function appendMiscResource(song: EncoreSong, resource: EncoreMiscResource): EncoreSong {
  const cur = song.miscResources ?? [];
  if (cur.some((r) => r.id === resource.id)) return song;
  return {
    ...song,
    miscResources: [...cur, resource],
    updatedAt: new Date().toISOString(),
  };
}

export function appendMiscResourceFromUrl(song: EncoreSong, rawUrl: string, label?: string): EncoreSong | null {
  const resource = createResourceFromUrl(rawUrl, label);
  if (!resource) return null;
  return appendMiscResource(song, resource);
}

export function appendMiscResourceFromDriveFile(
  song: EncoreSong,
  driveFileId: string,
  opts?: { label?: string; mimeType?: string },
): EncoreSong {
  return appendMiscResource(song, createResourceFromDriveFile(driveFileId, opts));
}

export function appendMiscResourceFromLocalFile(song: EncoreSong, file: File): EncoreSong {
  return appendMiscResource(song, createResourceFromLocalFile(file));
}
