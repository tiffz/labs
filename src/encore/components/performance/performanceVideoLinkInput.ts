import type { EncorePerformanceVideo } from '../../types';

/** Text field value for a saved performance video's source. */
export function videoToLinkInput(video: {
  externalVideoUrl?: string;
  videoTargetDriveFileId?: string;
  videoShortcutDriveFileId?: string;
}): string {
  if (video.externalVideoUrl?.trim()) return video.externalVideoUrl.trim();
  if (video.videoTargetDriveFileId?.trim()) return video.videoTargetDriveFileId.trim();
  if (video.videoShortcutDriveFileId?.trim()) return video.videoShortcutDriveFileId.trim();
  return '';
}

export function isVideoLinkInputDirty(video: EncorePerformanceVideo, draftInput: string): boolean {
  return draftInput.trim() !== videoToLinkInput(video).trim();
}
