import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState, type ReactElement } from 'react';

import type { ComicArchiveBinder, ComicArtVersion, ComicProject, PageNode, PageRevision, ScriptDocument, VisualDevAsset } from '../types';
import { workflowStageShelfLabel } from '../hooks/useLyreflyShelfPreviews';
import { inferredWorkflowStage } from '../workflow/lyreflyWorkflowCompletion';
import { LyreflyExportPanel } from './LyreflyExportPanel';
import { LyreflyMemoriesPanel } from './LyreflyMemoriesPanel';
import { LyreflyProfileStudioTabs } from './LyreflyProfileStudioTabs';
import { LyreflyPublishLogGrid } from './LyreflyPublishLogGrid';
import { LyreflyShelfCover } from './LyreflyShelfCover';

export type ComicProfileViewProps = {
  project: ComicProject;
  script: ScriptDocument | null;
  assets: VisualDevAsset[];
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions: ComicArtVersion[];
  archive: ComicArchiveBinder | null;
  archiveHydrated: boolean;
};

export function ComicProfileView({
  project,
  script,
  assets,
  pageNodes,
  revisions,
  artVersions,
  archive,
  archiveHydrated,
}: ComicProfileViewProps): ReactElement {
  const [localArchive, setLocalArchive] = useState<ComicArchiveBinder | null>(archive);

  useEffect(() => {
    setLocalArchive(archive);
  }, [archive]);

  const orderedPageNodes = useMemo(() => {
    const order = new Map(project.layoutOrder.map((id, index) => [id, index]));
    return [...pageNodes].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  }, [pageNodes, project.layoutOrder]);

  const coverRevisionId = useMemo(() => {
    const front =
      orderedPageNodes.find((node) => /front cover|^front$|^cover$/i.test(node.displayName ?? '')) ??
      orderedPageNodes[0];
    return front?.activeRevisionId ?? undefined;
  }, [orderedPageNodes]);

  const workflowStage = inferredWorkflowStage(project, {
    script,
    visualDevCount: assets.length,
    pageNodeCount: pageNodes.length,
    revisionCount: revisions.length,
    archive: localArchive,
  });

  return (
    <Box className="lyrefly-profile" data-testid="lyrefly-comic-profile">
      <section className="lyrefly-profile-summary lyrefly-stage-body" aria-label="Comic summary">
        <div className="lyrefly-profile-summary__layout">
          <div className="lyrefly-profile-summary__cover">
            <LyreflyShelfCover project={project} coverRevisionId={coverRevisionId} />
          </div>
          <div className="lyrefly-profile-summary__main">
            <header className="lyrefly-profile-summary__header">
              {project.subtitle ? (
                <Typography component="p" className="lyrefly-profile-hero__eyebrow">
                  {project.subtitle}
                </Typography>
              ) : null}
              <Typography component="h2" className="lyrefly-profile-hero__title">
                {project.title}
              </Typography>
              <ul className="lyrefly-profile-hero__chips" aria-label="Project summary">
                <li className="lyrefly-profile-hero__chip">{workflowStageShelfLabel(workflowStage)}</li>
                {project.status === 'archived' ? (
                  <li className="lyrefly-profile-hero__chip">Archived</li>
                ) : null}
                <li className="lyrefly-profile-hero__chip">
                  {project.pageCount ?? orderedPageNodes.length} pages
                </li>
                <li className="lyrefly-profile-hero__chip">
                  {assets.length} concept piece{assets.length === 1 ? '' : 's'}
                </li>
                <li className="lyrefly-profile-hero__chip">
                  {localArchive?.publishLog.length ?? 0} publication
                  {(localArchive?.publishLog.length ?? 0) === 1 ? '' : 's'}
                </li>
              </ul>
            </header>

            <div className="lyrefly-profile-summary__panels">
              <div className="lyrefly-profile-publish-zone">
                <LyreflyExportPanel
                  project={project}
                  pageNodes={orderedPageNodes}
                  revisions={revisions}
                  artVersions={artVersions}
                />
                <LyreflyPublishLogGrid
                  project={project}
                  archive={localArchive}
                  archiveHydrated={archiveHydrated}
                  onArchiveChange={setLocalArchive}
                />
              </div>
              <LyreflyMemoriesPanel
                project={project}
                archive={localArchive}
                archiveHydrated={archiveHydrated}
                onArchiveChange={setLocalArchive}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="lyrefly-profile-studio-region lyrefly-stage-body" aria-label="Comic studio">
        <LyreflyProfileStudioTabs
          project={project}
          script={script}
          assets={assets}
          pageNodes={orderedPageNodes}
          revisions={revisions}
          artVersions={artVersions}
          workflowStage={workflowStage}
        />
      </section>
    </Box>
  );
}

export function ComicProfileLoading(): ReactElement {
  return (
    <Box className="lyrefly-profile lyrefly-profile--loading" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress aria-label="Loading comic profile" />
    </Box>
  );
}
