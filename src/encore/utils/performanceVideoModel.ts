import type { EncorePerformance, EncorePerformanceVideo } from '../types';

/** Ensures `videos` + `primaryVideoId` reflect legacy single-video fields. */
export function normalizeEncorePerformance(performance: EncorePerformance): EncorePerformance {
  const existing = performance.videos?.filter(Boolean) ?? [];
  if (existing.length > 0) {
    const primaryId =
      performance.primaryVideoId?.trim() &&
      existing.some((v) => v.id === performance.primaryVideoId?.trim())
        ? performance.primaryVideoId.trim()
        : existing[0]!.id;
    return {
      ...performance,
      videos: existing,
      primaryVideoId: primaryId,
      ...legacyFieldsFromPrimary(existing.find((v) => v.id === primaryId) ?? existing[0]!),
    };
  }

  const legacyTarget = performance.videoTargetDriveFileId?.trim();
  const legacyShortcut = performance.videoShortcutDriveFileId?.trim();
  const legacyExternal = performance.externalVideoUrl?.trim();
  if (!legacyTarget && !legacyShortcut && !legacyExternal) {
    return { ...performance, videos: undefined, primaryVideoId: undefined };
  }

  const videoId = performance.primaryVideoId?.trim() || crypto.randomUUID();
  const synthesized: EncorePerformanceVideo = {
    id: videoId,
    videoTargetDriveFileId: legacyTarget || undefined,
    videoShortcutDriveFileId: legacyShortcut || undefined,
    externalVideoUrl: legacyExternal || undefined,
    createdAt: performance.createdAt,
  };
  return {
    ...performance,
    videos: [synthesized],
    primaryVideoId: videoId,
    ...legacyFieldsFromPrimary(synthesized),
  };
}

function legacyFieldsFromPrimary(video: EncorePerformanceVideo): Pick<
  EncorePerformance,
  'videoTargetDriveFileId' | 'videoShortcutDriveFileId' | 'externalVideoUrl'
> {
  return {
    videoTargetDriveFileId: video.videoTargetDriveFileId,
    videoShortcutDriveFileId: video.videoShortcutDriveFileId,
    externalVideoUrl: video.externalVideoUrl,
  };
}

export function getPrimaryPerformanceVideo(performance: EncorePerformance): EncorePerformanceVideo | null {
  const normalized = normalizeEncorePerformance(performance);
  const videos = normalized.videos ?? [];
  if (videos.length === 0) return null;
  const primaryId = normalized.primaryVideoId ?? videos[0]!.id;
  return videos.find((v) => v.id === primaryId) ?? videos[0]!;
}

export function performanceVideoCount(performance: EncorePerformance): number {
  return normalizeEncorePerformance(performance).videos?.length ?? 0;
}

export function performanceExtraVideoCount(performance: EncorePerformance): number {
  const count = performanceVideoCount(performance);
  return count > 1 ? count - 1 : 0;
}

/** Writes legacy top-level video fields from the primary video for sync compat. */
export function syncPerformanceLegacyVideoFields(performance: EncorePerformance): EncorePerformance {
  const normalized = normalizeEncorePerformance(performance);
  const primary = getPrimaryPerformanceVideo(normalized);
  if (!primary) {
    return {
      ...normalized,
      videoTargetDriveFileId: undefined,
      videoShortcutDriveFileId: undefined,
      externalVideoUrl: undefined,
      primaryVideoId: undefined,
      videos: normalized.videos?.length ? normalized.videos : undefined,
    };
  }
  return {
    ...normalized,
    ...legacyFieldsFromPrimary(primary),
  };
}

/** Updates which clip is primary and keeps legacy top-level video fields in sync. */
export function setPrimaryPerformanceVideo(
  performance: EncorePerformance,
  videoId: string,
): EncorePerformance {
  const normalized = normalizeEncorePerformance(performance);
  const videos = normalized.videos ?? [];
  if (!videos.some((v) => v.id === videoId)) return normalized;
  return syncPerformanceLegacyVideoFields({ ...normalized, primaryVideoId: videoId });
}

export function newPerformanceVideo(partial?: Partial<EncorePerformanceVideo>): EncorePerformanceVideo {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    ...partial,
  };
}
