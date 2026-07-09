import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import { touchLabsGoogleSessionConsumer } from '../shared/google/labsGoogleSessionConsumers';
import { AppShellLayout } from '../shared/layout/AppShellLayout';
import { LabsUndoProvider } from '../shared/undo/LabsUndoContext';
import { LyreflyAppHeader } from './components/LyreflyAppHeader';
import { ProjectWorkbench } from './components/ProjectWorkbench';
import { ShowcaseGallery } from './components/ShowcaseGallery';
import { LyreflyDriveBackupProvider } from './context/LyreflyDriveBackupContext';
import { applyLyreflyRisoCubeCssVars } from './design/risoCubeTheme';
import { useLyreflyUrlState } from './hooks/useLyreflyUrlState';
import { lyreflyGalleryHref, navigateLyreflyHash } from './routes/lyreflyHash';

export default function App(): ReactElement {
  const appRef = useRef<HTMLDivElement>(null);
  const { route, openGallery, openProject, openScript } = useLyreflyUrlState();

  useLayoutEffect(() => {
    if (appRef.current) applyLyreflyRisoCubeCssVars(appRef.current);
  }, []);

  useEffect(() => {
    touchLabsGoogleSessionConsumer('lyrefly');
    if (!window.location.hash) {
      navigateLyreflyHash(lyreflyGalleryHref());
    }
  }, []);

  let mainContent: ReactElement;
  if (route.kind === 'script') {
    mainContent = (
      <ProjectWorkbench projectId={route.projectId} initialStage="script" onBack={openGallery} />
    );
  } else if (route.kind === 'project') {
    mainContent = (
      <ProjectWorkbench
        projectId={route.projectId}
        initialStage={route.stage}
        onBack={openGallery}
      />
    );
  } else {
    mainContent = <ShowcaseGallery onOpenProject={openProject} onOpenScript={openScript} />;
  }

  return (
    <LyreflyDriveBackupProvider>
      <LabsUndoProvider>
        <div ref={appRef} className="lyrefly-app" data-testid="lyrefly-app" data-lyrefly-theme="risocube">
          <SkipToMain />
          <main id="main">
            <AppShellLayout
              rootClassName="lyrefly-layout app-shell-root"
              header={<LyreflyAppHeader route={route} />}
            >
              {mainContent}
            </AppShellLayout>
          </main>
        </div>
      </LabsUndoProvider>
    </LyreflyDriveBackupProvider>
  );
}
