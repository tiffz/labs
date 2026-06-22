import { driveUploadFileResumable } from '../drive/driveFetch';
import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import { createResourceFromLocalFile } from '../repertoire/encoreResourceLinks';
import { ensureOriginalsDriveLayout } from './drive/originalsSharded';
import {
  appendSongReference,
  appendSongReferenceFromDriveFile,
} from './originalsResourceLinks';
import type { EncoreOriginalSong } from './types';

export type OriginalsReferenceUploadDeps = {
  googleAccessToken: string | null;
  uploadWithDuplicateCheck: (args: {
    file: File;
    uploadNew: () => Promise<string>;
    reuseExisting: (id: string) => Promise<string>;
  }) => Promise<string | null>;
  registerUploadedDriveFile: (driveFileId: string, indexLabel: string) => Promise<void>;
};

/** Upload a reference file (chart/PDF/etc.) onto an original — shared by song page and dashboard. */
export async function uploadOriginalSongReference(
  song: EncoreOriginalSong,
  file: File,
  deps: OriginalsReferenceUploadDeps,
): Promise<EncoreOriginalSong> {
  const { googleAccessToken, uploadWithDuplicateCheck, registerUploadedDriveFile } = deps;
  if (!googleAccessToken) {
    return appendSongReference(song, createResourceFromLocalFile(file));
  }

  const indexLabel = `${song.title.trim() || 'Original'} · Reference`;
  const driveFileId = await uploadWithDuplicateCheck({
    file,
    uploadNew: async () => {
      const layout = await ensureOriginalsDriveLayout(googleAccessToken);
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'dat';
      const name = `ref-${crypto.randomUUID()}.${ext ?? 'dat'}`;
      const created = await driveUploadFileResumable(
        googleAccessToken,
        file,
        [layout.referencesFolderId],
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

  if (!driveFileId) return song;
  return appendSongReferenceFromDriveFile(song, driveFileId, {
    label: file.name,
    mimeType: inferMediaMimeType(file),
  });
}
