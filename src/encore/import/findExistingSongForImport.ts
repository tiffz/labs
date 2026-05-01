import type { EncoreSong } from '../types';
import { normalizeTitleForImportMatch } from './importTitleNormalize';
import { libraryTitleMatchHeads } from './libraryTitleMatchHeads';
import { diceCoefficient, encoreSongFromImportRow, normalizeForMatch, type PlaylistImportRow } from './matchPlaylists';
import {
  countCrossSectionLinksForImportMerge,
  appendIncomingBackingMediaLinks,
  appendIncomingMediaLinks,
  collectSpotifyTrackIdsFromSong,
  collectYoutubeVideoIdsFromSong,
  stripBackingLinksMatchingIncomingMedia,
  stripReferenceLinksMatchingIncomingMedia,
} from '../repertoire/songMediaLinks';

/** Auto-merge when best fuzzy score is at least this (playlist import only). */
export const IMPORT_MATCH_AUTO_MIN = 0.76;
/** Below auto threshold but above this → suggest merge in UI (Practice playlist pull). */
export const IMPORT_MATCH_SUGGEST_MIN = 0.68;

const FUZZY_THRESHOLD = IMPORT_MATCH_AUTO_MIN;

function firstArtistSegment(artist: string): string {
  return artist
    .split(/\s*(?:,|&|\/|\b(?:feat\.|ft\.|featuring)\b)\s*/i)[0]
    ?.trim()
    .toLowerCase() ?? artist.trim().toLowerCase();
}

/** Tokens for overlap checks (after normalizeForMatch). */
function artistTokens(artist: string): string[] {
  return normalizeForMatch(artist)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Jaccard on token sets — helps "SIX, Abby Mueller" vs "Abby Mueller" and cast-lineup variants. */
function artistTokenJaccard(a: string, b: string): number {
  const ta = artistTokens(a);
  const tb = artistTokens(b);
  const A = new Set(ta);
  const B = new Set(tb);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) {
    if (B.has(t)) inter += 1;
  }
  const union = A.size + B.size - inter;
  return union > 0 ? inter / union : 0;
}

/** Stronger artist similarity than dice alone: first billed name, token overlap, substring on normalized strings. */
/** Max Sorensen–Dice between title strings, comparing soundtrack-style heads (e.g. `Let It Go` vs full store title). */
function titleDiceAcrossHeads(titleA: string, titleB: string): number {
  let m = diceCoefficient(titleA, titleB);
  for (const ha of libraryTitleMatchHeads(titleA)) {
    for (const hb of libraryTitleMatchHeads(titleB)) {
      m = Math.max(m, diceCoefficient(ha, hb));
    }
  }
  return m;
}

function artistMatchStrength(iArtist: string, eArtist: string): number {
  const a = iArtist.trim();
  const b = eArtist.trim();
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dArtist = diceCoefficient(a, b);
  const dFirst = diceCoefficient(firstArtistSegment(a), firstArtistSegment(b));
  const j = artistTokenJaccard(a, b);
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  let contain = 0;
  if (na && nb) {
    if (na === nb) contain = 1;
    else if (na.includes(nb) || nb.includes(na)) contain = 0.88;
  }
  return Math.max(dArtist, dFirst, j, contain);
}

/** Avoid treating very short / single-token titles as unique enough for title-only auto-merge. */
function titleLongEnoughForRelaxedArtist(nTitle: string): boolean {
  const compact = nTitle.replace(/\s+/g, '');
  if (compact.length >= 10) return true;
  const words = nTitle.split(/\s+/).filter(Boolean).length;
  return words >= 2;
}

/**
 * Fuzzy similarity for one pairing of (library title, library artist) vs (incoming title, incoming artist).
 * Does not consider Spotify/YouTube ids — see {@link scoreSongSimilarityForImport}.
 */
function scoreFuzzyTitleArtistSimilarity(
  existingTitleRaw: string,
  existingArtist: string,
  incomingTitleRaw: string,
  incomingArtist: string,
): number {
  const iTitleRaw = incomingTitleRaw.trim();
  const eTitleRaw = existingTitleRaw.trim();
  const iTitle = normalizeTitleForImportMatch(iTitleRaw);
  const eTitle = normalizeTitleForImportMatch(eTitleRaw);
  const iArtist = incomingArtist.trim();
  const eArtist = existingArtist.trim();
  if (!iTitle || !eTitle) return 0;

  const labelIncoming = `${iArtist} ${iTitle}`;
  const labelExisting = `${eArtist} ${eTitle}`;
  const nI = normalizeForMatch(labelIncoming);
  const nE = normalizeForMatch(labelExisting);
  if (nI.length > 4 && nE.length > 4 && nI === nE) return 1;

  const nTitleI = normalizeForMatch(iTitle);
  const nTitleE = normalizeForMatch(eTitle);
  const headNormsE = libraryTitleMatchHeads(eTitleRaw).map((h) => normalizeForMatch(normalizeTitleForImportMatch(h)));
  const headNormsI = libraryTitleMatchHeads(iTitleRaw).map((h) => normalizeForMatch(normalizeTitleForImportMatch(h)));
  const titlesNormalizedEqual =
    nTitleI.length >= 3 &&
    (nTitleI === nTitleE || headNormsE.includes(nTitleI) || headNormsI.includes(nTitleE));
  const longTitle = titleLongEnoughForRelaxedArtist(nTitleI);

  const dPrimary = diceCoefficient(labelIncoming, labelExisting);
  const dSwapped = diceCoefficient(`${iTitle} ${iArtist}`, `${eTitle} ${eArtist}`);
  const dTitle = titleDiceAcrossHeads(iTitle, eTitle);
  const artRel = artistMatchStrength(iArtist, eArtist);

  // Favor title when artist strings differ by convention (comma order, "feat.", cast lists).
  const titleArtistBlend = 0.5 * dTitle + 0.5 * artRel;
  const titleArtistBlendTight = 0.62 * dTitle + 0.38 * artRel;

  let composite = Math.max(dPrimary, dSwapped, titleArtistBlend, titleArtistBlendTight);

  const missingArtistSide = !iArtist || !eArtist;

  // Exact normalized title + long enough title: allow weaker artist match (still needs a small signal when both artists exist).
  if (titlesNormalizedEqual && longTitle) {
    const minArt = missingArtistSide ? 0.55 : 0.12;
    if (artRel >= minArt) {
      composite = Math.max(composite, 0.72 + 0.28 * Math.max(artRel, missingArtistSide ? 0.95 : 0.35));
    }
  }

  // Near-identical titles (typo / punctuation): lean harder on title, soften artist requirement.
  if (dTitle >= 0.96 && longTitle) {
    composite = Math.max(composite, 0.66 * dTitle + 0.34 * Math.max(artRel, missingArtistSide ? 0.6 : 0.22));
  }

  // Alternate recording: strong title match (live / cast vs solo) but weak artist string.
  if (dTitle >= 0.82 && longTitle && composite < FUZZY_THRESHOLD && artRel >= 0.06) {
    composite = Math.max(composite, 0.7 + 0.14 * Math.min(1, artRel / 0.3));
  }

  return composite;
}

/**
 * How well `existing` matches `incoming` for playlist import (title, artist, optional Spotify ids).
 * Exposed for unit tests.
 */
export function scoreSongSimilarityForImport(existing: EncoreSong, incoming: EncoreSong): number {
  for (const spIn of collectSpotifyTrackIdsFromSong(incoming)) {
    const exIds = collectSpotifyTrackIdsFromSong(existing);
    if (exIds.includes(spIn)) {
      return 1;
    }
  }
  for (const ytIn of collectYoutubeVideoIdsFromSong(incoming)) {
    const exYts = collectYoutubeVideoIdsFromSong(existing);
    if (exYts.includes(ytIn)) {
      return 1;
    }
  }
  const incomingTitleRaw = incoming.title;
  const incomingArtist = incoming.artist;
  const direct = scoreFuzzyTitleArtistSimilarity(
    existing.title,
    existing.artist,
    incomingTitleRaw,
    incomingArtist,
  );
  // Karaoke / odd imports sometimes store the catalog line in Title and the real song name in Artist.
  // Spotify always sends canonical (title, artist); also score with library fields role-swapped.
  if (existing.title.trim() && existing.artist.trim()) {
    const roleSwapped = scoreFuzzyTitleArtistSimilarity(
      existing.artist,
      existing.title,
      incomingTitleRaw,
      incomingArtist,
    );
    return Math.max(direct, roleSwapped);
  }
  return direct;
}

/**
 * Whether this import row will merge into an existing library song on import (manual link, or auto-match
 * when not ignored). Matches playlist import apply: manual link wins; else auto if not ignored.
 */
export function importRowHasLibraryMerge(
  row: PlaylistImportRow,
  existing: EncoreSong[],
  placement: 'reference' | 'backing' = 'reference',
): boolean {
  if (row.linkedLibrarySongId) return true;
  const incoming = encoreSongFromImportRow(row, placement);
  if (!incoming) return false;
  if (row.ignoreAutoMatch) return false;
  return findExistingSongForImport(existing, incoming) != null;
}

/** Best library match for an import stub, with similarity score in [0, 1]. */
export function bestImportMatch(
  existing: EncoreSong[],
  incoming: EncoreSong,
): { song: EncoreSong | null; score: number } {
  for (const spIn of collectSpotifyTrackIdsFromSong(incoming)) {
    const bySpotify = existing.find((s) => collectSpotifyTrackIdsFromSong(s).includes(spIn));
    if (bySpotify) return { song: bySpotify, score: 1 };
  }

  for (const ytIn of collectYoutubeVideoIdsFromSong(incoming)) {
    const byYoutube = existing.find((s) => collectYoutubeVideoIdsFromSong(s).includes(ytIn));
    if (byYoutube) return { song: byYoutube, score: 1 };
  }

  let best: EncoreSong | null = null;
  let bestScore = 0;
  for (const e of existing) {
    const score = scoreSongSimilarityForImport(e, incoming);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return { song: best, score: bestScore };
}

/** Sum link moves across review rows (for cross-section import confirmation). */
export function totalCrossSectionLinksForPlaylistImport(
  rows: PlaylistImportRow[],
  existingSongs: EncoreSong[],
  placement: 'reference' | 'backing',
): { fromReference: number; fromBacking: number } {
  const snap = [...existingSongs];
  let fromReference = 0;
  let fromBacking = 0;
  for (const r of rows) {
    if (r.skipRow) continue;
    const song = encoreSongFromImportRow(r, placement);
    if (!song) continue;
    const manual =
      r.linkedLibrarySongId != null
        ? (snap.find((s) => s.id === r.linkedLibrarySongId) ?? existingSongs.find((s) => s.id === r.linkedLibrarySongId) ?? null)
        : null;
    const auto =
      manual == null && !r.ignoreAutoMatch ? findExistingSongForImport(snap, song) : null;
    const match = manual ?? auto;
    if (!match) continue;
    if (placement === 'backing') {
      fromReference += countCrossSectionLinksForImportMerge(match, song, 'backing');
    } else {
      fromBacking += countCrossSectionLinksForImportMerge(match, song, 'reference');
    }
  }
  return { fromReference, fromBacking };
}

/** How many media links on the merge target would move out of the opposite section for this row (0 if no merge). */
export function crossSectionMovesForPlaylistRow(
  row: PlaylistImportRow,
  existingSongs: EncoreSong[],
  placement: 'reference' | 'backing',
): number {
  if (row.skipRow) return 0;
  const song = encoreSongFromImportRow(row, placement);
  if (!song) return 0;
  const manual =
    row.linkedLibrarySongId != null
      ? (existingSongs.find((s) => s.id === row.linkedLibrarySongId) ?? null)
      : null;
  const auto =
    manual == null && !row.ignoreAutoMatch ? findExistingSongForImport(existingSongs, song) : null;
  const match = manual ?? auto;
  if (!match) return 0;
  if (placement === 'backing') {
    return countCrossSectionLinksForImportMerge(match, song, 'backing');
  }
  return countCrossSectionLinksForImportMerge(match, song, 'reference');
}

export function findExistingSongForImport(existing: EncoreSong[], incoming: EncoreSong): EncoreSong | null {
  const { song, score } = bestImportMatch(existing, incoming);
  return score >= FUZZY_THRESHOLD ? song : null;
}

/** Merge playlist-import fields into an existing song; preserves journal, attachments, and user performance fields unless empty strategy says otherwise. */
export function mergeSongWithImport(
  existing: EncoreSong,
  incoming: EncoreSong,
  opts?: { placement?: 'reference' | 'backing' },
): EncoreSong {
  const now = new Date().toISOString();
  const placement = opts?.placement ?? 'reference';
  const base: EncoreSong = {
    ...existing,
    attachments: existing.attachments,
    recordingDriveFileIds: existing.recordingDriveFileIds,
    updatedAt: now,
  };
  const stripped =
    placement === 'backing'
      ? stripReferenceLinksMatchingIncomingMedia(base, incoming)
      : stripBackingLinksMatchingIncomingMedia(base, incoming);
  if (placement === 'backing') {
    return appendIncomingBackingMediaLinks(stripped, incoming);
  }
  return appendIncomingMediaLinks(stripped, incoming);
}
