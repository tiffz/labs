import { useCallback, useEffect, useMemo, useState } from 'react';

import { throttledReplaceState } from '../../shared/utils/urlHistory';
import {
  canonicalizeZineboxReadHash,
  extractZineboxHashSearch,
  parseLibraryParams,
  parseReaderParams,
  parseZineboxHash,
  type ZineboxLibraryParams,
  type ZineboxReaderParams,
  type ZineboxRoute,
  zineboxLibraryHref,
  zineboxReadHref,
} from '../routes/zineboxHash';

function readRouteFromWindow(): ZineboxRoute {
  return parseZineboxHash(window.location.hash);
}

function readLibraryParamsFromWindow(): ZineboxLibraryParams {
  return parseLibraryParams(extractZineboxHashSearch(window.location.hash));
}

function readReaderParamsFromWindow(): ZineboxReaderParams {
  return parseReaderParams(extractZineboxHashSearch(window.location.hash));
}

export function useZineboxUrlState(): {
  route: ZineboxRoute;
  libraryParams: ZineboxLibraryParams;
  readerParams: ZineboxReaderParams;
  setLibraryParams: (next: Partial<ZineboxLibraryParams>) => void;
  setReaderParams: (next: Partial<ZineboxReaderParams>) => void;
  openReader: (comicId: string) => void;
  closeReader: () => void;
} {
  const [route, setRoute] = useState<ZineboxRoute>(readRouteFromWindow);
  const [libraryParams, setLibraryParamsState] = useState<ZineboxLibraryParams>(
    readLibraryParamsFromWindow,
  );
  const [readerParams, setReaderParamsState] = useState<ZineboxReaderParams>(
    readReaderParamsFromWindow,
  );

  useEffect(() => {
    const readerParamsFromUrl = readReaderParamsFromWindow();
    const repaired = canonicalizeZineboxReadHash(window.location.hash, readerParamsFromUrl);
    if (repaired) {
      throttledReplaceState(`${window.location.pathname}${window.location.search}${repaired}`);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRouteFromWindow());
      setLibraryParamsState(readLibraryParamsFromWindow());
      setReaderParamsState(readReaderParamsFromWindow());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setLibraryParams = useCallback((next: Partial<ZineboxLibraryParams>) => {
    setLibraryParamsState((prev) => {
      const merged = { ...prev, ...next };
      const href = zineboxLibraryHref(merged);
      throttledReplaceState(`${window.location.pathname}${window.location.search}${href}`);
      return merged;
    });
  }, []);

  const setReaderParams = useCallback((next: Partial<ZineboxReaderParams>) => {
    setReaderParamsState((prev) => {
      const merged = { ...prev, ...next };
      const current = readRouteFromWindow();
      if (current.kind !== 'read') return merged;
      const href = zineboxReadHref(current.comicId, merged);
      throttledReplaceState(`${window.location.pathname}${window.location.search}${href}`);
      return merged;
    });
  }, []);

  const openReader = useCallback(
    (comicId: string) => {
      const href = zineboxReadHref(comicId, readerParams);
      window.location.hash = href;
    },
    [readerParams],
  );

  const closeReader = useCallback(() => {
    const href = zineboxLibraryHref(libraryParams);
    window.location.hash = href;
  }, [libraryParams]);

  return useMemo(
    () => ({
      route,
      libraryParams,
      readerParams,
      setLibraryParams,
      setReaderParams,
      openReader,
      closeReader,
    }),
    [
      route,
      libraryParams,
      readerParams,
      setLibraryParams,
      setReaderParams,
      openReader,
      closeReader,
    ],
  );
}
