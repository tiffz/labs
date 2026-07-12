import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement } from 'react';

import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import {
  downloadLyreflyDistributionPdf,
  downloadLyreflyMixamZip,
  downloadLyreflyPlatformZip,
  loadLyreflyExportPages,
} from '../exports/lyreflyComicExport';
import {
  artVersionPickerLabel,
  defaultArtVersionPickerValue,
  revisionMapForArtVersionPicker,
  type ArtVersionPickerValue,
} from '../utils/artVersionUtils';
import { LyreflyArtVersionPicker } from './LyreflyArtVersionPicker';
import { LyreflyComicBookPreviewDialog } from './LyreflyComicBookPreviewDialog';
import { LyreflyComicReaderDialog } from './LyreflyComicReaderDialog';

export type LyreflyExportPanelProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions?: ComicArtVersion[];
};

export function LyreflyExportPanel({
  project,
  pageNodes,
  revisions,
  artVersions = [],
}: LyreflyExportPanelProps): ReactElement {
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [scrollOpen, setScrollOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [versionPicker, setVersionPicker] = useState<ArtVersionPickerValue>(() =>
    defaultArtVersionPickerValue(project),
  );
  const artCount = useMemo(
    () => revisions.filter((revision) => pageNodes.some((node) => node.id === revision.pageNodeId)).length,
    [pageNodes, revisions],
  );

  const runExport = async (kind: string, action: () => Promise<void>): Promise<void> => {
    setBusy(kind);
    try {
      await action();
    } finally {
      setBusy(null);
      setPdfProgress(null);
    }
  };

  const revisionByPageId = useMemo(
    () => revisionMapForArtVersionPicker(versionPicker, artVersions),
    [artVersions, versionPicker],
  );
  const previewSuffix = useMemo(() => {
    if (versionPicker === 'current') return undefined;
    return artVersionPickerLabel(versionPicker, artVersions);
  }, [artVersions, versionPicker]);

  const withPages = async (action: (pages: Awaited<ReturnType<typeof loadLyreflyExportPages>>) => Promise<void>) => {
    const pages = await loadLyreflyExportPages(project, pageNodes, revisions, {
      revisionByPageId,
      strictRevisionMap: versionPicker !== 'current',
    });
    if (pages.length === 0) return;
    await action(pages);
  };

  const pdfLabel =
    busy === 'pdf' && pdfProgress != null
      ? `Building PDF… ${Math.round(pdfProgress * 100)}%`
      : busy === 'pdf'
        ? 'Building PDF…'
        : 'Download PDF';

  return (
    <Box className="lyrefly-export-panel" data-testid="lyrefly-export-panel">
      <Typography component="h3" className="lyrefly-section-eyebrow" sx={{ mb: 0.75 }}>
        Export and preview
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        className="lyrefly-panel-helper"
        sx={{ mb: 1.5, lineHeight: 1.55, maxWidth: '40rem' }}
      >
        {artCount === 0
          ? 'Add page art in Draw before exporting or previewing.'
          : 'Preview as a book or vertical scroll (Tapas, WEBTOON, and similar), or download pages for print and web platforms.'}
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
        className="lyrefly-export-panel__actions"
        sx={{ mb: 1 }}
      >
        {artVersions.length > 0 ? (
          <LyreflyArtVersionPicker
            project={project}
            artVersions={artVersions}
            value={versionPicker}
            onChange={setVersionPicker}
            disabled={busy !== null}
            compact
            className="lyrefly-export-panel__version-picker"
          />
        ) : null}
        <Button
          size="small"
          variant="outlined"
          disabled={artCount === 0 || busy !== null}
          onClick={() => setBookOpen(true)}
        >
          Book preview
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={artCount === 0 || busy !== null}
          onClick={() => setScrollOpen(true)}
        >
          Scroll preview
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={artCount === 0 || busy !== null}
          onClick={() =>
            void runExport('pdf', () =>
              withPages((pages) =>
                downloadLyreflyDistributionPdf(project, pages, (progress) => setPdfProgress(progress)),
              ),
            )
          }
        >
          {pdfLabel}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={artCount === 0 || busy !== null}
          onClick={() =>
            void runExport('mixam', () => withPages((pages) => downloadLyreflyMixamZip(project, pages)))
          }
        >
          {busy === 'mixam' ? 'Zipping…' : 'Mixam ZIP'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={artCount === 0 || busy !== null}
          onClick={() =>
            void runExport('tapas', () =>
              withPages((pages) => downloadLyreflyPlatformZip(project, pages, 'tapas')),
            )
          }
        >
          {busy === 'tapas' ? 'Zipping…' : 'Tapas ZIP'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={artCount === 0 || busy !== null}
          onClick={() =>
            void runExport('webtoon', () =>
              withPages((pages) => downloadLyreflyPlatformZip(project, pages, 'webtoon')),
            )
          }
        >
          {busy === 'webtoon' ? 'Zipping…' : 'WEBTOON ZIP'}
        </Button>
      </Stack>

      <LyreflyComicReaderDialog
        open={scrollOpen}
        onClose={() => setScrollOpen(false)}
        project={project}
        pageNodes={pageNodes}
        revisions={revisions}
        revisionByPageId={revisionByPageId}
        titleSuffix={previewSuffix}
      />
      <LyreflyComicBookPreviewDialog
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        project={project}
        pageNodes={pageNodes}
        revisions={revisions}
        revisionByPageId={revisionByPageId}
        titleSuffix={previewSuffix}
      />
    </Box>
  );
}
