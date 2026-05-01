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

/** Default chart for quick links (primary flag, else first chart). */
export function primaryChartAttachment(s: EncoreSong): EncoreSongAttachment | undefined {
  const charts = effectiveSongAttachments(s).filter((a) => a.kind === 'chart');
  return charts.find((a) => a.isPrimaryChart) ?? charts[0];
}

/** Persist legacy single-id fields from attachment kinds for older clients and simple queries. */
export function songWithSyncedLegacyDriveIds(s: EncoreSong): EncoreSong {
  const charts = (s.attachments ?? []).filter((a) => a.kind === 'chart');
  const backings = (s.attachments ?? []).filter((a) => a.kind === 'backing');
  const recordings = (s.attachments ?? []).filter((a) => a.kind === 'recording');
  const primaryChart = charts.find((c) => c.isPrimaryChart) ?? charts[0];
  return {
    ...s,
    sheetMusicDriveFileId: primaryChart?.driveFileId ?? s.sheetMusicDriveFileId,
    backingTrackDriveFileId: backings[0]?.driveFileId ?? s.backingTrackDriveFileId,
    recordingDriveFileIds: recordings.length ? recordings.map((r) => r.driveFileId) : s.recordingDriveFileIds,
  };
}

export function setPrimaryChartByDriveFileId(s: EncoreSong, driveFileId: string): EncoreSong {
  const id = driveFileId.trim();
  if (!id) return s;
  const cur = [...(s.attachments ?? [])];
  let found = false;
  const next = cur.map((a) => {
    if (a.kind !== 'chart') return a;
    const isPrimary = a.driveFileId === id;
    if (isPrimary) found = true;
    return { ...a, isPrimaryChart: isPrimary };
  });
  if (!found) return s;
  return songWithSyncedLegacyDriveIds({
    ...s,
    attachments: next,
    updatedAt: new Date().toISOString(),
  });
}

export function addSongAttachment(s: EncoreSong, att: EncoreSongAttachment): EncoreSong {
  const cur = [...(s.attachments ?? [])];
  if (!cur.some((a) => a.driveFileId === att.driveFileId)) {
    let nextAtt: EncoreSongAttachment = { ...att };
    if (att.kind === 'chart') {
      const charts = cur.filter((a) => a.kind === 'chart');
      if (charts.length === 0) {
        nextAtt = { ...nextAtt, isPrimaryChart: true };
      }
    }
    cur.push(nextAtt);
  }
  return songWithSyncedLegacyDriveIds({ ...s, attachments: cur, updatedAt: new Date().toISOString() });
}
