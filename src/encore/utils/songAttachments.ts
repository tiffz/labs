import type { EncoreSong, EncoreSongAttachment } from '../types';

/** Effective attachment list (new model plus legacy Drive ids). */
export function effectiveSongAttachments(s: EncoreSong): EncoreSongAttachment[] {
  const out: EncoreSongAttachment[] = [...(s.attachments ?? [])];
  if (s.sheetMusicDriveFileId && !out.some((a) => a.driveFileId === s.sheetMusicDriveFileId)) {
    out.unshift({ kind: 'chart', driveFileId: s.sheetMusicDriveFileId, label: 'Chart' });
  }
  if (s.backingTrackDriveFileId && !out.some((a) => a.driveFileId === s.backingTrackDriveFileId)) {
    out.push({ kind: 'backing', driveFileId: s.backingTrackDriveFileId, label: 'Backing track' });
  }
  for (const id of s.recordingDriveFileIds ?? []) {
    if (!out.some((a) => a.driveFileId === id)) {
      out.push({ kind: 'recording', driveFileId: id, label: 'Recording' });
    }
  }
  return out;
}

/** Persist legacy single-id fields from attachment kinds for older clients and simple queries. */
export function songWithSyncedLegacyDriveIds(s: EncoreSong): EncoreSong {
  const charts = (s.attachments ?? []).filter((a) => a.kind === 'chart');
  const backings = (s.attachments ?? []).filter((a) => a.kind === 'backing');
  const recordings = (s.attachments ?? []).filter((a) => a.kind === 'recording');
  return {
    ...s,
    sheetMusicDriveFileId: charts[0]?.driveFileId ?? s.sheetMusicDriveFileId,
    backingTrackDriveFileId: backings[0]?.driveFileId ?? s.backingTrackDriveFileId,
    recordingDriveFileIds: recordings.length ? recordings.map((r) => r.driveFileId) : s.recordingDriveFileIds,
  };
}

export function addSongAttachment(s: EncoreSong, att: EncoreSongAttachment): EncoreSong {
  const cur = [...(s.attachments ?? [])];
  if (!cur.some((a) => a.driveFileId === att.driveFileId)) {
    cur.push(att);
  }
  return songWithSyncedLegacyDriveIds({ ...s, attachments: cur, updatedAt: new Date().toISOString() });
}
