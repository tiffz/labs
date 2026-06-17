import { DriveHttpError } from '../../shared/drive/driveFetch';

const DRIVE_IMPORT_READ_SCOPE_HINT =
  'Google needs read access to download PDFs from that folder. Tap Import again and allow the extra Drive permission when prompted.';

export function formatZineboxDriveImportError(error: unknown): string {
  if (error instanceof DriveHttpError) {
    if (error.status === 403 || error.status === 401) {
      return DRIVE_IMPORT_READ_SCOPE_HINT;
    }
  }
  return error instanceof Error ? error.message : 'Could not import those PDFs.';
}
