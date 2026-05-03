import { driveCreateFolder, driveCreateJsonFile, driveListFiles, pickPreferredDriveListFileId } from './driveFetch';
import {
  ENCORE_PERFORMANCES_FOLDER,
  ENCORE_RECORDINGS_FOLDER,
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
  recordingsFolderId: string;
  repertoireFileId: string;
  snapshotFileId?: string;
}

/** Coalesce concurrent bootstraps (first Google sign-in + sync + screens all call layout). */
const encoreDriveLayoutInflight = new Map<string, Promise<EncoreDriveBootstrap>>();

function layoutFromMeta(meta: Awaited<ReturnType<typeof getSyncMeta>>): EncoreDriveBootstrap | null {
  if (
    meta.rootFolderId &&
    meta.performancesFolderId &&
    meta.sheetMusicFolderId &&
    meta.recordingsFolderId &&
    meta.repertoireFileId
  ) {
    return {
      rootFolderId: meta.rootFolderId,
      performancesFolderId: meta.performancesFolderId,
      sheetMusicFolderId: meta.sheetMusicFolderId,
      recordingsFolderId: meta.recordingsFolderId,
      repertoireFileId: meta.repertoireFileId,
      snapshotFileId: meta.snapshotFileId,
    };
  }
  return null;
}

type DriveListResult = Awaited<ReturnType<typeof driveListFiles>>;

async function createEncoreDriveLayout(accessToken: string): Promise<EncoreDriveBootstrap> {
  const priorMeta = await getSyncMeta();
  const rootList = await driveListFiles(accessToken, qFolderInParent(ENCORE_ROOT_FOLDER, 'root'));
  const rootFiles = rootList.files ?? [];
  let rootFolderId = (rootFiles[0] as { id?: string } | undefined)?.id;
  if (!rootFolderId) {
    const created = await driveCreateFolder(accessToken, ENCORE_ROOT_FOLDER, 'root');
    rootFolderId = created.id;
  }

  const [perfList, sheetList, recList] = await Promise.all([
    driveListFiles(accessToken, qFolderInParent(ENCORE_PERFORMANCES_FOLDER, rootFolderId)),
    driveListFiles(accessToken, qFolderInParent(ENCORE_SHEET_MUSIC_FOLDER, rootFolderId)),
    driveListFiles(accessToken, qFolderInParent(ENCORE_RECORDINGS_FOLDER, rootFolderId)),
  ]);

  const ensureSubfolder = async (list: DriveListResult, folderName: string): Promise<string> => {
    const existingId = (list.files?.[0] as { id?: string } | undefined)?.id;
    if (existingId) return existingId;
    const created = await driveCreateFolder(accessToken, folderName, rootFolderId);
    return created.id;
  };

  const [performancesFolderId, sheetMusicFolderId, recordingsFolderId] = await Promise.all([
    ensureSubfolder(perfList, ENCORE_PERFORMANCES_FOLDER),
    ensureSubfolder(sheetList, ENCORE_SHEET_MUSIC_FOLDER),
    ensureSubfolder(recList, ENCORE_RECORDINGS_FOLDER),
  ]);

  const [repList, snapList] = await Promise.all([
    driveListFiles(accessToken, qJsonInParent(REPERTOIRE_FILE_NAME, rootFolderId)),
    driveListFiles(accessToken, qJsonInParent(PUBLIC_SNAPSHOT_FILE_NAME, rootFolderId)),
  ]);
  let repertoireFileId = (repList.files?.[0] as { id?: string } | undefined)?.id;
  if (!repertoireFileId) {
    const emptyPayload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: [],
      performances: [],
      venueCatalog: [],
      milestoneTemplate: [],
    });
    const created = await driveCreateJsonFile(accessToken, emptyPayload, REPERTOIRE_FILE_NAME, [rootFolderId]);
    repertoireFileId = created.id;
  }

  const snapshotFileId = pickPreferredDriveListFileId(snapList.files, priorMeta.snapshotFileId);

  await patchSyncMeta({
    rootFolderId,
    performancesFolderId,
    sheetMusicFolderId,
    recordingsFolderId,
    repertoireFileId,
    snapshotFileId,
  });

  return {
    rootFolderId,
    performancesFolderId,
    sheetMusicFolderId,
    recordingsFolderId,
    repertoireFileId,
    snapshotFileId,
  };
}

export async function ensureEncoreDriveLayout(accessToken: string): Promise<EncoreDriveBootstrap> {
  const meta = await getSyncMeta();
  const fromMeta = layoutFromMeta(meta);
  if (fromMeta) return fromMeta;

  const existing = encoreDriveLayoutInflight.get(accessToken);
  if (existing) return existing;

  const started = (async (): Promise<EncoreDriveBootstrap> => {
    const metaAgain = await getSyncMeta();
    const again = layoutFromMeta(metaAgain);
    if (again) return again;
    return createEncoreDriveLayout(accessToken);
  })();

  const tracked = started.finally(() => {
    encoreDriveLayoutInflight.delete(accessToken);
  });
  encoreDriveLayoutInflight.set(accessToken, tracked);
  return tracked;
}

function isLocalhostOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
}

/** In Vite dev, use same-origin proxy (see root vite.config) so API-key referrer + CORS checks do not break guest reads. */
function buildPublicDriveJsonUrl(fileId: string, apiKey: string): string {
  const useDevProxy =
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string';
  if (useDevProxy) {
    return `${window.location.origin}/__encore/drive-public/${encodeURIComponent(fileId)}`;
  }
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`;
}

/**
 * Fetch one URL once. Translates 4xx → typed error so the caller can decide whether
 * a retry is warranted (transient 5xx/network → yes; 403/404 → no, stop early).
 */
async function attemptFetchPublicDriveJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
  } catch {
    // CORS rejection or genuine network failure — both surface as TypeError.
    const err = new Error('NETWORK_OR_CORS') as Error & { code?: string };
    err.code = 'NETWORK_OR_CORS';
    throw err;
  }
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`HTTP_${res.status}`) as Error & { code?: string; status?: number };
    err.code = `HTTP_${res.status}`;
    err.status = res.status;
    throw err;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const err = new Error('INVALID_JSON') as Error & { code?: string };
    err.code = 'INVALID_JSON';
    throw err;
  }
}

/**
 * Fetch public file bytes using a Drive API key (guest path; no user OAuth token).
 *
 * The file must be shared with `anyone:reader` and the API key must allow the caller.
 * In local dev, requests go through a same-origin Vite proxy (see `vite.config.ts`) that
 * forwards to Drive with a matching Referer so HTTP-referrer–restricted keys work; in
 * production, the browser calls Google directly with `key=` in the query string.
 */
export async function fetchPublicDriveJson(fileId: string, apiKey: string): Promise<unknown> {
  const url = buildPublicDriveJsonUrl(fileId, apiKey);

  const attempts = [0, 600, 1800];
  let lastError: (Error & { code?: string; status?: number }) | null = null;
  for (let i = 0; i < attempts.length; i += 1) {
    if (attempts[i] > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempts[i]));
    }
    try {
      return await attemptFetchPublicDriveJson(url);
    } catch (e) {
      const err = e as Error & { code?: string; status?: number };
      lastError = err;
      // Don't retry definitive failures (file gone, file private, malformed JSON).
      if (err.code === 'INVALID_JSON' || err.status === 403 || err.status === 404) break;
    }
  }

  if (lastError) {
    if (lastError.code === 'INVALID_JSON') {
      throw new Error('Snapshot contents are not valid JSON.');
    }
    if (lastError.status === 403) {
      throw new Error('This snapshot is no longer public. The owner needs to update it from Encore.');
    }
    if (lastError.status === 404) {
      throw new Error('Snapshot not found. The owner may have deleted or replaced it.');
    }
    if (typeof lastError.status === 'number') {
      throw new Error(`Could not load this snapshot (HTTP ${lastError.status}).`);
    }
    if (lastError.code === 'NETWORK_OR_CORS') {
      if (isLocalhostOrigin()) {
        throw new Error(
          'Could not reach this snapshot from a local dev origin. If you are not running `npm run dev`, start it (Encore uses a dev-only proxy for Drive reads). Otherwise add your dev URL to the API key’s HTTP referrer list (e.g. `http://127.0.0.1:5173/*`), or set `VITE_GOOGLE_DRIVE_DEV_PROXY_REFERER` in `.env.local` to a referrer that **is** listed (often your production Encore URL with `/encore/`). See Encore README → Browser API key.',
        );
      }
      throw new Error(
        'Could not reach this snapshot. Check your network connection, or ask the owner to publish it again from Encore.',
      );
    }
  }
  throw new Error('Could not load this snapshot.');
}
