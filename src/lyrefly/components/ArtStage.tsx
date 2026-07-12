import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { DragDropFileUpload } from '../../shared/components/DragDropFileUpload';
import type { ComicProject, ComicArtVersion, PageNode, PageRevision } from '../types';
import { createPageNode, createPageNodesFromFiles } from '../db/lyreflyProjectMutations';
import { revisionMapForArtVersionView, type ArtVersionViewId } from '../utils/artVersionUtils';
import { ArtPageGrid, PAGE_IMAGE_ACCEPT } from './ArtPageGrid';
import { ArtVersionPanel } from './ArtVersionPanel';

export type ArtStageProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions: ComicArtVersion[];
  onProjectChange: (project: ComicProject) => void;
};

const BULK_UPLOAD_HELPER =
  'Drop a folder of page art. Files are sorted by Mixam-style names like front.png, page1.png, page2-3.jpg.';

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

  const busy = adding || importing;

  return (
    <Box
      className="lyrefly-art-stage lyrefly-stage-body"
      data-testid="lyrefly-art-stage"
      sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, maxWidth: '44rem', lineHeight: 1.5 }}>
        Pick a version above, then review or edit pages below. Upload art per tile, or add more pages at the end of the
        grid.
      </Typography>

      {importStatus ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }} aria-live="polite">
          {importStatus}
        </Typography>
      ) : null}

      {pageNodes.length === 0 ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DragDropFileUpload
            tone="neutral"
            multiple
            expandOnDrag
            accept={PAGE_IMAGE_ACCEPT}
            disabled={busy}
            label="Upload your page art"
            helperText={BULK_UPLOAD_HELPER}
            ariaLabel="Upload comic page images"
            onFiles={(files) => void handleBulkUpload(files)}
            sx={{ flex: 1, minHeight: 'min(52vh, 420px)' }}
          />
          <Button
            variant="text"
            size="small"
            disabled={busy}
            onClick={() => void handleAddPage()}
            sx={{ alignSelf: 'flex-start', mt: 1.5 }}
          >
            Or add a blank page
          </Button>
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
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                Viewing a saved version. Switch to Current picks to edit live art.
              </Typography>
            ) : null}
          </Typography>
          <ArtPageGrid
            project={project}
            pageNodes={pageNodes}
            revisions={revisions}
            busy={busy}
            onBulkUpload={strictVersionView ? undefined : (files) => void handleBulkUpload(files)}
            onAddBlankPage={strictVersionView ? undefined : () => void handleAddPage()}
            viewingRevisionByPageId={viewingRevisionByPageId}
            strictVersionView={strictVersionView}
          />
        </>
      )}
    </Box>
  );
}
