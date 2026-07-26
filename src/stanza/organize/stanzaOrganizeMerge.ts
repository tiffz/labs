/**
 * stanzaOrganizeMerge — PURE planner for the Organize "Merge selected" apply-path.
 *
 * Given the user's selected groups (each with a chosen canonical survivor and a chosen "Play from"
 * source), this computes exactly what the applier must write: the merged survivor rows, the rows to
 * drop, the takes to remap vs delete, the deletion tombstones, and any group it must REFUSE to
 * protect unique un-backed media. It performs NO Dexie writes and mutates no input — every risky
 * decision lives here so it is unit-testable without a database (see ADR 0027).
 *
 * ## Same-source vs cross-source (the ADR 0027 core distinction)
 *
 * - **Same-source** members point at the *same recording* (identical `ytId` / `driveSourceFileId`,
 *   or matching `localMediaFingerprint`). Their segment ids are derived from one timeline, so the
 *   existing `mergeStanzaRicherSongMetadata` union of markers / stats / segment-keyed maps is safe.
 *   Members are grouped transitively (A≡B, B≡C ⇒ one recording), matching the detection engine's
 *   Tier-1 union-find.
 * - **Cross-source** members are *different recordings*. Their segment ids do NOT align, so a union
 *   would graft one recording's practice history onto unrelated positions of another. The merge
 *   keeps ONLY the survivor's `markers` / `stats` / `metronomeBySegmentId` / `drumPatternBySegmentId`
 *   / takes and drops the donor's. Donor takes are deleted (their `segmentId`s cannot exist on the
 *   survivor). The preview states this plainly.
 *
 * ## Never lose unique un-backed media (ADR 0027 BLOCKER)
 *
 * The Drive undo snapshot is metadata-only, so a dropped `localAudioBlob` / stem blob that is not on
 * Drive is unrecoverable. The planner REFUSES any group where applying it would drop a member's
 * unique local blob that is neither carried onto the survivor nor backed to Drive. Refusing is the
 * MVP-safe choice; a future phase may upload-then-merge instead.
 */

import type { StanzaSong } from '../db/stanzaDb';
import {
  stanzaLocalMediaFingerprintForRow,
  stanzaLocalMediaFingerprintsMatch,
} from '../utils/stanzaLocalMediaFingerprint';
import { mergeStanzaRicherSongMetadata } from '../utils/stanzaSongMetadataMerge';
import { mergeStanzaStemTracks } from '../utils/stanzaStemMerge';

/** A user-confirmed group to merge: which rows, which survives, which source plays. */
export interface StanzaOrganizeSelection {
  /** ≥2 distinct row ids, all present in the library. */
  memberIds: string[];
  /** Survivor row id (∈ memberIds) — keeps its id, practice data, title, and own blobs. */
  canonicalId: string;
  /** Which member's recording plays (∈ memberIds). Sets `ytId`/`driveSourceFileId`/`practiceSource`. */
  playFromId: string;
}

export interface StanzaOrganizeRefusal {
  memberIds: string[];
  canonicalId: string;
  /** User-facing reason the group was not merged. */
  reason: string;
}

export interface StanzaOrganizeTombstones {
  driveSourceFileIds: string[];
  youtubeVideoIds: string[];
  /** Row ids of dropped keyless-local uploads (no `ytId` / `driveSourceFileId`). */
  localSongIds: string[];
}

export interface StanzaOrganizeMergePlan {
  /** Survivor rows to write back (post-merge). */
  mergedRows: StanzaSong[];
  /** Donor row ids to delete. */
  droppedRowIds: string[];
  /** Every dropped donor id → its survivor id (for `stanzaLastSelectedSongId` + identity). */
  remappedIds: Map<string, string>;
  /** Same-source donor id → survivor id — remap `takes.songId` (segment ids align). */
  takeRemapIds: Map<string, string>;
  /** Cross-source donor ids whose takes must be DELETED (segment ids do not align). */
  takeDropSongIds: string[];
  /** Deletion tombstones for discarded sources (never a still-referenced source). */
  tombstones: StanzaOrganizeTombstones;
  /** Groups not merged, with reasons (unique un-backed media, or invalid selection). */
  refusals: StanzaOrganizeRefusal[];
}

export type StanzaOrganizeSourceKind = 'youtube' | 'upload' | 'drive' | 'none';

export interface StanzaOrganizeGroupPreview {
  canonicalId: string;
  finalTitle: string;
  /** True when the group spans more than one recording (donor practice data will be dropped). */
  crossSource: boolean;
  playFromId: string;
  playFromKind: StanzaOrganizeSourceKind;
  /** Section-marker count on the merged survivor. */
  mergedMarkerCount: number;
  /** Human labels of sources that will be removed from the merged row. */
  discardedSources: string[];
  /** True when the other copy's per-section tempo/drum/practice data will not carry over. */
  dropsDonorPracticeData: boolean;
  /** Non-null when the group cannot be merged safely. */
  refusedReason: string | null;
}

const UNBACKED_BLOB_REFUSAL =
  "This copy has audio that isn't backed up yet. Back it up to Drive first, or leave this group out.";

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

function trimmed(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export function stanzaOrganizeSourceKind(row: StanzaSong): StanzaOrganizeSourceKind {
  if (row.ytId && row.practiceSource !== 'local') return 'youtube';
  if (row.localAudioBlob || row.localMediaFingerprint) return 'upload';
  if (trimmed(row.driveSourceFileId)) return 'drive';
  if (row.ytId) return 'youtube';
  return 'none';
}

function sourceLabel(kind: StanzaOrganizeSourceKind): string {
  switch (kind) {
    case 'youtube':
      return 'YouTube link';
    case 'upload':
      return 'uploaded file';
    case 'drive':
      return 'Drive file';
    default:
      return 'no source';
  }
}

/** True when both rows point at the same underlying recording (exact identity). */
function sharesRecordingIdentity(a: StanzaSong, b: StanzaSong): boolean {
  const ay = trimmed(a.ytId);
  const by = trimmed(b.ytId);
  if (ay && by && ay === by) return true;
  const ad = trimmed(a.driveSourceFileId);
  const bd = trimmed(b.driveSourceFileId);
  if (ad && bd && ad === bd) return true;
  return stanzaLocalMediaFingerprintsMatch(
    stanzaLocalMediaFingerprintForRow(a),
    stanzaLocalMediaFingerprintForRow(b),
  );
}

/** A member's main audio blob is unrecoverable if dropped: present locally, not backed to Drive. */
function hasUnbackedMainBlob(row: StanzaSong): boolean {
  return !!row.localAudioBlob && !trimmed(row.driveSourceFileId);
}

function hasUnbackedStemBlob(row: StanzaSong): boolean {
  return (row.stems ?? []).some((s) => s.localBlob && !trimmed(s.driveFileId));
}

// ---------------------------------------------------------------------------
// Per-group planning (shared by plan + preview)
// ---------------------------------------------------------------------------

interface PlannedGroup {
  survivor: StanzaSong;
  canonicalId: string;
  playFromId: string;
  droppedIds: string[];
  sameSourceDonorIds: string[];
  crossSourceDonorIds: string[];
  crossSource: boolean;
  members: StanzaSong[];
}

type GroupResult =
  | { ok: true; group: PlannedGroup }
  | { ok: false; refusal: StanzaOrganizeRefusal };

/** Connect group members that share a recording, then report who matches the canonical. */
function sameSourceAsCanonical(members: StanzaSong[], canonicalId: string): Set<string> {
  const index = new Map(members.map((m, i) => [m.id, i]));
  const parent = members.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      if (sharesRecordingIdentity(members[i], members[j])) union(i, j);
    }
  }
  const canonicalRoot = find(index.get(canonicalId)!);
  const connected = new Set<string>();
  members.forEach((m, i) => {
    if (find(i) === canonicalRoot) connected.add(m.id);
  });
  return connected;
}

function invalidSelectionReason(
  selection: StanzaOrganizeSelection,
  byId: Map<string, StanzaSong>,
): string | null {
  const unique = new Set(selection.memberIds);
  if (unique.size < 2) return 'A group needs at least two songs.';
  for (const id of unique) {
    if (!byId.has(id)) return 'One of the songs in this group no longer exists.';
  }
  if (!unique.has(selection.canonicalId)) return 'The chosen song to keep is not in this group.';
  if (!unique.has(selection.playFromId)) return 'The chosen source to play is not in this group.';
  return null;
}

/**
 * Apply the "Play from" choice to the survivor's source fields. Never clears the survivor's own
 * `localAudioBlob` (that would drop bytes); when the chosen source is a different upload, its blob
 * moves onto the survivor and its stems are unioned in.
 */
function applyPlayFromSource(
  survivor: StanzaSong,
  canonical: StanzaSong,
  playFrom: StanzaSong,
): StanzaSong {
  if (playFrom.id === canonical.id) return survivor;
  const next: StanzaSong = { ...survivor };
  const kind = stanzaOrganizeSourceKind(playFrom);
  if (kind === 'youtube') {
    next.ytId = playFrom.ytId;
    next.practiceSource = 'youtube';
    next.driveSourceFileId = trimmed(playFrom.driveSourceFileId) ?? next.driveSourceFileId;
  } else if (kind === 'upload') {
    next.ytId = null;
    next.practiceSource = 'local';
    next.driveSourceFileId = playFrom.driveSourceFileId;
    next.localAudioBlob = playFrom.localAudioBlob;
    next.localVideoThumbnailBlob = playFrom.localVideoThumbnailBlob;
    next.localMediaFingerprint =
      playFrom.localMediaFingerprint ?? stanzaLocalMediaFingerprintForRow(playFrom) ?? undefined;
    next.driveMainMediaBytesFingerprint = playFrom.driveMainMediaBytesFingerprint;
  } else if (kind === 'drive') {
    next.ytId = null;
    next.practiceSource = 'local';
    next.driveSourceFileId = playFrom.driveSourceFileId;
  }
  next.stems = mergeStanzaStemTracks(next.stems, playFrom.stems) ?? next.stems;
  return next;
}

/** Id of the member whose main `localAudioBlob` the merged row keeps (or null when none). */
function keptMainBlobOwnerId(canonical: StanzaSong, playFrom: StanzaSong): string | null {
  if (playFrom.id !== canonical.id && stanzaOrganizeSourceKind(playFrom) === 'upload') {
    return playFrom.id;
  }
  return canonical.localAudioBlob ? canonical.id : null;
}

function planGroup(
  selection: StanzaOrganizeSelection,
  byId: Map<string, StanzaSong>,
): GroupResult {
  const invalid = invalidSelectionReason(selection, byId);
  if (invalid) {
    return {
      ok: false,
      refusal: { memberIds: selection.memberIds, canonicalId: selection.canonicalId, reason: invalid },
    };
  }

  const memberIds = [...new Set(selection.memberIds)];
  const members = memberIds.map((id) => byId.get(id)!);
  const canonical = byId.get(selection.canonicalId)!;
  const playFrom = byId.get(selection.playFromId)!;
  const connected = sameSourceAsCanonical(members, canonical.id);

  const sameSourceDonorIds: string[] = [];
  const crossSourceDonorIds: string[] = [];
  for (const m of members) {
    if (m.id === canonical.id) continue;
    if (connected.has(m.id)) sameSourceDonorIds.push(m.id);
    else crossSourceDonorIds.push(m.id);
  }
  const crossSource = crossSourceDonorIds.length > 0;

  // --- Blob-safety gate (ADR 0027 BLOCKER): never drop unique un-backed media. ---
  const mainOwnerId = keptMainBlobOwnerId(canonical, playFrom);
  const stemKeptIds = new Set<string>([canonical.id, ...sameSourceDonorIds, playFrom.id]);
  for (const m of members) {
    // Main blob: lost when it is not the kept blob, is not on Drive, and is not proven-equivalent
    // (same recording) to whichever member's blob the survivor keeps.
    if (hasUnbackedMainBlob(m) && m.id !== mainOwnerId) {
      const owner = mainOwnerId ? byId.get(mainOwnerId) : null;
      const equivalentToKept = owner ? sharesRecordingIdentity(m, owner) : false;
      if (!equivalentToKept) {
        return {
          ok: false,
          refusal: { memberIds, canonicalId: canonical.id, reason: UNBACKED_BLOB_REFUSAL },
        };
      }
    }
    // Stem blobs: kept only for the canonical, same-source donors, and the play-from member.
    if (!stemKeptIds.has(m.id) && hasUnbackedStemBlob(m)) {
      return {
        ok: false,
        refusal: { memberIds, canonicalId: canonical.id, reason: UNBACKED_BLOB_REFUSAL },
      };
    }
  }

  // --- Build the survivor. Same-source donors fold in (safe union); cross-source donors do not. ---
  let survivor: StanzaSong = { ...canonical };
  for (const id of sameSourceDonorIds) {
    survivor = mergeStanzaRicherSongMetadata(survivor, byId.get(id)!);
  }
  survivor = applyPlayFromSource(survivor, canonical, playFrom);
  survivor.id = canonical.id;
  survivor.title = canonical.title;
  survivor.updatedAt = Math.max(...members.map((m) => m.updatedAt));

  return {
    ok: true,
    group: {
      survivor,
      canonicalId: canonical.id,
      playFromId: playFrom.id,
      droppedIds: [...sameSourceDonorIds, ...crossSourceDonorIds],
      sameSourceDonorIds,
      crossSourceDonorIds,
      crossSource,
      members,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Plan the merge of a set of user-selected groups over the current library. Pure: no mutation, no
 * I/O. Returns the survivor rows to write, rows to drop, take remap/drop sets, tombstones for
 * discarded sources (never a still-referenced one), and refusals for unsafe or invalid groups.
 */
export function planStanzaOrganizeMerge(
  rows: readonly StanzaSong[],
  selections: readonly StanzaOrganizeSelection[],
): StanzaOrganizeMergePlan {
  const byId = new Map(rows.map((r) => [r.id, r]));

  const mergedRows: StanzaSong[] = [];
  const droppedRowIds: string[] = [];
  const remappedIds = new Map<string, string>();
  const takeRemapIds = new Map<string, string>();
  const takeDropSongIds: string[] = [];
  const refusals: StanzaOrganizeRefusal[] = [];
  const appliedMemberIds: string[] = [];
  const mergedById = new Map<string, StanzaSong>();

  for (const selection of selections) {
    const result = planGroup(selection, byId);
    if (!result.ok) {
      refusals.push(result.refusal);
      continue;
    }
    const g = result.group;
    mergedRows.push(g.survivor);
    mergedById.set(g.survivor.id, g.survivor);
    for (const id of g.droppedIds) {
      droppedRowIds.push(id);
      remappedIds.set(id, g.canonicalId);
    }
    for (const id of g.sameSourceDonorIds) takeRemapIds.set(id, g.canonicalId);
    takeDropSongIds.push(...g.crossSourceDonorIds);
    for (const m of g.members) appliedMemberIds.push(m.id);
  }

  // --- Tombstones: only for a discarded source no surviving row still references. ---
  const droppedSet = new Set(droppedRowIds);
  const survivingRows: StanzaSong[] = rows
    .filter((r) => !droppedSet.has(r.id))
    .map((r) => mergedById.get(r.id) ?? r);
  const referencedYtIds = new Set<string>();
  const referencedDriveIds = new Set<string>();
  for (const r of survivingRows) {
    const y = trimmed(r.ytId);
    if (y) referencedYtIds.add(y);
    const d = trimmed(r.driveSourceFileId);
    if (d) referencedDriveIds.add(d);
  }

  const youtubeVideoIds = new Set<string>();
  const driveSourceFileIds = new Set<string>();
  const localSongIds = new Set<string>();
  for (const id of new Set(appliedMemberIds)) {
    const member = byId.get(id)!;
    const y = trimmed(member.ytId);
    if (y && !referencedYtIds.has(y)) youtubeVideoIds.add(y);
    const d = trimmed(member.driveSourceFileId);
    if (d && !referencedDriveIds.has(d)) driveSourceFileIds.add(d);
    if (droppedSet.has(id) && !y && !d) localSongIds.add(id);
  }

  return {
    mergedRows,
    droppedRowIds,
    remappedIds,
    takeRemapIds,
    takeDropSongIds,
    tombstones: {
      driveSourceFileIds: [...driveSourceFileIds],
      youtubeVideoIds: [...youtubeVideoIds],
      localSongIds: [...localSongIds],
    },
    refusals,
  };
}

/** Build the review-dialog preview for a single group (pure; safe to call before applying). */
export function previewStanzaOrganizeGroup(
  rows: readonly StanzaSong[],
  selection: StanzaOrganizeSelection,
): StanzaOrganizeGroupPreview {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result = planGroup(selection, byId);
  const canonical = byId.get(selection.canonicalId);
  const playFrom = byId.get(selection.playFromId);
  const playFromKind = playFrom ? stanzaOrganizeSourceKind(playFrom) : 'none';

  if (!result.ok) {
    return {
      canonicalId: selection.canonicalId,
      finalTitle: canonical?.title ?? '',
      crossSource: false,
      playFromId: selection.playFromId,
      playFromKind,
      mergedMarkerCount: canonical?.markers?.length ?? 0,
      discardedSources: [],
      dropsDonorPracticeData: false,
      refusedReason: result.refusal.reason,
    };
  }

  const g = result.group;
  const keptYt = trimmed(g.survivor.ytId);
  const keptDrive = trimmed(g.survivor.driveSourceFileId);
  const discardedSources: string[] = [];
  for (const m of g.members) {
    const y = trimmed(m.ytId);
    const d = trimmed(m.driveSourceFileId);
    const kept = (y && y === keptYt) || (d && d === keptDrive) || m.id === g.playFromId;
    if (!kept && stanzaOrganizeSourceKind(m) !== 'none') {
      discardedSources.push(sourceLabel(stanzaOrganizeSourceKind(m)));
    }
  }

  return {
    canonicalId: g.canonicalId,
    finalTitle: g.survivor.title,
    crossSource: g.crossSource,
    playFromId: g.playFromId,
    playFromKind,
    mergedMarkerCount: g.survivor.markers?.length ?? 0,
    discardedSources: [...new Set(discardedSources)],
    dropsDonorPracticeData: g.crossSource,
    refusedReason: null,
  };
}
