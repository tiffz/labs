import type { EncoreSong } from '../types';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';
import { libraryTitleMatchHeads } from './libraryTitleMatchHeads';
import { diceCoefficient, encoreSongFromImportRow, normalizeForMatch, type PlaylistImportRow } from './matchPlaylists';

function normalizedSpotifyTrackId(id?: string): string | null {
  const t = id?.trim();
  return t ? t : null;
}

function normalizedYoutubeVideoId(raw?: string): string | null {
  if (!raw?.trim()) return null;
  return parseYoutubeVideoId(raw);
}

/** Auto-merge when best fuzzy score is at least this (playlist import only). */
const FUZZY_THRESHOLD = 0.76;

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
 * How well `existing` matches `incoming` for playlist import (title, artist, optional Spotify ids).
 * Exposed for unit tests.
 */
export function scoreSongSimilarityForImport(existing: EncoreSong, incoming: EncoreSong): number {
  const spIn = normalizedSpotifyTrackId(incoming.spotifyTrackId);
  const spEx = normalizedSpotifyTrackId(existing.spotifyTrackId);
  if (spIn && spEx && spIn === spEx) {
    return 1;
  }
  const ytIn = normalizedYoutubeVideoId(incoming.youtubeVideoId);
  const ytEx = normalizedYoutubeVideoId(existing.youtubeVideoId);
  if (ytIn && ytEx && ytIn === ytEx) {
    return 1;
  }
  const iTitle = incoming.title.trim();
  const iArtist = incoming.artist.trim();
  const eTitle = existing.title.trim();
  const eArtist = existing.artist.trim();
  if (!iTitle || !eTitle) return 0;

  const labelIncoming = `${iArtist} ${iTitle}`;
  const labelExisting = `${eArtist} ${eTitle}`;
  const nI = normalizeForMatch(labelIncoming);
  const nE = normalizeForMatch(labelExisting);
  if (nI.length > 4 && nE.length > 4 && nI === nE) return 1;

  const nTitleI = normalizeForMatch(iTitle);
  const nTitleE = normalizeForMatch(eTitle);
  const headNormsE = libraryTitleMatchHeads(eTitle).map((h) => normalizeForMatch(h));
  const headNormsI = libraryTitleMatchHeads(iTitle).map((h) => normalizeForMatch(h));
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

  return composite;
}

/**
 * Whether this import row will merge into an existing library song on import (manual link, or auto-match
 * when not ignored). Matches playlist import apply: manual link wins; else auto if not ignored.
 */
export function importRowHasLibraryMerge(row: PlaylistImportRow, existing: EncoreSong[]): boolean {
  if (row.linkedLibrarySongId) return true;
  const incoming = encoreSongFromImportRow(row);
  if (!incoming) return false;
  if (row.ignoreAutoMatch) return false;
  return findExistingSongForImport(existing, incoming) != null;
}

/** Find a library song that should receive this import row instead of creating a duplicate. */
export function findExistingSongForImport(existing: EncoreSong[], incoming: EncoreSong): EncoreSong | null {
  const spIn = normalizedSpotifyTrackId(incoming.spotifyTrackId);
  if (spIn) {
    const bySpotify = existing.find((s) => normalizedSpotifyTrackId(s.spotifyTrackId) === spIn);
    if (bySpotify) return bySpotify;
  }

  const ytIn = normalizedYoutubeVideoId(incoming.youtubeVideoId);
  if (ytIn) {
    const byYoutube = existing.find((s) => normalizedYoutubeVideoId(s.youtubeVideoId) === ytIn);
    if (byYoutube) return byYoutube;
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
  return bestScore >= FUZZY_THRESHOLD ? best : null;
}

function mergeSpotifyGenreLists(a?: string[], b?: string[]): string[] | undefined {
  const out = new Set<string>();
  for (const x of a ?? []) {
    const t = x.trim();
    if (t) out.add(t);
  }
  for (const x of b ?? []) {
    const t = x.trim();
    if (t) out.add(t);
  }
  if (out.size === 0) return undefined;
  return [...out].sort((p, q) => p.localeCompare(q));
}

/** Merge playlist-import fields into an existing song; preserves journal, attachments, and user performance fields unless empty strategy says otherwise. */
export function mergeSongWithImport(existing: EncoreSong, incoming: EncoreSong): EncoreSong {
  const now = new Date().toISOString();
  return {
    ...existing,
    title: incoming.title.trim() || existing.title,
    artist: incoming.artist.trim() || existing.artist,
    spotifyTrackId: incoming.spotifyTrackId ?? existing.spotifyTrackId,
    youtubeVideoId: incoming.youtubeVideoId ?? existing.youtubeVideoId,
    albumArtUrl: incoming.albumArtUrl ?? existing.albumArtUrl,
    spotifyGenres: mergeSpotifyGenreLists(existing.spotifyGenres, incoming.spotifyGenres),
    attachments: existing.attachments,
    recordingDriveFileIds: existing.recordingDriveFileIds,
    updatedAt: now,
  };
}
