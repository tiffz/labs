import { useEffect, useSyncExternalStore } from 'react';
import {
  getGestureKnownTags,
  subscribeGestureKnownTags,
  syncGestureTagRegistryFromPacks,
} from '../drive/gestureTagRegistry';
import type { GesturePack } from '../types';

/** Known collection tags for filters + autocomplete (packs + optimistic local edits). */
export function useGestureKnownTags(packs: GesturePack[]): string[] {
  useEffect(() => {
    syncGestureTagRegistryFromPacks(packs);
  }, [packs]);

  return useSyncExternalStore(subscribeGestureKnownTags, getGestureKnownTags, getGestureKnownTags);
}
