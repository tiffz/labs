import { useEffect } from 'react';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { warmGesturePreviewUrls } from '../media/gesturePreviewImageUrl';

/** Resolve collection-card preview URLs once per visible pack list (deduped in preview cache). */
export function useGestureCollectionPreviewWarmup(fileIds: string[]): void {
  const key = [...new Set(fileIds.filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    void (async () => {
      const token = await readGestureDriveAccessToken();
      if (cancelled) return;
      await warmGesturePreviewUrls(token, key.split(','));
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);
}
