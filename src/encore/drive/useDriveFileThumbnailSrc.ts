import { useCallback, useEffect, useState } from 'react';
import { getDriveThumbnailLinkCached, invalidateDriveThumbnailLinkCache } from './driveThumbnailLinkCache';

/**
 * Resolves a Drive file thumbnail: OAuth `thumbnailLink` when token present, else caller’s fallback only.
 */
export function useDriveFileThumbnailSrc(
  fileId: string | null | undefined,
  googleAccessToken: string | null | undefined,
  fallbackUrl: string | null,
): { src: string | null; swallowErrorTryFallback: () => boolean } {
  const id = fileId?.trim() ?? '';
  const token = googleAccessToken?.trim() ?? '';
  const [apiUrl, setApiUrl] = useState<string | null>(null);

  useEffect(() => {
    setApiUrl(null);
    if (!id || !token) return;
    let cancelled = false;
    void getDriveThumbnailLinkCached(token, id).then((url) => {
      if (!cancelled && url) setApiUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const swallowErrorTryFallback = useCallback((): boolean => {
    if (apiUrl) {
      invalidateDriveThumbnailLinkCache(id);
      setApiUrl(null);
      return true;
    }
    return false;
  }, [apiUrl, id]);

  const src = (apiUrl ?? fallbackUrl) || null;
  return { src, swallowErrorTryFallback };
}
