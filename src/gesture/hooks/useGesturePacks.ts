import { useLiveQuery } from 'dexie-react-hooks';
import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { gestureDb } from '../db/gestureDb';
import type { GesturePack } from '../types';
import { GESTURE_EMPTY_PACKS } from './gestureLiveQueryEmpty';

export type GesturePacksQuery = {
  packs: GesturePack[];
  /** True after the first `packs` live query resolves (empty may be a real empty library). */
  packsHydrated: boolean;
};

export function useGesturePacks(): GesturePacksQuery {
  const raw = useLiveQuery(() => gestureDb.packs.orderBy('linkedAt').reverse().toArray(), [], undefined);
  const { value: packs, hydrated: packsHydrated } = resolveDexieLiveQuery(raw, GESTURE_EMPTY_PACKS);
  return { packs, packsHydrated };
}
