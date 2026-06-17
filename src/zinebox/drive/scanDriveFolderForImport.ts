import {
  driveCollectPdfFilesRecursive,
  type DrivePdfImportCandidate,
} from '../../shared/drive/driveCollectPdfFilesRecursive';
import { resolveDriveFolderFromUserInput } from '../../shared/drive/resolveDriveFolderFromUserInput';
import {
  isDrivePdfAlreadyImported,
  loadZineboxImportDedupIndex,
} from './zineboxImportDedup';

export type DriveFolderScanResult = {
  folderId: string;
  folderName: string;
  files: DrivePdfImportCandidate[];
  newCount: number;
  skippedCount: number;
  /** True when the folder walk hit internal row/folder limits before finishing. */
  truncated: boolean;
  rowsListed: number;
};

export async function scanDriveFolderForImport(
  accessToken: string,
  folderInput: string,
): Promise<DriveFolderScanResult> {
  const resolved = await resolveDriveFolderFromUserInput(accessToken, folderInput);
  if (!resolved.ok) {
    throw new Error(resolved.message);
  }

  const collected = await driveCollectPdfFilesRecursive(accessToken, resolved.id);
  const files = collected.files;
  if (files.length === 0) {
    throw new Error('No PDF files in that folder tree. Try another folder or upload files from your device.');
  }

  const index = await loadZineboxImportDedupIndex();
  let skippedCount = 0;
  for (const file of files) {
    if (isDrivePdfAlreadyImported(file, index)) skippedCount += 1;
  }

  return {
    folderId: resolved.id,
    folderName: resolved.name,
    files,
    newCount: files.length - skippedCount,
    skippedCount,
    truncated: collected.truncated,
    rowsListed: collected.rowsListed,
  };
}
