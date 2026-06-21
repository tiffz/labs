import type { EncoreMilestoneDefinition, EncorePerformance, EncoreSong } from '../types';
import { ENCORE_FILTER_SENTINEL } from '../utils/encoreFilterSentinels';
import {
  encoreDateInRange,
  encoreDateRangeFromCalendarYear,
  encoreDateRangeFromFilterRecord,
  isEncoreDateRangeActive,
} from '../utils/encoreDateRangeFilter';
import {
  countBackingTracks,
  countChartAttachments,
  countReferenceTracks,
  countTakeAttachments,
  normalizeVenueTag,
  songHasSpotifySource,
  songMatchesAnySelectedTag,
  songMatchesSearch,
  REPERTOIRE_FILTER_EMPTY,
} from '../components/libraryScreenHelpers';
import { applyTemplateProgressToSong } from './repertoireMilestones';
import { milestoneProgressSummary } from './repertoireMilestoneSummary';

/** Tags to attach to new songs when exactly one concrete tag chip is selected (and not excluded). */
export function derivePlaylistImportTagsFromFilters(
  filterValues: Record<string, string[]>,
  excludedFieldIds?: readonly string[],
): string[] | undefined {
  if (excludedFieldIds?.includes('tags')) return undefined;
  const tags = filterValues.tags ?? [];
  const concrete = tags.filter((t) => t !== ENCORE_FILTER_SENTINEL.blankTags && t.trim());
  if (concrete.length === 1) return [concrete[0].trim()];
  return undefined;
}

export function normalizeSavedSearchFilterValues(raw: Record<string, string[]> | undefined): Record<string, string[]> {
  const base = { ...REPERTOIRE_FILTER_EMPTY };
  if (!raw) return base;
  for (const k of Object.keys(REPERTOIRE_FILTER_EMPTY) as (keyof typeof REPERTOIRE_FILTER_EMPTY)[]) {
    const arr = raw[k];
    if (Array.isArray(arr)) base[k] = arr.filter((x) => typeof x === 'string');
  }
  const legacyYear = base.perfYear?.[0];
  if (legacyYear && !base.perfDateAfter?.[0] && !base.perfDateBefore?.[0]) {
    const migrated = encoreDateRangeFromCalendarYear(legacyYear);
    if (migrated.after) base.perfDateAfter = [migrated.after];
    if (migrated.before) base.perfDateBefore = [migrated.before];
    base.perfYear = [];
  }
  return base;
}

/** Field ids that the repertoire filter supports inverting (exclude / NOT IN). Keep in sync with `buildLibraryRepertoireFilterFieldDefs`. */
const REPERTOIRE_EXCLUDABLE_FIELD_IDS = new Set<string>(['venue', 'tags', 'artist', 'perfKey']);

/** Strips ids that don't support exclude so persisted state stays clean. */
export function normalizeExcludedRepertoireFieldIds(raw: readonly string[] | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const id of raw) {
    if (typeof id === 'string' && REPERTOIRE_EXCLUDABLE_FIELD_IDS.has(id)) seen.add(id);
  }
  return [...seen];
}

/**
 * Same filtering semantics as the live Library repertoire list (search + chip filters). Pass
 * `excludedFieldIds` to invert specific multi-select fields (NOT IN). Only fields in
 * {@link REPERTOIRE_EXCLUDABLE_FIELD_IDS} are honored; others are ignored.
 */
export function filterSongsByRepertoireSavedSearchBundle(
  songs: EncoreSong[],
  performances: EncorePerformance[],
  perfBySong: ReadonlyMap<string, EncorePerformance[]>,
  milestoneTemplate: EncoreMilestoneDefinition[],
  searchQuery: string,
  repertoireFilterValues: Record<string, string[]>,
  excludedFieldIds?: readonly string[],
): EncoreSong[] {
  const excluded = new Set<string>(normalizeExcludedRepertoireFieldIds(excludedFieldIds));
  const venueFilters = repertoireFilterValues.venue ?? [];
  const tagFilters = repertoireFilterValues.tags ?? [];
  const artistFilters = repertoireFilterValues.artist ?? [];
  const keyFilters = repertoireFilterValues.perfKey ?? [];
  const milestoneWhich = repertoireFilterValues.milestoneWhich ?? [];
  const milestoneNotDone = repertoireFilterValues.milestoneNotDone ?? [];
  const milestoneMinRaw = repertoireFilterValues.milestoneDoneMin?.[0];
  const milestoneMaxRaw = repertoireFilterValues.milestoneDoneMax?.[0];
  const milestoneMin = milestoneMinRaw != null && milestoneMinRaw !== '' ? Number(milestoneMinRaw) : null;
  const milestoneMax = milestoneMaxRaw != null && milestoneMaxRaw !== '' ? Number(milestoneMaxRaw) : null;
  const assetRefs = repertoireFilterValues.assetRefs?.[0];
  const assetBacking = repertoireFilterValues.assetBacking?.[0];
  const assetSpotify = repertoireFilterValues.assetSpotify?.[0];
  const assetCharts = repertoireFilterValues.assetCharts?.[0];
  const assetTakes = repertoireFilterValues.assetTakes?.[0];
  const performedSel = repertoireFilterValues.performed[0];
  const perfYearFilter = repertoireFilterValues.perfYear?.[0];
  let perfDateRange = encoreDateRangeFromFilterRecord(repertoireFilterValues, 'perfDate');
  if (!isEncoreDateRangeActive(perfDateRange) && perfYearFilter) {
    perfDateRange = encoreDateRangeFromCalendarYear(perfYearFilter);
  }
  const perfPresence =
    performedSel === 'with' ? 'with' : performedSel === 'none' ? 'none' : 'all';
  const practicingSel = repertoireFilterValues.practicing[0];
  const practicingFilter =
    practicingSel === 'practicing' ? 'practicing' : practicingSel === 'not_practicing' ? 'not_practicing' : 'all';
  const template = milestoneTemplate;

  let list = songs;
  if (perfPresence === 'with') {
    list = list.filter((s) => (perfBySong.get(s.id) ?? []).length > 0);
  } else if (perfPresence === 'none') {
    list = list.filter((s) => (perfBySong.get(s.id) ?? []).length === 0);
  }
  if (venueFilters.length > 0) {
    const blankVenue = venueFilters.includes(ENCORE_FILTER_SENTINEL.repertoireNoPerformances);
    const concreteVenues = venueFilters.filter((v) => v !== ENCORE_FILTER_SENTINEL.repertoireNoPerformances);
    const excludeVenues = excluded.has('venue');
    list = list.filter((s) => {
      const songPerfs = perfBySong.get(s.id) ?? [];
      const noPerf = songPerfs.length === 0;
      const matchBlank = blankVenue && noPerf;
      const matchConcrete =
        concreteVenues.length > 0 &&
        concreteVenues.some((v) =>
          performances.some((p) => p.songId === s.id && normalizeVenueTag(p.venueTag) === v),
        );
      let included: boolean;
      if (blankVenue && concreteVenues.length === 0) included = noPerf;
      else if (blankVenue && concreteVenues.length > 0) included = matchBlank || matchConcrete;
      else included = matchConcrete;
      return excludeVenues ? !included : included;
    });
  }
  if (practicingFilter === 'practicing') {
    list = list.filter((s) => Boolean(s.practicing));
  } else if (practicingFilter === 'not_practicing') {
    list = list.filter((s) => !s.practicing);
  }
  if (tagFilters.length > 0) {
    const blankTags = tagFilters.includes(ENCORE_FILTER_SENTINEL.blankTags);
    const concreteTags = tagFilters.filter((t) => t !== ENCORE_FILTER_SENTINEL.blankTags);
    const excludeTags = excluded.has('tags');
    list = list.filter((s) => {
      const songTags = s.tags ?? [];
      const isUntagged = songTags.length === 0;
      const matchBlank = blankTags && isUntagged;
      const matchConcrete = concreteTags.length > 0 && songMatchesAnySelectedTag(s, concreteTags);
      let included: boolean;
      if (blankTags && concreteTags.length === 0) included = isUntagged;
      else if (blankTags && concreteTags.length > 0) included = matchBlank || matchConcrete;
      else included = matchConcrete;
      return excludeTags ? !included : included;
    });
  }
  if (artistFilters.length > 0) {
    const blankArtist = artistFilters.includes(ENCORE_FILTER_SENTINEL.blankArtist);
    const concreteArtists = artistFilters.filter((a) => a !== ENCORE_FILTER_SENTINEL.blankArtist);
    const excludeArtists = excluded.has('artist');
    list = list.filter((s) => {
      const a = s.artist.trim();
      const isBlank = !a;
      const matchBlank = blankArtist && isBlank;
      const matchConcrete =
        concreteArtists.length > 0 &&
        concreteArtists.some((x) => a.toLowerCase() === x.trim().toLowerCase());
      let included: boolean;
      if (blankArtist && concreteArtists.length === 0) included = isBlank;
      else if (blankArtist && concreteArtists.length > 0) included = matchBlank || matchConcrete;
      else included = matchConcrete;
      return excludeArtists ? !included : included;
    });
  }
  if (keyFilters.length > 0) {
    const excludeKeys = excluded.has('perfKey');
    list = list.filter((s) => {
      const k = (s.performanceKey ?? '').trim();
      const included = keyFilters.some((sel) => (sel === ENCORE_FILTER_SENTINEL.blankKey ? !k : k === sel));
      return excludeKeys ? !included : included;
    });
  }
  if (assetRefs === 'with') list = list.filter((s) => countReferenceTracks(s) > 0);
  else if (assetRefs === 'without') list = list.filter((s) => countReferenceTracks(s) === 0);
  if (assetBacking === 'with') list = list.filter((s) => countBackingTracks(s) > 0);
  else if (assetBacking === 'without') list = list.filter((s) => countBackingTracks(s) === 0);
  if (assetSpotify === 'with') list = list.filter((s) => songHasSpotifySource(s));
  else if (assetSpotify === 'without') list = list.filter((s) => !songHasSpotifySource(s));
  if (assetCharts === 'with') list = list.filter((s) => countChartAttachments(s) > 0);
  else if (assetCharts === 'without') list = list.filter((s) => countChartAttachments(s) === 0);
  if (assetTakes === 'with') list = list.filter((s) => countTakeAttachments(s) > 0);
  else if (assetTakes === 'without') list = list.filter((s) => countTakeAttachments(s) === 0);

  if (isEncoreDateRangeActive(perfDateRange)) {
    list = list.filter((s) =>
      (perfBySong.get(s.id) ?? []).some((p) => encoreDateInRange(p.date, perfDateRange)),
    );
  }

  if (milestoneWhich.length > 0) {
    list = list.filter((s) => {
      const synced = applyTemplateProgressToSong(s, template);
      return milestoneWhich.every((id) => synced.milestoneProgress?.[id]?.state === 'done');
    });
  }
  if (milestoneNotDone.length > 0) {
    list = list.filter((s) => {
      const synced = applyTemplateProgressToSong(s, template);
      return milestoneNotDone.every((id) => synced.milestoneProgress?.[id]?.state !== 'done');
    });
  }
  if (milestoneMin != null && !Number.isNaN(milestoneMin)) {
    list = list.filter((s) => milestoneProgressSummary(s, template).done >= milestoneMin);
  }
  if (milestoneMax != null && !Number.isNaN(milestoneMax)) {
    list = list.filter((s) => milestoneProgressSummary(s, template).done <= milestoneMax);
  }

  if (searchQuery.trim()) {
    list = list.filter((s) => songMatchesSearch(s, searchQuery, perfBySong));
  }
  return list;
}
