import type { EncoreSong, EncoreSongAttachment } from '../types';
import { encoreDb, getSyncMeta } from '../db/encoreDb';
import { effectiveSongAttachments } from '../utils/songAttachments';
import { driveGetFileMetadata, driveMoveFile, driveRenameFile } from './driveFetch';
import { splitFileNameExtension } from './performanceVideoNaming';

const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

function sanitizeForFilename(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Canonical filename inside `Encore_App/SheetMusic` or `Encore_App/Song recordings`.
 *
 * Uses the same `Title - Artist` spine as performance videos. **Charts** append the song’s performance key when set:
 * `Title - Artist - Key.ext`; otherwise `Title - Artist.ext`. Recordings and backing tracks use `Title - Artist.ext`
 * only (no attachment label segment).
 *
 * - `extension` includes the leading dot for real files; empty for shortcuts.
 */
export function buildSongAttachmentDriveName(
  song: Pick<EncoreSong, 'title' | 'artist' | 'performanceKey'>,
  attachment: Pick<EncoreSongAttachment, 'kind'>,
  extension: string,
): string {
  const title = sanitizeForFilename(song.title.trim() || 'Untitled song');
  const artist = sanitizeForFilename(song.artist.trim() || 'Unknown artist');
  let tail = '';
  if (attachment.kind === 'chart') {
    const k = song.performanceKey?.trim();
    if (k) tail = ` - ${sanitizeForFilename(k)}`;
  }
  let base = `${title} - ${artist}${tail}`;
  const MAX_LEN = 200;
  if (base.length > MAX_LEN) base = `${base.slice(0, MAX_LEN - 1)}…`;
  return `${base}${extension}`;
}

function attachmentTargetFolderId(
  attachment: EncoreSongAttachment,
  sheetMusicFolderId: string,
  recordingsFolderId: string,
): string {
  if (attachment.kind === 'recording') return recordingsFolderId;
  return sheetMusicFolderId;
}

/**
 * Move (if needed) and rename one song attachment so it lives under the Encore chart/recording
 * folder with a stable `Title - Artist`-based name.
 */
export async function syncSongAttachmentInDrive(
  accessToken: string,
  song: EncoreSong,
  attachment: EncoreSongAttachment,
  sheetMusicFolderId: string,
  recordingsFolderId: string,
): Promise<{ renamed: boolean; moved: boolean }> {
  const targetFolder = attachmentTargetFolderId(attachment, sheetMusicFolderId, recordingsFolderId);
  const id = attachment.driveFileId?.trim();
  if (!id) return { renamed: false, moved: false };

  let meta = await driveGetFileMetadata(accessToken, id);
  const parents = meta.parents ?? [];
  if (parents.length === 0) return { renamed: false, moved: false };

  let moved = false;
  if (!parents.includes(targetFolder)) {
    const previousParent = parents[0];
    await driveMoveFile(accessToken, id, targetFolder, previousParent);
    moved = true;
    meta = await driveGetFileMetadata(accessToken, id);
  }

  const isShortcut = meta.mimeType === SHORTCUT_MIME;
  const { extension } = splitFileNameExtension(meta.name ?? '');
  const desired = buildSongAttachmentDriveName(song, attachment, isShortcut ? '' : extension);
  if ((meta.name ?? '') !== desired) {
    await driveRenameFile(accessToken, id, desired);
    return { renamed: true, moved };
  }
  return { renamed: false, moved };
}

/** Reorganize every Drive-backed song attachment (charts, backing tracks, recordings). */
export async function reorganizeAllSongAttachments(accessToken: string): Promise<{
  renamed: number;
  moved: number;
  skipped: number;
  errors: number;
}> {
  const meta = await getSyncMeta();
  if (!meta.sheetMusicFolderId || !meta.recordingsFolderId) {
    throw new Error('Sheet music or recordings folder missing; open Encore after signing in to Google so Drive layout syncs.');
  }
  const { sheetMusicFolderId, recordingsFolderId } = meta;

  const songs = await encoreDb.songs.toArray();
  let renamed = 0;
  let moved = 0;
  let skipped = 0;
  let errors = 0;

  for (const song of songs) {
    const attachments = effectiveSongAttachments(song);
    for (const att of attachments) {
      if (!att.driveFileId?.trim()) {
        skipped += 1;
        continue;
      }
      try {
        const r = await syncSongAttachmentInDrive(
          accessToken,
          song,
          att,
          sheetMusicFolderId,
          recordingsFolderId,
        );
        if (r.renamed) renamed += 1;
        if (r.moved) moved += 1;
        if (!r.renamed && !r.moved) skipped += 1;
      } catch {
        errors += 1;
      }
    }
  }

  return { renamed, moved, skipped, errors };
}
