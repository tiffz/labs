import { useLayoutEffect, useMemo, useEffect, type MutableRefObject } from 'react';
import type { StanzaSong } from '../db/stanzaDb';

export interface UseStanzaLocalPlaybackObjectUrlsArgs {
  primaryLocalBlobKey: string;
  stemUrlKey: string;
  selectedRef: MutableRefObject<StanzaSong | null>;
}

/**
 * Owns `blob:` URLs for the primary local file and each stem.
 *
 * - **Create** in `useMemo` (sync first paint for `<audio>` / `<video>` `src` + refs).
 * - **Revoke** only in `useLayoutEffect` cleanup after React commits a new URL, so we never
 *   revoke a URL the previous commit’s media elements still reference (avoids `ERR_FILE_NOT_FOUND`).
 */
export function useStanzaLocalPlaybackObjectUrls({
  primaryLocalBlobKey,
  stemUrlKey,
  selectedRef,
}: UseStanzaLocalPlaybackObjectUrlsArgs): {
  localUrl: string | null;
  stemUrlById: Record<string, string>;
} {
  const localUrl = useMemo((): string | null => {
    if (!primaryLocalBlobKey) return null;
    const sel = selectedRef.current;
    const blob = sel?.localAudioBlob;
    if (!blob || sel?.ytId) return null;
    return URL.createObjectURL(blob);
    // `selectedRef` is stable; blob identity is fully captured by `primaryLocalBlobKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional ref read when key changes
  }, [primaryLocalBlobKey]);

  const stemUrlById = useMemo((): Record<string, string> => {
    if (!stemUrlKey) return {};
    const sel = selectedRef.current;
    if (!sel?.stems?.length) return {};
    const next: Record<string, string> = {};
    for (const s of sel.stems) {
      next[s.id] = URL.createObjectURL(s.localBlob);
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional ref read when key changes
  }, [stemUrlKey]);

  useLayoutEffect(() => {
    return () => {
      if (localUrl) queueMicrotask(() => URL.revokeObjectURL(localUrl));
    };
  }, [localUrl]);

  useLayoutEffect(() => {
    const urls = Object.values(stemUrlById);
    if (!urls.length) {
      return () => {};
    }
    return () => {
      for (const u of urls) {
        queueMicrotask(() => URL.revokeObjectURL(u));
      }
    };
  }, [stemUrlById]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // eslint-disable-next-line no-console -- intentional churn tracing for stem/blob debugging
    console.debug('[Stanza playback blob URLs] identity keys', {
      primaryLocalBlobKey: primaryLocalBlobKey || '(empty)',
      stemUrlKey: stemUrlKey || '(empty)',
    });
  }, [primaryLocalBlobKey, stemUrlKey]);

  return { localUrl, stemUrlById };
}
