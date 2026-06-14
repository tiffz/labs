import { driveGetMediaArrayBuffer } from '../../shared/drive/driveFetch';

const IMAGE_EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

function inferImageMimeType(name: string): string {
  const lower = name.trim().toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  return IMAGE_EXT_MIME[ext] ?? 'image/jpeg';
}

/** Returns true when the URL loads in a browser image element. */
export function probeImageUrlLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/** OAuth `alt=media` fetch — works for `drive.file` uploads when thumbnail URLs fail. */
export async function fetchDriveImageBlob(
  accessToken: string,
  fileId: string,
  name?: string,
): Promise<{ blob: Blob; mimeType: string }> {
  const buffer = await driveGetMediaArrayBuffer(accessToken, fileId);
  const mimeType = inferImageMimeType(name ?? fileId);
  const blob = new Blob([buffer], { type: mimeType });
  return { blob, mimeType };
}

export async function fetchDriveImageObjectUrl(
  accessToken: string,
  fileId: string,
  name?: string,
): Promise<string> {
  const { blob } = await fetchDriveImageBlob(accessToken, fileId, name);
  return URL.createObjectURL(blob);
}
