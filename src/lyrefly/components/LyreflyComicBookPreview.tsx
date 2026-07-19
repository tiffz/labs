import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactElement } from 'react';

import type { ComicProject, PageNode, PageRevision } from '../types';
import { loadLyreflyExportPages } from '../exports/lyreflyComicExport';
import { buildComicSpreadViews, type ComicPreviewPage } from '../utils/comicSpreadViews';
import {
  bleedConfigForPrintSpec,
  resolveLyreflyPrintSpec,
  trimSizeFromPrintSpec,
} from '../utils/lyreflyPrintSpec';
import { BleedGuideOverlay } from '../../shared/zine/BleedGuideOverlay';
import { bleedOverlayPercents as computeBleedOverlayPercents, type BleedGuidePageSide } from '../../shared/zine/bleedConfig';

import '../../shared/zine/bleedGuideOverlay.css';

export type LyreflyComicBookPreviewProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  /** Override which revision is used per page (saved art version). */
  revisionByPageId?: Record<string, string>;
  /** When true, ←/→ flip pages while this preview is mounted (dialog or active studio tab). */
  captureArrowKeys?: boolean;
  /** Overlay Mixam trim / bleed / safe-zone guides on page art. */
  showBleedGuides?: boolean;
};

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

type ArrowKeyEvent = Pick<KeyboardEvent, 'key' | 'preventDefault'> & { target: EventTarget | null };

function handleBookPreviewArrowKey(
  event: ArrowKeyEvent,
  spreadCount: number,
  spreadIndex: number,
  goPrev: () => void,
  goNext: () => void,
): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (isEditableKeyboardTarget(event.target)) return;

  if (event.key === 'ArrowLeft') {
    if (spreadIndex <= 0) return;
    event.preventDefault();
    goPrev();
    return;
  }

  if (spreadIndex >= spreadCount - 1) return;
  event.preventDefault();
  goNext();
}

export function LyreflyComicBookPreview({
  project,
  pageNodes,
  revisions,
  revisionByPageId,
  captureArrowKeys = false,
  showBleedGuides = false,
}: LyreflyComicBookPreviewProps): ReactElement {
  const [loading, setLoading] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [pages, setPages] = useState<ComicPreviewPage[]>([]);
  const revisionMapKey = useMemo(() => JSON.stringify(revisionByPageId ?? null), [revisionByPageId]);

  const spreadViews = useMemo(() => buildComicSpreadViews(pages), [pages]);
  const guidePercents = useMemo(() => {
    const spec = resolveLyreflyPrintSpec(project);
    return computeBleedOverlayPercents(trimSizeFromPrintSpec(spec), bleedConfigForPrintSpec(spec));
  }, [project]);

  const renderGuidedImage = (
    page: ComicPreviewPage,
    pageSide: BleedGuidePageSide,
    className: string,
  ): ReactElement | null => {
    if (page.isBlank || !page.imageUrl) return null;
    return (
      <div className="lyrefly-book-preview__page-frame">
        <img src={page.imageUrl} alt={page.label} className={className} />
        <BleedGuideOverlay
          percents={guidePercents}
          show={showBleedGuides}
          pageSide={pageSide}
        />
      </div>
    );
  };

  const goPrev = useCallback(() => {
    setSpreadIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    setSpreadIndex((index) => Math.min(spreadViews.length - 1, index + 1));
  }, [spreadViews.length]);

  useEffect(() => {
    if (!captureArrowKeys || spreadViews.length === 0) return undefined;

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      handleBookPreviewArrowKey(event, spreadViews.length, spreadIndex, goPrev, goNext);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [captureArrowKeys, goNext, goPrev, spreadIndex, spreadViews.length]);

  const onPreviewKeyDownCapture = (event: KeyboardEvent<HTMLElement>): void => {
    if (captureArrowKeys) return;
    handleBookPreviewArrowKey(event, spreadViews.length, spreadIndex, goPrev, goNext);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadLyreflyExportPages(project, pageNodes, revisions, {
      revisionByPageId: revisionByPageId,
      strictRevisionMap: revisionByPageId !== undefined,
    })
      .then((loaded) => {
        if (cancelled) return;
        setPages(
          loaded.map((page) => ({
            id: page.node.id,
            label: page.node.displayName ?? 'Page',
            imageUrl: page.dataUrl,
            isSpread: page.node.isSpread,
          })),
        );
        setSpreadIndex(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageNodes, project, revisionMapKey, revisions, revisionByPageId]);

  if (loading) {
    return (
      <Box className="lyrefly-book-preview lyrefly-book-preview--loading" data-testid="lyrefly-book-preview">
        <CircularProgress size={28} aria-label="Loading comic preview" />
      </Box>
    );
  }

  if (spreadViews.length === 0) {
    return (
      <Box className="lyrefly-book-preview lyrefly-book-preview--empty" data-testid="lyrefly-book-preview">
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Upload page art in Draw to preview your comic here.
        </Typography>
      </Box>
    );
  }

  const current = spreadViews[spreadIndex]!;
  const atStart = spreadIndex <= 0;
  const atEnd = spreadIndex >= spreadViews.length - 1;
  const pageCaption = current.isSpread
    ? current.left.label
    : current.right
      ? `${current.left.label || 'Blank'} · ${current.right.label}`
      : current.left.label;
  const spreadClass = current.isSpread
    ? 'lyrefly-book-preview__spread--wide'
    : current.isOpening
      ? 'lyrefly-book-preview__spread--opening'
      : current.right
        ? 'lyrefly-book-preview__spread--pair'
        : 'lyrefly-book-preview__spread--single';

  return (
    <Box
      className="lyrefly-book-preview"
      data-testid="lyrefly-book-preview"
      tabIndex={captureArrowKeys ? undefined : 0}
      role="region"
      aria-label="Comic book preview. Use left and right arrow keys to turn pages."
      onKeyDownCapture={onPreviewKeyDownCapture}
    >
      <div className="lyrefly-book-preview__stage">
        <IconButton
          size="small"
          aria-label="Previous spread"
          disabled={atStart}
          onClick={goPrev}
          className="lyrefly-book-preview__nav lyrefly-book-preview__nav--prev"
        >
          <ChevronLeftIcon />
        </IconButton>

        <figure className={['lyrefly-book-preview__spread', spreadClass].join(' ')}>
          {current.isSpread ? (
            renderGuidedImage(current.left, 'spread', 'lyrefly-book-preview__image lyrefly-book-preview__image--spread')
          ) : (
            <>
              {current.isOpening ? <span className="lyrefly-book-preview__blank" aria-hidden /> : null}
              {renderGuidedImage(current.left, current.right ? 'left' : 'single', 'lyrefly-book-preview__image')}
              {current.right
                ? renderGuidedImage(current.right, 'right', 'lyrefly-book-preview__image')
                : null}
            </>
          )}
        </figure>

        <IconButton
          size="small"
          aria-label="Next spread"
          disabled={atEnd}
          onClick={goNext}
          className="lyrefly-book-preview__nav lyrefly-book-preview__nav--next"
        >
          <ChevronRightIcon />
        </IconButton>
      </div>
      <div className="lyrefly-book-preview__meta">
        <Typography variant="caption" component="p" className="lyrefly-book-preview__label">
          {pageCaption}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {spreadIndex + 1} / {spreadViews.length}
        </Typography>
      </div>
    </Box>
  );
}
