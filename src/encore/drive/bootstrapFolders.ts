import {
  buildPublicDriveAltMediaUrl,
  isPublicDriveGuestFetchConfigured,
} from '../../shared/drive/buildPublicDriveAltMediaUrl';
import { GuestSnapshotLoadError } from './guestSnapshotLoadError';
import { sleepMs } from '../../shared/thirdParty/politeNetworkPause';
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
import { escapeDriveQueryLiteral } from '../../shared/drive/escapeDriveQueryLiteral';

function qFolderInParent(name: string, parentId: string): string {
  return `name='${escapeDriveQueryLiteral(name)}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
}

function qJsonInParent(name: string, parentId: string): string {
  return `name='${escapeDriveQueryLiteral(name)}' and mimeType='application/json' and '${parentId}' in parents and trashed=false`;
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

/** Google sometimes returns an HTML interstitial instead of JSON (bot / rate heuristics). */
function responseBodyLooksLikeGoogleAutomatedQueryWall(text: string): boolean {
  const t = text.slice(0, 12000).toLowerCase();
  return (
    t.includes('automated queries') ||
    t.includes("can't process your request right now") ||
    t.includes('your computer or network may be sending automated queries')
  );
}

/**
 * Fetch one URL once. Translates 4xx → typed error so the caller can decide whether
 * a retry is warranted (transient 5xx/network → yes; 403/404 → no, stop early).
 */
type PublicDriveFetchErr = Error & {
  code?: string;
  status?: number;
  /** Best-effort parse of Drive JSON error body (`error.message`). */
  googleDetail?: string;
};

function throwGuestPublicDriveFetchFailure(err: PublicDriveFetchErr): never {
  if (err.code === 'GOOGLE_AUTOMATED_QUERY_BLOCK') {
    throw new Error(
      'Google is temporarily blocking this request (it thinks the traffic may be automated). That can happen after a lot of Drive or sign-in testing from one network. Wait a while, try another network or browser, or pause rapid retries—it is usually not a permanent ban on your account or snapshot.',
    );
  }
  if (err.code === 'INVALID_JSON') {
    throw new Error('Snapshot contents are not valid JSON.');
  }
  if (err.status === 403) {
    const detail = err.googleDetail ? ` ${err.googleDetail}` : '';
    throw new Error(
      `Google Drive refused this request (access denied).${detail} If the snapshot is still shared with "Anyone with the link", the problem is usually this site's browser API key: add your page origin under HTTP referrer restrictions and allow the Google Drive API on that key (see Encore README). Otherwise the owner may need to republish from Encore.`,
    );
  }
  if (err.status === 404) {
    throw new Error('Snapshot not found. The owner may have deleted or replaced it.');
  }
  if (err.status === 503) {
    throw new GuestSnapshotLoadError('dev_missing_api_key');
  }
  if (typeof err.status === 'number') {
    throw new Error(`Could not load this snapshot (HTTP ${err.status}).`);
  }
  if (err.code === 'NETWORK_OR_CORS') {
    if (isLocalhostOrigin()) {
      throw new Error(
        'Could not reach this snapshot from a local dev origin. If you are not running `npm run dev`, start it (Encore uses a dev-only proxy for Drive reads). Otherwise add your dev URL to the API key’s HTTP referrer list (e.g. `http://127.0.0.1:5173/*`), or set `VITE_GOOGLE_DRIVE_DEV_PROXY_REFERER` in `.env.local` to a referrer that **is** listed (often your production Encore URL with `/encore/`). See Encore README → Browser API key.',
      );
    }
    throw new Error(
      'Could not load this snapshot: the browser was blocked from finishing the Google Drive download (often a CORS issue after a redirect, not a weak Wi-Fi signal). On static hosting, fixing that usually requires a same-origin or server-side fetch to Google Drive; see Encore README (Browser API key). You can still ask the owner to publish again from Encore.',
    );
  }
  throw new Error('Could not load this snapshot.');
}

async function attemptFetchPublicDriveJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
  } catch {
    // CORS rejection or genuine network failure — both surface as TypeError.
    const err = new Error('NETWORK_OR_CORS') as PublicDriveFetchErr;
    err.code = 'NETWORK_OR_CORS';
    throw err;
  }
  const text = await res.text();
  if (responseBodyLooksLikeGoogleAutomatedQueryWall(text)) {
    const err = new Error('GOOGLE_AUTOMATED_QUERY_BLOCK') as PublicDriveFetchErr;
    err.code = 'GOOGLE_AUTOMATED_QUERY_BLOCK';
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`HTTP_${res.status}`) as PublicDriveFetchErr;
    err.code = `HTTP_${res.status}`;
    err.status = res.status;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      const msg = j?.error?.message?.trim();
      if (msg) err.googleDetail = msg;
    } catch {
      /* non-JSON error body */
    }
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
 * Concurrent loads of the same snapshot fileId (e.g. React StrictMode double-mount) share one
 * Drive round-trip instead of duplicating anonymous API-key traffic.
 */
const fetchPublicDriveJsonInflight = new Map<string, Promise<unknown>>();

/**
 * Fetch public file bytes using a Drive API key (guest path; no user OAuth token).
 *
 * The file must be shared with `anyone:reader` and the API key must allow the caller.
 * In local dev, requests go through a same-origin Vite proxy (see `vite.config.ts`) that
 * forwards to Drive with a matching Referer so HTTP-referrer–restricted keys work. In
 * production (when `VITE_LABS_SESSION_BFF_URL` is set), requests go through the session BFF
 * Drive proxy instead of calling Google directly from the browser.
 */
export async function fetchPublicDriveJson(fileId: string, apiKey: string): Promise<unknown> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey && !isPublicDriveGuestFetchConfigured()) {
    throw new GuestSnapshotLoadError('dev_missing_api_key');
  }
  const inflightKey = fileId.trim();
  const existing = fetchPublicDriveJsonInflight.get(inflightKey);
  if (existing) return existing;

  const run = fetchPublicDriveJsonOnce(inflightKey, trimmedKey);
  const tracked = run.finally(() => {
    fetchPublicDriveJsonInflight.delete(inflightKey);
  });
  fetchPublicDriveJsonInflight.set(inflightKey, tracked);
  return tracked;
}

async function fetchPublicDriveJsonOnce(fileId: string, apiKey: string): Promise<unknown> {
  /** Encore snapshots normally live in My Drive; `false` avoids some API-key edge cases. Shared-drive snapshots retry with `true`. */
  const urlMyDrive = buildPublicDriveAltMediaUrl(fileId, apiKey, { supportsAllDrives: false });
  const urlAllDrives = buildPublicDriveAltMediaUrl(fileId, apiKey, { supportsAllDrives: true });

  /** Initial try + one delayed retry for transient errors only (no extra hits on 403/404/automated-query). */
  const attempts = [0, 1200];

  const tryUrlWithBackoff = async (url: string): Promise<{ ok: true; data: unknown } | { ok: false; err: PublicDriveFetchErr }> => {
    let last: PublicDriveFetchErr | null = null;
    for (let i = 0; i < attempts.length; i += 1) {
      if (attempts[i]! > 0) {
        await new Promise((resolve) => setTimeout(resolve, attempts[i]));
      }
      try {
        const data = await attemptFetchPublicDriveJson(url);
        return { ok: true, data };
      } catch (e) {
        const err = e as PublicDriveFetchErr;
        last = err;
        if (
          err.code === 'GOOGLE_AUTOMATED_QUERY_BLOCK' ||
          err.code === 'INVALID_JSON' ||
          err.status === 403 ||
          err.status === 404
        ) {
          return { ok: false, err };
        }
      }
    }
    const fallback = last ?? (new Error('UNKNOWN') as PublicDriveFetchErr);
    fallback.code = fallback.code ?? 'UNKNOWN';
    return { ok: false, err: fallback };
  };

  const primary = await tryUrlWithBackoff(urlMyDrive);
  if (primary.ok) return primary.data;

  if (primary.err.status === 403) {
    await sleepMs(400);
    const secondary = await tryUrlWithBackoff(urlAllDrives);
    if (secondary.ok) return secondary.data;
    throwGuestPublicDriveFetchFailure(secondary.err);
  }

  throwGuestPublicDriveFetchFailure(primary.err);
}
