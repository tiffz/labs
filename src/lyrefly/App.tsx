import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import { LabsKeyboardShortcutsHost } from '../shared/keyboardShortcuts';
import { touchLabsGoogleSessionConsumer } from '../shared/google/labsGoogleSessionConsumers';
import { AppShellLayout } from '../shared/layout/AppShellLayout';
import { LabsUndoProvider } from '../shared/undo/LabsUndoContext';
import { ComicProfileLoading, ComicProfileView } from './components/ComicProfileView';
import { LyreflyAppHeader } from './components/LyreflyAppHeader';
import { LyreflyProfileChrome } from './components/LyreflyProfileChrome';
import { ShowcaseGallery } from './components/ShowcaseGallery';
// Split off the routes the gallery landing never needs. The workbench in
// particular pulls the whole editor; loading it up front delayed first paint
// for everyone, including the majority who land on the gallery and stay there.
const ProjectWorkbench = lazy(() =>
  import('./components/ProjectWorkbench').then((m) => ({ default: m.ProjectWorkbench }))
);
const SketchbookTab = lazy(() =>
  import('./components/SketchbookTab').then((m) => ({ default: m.SketchbookTab }))
);
const LyreflyVersionShareView = lazy(() =>
  import('./components/LyreflyVersionShareView').then((m) => ({
    default: m.LyreflyVersionShareView,
  }))
);
import { LyreflyDriveBackupProvider } from './context/LyreflyDriveBackupContext';
import { applyLyreflyRisoCubeCssVars } from './design/risoCubeTheme';
import {
  useLyreflyArchive,
  useLyreflyArtVersions,
  useLyreflyPageNodes,
  useLyreflyPageRevisions,
  useLyreflyProject,
  useLyreflyScriptDocument,
  useLyreflyVisualDevAssets,
} from './hooks/useLyreflyProjectData';
import { useLyreflyUrlState } from './hooks/useLyreflyUrlState';
import { lyreflyKeyboardShortcutSections } from './keyboard/lyreflyKeyboardShortcuts';
import { inferredWorkflowStage } from './workflow/lyreflyWorkflowCompletion';
import { lyreflyGalleryHref, navigateLyreflyHash } from './routes/lyreflyHash';
import { seedLyreflyE2eProjectIfEmpty } from './e2e/lyreflyE2eSeed';

function ComicProfileRoute({ projectId }: { projectId: string }): ReactElement {
  const { project, projectHydrated } = useLyreflyProject(projectId);
  const { script } = useLyreflyScriptDocument(project?.scriptDocumentId ?? null);
  const { assets } = useLyreflyVisualDevAssets(projectId);
  const { pageNodes } = useLyreflyPageNodes(projectId);
  const pageNodeIds = pageNodes.map((node) => node.id);
  const { revisions } = useLyreflyPageRevisions(pageNodeIds);
  const { artVersions } = useLyreflyArtVersions(projectId);
  const { archive, archiveHydrated } = useLyreflyArchive(project?.archiveId);

  if (!projectHydrated || !project) {
    return (
      <div className="lyrefly-workbench lyrefly-workbench--profile">
        <ComicProfileLoading />
      </div>
    );
  }

  const editorStage = inferredWorkflowStage(project, {
    script,
    visualDevCount: assets.length,
    pageNodeCount: pageNodes.length,
    revisionCount: revisions.length,
    archive,
  });

  return (
    <div className="lyrefly-workbench lyrefly-workbench--profile" data-testid="lyrefly-profile-workbench">
      <LyreflyProfileChrome project={project} editorStage={editorStage} />
      <div className="lyrefly-workbench__stage lyrefly-workbench__stage--profile">
        <ComicProfileView
          project={project}
          script={script}
          assets={assets}
          pageNodes={pageNodes}
          revisions={revisions}
          artVersions={artVersions}
          archive={archive}
          archiveHydrated={archiveHydrated}
        />
      </div>
    </div>
  );
}

export default function App(): ReactElement {
  const appRef = useRef<HTMLDivElement>(null);
  const { route, openGallery, openProject, openProfile } = useLyreflyUrlState();
  const e2eSeedRequested =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2eSeed') === '1';
  const [e2eSeedReady, setE2eSeedReady] = useState(() => !e2eSeedRequested);

  useLayoutEffect(() => {
    if (appRef.current) applyLyreflyRisoCubeCssVars(appRef.current);
  }, []);

  useEffect(() => {
    touchLabsGoogleSessionConsumer('lyrefly');
    if (e2eSeedRequested) {
      void seedLyreflyE2eProjectIfEmpty().finally(() => setE2eSeedReady(true));
    }
    if (!window.location.hash) {
      navigateLyreflyHash(lyreflyGalleryHref());
    }
  }, [e2eSeedRequested]);

  let mainContent: ReactElement;
  if (!e2eSeedReady) {
    mainContent = (
      <div className="lyrefly-workbench lyrefly-workbench--profile">
        <ComicProfileLoading />
      </div>
    );
  } else if (route.kind === 'share') {
    mainContent = <LyreflyVersionShareView fileId={route.fileId} />;
  } else if (route.kind === 'script') {
    mainContent = (
      <ProjectWorkbench projectId={route.projectId} initialStage="script" onBack={openGallery} />
    );
  } else if (route.kind === 'profile') {
    mainContent = <ComicProfileRoute projectId={route.projectId} />;
  } else if (route.kind === 'project') {
    mainContent = (
      <ProjectWorkbench
        projectId={route.projectId}
        initialStage={route.stage}
        onBack={openGallery}
      />
    );
  } else if (route.kind === 'sketchbook') {
    mainContent = <SketchbookTab onOpenProject={openProject} />;
  } else {
    mainContent = <ShowcaseGallery onOpenProject={openProject} onOpenProfile={openProfile} />;
  }

  return (
    <LyreflyDriveBackupProvider>
      <LabsUndoProvider>
        <LabsKeyboardShortcutsHost sections={lyreflyKeyboardShortcutSections} theme="default">
          <div ref={appRef} className="lyrefly-app" data-testid="lyrefly-app" data-lyrefly-theme="risocube">
            <SkipToMain />
            <main id="main">
              <AppShellLayout
                rootClassName="lyrefly-layout app-shell-root"
                header={<LyreflyAppHeader route={route} />}
              >
                {/* Reuses the profile loading state so a lazy route arriving
                    looks the same as data arriving. */}
                <Suspense
                  fallback={
                    <div className="lyrefly-workbench lyrefly-workbench--profile">
                      <ComicProfileLoading />
                    </div>
                  }
                >
                  {mainContent}
                </Suspense>
              </AppShellLayout>
            </main>
          </div>
        </LabsKeyboardShortcutsHost>
      </LabsUndoProvider>
    </LyreflyDriveBackupProvider>
  );
}
