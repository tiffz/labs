import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import type { ComicProject, ComicArtVersion, PageNode, PageRevision } from '../types';
import { createPageNode, createPageNodesFromFiles } from '../db/lyreflyProjectMutations';
import { revisionMapForArtVersionView, type ArtVersionViewId } from '../utils/artVersionUtils';
import { ArtPageGrid } from './ArtPageGrid';
import { ArtVersionPanel } from './ArtVersionPanel';
import { useLabsStagedFileUploads } from '../../shared/upload/useLabsStagedFileUploads';
import { filterImageFilesForPageUpload } from '../utils/artPageUploadUtils';
import { LyreflyArtEmptyUpload } from './LyreflyArtEmptyUpload';
import { LyreflyPrintSpecPanel } from './LyreflyPrintSpecPanel';

export type ArtStageProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions: ComicArtVersion[];
  onProjectChange: (project: ComicProject) => void;
};

export function ArtStage({
  project,
  pageNodes,
  revisions,
  artVersions,
  onProjectChange,
}: ArtStageProps): ReactElement {
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [viewingVersionId, setViewingVersionId] = useState<ArtVersionViewId>('current');

  const viewingRevisionByPageId = useMemo(
    () => revisionMapForArtVersionView(viewingVersionId, artVersions),
    [artVersions, viewingVersionId],
  );
  const strictVersionView = viewingVersionId !== 'current';

  const handleAddPage = async (): Promise<void> => {
    setAdding(true);
    try {
      await createPageNode(project);
    } finally {
      setAdding(false);
    }
  };

  const handleBulkUpload = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;
      setImporting(true);
      setImportStatus(null);
      try {
        const { created, skippedNonImage } = await createPageNodesFromFiles(project, files);
        if (created.length === 0) {
          setImportStatus('No image files found. Use PNG, JPG, or WebP page art.');
          return;
        }
        const skippedNote = skippedNonImage > 0 ? ` (${skippedNonImage} non-image skipped)` : '';
        setImportStatus(`Added ${created.length} page${created.length === 1 ? '' : 's'}${skippedNote}.`);
      } finally {
        setImporting(false);
      }
    },
    [project],
  );

  // Picks, drops and pastes stage for review; pages are created on confirm (ADR 0030).
  const pageUploads = useLabsStagedFileUploads({
    accepts: (file) => filterImageFilesForPageUpload([file]).length === 1,
    rejectMessage: "That file isn't an image. Use PNG, JPG, or WebP page art.",
    outcome: 'Adds a new page',
    onCommitAll: handleBulkUpload,
    confirmLabel: (n) => (n === 1 ? 'Add page' : `Add ${n} pages`),
    title: 'Pages ready to add',
  });
  const { stageFiles: stagePageFiles, saveFiles: savePageFiles } = pageUploads;

  const busy = adding || importing;

  return (
    <Box
      className="lyrefly-art-stage lyrefly-stage-body"
      data-testid="lyrefly-art-stage"
      sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
    >
      {importStatus ? (
        <Typography
          variant="body2"
          aria-live="polite"
          sx={{
            color: "text.secondary",
            mb: 1.25
          }}>
          {importStatus}
        </Typography>
      ) : null}
      {pageUploads.panel}
      <LyreflyPrintSpecPanel project={project} onProjectChange={onProjectChange} />
      {pageNodes.length === 0 ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <p className="lyrefly-art-empty__lede">
            Add your first pages from a folder, or start with one blank tile and build the grid by hand.
          </p>
          <LyreflyArtEmptyUpload disabled={busy} onFiles={stagePageFiles} onDropFiles={savePageFiles} />
          <button
            type="button"
            className="lyrefly-art-empty__secondary-action"
            disabled={busy}
            onClick={() => void handleAddPage()}
          >
            Or add a blank page
          </button>
        </Box>
      ) : (
        <>
          <ArtVersionPanel
            project={project}
            pageNodes={pageNodes}
            revisions={revisions}
            artVersions={artVersions}
            viewingVersionId={viewingVersionId}
            onViewingVersionChange={setViewingVersionId}
            onProjectChange={onProjectChange}
          />
          <Typography component="h3" className="lyrefly-section-eyebrow" sx={{ mt: 1.75, mb: 0.75 }}>
            Pages
            {strictVersionView ? (
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: "text.secondary",
                  ml: 1,
                  fontWeight: 500
                }}>
                Viewing a saved version. Switch to Latest to edit live art.
              </Typography>
            ) : null}
          </Typography>
          <ArtPageGrid
            project={project}
            pageNodes={pageNodes}
            revisions={revisions}
            busy={busy}
            onBulkUpload={strictVersionView ? undefined : stagePageFiles}
            onAddBlankPage={strictVersionView ? undefined : () => void handleAddPage()}
            viewingRevisionByPageId={viewingRevisionByPageId}
            strictVersionView={strictVersionView}
          />
        </>
      )}
    </Box>
  );
}
