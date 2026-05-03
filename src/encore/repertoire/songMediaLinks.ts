import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import type { EncoreMediaLink, EncoreSong } from '../types';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

function normSpotify(id?: string): string | null {
  const t = id?.trim();
  return t || null;
}

function normYoutube(raw?: string): string | null {
  if (!raw?.trim()) return null;
  return parseYoutubeVideoId(raw);
}

function normDrive(id?: string): string | null {
  const t = id?.trim();
  return t || null;
}

/**
 * Spotify track id used as the catalog / metadata data source: legacy {@link EncoreSong.spotifyTrackId},
 * or when that is unset, the primary (or first) Spotify **reference** link so “refresh from Spotify”
 * still works for reference-only songs.
 */
export function spotifyDataSourceTrackId(s: EncoreSong): string | undefined {
  const legacy = normSpotify(s.spotifyTrackId);
  if (legacy) return legacy;
  const withL = ensureSongHasDerivedMediaLinks(s);
  const refs = withL.referenceLinks ?? [];
  const marked = refs.find((r) => r.isPrimaryReference);
  const primary = marked ?? refs[0];
  if (primary?.source === 'spotify') {
    const id = normSpotify(primary.spotifyTrackId);
    if (id) return id;
  }
  const anySp = refs.find((r) => r.source === 'spotify');
  return normSpotify(anySp?.spotifyTrackId) ?? undefined;
}

/** Every Spotify track id associated with the song (data source + reference + backing links). */
export function collectSpotifyTrackIdsFromSong(s: EncoreSong): string[] {
  const ids = new Set<string>();
  const add = (x?: string) => {
    const t = normSpotify(x);
    if (t) ids.add(t);
  };
  add(s.spotifyTrackId);
  for (const l of s.referenceLinks ?? []) {
    if (l.source === 'spotify') add(l.spotifyTrackId);
  }
  for (const l of s.backingLinks ?? []) {
    if (l.source === 'spotify') add(l.spotifyTrackId);
  }
  return [...ids];
}

/** Every YouTube video id associated with the song. */
export function collectYoutubeVideoIdsFromSong(s: EncoreSong): string[] {
  const ids = new Set<string>();
  const add = (raw?: string) => {
    const t = normYoutube(raw);
    if (t) ids.add(t);
  };
  add(s.youtubeVideoId);
  for (const l of s.referenceLinks ?? []) {
    if (l.source === 'youtube') add(l.youtubeVideoId);
  }
  for (const l of s.backingLinks ?? []) {
    if (l.source === 'youtube') add(l.youtubeVideoId);
  }
  return [...ids];
}

/**
 * If the song only has legacy `spotifyTrackId` / `youtubeVideoId` and no `referenceLinks` yet,
 * materialize reference rows.
 */
export function ensureSongHasDerivedMediaLinks(s: EncoreSong): EncoreSong {
  if ((s.referenceLinks?.length ?? 0) > 0) {
    return s;
  }
  const backing = s.backingLinks ?? [];
  const refs: EncoreMediaLink[] = [];
  const sp = normSpotify(s.spotifyTrackId);
  if (sp && !backing.some((b) => b.source === 'spotify' && normSpotify(b.spotifyTrackId) === sp)) {
    refs.push({
      id: crypto.randomUUID(),
      source: 'spotify',
      spotifyTrackId: sp,
      isPrimaryReference: !normYoutube(s.youtubeVideoId),
    });
  }
  const yt = normYoutube(s.youtubeVideoId);
  if (yt && !backing.some((b) => b.source === 'youtube' && normYoutube(b.youtubeVideoId) === yt)) {
    refs.push({
      id: crypto.randomUUID(),
      source: 'youtube',
      youtubeVideoId: s.youtubeVideoId?.trim(),
      youtubeKind: 'reference',
      isPrimaryReference: !sp,
    });
  }
  if (refs.length === 0) return s;
  return { ...s, referenceLinks: refs };
}

/**
 * Ensures the Spotify **data source** id appears in reference links (not necessarily primary).
 * If no primary reference exists afterward, assigns one (prefers a non-mirror row when possible).
 */
export function ensureSpotifyDataSourceMirroredInReferences(s: EncoreSong): EncoreSong {
  const sid = normSpotify(s.spotifyTrackId);
  if (!sid) return s;
  const backing = s.backingLinks ?? [];
  if (backing.some((b) => b.source === 'spotify' && normSpotify(b.spotifyTrackId) === sid)) {
    return s;
  }
  const refs = [...(s.referenceLinks ?? [])];
  if (refs.some((r) => r.source === 'spotify' && normSpotify(r.spotifyTrackId) === sid)) {
    return s;
  }
  refs.push({
    id: crypto.randomUUID(),
    source: 'spotify',
    spotifyTrackId: sid,
    isPrimaryReference: false,
  });
  const next: EncoreSong = { ...s, referenceLinks: refs };
  if (!refs.some((r) => r.isPrimaryReference)) {
    const nonMirror = refs.findIndex(
      (r) => !(r.source === 'spotify' && normSpotify(r.spotifyTrackId) === sid),
    );
    const pick = nonMirror >= 0 ? nonMirror : 0;
    next.referenceLinks = refs.map((r, i) =>
      i === pick ? { ...r, isPrimaryReference: true } : { ...r, isPrimaryReference: false },
    );
  }
  return next;
}

/** Primary **reference** recording (Spotify or YouTube). */
export function primaryReferenceLink(
  s: EncoreSong,
): EncoreMediaLink | undefined {
  const withL = ensureSongHasDerivedMediaLinks(s);
  const refs = withL.referenceLinks ?? [];
  const marked = refs.find((r) => r.isPrimaryReference);
  return marked;
}

/** Default reference listen when a primary isn’t marked (first row). */
export function effectivePrimaryReferenceLink(s: EncoreSong): EncoreMediaLink | undefined {
  const withL = ensureSongHasDerivedMediaLinks(s);
  const refs = withL.referenceLinks ?? [];
  return refs.find((r) => r.isPrimaryReference) ?? refs[0];
}

/** Primary backing link, or first backing row. */
export function effectivePrimaryBackingLink(s: EncoreSong): EncoreMediaLink | undefined {
  const withL = ensureSongHasDerivedMediaLinks(s);
  const backing = withL.backingLinks ?? [];
  return backing.find((l) => l.isPrimaryBacking) ?? backing[0];
}

function linkMatchesIncomingMediaIds(link: EncoreMediaLink, incoming: EncoreSong): boolean {
  if (link.source === 'spotify') {
    const id = normSpotify(link.spotifyTrackId);
    return id != null && collectSpotifyTrackIdsFromSong(incoming).includes(id);
  }
  if (link.source === 'youtube') {
    const id = normYoutube(link.youtubeVideoId);
    return id != null && collectYoutubeVideoIdsFromSong(incoming).includes(id);
  }
  return false;
}

/** Strips reference rows whose Spotify/YouTube ids match incoming import media (for backing imports). */
export function stripReferenceLinksMatchingIncomingMedia(
  s: EncoreSong,
  incoming: EncoreSong,
): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(s);
  const refs = (base.referenceLinks ?? []).filter((l) => !linkMatchesIncomingMediaIds(l, incoming));
  const incomingYts = new Set(collectYoutubeVideoIdsFromSong(incoming));
  const legacyYt = normYoutube(base.youtubeVideoId);
  const clearLegacyYoutube = legacyYt != null && incomingYts.has(legacyYt);
  const next: EncoreSong = {
    ...base,
    referenceLinks: refs,
    ...(clearLegacyYoutube ? { youtubeVideoId: undefined } : {}),
  };
  if (refs.length > 0 && !refs.some((r) => r.isPrimaryReference)) {
    return { ...next, referenceLinks: refs.map((r, i) => ({ ...r, isPrimaryReference: i === 0 })) };
  }
  return next;
}

/** Strips backing rows whose Spotify/YouTube ids match incoming import media (for reference imports). */
export function stripBackingLinksMatchingIncomingMedia(s: EncoreSong, incoming: EncoreSong): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(s);
  const backing = (base.backingLinks ?? []).filter((l) => !linkMatchesIncomingMediaIds(l, incoming));
  const next: EncoreSong = { ...base, backingLinks: backing };
  if (backing.length > 0 && !backing.some((l) => l.isPrimaryBacking)) {
    return { ...next, backingLinks: backing.map((l, i) => ({ ...l, isPrimaryBacking: i === 0 })) };
  }
  return next;
}

/**
 * How many links would move out of the opposite section if this import merge runs
 * (same Spotify/YouTube id cannot stay in both reference and backing).
 * Counts reference {@link EncoreSong.referenceLinks} rows, and legacy {@link EncoreSong.youtubeVideoId}
 * when it matches the import but was never copied into `referenceLinks`.
 */
export function countCrossSectionLinksForImportMerge(
  existing: EncoreSong,
  incoming: EncoreSong,
  placement: 'reference' | 'backing',
): number {
  const base = ensureSongHasDerivedMediaLinks(existing);
  if (placement === 'backing') {
    const refMatches = (base.referenceLinks ?? []).filter((l) => linkMatchesIncomingMediaIds(l, incoming))
      .length;
    const incomingYts = collectYoutubeVideoIdsFromSong(incoming);
    const legacyYt = normYoutube(base.youtubeVideoId);
    const refHasMatchingYoutube =
      legacyYt != null &&
      (base.referenceLinks ?? []).some(
        (l) => l.source === 'youtube' && normYoutube(l.youtubeVideoId) === legacyYt,
      );
    const legacyYoutubeAloneMatchesIncoming =
      legacyYt != null && incomingYts.includes(legacyYt) && !refHasMatchingYoutube;
    return refMatches + (legacyYoutubeAloneMatchesIncoming ? 1 : 0);
  }
  return (base.backingLinks ?? []).filter((l) => linkMatchesIncomingMediaIds(l, incoming)).length;
}

function rawYoutubeInputForNormId(incoming: EncoreSong, vidNorm: string): string {
  const leg = normYoutube(incoming.youtubeVideoId);
  if (leg === vidNorm && incoming.youtubeVideoId?.trim()) {
    return incoming.youtubeVideoId.trim();
  }
  for (const l of [...(incoming.referenceLinks ?? []), ...(incoming.backingLinks ?? [])]) {
    if (l.source !== 'youtube') continue;
    if (normYoutube(l.youtubeVideoId) === vidNorm && l.youtubeVideoId?.trim()) {
      return l.youtubeVideoId.trim();
    }
  }
  return `https://www.youtube.com/watch?v=${vidNorm}`;
}

/** Open URL for Spotify, YouTube, or Drive media link. */
export function mediaLinkOpenUrl(link: EncoreMediaLink): string | undefined {
  if (link.source === 'spotify' && link.spotifyTrackId?.trim()) {
    return `https://open.spotify.com/track/${encodeURIComponent(link.spotifyTrackId.trim())}`;
  }
  if (link.source === 'youtube' && link.youtubeVideoId?.trim()) {
    const id = parseYoutubeVideoId(link.youtubeVideoId) ?? link.youtubeVideoId.trim();
    return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  }
  if (link.source === 'drive' && link.driveFileId?.trim()) {
    return driveFileWebUrl(link.driveFileId.trim());
  }
  return undefined;
}

/**
 * Keeps legacy `youtubeVideoId` aligned with the primary reference YouTube link.
 * `spotifyTrackId` is the explicit data source and is not derived from reference links.
 */
export function syncSongLegacyMediaIds(s: EncoreSong): EncoreSong {
  let withL = ensureSongHasDerivedMediaLinks(s);
  withL = ensureSpotifyDataSourceMirroredInReferences(withL);
  const sp = normSpotify(withL.spotifyTrackId) ?? undefined;
  const ytMark = withL.referenceLinks?.find((r) => r.source === 'youtube' && r.isPrimaryReference);
  const ytFirst = withL.referenceLinks?.find((r) => r.source === 'youtube');
  const ytRaw = ytMark?.youtubeVideoId ?? ytFirst?.youtubeVideoId;
  const yt =
    normYoutube(ytRaw) ? ytRaw?.trim() : normYoutube(withL.youtubeVideoId) ? withL.youtubeVideoId?.trim() : undefined;

  return {
    ...withL,
    spotifyTrackId: sp,
    youtubeVideoId: yt || undefined,
  };
}

/** Merge import `incoming` media onto `existing`, appending alternate Spotify/YouTube as extra reference links. */
export function appendIncomingMediaLinks(existing: EncoreSong, incoming: EncoreSong): EncoreSong {
  const existingHasDataSpotify = normSpotify(existing.spotifyTrackId);

  const base = ensureSongHasDerivedMediaLinks({
    ...existing,
    spotifyTrackId: existingHasDataSpotify ? existing.spotifyTrackId : incoming.spotifyTrackId ?? existing.spotifyTrackId,
    title: incoming.title.trim() || existing.title,
    artist: incoming.artist.trim() || existing.artist,
    albumArtUrl: incoming.albumArtUrl ?? existing.albumArtUrl,
  });
  const referenceLinks = [...(base.referenceLinks ?? [])];
  const knownSp = new Set(collectSpotifyTrackIdsFromSong(base));
  const knownYt = new Set(collectYoutubeVideoIdsFromSong(base));

  const incSp = normSpotify(incoming.spotifyTrackId);
  if (incSp && !knownSp.has(incSp)) {
    const hasPrimary = referenceLinks.some((r) => r.isPrimaryReference);
    const hasAnySp = referenceLinks.some((r) => r.source === 'spotify');
    referenceLinks.push({
      id: crypto.randomUUID(),
      source: 'spotify',
      spotifyTrackId: incSp,
      isPrimaryReference: !hasPrimary && !hasAnySp,
    });
  }

  const incYt = normYoutube(incoming.youtubeVideoId);
  if (incYt && !knownYt.has(incYt)) {
    const hasPrimaryYt = referenceLinks.some((r) => r.source === 'youtube' && r.isPrimaryReference);
    const hasAnyYt = referenceLinks.some((r) => r.source === 'youtube');
    referenceLinks.push({
      id: crypto.randomUUID(),
      source: 'youtube',
      youtubeVideoId: incoming.youtubeVideoId?.trim(),
      youtubeKind: 'reference',
      isPrimaryReference: !hasPrimaryYt && !hasAnyYt,
    });
  }

  return syncSongLegacyMediaIds({
    ...base,
    referenceLinks,
  });
}

/** Like {@link appendIncomingMediaLinks} but adds Spotify/YouTube to backing links. */
export function appendIncomingBackingMediaLinks(existing: EncoreSong, incoming: EncoreSong): EncoreSong {
  const existingHasDataSpotify = normSpotify(existing.spotifyTrackId);

  const mergedMeta = {
    ...existing,
    spotifyTrackId: existingHasDataSpotify ? existing.spotifyTrackId : incoming.spotifyTrackId ?? existing.spotifyTrackId,
    title: incoming.title.trim() || existing.title,
    artist: incoming.artist.trim() || existing.artist,
    albumArtUrl: incoming.albumArtUrl ?? existing.albumArtUrl,
  };

  const backingLinks = [...(mergedMeta.backingLinks ?? [])];
  const knownSp = new Set(collectSpotifyTrackIdsFromSong({ ...mergedMeta, backingLinks }));
  const knownYt = new Set(collectYoutubeVideoIdsFromSong({ ...mergedMeta, backingLinks }));

  const incSps = [...new Set(collectSpotifyTrackIdsFromSong(incoming))];
  for (const incSp of incSps) {
    if (knownSp.has(incSp)) continue;
    const hasPrimary = backingLinks.some((l) => l.isPrimaryBacking);
    const hasAnySp = backingLinks.some((l) => l.source === 'spotify');
    backingLinks.push({
      id: crypto.randomUUID(),
      source: 'spotify',
      spotifyTrackId: incSp,
      isPrimaryBacking: !hasPrimary && !hasAnySp,
    });
    knownSp.add(incSp);
  }

  const incYts = [...new Set(collectYoutubeVideoIdsFromSong(incoming))];
  for (const incYt of incYts) {
    if (knownYt.has(incYt)) continue;
    const raw = rawYoutubeInputForNormId(incoming, incYt);
    const hasPrimary = backingLinks.some((l) => l.isPrimaryBacking);
    const hasAnyYt = backingLinks.some((l) => l.source === 'youtube');
    backingLinks.push({
      id: crypto.randomUUID(),
      source: 'youtube',
      youtubeVideoId: raw,
      youtubeKind: 'karaoke',
      isPrimaryBacking: !hasPrimary && !hasAnyYt,
    });
    knownYt.add(incYt);
  }

  return syncSongLegacyMediaIds({
    ...mergedMeta,
    backingLinks,
  });
}

/** Set Spotify data source + optional metadata (new song picker / “this is my catalog track”). */
export function applySpotifyDataSourcePick(
  d: EncoreSong,
  spotifyTrackId: string,
  meta?: { title: string; artist: string; albumArtUrl?: string },
): EncoreSong {
  const id = spotifyTrackId.trim();
  if (!id) return syncSongLegacyMediaIds(ensureSongHasDerivedMediaLinks(d));
  let next: EncoreSong = {
    ...d,
    spotifyTrackId: id,
    ...(meta
      ? {
          title: meta.title,
          artist: meta.artist,
          albumArtUrl: meta.albumArtUrl ?? d.albumArtUrl,
          updatedAt: new Date().toISOString(),
        }
      : {}),
  };
  next = ensureSongHasDerivedMediaLinks(next);
  next = ensureSpotifyDataSourceMirroredInReferences(next);
  return syncSongLegacyMediaIds(next);
}

function spotifyTrackWebLabel(track: SpotifySearchTrack): string {
  const artists = track.artists?.map((a) => a.name).join(', ') ?? '';
  return `${track.name?.trim() || 'Untitled'} — ${artists}`.trim();
}

/**
 * Applies Spotify Web API track metadata: title, artist, artwork, legacy `spotifyTrackId` when missing,
 * and updates {@link EncoreMediaLink.label} on reference rows whose id matches the track.
 */
export function mergeSpotifyTrackWebMetadata(song: EncoreSong, track: SpotifySearchTrack): EncoreSong {
  const tid = normSpotify(track.id);
  const catalogLabel = spotifyTrackWebLabel(track);
  const title = track.name?.trim() || song.title.trim() || 'Untitled';
  const artist =
    track.artists
      ?.map((a) => a.name)
      .join(', ')
      .trim() ||
    song.artist.trim() ||
    'Unknown artist';
  const albumArtUrl = track.album?.images?.[0]?.url ?? song.albumArtUrl;
  const legacySp = normSpotify(song.spotifyTrackId);
  const nextSpotifyTrackId = legacySp ?? tid ?? song.spotifyTrackId;
  const refs = [...(song.referenceLinks ?? [])].map((l) => {
    if (l.source !== 'spotify') return l;
    const lid = normSpotify(l.spotifyTrackId);
    if (!tid || lid !== tid) return l;
    return { ...l, label: catalogLabel };
  });
  return syncSongLegacyMediaIds(
    ensureSongHasDerivedMediaLinks({
      ...song,
      spotifyTrackId: nextSpotifyTrackId,
      title,
      artist,
      albumArtUrl,
      referenceLinks: refs,
      updatedAt: new Date().toISOString(),
    }),
  );
}

/** Add another Spotify **reference** (does not change the data source). */
export function appendSpotifyReferenceLink(
  d: EncoreSong,
  spotifyTrackId: string,
  opts?: { asPrimaryReference?: boolean; label?: string },
): EncoreSong {
  const id = spotifyTrackId.trim();
  const base = ensureSongHasDerivedMediaLinks(d);
  const refs = [...(base.referenceLinks ?? [])];
  if (refs.some((r) => r.source === 'spotify' && normSpotify(r.spotifyTrackId) === id)) {
    return syncSongLegacyMediaIds(base);
  }
  const asPrimary = opts?.asPrimaryReference ?? false;
  const nextRefs = asPrimary ? refs.map((r) => ({ ...r, isPrimaryReference: false })) : [...refs];
  const willBePrimary = asPrimary || !nextRefs.some((r) => r.isPrimaryReference);
  const label = opts?.label?.trim();
  nextRefs.push({
    id: crypto.randomUUID(),
    source: 'spotify',
    spotifyTrackId: id,
    ...(label ? { label } : {}),
    isPrimaryReference: willBePrimary,
  });
  return syncSongLegacyMediaIds({ ...base, referenceLinks: nextRefs });
}

export function appendSpotifyBackingLink(
  d: EncoreSong,
  spotifyTrackId: string,
  opts?: { label?: string },
): EncoreSong {
  const id = spotifyTrackId.trim();
  const base = ensureSongHasDerivedMediaLinks(d);
  const backing = [...(base.backingLinks ?? [])];
  if (backing.some((l) => l.source === 'spotify' && l.spotifyTrackId?.trim() === id)) {
    return syncSongLegacyMediaIds(base);
  }
  const hasPb = backing.some((l) => l.isPrimaryBacking);
  const label = opts?.label?.trim();
  backing.push({
    id: crypto.randomUUID(),
    source: 'spotify',
    spotifyTrackId: id,
    ...(label ? { label } : {}),
    isPrimaryBacking: !hasPb && backing.length === 0,
  });
  return syncSongLegacyMediaIds({ ...base, backingLinks: backing });
}

export function removeMediaLinkById(d: EncoreSong, linkId: string): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(d);
  const refs = (base.referenceLinks ?? []).filter((l) => l.id !== linkId);
  const backing = (base.backingLinks ?? []).filter((l) => l.id !== linkId);
  let next: EncoreSong = { ...base, referenceLinks: refs, backingLinks: backing };
  next = ensureSpotifyDataSourceMirroredInReferences(next);
  const hasRefYt = (next.referenceLinks ?? []).some((l) => l.source === 'youtube');
  return syncSongLegacyMediaIds({
    ...next,
    ...(hasRefYt ? {} : { youtubeVideoId: undefined }),
  });
}

export function setPrimaryReferenceLinkId(d: EncoreSong, linkId: string): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(d);
  const refs = (base.referenceLinks ?? []).map((r) => ({
    ...r,
    isPrimaryReference: r.id === linkId,
  }));
  return syncSongLegacyMediaIds({ ...base, referenceLinks: refs });
}

export function setPrimaryBackingLinkId(d: EncoreSong, linkId: string): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(d);
  const backing = (base.backingLinks ?? []).map((l) => ({
    ...l,
    isPrimaryBacking: l.id === linkId,
  }));
  return syncSongLegacyMediaIds({ ...base, backingLinks: backing });
}

export function appendYoutubeReferenceLink(d: EncoreSong, rawInput: string): EncoreSong | null {
  const parsed = parseYoutubeVideoId(rawInput);
  if (!parsed) return null;
  const base = ensureSongHasDerivedMediaLinks(d);
  const refs = [...(base.referenceLinks ?? [])];
  if (
    refs.some((l) => l.source === 'youtube' && parseYoutubeVideoId(l.youtubeVideoId ?? '') === parsed)
  ) {
    return syncSongLegacyMediaIds(base);
  }
  const hasPrimary = refs.some((l) => l.isPrimaryReference);
  refs.push({
    id: crypto.randomUUID(),
    source: 'youtube',
    youtubeVideoId: rawInput.trim(),
    youtubeKind: 'reference',
    isPrimaryReference: !hasPrimary,
  });
  return syncSongLegacyMediaIds({ ...base, referenceLinks: refs });
}

export function appendYoutubeBackingLink(d: EncoreSong, rawInput: string): EncoreSong | null {
  const parsed = parseYoutubeVideoId(rawInput);
  if (!parsed) return null;
  const base = ensureSongHasDerivedMediaLinks(d);
  const backing = [...(base.backingLinks ?? [])];
  if (
    backing.some(
      (l) => l.source === 'youtube' && parseYoutubeVideoId(l.youtubeVideoId ?? '') === parsed,
    )
  ) {
    return syncSongLegacyMediaIds(base);
  }
  const hasPb = backing.some((l) => l.isPrimaryBacking);
  backing.push({
    id: crypto.randomUUID(),
    source: 'youtube',
    youtubeVideoId: rawInput.trim(),
    youtubeKind: 'karaoke',
    isPrimaryBacking: !hasPb && backing.length === 0,
  });
  return syncSongLegacyMediaIds({ ...base, backingLinks: backing });
}

/** Add a Drive-hosted audio/video file to reference links (opens via Drive web URL). */
export function appendDriveReferenceLink(
  d: EncoreSong,
  driveFileId: string,
  opts?: { label?: string; asPrimaryReference?: boolean },
): EncoreSong {
  const fid = normDrive(driveFileId);
  if (!fid) return ensureSongHasDerivedMediaLinks(d);
  const base = ensureSongHasDerivedMediaLinks(d);
  const refs = [...(base.referenceLinks ?? [])];
  if (refs.some((r) => r.source === 'drive' && normDrive(r.driveFileId) === fid)) {
    return syncSongLegacyMediaIds(base);
  }
  const asPrimary = opts?.asPrimaryReference ?? false;
  const nextRefs = asPrimary ? refs.map((r) => ({ ...r, isPrimaryReference: false })) : [...refs];
  const willBePrimary = asPrimary || !nextRefs.some((r) => r.isPrimaryReference);
  const label = opts?.label?.trim();
  nextRefs.push({
    id: crypto.randomUUID(),
    source: 'drive',
    driveFileId: fid,
    ...(label ? { label } : {}),
    isPrimaryReference: willBePrimary,
  });
  return syncSongLegacyMediaIds({ ...base, referenceLinks: nextRefs });
}

export function appendDriveBackingLink(
  d: EncoreSong,
  driveFileId: string,
  opts?: { label?: string },
): EncoreSong {
  const fid = normDrive(driveFileId);
  if (!fid) return ensureSongHasDerivedMediaLinks(d);
  const base = ensureSongHasDerivedMediaLinks(d);
  const backing = [...(base.backingLinks ?? [])];
  if (backing.some((l) => l.source === 'drive' && normDrive(l.driveFileId) === fid)) {
    return syncSongLegacyMediaIds(base);
  }
  const hasPb = backing.some((l) => l.isPrimaryBacking);
  const label = opts?.label?.trim();
  backing.push({
    id: crypto.randomUUID(),
    source: 'drive',
    driveFileId: fid,
    ...(label ? { label } : {}),
    isPrimaryBacking: !hasPb && backing.length === 0,
  });
  return syncSongLegacyMediaIds({ ...base, backingLinks: backing });
}
