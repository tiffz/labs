import { describe, expect, it } from 'vitest';
import {
  eventSeedFromPerformance,
  groupPerformancesIntoEvents,
  isSameEvent,
  normalizeVenueForEventKey,
  performanceEventKey,
  siblingPerformancesAtEvent,
} from './performanceEvents';
import type { EncorePerformance } from '../types';

function perf(
  id: string,
  date: string,
  venueTag: string,
  extra: Partial<EncorePerformance> = {},
): EncorePerformance {
  return {
    id,
    songId: `song-${id}`,
    date,
    venueTag,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

describe('venue normalisation', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(normalizeVenueForEventKey('  The Blue Room ')).toBe(normalizeVenueForEventKey('the blue room'));
  });

  it('collapses runs of inner whitespace', () => {
    // The most likely way an event silently splits: venueTag is free text with an autocomplete.
    expect(normalizeVenueForEventKey('The  Blue   Room')).toBe(normalizeVenueForEventKey('The Blue Room'));
  });

  it('keeps genuinely different venues apart', () => {
    expect(normalizeVenueForEventKey('Blue Room')).not.toBe(normalizeVenueForEventKey('Red Room'));
  });
});

describe('performanceEventKey', () => {
  it('matches for the same day and venue', () => {
    expect(isSameEvent(perf('a', '2026-05-04', 'Blue Room'), perf('b', '2026-05-04', 'blue room'))).toBe(true);
  });

  it('differs across days at one venue', () => {
    expect(isSameEvent(perf('a', '2026-05-04', 'Blue Room'), perf('b', '2026-05-05', 'Blue Room'))).toBe(false);
  });

  it('differs across venues on one day', () => {
    expect(isSameEvent(perf('a', '2026-05-04', 'Blue Room'), perf('b', '2026-05-04', 'Red Room'))).toBe(false);
  });

  it('does not confuse a venue containing the separator with a different date', () => {
    // The key joins date and venue; a venue with odd text must not be able to forge another key.
    const a = performanceEventKey(perf('a', '2026-05-04', 'Room 2026-05-05'));
    const b = performanceEventKey(perf('b', '2026-05-04 Room', '2026-05-05'));
    expect(a).not.toBe(b);
  });
});

describe('groupPerformancesIntoEvents', () => {
  it('groups several songs at one venue and date into one event', () => {
    const rows = [
      perf('1', '2026-05-04', 'Blue Room'),
      perf('2', '2026-05-04', 'Blue Room'),
      perf('3', '2026-05-04', 'Blue Room'),
    ];
    const events = groupPerformancesIntoEvents(rows);
    expect(events).toHaveLength(1);
    expect(events[0]!.performances.map((p) => p.id)).toEqual(['1', '2', '3']);
  });

  it('groups case-variant venues together and displays the first spelling', () => {
    const events = groupPerformancesIntoEvents([
      perf('1', '2026-05-04', 'The Blue Room'),
      perf('2', '2026-05-04', 'the blue room'),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.venueTag).toBe('The Blue Room');
  });

  it('keeps two venues on one day separate', () => {
    const events = groupPerformancesIntoEvents([
      perf('1', '2026-05-04', 'Blue Room'),
      perf('2', '2026-05-04', 'Red Room'),
    ]);
    expect(events).toHaveLength(2);
  });

  it('treats a single-song event as an event of one', () => {
    const events = groupPerformancesIntoEvents([perf('1', '2026-05-04', 'Blue Room')]);
    expect(events).toHaveLength(1);
    expect(events[0]!.performances).toHaveLength(1);
  });

  it('preserves input order rather than imposing its own', () => {
    // The list is already sorted date-desc by the caller; re-sorting here would fight it.
    const events = groupPerformancesIntoEvents([
      perf('1', '2026-05-06', 'B'),
      perf('2', '2026-05-04', 'A'),
      perf('3', '2026-05-06', 'B'),
    ]);
    expect(events.map((e) => e.date)).toEqual(['2026-05-06', '2026-05-04']);
    expect(events[0]!.performances.map((p) => p.id)).toEqual(['1', '3']);
  });

  it('returns nothing for no performances', () => {
    expect(groupPerformancesIntoEvents([])).toEqual([]);
  });

  it('accounts for every performance exactly once', () => {
    const rows = [
      perf('1', '2026-05-04', 'A'),
      perf('2', '2026-05-04', 'A'),
      perf('3', '2026-05-05', 'B'),
      perf('4', '2026-05-05', 'C'),
    ];
    const grouped = groupPerformancesIntoEvents(rows).flatMap((e) => e.performances);
    expect(grouped).toHaveLength(rows.length);
    expect(new Set(grouped.map((p) => p.id)).size).toBe(rows.length);
  });
});

describe('siblingPerformancesAtEvent', () => {
  const rows = [
    perf('1', '2026-05-04', 'Blue Room'),
    perf('2', '2026-05-04', 'Blue Room'),
    perf('3', '2026-05-05', 'Blue Room'),
  ];

  it('finds the other songs from the same event', () => {
    expect(siblingPerformancesAtEvent(rows[0]!, rows).map((p) => p.id)).toEqual(['2']);
  });

  it('excludes the performance itself', () => {
    expect(siblingPerformancesAtEvent(rows[0]!, rows).map((p) => p.id)).not.toContain('1');
  });

  it('is empty for a single-song event', () => {
    expect(siblingPerformancesAtEvent(rows[2]!, rows)).toEqual([]);
  });
});

describe('eventSeedFromPerformance', () => {
  it('carries date, venue, and accompaniment', () => {
    const seed = eventSeedFromPerformance(
      perf('1', '2026-05-04', 'Blue Room', { accompanimentTags: ['Piano'] }),
    );
    expect(seed).toEqual({ date: '2026-05-04', venueTag: 'Blue Room', accompanimentTags: ['Piano'] });
  });

  it('does not carry the role forward', () => {
    // Singing lead on one number and accompanying on the next is exactly the case this exists for,
    // so the role resets to the default rather than carrying a wrong answer into the new row.
    const seed = eventSeedFromPerformance(
      perf('1', '2026-05-04', 'Blue Room', { role: 'Accompanist' }),
    );
    expect(seed).not.toHaveProperty('role');
  });

  it('omits accompaniment entirely when there is none, rather than storing an empty array', () => {
    expect(eventSeedFromPerformance(perf('1', '2026-05-04', 'Blue Room'))).not.toHaveProperty(
      'accompanimentTags',
    );
  });

  it('copies the accompaniment array so later edits cannot mutate the source row', () => {
    const source = perf('1', '2026-05-04', 'Blue Room', { accompanimentTags: ['Piano'] });
    const seed = eventSeedFromPerformance(source);
    seed.accompanimentTags!.push('Band');
    expect(source.accompanimentTags).toEqual(['Piano']);
  });
});
