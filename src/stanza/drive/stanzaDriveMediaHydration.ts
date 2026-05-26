import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDb } from '../db/stanzaDb';
import { computeStanzaLocalMediaFingerprint } from '../utils/stanzaLocalMediaFingerprint';
import { loadDriveFileAsStanzaLocalBlob } from './loadDriveSourceForStanza';

/**
 * True when the row is Drive-linked but this device has not yet downloaded the media bytes.
 * After a Drive metadata pull, rows often have `driveSourceFileId` and markers only.
 */
export function stanzaDriveSongNeedsMediaDownload(
  song: Pick<StanzaSong, 'ytId' | 'driveSourceFileId' | 'localAudioBlob'>,
): boolean {
  if (song.ytId) return false;
  const fileId = song.driveSourceFileId?.trim();
  if (!fileId) return false;
  return !song.localAudioBlob;
}

/**
 * Download Drive media into `localAudioBlob` for an existing library row.
 * No-op when {@link stanzaDriveSongNeedsMediaDownload} is false.
 */
export async function hydrateStanzaDriveSongMedia(opts: {
  row: StanzaSong;
  suggestedTitle?: string | null;
  interactiveOAuth?: boolean;
}): Promise<StanzaSong> {
  const { row, suggestedTitle, interactiveOAuth = true } = opts;
  if (!stanzaDriveSongNeedsMediaDownload(row)) return row;
  const fileId = row.driveSourceFileId!.trim();
  const { blob, title, driveSourceFileId } = await loadDriveFileAsStanzaLocalBlob({
    fileId,
    suggestedTitle: suggestedTitle ?? row.title,
    interactiveOAuth,
  });
  const next: StanzaSong = {
    ...row,
    ytId: null,
    title: suggestedTitle?.trim() || title || row.title,
    localAudioBlob: blob,
    driveSourceFileId,
    localMediaFingerprint:
      row.localMediaFingerprint ??
      computeStanzaLocalMediaFingerprint({ sizeBytes: blob.size, fileName: row.title }),
  };
  await stanzaDb.songs.put(next);
  return next;
}
