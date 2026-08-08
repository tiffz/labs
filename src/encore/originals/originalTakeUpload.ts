import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import { driveUploadFileResumable } from '../drive/driveFetch';
import type { useEncoreDriveUploadDedup } from '../context/EncoreDriveUploadDedupContext';
import { ensureOriginalsDriveLayout } from './drive/originalsSharded';
import { saveOriginalTakeBlob } from './originalTakeLocalAudio';
import type { OriginalAudioTake } from './types';

export async function uploadOriginalTakeToDrive(
  file: File,
  take: OriginalAudioTake,
  songTitle: string,
  googleAccessToken: string,
  uploadWithDuplicateCheck: ReturnType<typeof useEncoreDriveUploadDedup>['uploadWithDuplicateCheck'],
  registerUploadedDriveFile: ReturnType<typeof useEncoreDriveUploadDedup>['registerUploadedDriveFile'],
): Promise<string | null> {
  const indexLabel = `${songTitle.trim() || 'Original'} · Take`;
  return uploadWithDuplicateCheck({
    file,
    uploadNew: async () => {
      const layout = await ensureOriginalsDriveLayout(googleAccessToken);
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'webm';
      const name = `${take.id}.${ext ?? 'dat'}`;
      const created = await driveUploadFileResumable(
        googleAccessToken,
        file,
        [layout.audioFolderId],
        name,
      );
      await registerUploadedDriveFile(created.id, indexLabel);
      return created.id;
    },
    reuseExisting: async (id) => {
      await registerUploadedDriveFile(id, indexLabel);
      return id;
    },
  });
}

/**
 * Build a take from a local file and persist its audio blob to Dexie — the fast,
 * local-first half of an import. Does NOT touch Drive.
 *
 * Split out from the Drive upload deliberately: the caller adds the returned take to
 * the song and persists it *before* the slow resumable Drive upload, so a refresh mid-
 * upload can never lose a take (its metadata + blob are already durable locally). The
 * `driveFileId` is patched in later by {@link uploadOriginalTakeToDrive}.
 */
export async function buildLocalOriginalTake(
  file: File,
  songId: string,
): Promise<OriginalAudioTake> {
  const take: OriginalAudioTake = {
    id: crypto.randomUUID(),
    label: file.name,
    timestamp: Date.now(),
    source: 'imported',
    mimeType: inferMediaMimeType(file),
    hasLocalAudio: true,
  };
  await saveOriginalTakeBlob(songId, take.id, file);
  return take;
}
