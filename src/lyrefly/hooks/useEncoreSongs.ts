import { useEffect, useState } from 'react';

import { readEncoreOriginals, type EncoreOriginalsRead } from '../../shared/federation/encoreOriginalsReader';
import { ensureLyreflyGoogleDriveAccess } from '../drive/lyreflyGoogleDriveAccess';

/** Encore songs for the Sketchbook. `null` while loading; never prompts a sign-in. */
export function useEncoreSongs(): EncoreOriginalsRead | null {
  const [read, setRead] = useState<EncoreOriginalsRead | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let token: string;
      try {
        token = await ensureLyreflyGoogleDriveAccess({ interactive: false });
      } catch {
        if (!cancelled) setRead({ status: 'unavailable', reason: 'Sign in to see your Encore songs.' });
        return;
      }
      const next = await readEncoreOriginals(token);
      if (!cancelled) setRead(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return read;
}
