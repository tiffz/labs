import { useEffect, useState } from 'react';
import {
  acquireLabsObjectUrl,
  releaseLabsObjectUrl,
} from './labsObjectUrlRegistry';

/**
 * A shared, refcounted object URL for `blob`, released when the last holder unmounts.
 *
 * Replaces the hand-rolled "create in `useLayoutEffect`, revoke the previous one, leak the last"
 * pattern that `StanzaLibraryThumb` documented as load-bearing. It is safe under Strict Mode for a
 * different reason: the registry defers the revoke, so the immediate unmount/remount re-acquires
 * and cancels it. Nothing is skipped, so nothing is leaked.
 *
 * `key` must describe the blob's CONTENT (`${id}:${size}:${type}`), not its object identity — a
 * Dexie live query emits a fresh Blob object for unchanged bytes, and keying on identity would mint
 * a URL per render.
 */
export function useLabsObjectUrl(key: string, blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    blob ? acquireLabsObjectUrl(key, blob) : undefined,
  );

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return undefined;
    }
    const next = acquireLabsObjectUrl(key, blob);
    setUrl(next);
    return () => releaseLabsObjectUrl(key);
    // `blob` identity churns per live-query emission; `key` encodes the content identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return url;
}
