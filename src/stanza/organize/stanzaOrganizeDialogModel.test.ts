import { describe, expect, it } from 'vitest';

import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaDuplicateGroup } from './stanzaDuplicateHeuristics';
import type { StanzaOrganizeGroupPreview } from './stanzaOrganizeMerge';
import {
  formatStanzaOrganizeDuration,
  initialStanzaOrganizeGroupState,
  stanzaOrganizePreviewLines,
  stanzaOrganizeReasonSummary,
  stanzaOrganizeRichestMemberId,
  stanzaOrganizeSelectionFromState,
  stanzaOrganizeTierLabel,
} from './stanzaOrganizeDialogModel';

function preview(overrides: Partial<StanzaOrganizeGroupPreview>): StanzaOrganizeGroupPreview {
  return {
    canonicalId: 'a',
    finalTitle: 'My Song',
    crossSource: false,
    playFromId: 'a',
    playFromKind: 'youtube',
    mergedMarkerCount: 3,
    discardedSources: [],
    dropsDonorPracticeData: false,
    refusedReason: null,
    ...overrides,
  };
}

function song(overrides: Partial<StanzaSong> & { id: string }): StanzaSong {
  return {
    ytId: null,
    title: 'Untitled',
    markers: [],
    stats: {},
    updatedAt: 0,
    ...overrides,
  } as StanzaSong;
}

function group(overrides: Partial<StanzaDuplicateGroup>): StanzaDuplicateGroup {
  return {
    memberIds: ['a', 'b'],
    tier: 1,
    transitive: true,
    reasons: [],
    suggestedCanonicalId: 'a',
    ...overrides,
  };
}

describe('initialStanzaOrganizeGroupState', () => {
  it('pre-checks Tier-1 groups and defaults canonical + play-from to the suggested winner', () => {
    const state = initialStanzaOrganizeGroupState(group({ tier: 1, suggestedCanonicalId: 'b' }));
    expect(state).toEqual({ checked: true, canonicalId: 'b', playFromId: 'b' });
  });

  it('leaves Tier-2 groups unchecked (opt-in)', () => {
    expect(initialStanzaOrganizeGroupState(group({ tier: 2 })).checked).toBe(false);
  });
});

describe('stanzaOrganizeSelectionFromState', () => {
  it('maps group + ui state to a merge selection', () => {
    const g = group({ memberIds: ['a', 'b', 'c'] });
    const sel = stanzaOrganizeSelectionFromState(g, { checked: true, canonicalId: 'b', playFromId: 'c' });
    expect(sel).toEqual({ memberIds: ['a', 'b', 'c'], canonicalId: 'b', playFromId: 'c' });
  });
});

describe('stanzaOrganizeTierLabel', () => {
  it('labels tiers for the confidence chip', () => {
    expect(stanzaOrganizeTierLabel(1)).toBe('Exact match');
    expect(stanzaOrganizeTierLabel(2)).toBe('Likely duplicate');
  });
});

describe('stanzaOrganizeReasonSummary', () => {
  it('joins de-duplicated reason strings', () => {
    const g = group({
      reasons: [
        { aId: 'a', bId: 'b', tier: 1, reason: 'Same YouTube video' },
        { aId: 'a', bId: 'c', tier: 1, reason: 'Same YouTube video' },
        { aId: 'a', bId: 'c', tier: 1, reason: 'Same Drive file' },
      ],
    });
    expect(stanzaOrganizeReasonSummary(g)).toBe('Same YouTube video · Same Drive file');
  });
});

describe('formatStanzaOrganizeDuration', () => {
  it('formats a fingerprint duration as m:ss', () => {
    expect(formatStanzaOrganizeDuration(song({ id: 'a', localMediaFingerprint: '5000:200.00' }))).toBe('3:20');
    expect(formatStanzaOrganizeDuration(song({ id: 'a', localMediaFingerprint: '5000:65.00' }))).toBe('1:05');
  });

  it('returns null when there is no duration (e.g. YouTube)', () => {
    expect(formatStanzaOrganizeDuration(song({ id: 'a', ytId: 'x' }))).toBeNull();
  });
});

describe('stanzaOrganizePreviewLines', () => {
  it('summarizes a same-source merge', () => {
    expect(stanzaOrganizePreviewLines(preview({ mergedMarkerCount: 3 }))).toEqual([
      'Keeps "My Song". 3 sections.',
    ]);
  });

  it('states discarded sources and the cross-source practice-data warning', () => {
    const lines = stanzaOrganizePreviewLines(
      preview({
        crossSource: true,
        dropsDonorPracticeData: true,
        discardedSources: ['YouTube link'],
        mergedMarkerCount: 1,
      }),
    );
    expect(lines[0]).toBe('Keeps "My Song". 1 section.');
    expect(lines[1]).toBe("Removes the other copy's YouTube link.");
    expect(lines[2]).toBe("The other copy's per-section tempo and practice data won't carry over.");
  });

  it('returns no lines for a refused group', () => {
    expect(stanzaOrganizePreviewLines(preview({ refusedReason: 'nope' }))).toEqual([]);
  });
});

describe('stanzaOrganizeRichestMemberId', () => {
  it('picks the member with the most practice customization', () => {
    const rows = [
      song({ id: 'a', metronomeBySegmentId: { s1: { bpm: 120, anchorMediaTime: 0, source: 'tap' } } }),
      song({ id: 'b' }),
    ];
    expect(stanzaOrganizeRichestMemberId(rows, ['a', 'b'])).toBe('a');
  });

  it('returns null when no member has any customization', () => {
    const rows = [song({ id: 'a' }), song({ id: 'b' })];
    expect(stanzaOrganizeRichestMemberId(rows, ['a', 'b'])).toBeNull();
  });
});
