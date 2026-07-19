import { useEffect, useRef, useState } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import {
  LabsKeyboardShortcutsHost,
  zineboxKeyboardShortcutSections,
} from '../shared/keyboardShortcuts';
import { LabsUndoProvider } from '../shared/undo/LabsUndoContext';
import { AppShellLayout } from '../shared/layout/AppShellLayout';
import { readLabsDebugFromLocation } from '../shared/debug/readLabsDebugParams';
import LibraryView from './components/LibraryView';
import ZineboxDebugPanel from './components/ZineboxDebugPanel';
import ZineboxDesignThemePicker from './components/ZineboxDesignThemePicker';
import { useZineboxDesignTheme } from './context/useZineboxDesignTheme';
import { isZineboxDesignPreviewEnabled } from './design/zineboxDesignThemes';
import { ZineboxDriveBackupProvider } from './context/ZineboxDriveBackupContext';
import { useZineboxUrlState } from './hooks/useZineboxUrlState';
import ReaderView from './reader/ReaderView';
import { navigateZineboxHash, zineboxLibraryHref } from './routes/zineboxHash';

function useZineboxDebugMode(): boolean {
  const [debugMode, setDebugMode] = useState(() =>
    typeof window !== 'undefined' ? readLabsDebugFromLocation().debug : false,
  );

  useEffect(() => {
    setDebugMode(readLabsDebugFromLocation().debug);
  }, []);

  return debugMode;
}

export default function App(): React.ReactElement {
  const appRef = useRef<HTMLDivElement>(null);
  const debugMode = useZineboxDebugMode();
  const showDesignPicker = isZineboxDesignPreviewEnabled();
  const { applyToElement } = useZineboxDesignTheme();
  const {
    route,
    libraryParams,
    readerParams,
    setLibraryParams,
    setReaderParams,
    openReader,
    closeReader,
  } = useZineboxUrlState();

  useEffect(() => {
    applyToElement(appRef.current);
  }, [applyToElement]);

  useEffect(() => {
    if (!window.location.hash) {
      navigateZineboxHash(zineboxLibraryHref(libraryParams));
    }
  }, [libraryParams]);

  const content =
    route.kind === 'read' ? (
      <ReaderView
        comicId={route.comicId}
        mode={readerParams.mode}
        spreadOffset={readerParams.spreadOffset}
        onModeChange={(mode) => setReaderParams({ mode })}
        onSpreadOffsetChange={(spreadOffset) => setReaderParams({ spreadOffset })}
        onClose={closeReader}
      />
    ) : (
      <LibraryView
        libraryParams={libraryParams}
        readerParams={readerParams}
        onLibraryParamsChange={setLibraryParams}
        onOpenComic={openReader}
      />
    );

  return (
    <LabsUndoProvider>
      <LabsKeyboardShortcutsHost sections={zineboxKeyboardShortcutSections}>
        <ZineboxDriveBackupProvider>
          <div ref={appRef} className="zinebox-app">
            <SkipToMain />
            <main id="main">
              <AppShellLayout
                header={showDesignPicker && route.kind === 'library' ? <ZineboxDesignThemePicker /> : null}
                footer={null}
              >
                {content}
              </AppShellLayout>
            </main>
            {debugMode ? <ZineboxDebugPanel /> : null}
          </div>
        </ZineboxDriveBackupProvider>
      </LabsKeyboardShortcutsHost>
    </LabsUndoProvider>
  );
}
