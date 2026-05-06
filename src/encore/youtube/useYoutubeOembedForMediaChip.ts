import { useEffect, useState } from 'react';
import { fetchYoutubeOembedMeta, getYoutubeOembedCached } from './youtubeOembedMeta';

export type UseYoutubeOembedForMediaChipResult = {
  /** oEmbed title when available; omit chip label fallback using this when null. */
  title: string | null;
  /**
   * True when YouTube oEmbed refused the URL (401/403/404 in cache), typical for videos that
   * block embedding / third-party playback. Hide Stanza deep links in that case.
   */
  suppressStanzaPractice: boolean;
};

/**
 * Resolves YouTube oEmbed metadata for compact media chips. Also flags when oEmbed indicates the
 * video isn’t available for embed-style use, so practice shortcuts that depend on playback can hide.
 */
export function useYoutubeOembedForMediaChip(watchUrl: string | null): UseYoutubeOembedForMediaChipResult {
  const u0 = watchUrl?.trim() ?? '';
  const initialCached = u0 ? getYoutubeOembedCached(u0) : undefined;
  const initialTitle =
    initialCached && !initialCached.embedDenied && initialCached.title ? initialCached.title : null;
  const initialSuppress = Boolean(initialCached?.embedDenied);

  const [title, setTitle] = useState<string | null>(initialTitle);
  const [suppressStanzaPractice, setSuppressStanzaPractice] = useState(initialSuppress);

  useEffect(() => {
    const u = watchUrl?.trim() ?? '';
    if (!u) {
      setTitle(null);
      setSuppressStanzaPractice(false);
      return;
    }
    const cached = getYoutubeOembedCached(u);
    if (cached?.embedDenied) {
      setTitle(null);
      setSuppressStanzaPractice(true);
      return;
    }
    if (cached?.title) {
      setTitle(cached.title);
      setSuppressStanzaPractice(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const m = await fetchYoutubeOembedMeta(u);
      if (cancelled) return;
      if (m?.embedDenied) {
        setTitle(null);
        setSuppressStanzaPractice(true);
        return;
      }
      if (m?.title) {
        setTitle(m.title);
        setSuppressStanzaPractice(false);
        return;
      }
      setSuppressStanzaPractice(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [watchUrl]);

  return { title, suppressStanzaPractice };
}
