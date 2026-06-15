import { driveListFiles, type DriveFileListRow } from '../../shared/drive/driveFetch';
import { isGestureReferenceImageFile } from './gestureImageFilter';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

export type GesturePackDriveImage = DriveFileListRow & {
  /** Path from the collection root, e.g. `nested/a.jpg`. */
  relativePath: string;
};

async function listChildren(
  accessToken: string,
  folderId: string,
): Promise<DriveFileListRow[]> {
  const out: DriveFileListRow[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  const fields = 'nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,size,md5Checksum)';
  do {
    const res = await driveListFiles(accessToken, q, fields, 100, pageToken);
    out.push(...(res.files ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

/** Lists all reference images in a pack folder, including nested subfolders. */
export async function listImagesInGesturePackFolderRecursive(
  accessToken: string,
  folderId: string,
): Promise<GesturePackDriveImage[]> {
  const images: GesturePackDriveImage[] = [];

  async function walk(currentFolderId: string, pathPrefix: string): Promise<void> {
    const children = await listChildren(accessToken, currentFolderId);
    for (const child of children) {
      if (!child.id || !child.name) continue;
      if (child.mimeType === FOLDER_MIME) {
        const nextPrefix = pathPrefix ? `${pathPrefix}/${child.name}` : child.name;
        await walk(child.id, nextPrefix);
        continue;
      }
      if (!isGestureReferenceImageFile(child)) continue;
      const relativePath = pathPrefix ? `${pathPrefix}/${child.name}` : child.name;
      images.push({ ...child, relativePath });
    }
  }

  await walk(folderId, '');
  return images;
}

/** All image file ids under a pack folder (nested). */
export async function listImageFileIdsInPackFolderRecursive(
  accessToken: string,
  folderId: string,
): Promise<string[]> {
  const images = await listImagesInGesturePackFolderRecursive(accessToken, folderId);
  return images.map((row) => row.id!).filter(Boolean);
}
