import { encoreDb } from '../db/encoreDb';
import type { EncoreDriveUploadFolderOverrides, EncorePerformance, EncoreSong } from '../types';
import { syncPerformanceLegacyVideoFields } from '../utils/performanceVideoModel';
import { syncPerformanceVideo, syncPerformanceVideoFileName } from './performanceShortcut';
import { installServerLogger } from '../../shared/utils/serverLogger';

const serverLogger = installServerLogger('ENCORE');

/**
 * Fire-and-forget Drive side-effects for saved songs/performances, extracted from
 * `EncoreActionsContext` so the mutation surface stays focused on Dexie persistence + undo rather
 * than Drive video-shortcut plumbing. All of these are best-effort: a failure logs and is swallowed
 * (the local save already succeeded).
 */

/**
 * When a song's title changes, rename its performances' Drive video shortcut files to match. Best
 * effort; runs in the background after the local song write.
 */
export function renameSongPerformanceVideoShortcuts(
  accessToken: string,
  song: EncoreSong,
  driveUploadFolderOverrides: EncoreDriveUploadFolderOverrides | undefined,
): void {
  void (async () => {
    try {
      const songPerformances = await encoreDb.performances.where('songId').equals(song.id).toArray();
      await Promise.all(
        songPerformances
          .filter((p) => p.videoShortcutDriveFileId || p.videoTargetDriveFileId)
          .map((p) =>
            syncPerformanceVideoFileName(accessToken, p, song, driveUploadFolderOverrides).catch((err) => {
              serverLogger.warn('encore.saveSong: video rename failed', err);
            }),
          ),
      );
    } catch (err) {
      serverLogger.warn('encore.saveSong: video rename batch failed', err);
    }
  })();
}

/**
 * After a performance is saved, create/refresh its Drive video shortcuts and persist any newly
 * created shortcut ids back onto the row. Best effort; runs in the background. `onUpdated` is called
 * only when a shortcut id changed and the row was rewritten (so the caller can reschedule a sync).
 */
export function syncSavedPerformanceVideoShortcuts(params: {
  accessToken: string;
  performance: EncorePerformance;
  driveUploadFolderOverrides: EncoreDriveUploadFolderOverrides | undefined;
  onUpdated: () => void;
}): void {
  const { accessToken, performance: toSave, driveUploadFolderOverrides, onUpdated } = params;
  const videos = toSave.videos ?? [];
  const entries =
    videos.length > 0
      ? videos
      : toSave.videoTargetDriveFileId
        ? [
            {
              id: toSave.primaryVideoId ?? toSave.id,
              videoTargetDriveFileId: toSave.videoTargetDriveFileId,
              videoShortcutDriveFileId: toSave.videoShortcutDriveFileId,
            },
          ]
        : [];
  if (entries.length === 0) return;
  void (async () => {
    try {
      const song = (await encoreDb.songs.get(toSave.songId)) ?? null;
      let updatedVideos = [...videos];
      let shortcutChanged = false;
      for (const video of entries) {
        if (!video.videoTargetDriveFileId?.trim()) continue;
        const pseudo: EncorePerformance = {
          ...toSave,
          videoTargetDriveFileId: video.videoTargetDriveFileId,
          videoShortcutDriveFileId: video.videoShortcutDriveFileId,
        };
        const result = await syncPerformanceVideo(accessToken, pseudo, song, driveUploadFolderOverrides);
        if (result.shortcutCreatedId && result.shortcutCreatedId !== video.videoShortcutDriveFileId) {
          shortcutChanged = true;
          if (updatedVideos.length > 0) {
            updatedVideos = updatedVideos.map((v) =>
              v.id === video.id ? { ...v, videoShortcutDriveFileId: result.shortcutCreatedId } : v,
            );
          }
        }
      }
      if (shortcutChanged) {
        const merged = syncPerformanceLegacyVideoFields({
          ...toSave,
          videos: updatedVideos.length > 0 ? updatedVideos : toSave.videos,
        });
        await encoreDb.performances.put(merged);
        onUpdated();
      }
    } catch (err) {
      serverLogger.warn('encore.savePerformance: video shortcut sync failed', err);
    }
  })();
}
