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

export async function buildOriginalTakeFromFile(
  file: File,
  songId: string,
  googleAccessToken: string | null,
  songTitle: string,
  uploadWithDuplicateCheck: ReturnType<typeof useEncoreDriveUploadDedup>['uploadWithDuplicateCheck'],
  registerUploadedDriveFile: ReturnType<typeof useEncoreDriveUploadDedup>['registerUploadedDriveFile'],
): Promise<OriginalAudioTake> {
  const take: OriginalAudioTake = {
    id: crypto.randomUUID(),
    label: file.name,
    timestamp: Date.now(),
    source: 'imported',
    mimeType: inferMediaMimeType(file),
  };
  await saveOriginalTakeBlob(songId, take.id, file);
  take.hasLocalAudio = true;

  if (googleAccessToken) {
    try {
      const driveFileId = await uploadOriginalTakeToDrive(
        file,
        take,
        songTitle,
        googleAccessToken,
        uploadWithDuplicateCheck,
        registerUploadedDriveFile,
      );
      if (driveFileId) {
        take.driveFileId = driveFileId;
      }
    } catch {
      /* local cache still playable */
    }
  }
  return take;
}
