import { useEffect, useState } from 'react';

type CacheEntry = { url: string; refCount: number };

/** Ref-counted blob URLs so multiple previews of the same `File` do not revoke each other's src. */
const objectUrlCache = new WeakMap<File, CacheEntry>();

export function useLocalVideoObjectUrl(file: File): string {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let entry = objectUrlCache.get(file);
    if (!entry) {
      entry = { url: URL.createObjectURL(file), refCount: 0 };
      objectUrlCache.set(file, entry);
    }
    entry.refCount += 1;
    setUrl(entry.url);

    return () => {
      entry!.refCount -= 1;
      if (entry!.refCount <= 0) {
        URL.revokeObjectURL(entry!.url);
        objectUrlCache.delete(file);
      }
    };
  }, [file]);

  return url;
}
