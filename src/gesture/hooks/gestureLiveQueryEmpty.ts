import type { GestureDrawRecord, GesturePack, GesturePackFile } from '../types';

/** Stable fallbacks for `useLiveQuery` while Dexie is loading (avoids `?? []` every render). */
export const GESTURE_EMPTY_PACKS: GesturePack[] = [];
export const GESTURE_EMPTY_PACK_FILES: GesturePackFile[] = [];
export const GESTURE_EMPTY_DRAW_HISTORY: GestureDrawRecord[] = [];
