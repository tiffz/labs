// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { planStanzaMergePersist } from './stanzaMergePersistPlan';
import type { StanzaSong } from '../db/stanzaDb';

const song = (o: Partial<StanzaSong> & Pick<StanzaSong, 'id'>): StanzaSong =>
  ({
    ytId: null,
    title: 'Song',
    markers: [],
    stats: {},
    updatedAt: 100,
    ...o,
  }) as StanzaSong;

const m = (id: string, time: number, label: string) => ({ id, time, label });

/** What the old persist step did, so the tests below can show they actually catch something. */
function legacyPlan(live: StanzaSong[], nextRows: StanzaSong[]) {
  const keep = new Set(nextRows.map((r) => r.id));
  return {
    deleteIds: live.filter((r) => !keep.has(r.id)).map((r) => r.id),
    puts: nextRows,
  };
}

describe('planStanzaMergePersist — a merge may only decide the fate of rows it saw', () => {
  it('keeps a song created during the merge instead of deleting it (the ?v= case)', () => {
    // The pull snapshotted the library, then the user opened /stanza/?v=ASlIri-SjpI, which mints
    // a fresh row, and added sections to it — all before the merge finished.
    const existing = song({ id: 'a' });
    const openedByLink = song({
      id: 'new-from-v-param',
      ytId: 'ASlIri-SjpI',
      title: 'YouTube · ASlIri-SjpI',
      markers: [m('s1', 12, 'Verse'), m('s2', 40, 'Chorus')],
      updatedAt: 500,
    });

    const basedOn = [existing];
    const live = [existing, openedByLink];
    const nextRows = [existing];

    // The bug: the old sweep deleted it outright, sections and all.
    expect(legacyPlan(live, nextRows).deleteIds).toContain('new-from-v-param');

    const plan = planStanzaMergePersist({ live, nextRows, basedOn });
    expect(plan.deleteIds).not.toContain('new-from-v-param');
    expect(plan.preservedUnseenIds).toEqual(['new-from-v-param']);
  });

  it('still deletes a row the merge did consider and dropped', () => {
    const dropped = song({ id: 'tombstoned' });
    const kept = song({ id: 'a' });
    const plan = planStanzaMergePersist({
      live: [kept, dropped],
      nextRows: [kept],
      basedOn: [kept, dropped],
    });
    expect(plan.deleteIds).toEqual(['tombstoned']);
    expect(plan.preservedUnseenIds).toEqual([]);
  });

  it('keeps a section added during the merge instead of reverting it', () => {
    const basis = song({ id: 'a', markers: [m('x', 10, 'Intro')], updatedAt: 100 });
    // User added a section while the pull was in flight.
    const live = song({
      id: 'a',
      markers: [m('x', 10, 'Intro'), m('added', 50, 'Bridge')],
      updatedAt: 900,
    });
    // The merge, working from the stale basis, produced a row without it.
    const merged = song({ id: 'a', markers: [m('x', 10, 'Intro')], updatedAt: 200 });

    // The bug: the old put wrote `merged` verbatim, dropping the new section.
    expect(legacyPlan([live], [merged]).puts[0].markers.map((k) => k.id)).not.toContain('added');

    const plan = planStanzaMergePersist({ live: [live], nextRows: [merged], basedOn: [basis] });
    expect(plan.remergedIds).toEqual(['a']);
    expect(plan.puts[0].markers.map((k) => k.id)).toContain('added');
    expect(plan.puts[0].markers.map((k) => k.id)).toContain('x');
  });

  it('writes the merge result verbatim when the row did not change during the merge', () => {
    const basis = song({ id: 'a', updatedAt: 100 });
    const live = song({ id: 'a', updatedAt: 100 });
    const merged = song({ id: 'a', title: 'From Drive', updatedAt: 300 });
    const plan = planStanzaMergePersist({ live: [live], nextRows: [merged], basedOn: [basis] });
    expect(plan.remergedIds).toEqual([]);
    expect(plan.puts[0]).toBe(merged);
  });
});
