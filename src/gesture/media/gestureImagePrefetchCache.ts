const MAX_ENTRIES = 4;
const MAX_BYTES = 48 * 1024 * 1024;

type PrefetchEntry = {
  key: string;
  objectUrl: string;
  byteSize: number;
  lastUsedAt: number;
};

const entries = new Map<string, PrefetchEntry>();
let totalBytes = 0;

function touch(entry: PrefetchEntry): void {
  entry.lastUsedAt = Date.now();
}

function evictOutside(keepKeys: Set<string>): void {
  for (const [key, entry] of entries) {
    if (keepKeys.has(key)) continue;
    URL.revokeObjectURL(entry.objectUrl);
    totalBytes -= entry.byteSize;
    entries.delete(key);
  }
}

function evictLru(): void {
  while (entries.size > MAX_ENTRIES || totalBytes > MAX_BYTES) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, entry] of entries) {
      if (entry.lastUsedAt < oldestAt) {
        oldestAt = entry.lastUsedAt;
        oldestKey = key;
      }
    }
    if (!oldestKey) break;
    const victim = entries.get(oldestKey);
    if (!victim) break;
    URL.revokeObjectURL(victim.objectUrl);
    totalBytes -= victim.byteSize;
    entries.delete(oldestKey);
  }
}

export async function prefetchGestureImageUrl(url: string, key: string): Promise<string> {
  const existing = entries.get(key);
  if (existing) {
    touch(existing);
    return existing.objectUrl;
  }

  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error('Could not load reference image.');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const byteSize = blob.size;

  entries.set(key, { key, objectUrl, byteSize, lastUsedAt: Date.now() });
  totalBytes += byteSize;
  evictLru();
  return objectUrl;
}

export function getCachedGestureImageUrl(key: string): string | null {
  const entry = entries.get(key);
  if (!entry) return null;
  touch(entry);
  return entry.objectUrl;
}

export function retainGesturePrefetchKeys(keepKeys: string[]): void {
  evictOutside(new Set(keepKeys));
}

export function clearGestureImagePrefetchCache(): void {
  for (const entry of entries.values()) {
    URL.revokeObjectURL(entry.objectUrl);
  }
  entries.clear();
  totalBytes = 0;
}

export async function preloadGestureImageViaElement(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image preload failed'));
    img.src = url;
  });
}
