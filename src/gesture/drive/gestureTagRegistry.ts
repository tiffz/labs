import { collectGestureTagsFromPacks, normalizeGestureTags } from './gesturePackTags';
import type { GesturePack } from '../types';

let knownTags: string[] = [];
let lastPackTags: string[] = [];
let sessionTags: string[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

function recomputeKnownTags(fromPacks: string[]): void {
  const packSet = new Set(fromPacks);
  sessionTags = sessionTags.filter((tag) => !packSet.has(tag));
  const next = normalizeGestureTags([...fromPacks, ...sessionTags]);
  if (next.join('\0') === knownTags.join('\0')) return;
  knownTags = next;
  emit();
}

/** Merge authoritative pack tags into the registry (Dexie live query). */
export function syncGestureTagRegistryFromPacks(packs: GesturePack[]): void {
  lastPackTags = collectGestureTagsFromPacks(packs);
  recomputeKnownTags(lastPackTags);
}

/** Register tags applied locally before Drive/Dexie round-trip (autocomplete). */
export function registerGestureLocalTags(tags: string[]): void {
  const packSet = new Set(lastPackTags);
  const novel = normalizeGestureTags(tags).filter((tag) => !packSet.has(tag));
  if (novel.length === 0) return;
  sessionTags = normalizeGestureTags([...sessionTags, ...novel]);
  recomputeKnownTags(lastPackTags);
}

export function getGestureKnownTags(): string[] {
  return knownTags;
}

export function subscribeGestureKnownTags(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
