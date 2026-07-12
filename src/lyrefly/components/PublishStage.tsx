import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type ReactElement } from 'react';

import type { ComicArchiveBinder, ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import { LyreflyExportPanel } from './LyreflyExportPanel';
import { LyreflyPublishLogGrid } from './LyreflyPublishLogGrid';

export type PublishStageProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions: ComicArtVersion[];
  archive: ComicArchiveBinder | null;
  archiveHydrated: boolean;
};

export function PublishStage({
  project,
  pageNodes,
  revisions,
  artVersions,
  archive,
  archiveHydrated,
}: PublishStageProps): ReactElement {
  const [localArchive, setLocalArchive] = useState<ComicArchiveBinder | null>(archive);

  useEffect(() => {
    setLocalArchive(archive);
  }, [archive]);

  return (
    <Box
      className="lyrefly-publish-stage lyrefly-stage-body"
      data-testid="lyrefly-publish-stage"
      sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '40rem', lineHeight: 1.55 }}>
        Track where this comic is published. Paste a link to auto-fill the platform, then set the real publish date.
      </Typography>

      <LyreflyPublishLogGrid
        project={project}
        archive={localArchive}
        archiveHydrated={archiveHydrated}
        onArchiveChange={setLocalArchive}
      />

      <LyreflyExportPanel
        project={project}
        pageNodes={pageNodes}
        revisions={revisions}
        artVersions={artVersions}
      />
    </Box>
  );
}
