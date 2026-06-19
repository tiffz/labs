import { zineboxFileSizeNameKey } from '../drive/zineboxImportDedup';
import type { ZineboxCollection, ZineboxComic } from '../types';

export type ZineboxDuplicateSuggestion = {
  id: string;
  reason: string;
  comicIds: string[];
  /** Comic to keep when applying (most reading progress, then oldest id). */
  keepComicId: string;
};

export type ZineboxStackSuggestion = {
  id: string;
  label: string;
  comicIds: string[];
};

export type ZineboxOrganizeSuggestions = {
  duplicates: ZineboxDuplicateSuggestion[];
  stackCandidates: ZineboxStackSuggestion[];
};

export type ZineboxOrganizeScanResult = {
  comicCount: number;
  collectionCount: number;
  suggestions: ZineboxOrganizeSuggestions;
};

export function normalizeZineboxTitleForDedup(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function titleSourceKey(comic: ZineboxComic): string {
  const title = normalizeZineboxTitleForDedup(comic.title);
  if (!title) return '';
  return `${title}::${comic.source.trim().toLowerCase()}`;
}

export function normalizeZineboxSeriesKey(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s*#\s*\d+[\w.-]*/gi, '')
    .replace(/\bissue\s*\d+[\w.-]*/gi, '')
    .replace(/\bno\.?\s*\d+[\w.-]*/gi, '')
    .replace(/\bvol(?:ume)?\.?\s*\d+[\w.-]*/gi, '')
    .replace(/\s*[—–-]\s*.+$/, '')
    .replace(/\s+by\s+.+$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickComicToKeep(comics: readonly ZineboxComic[]): string {
  const sorted = [...comics].sort((a, b) => {
    const progressDelta = b.progressPercentage - a.progressPercentage;
    if (progressDelta !== 0) return progressDelta;
    const readRank = (status: ZineboxComic['readStatus']) =>
      status === 'finished' ? 2 : status === 'in_progress' ? 1 : 0;
    const readDelta = readRank(b.readStatus) - readRank(a.readStatus);
    if (readDelta !== 0) return readDelta;
    return a.id.localeCompare(b.id);
  });
  return sorted[0]?.id ?? comics[0]!.id;
}

function stackedTogether(comicIds: readonly string[], collections: readonly ZineboxCollection[]): boolean {
  const set = new Set(comicIds);
  return collections.some(
    (collection) => comicIds.every((id) => collection.itemIds.includes(id)) && set.size > 1,
  );
}

export function buildZineboxOrganizeSuggestions(
  comics: readonly ZineboxComic[],
  collections: readonly ZineboxCollection[],
): ZineboxOrganizeSuggestions {
  const duplicates: ZineboxDuplicateSuggestion[] = [];
  const stackCandidates: ZineboxStackSuggestion[] = [];

  const md5Groups = new Map<string, ZineboxComic[]>();
  const sizeNameGroups = new Map<string, ZineboxComic[]>();
  const titleSourceGroups = new Map<string, ZineboxComic[]>();
  const driveMediaGroups = new Map<string, ZineboxComic[]>();
  const driveRowGroups = new Map<string, ZineboxComic[]>();
  const seriesGroups = new Map<string, ZineboxComic[]>();

  for (const comic of comics) {
    const md5 = comic.contentMd5?.trim().toLowerCase();
    if (md5) {
      const group = md5Groups.get(md5) ?? [];
      group.push(comic);
      md5Groups.set(md5, group);
    }

    if (comic.filename && comic.fileSizeBytes && comic.fileSizeBytes > 0) {
      const key = zineboxFileSizeNameKey(comic.filename, comic.fileSizeBytes);
      if (key) {
        const group = sizeNameGroups.get(key) ?? [];
        group.push(comic);
        sizeNameGroups.set(key, group);
      }
    }

    const driveMediaId = comic.driveMediaFileId?.trim();
    if (driveMediaId) {
      const group = driveMediaGroups.get(driveMediaId) ?? [];
      group.push(comic);
      driveMediaGroups.set(driveMediaId, group);
    }

    const driveRowId = comic.driveFileId?.trim();
    if (driveRowId) {
      const group = driveRowGroups.get(driveRowId) ?? [];
      group.push(comic);
      driveRowGroups.set(driveRowId, group);
    }

    const dedupeTitleKey = titleSourceKey(comic);
    if (dedupeTitleKey.length > 3) {
      const group = titleSourceGroups.get(dedupeTitleKey) ?? [];
      group.push(comic);
      titleSourceGroups.set(dedupeTitleKey, group);
    }

    const seriesKey = `${normalizeZineboxSeriesKey(comic.title)}::${comic.source.toLowerCase()}`;
    if (seriesKey.length > 3) {
      const group = seriesGroups.get(seriesKey) ?? [];
      group.push(comic);
      seriesGroups.set(seriesKey, group);
    }
  }

  let duplicateIndex = 0;
  const seenDuplicateSets = new Set<string>();

  const pushDuplicateGroup = (reason: string, group: ZineboxComic[]) => {
    if (group.length < 2) return;
    const ids = group.map((comic) => comic.id).sort();
    const key = ids.join(',');
    if (seenDuplicateSets.has(key)) return;
    seenDuplicateSets.add(key);
    duplicateIndex += 1;
    duplicates.push({
      id: `dup-${duplicateIndex}`,
      reason,
      comicIds: ids,
      keepComicId: pickComicToKeep(group),
    });
  };

  for (const group of md5Groups.values()) {
    pushDuplicateGroup('Same PDF checksum', group);
  }
  for (const group of sizeNameGroups.values()) {
    pushDuplicateGroup('Same filename and file size', group);
  }
  for (const group of driveMediaGroups.values()) {
    pushDuplicateGroup('Same Drive PDF file', group);
  }
  for (const group of driveRowGroups.values()) {
    pushDuplicateGroup('Same Drive import row', group);
  }
  for (const group of titleSourceGroups.values()) {
    pushDuplicateGroup('Same title and source', group);
  }

  let stackIndex = 0;
  for (const [seriesKey, group] of seriesGroups.entries()) {
    if (group.length < 2) continue;
    const comicIds = group.map((comic) => comic.id);
    if (stackedTogether(comicIds, collections)) continue;
    stackIndex += 1;
    const label = seriesKey.split('::')[0] ?? group[0]?.title ?? 'Series';
    stackCandidates.push({
      id: `stack-${stackIndex}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      comicIds,
    });
  }

  stackCandidates.sort((a, b) => a.label.localeCompare(b.label));

  return { duplicates, stackCandidates };
}

export function scanZineboxLibraryOrganize(
  comics: readonly ZineboxComic[],
  collections: readonly ZineboxCollection[],
): ZineboxOrganizeScanResult {
  return {
    comicCount: comics.length,
    collectionCount: collections.length,
    suggestions: buildZineboxOrganizeSuggestions(comics, collections),
  };
}
