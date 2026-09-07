import { describe, expect, it } from 'vitest';
import {
  MAIN_PERFORMER_ROLES,
  SUPPORTING_ROLES,
  filterPerformancesByScope,
  isMainPerformance,
  isMainPerformerRole,
  parsePerformanceRole,
  parsePerformanceScope,
  performanceMatchesScope,
  performanceRole,
} from './performanceRole';
import { ENCORE_PERFORMANCE_ROLES, type EncorePerformance, type EncorePerformanceRole } from '../types';

function perf(role?: EncorePerformanceRole): Pick<EncorePerformance, 'role'> {
  return role === undefined ? {} : { role };
}

describe('performanceRole', () => {
  it('reads an absent role as Lead vocal', () => {
    // Load-bearing: every performance logged before roles existed was her singing lead. If this
    // default moves, the entire back catalogue silently changes meaning — and drops off the public
    // page, since the snapshot filter derives from it.
    expect(performanceRole(perf())).toBe('Lead vocal');
  });

  it('reads an explicit role as itself', () => {
    for (const role of ENCORE_PERFORMANCE_ROLES) {
      expect(performanceRole(perf(role))).toBe(role);
    }
  });

  it('maps the retired Accompanist role onto Instrumental', () => {
    // The two were merged. Without the alias a stored 'Accompanist' fails the enum check, falls
    // through to the absent-means-lead default, and silently reclassifies accompaniment work as
    // lead vocal — putting it back in the singing archive AND publishing it to the guest page.
    expect(performanceRole({ role: 'Accompanist' as unknown as EncorePerformanceRole })).toBe(
      'Instrumental',
    );
  });

  it('falls back to Lead vocal for a role it does not recognise at all', () => {
    expect(performanceRole({ role: 'Kazoo' as unknown as EncorePerformanceRole })).toBe('Lead vocal');
  });
});

describe('main performer is derived', () => {
  it('counts lead vocal only', () => {
    expect(isMainPerformerRole('Lead vocal')).toBe(true);
  });

  it('does not count backing vocal or instrumental', () => {
    // Instrumental now covers playing rather than singing lead, solo or for someone else — the
    // owner said that distinction does not matter for her. Keeping it on the supporting side is
    // what keeps the singing archive and the public page clean.
    expect(isMainPerformerRole('Backing vocal')).toBe(false);
    expect(isMainPerformerRole('Instrumental')).toBe(false);
  });

  it('treats a performance with no role as a main performance', () => {
    expect(isMainPerformance(perf())).toBe(true);
  });

  it('treats a legacy Accompanist row as supporting, not main', () => {
    // The regression that would matter most: accompaniment reappearing on the public page.
    expect(isMainPerformance({ role: 'Accompanist' as unknown as EncorePerformanceRole })).toBe(false);
  });

  it('partitions every role into exactly one of main or supporting', () => {
    // Guards against a future role landing in neither bucket, which would make it invisible in
    // every scope including 'all'.
    const partitioned = [...MAIN_PERFORMER_ROLES, ...SUPPORTING_ROLES].sort();
    expect(partitioned).toEqual([...ENCORE_PERFORMANCE_ROLES].sort());
    expect(new Set(partitioned).size).toBe(ENCORE_PERFORMANCE_ROLES.length);
  });
});

describe('scopes', () => {
  it('main is lead vocal and roleless rows only', () => {
    expect(performanceMatchesScope(perf('Lead vocal'), 'main')).toBe(true);
    expect(performanceMatchesScope(perf(), 'main')).toBe(true);
    expect(performanceMatchesScope(perf('Instrumental'), 'main')).toBe(false);
    expect(performanceMatchesScope(perf('Backing vocal'), 'main')).toBe(false);
  });

  it('supporting is the exact complement of main', () => {
    for (const role of ENCORE_PERFORMANCE_ROLES) {
      const inMain = performanceMatchesScope(perf(role), 'main');
      const inSupporting = performanceMatchesScope(perf(role), 'supporting');
      expect(inMain).not.toBe(inSupporting);
    }
  });

  it('all includes everything, including roleless rows', () => {
    expect(performanceMatchesScope(perf(), 'all')).toBe(true);
    for (const role of ENCORE_PERFORMANCE_ROLES) {
      expect(performanceMatchesScope(perf(role), 'all')).toBe(true);
    }
  });
});

describe('filterPerformancesByScope', () => {
  const rows = [perf(), perf('Lead vocal'), perf('Backing vocal'), perf('Instrumental')];

  it('keeps main performances, including the roleless default', () => {
    expect(filterPerformancesByScope(rows, 'main')).toHaveLength(2);
  });

  it('keeps supporting performances', () => {
    expect(filterPerformancesByScope(rows, 'supporting')).toHaveLength(2);
  });

  it('main and supporting together account for every row', () => {
    const main = filterPerformancesByScope(rows, 'main').length;
    const supporting = filterPerformancesByScope(rows, 'supporting').length;
    expect(main + supporting).toBe(rows.length);
  });

  it('returns a copy for scope all, not the original array', () => {
    const all = filterPerformancesByScope(rows, 'all');
    expect(all).toEqual(rows);
    expect(all).not.toBe(rows);
  });
});

describe('parsing persisted values', () => {
  it('accepts known roles', () => {
    expect(parsePerformanceRole('Instrumental')).toBe('Instrumental');
    expect(parsePerformanceRole('Lead vocal')).toBe('Lead vocal');
  });

  it('maps the retired Accompanist value rather than dropping it', () => {
    expect(parsePerformanceRole('Accompanist')).toBe('Instrumental');
  });

  it('rejects anything else', () => {
    expect(parsePerformanceRole('Trombone soloist')).toBeUndefined();
    expect(parsePerformanceRole(undefined)).toBeUndefined();
    expect(parsePerformanceRole(7)).toBeUndefined();
  });

  it('accepts known scopes and rejects anything else', () => {
    expect(parsePerformanceScope('supporting')).toBe('supporting');
    expect(parsePerformanceScope('Main')).toBeUndefined(); // case-sensitive on purpose
    expect(parsePerformanceScope(null)).toBeUndefined();
  });
});
