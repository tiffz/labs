import { getBookletPageLabel } from '../../shared/zine/bookletPageLabels';
import type { ParsedPageFile } from '../../shared/zine/pageFileParser';

export function displayNameFromParsedPageFile(parsed: ParsedPageFile): string {
  if (parsed.isSpread && parsed.spreadPages) {
    const [left, right] = parsed.spreadPages;
    return `${getBookletPageLabel(left)} - ${getBookletPageLabel(right)}`;
  }
  if (parsed.pageNumber !== null) {
    return getBookletPageLabel(parsed.pageNumber);
  }
  const stem = parsed.originalName.replace(/\.[^/.]+$/, '').trim();
  return stem || parsed.originalName;
}

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i;

export function filterImageFilesForPageUpload(files: readonly File[]): File[] {
  return files.filter((file) => {
    if (file.type.startsWith('image/')) return true;
    return IMAGE_EXT_RE.test(file.name);
  });
}
