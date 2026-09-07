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
});

describe('main performer is derived', () => {
  it('counts lead vocal and instrumental', () => {
    expect(isMainPerformerRole('Lead vocal')).toBe(true);
    expect(isMainPerformerRole('Instrumental')).toBe(true);
  });

  it('does not count backing vocal or accompanist', () => {
    expect(isMainPerformerRole('Backing vocal')).toBe(false);
    expect(isMainPerformerRole('Accompanist')).toBe(false);
  });

  it('treats a performance with no role as a main performance', () => {
    expect(isMainPerformance(perf())).toBe(true);
  });

  it('partitions every role into exactly one of main or supporting', () => {
    // Guards the derivation against a future role being added to the enum and silently landing in
    // neither bucket — which would make it invisible in every scope including 'all'.
    const partitioned = [...MAIN_PERFORMER_ROLES, ...SUPPORTING_ROLES].sort();
    expect(partitioned).toEqual([...ENCORE_PERFORMANCE_ROLES].sort());
    expect(new Set(partitioned).size).toBe(ENCORE_PERFORMANCE_ROLES.length);
  });
});

describe('scopes', () => {
  it('main includes lead and instrumental, excludes supporting', () => {
    expect(performanceMatchesScope(perf('Lead vocal'), 'main')).toBe(true);
    expect(performanceMatchesScope(perf('Instrumental'), 'main')).toBe(true);
    expect(performanceMatchesScope(perf('Accompanist'), 'main')).toBe(false);
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
  const rows = [
    perf(),
    perf('Lead vocal'),
    perf('Backing vocal'),
    perf('Accompanist'),
    perf('Instrumental'),
  ];

  it('keeps main performances, including the roleless default', () => {
    expect(filterPerformancesByScope(rows, 'main')).toHaveLength(3);
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
  it('accepts known roles and rejects anything else', () => {
    expect(parsePerformanceRole('Accompanist')).toBe('Accompanist');
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
