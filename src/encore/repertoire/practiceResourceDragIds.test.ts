import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import {
  eligibleSectionsForPracticeResourceDrag,
  parsePracticeResourceDragId,
  practiceResourceMiscDragId,
  practiceResourceSectionDragId,
  sectionAcceptsPracticeResourceDrag,
} from './practiceResourceDragIds';

function minimalSong(overrides: Partial<EncoreSong> = {}): EncoreSong {
  return {
    id: 's1',
    title: 'T',
    artist: 'A',
    journalMarkdown: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('practiceResourceDragIds drop eligibility', () => {
  it('spotify links may target Listen, Play, and Misc', () => {
    const song = minimalSong({
      referenceLinks: [
        {
          id: 'l1',
          source: 'spotify',
          spotifyTrackId: 'abc',
          label: 'Track',
        },
      ],
    });
    const active = { kind: 'link' as const, linkId: 'l1' };
    expect(eligibleSectionsForPracticeResourceDrag(active, song)).toEqual(
      new Set(['listen', 'play', 'misc']),
    );
    expect(sectionAcceptsPracticeResourceDrag('listen', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('misc', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('charts', active, song)).toBe(false);
    expect(sectionAcceptsPracticeResourceDrag('takes', active, song)).toBe(false);
  });

  it('drive links may also target Takes', () => {
    const song = minimalSong({
      referenceLinks: [
        {
          id: 'l1',
          source: 'drive',
          driveFileId: 'drive1',
          label: 'Recording',
        },
      ],
    });
    const active = { kind: 'link' as const, linkId: 'l1' };
    expect(eligibleSectionsForPracticeResourceDrag(active, song)).toEqual(
      new Set(['listen', 'play', 'misc', 'takes']),
    );
    expect(sectionAcceptsPracticeResourceDrag('takes', active, song)).toBe(true);
  });

  it('chart attachments may target Charts, Takes, Play, and Misc', () => {
    const song = minimalSong();
    const active = { kind: 'attachment' as const, attachmentKind: 'chart' as const, driveFileId: 'd1' };
    expect(eligibleSectionsForPracticeResourceDrag(active, song)).toEqual(
      new Set(['charts', 'takes', 'play', 'misc']),
    );
    expect(sectionAcceptsPracticeResourceDrag('charts', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('takes', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('play', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('misc', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('listen', active, song)).toBe(false);
  });

  it('recording attachments may target Takes and Misc', () => {
    const song = minimalSong();
    const active = { kind: 'attachment' as const, attachmentKind: 'recording' as const, driveFileId: 'd1' };
    expect(eligibleSectionsForPracticeResourceDrag(active, song)).toEqual(new Set(['takes', 'misc']));
    expect(sectionAcceptsPracticeResourceDrag('takes', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('play', active, song)).toBe(false);
  });

  it('misc chips may only target Misc', () => {
    const song = minimalSong({ miscResources: [{ id: 'm1', kind: 'link', label: 'Doc', url: 'https://x', createdAt: '' }] });
    const active = { kind: 'misc' as const, resourceId: 'm1' };
    expect(eligibleSectionsForPracticeResourceDrag(active, song)).toEqual(new Set(['misc']));
    expect(sectionAcceptsPracticeResourceDrag('misc', active, song)).toBe(true);
    expect(sectionAcceptsPracticeResourceDrag('listen', active, song)).toBe(false);
  });

  it('parses section and misc drag ids', () => {
    expect(parsePracticeResourceDragId(practiceResourceSectionDragId('misc'))).toEqual({
      kind: 'section',
      section: 'misc',
    });
    expect(parsePracticeResourceDragId(practiceResourceMiscDragId('m1'))).toEqual({
      kind: 'misc',
      resourceId: 'm1',
    });
  });
});
