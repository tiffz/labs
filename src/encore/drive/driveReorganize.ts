import { encoreDb } from '../db/encoreDb';
import { defaultRepertoireExtrasRow } from './repertoireWire';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import { reorganizeAllPerformanceVideos } from './performanceShortcut';
import { reorganizeAllSongAttachments } from './songAttachmentOrganize';

export type ReorganizeDriveUploadsResult = {
  performanceVideos: {
    renamed: number;
    skipped: number;
    errors: number;
    shortcutsCreated: number;
  };
  attachments: {
    renamed: number;
    moved: number;
    skipped: number;
    errors: number;
    shortcutsCreated: number;
  };
};

/**
 * One-shot Drive tidy: performance video names/shortcuts, plus song attachments
 * (charts, backing tracks, recordings) moved into Encore folders and renamed.
 */
export async function reorganizeAllDriveUploads(accessToken: string): Promise<ReorganizeDriveUploadsResult> {
  await ensureEncoreDriveLayout(accessToken);
  const extras = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(new Date().toISOString());
  const overrides = extras.driveUploadFolderOverrides;
  const [performanceVideos, attachments] = await Promise.all([
    reorganizeAllPerformanceVideos(accessToken, overrides),
    reorganizeAllSongAttachments(accessToken, overrides),
  ]);
  return { performanceVideos, attachments };
}
