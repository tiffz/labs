import type { EncoreMediaLink, EncoreSong, EncoreSongAttachment } from '../types';
import { encoreDb, getSyncMeta } from '../db/encoreDb';
import { effectiveSongAttachments } from '../utils/songAttachments';
import {
  driveCreateShortcut,
  driveGetFileMetadata,
  driveRenameFile,
} from './driveFetch';
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

/** Same spine as backing attachments — reference/backing Drive links use this in the Encore folder. */
export function buildSongMediaLinkDriveName(
  song: Pick<EncoreSong, 'title' | 'artist'>,
  extension: string,
): string {
  return buildSongAttachmentDriveName(song, { kind: 'backing' }, extension);
}

function attachmentCanonicalFolderId(
  attachment: EncoreSongAttachment,
  sheetMusicFolderId: string,
  recordingsFolderId: string,
): string {
  if (attachment.kind === 'recording') return recordingsFolderId;
  return sheetMusicFolderId;
}

export type SongAttachmentSyncResult = {
  renamed: boolean;
  moved: boolean;
  attachmentPatch?: Pick<EncoreSongAttachment, 'encoreShortcutDriveFileId'>;
};

function mergeAttachmentShortcutPatch(
  song: EncoreSong,
  attachmentDriveFileId: string,
  patch: Pick<EncoreSongAttachment, 'encoreShortcutDriveFileId'>,
): EncoreSong {
  const attachments = effectiveSongAttachments(song);
  const nextAtt = attachments.map((a) =>
    a.driveFileId === attachmentDriveFileId ? { ...a, ...patch } : a,
  );
  return { ...song, attachments: nextAtt };
}

async function ensureAttachmentShortcutInCanonical(
  accessToken: string,
  attachment: EncoreSongAttachment,
  targetId: string,
  canonicalFolderId: string,
  desiredShortcutName: string,
): Promise<{ shortcutId: string; renamedShortcut: boolean }> {
  const sid = attachment.encoreShortcutDriveFileId?.trim();
  if (sid) {
    try {
      const sm = await driveGetFileMetadata(accessToken, sid);
      const okTarget = sm.shortcutDetails?.targetId === targetId;
      const okParent = (sm.parents ?? []).includes(canonicalFolderId);
      if (sm.mimeType === SHORTCUT_MIME && okTarget && okParent) {
        let renamedShortcut = false;
        if ((sm.name ?? '') !== desiredShortcutName) {
          await driveRenameFile(accessToken, sid, desiredShortcutName);
          renamedShortcut = true;
        }
        return { shortcutId: sid, renamedShortcut };
      }
    } catch {
      /* create fresh shortcut */
    }
  }
  const created = await driveCreateShortcut(accessToken, desiredShortcutName, canonicalFolderId, targetId);
  return { shortcutId: created.id, renamedShortcut: false };
}

/**
 * Reconcile one attachment: files **inside** the Encore canonical folder are renamed in place.
 * Files **outside** stay put; a shortcut with a canonical name is ensured in the Encore folder.
 */
export async function syncSongAttachmentInDrive(
  accessToken: string,
  song: EncoreSong,
  attachment: EncoreSongAttachment,
  sheetMusicFolderId: string,
  recordingsFolderId: string,
): Promise<SongAttachmentSyncResult> {
  const canonicalFolder = attachmentCanonicalFolderId(attachment, sheetMusicFolderId, recordingsFolderId);
  const id = attachment.driveFileId?.trim();
  if (!id) return { renamed: false, moved: false };

  const meta = await driveGetFileMetadata(accessToken, id);
  const parents = meta.parents ?? [];
  if (parents.length === 0) return { renamed: false, moved: false };

  const targetInCanonical = parents.includes(canonicalFolder);

  if (targetInCanonical) {
    const ext2 = splitFileNameExtension(meta.name ?? '').extension;
    const desired2 = buildSongAttachmentDriveName(song, attachment, meta.mimeType === SHORTCUT_MIME ? '' : ext2);
    let renamed = false;
    if ((meta.name ?? '') !== desired2) {
      await driveRenameFile(accessToken, id, desired2);
      renamed = true;
    }
    const patch =
      attachment.encoreShortcutDriveFileId != null
        ? { encoreShortcutDriveFileId: undefined as string | undefined }
        : undefined;
    return { renamed, moved: false, attachmentPatch: patch };
  }

  const isShortcutBlob = meta.mimeType === SHORTCUT_MIME;
  const { extension } = splitFileNameExtension(meta.name ?? '');
  const desiredName = buildSongAttachmentDriveName(song, attachment, isShortcutBlob ? '' : extension);

  // Target lives outside Encore canonical folder — keep file; shortcut only.
  const { shortcutId, renamedShortcut } = await ensureAttachmentShortcutInCanonical(
    accessToken,
    attachment,
    id,
    canonicalFolder,
    desiredName,
  );
  return {
    renamed: renamedShortcut,
    moved: false,
    attachmentPatch: { encoreShortcutDriveFileId: shortcutId },
  };
}

export type DriveMediaLinkSyncResult = {
  renamed: boolean;
  moved: boolean;
  linkPatch?: Pick<EncoreMediaLink, 'encoreShortcutDriveFileId'>;
};

function mergeMediaLinkShortcutPatch(
  song: EncoreSong,
  linkId: string,
  patch: Pick<EncoreMediaLink, 'encoreShortcutDriveFileId'>,
  which: 'reference' | 'backing',
): EncoreSong {
  if (which === 'reference') {
    return {
      ...song,
      referenceLinks: (song.referenceLinks ?? []).map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
    };
  }
  return {
    ...song,
    backingLinks: (song.backingLinks ?? []).map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
  };
}

/** Reference/backing Drive audio: canonical shortcuts live under Encore `recordingsFolderId` (matches default uploads). */
export async function syncDriveMediaLinkInDrive(
  accessToken: string,
  song: Pick<EncoreSong, 'title' | 'artist' | 'performanceKey' | 'id'>,
  link: EncoreMediaLink,
  recordingsFolderId: string,
): Promise<DriveMediaLinkSyncResult> {
  if (link.source !== 'drive') return { renamed: false, moved: false };
  const targetId = link.driveFileId?.trim();
  if (!targetId) return { renamed: false, moved: false };

  const meta = await driveGetFileMetadata(accessToken, targetId);
  const parents = meta.parents ?? [];
  if (parents.length === 0) return { renamed: false, moved: false };

  const targetInCanonical = parents.includes(recordingsFolderId);
  const isShortcut = meta.mimeType === SHORTCUT_MIME;
  const { extension } = splitFileNameExtension(meta.name ?? '');
  const desiredName = buildSongMediaLinkDriveName(song, isShortcut ? '' : extension);

  if (targetInCanonical) {
    const ext2 = splitFileNameExtension(meta.name ?? '').extension;
    const desired2 = buildSongMediaLinkDriveName(song, meta.mimeType === SHORTCUT_MIME ? '' : ext2);
    let renamed = false;
    if ((meta.name ?? '') !== desired2) {
      await driveRenameFile(accessToken, targetId, desired2);
      renamed = true;
    }
    const patch =
      link.encoreShortcutDriveFileId != null
        ? { encoreShortcutDriveFileId: undefined as string | undefined }
        : undefined;
    return { renamed, moved: false, linkPatch: patch };
  }

  const fauxAtt: EncoreSongAttachment = {
    kind: 'backing',
    driveFileId: targetId,
    encoreShortcutDriveFileId: link.encoreShortcutDriveFileId,
  };
  const { shortcutId, renamedShortcut } = await ensureAttachmentShortcutInCanonical(
    accessToken,
    fauxAtt,
    targetId,
    recordingsFolderId,
    desiredName,
  );
  return {
    renamed: renamedShortcut,
    moved: false,
    linkPatch: { encoreShortcutDriveFileId: shortcutId },
  };
}

/** Reorganize every Drive-backed song attachment (charts, backing tracks, recordings). */
export async function reorganizeAllSongAttachments(accessToken: string): Promise<{
  renamed: number;
  moved: number;
  skipped: number;
  errors: number;
  shortcutsCreated: number;
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
  let shortcutsCreated = 0;

  for (const song of songs) {
    try {
      let nextSong: EncoreSong = song;
      let touched = false;
      const attachments = effectiveSongAttachments(song);
      for (const att of attachments) {
        if (!att.driveFileId?.trim()) {
          skipped += 1;
          continue;
        }
        try {
          const hadShortcut = Boolean(att.encoreShortcutDriveFileId?.trim());
          const r = await syncSongAttachmentInDrive(
            accessToken,
            nextSong,
            att,
            sheetMusicFolderId,
            recordingsFolderId,
          );
          if (r.attachmentPatch) {
            nextSong = mergeAttachmentShortcutPatch(nextSong, att.driveFileId, r.attachmentPatch);
            touched = true;
            if (!hadShortcut && r.attachmentPatch.encoreShortcutDriveFileId) shortcutsCreated += 1;
          }
          if (r.renamed) renamed += 1;
          if (r.moved) moved += 1;
          if (!r.renamed && !r.moved && !r.attachmentPatch) skipped += 1;
        } catch {
          errors += 1;
        }
      }

      const refSnap = [...(nextSong.referenceLinks ?? [])];
      for (const link of refSnap) {
        if (link.source !== 'drive' || !link.driveFileId?.trim()) continue;
        try {
          const hadShortcut = Boolean(link.encoreShortcutDriveFileId?.trim());
          const r = await syncDriveMediaLinkInDrive(accessToken, nextSong, link, recordingsFolderId);
          if (r.linkPatch) {
            nextSong = mergeMediaLinkShortcutPatch(nextSong, link.id, r.linkPatch, 'reference');
            touched = true;
            if (!hadShortcut && r.linkPatch.encoreShortcutDriveFileId) shortcutsCreated += 1;
          }
          if (r.renamed) renamed += 1;
          if (!r.renamed && !r.linkPatch) skipped += 1;
        } catch {
          errors += 1;
        }
      }
      const backSnap = [...(nextSong.backingLinks ?? [])];
      for (const link of backSnap) {
        if (link.source !== 'drive' || !link.driveFileId?.trim()) continue;
        try {
          const hadShortcut = Boolean(link.encoreShortcutDriveFileId?.trim());
          const r = await syncDriveMediaLinkInDrive(accessToken, nextSong, link, recordingsFolderId);
          if (r.linkPatch) {
            nextSong = mergeMediaLinkShortcutPatch(nextSong, link.id, r.linkPatch, 'backing');
            touched = true;
            if (!hadShortcut && r.linkPatch.encoreShortcutDriveFileId) shortcutsCreated += 1;
          }
          if (r.renamed) renamed += 1;
          if (!r.renamed && !r.linkPatch) skipped += 1;
        } catch {
          errors += 1;
        }
      }

      if (touched) {
        const now = new Date().toISOString();
        await encoreDb.songs.put({ ...nextSong, updatedAt: now });
      }
    } catch {
      errors += 1;
    }
  }

  return { renamed, moved, skipped, errors, shortcutsCreated };
}
