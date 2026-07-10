import { describe, expect, it } from 'vitest';
import { appendSpotifyBackingLink, appendSpotifyReferenceLink } from './songMediaLinks';
import {
  applyPracticeResourceDragEnd,
  canDropPracticeResource,
  moveMediaLinkToSection,
  reorderBackingLinks,
  reorderReferenceLinks,
} from './practiceResourceOrder';
import type { EncoreSong } from '../types';

function minimalSong(overrides: Partial<EncoreSong> = {}): EncoreSong {
  return {
    id: 's1',
    title: 'T',
    artist: 'A',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('practiceResourceOrder', () => {
  it('reorderReferenceLinks moves item before target', () => {
    let s = appendSpotifyReferenceLink(minimalSong(), 'a');
    s = appendSpotifyReferenceLink(s, 'b');
    s = appendSpotifyReferenceLink(s, 'c');
    const ids = () => (s.referenceLinks ?? []).map((l) => l.spotifyTrackId);
    expect(ids()).toEqual(['a', 'b', 'c']);
    const lastId = s.referenceLinks!.find((l) => l.spotifyTrackId === 'c')!.id;
    const firstId = s.referenceLinks!.find((l) => l.spotifyTrackId === 'a')!.id;
    s = reorderReferenceLinks(s, lastId, firstId);
    expect(ids()).toEqual(['c', 'a', 'b']);
  });

  it('reorderBackingLinks preserves primary flags', () => {
    let s = appendSpotifyBackingLink(minimalSong(), 'x');
    s = appendSpotifyBackingLink(s, 'y');
    const yId = s.backingLinks!.find((l) => l.spotifyTrackId === 'y')!.id;
    const xId = s.backingLinks!.find((l) => l.spotifyTrackId === 'x')!.id;
    s = reorderBackingLinks(s, yId, xId);
    expect(s.backingLinks?.map((l) => l.spotifyTrackId)).toEqual(['y', 'x']);
    expect(s.backingLinks?.find((l) => l.spotifyTrackId === 'x')?.isPrimaryBacking).toBe(true);
  });

  it('moveMediaLinkToSection moves reference link to backing', () => {
    let s = appendSpotifyReferenceLink(minimalSong({ spotifyTrackId: 'cat' }), 'moveme');
    const linkId = s.referenceLinks!.find((l) => l.spotifyTrackId === 'moveme')!.id;
    s = moveMediaLinkToSection(s, linkId, 'play');
    expect(s.referenceLinks?.some((l) => l.spotifyTrackId === 'moveme')).toBe(false);
    expect(s.backingLinks?.some((l) => l.spotifyTrackId === 'moveme')).toBe(true);
    expect(s.backingLinks?.find((l) => l.spotifyTrackId === 'moveme')?.isPrimaryBacking).toBe(true);
  });

  it('moveMediaLinkToSection moves backing link to references', () => {
    let s = appendSpotifyBackingLink(minimalSong({ spotifyTrackId: 'cat' }), 'moveme');
    const linkId = s.backingLinks!.find((l) => l.spotifyTrackId === 'moveme')!.id;
    s = moveMediaLinkToSection(s, linkId, 'listen');
    expect(s.backingLinks?.some((l) => l.spotifyTrackId === 'moveme')).toBe(false);
    expect(s.referenceLinks?.some((l) => l.spotifyTrackId === 'moveme')).toBe(true);
  });

  it('moveMediaLinkToSection same-section section drop keeps the link', () => {
    let s = appendSpotifyReferenceLink(minimalSong(), 'a');
    s = appendSpotifyReferenceLink(s, 'b');
    const aId = s.referenceLinks!.find((l) => l.spotifyTrackId === 'a')!.id;
    s = moveMediaLinkToSection(s, aId, 'listen', null);
    expect(s.referenceLinks?.map((l) => l.spotifyTrackId)).toEqual(['b', 'a']);
  });

  it('applyPracticeResourceDragEnd same-section section drop reorders to end', () => {
    let s = appendSpotifyReferenceLink(minimalSong(), 'a');
    s = appendSpotifyReferenceLink(s, 'b');
    const aId = s.referenceLinks!.find((l) => l.spotifyTrackId === 'a')!.id;
    s = applyPracticeResourceDragEnd(s, {
      active: { id: `link:${aId}` },
      over: { id: 'section:listen' },
    } as Parameters<typeof applyPracticeResourceDragEnd>[1]);
    expect(s.referenceLinks?.map((l) => l.spotifyTrackId)).toEqual(['b', 'a']);
  });

  it('canDropPracticeResource rejects cross-type targets', () => {
    let s = appendSpotifyReferenceLink(minimalSong(), 'a');
    const linkId = s.referenceLinks![0]!.id;
    s = {
      ...s,
      attachments: [{ kind: 'chart', driveFileId: 'chart1' }],
    };
    expect(canDropPracticeResource(s, `link:${linkId}`, 'section:listen')).toBe(true);
    expect(canDropPracticeResource(s, `link:${linkId}`, 'section:misc')).toBe(true);
    expect(canDropPracticeResource(s, `link:${linkId}`, 'section:charts')).toBe(false);
    expect(canDropPracticeResource(s, `link:${linkId}`, 'section:takes')).toBe(false);
    expect(canDropPracticeResource(s, `link:${linkId}`, 'att:chart:chart1')).toBe(false);
    expect(canDropPracticeResource(s, 'att:chart:chart1', `link:${linkId}`)).toBe(false);
    expect(canDropPracticeResource(s, 'att:chart:chart1', 'section:takes')).toBe(true);
    expect(canDropPracticeResource(s, 'att:chart:chart1', 'section:play')).toBe(true);
    expect(canDropPracticeResource(s, 'att:chart:chart1', 'section:misc')).toBe(true);
    expect(canDropPracticeResource(s, 'att:chart:chart1', 'section:charts')).toBe(true);
  });

  it('canDropPracticeResource allows drive link to Takes', () => {
    const s = minimalSong({
      referenceLinks: [
        {
          id: 'drive-link',
          source: 'drive',
          driveFileId: 'file1',
          label: 'Take',
        },
      ],
    });
    expect(canDropPracticeResource(s, 'link:drive-link', 'section:takes')).toBe(true);
    expect(canDropPracticeResource(s, 'link:drive-link', 'section:misc')).toBe(true);
  });

  it('moveMediaLinkToTakes converts drive link to recording attachment', () => {
    const s = minimalSong({
      referenceLinks: [
        {
          id: 'drive-link',
          source: 'drive',
          driveFileId: 'file1',
          label: 'Take',
        },
      ],
    });
    const next = applyPracticeResourceDragEnd(s, {
      active: { id: 'link:drive-link' },
      over: { id: 'section:takes' },
    } as Parameters<typeof applyPracticeResourceDragEnd>[1]);
    expect(next.referenceLinks).toHaveLength(0);
    expect(next.attachments?.some((a) => a.kind === 'recording' && a.driveFileId === 'file1')).toBe(true);
  });

  it('moveMediaLinkToMisc converts spotify link to misc resource', () => {
    let s = appendSpotifyReferenceLink(minimalSong(), 'spotify1');
    const linkId = s.referenceLinks![0]!.id;
    s = applyPracticeResourceDragEnd(s, {
      active: { id: `link:${linkId}` },
      over: { id: 'section:misc' },
    } as Parameters<typeof applyPracticeResourceDragEnd>[1]);
    expect(s.referenceLinks).toHaveLength(0);
    expect(s.miscResources).toHaveLength(1);
    expect(s.miscResources?.[0]?.url).toContain('spotify.com/track/spotify1');
  });

  it('reorderMiscResources moves item before target', () => {
    const s = minimalSong({
      miscResources: [
        { id: 'a', kind: 'link', label: 'A', url: 'https://a', createdAt: '' },
        { id: 'b', kind: 'link', label: 'B', url: 'https://b', createdAt: '' },
      ],
    });
    const next = applyPracticeResourceDragEnd(s, {
      active: { id: 'misc:b' },
      over: { id: 'misc:a' },
    } as Parameters<typeof applyPracticeResourceDragEnd>[1]);
    expect(next.miscResources?.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('moveAttachmentToPlay moves chart attachment to backing links', () => {
    const s = minimalSong({
      attachments: [{ kind: 'chart', driveFileId: 'chart-audio', label: 'Backing.mp3' }],
    });
    const next = applyPracticeResourceDragEnd(s, {
      active: { id: 'att:chart:chart-audio' },
      over: { id: 'section:play' },
    } as Parameters<typeof applyPracticeResourceDragEnd>[1]);
    expect(next.attachments?.some((a) => a.driveFileId === 'chart-audio')).toBe(false);
    expect(next.backingLinks?.some((l) => l.driveFileId === 'chart-audio')).toBe(true);
  });
});
