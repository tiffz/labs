import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { DndContext } from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import { mockImportFromDrive, ZINEBOX_E2E_SCROLL_GRID_COMIC_COUNT } from '../db/mockDriveImport';
import { importLocalPdfFiles } from '../drive/importLocalPdfs';
import { useStackDnD } from '../hooks/useStackDnD';
import { useZineboxCollections, useZineboxComics } from '../hooks/useZineboxComics';
import { useZineboxLibraryDrop } from '../hooks/useZineboxLibraryDrop';
import type { ZineboxCollection } from '../types';
import LocalBatchImportDialog from './LocalBatchImportDialog';
import LibraryFilterPills from './LibraryFilterPills';
import LibraryGridView from './LibraryGridView';
import StackDetailDialog from './StackDetailDialog';
import ZineboxAppHeader from './ZineboxAppHeader';
import type { ZineboxLibraryParams, ZineboxReaderParams } from '../routes/zineboxHash';
import { collectAllZineboxTags } from '../utils/zineboxTags';
import {
  collectionMatchesLibraryFilters,
  comicMatchesLibraryFilters,
} from '../utils/zineboxLibraryFilters';
import { pickRandomUnreadComic } from '../utils/pickRandomUnreadComic';
import LibrarySearchField from './LibrarySearchField';

type LibraryViewProps = {
  libraryParams: ZineboxLibraryParams;
  readerParams: ZineboxReaderParams;
  onLibraryParamsChange: (next: Partial<ZineboxLibraryParams>) => void;
  onOpenComic: (comicId: string) => void;
};

function shouldRunE2eSeed(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('e2eSeed');
}

function shouldRunE2eScrollGridSeed(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('e2eScrollGrid');
}

export default function LibraryView({
  libraryParams,
  readerParams,
  onLibraryParamsChange,
  onOpenComic,
}: LibraryViewProps): React.ReactElement {
  const { startBlockingJob } = useLabsBlockingJobs();
  const { comics, comicsHydrated } = useZineboxComics();
  const { collections, collectionsHydrated } = useZineboxCollections();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [localBatchFiles, setLocalBatchFiles] = useState<File[] | null>(null);
  const [activeStack, setActiveStack] = useState<ZineboxCollection | null>(null);
  const { dndContextProps, dragOverlay } = useStackDnD(comics, collections);

  const hydrated = comicsHydrated && collectionsHydrated;
  const hasLibrary = comics.length > 0;

  const handleImportFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const pdfs = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      setImportError('No PDF files were found. Try again with .pdf files.');
      return;
    }
    if (pdfs.length > 1) {
      setImportError(null);
      setImportNotice(null);
      setLocalBatchFiles(pdfs);
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportNotice(null);
    const job = startBlockingJob('Importing PDF…');
    try {
      const result = await importLocalPdfFiles(pdfs);
      if (result.imported === 0 && result.skipped > 0) {
        setImportNotice('That PDF is already in your library.');
      } else if (result.imported === 0) {
        setImportError('No PDF files were found. Try again with .pdf files.');
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not import those PDFs.');
    } finally {
      job.end();
      setImporting(false);
    }
  }, [startBlockingJob]);

  const { dragActive, handlers: dropHandlers } = useZineboxLibraryDrop({
    disabled: importing,
    onFiles: (files) => void handleImportFiles(files),
  });

  useEffect(() => {
    if (!hydrated || !shouldRunE2eSeed() || comics.length > 0) return;
    const count = shouldRunE2eScrollGridSeed() ? ZINEBOX_E2E_SCROLL_GRID_COMIC_COUNT : undefined;
    void mockImportFromDrive({ count });
  }, [comics.length, hydrated]);

  const comicsById = useMemo(() => new Map(comics.map((c) => [c.id, c])), [comics]);

  const stackedComicIds = useMemo(() => {
    const ids = new Set<string>();
    for (const collection of collections) {
      for (const id of collection.itemIds) ids.add(id);
    }
    return ids;
  }, [collections]);

  const sources = useMemo(
    () => [...new Set(comics.map((c) => c.source))].sort((a, b) => a.localeCompare(b)),
    [comics],
  );

  const tags = useMemo(() => collectAllZineboxTags(comics), [comics]);

  const filteredComics = useMemo(() => {
    return comics.filter((comic) => comicMatchesLibraryFilters(comic, libraryParams));
  }, [comics, libraryParams]);

  const filteredCollections = useMemo(() => {
    return collections.filter((collection) =>
      collectionMatchesLibraryFilters(collection, comicsById, libraryParams),
    );
  }, [collections, comicsById, libraryParams]);

  const handleSearchChange = useCallback(
    (q: string | null) => {
      onLibraryParamsChange({ q });
    },
    [onLibraryParamsChange],
  );

  const unreadComics = useMemo(
    () => comics.filter((comic) => comic.readStatus === 'unread'),
    [comics],
  );

  const handleRandomUnread = useCallback(() => {
    const picked = pickRandomUnreadComic(unreadComics);
    if (!picked) return;
    setImportNotice(null);
    setImportError(null);
    onOpenComic(picked.id);
  }, [onOpenComic, unreadComics]);

  const randomUnreadSlot = useMemo(
    () => ({
      disabled: unreadComics.length === 0,
      onPick: handleRandomUnread,
    }),
    [handleRandomUnread, unreadComics.length],
  );

  const uploadSlot = useMemo(
    () => ({
      disabled: importing,
      tagSuggestions: tags,
      onLocalFiles: (files: File[]) => void handleImportFiles(files),
      onDriveImportComplete: setImportNotice,
      onError: setImportError,
    }),
    [handleImportFiles, importing, tags],
  );

  const shellClassName = [
    'zinebox-library-shell',
    dragActive ? 'zinebox-library-shell--drag-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const importFeedback =
    importNotice || importError ? (
      <div className="zinebox-library-feedback">
        {importNotice ? (
          <Alert severity="success" sx={{ py: 0.5 }} onClose={() => setImportNotice(null)}>
            {importNotice}
          </Alert>
        ) : null}
        {importError ? (
          <Alert severity="error" sx={{ py: 0.5 }} onClose={() => setImportError(null)}>
            {importError}
          </Alert>
        ) : null}
      </div>
    ) : null;

  if (!hydrated) {
    return (
      <div className="zinebox-loading" aria-busy="true" aria-label="Loading library">
        <CircularProgress />
      </div>
    );
  }

  if (!hasLibrary) {
    return (
      <div
        className={`${shellClassName} zinebox-library-page`}
        data-testid="zinebox-library"
        {...dropHandlers}
      >
        {dragActive ? (
          <div className="zinebox-drop-overlay" aria-hidden>
            Drop PDFs to add
          </div>
        ) : null}

        <div className="zinebox-library-sticky">
          <div className="zinebox-library-sticky__inner">
            <ZineboxAppHeader upload={uploadSlot} />
          </div>
        </div>
        <div className="zinebox-library-body zinebox-library-body--empty">
          <div className="zinebox-empty__body">
            <h2>Start your library</h2>
            <p>Drop PDF zines anywhere on this page, or click Upload zines in the header.</p>
          </div>
          {importFeedback}
        </div>
        <LocalBatchImportDialog
          open={localBatchFiles !== null}
          files={localBatchFiles ?? []}
          tagSuggestions={tags}
          onClose={() => setLocalBatchFiles(null)}
          onComplete={setImportNotice}
          onError={setImportError}
        />
      </div>
    );
  }

  const searchField = (
    <LibrarySearchField value={libraryParams.q ?? ''} onChange={handleSearchChange} />
  );

  return (
    <div
      className={`${shellClassName} zinebox-library-page`}
      data-testid="zinebox-library"
      {...dropHandlers}
    >
      {dragActive ? (
        <div className="zinebox-drop-overlay" aria-hidden>
          Drop PDFs to add
        </div>
      ) : null}

      <div className="zinebox-library-sticky">
        <div className="zinebox-library-sticky__inner">
          <ZineboxAppHeader
            upload={uploadSlot}
            randomUnread={randomUnreadSlot}
            search={searchField}
          />
          <LibraryFilterPills
            params={libraryParams}
            sources={sources}
            tags={tags}
            onChange={onLibraryParamsChange}
          />
        </div>
      </div>

      <div className="zinebox-library-body">
        {importFeedback}

        <DndContext {...dndContextProps}>
          <LibraryGridView
            comics={filteredComics}
            collections={filteredCollections}
            stackedComicIds={stackedComicIds}
            comicsById={comicsById}
            searchQuery={libraryParams.q}
            readerParams={readerParams}
            onOpenComic={onOpenComic}
            onOpenStack={setActiveStack}
          />
          {dragOverlay}
        </DndContext>
      </div>

      <StackDetailDialog
        open={activeStack !== null}
        collection={activeStack}
        comicsById={comicsById}
        readerParams={readerParams}
        onClose={() => setActiveStack(null)}
        onOpenComic={onOpenComic}
        onCollectionChange={setActiveStack}
      />

      <LocalBatchImportDialog
        open={localBatchFiles !== null}
        files={localBatchFiles ?? []}
        tagSuggestions={tags}
        onClose={() => setLocalBatchFiles(null)}
        onComplete={setImportNotice}
        onError={setImportError}
      />
    </div>
  );
}
