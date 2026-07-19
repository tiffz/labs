import {
  driveCreateAnyoneReaderPermission,
  driveCreateFolder,
  driveCreateJsonFile,
  driveListFiles,
  drivePatchJsonMedia,
  DriveHttpError,
} from '../../shared/drive/driveFetch';
import {
  ensureLabsDrivePortfolioProgressLayout,
  LABS_DRIVE_APP_FOLDER_LYREFLY,
} from '../../shared/drive/labsDrivePortfolioLayout';
import { fetchPublicDriveMediaWithApiKey } from '../../shared/drive/fetchPublicDriveMediaBytes';
import { isPublicDriveGuestFetchConfigured } from '../../shared/drive/buildPublicDriveAltMediaUrl';
import { loadLyreflyExportPages } from '../exports/lyreflyComicExport';
import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import { ensureLyreflyGoogleDriveAccess } from './lyreflyGoogleDriveAccess';
import { escapeDriveQueryLiteral } from '../../shared/drive/escapeDriveQueryLiteral';

export const LYREFLY_VERSION_SHARE_FOLDER = 'version-shares';
export const LYREFLY_VERSION_SHARE_SCHEMA_VERSION = 1 as const;

export type LyreflyVersionSharePage = {
  id: string;
  label: string;
  isSpread: boolean;
  imageDataUrl: string;
};

export type LyreflyVersionShareSnapshot = {
  version: typeof LYREFLY_VERSION_SHARE_SCHEMA_VERSION;
  projectTitle: string;
  versionLabel: string;
  generatedAt: string;
  pages: LyreflyVersionSharePage[];
};

export type PublishLyreflyVersionShareResult = {
  fileId: string;
  generatedAt: string;
  publiclyReadable: boolean;
  warning?: string;
};

function shareFileName(versionId: string): string {
  return `share-${versionId}.json`;
}

function qJsonInParent(name: string, parentId: string): string {
  return `name='${escapeDriveQueryLiteral(name)}' and mimeType='application/json' and '${parentId}' in parents and trashed=false`;
}

function qFolderInParent(name: string, parentId: string): string {
  return `name='${escapeDriveQueryLiteral(name)}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
}

async function ensureVersionSharesFolder(accessToken: string, appFolderId: string): Promise<string> {
  const list = await driveListFiles(accessToken, qFolderInParent(LYREFLY_VERSION_SHARE_FOLDER, appFolderId));
  const existing = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existing) return existing;
  const created = await driveCreateFolder(accessToken, LYREFLY_VERSION_SHARE_FOLDER, appFolderId);
  return created.id;
}

export function isLyreflyVersionShareSnapshot(data: unknown): data is LyreflyVersionShareSnapshot {
  if (!data || typeof data !== 'object') return false;
  const snapshot = data as Partial<LyreflyVersionShareSnapshot>;
  return snapshot.version === LYREFLY_VERSION_SHARE_SCHEMA_VERSION && Array.isArray(snapshot.pages);
}

export async function buildLyreflyVersionShareSnapshot(
  project: ComicProject,
  version: ComicArtVersion,
  pageNodes: readonly PageNode[],
  revisions: readonly PageRevision[],
): Promise<LyreflyVersionShareSnapshot> {
  const pages = await loadLyreflyExportPages(project, [...pageNodes], [...revisions], {
    revisionByPageId: version.pageRevisions,
    strictRevisionMap: true,
  });
  return {
    version: LYREFLY_VERSION_SHARE_SCHEMA_VERSION,
    projectTitle: project.title,
    versionLabel: version.label,
    generatedAt: new Date().toISOString(),
    pages: pages.map((page) => ({
      id: page.node.id,
      label: page.node.displayName ?? 'Page',
      isSpread: page.node.isSpread ?? false,
      imageDataUrl: page.dataUrl,
    })),
  };
}

export async function publishLyreflyVersionShare(
  project: ComicProject,
  version: ComicArtVersion,
  pageNodes: readonly PageNode[],
  revisions: readonly PageRevision[],
): Promise<PublishLyreflyVersionShareResult> {
  const accessToken = await ensureLyreflyGoogleDriveAccess({ interactive: true });
  const refs = await ensureLabsDrivePortfolioProgressLayout(accessToken, LABS_DRIVE_APP_FOLDER_LYREFLY);
  const sharesFolderId = await ensureVersionSharesFolder(accessToken, refs.appFolderId);
  const snapshot = await buildLyreflyVersionShareSnapshot(project, version, pageNodes, revisions);
  const body = JSON.stringify(snapshot);
  const fileName = shareFileName(version.id);

  const existing = await driveListFiles(accessToken, qJsonInParent(fileName, sharesFolderId));
  let fileId = (existing.files?.[0] as { id?: string } | undefined)?.id;
  if (fileId) {
    await drivePatchJsonMedia(accessToken, fileId, body, undefined);
  } else {
    const created = await driveCreateJsonFile(accessToken, body, fileName, [sharesFolderId]);
    fileId = created.id;
  }

  let permissionWarning: string | undefined;
  try {
    await driveCreateAnyoneReaderPermission(accessToken, fileId);
  } catch (error) {
    permissionWarning = error instanceof Error ? error.message : String(error);
  }

  if (!isPublicDriveGuestFetchConfigured()) {
    return {
      fileId,
      generatedAt: snapshot.generatedAt,
      publiclyReadable: false,
      warning:
        permissionWarning ??
        'Snapshot saved, but VITE_GOOGLE_API_KEY is not set on this site so guests cannot read it.',
    };
  }

  try {
    await fetchPublicVersionShareSnapshot(fileId);
    return { fileId, generatedAt: snapshot.generatedAt, publiclyReadable: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      fileId,
      generatedAt: snapshot.generatedAt,
      publiclyReadable: false,
      warning:
        permissionWarning ??
        `Snapshot saved, but the public read check failed (${msg}). Your Google Workspace may block link sharing.`,
    };
  }
}

export async function fetchPublicVersionShareSnapshot(fileId: string): Promise<LyreflyVersionShareSnapshot> {
  const { buffer } = await fetchPublicDriveMediaWithApiKey(fileId);
  const text = new TextDecoder().decode(buffer);
  const data = JSON.parse(text) as unknown;
  if (!isLyreflyVersionShareSnapshot(data)) {
    throw new DriveHttpError('Invalid Lyrefly version share snapshot', 422);
  }
  return data;
}

export function lyreflyVersionShareHref(fileId: string): string {
  return `#/share/${encodeURIComponent(fileId)}`;
}

export function lyreflyVersionShareUrl(fileId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${lyreflyVersionShareHref(fileId)}`;
}
