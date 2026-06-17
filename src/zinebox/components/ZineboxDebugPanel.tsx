import { useCallback, useState, type CSSProperties } from 'react';
import Typography from '@mui/material/Typography';

import LabsDebugDock from '../../shared/components/LabsDebugDock';
import { clearZineboxLocalData } from '../db/clearZineboxLocalData';
import { mockImportFromDrive } from '../db/mockDriveImport';
import { useZineboxCollections, useZineboxComics } from '../hooks/useZineboxComics';
import { navigateZineboxHash, zineboxLibraryHref } from '../routes/zineboxHash';

const ACCENT = '#ff1493';

const DEBUG_BTN: CSSProperties = {
  background: 'transparent',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 3,
  padding: '2px 8px',
  fontSize: 10,
  cursor: 'pointer',
};

const DEBUG_BTN_DANGER: CSSProperties = {
  ...DEBUG_BTN,
  color: '#fecaca',
  borderColor: '#991b1b',
  background: 'rgba(127, 29, 29, 0.35)',
};

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
      navigateZineboxHash(zineboxLibraryHref({ filter: 'all', source: null, tag: null }));
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
          <button
            type="button"
            style={DEBUG_BTN_DANGER}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void handleClearLibrary();
            }}
          >
            Clear library
          </button>
          <button
            type="button"
            style={DEBUG_BTN}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void handleImportSample();
            }}
          >
            Sample library
          </button>
        </>
      }
    >
      <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0, p: 1, color: '#e2e8f0' }}>
        {JSON.stringify(
          {
            comicsHydrated,
            collectionsHydrated,
            comicCount: comics.length,
            stackCount: collections.length,
            e2eSeed: typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2eSeed'),
          },
          null,
          2,
        )}
      </Typography>
      <Typography component="p" sx={{ m: 0, p: 1, pt: 0, fontSize: 10, lineHeight: 1.45, color: '#94a3b8' }}>
        Clear library wipes IndexedDB for Zine Box only (comics, stacks, PDF blobs). Encore, Gesture, Stanza, and
        Google sign-in are untouched.
      </Typography>
    </LabsDebugDock>
  );
}
