import type { EncorePerformance, EncoreSong } from '../types';
import { effectiveSongAttachments } from '../utils/songAttachments';

/** One Encore row field that stores a Google Drive file id. */
export type EncoreDriveFileRef = {
  fileId: string;
  label: string;
  songId?: string;
  performanceId?: string;
};

function pushRef(out: EncoreDriveFileRef[], fileId: string | undefined, label: string, ctx: Omit<EncoreDriveFileRef, 'fileId' | 'label'>): void {
  const id = fileId?.trim();
  if (!id) return;
  out.push({ fileId: id, label, ...ctx });
}

/** Collect every Drive file id Encore repertoire references (attachments, media links, performances, misc). */
export function collectEncoreDriveFileRefs(
  songs: readonly EncoreSong[],
  performances: readonly EncorePerformance[],
): EncoreDriveFileRef[] {
  const out: EncoreDriveFileRef[] = [];

  for (const song of songs) {
    const songLabel = song.title.trim() || 'Untitled song';
    for (const att of effectiveSongAttachments(song)) {
      const kind =
        att.kind === 'chart' ? 'Chart' : att.kind === 'backing' ? 'Backing' : 'Recording';
      pushRef(out, att.driveFileId, `${songLabel} · ${kind}`, { songId: song.id });
      pushRef(out, att.encoreShortcutDriveFileId, `${songLabel} · ${kind} shortcut`, { songId: song.id });
    }
    for (const link of song.referenceLinks ?? []) {
      if (link.source !== 'drive') continue;
      pushRef(out, link.driveFileId, `${songLabel} · Reference`, { songId: song.id });
      pushRef(out, link.encoreShortcutDriveFileId, `${songLabel} · Reference shortcut`, { songId: song.id });
    }
    for (const link of song.backingLinks ?? []) {
      if (link.source !== 'drive') continue;
      pushRef(out, link.driveFileId, `${songLabel} · Backing`, { songId: song.id });
      pushRef(out, link.encoreShortcutDriveFileId, `${songLabel} · Backing shortcut`, { songId: song.id });
    }
    for (const misc of song.miscResources ?? []) {
      pushRef(out, misc.driveFileId, `${songLabel} · Misc · ${misc.label}`, { songId: song.id });
      pushRef(out, misc.encoreShortcutDriveFileId, `${songLabel} · Misc shortcut`, { songId: song.id });
    }
  }

  for (const perf of performances) {
    const perfLabel = perf.venueTag?.trim() || perf.date || 'Performance';
    pushRef(out, perf.videoTargetDriveFileId, `${perfLabel} · Video`, { performanceId: perf.id });
    pushRef(out, perf.videoShortcutDriveFileId, `${perfLabel} · Video shortcut`, { performanceId: perf.id });
  }

  return out;
}
