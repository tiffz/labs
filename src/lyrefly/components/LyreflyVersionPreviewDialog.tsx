import CloseIcon from '@mui/icons-material/Close';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import type { FacingSpreadPdfFormat } from '../../shared/zine';
import { ComicScrollReader } from '../../shared/zine/ComicScrollReader';
import type { ComicScrollReaderPage } from '../../shared/zine/ComicScrollReader';
import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import {
  downloadLyreflyBookSpreadPdf,
  downloadLyreflyScrollImage,
  loadLyreflyExportPages,
} from '../exports/lyreflyComicExport';
import {
  orderArtVersions,
  revisionMapForArtVersionView,
  type ArtVersionViewId,
} from '../utils/artVersionUtils';
import { LyreflyComicBookPreview } from './LyreflyComicBookPreview';
import { LyreflyPreviewDownloadMenu } from './LyreflyPreviewDownloadMenu';

const BOOK_DOWNLOAD_OPTIONS = [
  {
    id: 'digital',
    label: 'Digital PDF (spreads)',
    hint: 'Facing pages for reading on screen',
  },
  {
    id: 'print',
    label: 'Print-ready PDF (spreads)',
    hint: 'Facing pages with blank pads for print',
  },
] as const;

const SCROLL_DOWNLOAD_OPTIONS = [
  {
    id: 'scroll-jpg',
    label: 'Vertical scroll image',
    hint: 'One long JPEG, top to bottom',
  },
] as const;

export type LyreflyVersionPreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions: ComicArtVersion[];
  initialVersionId: ArtVersionViewId;
  initialTab?: 'book' | 'scroll';
};

type PreviewTab = 'book' | 'scroll';

export function LyreflyVersionPreviewDialog({
  open,
  onClose,
  project,
  pageNodes,
  revisions,
  artVersions,
  initialVersionId,
  initialTab = 'book',
}: LyreflyVersionPreviewDialogProps): ReactElement {
  const [previewVersionId, setPreviewVersionId] = useState<ArtVersionViewId>(initialVersionId);
  const [tab, setTab] = useState<PreviewTab>(initialTab);
  const [showBleedGuides, setShowBleedGuides] = useState(false);
  const [scrollPages, setScrollPages] = useState<ComicScrollReaderPage[]>([]);
  const [scrollLoading, setScrollLoading] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const orderedVersions = useMemo(
    () => orderArtVersions(project, artVersions),
    [artVersions, project],
  );
  const revisionByPageId = useMemo(
    () => revisionMapForArtVersionView(previewVersionId, artVersions),
    [artVersions, previewVersionId],
  );
  const previewLabel = useMemo(() => {
    if (previewVersionId === 'current') return 'Latest';
    return orderedVersions.find((version) => version.id === previewVersionId)?.label ?? 'Version';
  }, [orderedVersions, previewVersionId]);

  const revisionMapKey = JSON.stringify(revisionByPageId ?? null);

  useEffect(() => {
    if (!open || tab !== 'scroll') return undefined;
    let cancelled = false;
    setScrollLoading(true);
    void loadLyreflyExportPages(project, pageNodes, revisions, {
      revisionByPageId,
      strictRevisionMap: previewVersionId !== 'current',
    })
      .then((pages) => {
        if (cancelled) return;
        setScrollPages(
          pages.map((page) => ({
            id: page.node.id,
            label: page.node.displayName ?? 'Page',
            imageUrl: page.dataUrl,
            isSpread: page.node.isSpread,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setScrollLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, pageNodes, previewVersionId, project, revisionByPageId, revisionMapKey, revisions, tab]);

  const handleEntered = (): void => {
    setPreviewVersionId(initialVersionId);
    setTab(initialTab);
  };

  const handleDownload = useCallback(
    async (optionId: string) => {
      setDownloadBusy(true);
      setDownloadError(null);
      try {
        const pages = await loadLyreflyExportPages(project, pageNodes, revisions, {
          revisionByPageId,
          strictRevisionMap: previewVersionId !== 'current',
        });
        if (pages.length === 0) {
          setDownloadError('No page art to download yet.');
          return;
        }
        if (tab === 'scroll') {
          await downloadLyreflyScrollImage(project, pages);
          return;
        }
        await downloadLyreflyBookSpreadPdf(project, pages, optionId as FacingSpreadPdfFormat);
      } catch (e) {
        setDownloadError(e instanceof Error ? e.message : 'Download failed.');
      } finally {
        setDownloadBusy(false);
      }
    },
    [pageNodes, previewVersionId, project, revisionByPageId, revisions, tab],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      aria-labelledby="lyrefly-version-preview-title"
      data-testid="lyrefly-version-preview-dialog"
      slotProps={{
        transition: { onEntered: handleEntered },
        paper: { className: 'lyrefly-version-preview-dialog' }
      }}>
      <DialogTitle id="lyrefly-version-preview-title" component="div">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="h2" sx={{ m: 0, flex: 1, minWidth: 0, font: 'inherit' }}>
            Preview: {project.title}
          </Box>
          <LyreflyPreviewDownloadMenu
            options={tab === 'book' ? BOOK_DOWNLOAD_OPTIONS : SCROLL_DOWNLOAD_OPTIONS}
            busy={downloadBusy}
            onSelect={(id) => void handleDownload(id)}
            ariaLabel={tab === 'book' ? 'Download book PDF' : 'Download scroll image'}
          />
          <IconButton aria-label="Close preview" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: tab === 'scroll' ? '#0f0f10' : 'background.default', p: 0 }}>
        <Box
          className="lyrefly-version-preview-dialog__toolbar"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.25,
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: tab === 'scroll' ? 'rgba(255,255,255,0.12)' : 'divider',
          }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="lyrefly-preview-version-label">Version</InputLabel>
            <Select
              labelId="lyrefly-preview-version-label"
              label="Version"
              value={previewVersionId}
              onChange={(event) => setPreviewVersionId(event.target.value as ArtVersionViewId)}
              data-testid="lyrefly-preview-version-select"
            >
              <MenuItem value="current">Latest</MenuItem>
              {orderedVersions.map((version) => (
                <MenuItem key={version.id} value={version.id}>
                  {version.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tabs
            value={tab}
            onChange={(_event, next: PreviewTab) => setTab(next)}
            aria-label="Preview style"
            sx={{
              minHeight: 36,
              ...(tab === 'scroll'
                ? {
                    color: 'rgba(255,255,255,0.72)',
                    '& .MuiTab-root': { color: 'rgba(255,255,255,0.72)' },
                    '& .Mui-selected': { color: '#fff' },
                  }
                : {}),
            }}
          >
            <Tab
              value="book"
              icon={<MenuBookOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label="Book"
              sx={{ minHeight: 36, py: 0.5 }}
            />
            <Tab
              value="scroll"
              icon={<ViewAgendaOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label="Scroll"
              sx={{ minHeight: 36, py: 0.5 }}
            />
          </Tabs>
          {tab === 'book' ? (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showBleedGuides}
                  onChange={(event) => setShowBleedGuides(event.target.checked)}
                  data-testid="lyrefly-preview-bleed-guides"
                  slotProps={{
                    input: { 'aria-label': 'Show bleed guides in book preview' }
                  }}
                />
              }
              label="Bleed guides"
              sx={{
                ml: 'auto',
                mr: 0,
              }}
            />
          ) : null}
        </Box>

        {downloadError ? (
          <Box
            role="alert"
            sx={{
              px: 2,
              py: 1,
              fontSize: '0.875rem',
              color: tab === 'scroll' ? '#ffb4b4' : 'error.main',
              bgcolor: tab === 'scroll' ? '#1a1010' : 'transparent',
            }}
          >
            {downloadError}
          </Box>
        ) : null}
        <Box sx={{ p: tab === 'book' ? 2 : 0, minHeight: 'min(78vh, 820px)' }}>
          {tab === 'book' ? (
            <LyreflyComicBookPreview
              project={project}
              pageNodes={pageNodes}
              revisions={revisions}
              revisionByPageId={revisionByPageId}
              captureArrowKeys
              showBleedGuides={showBleedGuides}
            />
          ) : scrollLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <span className="lyrefly-version-preview-dialog__loading" aria-live="polite">
                Loading scroll preview for {previewLabel}…
              </span>
            </Box>
          ) : (
            <div className="comic-scroll-reader-shell comic-scroll-reader-shell--platform">
              <ComicScrollReader
                pages={scrollPages}
                title={`${project.title} (${previewLabel})`}
                variant="platform"
              />
            </div>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
