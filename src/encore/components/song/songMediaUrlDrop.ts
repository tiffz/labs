import { parseDriveFileIdFromUrlOrId } from '../../drive/parseDriveFileUrl';
import { parseSpotifyTrackId } from '../../spotify/parseSpotifyTrackUrl';
import { parseYoutubeVideoId } from '../../youtube/parseYoutubeVideoUrl';
import type { EncoreSong } from '../../types';
import { addSongAttachment } from '../../utils/songAttachments';
import {
  appendDriveBackingLink,
  appendDriveReferenceLink,
  appendSpotifyBackingLink,
  appendSpotifyReferenceLink,
  appendYoutubeBackingLink,
  appendYoutubeReferenceLink,
} from '../../repertoire/songMediaLinks';
import type { SongMediaUploadSlot } from './songMediaUploadSlot';

export function extractFirstUrlFromDataTransfer(dt: DataTransfer): string | null {
  const uriBlock = dt.getData('text/uri-list')?.trim();
  if (uriBlock) {
    const line = uriBlock.split('\n').find((l) => l.trim() && !l.trim().startsWith('#'));
    if (line?.trim()) return line.trim();
  }
  const plain = dt.getData('text/plain')?.trim() ?? '';
  if (plain && /^https?:\/\//i.test(plain)) return plain;
  return null;
}

export function applyMediaUrlToSongSlot(song: EncoreSong, slot: SongMediaUploadSlot, rawUrl: string): EncoreSong | null {
  const t = rawUrl.trim();
  if (!t) return null;

  const yt = parseYoutubeVideoId(t);
  if (yt) {
    if (slot === 'listen') return appendYoutubeReferenceLink(song, t);
    if (slot === 'play') return appendYoutubeBackingLink(song, t);
    return null;
  }

  const st = parseSpotifyTrackId(t);
  if (st) {
    if (slot === 'listen') return appendSpotifyReferenceLink(song, st);
    if (slot === 'play') return appendSpotifyBackingLink(song, st);
    return null;
  }

  const drive = parseDriveFileIdFromUrlOrId(t);
  if (drive) {
    if (slot === 'listen') return appendDriveReferenceLink(song, drive, { label: 'Drive file' });
    if (slot === 'play') return appendDriveBackingLink(song, drive);
    if (slot === 'charts')
      return addSongAttachment(song, {
        kind: 'chart',
        driveFileId: drive,
        label: 'Chart from link',
        isPrimaryChart: false,
      });
    if (slot === 'takes')
      return addSongAttachment(song, {
        kind: 'recording',
        driveFileId: drive,
        label: 'Take from link',
      });
  }

  return null;
}
