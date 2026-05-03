import type { EncoreDriveBootstrap } from './bootstrapFolders';
import type { SyncMetaRow } from '../db/encoreDb';
import type { EncoreDriveUploadFolderKind, EncoreDriveUploadFolderOverrides } from '../types';

export type DriveUploadFolderResolveMeta = Pick<
  SyncMetaRow,
  'performancesFolderId' | 'sheetMusicFolderId' | 'recordingsFolderId'
>;

export type DriveUploadFolderLayout = DriveUploadFolderResolveMeta | Pick<EncoreDriveBootstrap, 'performancesFolderId' | 'sheetMusicFolderId' | 'recordingsFolderId'>;

/**
 * Effective parent folder id for a new upload. Uses Encore bootstrap folders from `syncMeta` when
 * no override is set in repertoire extras.
 */
export function resolveDriveUploadFolderId(
  kind: EncoreDriveUploadFolderKind,
  syncMeta: DriveUploadFolderLayout,
  overrides?: EncoreDriveUploadFolderOverrides | null,
): string | undefined {
  const o = overrides ?? {};
  const trimmed = (key: keyof EncoreDriveUploadFolderOverrides) => o[key]?.trim() || undefined;

  switch (kind) {
    case 'performances':
      return trimmed('performances') ?? (syncMeta.performancesFolderId?.trim() || undefined);
    case 'charts':
      return trimmed('charts') ?? (syncMeta.sheetMusicFolderId?.trim() || undefined);
    case 'referenceTracks':
    case 'backingTracks':
    case 'takes':
      return trimmed(kind) ?? (syncMeta.recordingsFolderId?.trim() || undefined);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
