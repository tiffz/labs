import type { EncoreDriveContentIndex, EncoreDriveContentIndexEntry } from './encoreDriveContentIndex';
import { lookupEncoreDriveContentIndex } from './encoreDriveContentIndex';

export type EncoreDriveDuplicateUploadChoice = 'reuse' | 'upload' | 'cancel';

export type RunEncoreDriveUploadWithDuplicateCheckOptions<T> = {
  file: File;
  contentIndex: EncoreDriveContentIndex | undefined;
  promptReuse: (entry: EncoreDriveContentIndexEntry) => Promise<EncoreDriveDuplicateUploadChoice>;
  uploadNew: () => Promise<T>;
  reuseExisting: (driveFileId: string) => Promise<T>;
};

/**
 * When the local content index matches the file (name + size), ask whether to reuse the
 * existing Drive file instead of uploading again.
 */
export async function runEncoreDriveUploadWithDuplicateCheck<T>(
  opts: RunEncoreDriveUploadWithDuplicateCheckOptions<T>,
): Promise<T | null> {
  const match = lookupEncoreDriveContentIndex(opts.contentIndex, opts.file);
  if (match) {
    const choice = await opts.promptReuse(match);
    if (choice === 'cancel') return null;
    if (choice === 'reuse') return opts.reuseExisting(match.driveFileId);
  }
  return opts.uploadNew();
}
