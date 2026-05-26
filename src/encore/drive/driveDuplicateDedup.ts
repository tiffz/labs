import { driveTrashFile } from '../../shared/drive/driveFetch';
import { encoreDb, markDirtyRow } from '../db/encoreDb';
import type { EncoreMediaLink, EncoreMiscResource, EncorePerformance, EncoreSong, EncoreSongAttachment } from '../types';
import { songWithSyncedLegacyDriveIds } from '../utils/songAttachments';
import {
  buildDuplicateReplacementMap,
  type DriveDuplicateGroup,
} from './driveDuplicateDetection';

function remapId(id: string | undefined, replacements: Map<string, string>): string | undefined {
  const trimmed = id?.trim();
  if (!trimmed) return undefined;
  return replacements.get(trimmed) ?? trimmed;
}

function remapAttachment(att: EncoreSongAttachment, replacements: Map<string, string>): EncoreSongAttachment {
  const prev = att.driveFileId?.trim();
  const nextDrive = prev ? (replacements.get(prev) ?? prev) : att.driveFileId;
  const shortcutRemapped =
    replacements.has(att.encoreShortcutDriveFileId?.trim() ?? '') ||
    (prev !== undefined && replacements.has(prev));
  return {
    ...att,
    driveFileId: nextDrive,
    encoreShortcutDriveFileId: shortcutRemapped
      ? undefined
      : remapId(att.encoreShortcutDriveFileId, replacements),
  };
}

function remapMediaLink(link: EncoreMediaLink, replacements: Map<string, string>): EncoreMediaLink {
  if (link.source !== 'drive') return link;
  const prev = link.driveFileId?.trim();
  const nextDrive = prev ? (replacements.get(prev) ?? prev) : link.driveFileId;
  const shortcutRemapped =
    replacements.has(link.encoreShortcutDriveFileId?.trim() ?? '') ||
    (prev !== undefined && replacements.has(prev));
  return {
    ...link,
    driveFileId: nextDrive,
    encoreShortcutDriveFileId: shortcutRemapped
      ? undefined
      : remapId(link.encoreShortcutDriveFileId, replacements),
  };
}

function remapMiscResource(resource: EncoreMiscResource, replacements: Map<string, string>): EncoreMiscResource {
  const prev = resource.driveFileId?.trim();
  const nextDrive = prev ? (replacements.get(prev) ?? prev) : resource.driveFileId;
  const shortcutRemapped =
    replacements.has(resource.encoreShortcutDriveFileId?.trim() ?? '') ||
    (prev !== undefined && replacements.has(prev));
  return {
    ...resource,
    driveFileId: nextDrive,
    encoreShortcutDriveFileId: shortcutRemapped
      ? undefined
      : remapId(resource.encoreShortcutDriveFileId, replacements),
  };
}

function applyReplacementsToSong(song: EncoreSong, replacements: Map<string, string>): EncoreSong {
  const next: EncoreSong = {
    ...song,
    sheetMusicDriveFileId: remapId(song.sheetMusicDriveFileId, replacements),
    backingTrackDriveFileId: remapId(song.backingTrackDriveFileId, replacements),
    recordingDriveFileIds: song.recordingDriveFileIds
      ?.map((id) => remapId(id, replacements))
      .filter((id): id is string => Boolean(id)),
    attachments: song.attachments?.map((a) => remapAttachment(a, replacements)),
    referenceLinks: song.referenceLinks?.map((l) => remapMediaLink(l, replacements)),
    backingLinks: song.backingLinks?.map((l) => remapMediaLink(l, replacements)),
    miscResources: song.miscResources?.map((r) => remapMiscResource(r, replacements)),
    updatedAt: new Date().toISOString(),
  };
  return songWithSyncedLegacyDriveIds(next);
}

function applyReplacementsToPerformance(
  performance: EncorePerformance,
  replacements: Map<string, string>,
): EncorePerformance {
  const prevTarget = performance.videoTargetDriveFileId?.trim();
  const prevShortcut = performance.videoShortcutDriveFileId?.trim();
  const nextTarget = prevTarget ? (replacements.get(prevTarget) ?? prevTarget) : undefined;
  const nextShortcut = prevShortcut ? (replacements.get(prevShortcut) ?? prevShortcut) : undefined;
  const shortcutRemapped =
    (prevShortcut !== undefined && replacements.has(prevShortcut)) ||
    (prevTarget !== undefined && replacements.has(prevTarget));

  return {
    ...performance,
    videoTargetDriveFileId: nextTarget ?? nextShortcut,
    videoShortcutDriveFileId: shortcutRemapped ? undefined : nextShortcut,
    updatedAt: new Date().toISOString(),
  };
}

export type ApplyDriveDuplicateDedupResult = {
  songsUpdated: number;
  performancesUpdated: number;
  trashed: number;
  trashErrors: number;
};

export async function applyEncoreDriveDuplicateDedup(
  accessToken: string,
  groups: readonly DriveDuplicateGroup[],
): Promise<ApplyDriveDuplicateDedupResult> {
  const replacements = buildDuplicateReplacementMap(groups);
  if (replacements.size === 0) {
    return { songsUpdated: 0, performancesUpdated: 0, trashed: 0, trashErrors: 0 };
  }

  const songs = await encoreDb.songs.toArray();
  const performances = await encoreDb.performances.toArray();
  let songsUpdated = 0;
  let performancesUpdated = 0;

  for (const song of songs) {
    const next = applyReplacementsToSong(song, replacements);
    if (JSON.stringify(next) !== JSON.stringify(song)) {
      await encoreDb.songs.put(next);
      await markDirtyRow('song', next.id, 'upsert');
      songsUpdated += 1;
    }
  }

  for (const perf of performances) {
    const next = applyReplacementsToPerformance(perf, replacements);
    if (JSON.stringify(next) !== JSON.stringify(perf)) {
      await encoreDb.performances.put(next);
      await markDirtyRow('performance', next.id, 'upsert');
      performancesUpdated += 1;
    }
  }

  const canonical = new Set(groups.map((g) => g.canonicalMediaFileId));
  const toTrash = new Set<string>();
  for (const group of groups) {
    for (const id of group.fileIdsToTrash) {
      if (!canonical.has(id)) toTrash.add(id);
    }
  }

  let trashed = 0;
  let trashErrors = 0;
  for (const fileId of toTrash) {
    try {
      await driveTrashFile(accessToken, fileId);
      trashed += 1;
    } catch {
      trashErrors += 1;
    }
  }

  return { songsUpdated, performancesUpdated, trashed, trashErrors };
}
