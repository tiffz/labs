import { driveCreateFolder, driveCreateJsonFile, driveListFiles } from './driveFetch';
import {
  ENCORE_PERFORMANCES_FOLDER,
  ENCORE_ROOT_FOLDER,
  ENCORE_SHEET_MUSIC_FOLDER,
  REPERTOIRE_FILE_NAME,
  PUBLIC_SNAPSHOT_FILE_NAME,
} from './constants';
import { getSyncMeta, patchSyncMeta } from '../db/encoreDb';

function qFolderInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
}

function qJsonInParent(name: string, parentId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/json' and '${parentId}' in parents and trashed=false`;
}

export interface EncoreDriveBootstrap {
  rootFolderId: string;
  performancesFolderId: string;
  sheetMusicFolderId: string;
  repertoireFileId: string;
  snapshotFileId?: string;
}

export async function ensureEncoreDriveLayout(accessToken: string): Promise<EncoreDriveBootstrap> {
  const meta = await getSyncMeta();
  if (
    meta.rootFolderId &&
    meta.performancesFolderId &&
    meta.sheetMusicFolderId &&
    meta.repertoireFileId
  ) {
    return {
      rootFolderId: meta.rootFolderId,
      performancesFolderId: meta.performancesFolderId,
      sheetMusicFolderId: meta.sheetMusicFolderId,
      repertoireFileId: meta.repertoireFileId,
      snapshotFileId: meta.snapshotFileId,
    };
  }

  const rootList = await driveListFiles(accessToken, qFolderInParent(ENCORE_ROOT_FOLDER, 'root'));
  const rootFiles = rootList.files ?? [];
  let rootFolderId = (rootFiles[0] as { id?: string } | undefined)?.id;
  if (!rootFolderId) {
    const created = await driveCreateFolder(accessToken, ENCORE_ROOT_FOLDER, 'root');
    rootFolderId = created.id;
  }

  const perfList = await driveListFiles(accessToken, qFolderInParent(ENCORE_PERFORMANCES_FOLDER, rootFolderId));
  let performancesFolderId = (perfList.files?.[0] as { id?: string } | undefined)?.id;
  if (!performancesFolderId) {
    performancesFolderId = (await driveCreateFolder(accessToken, ENCORE_PERFORMANCES_FOLDER, rootFolderId)).id;
  }

  const sheetList = await driveListFiles(accessToken, qFolderInParent(ENCORE_SHEET_MUSIC_FOLDER, rootFolderId));
  let sheetMusicFolderId = (sheetList.files?.[0] as { id?: string } | undefined)?.id;
  if (!sheetMusicFolderId) {
    sheetMusicFolderId = (await driveCreateFolder(accessToken, ENCORE_SHEET_MUSIC_FOLDER, rootFolderId)).id;
  }

  const repList = await driveListFiles(accessToken, qJsonInParent(REPERTOIRE_FILE_NAME, rootFolderId));
  let repertoireFileId = (repList.files?.[0] as { id?: string } | undefined)?.id;
  if (!repertoireFileId) {
    const emptyPayload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: [],
      performances: [],
    });
    const created = await driveCreateJsonFile(accessToken, emptyPayload, REPERTOIRE_FILE_NAME, [rootFolderId]);
    repertoireFileId = created.id;
  }

  const snapList = await driveListFiles(accessToken, qJsonInParent(PUBLIC_SNAPSHOT_FILE_NAME, rootFolderId));
  const snapshotFileId = (snapList.files?.[0] as { id?: string } | undefined)?.id;

  await patchSyncMeta({
    rootFolderId,
    performancesFolderId,
    sheetMusicFolderId,
    repertoireFileId,
    snapshotFileId,
  });

  return {
    rootFolderId,
    performancesFolderId,
    sheetMusicFolderId,
    repertoireFileId,
    snapshotFileId,
  };
}

/** Fetch public file bytes using API key (guest, no user token). */
export async function fetchPublicDriveJson(fileId: string, apiKey: string): Promise<unknown> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Public fetch failed: ${res.status}`);
  }
  return JSON.parse(text) as unknown;
}
