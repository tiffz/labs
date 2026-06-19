import CircularProgress from '@mui/material/CircularProgress';
import { useCallback, useEffect, useRef, useState } from 'react';

import { zineboxDb } from '../db/zineboxDb';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import { useZineboxComic } from '../hooks/useZineboxComics';
import type { ZineboxReaderMode, ZineboxSpreadOffset } from '../types';
import ReaderChrome, { ReaderNavButtons } from './ReaderChrome';
import {
  advanceSpreadPage,
  clampPage,
  loadPdfDocument,
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
): void {
  const progressPage = readerProgressPage(mode, currentPage, totalPages, spreadOffset);

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
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const spreadLeftRef = useRef<HTMLCanvasElement>(null);
  const spreadRightRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<Awaited<ReturnType<typeof loadPdfDocument>> | null>(null);
  const pageCacheRef = useRef(createReaderPageCache());
  /** Resume from saved progress once per open — not on every Dexie progress write while reading. */
  const pageSeedKeyRef = useRef<string | null>(null);

  const goPrev = useCallback(() => {
    if (mode === 'spread') {
      setCurrentPage((page) => advanceSpreadPage(page, -1, totalPages, spreadOffset));
      return;
    }
    setCurrentPage((page) => clampPage(page - 1, totalPages));
  }, [mode, spreadOffset, totalPages]);

  const goNext = useCallback(() => {
    if (mode === 'spread') {
      setCurrentPage((page) => advanceSpreadPage(page, 1, totalPages, spreadOffset));
      return;
    }
    setCurrentPage((page) => clampPage(page + 1, totalPages));
  }, [mode, spreadOffset, totalPages]);

  useEffect(() => {
    pageSeedKeyRef.current = null;
    pageCacheRef.current.clear();
    let cancelled = false;
    setLoading(true);
    setCurrentPage(1);
    setTotalPages(0);
    void (async () => {
      const source = await resolveComicPdfSource(comicId);
      const doc = await loadPdfDocument(source);
      if (cancelled) return;
      docRef.current = doc;
      setTotalPages(doc.numPages);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [comicId]);

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

  useDebouncedProgress(comicId, mode, currentPage, totalPages, spreadOffset);

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
        const container = canvas.parentElement;
        if (!container) return;
        const options = buildPageRenderOptions(
          'width',
          container.clientWidth,
          container.clientHeight,
        );
        await displayReaderPage(doc, currentPage, canvas, options, cache);
        if (cancelled) return;
        prefetch(getReaderPrefetchPages(mode, currentPage, totalPages, spreadOffset), options);
        return;
      }

      if (mode === 'spread') {
        const pages = spreadPageNumbers(currentPage, totalPages, spreadOffset);
        const leftCanvas = spreadLeftRef.current;
        const rightCanvas = spreadRightRef.current;
        const container = leftCanvas?.parentElement;
        if (!leftCanvas || !container) return;
        const halfWidth = Math.floor(container.clientWidth / 2) - 8;
        const options = buildPageRenderOptions('contain', halfWidth, container.clientHeight);
        await displayReaderPage(doc, pages[0] ?? 1, leftCanvas, options, cache);
        if (cancelled) return;
        if (pages[1] && rightCanvas) {
          await displayReaderPage(doc, pages[1], rightCanvas, options, cache);
          if (cancelled) return;
        }
        prefetch(getReaderPrefetchPages(mode, currentPage, totalPages, spreadOffset), options);
        return;
      }

      const scrollRoot = scrollContainerRef.current;
      if (!scrollRoot) return;
      const canvases = scrollRoot.querySelectorAll('canvas');
      const width = scrollRoot.clientWidth;
      const options = buildPageRenderOptions('width', width, width * 1.4);
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
  }, [currentPage, loading, mode, spreadOffset, totalPages]);

  if (!comicHydrated || loading) {
    return (
      <div className="zinebox-reader zinebox-reader--loading" aria-busy="true" aria-label="Loading reader">
        <CircularProgress color="inherit" />
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="zinebox-reader zinebox-reader--missing">
        <p>Comic not found.</p>
        <button type="button" className="zinebox-btn zinebox-btn--primary" onClick={onClose}>
          Back to library
        </button>
      </div>
    );
  }

  const spreadPages = spreadPageNumbers(currentPage, totalPages, spreadOffset);

  return (
    <div className="zinebox-reader">
      <ReaderChrome
        title={comic.title}
        mode={mode}
        spreadOffset={spreadOffset}
        currentPage={currentPage}
        totalPages={totalPages}
        onModeChange={onModeChange}
        onSpreadOffsetChange={onSpreadOffsetChange}
        onClose={onClose}
      />

      {mode === 'single' ? (
        <div className="zinebox-reader__single">
          <canvas ref={singleCanvasRef} className="zinebox-reader__canvas" />
          <ReaderNavButtons
            mode={mode}
            spreadOffset={spreadOffset}
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={goPrev}
            onNext={goNext}
          />
        </div>
      ) : null}

      {mode === 'spread' ? (
        <div className="zinebox-reader__spread">
          <canvas ref={spreadLeftRef} className="zinebox-reader__canvas" />
          {spreadPages[1] ? (
            <canvas ref={spreadRightRef} className="zinebox-reader__canvas" />
          ) : (
            <div className="zinebox-reader__canvas zinebox-reader__canvas--empty" aria-hidden />
          )}
          <ReaderNavButtons
            mode={mode}
            spreadOffset={spreadOffset}
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={goPrev}
            onNext={goNext}
          />
        </div>
      ) : null}

      {mode === 'scroll' ? (
        <div className="zinebox-reader__scroll" ref={scrollContainerRef}>
          {Array.from({ length: totalPages }, (_, index) => (
            <canvas key={index + 1} className="zinebox-reader__scroll-page" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
