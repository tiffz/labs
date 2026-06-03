import { useEffect, useState } from 'react';
import { ensureBeatLibraryImported } from '../import/beatLibraryImport';

export type BeatLibraryMigrationNotice = {
  severity: 'info' | 'success';
  message: string;
} | null;

/**
 * Runs Find the Beat → Stanza library migration once on mount (ADR 0013).
 * Surfaces a non-blocking notice when rows are imported, merged, or upgraded.
 */
export function useBeatLibraryMigration(): {
  notice: BeatLibraryMigrationNotice;
  dismissNotice: () => void;
} {
  const [notice, setNotice] = useState<BeatLibraryMigrationNotice>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await ensureBeatLibraryImported();
        if (cancelled || !result) return;
        const { imported, merged, upgraded, skipped } = result;
        if (imported === 0 && merged === 0 && upgraded === 0 && skipped === 0) return;

        const parts: string[] = [];
        if (imported > 0) parts.push(`${imported} added`);
        if (merged > 0) parts.push(`${merged} updated`);
        if (upgraded > 0) parts.push(`${upgraded} upgraded`);
        if (skipped > 0) parts.push(`${skipped} skipped`);

        setNotice({
          severity: imported > 0 || merged > 0 ? 'success' : 'info',
          message: `Find the Beat library synced to Stanza (${parts.join(', ')}).`,
        });
      } catch {
        /* migration is best-effort; fingerprint bootstrap may retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    notice,
    dismissNotice: () => setNotice(null),
  };
}
