import type {
  EncoreDriveUploadFolderKind,
  EncoreDriveUploadFolderOverrides,
  EncoreMediaLink,
  EncoreSong,
  EncoreSongAttachment,
} from '../types';
import { encoreDb, getSyncMeta } from '../db/encoreDb';
import { effectiveSongAttachments } from '../utils/songAttachments';
import {
  driveCreateShortcut,
  driveGetFileMetadata,
  driveMoveFile,
  driveRenameFile,
} from './driveFetch';
import { resolveDriveUploadFolderId } from './resolveDriveUploadFolder';
import { splitFileNameExtension } from './performanceVideoNaming';

const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

function sanitizeForFilename(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Canonical filename inside the **effective** upload folder (override or Encore_App default).
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
 * Reconcile one attachment: ensure the file lives under the **effective** upload folder (saved overrides
 * or Encore defaults), rename it to the canonical spine, and when overrides place files outside
 * Encore_App, keep a shortcut with the same name inside the Encore bootstrap folder.
 */
export async function syncSongAttachmentInDrive(
  accessToken: string,
  song: EncoreSong,
  attachment: EncoreSongAttachment,
  effectiveFolderId: string,
  encoreBootstrapFolderId: string,
): Promise<SongAttachmentSyncResult> {
  const id = attachment.driveFileId?.trim();
  if (!id) return { renamed: false, moved: false };

  let meta = await driveGetFileMetadata(accessToken, id);
  let parents = meta.parents ?? [];
  if (parents.length === 0) return { renamed: false, moved: false };

  let moved = false;
  /** Only pull Encore-managed uploads out of the bootstrap folder when an override moves the effective target. */
  const shouldMoveToEffective =
    effectiveFolderId !== encoreBootstrapFolderId &&
    parents.includes(encoreBootstrapFolderId) &&
    !parents.includes(effectiveFolderId);
  if (shouldMoveToEffective) {
    await driveMoveFile(accessToken, id, effectiveFolderId, parents);
    moved = true;
    meta = await driveGetFileMetadata(accessToken, id);
    parents = meta.parents ?? [];
  }

  const inEffective = (meta.parents ?? []).includes(effectiveFolderId);

  if (inEffective) {
    const ext2 = splitFileNameExtension(meta.name ?? '').extension;
    const desiredBlobName = buildSongAttachmentDriveName(
      song,
      attachment,
      meta.mimeType === SHORTCUT_MIME ? '' : ext2,
    );
    let renamed = false;
    if ((meta.name ?? '') !== desiredBlobName) {
      await driveRenameFile(accessToken, id, desiredBlobName);
      renamed = true;
    }
    if (effectiveFolderId === encoreBootstrapFolderId) {
      const patch =
        attachment.encoreShortcutDriveFileId != null
          ? { encoreShortcutDriveFileId: undefined as string | undefined }
          : undefined;
      return { renamed, moved, attachmentPatch: patch };
    }
    const { shortcutId, renamedShortcut } = await ensureAttachmentShortcutInCanonical(
      accessToken,
      attachment,
      id,
      encoreBootstrapFolderId,
      desiredBlobName,
    );
    return {
      renamed: renamed || renamedShortcut,
      moved,
      attachmentPatch: { encoreShortcutDriveFileId: shortcutId },
    };
  }

  const isShortcutBlob = meta.mimeType === SHORTCUT_MIME;
  const { extension } = splitFileNameExtension(meta.name ?? '');
  const desiredName = buildSongAttachmentDriveName(song, attachment, isShortcutBlob ? '' : extension);
  const { shortcutId, renamedShortcut } = await ensureAttachmentShortcutInCanonical(
    accessToken,
    attachment,
    id,
    encoreBootstrapFolderId,
    desiredName,
  );
  return {
    renamed: renamedShortcut,
    moved,
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

/** Reference/backing Drive audio: same effective/bootstrap split as attachments. */
export async function syncDriveMediaLinkInDrive(
  accessToken: string,
  song: Pick<EncoreSong, 'title' | 'artist' | 'performanceKey' | 'id'>,
  link: EncoreMediaLink,
  effectiveFolderId: string,
  encoreBootstrapFolderId: string,
): Promise<DriveMediaLinkSyncResult> {
  if (link.source !== 'drive') return { renamed: false, moved: false };
  const targetId = link.driveFileId?.trim();
  if (!targetId) return { renamed: false, moved: false };

  let meta = await driveGetFileMetadata(accessToken, targetId);
  let parents = meta.parents ?? [];
  if (parents.length === 0) return { renamed: false, moved: false };

  let moved = false;
  const shouldMoveToEffective =
    effectiveFolderId !== encoreBootstrapFolderId &&
    parents.includes(encoreBootstrapFolderId) &&
    !parents.includes(effectiveFolderId);
  if (shouldMoveToEffective) {
    await driveMoveFile(accessToken, targetId, effectiveFolderId, parents);
    moved = true;
    meta = await driveGetFileMetadata(accessToken, targetId);
    parents = meta.parents ?? [];
  }

  const inEffective = (meta.parents ?? []).includes(effectiveFolderId);

  if (inEffective) {
    const isShortcut = meta.mimeType === SHORTCUT_MIME;
    const { extension } = splitFileNameExtension(meta.name ?? '');
    const desiredName = buildSongMediaLinkDriveName(song, isShortcut ? '' : extension);
    let renamed = false;
    if ((meta.name ?? '') !== desiredName) {
      await driveRenameFile(accessToken, targetId, desiredName);
      renamed = true;
    }
    if (effectiveFolderId === encoreBootstrapFolderId) {
      const patch =
        link.encoreShortcutDriveFileId != null
          ? { encoreShortcutDriveFileId: undefined as string | undefined }
          : undefined;
      return { renamed, moved, linkPatch: patch };
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
      encoreBootstrapFolderId,
      desiredName,
    );
    return {
      renamed: renamed || renamedShortcut,
      moved,
      linkPatch: { encoreShortcutDriveFileId: shortcutId },
    };
  }

  const isShortcut = meta.mimeType === SHORTCUT_MIME;
  const { extension } = splitFileNameExtension(meta.name ?? '');
  const desiredName = buildSongMediaLinkDriveName(song, isShortcut ? '' : extension);
  const fauxAtt: EncoreSongAttachment = {
    kind: 'backing',
    driveFileId: targetId,
    encoreShortcutDriveFileId: link.encoreShortcutDriveFileId,
  };
  const { shortcutId, renamedShortcut } = await ensureAttachmentShortcutInCanonical(
    accessToken,
    fauxAtt,
    targetId,
    encoreBootstrapFolderId,
    desiredName,
  );
  return {
    renamed: renamedShortcut,
    moved,
    linkPatch: { encoreShortcutDriveFileId: shortcutId },
  };
}

function requireFolderPair(
  kind: EncoreDriveUploadFolderKind,
  meta: Parameters<typeof resolveDriveUploadFolderId>[1],
  overrides: EncoreDriveUploadFolderOverrides | null | undefined,
): { effective: string; bootstrap: string } {
  const effective = resolveDriveUploadFolderId(kind, meta, overrides);
  const bootstrap = resolveDriveUploadFolderId(kind, meta, {});
  if (!effective || !bootstrap) {
    throw new Error(
      `${kind} folder missing; open Encore after signing in to Google so Drive layout syncs.`,
    );
  }
  return { effective, bootstrap };
}

/** Reorganize every Drive-backed song attachment (charts, backing tracks, recordings). */
export async function reorganizeAllSongAttachments(
  accessToken: string,
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides | null,
): Promise<{
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

  const ov = driveUploadFolderOverrides ?? undefined;
  const charts = requireFolderPair('charts', meta, ov);
  const takes = requireFolderPair('takes', meta, ov);
  const referenceTracks = requireFolderPair('referenceTracks', meta, ov);
  const backingTracks = requireFolderPair('backingTracks', meta, ov);

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
          const pair = att.kind === 'chart' ? charts : takes;
          const r = await syncSongAttachmentInDrive(
            accessToken,
            nextSong,
            att,
            pair.effective,
            pair.bootstrap,
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
          const r = await syncDriveMediaLinkInDrive(
            accessToken,
            nextSong,
            link,
            referenceTracks.effective,
            referenceTracks.bootstrap,
          );
          if (r.linkPatch) {
            nextSong = mergeMediaLinkShortcutPatch(nextSong, link.id, r.linkPatch, 'reference');
            touched = true;
            if (!hadShortcut && r.linkPatch.encoreShortcutDriveFileId) shortcutsCreated += 1;
          }
          if (r.renamed) renamed += 1;
          if (r.moved) moved += 1;
          if (!r.renamed && !r.moved && !r.linkPatch) skipped += 1;
        } catch {
          errors += 1;
        }
      }
      const backSnap = [...(nextSong.backingLinks ?? [])];
      for (const link of backSnap) {
        if (link.source !== 'drive' || !link.driveFileId?.trim()) continue;
        try {
          const hadShortcut = Boolean(link.encoreShortcutDriveFileId?.trim());
          const r = await syncDriveMediaLinkInDrive(
            accessToken,
            nextSong,
            link,
            backingTracks.effective,
            backingTracks.bootstrap,
          );
          if (r.linkPatch) {
            nextSong = mergeMediaLinkShortcutPatch(nextSong, link.id, r.linkPatch, 'backing');
            touched = true;
            if (!hadShortcut && r.linkPatch.encoreShortcutDriveFileId) shortcutsCreated += 1;
          }
          if (r.renamed) renamed += 1;
          if (r.moved) moved += 1;
          if (!r.renamed && !r.moved && !r.linkPatch) skipped += 1;
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
