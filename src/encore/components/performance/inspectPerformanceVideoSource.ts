import { stagedSourceName, type LabsStagedUploadInspection, type LabsStagedUploadSource } from '../../../shared/upload/stagedUploads';
import { filterAcceptedPerformanceVideoFiles } from './filterAcceptedPerformanceVideoFiles';

export const PERFORMANCE_VIDEO_NOT_A_VIDEO = "That file isn't a video.";
export const PERFORMANCE_VIDEO_EMPTY = 'That file is empty (0 bytes). Pick a different video.';

/**
 * The performance editor's check for a staged device clip (ADR 0030). Writes nothing: the clip
 * uploads to Drive when the user saves the performance.
 */
export async function inspectPerformanceVideoSource(
  source: LabsStagedUploadSource,
): Promise<LabsStagedUploadInspection<File>> {
  if (source.kind !== 'file') return { ok: false, name: stagedSourceName(source), message: PERFORMANCE_VIDEO_NOT_A_VIDEO };
  const { file } = source;
  if (filterAcceptedPerformanceVideoFiles([file]).length === 0) {
    return { ok: false, name: file.name, message: PERFORMANCE_VIDEO_NOT_A_VIDEO };
  }
  if (file.size === 0) return { ok: false, name: file.name, message: PERFORMANCE_VIDEO_EMPTY };
  return {
    ok: true,
    name: file.name,
    mimeType: file.type || null,
    sizeBytes: file.size,
    outcome: 'Uploads to your Drive when you save',
    plan: file,
  };
}
