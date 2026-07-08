import type { EncoreMediaLink, EncoreMiscResource, EncoreSongAttachment } from '../types';
import { createResourceFromDriveFile } from './encoreResourceLinks';

/** Build a catch-all misc row from a Listen/Play media link. */
export function miscResourceFromMediaLink(link: EncoreMediaLink): EncoreMiscResource {
  const now = new Date().toISOString();
  const label =
    link.label?.trim() ||
    (link.source === 'spotify'
      ? 'Spotify track'
      : link.source === 'youtube'
        ? 'YouTube video'
        : 'Drive file');
  const notes = link.notes?.trim() || undefined;

  if (link.source === 'spotify' && link.spotifyTrackId?.trim()) {
    return {
      id: crypto.randomUUID(),
      kind: 'link',
      label,
      url: `https://open.spotify.com/track/${encodeURIComponent(link.spotifyTrackId.trim())}`,
      notes,
      createdAt: now,
    };
  }
  if (link.source === 'youtube' && link.youtubeVideoId?.trim()) {
    return {
      id: crypto.randomUUID(),
      kind: 'link',
      label,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(link.youtubeVideoId.trim())}`,
      notes,
      createdAt: now,
    };
  }
  if (link.source === 'drive' && link.driveFileId?.trim()) {
    return {
      ...createResourceFromDriveFile(link.driveFileId.trim(), { label }),
      notes,
    };
  }

  return {
    id: crypto.randomUUID(),
    kind: 'link',
    label,
    notes,
    createdAt: now,
  };
}

/** Build a catch-all misc row from a Drive attachment (chart or take). */
export function miscResourceFromAttachment(att: EncoreSongAttachment): EncoreMiscResource {
  const label = att.label?.trim() || (att.kind === 'chart' ? 'Chart' : 'Take');
  return {
    ...createResourceFromDriveFile(att.driveFileId, { label }),
    notes: att.notes?.trim() || undefined,
  };
}
