import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import {
  loadGesturePackStatsAggregate,
  type GesturePackStatsAggregate,
} from '../drive/gesturePackStatsAggregate';
import { stabilizeGesturePackStatsAggregate } from '../drive/gesturePackStatsStable';
import type { GesturePackStats } from '../hooks/useGesturePackStatsTypes';
import { gesturePackStatsContext } from './gesturePackStatsContext';

const EMPTY_AGGREGATE: GesturePackStatsAggregate = {
  counts: new Map(),
  coverIds: new Map(),
  drawnSets: new Map(),
  packFileCount: 0,
  drawHistoryCount: 0,
};

const STATS_DEBOUNCE_MS = 280;

function useDebouncedPackStatsAggregate(): {
  aggregate: GesturePackStatsAggregate;
  hydrated: boolean;
} {
  const raw = useLiveQuery(() => loadGesturePackStatsAggregate(), [], undefined);
  const { value: immediate, hydrated } = resolveDexieLiveQuery(raw, EMPTY_AGGREGATE);
  const [debounced, setDebounced] = useState(immediate);
  const stableRef = useRef<GesturePackStatsAggregate>(EMPTY_AGGREGATE);
  const firstHydratedRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!firstHydratedRef.current) {
      firstHydratedRef.current = true;
      stableRef.current = stabilizeGesturePackStatsAggregate(stableRef.current, immediate);
      setDebounced(stableRef.current);
      return;
    }

    const timer = window.setTimeout(() => {
      stableRef.current = stabilizeGesturePackStatsAggregate(stableRef.current, immediate);
      setDebounced(stableRef.current);
    }, STATS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [hydrated, immediate]);

  return {
    aggregate: hydrated ? debounced : EMPTY_AGGREGATE,
    hydrated,
  };
}

export default function GesturePackStatsProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { aggregate, hydrated } = useDebouncedPackStatsAggregate();

  const value = useMemo(
    (): GesturePackStats => ({
      counts: aggregate.counts,
      coverIds: aggregate.coverIds,
      drawnSets: aggregate.drawnSets,
      statsHydrated: hydrated,
    }),
    [aggregate.counts, aggregate.coverIds, aggregate.drawnSets, hydrated],
  );

  return (
    <gesturePackStatsContext.Provider value={value}>{children}</gesturePackStatsContext.Provider>
  );
}
