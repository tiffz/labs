import { fileMatchesAccept } from '../../../shared/utils/fileMatchesAccept';
import { PERF_LOCAL_VIDEO_ACCEPT } from '../../utils/performanceVideoAccept';

/** Accepted performance video files from a drop or picker selection. */
export function filterAcceptedPerformanceVideoFiles(files: File[]): File[] {
  return files.filter((f) => fileMatchesAccept(f, PERF_LOCAL_VIDEO_ACCEPT));
}
