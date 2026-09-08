// @vitest-environment node
/**
 * The owner's report: "I've had sections get lost in syncing" — and, unlike the losses pinned in
 * `stanzaSectionSyncLoss.test.ts`, the sections that went missing were ones she had just ADDED.
 *
 * Those tests pin two specific losses against specific inputs. This one attacks the same policy
 * from the other direction: randomised edit histories across two devices, driven through BOTH sync
 * channels in the order the app uses them (`progress.json` row merge, then the practice overlay on
 * top), asserting one invariant — a section that was added and never deleted is still there
 * afterwards. Hand-picked cases prove the bugs we already found; the fuzz is what stands a chance
 * of catching the one we have not.
 */
import { describe, expect, it } from 'vitest';
import { mergeStanzaRicherSongMetadataWithReport } from './stanzaSongMetadataMerge';
import { recordDeletedMarkerIds } from './stanzaMarkerTombstones';
import { mergeStanzaPracticeOverlayIntoRows, buildStanzaPracticeOverlayFromRows } from '../drive/stanzaPracticeOverlaySync';
import type { StanzaSong } from '../db/stanzaDb';

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Dev = { row: StanzaSong };

function mkRow(): StanzaSong {
  return {
    id: 'song-1', ytId: 'yt1', title: 'Song',
    markers: [{ id: 'm0', time: 0, label: 'Intro' }, { id: 'm1', time: 30, label: 'Verse' }],
    stats: {}, updatedAt: 1000,
  } as StanzaSong;
}

/** Persist choke point: records tombstones and bumps updatedAt, like the app does. */
function persist(dev: Dev, nextMarkers: StanzaSong['markers'], now: number) {
  const deleted = recordDeletedMarkerIds({
    previousMarkers: dev.row.markers,
    nextMarkers,
    existing: dev.row.deletedMarkerIds,
    now,
  });
  dev.row = { ...dev.row, markers: nextMarkers, deletedMarkerIds: deleted, updatedAt: now };
}

describe('fuzz: an added section survives sync', () => {
  it('a marker added on the last-writing device is never lost', () => {
    const failures: string[] = [];

    for (let seed = 1; seed <= 400; seed++) {
      const rand = lcg(seed);
      const A: Dev = { row: mkRow() };
      const B: Dev = { row: mkRow() };
      let clock = 1000;

      // A few random edits on each side.
      const ops = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < ops; i++) {
        const dev = rand() < 0.5 ? A : B;
        clock += 10 + Math.floor(rand() * 50);
        const ms = [...(dev.row.markers ?? [])];
        const r = rand();
        if (r < 0.45 && ms.length > 1) {
          ms.splice(Math.floor(rand() * ms.length), 1); // delete
        } else if (r < 0.75) {
          ms.push({ id: `add-${seed}-${i}`, time: 40 + i * 7, label: `Section ${i}` }); // add
        } else if (ms.length) {
          ms[0] = { ...ms[0], label: `Renamed ${i}` }; // rename
        }
        persist(dev, ms, clock);
      }

      // The owner's action: add a brand-new section on A, last write wins the clock.
      clock += 100;
      const added = { id: `owner-${seed}`, time: 123, label: 'Owner Section' };
      persist(A, [...(A.row.markers ?? []), added], clock);

      // Sync: A pulls B's row (row channel), then B's overlay is applied on top.
      const rowMerged = mergeStanzaRicherSongMetadataWithReport(A.row, B.row).song;
      const overlay = buildStanzaPracticeOverlayFromRows([B.row]);
      const [final] = mergeStanzaPracticeOverlayIntoRows([rowMerged], overlay);

      const survived = (final.markers ?? []).some((m) => m.id === added.id);
      if (!survived) {
        failures.push(
          `seed=${seed} rowMergeKept=${(rowMerged.markers ?? []).some((m) => m.id === added.id)} ` +
            `Aupd=${A.row.updatedAt} Bupd=${B.row.updatedAt} ` +
            `Atomb=${JSON.stringify(A.row.deletedMarkerIds)} Btomb=${JSON.stringify(B.row.deletedMarkerIds)}`,
        );
      }
    }

    if (failures.length) {
      console.log(`FAILURES ${failures.length}/400`);
      for (const f of failures.slice(0, 8)) console.log('  ' + f);
    }
    expect(failures).toEqual([]);
  });

  it('an added marker survives when the OTHER device writes later (stale-tab overwrite)', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 400; seed++) {
      const rand = lcg(seed);
      const A: Dev = { row: mkRow() };
      const B: Dev = { row: mkRow() };
      let clock = 1000;

      // Owner adds a section on device A.
      clock += 50;
      const added = { id: `owner-${seed}`, time: 123, label: 'Owner Section' };
      persist(A, [...(A.row.markers ?? []), added], clock);

      // Device B (never saw the add) writes LATER — a stale tab saving something unrelated.
      const bOps = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < bOps; i++) {
        clock += 10 + Math.floor(rand() * 40);
        const ms = [...(B.row.markers ?? [])];
        const r = rand();
        if (r < 0.4 && ms.length > 1) ms.splice(Math.floor(rand() * ms.length), 1);
        else if (r < 0.7) ms.push({ id: `b-${seed}-${i}`, time: 200 + i * 5, label: `B ${i}` });
        else if (ms.length) ms[0] = { ...ms[0], label: `B renamed ${i}` };
        persist(B, ms, clock);
      }

      // A pulls: row channel then B's (newer) overlay on top.
      const rowMerged = mergeStanzaRicherSongMetadataWithReport(A.row, B.row).song;
      const overlay = buildStanzaPracticeOverlayFromRows([B.row]);
      const [final] = mergeStanzaPracticeOverlayIntoRows([rowMerged], overlay);

      if (!(final.markers ?? []).some((m) => m.id === added.id)) {
        failures.push(
          `seed=${seed} rowMergeKept=${(rowMerged.markers ?? []).some((m) => m.id === added.id)} ` +
            `Aupd=${A.row.updatedAt} Bupd=${B.row.updatedAt} ` +
            `Btomb=${JSON.stringify(B.row.deletedMarkerIds)}`,
        );
      }
    }
    if (failures.length) {
      console.log(`STALE-TAB FAILURES ${failures.length}/400`);
      for (const f of failures.slice(0, 8)) console.log('  ' + f);
    }
    expect(failures).toEqual([]);
  });
});

/**
 * The clock bump in `persistSong`'s undo is load-bearing, and quietly so.
 *
 * A marker survives its tombstone only when the side still carrying it was touched afterwards
 * (`vouchedAt > deletedAt`). Undo therefore MUST bump `updatedAt`, or the tombstone — which by then
 * may already have reached Drive — deletes the marker again on the very next pull.
 *
 * `persistSong` has two undo branches. The markers-only branch writes `updatedAt: Date.now()`; the
 * general branch replays the pre-write snapshot verbatim, stale `updatedAt` and all. Today every
 * marker-mutating call site patches exactly `{ id, markers }` and so takes the safe branch. A
 * future delete path that patches markers alongside any other field would take the other one and
 * silently regress sync, with no failing test to show for it. These two cases pin the difference.
 */
describe('undo must bump updatedAt for a restored marker to survive its tombstone', () => {
  const deletedAt = 2000;
  const remoteWithTombstone = {
    id: 's1', ytId: null, title: 'Song', stats: {},
    markers: [{ id: 'keep', time: 0, label: 'Intro' }],
    deletedMarkerIds: { revived: deletedAt },
    updatedAt: deletedAt,
  } as unknown as StanzaSong;

  const restored = (updatedAt: number) =>
    ({
      id: 's1', ytId: null, title: 'Song', stats: {},
      markers: [
        { id: 'keep', time: 0, label: 'Intro' },
        { id: 'revived', time: 30, label: 'Verse' },
      ],
      updatedAt,
    }) as unknown as StanzaSong;

  it('bumped clock (markers-only branch): the restored section survives', () => {
    const merged = mergeStanzaRicherSongMetadataWithReport(
      restored(deletedAt + 1),
      remoteWithTombstone,
    ).song;
    expect(merged.markers.map((m) => m.id)).toContain('revived');
  });

  it('stale clock (general branch): the restored section is deleted again', () => {
    const merged = mergeStanzaRicherSongMetadataWithReport(
      restored(deletedAt - 1),
      remoteWithTombstone,
    ).song;
    // Not the behaviour we want — it is the behaviour the stale snapshot buys, which is exactly
    // why the general undo branch must never carry a marker change.
    expect(merged.markers.map((m) => m.id)).not.toContain('revived');
  });
});
