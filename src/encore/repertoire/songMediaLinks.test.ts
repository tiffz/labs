import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import { mergeSongWithImport } from '../import/findExistingSongForImport';
import {
  appendIncomingMediaLinks,
  appendSpotifyBackingLink,
  appendSpotifyReferenceLink,
  appendYoutubeBackingLink,
  appendYoutubeReferenceLink,
  applySpotifyDataSourcePick,
  collectSpotifyTrackIdsFromSong,
  countCrossSectionLinksForImportMerge,
  ensureSongHasDerivedMediaLinks,
  mediaLinkOpenUrl,
  mergeSpotifyTrackWebMetadata,
  primaryReferenceLink,
  removeMediaLinkById,
  setPrimaryReferenceLinkId,
  spotifyDataSourceTrackId,
  stripReferenceLinksMatchingIncomingMedia,
} from './songMediaLinks';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';

function minimalSong(overrides: Partial<EncoreSong> = {}): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: 's1',
    title: 'T',
    artist: 'A',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('songMediaLinks', () => {
  it('ensureSongHasDerivedMediaLinks materializes legacy ids', () => {
    const s = minimalSong({
      spotifyTrackId: 'abc',
      youtubeVideoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    const e = ensureSongHasDerivedMediaLinks(s);
    expect(e.referenceLinks).toHaveLength(2);
    expect(spotifyDataSourceTrackId(e)).toBe('abc');
  });

  it('spotifyDataSourceTrackId falls back to primary Spotify reference when legacy empty', () => {
    const s = appendSpotifyReferenceLink(minimalSong({ spotifyTrackId: undefined }), 'refonly', {
      label: 'A · B',
    });
    expect(spotifyDataSourceTrackId(s)).toBe('refonly');
  });

  it('mergeSpotifyTrackWebMetadata updates song fields and Spotify reference labels', () => {
    const s = ensureSongHasDerivedMediaLinks(
      minimalSong({
        title: 'Wrong',
        artist: 'Swap',
        spotifyTrackId: 'tid',
        referenceLinks: [
          {
            id: 'l1',
            source: 'spotify',
            spotifyTrackId: 'tid',
            label: 'Old',
            isPrimaryReference: true,
          },
        ],
      }),
    );
    const track: SpotifySearchTrack = {
      id: 'tid',
      name: 'My Immortal',
      artists: [{ name: 'Evanescence' }],
      album: { images: [{ url: 'https://art.example', height: 300 }] },
    };
    const m = mergeSpotifyTrackWebMetadata(s, track);
    expect(m.title).toBe('My Immortal');
    expect(m.artist).toBe('Evanescence');
    expect(m.albumArtUrl).toBe('https://art.example');
    expect(m.referenceLinks?.find((r) => r.spotifyTrackId === 'tid')?.label).toBe(
      'My Immortal · Evanescence',
    );
  });

  it('collectSpotifyTrackIdsFromSong includes backing Spotify links', () => {
    const s = minimalSong({
      spotifyTrackId: 'legacy',
      backingLinks: [{ id: 'l1', source: 'spotify', spotifyTrackId: 'back1' }],
    });
    expect(collectSpotifyTrackIdsFromSong(s).sort()).toEqual(['back1', 'legacy'].sort());
  });

  it('appendSpotifyReferenceLink does not change data source or title', () => {
    const s = ensureSongHasDerivedMediaLinks(
      minimalSong({ title: 'Keep', artist: 'Me', spotifyTrackId: 'main' }),
    );
    const t = appendSpotifyReferenceLink(s, 'newid');
    expect(t.title).toBe('Keep');
    expect(spotifyDataSourceTrackId(t)).toBe('main');
    expect(t.referenceLinks?.some((r) => r.source === 'spotify' && r.spotifyTrackId === 'newid')).toBe(
      true,
    );
  });

  it('applySpotifyDataSourcePick updates metadata', () => {
    const s = ensureSongHasDerivedMediaLinks(minimalSong({ title: 'Old' }));
    const t = applySpotifyDataSourcePick(s, 'tid', {
      title: 'New',
      artist: 'Band',
      albumArtUrl: 'https://art',
    });
    expect(t.title).toBe('New');
    expect(t.artist).toBe('Band');
    expect(t.spotifyTrackId).toBe('tid');
  });

  it('removeMediaLinkById drops row but keeps spotify data source', () => {
    let s = applySpotifyDataSourcePick(minimalSong(), 'only', {
      title: 'T',
      artist: 'A',
    });
    const linkId = s.referenceLinks?.find((r) => r.source === 'spotify')?.id;
    expect(linkId).toBeTruthy();
    s = removeMediaLinkById(s, linkId!);
    expect(s.referenceLinks?.length ?? 0).toBe(1);
    expect(s.spotifyTrackId).toBe('only');
    expect(s.referenceLinks?.[0]?.spotifyTrackId).toBe('only');
  });

  it('setPrimaryReferenceLinkId switches primary reference, not data source', () => {
    let s = applySpotifyDataSourcePick(minimalSong({ referenceLinks: [] }), 'source', {
      title: 'T',
      artist: 'A',
    });
    s = appendSpotifyReferenceLink(s, 'b');
    const idB = s.referenceLinks?.find((r) => r.spotifyTrackId === 'b')?.id;
    s = setPrimaryReferenceLinkId(s, idB!);
    expect(spotifyDataSourceTrackId(s)).toBe('source');
    expect(primaryReferenceLink(s)?.spotifyTrackId).toBe('b');
  });

  it('appendIncomingMediaLinks does not duplicate spotify in backing', () => {
    const existing = appendSpotifyBackingLink(minimalSong({ spotifyTrackId: 'x' }), 'back');
    const incoming = minimalSong({ spotifyTrackId: 'back' });
    const merged = appendIncomingMediaLinks(existing, incoming);
    expect(collectSpotifyTrackIdsFromSong(merged).filter((id) => id === 'back')).toHaveLength(1);
  });

  it('appendYoutubeReferenceLink rejects junk', () => {
    const s = minimalSong();
    expect(appendYoutubeReferenceLink(s, 'not a url')).toBeNull();
  });

  it('appendYoutubeBackingLink adds karaoke default', () => {
    const s = minimalSong();
    const n = appendYoutubeBackingLink(s, 'https://youtu.be/dQw4w9WgXcQ');
    expect(n?.backingLinks?.[0].youtubeKind).toBe('karaoke');
  });

  it('does not materialize legacy Spotify into references when that id is only in backing', () => {
    const s = minimalSong({
      spotifyTrackId: 'same',
      referenceLinks: [],
      backingLinks: [{ id: 'b', source: 'spotify', spotifyTrackId: 'same', isPrimaryBacking: true }],
    });
    const e = ensureSongHasDerivedMediaLinks(s);
    expect(e.referenceLinks?.length ?? 0).toBe(0);
  });

  it('countCrossSectionLinksForImportMerge counts opposite-section matches', () => {
    const existing = appendSpotifyReferenceLink(minimalSong({ spotifyTrackId: 'cat' }), 'refsp');
    const incoming = minimalSong({
      spotifyTrackId: 'refsp',
      backingLinks: [{ id: 'b', source: 'spotify', spotifyTrackId: 'backonly', isPrimaryBacking:true }],
    });
    expect(countCrossSectionLinksForImportMerge(existing, incoming, 'backing')).toBe(1);
    const withBack = appendSpotifyBackingLink(minimalSong({ spotifyTrackId: 'cat' }), 'backsp');
    const incRef = minimalSong({ spotifyTrackId: 'backsp' });
    expect(countCrossSectionLinksForImportMerge(withBack, incRef, 'reference')).toBe(1);
  });

  it('countCrossSectionLinksForImportMerge counts legacy youtubeVideoId when no youtube reference row', () => {
    const vid = 'dQw4w9WgXcQ';
    const existing = minimalSong({
      youtubeVideoId: `https://youtu.be/${vid}`,
      referenceLinks: [
        { id: 'r1', source: 'spotify', spotifyTrackId: 'spot1', isPrimaryReference: true },
      ],
    });
    const incoming = minimalSong({
      backingLinks: [{ id: 'b', source: 'youtube', youtubeVideoId: vid, isPrimaryBacking: true }],
    });
    expect(countCrossSectionLinksForImportMerge(existing, incoming, 'backing')).toBe(1);
  });

  it('countCrossSectionLinksForImportMerge does not double-count legacy youtube when reference row has same id', () => {
    const vid = 'dQw4w9WgXcQ';
    const existing = minimalSong({
      youtubeVideoId: vid,
      referenceLinks: [
        { id: 'r1', source: 'youtube', youtubeVideoId: vid, isPrimaryReference: true },
      ],
    });
    const incoming = minimalSong({
      backingLinks: [{ id: 'b', source: 'youtube', youtubeVideoId: vid, isPrimaryBacking: true }],
    });
    expect(countCrossSectionLinksForImportMerge(existing, incoming, 'backing')).toBe(1);
  });

  it('stripReferenceLinksMatchingIncomingMedia clears legacy youtubeVideoId when incoming matches', () => {
    const vid = 'dQw4w9WgXcQ';
    const existing = minimalSong({
      youtubeVideoId: `https://www.youtube.com/watch?v=${vid}`,
      referenceLinks: [
        { id: 'r1', source: 'spotify', spotifyTrackId: 'spot1', isPrimaryReference: true },
      ],
    });
    const incoming = minimalSong({
      backingLinks: [{ id: 'b', source: 'youtube', youtubeVideoId: vid, isPrimaryBacking: true }],
    });
    const stripped = stripReferenceLinksMatchingIncomingMedia(existing, incoming);
    expect(stripped.youtubeVideoId).toBeUndefined();
    expect(stripped.referenceLinks).toHaveLength(1);
  });

  it('mergeSongWithImport placement backing moves spotify from references to backing', () => {
    const existing = appendSpotifyReferenceLink(minimalSong({ spotifyTrackId: 'cat' }), 'moveme');
    const incoming = minimalSong({
      spotifyTrackId: 'moveme',
      backingLinks: [
        { id: 'nb', source: 'spotify', spotifyTrackId: 'moveme', isPrimaryBacking: true },
      ],
    });
    const merged = mergeSongWithImport(existing, incoming, { placement: 'backing' });
    expect(merged.referenceLinks?.some((r) => r.spotifyTrackId === 'moveme')).toBe(false);
    expect(merged.backingLinks?.some((l) => l.spotifyTrackId === 'moveme')).toBe(true);
  });

  it('mergeSongWithImport placement backing moves legacy reference youtube to backing', () => {
    const vid = 'dQw4w9WgXcQ';
    const existing = minimalSong({
      youtubeVideoId: vid,
      referenceLinks: [
        { id: 'r1', source: 'spotify', spotifyTrackId: 'spot1', isPrimaryReference: true },
      ],
    });
    const incoming = minimalSong({
      backingLinks: [{ id: 'nb', source: 'youtube', youtubeVideoId: vid, isPrimaryBacking: true }],
    });
    const merged = mergeSongWithImport(existing, incoming, { placement: 'backing' });
    expect(merged.youtubeVideoId).toBeUndefined();
    expect(merged.referenceLinks?.some((r) => r.source === 'youtube')).toBe(false);
    expect(merged.backingLinks?.some((l) => l.source === 'youtube' && l.youtubeVideoId?.includes(vid))).toBe(
      true,
    );
    expect(merged.referenceLinks?.some((r) => r.spotifyTrackId === 'spot1')).toBe(true);
  });

  it('mediaLinkOpenUrl supports spotify and youtube', () => {
    expect(
      mediaLinkOpenUrl({ id: '1', source: 'spotify', spotifyTrackId: 'abc' }),
    ).toContain('open.spotify.com');
    expect(
      mediaLinkOpenUrl({ id: '2', source: 'youtube', youtubeVideoId: 'dQw4w9WgXcQ' }),
    ).toContain('youtube.com');
  });

  describe('appendSpotifyReferenceLink label option', () => {
    it('persists a trimmed label on the new link', () => {
      const s = minimalSong();
      const t = appendSpotifyReferenceLink(s, 'newId', { label: '  Demo recording  ' });
      const added = t.referenceLinks?.find((r) => r.spotifyTrackId === 'newId');
      expect(added?.label).toBe('Demo recording');
    });

    it('omits empty/whitespace labels', () => {
      const s = minimalSong();
      const t = appendSpotifyReferenceLink(s, 'newId', { label: '   ' });
      const added = t.referenceLinks?.find((r) => r.spotifyTrackId === 'newId');
      expect(added?.label).toBeUndefined();
    });

    it('asPrimaryReference promotes the new link and demotes others', () => {
      let s = appendSpotifyReferenceLink(minimalSong(), 'first');
      s = appendSpotifyReferenceLink(s, 'second', { asPrimaryReference: true });
      expect(s.referenceLinks?.find((r) => r.spotifyTrackId === 'second')?.isPrimaryReference).toBe(true);
      expect(
        s.referenceLinks?.find((r) => r.spotifyTrackId === 'first')?.isPrimaryReference,
      ).toBe(false);
    });
  });

  describe('appendSpotifyBackingLink label option', () => {
    it('persists a trimmed label on the new backing link', () => {
      const s = minimalSong();
      const t = appendSpotifyBackingLink(s, 'backId', { label: 'Stripped backing' });
      const added = t.backingLinks?.find((l) => l.spotifyTrackId === 'backId');
      expect(added?.label).toBe('Stripped backing');
    });
  });

  describe("mergeSongWithImport placement: 'reference'", () => {
    it('moves spotify from backing into references when reference import collides', () => {
      const existing = appendSpotifyBackingLink(minimalSong({ spotifyTrackId: 'cat' }), 'moveme');
      const incoming = minimalSong({
        spotifyTrackId: 'moveme',
      });
      const merged = mergeSongWithImport(existing, incoming, { placement: 'reference' });
      expect(merged.backingLinks?.some((l) => l.spotifyTrackId === 'moveme')).toBe(false);
      expect(merged.referenceLinks?.some((r) => r.spotifyTrackId === 'moveme')).toBe(true);
    });

    it('appends a youtube reference when none existed before and incoming has only youtube', () => {
      const vid = 'dQw4w9WgXcQ';
      const existing = minimalSong({
        spotifyTrackId: 'spot1',
        referenceLinks: [
          { id: 'r1', source: 'spotify', spotifyTrackId: 'spot1', isPrimaryReference: true },
        ],
      });
      const incoming = minimalSong({ youtubeVideoId: vid });
      const merged = mergeSongWithImport(existing, incoming, { placement: 'reference' });
      expect(
        merged.referenceLinks?.some((r) => r.source === 'youtube' && r.youtubeVideoId?.includes(vid)),
      ).toBe(true);
      expect(merged.youtubeVideoId).toBeTruthy();
    });

    it('preserves existing journal/attachments when merging in reference placement', () => {
      const existing = minimalSong({
        spotifyTrackId: 'spot1',
        journalMarkdown: 'Practice notes',
        attachments: [{ kind: 'chart', driveFileId: 'd1', isPrimaryChart: true }],
      });
      const incoming = minimalSong({ spotifyTrackId: 'spot1', journalMarkdown: 'IGNORE ME' });
      const merged = mergeSongWithImport(existing, incoming, { placement: 'reference' });
      expect(merged.journalMarkdown).toBe('Practice notes');
      expect(merged.attachments).toHaveLength(1);
    });
  });
});
