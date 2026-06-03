/**
 * stanzaSongDeduplication — collapse `StanzaSong` rows that point at the same source content.
 *
 * Why this exists: before auto-sync (ADR 0006), users who pasted the same YouTube link or
 * imported the same Drive file on two devices ended up with two rows that shared a `ytId` /
 * `driveSourceFileId` but had different `id`s (UUIDs minted independently per device). Because
 * `mergeDriveRowsIntoLocalLibrary` keys by `id`, both copies survive every Drive merge and the
 * library shows obvious-looking duplicates side by side.
 *
 * This module provides a **pure** consolidation function. Side-effects (rewriting Dexie rows,
 * remapping take.songId, updating the persisted last-selected song id) live in
 * `stanzaConsolidateLocalLibrary.ts` so this file stays trivially testable.
 */

import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import { computeStanzaLocalMediaFingerprint } from '../utils/stanzaLocalMediaFingerprint';
import { mergeStanzaRicherSongMetadata } from './stanzaSongMetadataMerge';
import { mergeStanzaStemTracks } from './stanzaStemMerge';

/**
 * Stable identifier for the *content* a song points at. Two rows with the same content key are
 * considered duplicates and will be merged. Local-only uploads match by `localMediaFingerprint`
 * when the same file is imported on another device.
 */
export function stanzaSongContentKey(
  song: Pick<StanzaSong, 'id' | 'ytId' | 'driveSourceFileId' | 'localMediaFingerprint' | 'localAudioBlob' | 'title'>,
): string {
  if (song.ytId) return `yt:${song.ytId}`;
  const drive = song.driveSourceFileId?.trim();
  if (drive) return `drive:${drive}`;
  const fp = song.localMediaFingerprint?.trim();
  if (fp) return `localfp:${fp}`;
  if (song.localAudioBlob) {
    return `localfp:${computeStanzaLocalMediaFingerprint({ sizeBytes: song.localAudioBlob.size, fileName: song.title })}`;
  }
  return `local:${song.id}`;
}

export interface StanzaConsolidationResult {
  /** Deduplicated rows ready to be written back. Order is the input order of the surviving id. */
  rows: StanzaSong[];
  /**
   * Map of dropped `id` → winning `id`. Empty when nothing changed. Callers use it to remap
   * downstream foreign keys (e.g. `stanzaDb.takes.songId`, `stanzaLastSelectedSongId`).
   */
  remappedIds: Map<string, string>;
}

/**
 * Pick the canonical row for a content key. Deterministic so two devices independently arrive
 * at the same winner: newer `updatedAt` first, then lexicographically smaller `id` as the
 * tiebreaker. (The id tiebreaker matters when sync replays cause both rows to land with the
 * same timestamp.)
 */
function pickWinner(a: StanzaSong, b: StanzaSong): StanzaSong {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return a.id < b.id ? a : b;
}

/**
 * Combine two stem arrays without losing per-stem blobs or labels. Stem ids are honored as the
 * primary key; the loser fills in any blob the winner is missing (typical when one device only
 * pulled metadata via Drive sync).
 */
function mergeStems(
  winnerStems: StanzaStemTrack[] | undefined,
  loserStems: StanzaStemTrack[] | undefined,
): StanzaStemTrack[] | undefined {
  return mergeStanzaStemTracks(winnerStems, loserStems);
}

/**
 * Carry forward local-only artefacts (audio blob, thumbnail, stem blobs) from the loser into
 * the winner so we never throw away a downloaded file just because it lived on the wrong row.
 */
function inheritLocalArtefacts(winner: StanzaSong, loser: StanzaSong): StanzaSong {
  const next: StanzaSong = { ...winner };
  if (!next.localAudioBlob && loser.localAudioBlob) next.localAudioBlob = loser.localAudioBlob;
  if (!next.localVideoThumbnailBlob && loser.localVideoThumbnailBlob) {
    next.localVideoThumbnailBlob = loser.localVideoThumbnailBlob;
  }
  const stems = mergeStems(next.stems, loser.stems);
  if (stems && stems.length > 0) next.stems = stems;
  return next;
}

/**
 * Pure consolidation: collapse rows by `stanzaSongContentKey`. Returns the surviving rows
 * (with local-only artefacts inherited from the losers) and a `dropped → kept` id map for
 * downstream remapping.
 *
 * The result is order-stable on input order of each content key's first occurrence so the
 * library grid doesn't visibly shuffle when consolidation runs.
 */
export function consolidateStanzaSongDuplicates(rows: StanzaSong[]): StanzaConsolidationResult {
  const winnerByKey = new Map<string, StanzaSong>();
  const orderByKey = new Map<string, number>();
  const remappedIds = new Map<string, string>();

  rows.forEach((row, index) => {
    const key = stanzaSongContentKey(row);
    const incumbent = winnerByKey.get(key);
    if (!incumbent) {
      winnerByKey.set(key, row);
      orderByKey.set(key, index);
      return;
    }
    const winner = pickWinner(incumbent, row);
    const loser = winner === incumbent ? row : incumbent;
    const merged = mergeStanzaRicherSongMetadata(inheritLocalArtefacts(winner, loser), loser);
    winnerByKey.set(key, merged);
    if (loser.id !== merged.id) {
      remappedIds.set(loser.id, merged.id);
    }
  });

  const out = Array.from(winnerByKey.entries())
    .sort((a, b) => (orderByKey.get(a[0]) ?? 0) - (orderByKey.get(b[0]) ?? 0))
    .map(([, row]) => row);

  return { rows: out, remappedIds };
}
