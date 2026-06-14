const FOLDER_MIME = 'application/vnd.google-apps.folder';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|heic|heif|tif{1,2})$/i;

/** True when a Drive row is a reference photo for flat-folder packs (v1). */
export function isGestureReferenceImageFile(f: { name?: string; mimeType?: string }): boolean {
  const mt = (f.mimeType ?? '').toLowerCase();
  const n = (f.name ?? '').toLowerCase();
  if (mt === FOLDER_MIME) return false;
  if (mt.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.test(n);
}
