import { useLiveQuery } from 'dexie-react-hooks';
import { gestureDb } from '../db/gestureDb';
import type { GesturePack } from '../types';
import { GESTURE_EMPTY_PACKS } from './gestureLiveQueryEmpty';

export function useGesturePacks(): GesturePack[] {
  const raw = useLiveQuery(() => gestureDb.packs.orderBy('linkedAt').reverse().toArray(), [], undefined);
  return raw ?? GESTURE_EMPTY_PACKS;
}
