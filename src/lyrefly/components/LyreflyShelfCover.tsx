import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';

import { loadRevisionBlobUrl, loadVisualDevBlobUrl } from '../db/lyreflyProjectMutations';
import { coverInitialFromTitle, coverPaletteForProject } from '../design/lyreflyCoverPalette';
import type { ComicProject, LyreflyAssetRef } from '../types';

export type LyreflyShelfCoverProps = {
  project: ComicProject;
  /** Active revision on the front cover page when available. */
  coverRevisionId?: string;
  /** Newest concept-art image when no cover page art exists. */
  conceptAssetId?: string;
};

async function loadCoverRefUrl(ref: LyreflyAssetRef): Promise<string | null> {
  if (ref.kind === 'visual_dev' || ref.kind === 'cover') {
    return loadVisualDevBlobUrl(ref.id);
  }
  if (ref.kind === 'page_revision') {
    return loadRevisionBlobUrl(ref.id);
  }
  return null;
}

export function LyreflyShelfCover({
  project,
  coverRevisionId,
  conceptAssetId,
}: LyreflyShelfCoverProps): ReactElement {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const palette = useMemo(() => coverPaletteForProject(project.id), [project.id]);
  const initial = coverInitialFromTitle(project.title);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      if (project.coverRef) {
        objectUrl = await loadCoverRefUrl(project.coverRef);
      } else if (coverRevisionId) {
        objectUrl = await loadRevisionBlobUrl(coverRevisionId);
      } else if (conceptAssetId) {
        objectUrl = await loadVisualDevBlobUrl(conceptAssetId);
      }
      if (!cancelled) setCoverUrl(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [conceptAssetId, coverRevisionId, project.coverRef]);

  const style = useMemo((): CSSProperties | undefined => {
    if (coverUrl) return undefined;
    return {
      '--lyrefly-cover-wash-custom': palette.wash,
    } as CSSProperties;
  }, [coverUrl, palette]);

  return (
    <div
      className="lyrefly-shelf__cover"
      style={style}
      data-has-cover={coverUrl ? 'true' : 'false'}
      aria-hidden
    >
      {coverUrl ? (
        <img className="lyrefly-shelf__cover-img" src={coverUrl} alt="" />
      ) : (
        <span className="lyrefly-shelf__cover-initial">{initial}</span>
      )}
    </div>
  );
}
