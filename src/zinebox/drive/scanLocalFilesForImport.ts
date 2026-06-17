import {
  dedupeLocalPdfFiles,
  loadZineboxImportDedupIndex,
} from './zineboxImportDedup';

export type LocalFilesScanResult = {
  files: File[];
  totalPdfCount: number;
  newCount: number;
  skippedCount: number;
  skippedBatchCount: number;
};

export async function scanLocalFilesForImport(files: readonly File[]): Promise<LocalFilesScanResult> {
  const pdfs = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
  const index = await loadZineboxImportDedupIndex();
  const { toImport, skippedLibrary, skippedBatch } = dedupeLocalPdfFiles(pdfs, index);

  return {
    files: toImport,
    totalPdfCount: pdfs.length,
    newCount: toImport.length,
    skippedCount: skippedLibrary,
    skippedBatchCount: skippedBatch,
  };
}
