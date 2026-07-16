import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDb } from '../db/stanzaDb';
import { computeStanzaLocalMediaFingerprint } from '../utils/stanzaLocalMediaFingerprint';
import { probeFileAudioDurationSeconds } from '../utils/probeFileAudioDuration';
import { loadDriveFileAsStanzaLocalBlob } from './loadDriveSourceForStanza';

/**
 * True when the row is Drive-linked but this device has not yet downloaded the media bytes.
 * After a Drive metadata pull, rows often have `driveSourceFileId` and markers only.
 *
 * Dual-source songs (`ytId` + uploaded file) still need hydration — do not skip
 * merely because a YouTube id is present.
 */
export function stanzaDriveSongNeedsMediaDownload(
  song: Pick<StanzaSong, 'driveSourceFileId' | 'localAudioBlob'>,
): boolean {
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
  const mediaTitle = suggestedTitle?.trim() || title || row.title;
  const probeFile = new File([blob], mediaTitle, { type: blob.type || 'audio/mpeg' });
  const durationSec = await probeFileAudioDurationSeconds(probeFile);
  const next: StanzaSong = {
    ...row,
    // Keep ytId when present (YouTube + uploaded dual-source).
    title: mediaTitle,
    localAudioBlob: blob,
    driveSourceFileId,
    localMediaFingerprint:
      row.localMediaFingerprint ??
      computeStanzaLocalMediaFingerprint({
        sizeBytes: blob.size,
        durationSec: durationSec ?? undefined,
        fileName: mediaTitle,
      }),
  };
  await stanzaDb.songs.put(next);
  return next;
}
