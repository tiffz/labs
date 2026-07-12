import { useCallback, useEffect, useState } from 'react';

import { lyreflyGalleryHref, lyreflyProjectHref, lyreflyProjectProfileHref, lyreflyScriptHref, parseLyreflyHash, type LyreflyRoute } from '../routes/lyreflyHash';

export function useLyreflyUrlState(): {
  route: LyreflyRoute;
  openGallery: () => void;
  openProject: (projectId: string) => void;
  openScript: (projectId: string) => void;
  openProfile: (projectId: string) => void;
} {
  const [route, setRoute] = useState<LyreflyRoute>(() =>
    typeof window !== 'undefined' ? parseLyreflyHash(window.location.hash) : { kind: 'gallery' },
  );

  useEffect(() => {
    const onHashChange = (): void => {
      setRoute(parseLyreflyHash(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openGallery = useCallback(() => {
    window.location.hash = lyreflyGalleryHref();
    setRoute({ kind: 'gallery' });
  }, []);

  const openProject = useCallback((projectId: string) => {
    window.location.hash = lyreflyProjectHref(projectId);
    setRoute({ kind: 'project', projectId });
  }, []);

  const openScript = useCallback((projectId: string) => {
    window.location.hash = lyreflyScriptHref(projectId);
    setRoute({ kind: 'script', projectId });
  }, []);

  const openProfile = useCallback((projectId: string) => {
    window.location.hash = lyreflyProjectProfileHref(projectId);
    setRoute({ kind: 'profile', projectId });
  }, []);

  return { route, openGallery, openProject, openScript, openProfile };
}
