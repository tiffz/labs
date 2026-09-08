import { describe, expect, it } from 'vitest';

import type { StanzaSong } from '../db/stanzaDb';
import {
  detectStanzaDuplicateGroups,
  stanzaNormalizeSongTitle,
  type StanzaDuplicateGroup,
} from './stanzaDuplicateHeuristics';

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

/** `size:duration.dd` fingerprint understood by `stanzaFingerprintDurationSec`. */
function fp(sizeBytes: number, durationSec: number): string {
  return `${sizeBytes}:${durationSec.toFixed(2)}`;
}

function groupWithIds(groups: StanzaDuplicateGroup[], ids: string[]): StanzaDuplicateGroup | undefined {
  const target = [...ids].sort().join(',');
  return groups.find((g) => [...g.memberIds].sort().join(',') === target);
}

describe('stanzaNormalizeSongTitle', () => {
  it('trims, lowercases, and collapses whitespace', () => {
    expect(stanzaNormalizeSongTitle('  My   Song  ')).toBe('my song');
  });

  it('strips punctuation (to spaces, never joining tokens)', () => {
    expect(stanzaNormalizeSongTitle('A-B!')).toBe('a b');
    expect(stanzaNormalizeSongTitle('Song, The (Remix?)')).toBe('song the remix');
  });

  it('strips a trailing "(1)" duplicate suffix', () => {
    expect(stanzaNormalizeSongTitle('My Song (1)')).toBe('my song');
    expect(stanzaNormalizeSongTitle('My Song (12)')).toBe('my song');
  });

  it('strips " copy" and " copy N" suffixes', () => {
    expect(stanzaNormalizeSongTitle('My Song copy')).toBe('my song');
    expect(stanzaNormalizeSongTitle('My Song copy 2')).toBe('my song');
  });

  it('strips stacked duplicate suffixes', () => {
    expect(stanzaNormalizeSongTitle('My Song copy (1)')).toBe('my song');
  });

  it('does not strip "copy" that is part of a real word', () => {
    expect(stanzaNormalizeSongTitle('Copyright')).toBe('copyright');
    expect(stanzaNormalizeSongTitle('Photocopy machine')).toBe('photocopy machine');
  });

  it('returns empty string for nullish or blank titles', () => {
    expect(stanzaNormalizeSongTitle(null)).toBe('');
    expect(stanzaNormalizeSongTitle('   ')).toBe('');
  });
});

describe('detectStanzaDuplicateGroups — empty / singleton', () => {
  it('returns [] for an empty library', () => {
    expect(detectStanzaDuplicateGroups([])).toEqual([]);
  });

  it('returns [] for a single song', () => {
    expect(detectStanzaDuplicateGroups([song({ id: 'a', ytId: 'x' })])).toEqual([]);
  });

  it('returns [] when nothing matches', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'x', title: 'Alpha' }),
      song({ id: 'b', ytId: 'y', title: 'Beta' }),
      song({ id: 'c', driveSourceFileId: 'd1', title: 'Gamma' }),
    ]);
    expect(groups).toEqual([]);
  });
});

describe('detectStanzaDuplicateGroups — Tier 1 exact', () => {
  it('groups rows with identical ytId', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'vid1', title: 'Song' }),
      song({ id: 'b', ytId: 'vid1', title: 'Song but renamed' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(1);
    expect(groups[0].transitive).toBe(true);
    expect([...groups[0].memberIds].sort()).toEqual(['a', 'b']);
    expect(groups[0].reasons.some((r) => r.reason === 'Same YouTube video')).toBe(true);
  });

  it('groups rows with identical driveSourceFileId', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', driveSourceFileId: 'file1', title: 'A' }),
      song({ id: 'b', driveSourceFileId: 'file1', title: 'B' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(1);
    expect(groups[0].reasons.some((r) => r.reason === 'Same Drive file')).toBe(true);
  });

  it('groups rows with identical encoreSongId', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', encoreSongId: 'enc1', title: 'A' }),
      song({ id: 'b', ytId: 'v2', encoreSongId: 'enc1', title: 'B' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(1);
    expect(groups[0].reasons.some((r) => r.reason === 'Linked to the same Encore song')).toBe(true);
  });

  it('groups rows with matching local media fingerprint (reuses tolerant matcher)', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', localMediaFingerprint: fp(1000, 180.0), title: 'A' }),
      // Same size, duration within the ±0.5s tolerance of stanzaLocalMediaFingerprintsMatch.
      song({ id: 'b', localMediaFingerprint: fp(1000, 180.3), title: 'B' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(1);
    expect(groups[0].reasons.some((r) => r.reason === 'Same uploaded file')).toBe(true);
  });

  it('catches a shared driveSourceFileId even when one row also has a ytId (masked key)', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', driveSourceFileId: 'file1', title: 'A' }),
      song({ id: 'b', driveSourceFileId: 'file1', title: 'B' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].reasons.some((r) => r.reason === 'Same Drive file')).toBe(true);
  });

  it('forms a transitive Tier-1 group across a chain of exact edges (A=B via yt, B=C via drive)', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'vid1', title: 'A' }),
      song({ id: 'b', ytId: 'vid1', driveSourceFileId: 'file1', title: 'B' }),
      song({ id: 'c', driveSourceFileId: 'file1', title: 'C' }),
    ]);
    expect(groups).toHaveLength(1);
    expect([...groups[0].memberIds].sort()).toEqual(['a', 'b', 'c']);
    expect(groups[0].transitive).toBe(true);
  });

  it('does not group two distinct local uploads with different sizes', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', localMediaFingerprint: fp(1000, 180.0), title: 'A' }),
      song({ id: 'b', localMediaFingerprint: fp(2000, 180.0), title: 'B' }),
    ]);
    expect(groups).toEqual([]);
  });

  it('does not group local-only rows that have no shared source identity', () => {
    // Both fall back to `local:<id>` content keys — unique per row.
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', title: 'Distinct One' }),
      song({ id: 'b', title: 'Distinct Two' }),
    ]);
    expect(groups).toEqual([]);
  });
});

describe('detectStanzaDuplicateGroups — suggested canonical (display only)', () => {
  it('picks the newest updatedAt as canonical', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', updatedAt: 100 }),
      song({ id: 'b', ytId: 'v1', updatedAt: 200 }),
    ]);
    expect(groups[0].suggestedCanonicalId).toBe('b');
  });

  it('tie-breaks equal updatedAt by smaller id', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'b', ytId: 'v1', updatedAt: 100 }),
      song({ id: 'a', ytId: 'v1', updatedAt: 100 }),
    ]);
    expect(groups[0].suggestedCanonicalId).toBe('a');
  });
});

describe('detectStanzaDuplicateGroups — Tier 2 same title + duration', () => {
  it('groups same normalized title with duration within ±2s', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'My Song', localMediaFingerprint: fp(10, 200.0) }),
      song({ id: 'b', ytId: 'v2', title: 'my song', localMediaFingerprint: fp(20, 202.0) }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(2);
    expect(groups[0].transitive).toBe(false);
    expect(groups[0].reasons.some((r) => r.reason === 'Same title, same length')).toBe(true);
  });

  it('duration boundary: exactly 2s apart matches', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Song', localMediaFingerprint: fp(10, 100.0) }),
      song({ id: 'b', ytId: 'v2', title: 'Song', localMediaFingerprint: fp(20, 102.0) }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(2);
  });

  it('duration boundary: 3s apart does not match', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Song', localMediaFingerprint: fp(10, 100.0) }),
      song({ id: 'b', ytId: 'v2', title: 'Song', localMediaFingerprint: fp(20, 103.0) }),
    ]);
    expect(groups).toEqual([]);
  });

  it('does NOT group same title when neither side has a parseable duration (M3 dropped)', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Same Title' }),
      song({ id: 'b', ytId: 'v2', title: 'Same Title' }),
    ]);
    expect(groups).toEqual([]);
  });

  it('does not group different titles even with identical duration', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Alpha', localMediaFingerprint: fp(10, 100.0) }),
      song({ id: 'b', ytId: 'v2', title: 'Beta', localMediaFingerprint: fp(20, 100.0) }),
    ]);
    expect(groups).toEqual([]);
  });
});

describe('detectStanzaDuplicateGroups — Tier 2 same title + marker structure', () => {
  it('groups same title with matching marker count and times (±1s)', () => {
    const groups = detectStanzaDuplicateGroups([
      song({
        id: 'a',
        ytId: 'v1',
        title: 'Song',
        markers: [
          { time: 10, label: 'Verse' },
          { time: 40, label: 'Chorus' },
        ],
      }),
      song({
        id: 'b',
        ytId: 'v2',
        title: 'Song',
        markers: [
          { time: 10.5, label: 'V' },
          { time: 39.2, label: 'C' },
        ],
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(2);
    expect(groups[0].reasons.some((r) => r.reason === 'Same title, same section structure')).toBe(true);
  });

  it('does not match when marker counts differ', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Song', markers: [{ time: 10, label: 'V' }] }),
      song({
        id: 'b',
        ytId: 'v2',
        title: 'Song',
        markers: [
          { time: 10, label: 'V' },
          { time: 40, label: 'C' },
        ],
      }),
    ]);
    expect(groups).toEqual([]);
  });

  it('does not match when a marker time is more than ±1s off', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Song', markers: [{ time: 10, label: 'V' }] }),
      song({ id: 'b', ytId: 'v2', title: 'Song', markers: [{ time: 12, label: 'V' }] }),
    ]);
    expect(groups).toEqual([]);
  });

  it('empty marker sets are not treated as a structural match', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Song', markers: [] }),
      song({ id: 'b', ytId: 'v2', title: 'Song', markers: [] }),
    ]);
    expect(groups).toEqual([]);
  });
});

describe('detectStanzaDuplicateGroups — Tier 2 is NON-transitive (the blocker guardrail)', () => {
  it('A~B and B~C via Tier-2 do NOT collapse A and C', () => {
    // Three different videos, same title, chained durations: A↔B within 2s, B↔C within 2s,
    // but A↔C is 4s apart. A transitive merge would wrongly unite all three.
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Song', localMediaFingerprint: fp(1, 100.0) }),
      song({ id: 'b', ytId: 'v2', title: 'Song', localMediaFingerprint: fp(2, 102.0) }),
      song({ id: 'c', ytId: 'v3', title: 'Song', localMediaFingerprint: fp(3, 104.0) }),
    ]);
    // Expect two pairwise groups (A,B) and (B,C) — never a 3-member group, never (A,C).
    expect(groups.every((g) => g.tier === 2 && g.memberIds.length === 2)).toBe(true);
    expect(groupWithIds(groups, ['a', 'b'])).toBeDefined();
    expect(groupWithIds(groups, ['b', 'c'])).toBeDefined();
    expect(groupWithIds(groups, ['a', 'c'])).toBeUndefined();
    expect(groups.some((g) => g.memberIds.length >= 3)).toBe(false);
  });
});

describe('detectStanzaDuplicateGroups — tier precedence + mixed libraries', () => {
  it('does not re-emit a Tier-2 pair for members already unified by Tier 1', () => {
    // Same ytId (Tier 1) AND same title + duration (would-be Tier 2). Only the Tier-1 group stands.
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'v1', title: 'Song', localMediaFingerprint: fp(1, 100.0) }),
      song({ id: 'b', ytId: 'v1', title: 'Song', localMediaFingerprint: fp(2, 100.5) }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(1);
  });

  it('reports independent Tier-1 and Tier-2 groups in one pass', () => {
    const groups = detectStanzaDuplicateGroups([
      song({ id: 'a', ytId: 'shared', title: 'Exact One' }),
      song({ id: 'b', ytId: 'shared', title: 'Exact Two' }),
      song({ id: 'c', ytId: 'vc', title: 'Fuzzy', localMediaFingerprint: fp(10, 210.0) }),
      song({ id: 'd', ytId: 'vd', title: 'Fuzzy', localMediaFingerprint: fp(20, 211.0) }),
    ]);
    const exact = groupWithIds(groups, ['a', 'b']);
    const fuzzy = groupWithIds(groups, ['c', 'd']);
    expect(exact?.tier).toBe(1);
    expect(fuzzy?.tier).toBe(2);
    expect(groups).toHaveLength(2);
  });

  it('does not mutate the input rows', () => {
    const rows = [
      song({ id: 'a', ytId: 'v1', title: 'Song', markers: [{ time: 5, label: 'X' }] }),
      song({ id: 'b', ytId: 'v1', title: 'Song', markers: [{ time: 5, label: 'X' }] }),
    ];
    const snapshot = JSON.stringify(rows);
    detectStanzaDuplicateGroups(rows);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });
});
