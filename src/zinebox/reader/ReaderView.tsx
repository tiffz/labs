import CircularProgress from '@mui/material/CircularProgress';
import { useCallback, useEffect, useRef, useState } from 'react';

import { zineboxDb } from '../db/zineboxDb';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import { useElementClientSize } from '../hooks/useElementClientSize';
import { useZineboxGoogleAccessToken } from '../hooks/useZineboxGoogleAccessToken';
import { useZineboxComic } from '../hooks/useZineboxComics';
import type { ZineboxReaderMode, ZineboxSpreadOffset } from '../types';
import ReaderChrome, { ReaderNavButtons } from './ReaderChrome';
import {
  advanceSpreadPage,
  clampPage,
  ComicPdfUnavailableError,
  detectWideSpreadPageNumbers,
  loadPdfDocument,
  loadPdfPageDimensions,
  pageFromProgress,
  progressFromPage,
  readerProgressPage,
  resolveComicPdfSource,
  spreadPageNumbers,
} from './pdfRender';
import {
  buildPageRenderOptions,
  createReaderPageCache,
  displayReaderPage,
  getReaderPrefetchPages,
  scheduleReaderPagePrefetch,
} from './readerPageCache';

type ReaderViewProps = {
  comicId: string;
  mode: ZineboxReaderMode;
  spreadOffset: ZineboxSpreadOffset;
  onModeChange: (mode: ZineboxReaderMode) => void;
  onSpreadOffsetChange: (offset: ZineboxSpreadOffset) => void;
  onClose: () => void;
};

function useDebouncedProgress(
  comicId: string,
  mode: ZineboxReaderMode,
  currentPage: number,
  totalPages: number,
  spreadOffset: ZineboxSpreadOffset,
  wideSpreadPages: ReadonlySet<number>,
): void {
  const progressPage = readerProgressPage(mode, currentPage, totalPages, spreadOffset, wideSpreadPages);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void zineboxDb.comics.update(comicId, {
        progressPercentage: progressFromPage(progressPage, totalPages),
        readStatus:
          progressPage >= totalPages ? 'finished' : progressPage > 1 ? 'in_progress' : 'unread',
      });
      notifyZineboxLocalChange();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [comicId, progressPage, totalPages]);
}

export default function ReaderView({
  comicId,
  mode,
  spreadOffset,
  onModeChange,
  onSpreadOffsetChange,
  onClose,
}: ReaderViewProps): React.ReactElement {
  const { comic, comicHydrated } = useZineboxComic(comicId);
  const googleAccessToken = useZineboxGoogleAccessToken();
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [wideSpreadPages, setWideSpreadPages] = useState<ReadonlySet<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState<'missing-blob' | 'missing-comic' | null>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const spreadLeftRef = useRef<HTMLCanvasElement>(null);
  const spreadRightRef = useRef<HTMLCanvasElement>(null);
  const { ref: pagedLayoutRef, size: pagedLayoutSize } = useElementClientSize<HTMLDivElement>();
  const { ref: scrollLayoutRef, element: scrollLayoutElement, size: scrollLayoutSize } =
    useElementClientSize<HTMLDivElement>();
  const docRef = useRef<Awaited<ReturnType<typeof loadPdfDocument>> | null>(null);
  const pageCacheRef = useRef(createReaderPageCache());
  /** Resume from saved progress once per open — not on every Dexie progress write while reading. */
  const pageSeedKeyRef = useRef<string | null>(null);

  const goPrev = useCallback(() => {
    if (mode === 'spread') {
      setCurrentPage((page) => advanceSpreadPage(page, -1, totalPages, spreadOffset, wideSpreadPages));
      return;
    }
    setCurrentPage((page) => clampPage(page - 1, totalPages));
  }, [mode, spreadOffset, totalPages, wideSpreadPages]);

  const goNext = useCallback(() => {
    if (mode === 'spread') {
      setCurrentPage((page) => advanceSpreadPage(page, 1, totalPages, spreadOffset, wideSpreadPages));
      return;
    }
    setCurrentPage((page) => clampPage(page + 1, totalPages));
  }, [mode, spreadOffset, totalPages, wideSpreadPages]);

  useEffect(() => {
    pageSeedKeyRef.current = null;
    pageCacheRef.current.clear();
    let cancelled = false;
    setLoading(true);
    setPdfError(null);
    setCurrentPage(1);
    setTotalPages(0);
    setWideSpreadPages(new Set());
    void (async () => {
      try {
        const source = await resolveComicPdfSource(comicId, { accessToken: googleAccessToken });
        const doc = await loadPdfDocument(source);
        if (cancelled) return;
        docRef.current = doc;
        const dimensions = await loadPdfPageDimensions(doc);
        if (cancelled) return;
        setWideSpreadPages(detectWideSpreadPageNumbers(dimensions));
        setTotalPages(doc.numPages);
        setPdfError(null);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ComicPdfUnavailableError) {
          setPdfError(error.reason);
        } else {
          setPdfError('missing-blob');
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [comicId, googleAccessToken]);

  useEffect(() => {
    pageCacheRef.current.clear();
  }, [mode, spreadOffset]);

  useEffect(() => {
    if (!comicHydrated || !comic || totalPages <= 0) return;
    const seedKey = `${comicId}:${totalPages}`;
    if (pageSeedKeyRef.current === seedKey) return;
    pageSeedKeyRef.current = seedKey;
    setCurrentPage(pageFromProgress(comic.progressPercentage, totalPages));
  }, [comic, comicHydrated, comicId, totalPages]);

  useDebouncedProgress(comicId, mode, currentPage, totalPages, spreadOffset, wideSpreadPages);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (mode === 'scroll') return;
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, mode, onClose]);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc || loading) return;

    const viewportWidth =
      mode === 'scroll' ? scrollLayoutSize.width : pagedLayoutSize.width;
    const viewportHeight =
      mode === 'scroll' ? scrollLayoutSize.height : pagedLayoutSize.height;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    let cancelled = false;
    const cache = pageCacheRef.current;

    void (async () => {
      const prefetch = (pages: number[], options: ReturnType<typeof buildPageRenderOptions>) => {
        if (cancelled) return;
        scheduleReaderPagePrefetch(doc, pages, options, cache);
      };

      if (mode === 'single') {
        const canvas = singleCanvasRef.current;
        if (!canvas) return;
        const options = buildPageRenderOptions('contain', viewportWidth, viewportHeight);
        await displayReaderPage(doc, currentPage, canvas, options, cache);
        if (cancelled) return;
        prefetch(getReaderPrefetchPages(mode, currentPage, totalPages, spreadOffset, wideSpreadPages), options);
        return;
      }

      if (mode === 'spread') {
        const pages = spreadPageNumbers(currentPage, totalPages, spreadOffset, wideSpreadPages);
        const leftCanvas = spreadLeftRef.current;
        const rightCanvas = spreadRightRef.current;
        if (!leftCanvas) return;
        const wideSolo = pages.length === 1 && wideSpreadPages.has(pages[0]!);
        const pageWidth = wideSolo ? viewportWidth - 32 : Math.floor(viewportWidth / 2) - 8;
        const options = buildPageRenderOptions('contain', pageWidth, viewportHeight);
        await displayReaderPage(doc, pages[0] ?? 1, leftCanvas, options, cache);
        if (cancelled) return;
        if (!wideSolo && pages[1] && rightCanvas) {
          await displayReaderPage(doc, pages[1], rightCanvas, options, cache);
          if (cancelled) return;
        } else if (rightCanvas) {
          const context = rightCanvas.getContext('2d');
          rightCanvas.width = 0;
          rightCanvas.height = 0;
          rightCanvas.removeAttribute('style');
          context?.clearRect(0, 0, 0, 0);
        }
        prefetch(getReaderPrefetchPages(mode, currentPage, totalPages, spreadOffset, wideSpreadPages), options);
        return;
      }

      const scrollRoot = scrollLayoutElement;
      if (!scrollRoot) return;
      const canvases = scrollRoot.querySelectorAll('canvas');
      const options = buildPageRenderOptions('width', viewportWidth, viewportWidth * 1.4);
      for (let i = 0; i < canvases.length; i += 1) {
        const canvas = canvases[i];
        if (!(canvas instanceof HTMLCanvasElement)) continue;
        await displayReaderPage(doc, i + 1, canvas, options, cache);
        if (cancelled) return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentPage,
    loading,
    mode,
    pagedLayoutSize.height,
    pagedLayoutSize.width,
    scrollLayoutElement,
    scrollLayoutSize.height,
    scrollLayoutSize.width,
    spreadOffset,
    totalPages,
    wideSpreadPages,
  ]);

  if (!comicHydrated || loading) {
    return (
      <div className="zinebox-reader zinebox-reader--loading" aria-busy="true" aria-label="Loading reader">
        <CircularProgress color="inherit" />
      </div>
    );
  }

  if (!comic || pdfError === 'missing-comic') {
    return (
      <div className="zinebox-reader zinebox-reader--missing">
        <p>Comic not found.</p>
        <button type="button" className="zinebox-btn zinebox-btn--primary" onClick={onClose}>
          Back to library
        </button>
      </div>
    );
  }

  if (pdfError === 'missing-blob') {
    return (
      <div className="zinebox-reader zinebox-reader--missing">
        <p>
          <strong>{comic.title}</strong> is in your library, but its PDF is not stored on this device yet.
        </p>
        <p>
          {googleAccessToken
            ? 'Sign in worked. Try Account menu → Back up now / Sync, or re-import the PDF from your device.'
            : 'Sign in with Google (Account menu) to pull it from Drive backup, or re-import the PDF from your device.'}
        </p>
        <button type="button" className="zinebox-btn zinebox-btn--primary" onClick={onClose}>
          Back to library
        </button>
      </div>
    );
  }

  const spreadPages = spreadPageNumbers(currentPage, totalPages, spreadOffset, wideSpreadPages);
  const wideSoloSpread =
    mode === 'spread' && spreadPages.length === 1 && wideSpreadPages.has(spreadPages[0]!);

  return (
    <div className="zinebox-reader">
      <ReaderChrome
        title={comic.title}
        mode={mode}
        spreadOffset={spreadOffset}
        currentPage={currentPage}
        totalPages={totalPages}
        wideSpreadPages={wideSpreadPages}
        onModeChange={onModeChange}
        onSpreadOffsetChange={onSpreadOffsetChange}
        onClose={onClose}
      />

      {mode === 'single' ? (
        <div ref={pagedLayoutRef} className="zinebox-reader__single">
          <canvas ref={singleCanvasRef} className="zinebox-reader__canvas" />
          <ReaderNavButtons
            mode={mode}
            spreadOffset={spreadOffset}
            currentPage={currentPage}
            totalPages={totalPages}
            wideSpreadPages={wideSpreadPages}
            onPrev={goPrev}
            onNext={goNext}
          />
        </div>
      ) : null}

      {mode === 'spread' ? (
        <div
          ref={pagedLayoutRef}
          className={
            wideSoloSpread
              ? 'zinebox-reader__spread zinebox-reader__spread--wide-solo'
              : 'zinebox-reader__spread'
          }
        >
          <canvas ref={spreadLeftRef} className="zinebox-reader__canvas" />
          {!wideSoloSpread && spreadPages[1] ? (
            <canvas ref={spreadRightRef} className="zinebox-reader__canvas" />
          ) : !wideSoloSpread ? (
            <div className="zinebox-reader__canvas zinebox-reader__canvas--empty" aria-hidden />
          ) : null}
          <ReaderNavButtons
            mode={mode}
            spreadOffset={spreadOffset}
            currentPage={currentPage}
            totalPages={totalPages}
            wideSpreadPages={wideSpreadPages}
            onPrev={goPrev}
            onNext={goNext}
          />
        </div>
      ) : null}

      {mode === 'scroll' ? (
        <div className="zinebox-reader__scroll" ref={scrollLayoutRef}>
          {Array.from({ length: totalPages }, (_, index) => (
            <canvas key={index + 1} className="zinebox-reader__scroll-page" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
