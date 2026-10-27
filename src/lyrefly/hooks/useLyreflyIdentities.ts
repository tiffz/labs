import { useLiveQuery } from 'dexie-react-hooks';

import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { lyreflyDb } from '../db/lyreflyDb';
import type { LyreflyIdentities } from '../types';

const EMPTY: LyreflyIdentities = { personas: [], series: [], accounts: [] };

export function useLyreflyIdentities(): { identities: LyreflyIdentities; identitiesHydrated: boolean } {
  const raw = useLiveQuery(async (): Promise<LyreflyIdentities> => {
    const [personas, series, accounts] = await Promise.all([
      lyreflyDb.personas.toArray(),
      lyreflyDb.series.toArray(),
      lyreflyDb.accounts.toArray(),
    ]);
    const byName = <T,>(key: (row: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));
    return {
      personas: personas.sort(byName((p) => p.name)),
      series: series.sort(byName((s) => s.title)),
      accounts: accounts.sort(byName((a) => `${a.platform} ${a.handle}`)),
    };
  }, []);
  const { value, hydrated } = resolveDexieLiveQuery(raw, EMPTY);
  return { identities: value, identitiesHydrated: hydrated };
}
