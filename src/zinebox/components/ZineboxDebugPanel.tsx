import { useCallback, useState } from 'react';
import Typography from '@mui/material/Typography';

import LabsDebugDock from '../../shared/components/LabsDebugDock';
import LabsDebugButton from '../../shared/components/LabsDebugButton';
import LabsDebugStateDump from '../../shared/components/LabsDebugStateDump';
import { clearZineboxLocalData } from '../db/clearZineboxLocalData';
import { mockImportFromDrive } from '../db/mockDriveImport';
import { useZineboxCollections, useZineboxComics } from '../hooks/useZineboxComics';
import { navigateZineboxHash, zineboxLibraryHref } from '../routes/zineboxHash';

const ACCENT = '#ff1493';

export default function ZineboxDebugPanel(): React.ReactElement {
  const { comics, comicsHydrated } = useZineboxComics();
  const { collections, collectionsHydrated } = useZineboxCollections();
  const [busy, setBusy] = useState(false);

  const handleClearLibrary = useCallback(async () => {
    if (
      !window.confirm(
        'Clear the Zine Box library? This removes comics, stacks, and local PDF files stored for Zine Box only. Other Labs apps and your Google sign-in are not affected.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await clearZineboxLocalData();
      navigateZineboxHash(zineboxLibraryHref({ filter: 'all', source: null, tag: null, q: null }));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleImportSample = useCallback(async () => {
    setBusy(true);
    try {
      await mockImportFromDrive({ force: true });
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <LabsDebugDock
      appId="zinebox"
      title="Zine Box debug"
      accentColor={ACCENT}
      defaultCollapsed={false}
      layout="toolbar-top"
      toolbar={
        <>
          <LabsDebugButton variant="danger" disabled={busy} onClick={() => void handleClearLibrary()}>
            Clear library
          </LabsDebugButton>
          <LabsDebugButton disabled={busy} onClick={() => void handleImportSample()}>
            Sample library
          </LabsDebugButton>
        </>
      }
    >
      <LabsDebugStateDump
        data={{
          comicsHydrated,
          collectionsHydrated,
          comicCount: comics.length,
          stackCount: collections.length,
          e2eSeed: typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2eSeed'),
        }}
      />
      <Typography component="p" sx={{ m: 0, p: 1, pt: 0, fontSize: 10, lineHeight: 1.45, color: '#94a3b8' }}>
        Clear library wipes IndexedDB for Zine Box only (comics, stacks, PDF blobs). Encore, Gesture, Stanza, and
        Google sign-in are untouched.
      </Typography>
    </LabsDebugDock>
  );
}
