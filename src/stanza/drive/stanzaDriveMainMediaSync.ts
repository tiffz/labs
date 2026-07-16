import {
  driveCreateFolder,
  driveGetFileMetadata,
  driveGetMediaArrayBuffer,
  driveListFiles,
  driveTrashFile,
  driveUploadFileResumable,
} from '../../shared/drive/driveFetch';
import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import { computeStanzaLocalMediaFingerprint } from '../utils/stanzaLocalMediaFingerprint';
import { probeFileAudioDurationSeconds } from '../utils/probeFileAudioDuration';
import { stanzaDriveSongNeedsMediaDownload } from './stanzaDriveMediaHydration';

/** Child folder under `Tiff Zhang Labs/Stanza` for main recording bytes (local uploads). */
export const STANZA_DRIVE_MAIN_AUDIO_FOLDER = 'main_audio';

export function stanzaMainMediaBytesFingerprint(blob: Blob): string {
  const type = blob.type?.trim() || 'application/octet-stream';
  return `${blob.size}:${type}`;
}

/**
 * Upload whenever this device has main-recording bytes that Drive does not yet
 * mirror. Dual-source songs keep `ytId` and still upload `localAudioBlob` so the
 * linked file reaches other devices (prod IndexedDB is origin-isolated).
 */
export function mainMediaNeedsDriveUpload(row: StanzaSong): boolean {
  const blob = row.localAudioBlob;
  if (!blob?.size) return false;
  const fp = stanzaMainMediaBytesFingerprint(blob);
  const fileId = row.driveSourceFileId?.trim();
  if (!fileId) return true;
  return row.driveMainMediaBytesFingerprint !== fp;
}

function mainDriveFileName(row: StanzaSong): string {
  const safeTitle = row.title.replace(/[^\w.-]+/g, '_').slice(0, 48) || 'recording';
  const blob = row.localAudioBlob!;
  const ext =
    blob.type.includes('wav')
      ? 'wav'
      : blob.type.includes('ogg')
        ? 'ogg'
        : blob.type.includes('webm')
          ? 'webm'
          : blob.type.includes('quicktime') || blob.type.includes('mov')
            ? 'mov'
            : blob.type.includes('mp4')
              ? 'mp4'
              : blob.type.includes('mpeg') || blob.type.includes('mp3')
                ? 'mp3'
                : 'audio';
  return `main_${row.id.slice(0, 8)}_${safeTitle}.${ext}`;
}

function blobToUploadFile(blob: Blob, name: string): File {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  const type = inferMediaMimeType(file);
  return new File([blob], name, { type });
}

async function ensureStanzaMainAudioFolder(accessToken: string, appFolderId: string): Promise<string> {
  const q = `name='${STANZA_DRIVE_MAIN_AUDIO_FOLDER.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${appFolderId}' in parents and trashed=false`;
  const list = await driveListFiles(accessToken, q);
  const existing = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existing) return existing;
  const created = await driveCreateFolder(accessToken, STANZA_DRIVE_MAIN_AUDIO_FOLDER, appFolderId);
  return created.id;
}

async function uploadOneMainRecording(
  accessToken: string,
  mainFolderId: string,
  row: StanzaSong,
): Promise<Pick<StanzaSong, 'driveSourceFileId' | 'driveMainMediaBytesFingerprint'>> {
  const blob = row.localAudioBlob!;
  const fp = stanzaMainMediaBytesFingerprint(blob);
  const fileName = mainDriveFileName(row);
  const file = blobToUploadFile(blob, fileName);
  const { id } = await driveUploadFileResumable(accessToken, file, [mainFolderId], fileName);
  const prevId = row.driveSourceFileId?.trim();
  if (prevId && prevId !== id) {
    try {
      await driveTrashFile(accessToken, prevId);
    } catch {
      /* best-effort */
    }
  }
  return { driveSourceFileId: id, driveMainMediaBytesFingerprint: fp };
}

/**
 * Upload main recording blobs for local library rows and persist `driveSourceFileId`.
 * Does not bump `updatedAt` (avoids re-triggering auto-push loops mid-backup).
 */
export async function syncStanzaLibraryMainMediaToDrive(
  accessToken: string,
  appFolderId: string,
): Promise<number> {
  const mainFolderId = await ensureStanzaMainAudioFolder(accessToken, appFolderId);
  const rows = await stanzaDb.songs.toArray();
  let uploaded = 0;
  for (const row of rows) {
    if (!mainMediaNeedsDriveUpload(row)) continue;
    const patch = await uploadOneMainRecording(accessToken, mainFolderId, row);
    const fresh = await stanzaDb.songs.get(row.id);
    if (!fresh) continue;
    await stanzaDb.songs.put({
      ...fresh,
      ...patch,
      updatedAt: fresh.updatedAt,
    });
    uploaded += 1;
  }
  return uploaded;
}

/** Download main recording bytes when this device only has Drive metadata. */
export async function hydrateStanzaSongMainMedia(opts: {
  accessToken: string;
  row: StanzaSong;
}): Promise<StanzaSong> {
  const { accessToken, row } = opts;
  if (!stanzaDriveSongNeedsMediaDownload(row)) return row;
  const fileId = row.driveSourceFileId!.trim();
  const meta = await driveGetFileMetadata(accessToken, fileId);
  const buf = await driveGetMediaArrayBuffer(accessToken, fileId);
  const mime =
    meta.mimeType && meta.mimeType !== 'application/octet-stream'
      ? meta.mimeType
      : 'audio/mpeg';
  const blob = new Blob([buf], { type: mime });
  const mediaTitle = row.title;
  const probeFile = new File([blob], mediaTitle, { type: blob.type || 'audio/mpeg' });
  const durationSec = await probeFileAudioDurationSeconds(probeFile);
  const next: StanzaSong = {
    ...row,
    // Keep ytId when present (YouTube + uploaded dual-source).
    localAudioBlob: blob,
    driveMainMediaBytesFingerprint: stanzaMainMediaBytesFingerprint(blob),
    localMediaFingerprint:
      row.localMediaFingerprint ??
      computeStanzaLocalMediaFingerprint({
        sizeBytes: blob.size,
        durationSec: durationSec ?? undefined,
        fileName: mediaTitle,
      }),
  };
  await stanzaDb.songs.put({ ...next, updatedAt: row.updatedAt });
  return next;
}

/** After a Drive metadata pull, fetch any missing main recordings. */
export async function hydrateStanzaLibraryMainMediaFromDrive(accessToken: string): Promise<number> {
  const rows = await stanzaDb.songs.toArray();
  let count = 0;
  for (const row of rows) {
    if (!stanzaDriveSongNeedsMediaDownload(row)) continue;
    await hydrateStanzaSongMainMedia({ accessToken, row });
    count += 1;
  }
  return count;
}
