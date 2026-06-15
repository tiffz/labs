import { driveCreateFolder, driveListFiles } from '../../shared/drive/driveFetch';
import { sanitizeDriveFolderSegment } from './gestureCollectionPaths';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

function qFolderInParent(name: string, parentId: string): string {
  return `name='${escapeDriveQueryString(name)}' and mimeType='application/vnd.google-apps.folder' and '${escapeDriveQueryString(parentId)}' in parents and trashed=false`;
}

async function findOrCreateSubfolder(
  accessToken: string,
  parentId: string,
  folderName: string,
): Promise<string> {
  const safeName = sanitizeDriveFolderSegment(folderName);
  const list = await driveListFiles(accessToken, qFolderInParent(safeName, parentId), 'files(id)');
  const existingId = list.files?.[0]?.id;
  if (existingId) return existingId;
  const created = await driveCreateFolder(accessToken, safeName, parentId);
  return created.id;
}

/** Ensures nested Drive folders under a pack root; caches by collection-relative path. */
export class GestureDriveFolderCache {
  private readonly cache = new Map<string, string>();

  constructor(
    private readonly accessToken: string,
    private readonly packFolderId: string,
  ) {
    this.cache.set('', packFolderId);
  }

  async resolveParentId(subfolderSegments: string[]): Promise<string> {
    if (subfolderSegments.length === 0) return this.packFolderId;
    let pathKey = '';
    let parentId = this.packFolderId;
    for (const segment of subfolderSegments) {
      pathKey = pathKey ? `${pathKey}/${segment}` : segment;
      const cached = this.cache.get(pathKey);
      if (cached) {
        parentId = cached;
        continue;
      }
      parentId = await findOrCreateSubfolder(this.accessToken, parentId, segment);
      this.cache.set(pathKey, parentId);
    }
    return parentId;
  }
}
