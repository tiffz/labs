import { driveUploadFileResumable } from '../drive/driveFetch';
import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import { createResourceFromDriveFile } from '../repertoire/encoreResourceLinks';
import { ensureOriginalsDriveLayout } from './drive/originalsSharded';
import type { EncoreMiscResource } from '../types';
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

/** Where on the original the uploaded file is listed. */
export type OriginalsUploadTarget = 'songReferences' | 'brainstormResources';

/**
 * Upload a reference or brainstorm file for an original, into the Originals references folder, and
 * return the resource to list. The caller appends it to the song as it is AFTER the upload: a big
 * file takes a while, and appending to the snapshot taken before would drop edits made meanwhile.
 *
 * Needs Drive. It used to fall back to `URL.createObjectURL` when signed out, which looked saved and
 * was gone on reload (and synced to other devices as a dead link); brainstorm files took that path
 * every time. Callers stage files first and refuse them while signed out (ADR 0030).
 */
export async function uploadOriginalSongFile(
  song: Pick<EncoreOriginalSong, 'title'>,
  file: File,
  deps: OriginalsReferenceUploadDeps,
  target: OriginalsUploadTarget,
): Promise<EncoreMiscResource | null> {
  const { googleAccessToken, uploadWithDuplicateCheck, registerUploadedDriveFile } = deps;
  if (!googleAccessToken) {
    throw new Error('Sign in with Google to save files here.');
  }

  const indexLabel = `${song.title.trim() || 'Original'} · ${target === 'songReferences' ? 'Reference' : 'Brainstorm'}`;
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

  if (!driveFileId) return null;
  return createResourceFromDriveFile(driveFileId, {
    label: file.name,
    mimeType: inferMediaMimeType(file),
  });
}
