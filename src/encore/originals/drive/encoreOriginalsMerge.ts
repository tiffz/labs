/**
 * Content-aware merge for Encore Originals — mirrors ADR 0019 repertoire rules.
 *
 * Whole-row `updatedAt` LWW let a newer sparse shard (title/tempo bump) wipe richer older
 * `lyricsAndChords`, `sectionPlaybackOverrides`, brainstorm, takes, etc. Protected fields
 * always merge non-destructively onto a newer-wins scalar base.
 */
import { isBlankExerciseAnswer } from '../../drive/encoreRepertoireMerge';
import type { EncoreMiscResource } from '../../types';
import { remapSectionPlaybackOverridesForChordPro } from '../remapSectionPlaybackOverrides';
import type { OriginalsSectionPlaybackOverride } from '../sectionPlaybackOverrides';
import {
  ORIGINALS_HISTORY_MAX,
  type EncoreOriginalSong,
  type OriginalAudioTake,
  type OriginalSongSnapshot,
  type OriginalsStageCompletion,
} from '../types';

function pickFilledText(a: string | undefined, b: string | undefined, preferAWhenTie: boolean): string {
  const aBlank = isBlankExerciseAnswer(a);
  const bBlank = isBlankExerciseAnswer(b);
  if (!aBlank && bBlank) return a ?? '';
  if (!bBlank && aBlank) return b ?? '';
  if (aBlank && bBlank) return preferAWhenTie ? (a ?? '') : (b ?? '');
  const aLen = (a ?? '').trim().length;
  const bLen = (b ?? '').trim().length;
  if (aLen !== bLen) return aLen > bLen ? (a ?? '') : (b ?? '');
  return preferAWhenTie ? (a ?? '') : (b ?? '');
}

function playbackOverrideRichness(o: OriginalsSectionPlaybackOverride): number {
  let n = 0;
  if (o.customPlayback) n += 2;
  if (o.chordStyleId) n += 1;
  if (o.drumsEnabled != null) n += 1;
  if (o.drumPattern?.trim()) n += 1;
  return n;
}

function mergePlaybackOverridePair(
  a: OriginalsSectionPlaybackOverride,
  b: OriginalsSectionPlaybackOverride,
  preferAWhenTie: boolean,
): OriginalsSectionPlaybackOverride {
  const aRich = playbackOverrideRichness(a);
  const bRich = playbackOverrideRichness(b);
  if (aRich > 0 && bRich === 0) return a;
  if (bRich > 0 && aRich === 0) return b;
  if (aRich !== bRich) return aRich > bRich ? a : b;
  return preferAWhenTie ? a : b;
}

function mergeSectionPlaybackOverrides(
  local: Record<string, OriginalsSectionPlaybackOverride> | undefined,
  remote: Record<string, OriginalsSectionPlaybackOverride> | undefined,
  preferLocalWhenTie: boolean,
  mergedLyrics: string,
): Record<string, OriginalsSectionPlaybackOverride> | undefined {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  if (keys.size === 0) return undefined;
  const out: Record<string, OriginalsSectionPlaybackOverride> = {};
  for (const key of keys) {
    const a = local?.[key];
    const b = remote?.[key];
    if (a && b) out[key] = mergePlaybackOverridePair(a, b, preferLocalWhenTie);
    else if (a) out[key] = a;
    else if (b) out[key] = b;
  }
  return remapSectionPlaybackOverridesForChordPro(mergedLyrics, out);
}

function mergeProgressionOverrides(
  local: Record<string, string> | undefined,
  remote: Record<string, string> | undefined,
  preferLocalWhenTie: boolean,
): Record<string, string> | undefined {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  if (keys.size === 0) return undefined;
  const out: Record<string, string> = {};
  for (const key of keys) {
    out[key] = pickFilledText(local?.[key], remote?.[key], preferLocalWhenTie);
  }
  return out;
}

function takeRichness(take: OriginalAudioTake): number {
  let n = 0;
  if (take.driveFileId?.trim()) n += 2;
  if (take.hasLocalAudio) n += 2;
  if (take.notes?.trim()) n += 1;
  if (take.label.trim()) n += 1;
  return n;
}

function mergeTakePair(a: OriginalAudioTake, b: OriginalAudioTake): OriginalAudioTake {
  const aRich = takeRichness(a);
  const bRich = takeRichness(b);
  if (aRich > 0 && bRich === 0) return a;
  if (bRich > 0 && aRich === 0) return b;
  if (aRich !== bRich) return aRich > bRich ? a : b;
  return a.timestamp >= b.timestamp ? a : b;
}

function mergeTakes(local: OriginalAudioTake[], remote: OriginalAudioTake[]): OriginalAudioTake[] {
  const byId = new Map<string, OriginalAudioTake>();
  const order: string[] = [];
  const consider = (take: OriginalAudioTake) => {
    const prev = byId.get(take.id);
    if (!prev) {
      byId.set(take.id, take);
      order.push(take.id);
    } else {
      byId.set(take.id, mergeTakePair(prev, take));
    }
  };
  for (const t of local) consider(t);
  for (const t of remote) consider(t);
  return order.map((id) => byId.get(id)!);
}

function resourceRichness(r: EncoreMiscResource): number {
  let n = 0;
  if (r.driveFileId?.trim()) n += 2;
  if (r.url?.trim()) n += 1;
  if (r.notes?.trim()) n += 1;
  if (r.label.trim()) n += 1;
  return n;
}

function mergeResourcePair(a: EncoreMiscResource, b: EncoreMiscResource): EncoreMiscResource {
  const aRich = resourceRichness(a);
  const bRich = resourceRichness(b);
  if (aRich !== bRich) return aRich > bRich ? a : b;
  return a.createdAt >= b.createdAt ? a : b;
}

function mergeResources(
  local: EncoreMiscResource[] | undefined,
  remote: EncoreMiscResource[] | undefined,
): EncoreMiscResource[] | undefined {
  if (!local?.length && !remote?.length) return undefined;
  const byId = new Map<string, EncoreMiscResource>();
  const order: string[] = [];
  const consider = (row: EncoreMiscResource) => {
    const prev = byId.get(row.id);
    if (!prev) {
      byId.set(row.id, row);
      order.push(row.id);
    } else {
      byId.set(row.id, mergeResourcePair(prev, row));
    }
  };
  for (const r of local ?? []) consider(r);
  for (const r of remote ?? []) consider(r);
  return order.map((id) => byId.get(id)!);
}

function mergeStageCompletion(
  local: OriginalsStageCompletion | undefined,
  remote: OriginalsStageCompletion | undefined,
): OriginalsStageCompletion | undefined {
  if (!local && !remote) return undefined;
  const keys = new Set([
    ...Object.keys(local ?? {}),
    ...Object.keys(remote ?? {}),
  ]) as Set<keyof OriginalsStageCompletion>;
  const out: OriginalsStageCompletion = {};
  for (const key of keys) {
    const a = local?.[key];
    const b = remote?.[key];
    if (a === true || b === true) out[key] = true;
    else if (a === false || b === false) out[key] = false;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function mergeHistory(
  local: OriginalSongSnapshot[],
  remote: OriginalSongSnapshot[],
): OriginalSongSnapshot[] {
  const byTs = new Map<number, OriginalSongSnapshot>();
  for (const snap of [...local, ...remote]) {
    const prev = byTs.get(snap.timestamp);
    if (!prev || (snap.lyricsAndChords?.length ?? 0) > (prev.lyricsAndChords?.length ?? 0)) {
      byTs.set(snap.timestamp, snap);
    }
  }
  return [...byTs.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-ORIGINALS_HISTORY_MAX);
}

function pickMainTakeId(
  base: EncoreOriginalSong,
  takes: OriginalAudioTake[],
): string | null {
  if (base.mainTakeId && takes.some((t) => t.id === base.mainTakeId)) return base.mainTakeId;
  const other = base.mainTakeId === null ? null : takes.find((t) => t.id === base.mainTakeId);
  if (other) return other.id;
  return takes[0]?.id ?? null;
}

/**
 * Merge two versions of the same original. Scalars follow newer-`updatedAt`; compound content
 * fields never lose filled data to a sparser copy.
 */
export function mergeOriginalSongPreservingContent(
  local: EncoreOriginalSong,
  remote: EncoreOriginalSong,
): EncoreOriginalSong {
  const preferLocal = local.updatedAt >= remote.updatedAt;
  const base = preferLocal ? local : remote;

  const lyricsAndChords = pickFilledText(local.lyricsAndChords, remote.lyricsAndChords, preferLocal);
  const brainstormHtml = pickFilledText(local.brainstormHtml, remote.brainstormHtml, preferLocal) || undefined;

  const takes = mergeTakes(local.takes ?? [], remote.takes ?? []);
  const brainstormResources = mergeResources(local.brainstormResources, remote.brainstormResources);
  const songReferences = mergeResources(local.songReferences, remote.songReferences);
  const stageCompletion = mergeStageCompletion(local.stageCompletion, remote.stageCompletion);
  const history = mergeHistory(local.history ?? [], remote.history ?? []);
  const sectionProgressionOverrides = mergeProgressionOverrides(
    local.sectionProgressionOverrides,
    remote.sectionProgressionOverrides,
    preferLocal,
  );
  const sectionPlaybackOverrides = mergeSectionPlaybackOverrides(
    local.sectionPlaybackOverrides,
    remote.sectionPlaybackOverrides,
    preferLocal,
    lyricsAndChords,
  );

  const updatedAt =
    local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt;

  const merged: EncoreOriginalSong = {
    ...base,
    lyricsAndChords,
    brainstormHtml,
    takes,
    mainTakeId: pickMainTakeId(base, takes),
    history,
    updatedAt,
  };

  if (brainstormResources) merged.brainstormResources = brainstormResources;
  else delete merged.brainstormResources;
  if (songReferences) merged.songReferences = songReferences;
  else delete merged.songReferences;
  if (stageCompletion) merged.stageCompletion = stageCompletion;
  else delete merged.stageCompletion;
  if (sectionProgressionOverrides) merged.sectionProgressionOverrides = sectionProgressionOverrides;
  else delete merged.sectionProgressionOverrides;
  if (sectionPlaybackOverrides) merged.sectionPlaybackOverrides = sectionPlaybackOverrides;
  else delete merged.sectionPlaybackOverrides;

  return merged;
}

/** Union-merge original song lists by id using {@link mergeOriginalSongPreservingContent}. */
export function mergeOriginalSongRecords(
  local: EncoreOriginalSong[],
  remote: EncoreOriginalSong[],
): EncoreOriginalSong[] {
  const byId = new Map<string, EncoreOriginalSong>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const cur = byId.get(row.id);
    byId.set(row.id, cur ? mergeOriginalSongPreservingContent(cur, row) : row);
  }
  return [...byId.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
