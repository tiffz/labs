import { describe, expect, it } from 'vitest';

import type {
  StanzaSegmentMetronomeCalibration,
  StanzaSong,
  StanzaStemTrack,
} from '../db/stanzaDb';
import {
  planStanzaOrganizeMerge,
  previewStanzaOrganizeGroup,
  type StanzaOrganizeSelection,
} from './stanzaOrganizeMerge';

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

function cal(bpm = 120): StanzaSegmentMetronomeCalibration {
  return { bpm, anchorMediaTime: 0, source: 'tap' };
}

function blob(bytes = 'audio-bytes', type = 'audio/mpeg'): Blob {
  return new Blob([bytes], { type });
}

function localStem(id: string, opts: { backed?: boolean } = {}): StanzaStemTrack {
  return {
    id,
    label: id,
    localBlob: blob(`stem-${id}`),
    driveFileId: opts.backed ? `drive-${id}` : undefined,
  };
}

function sel(
  memberIds: string[],
  canonicalId: string,
  playFromId = canonicalId,
): StanzaOrganizeSelection {
  return { memberIds, canonicalId, playFromId };
}

describe('planStanzaOrganizeMerge — same-source (safe union)', () => {
  it('collapses two rows with the same ytId and unions segment-keyed data', () => {
    const rows = [
      song({
        id: 'a',
        ytId: 'vid1',
        title: 'Song',
        updatedAt: 200,
        metronomeBySegmentId: { s1: cal() },
        stats: { s1: { totalMs: 10, lastPracticed: 1 } },
      }),
      song({
        id: 'b',
        ytId: 'vid1',
        title: 'Song',
        updatedAt: 100,
        metronomeBySegmentId: { s2: cal(90) },
        stats: { s2: { totalMs: 5, lastPracticed: 2 } },
      }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a')]);

    expect(plan.refusals).toEqual([]);
    expect(plan.mergedRows).toHaveLength(1);
    const merged = plan.mergedRows[0];
    expect(merged.id).toBe('a');
    // Same recording → segment ids align → union keeps both sides.
    expect(Object.keys(merged.metronomeBySegmentId ?? {}).sort()).toEqual(['s1', 's2']);
    expect(Object.keys(merged.stats ?? {}).sort()).toEqual(['s1', 's2']);
    expect(plan.droppedRowIds).toEqual(['b']);
    expect(plan.takeRemapIds.get('b')).toBe('a');
    expect(plan.takeDropSongIds).toEqual([]);
    // Source is kept → no tombstones.
    expect(plan.tombstones.youtubeVideoIds).toEqual([]);
  });

  it('folds a transitive same-source chain (A=yt, B=yt+drive, C=drive) into one survivor', () => {
    const rows = [
      song({ id: 'a', ytId: 'X', title: 'Song', updatedAt: 300 }),
      song({ id: 'b', ytId: 'X', driveSourceFileId: 'D', title: 'Song', updatedAt: 200 }),
      song({ id: 'c', driveSourceFileId: 'D', title: 'Song', updatedAt: 100 }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b', 'c'], 'a')]);

    expect(plan.refusals).toEqual([]);
    expect(plan.droppedRowIds.sort()).toEqual(['b', 'c']);
    // All same recording → no practice data dropped, both donors remap takes.
    expect(plan.takeDropSongIds).toEqual([]);
    expect([...plan.takeRemapIds.keys()].sort()).toEqual(['b', 'c']);
    // Source ids stay referenced by the survivor → nothing tombstoned.
    expect(plan.tombstones.driveSourceFileIds).toEqual([]);
    expect(plan.tombstones.youtubeVideoIds).toEqual([]);
  });

  it('sets updatedAt to the max across members', () => {
    const rows = [
      song({ id: 'a', ytId: 'v', updatedAt: 50 }),
      song({ id: 'b', ytId: 'v', updatedAt: 999 }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a')]);
    expect(plan.mergedRows[0].updatedAt).toBe(999);
  });
});

describe('planStanzaOrganizeMerge — cross-source segment integrity (ADR 0027)', () => {
  it('keeps only the survivor segment-keyed data and drops donor takes', () => {
    const rows = [
      song({
        id: 'a',
        ytId: 'vidA',
        title: 'Song',
        updatedAt: 200,
        markers: [{ id: 'm1', time: 10, label: 'Verse' }],
        metronomeBySegmentId: { segA: cal() },
        drumPatternBySegmentId: { segA: 'DKT' },
        stats: { segA: { totalMs: 10, lastPracticed: 1 } },
      }),
      song({
        id: 'b',
        ytId: 'vidB',
        title: 'Song',
        updatedAt: 100,
        markers: [{ id: 'm2', time: 22, label: 'Chorus' }],
        metronomeBySegmentId: { segB: cal(90) },
        drumPatternBySegmentId: { segB: 'TKT' },
        stats: { segB: { totalMs: 5, lastPracticed: 2 } },
      }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'a')]);

    expect(plan.refusals).toEqual([]);
    const merged = plan.mergedRows[0];
    // Different recordings → survivor keeps ONLY its own segment-keyed maps; no donor keys grafted.
    expect(Object.keys(merged.metronomeBySegmentId ?? {})).toEqual(['segA']);
    expect(Object.keys(merged.drumPatternBySegmentId ?? {})).toEqual(['segA']);
    expect(Object.keys(merged.stats ?? {})).toEqual(['segA']);
    expect(merged.markers.map((m) => m.id)).toEqual(['m1']);
    // Donor takes are deleted (their segment ids can't exist on the survivor).
    expect(plan.takeDropSongIds).toEqual(['b']);
    expect(plan.takeRemapIds.size).toBe(0);
    // Discarded YouTube source is tombstoned.
    expect(plan.tombstones.youtubeVideoIds).toEqual(['vidB']);
    expect(previewStanzaOrganizeGroup(rows, sel(['a', 'b'], 'a', 'a')).dropsDonorPracticeData).toBe(
      true,
    );
  });

  it('play-from swaps the source and tombstones the discarded (canonical) source', () => {
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({ id: 'b', ytId: 'vidB', title: 'Song', updatedAt: 100 }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'b')]);
    const merged = plan.mergedRows[0];
    expect(merged.ytId).toBe('vidB');
    expect(merged.practiceSource).toBe('youtube');
    // The kept source (vidB) is not tombstoned; the discarded canonical source (vidA) is.
    expect(plan.tombstones.youtubeVideoIds).toEqual(['vidA']);
  });
});

describe('planStanzaOrganizeMerge — blob preservation (never lose unique un-backed media)', () => {
  it('refuses a cross-source merge that would drop a donor unique un-backed blob', () => {
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({
        id: 'b',
        title: 'Song',
        updatedAt: 100,
        localAudioBlob: blob(),
        localMediaFingerprint: '5000:200.00',
      }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'a')]);
    expect(plan.mergedRows).toEqual([]);
    expect(plan.droppedRowIds).toEqual([]);
    expect(plan.refusals).toHaveLength(1);
    expect(plan.refusals[0].reason).toMatch(/isn't backed up/);
  });

  it('refuses when play-from would overwrite the canonical unique un-backed blob', () => {
    const rows = [
      song({
        id: 'a',
        title: 'Song A',
        updatedAt: 200,
        localAudioBlob: blob('a-bytes'),
        localMediaFingerprint: '5000:200.00',
      }),
      song({
        id: 'b',
        title: 'Song B',
        updatedAt: 100,
        localAudioBlob: blob('b-bytes'),
        localMediaFingerprint: '6000:150.00',
      }),
    ];
    // Canonical A keeps its practice data, but play-from B would overwrite A's un-backed blob.
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'b')]);
    expect(plan.mergedRows).toEqual([]);
    expect(plan.refusals).toHaveLength(1);
  });

  it('proceeds when the dropped donor blob is Drive-backed (recoverable)', () => {
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({
        id: 'b',
        title: 'Song',
        updatedAt: 100,
        localAudioBlob: blob(),
        driveSourceFileId: 'drive-b',
        localMediaFingerprint: '5000:200.00',
      }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'a')]);
    expect(plan.refusals).toEqual([]);
    expect(plan.droppedRowIds).toEqual(['b']);
    // Drive-backed source discarded → tombstoned so it does not resurrect.
    expect(plan.tombstones.driveSourceFileIds).toEqual(['drive-b']);
  });

  it('does not refuse an exact-duplicate local pair (same bytes preserved on the survivor)', () => {
    const rows = [
      song({
        id: 'a',
        title: 'Song',
        updatedAt: 200,
        localAudioBlob: blob(),
        localMediaFingerprint: '5000:200.00',
      }),
      song({
        id: 'b',
        title: 'Song',
        updatedAt: 100,
        localAudioBlob: blob(),
        localMediaFingerprint: '5000:200.00',
      }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'a')]);
    expect(plan.refusals).toEqual([]);
    expect(plan.mergedRows[0].id).toBe('a');
    expect(plan.mergedRows[0].localAudioBlob).toBeTruthy();
  });

  it('refuses when a dropped cross-source donor has an un-backed stem blob', () => {
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({
        id: 'b',
        ytId: 'vidB',
        title: 'Song',
        updatedAt: 100,
        stems: [localStem('s1')],
      }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'a')]);
    expect(plan.refusals).toHaveLength(1);
  });

  it('proceeds when the donor stem blob is Drive-backed', () => {
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({
        id: 'b',
        ytId: 'vidB',
        title: 'Song',
        updatedAt: 100,
        stems: [localStem('s1', { backed: true })],
      }),
    ];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'a')]);
    expect(plan.refusals).toEqual([]);
    expect(plan.droppedRowIds).toEqual(['b']);
  });
});

describe('planStanzaOrganizeMerge — tombstones', () => {
  it('tombstones a dropped keyless local row by id', () => {
    // A YouTube row + a local upload of the same song; user plays the local file.
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({
        id: 'b',
        title: 'Song',
        updatedAt: 100,
        localAudioBlob: blob(),
        localMediaFingerprint: '5000:200.00',
      }),
    ];
    // play-from B: B's bytes move to the survivor, but B's row id is dropped and must tombstone.
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'b')]);
    expect(plan.refusals).toEqual([]);
    expect(plan.droppedRowIds).toEqual(['b']);
    expect(plan.tombstones.localSongIds).toEqual(['b']);
    // A's discarded YouTube source is also tombstoned.
    expect(plan.tombstones.youtubeVideoIds).toEqual(['vidA']);
  });

  it('does not tombstone a discarded source that another surviving row still references', () => {
    const rows = [
      song({ id: 'a', ytId: 'shared', title: 'Song', updatedAt: 200 }),
      song({ id: 'b', ytId: 'vidB', title: 'Song', updatedAt: 100 }),
      // Unrelated row still uses vidB.
      song({ id: 'c', ytId: 'vidB', title: 'Other', updatedAt: 50 }),
    ];
    // Merge a+b, play from a; b's vidB is discarded but row c still references it.
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a', 'a')]);
    expect(plan.tombstones.youtubeVideoIds).toEqual([]);
  });
});

describe('planStanzaOrganizeMerge — invalid selections are refused', () => {
  it('refuses a single-member group', () => {
    const rows = [song({ id: 'a', ytId: 'v' })];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a'], 'a')]);
    expect(plan.refusals).toHaveLength(1);
    expect(plan.mergedRows).toEqual([]);
  });

  it('refuses when the canonical is not a member', () => {
    const rows = [song({ id: 'a', ytId: 'v' }), song({ id: 'b', ytId: 'v' })];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'zzz')]);
    expect(plan.refusals).toHaveLength(1);
  });

  it('refuses when a member id is missing from the library', () => {
    const rows = [song({ id: 'a', ytId: 'v' })];
    const plan = planStanzaOrganizeMerge(rows, [sel(['a', 'ghost'], 'a')]);
    expect(plan.refusals).toHaveLength(1);
  });
});

describe('planStanzaOrganizeMerge — purity + preview', () => {
  it('does not mutate the input rows', () => {
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song', metronomeBySegmentId: { s: cal() } }),
      song({ id: 'b', ytId: 'vidB', title: 'Song', metronomeBySegmentId: { s2: cal() } }),
    ];
    const snapshot = JSON.stringify(rows);
    planStanzaOrganizeMerge(rows, [sel(['a', 'b'], 'a')]);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it('previews the merged result for the review dialog', () => {
    const rows = [
      song({
        id: 'a',
        ytId: 'vidA',
        title: 'My Song',
        markers: [{ id: 'm1', time: 10, label: 'V' }, { id: 'm2', time: 40, label: 'C' }],
        updatedAt: 200,
      }),
      song({ id: 'b', ytId: 'vidB', title: 'My Song', updatedAt: 100 }),
    ];
    const preview = previewStanzaOrganizeGroup(rows, sel(['a', 'b'], 'a', 'a'));
    expect(preview.finalTitle).toBe('My Song');
    expect(preview.crossSource).toBe(true);
    expect(preview.mergedMarkerCount).toBe(2);
    expect(preview.playFromKind).toBe('youtube');
    expect(preview.discardedSources).toContain('YouTube link');
    expect(preview.refusedReason).toBeNull();
  });

  it('surfaces the refusal reason in the preview', () => {
    const rows = [
      song({ id: 'a', ytId: 'vidA', title: 'Song' }),
      song({ id: 'b', title: 'Song', localAudioBlob: blob(), localMediaFingerprint: '1:2.00' }),
    ];
    const preview = previewStanzaOrganizeGroup(rows, sel(['a', 'b'], 'a', 'a'));
    expect(preview.refusedReason).toMatch(/isn't backed up/);
  });
});
