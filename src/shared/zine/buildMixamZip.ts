import JSZip from 'jszip';

export type MixamZipEntry = {
  /** Filename inside the archive (e.g. `front.png`). */
  fileName: string;
  blob: Blob;
};

/** Build a ZIP blob from Mixam-named page files. */
export async function buildMixamZipBlob(entries: readonly MixamZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.fileName, entry.blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

/** Trigger a browser download for a ZIP blob. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
