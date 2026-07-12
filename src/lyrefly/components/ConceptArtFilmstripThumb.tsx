import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import { useEffect, useState, type ReactElement } from 'react';

import { loadVisualDevBlobUrl } from '../db/lyreflyProjectMutations';
import type { VisualDevAsset } from '../types';

export type ConceptArtFilmstripThumbProps = {
  asset: VisualDevAsset;
  selected: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
};

export function ConceptArtFilmstripThumb({
  asset,
  selected,
  onSelect,
  onOpenDetail,
}: ConceptArtFilmstripThumbProps): ReactElement {
  const [url, setUrl] = useState<string | null>(null);
  const hasNotes = Boolean(asset.markdown?.trim());

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void loadVisualDevBlobUrl(asset.id).then((loaded) => {
      if (cancelled) return;
      objectUrl = loaded;
      setUrl(loaded);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id]);

  return (
    <li className="lyrefly-concept-filmstrip__item">
      <button
        type="button"
        className={[
          'lyrefly-concept-filmstrip__thumb',
          selected ? 'lyrefly-concept-filmstrip__thumb--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => {
          onSelect();
          onOpenDetail();
        }}
        aria-current={selected ? 'true' : undefined}
        aria-label={hasNotes ? 'Open concept art and note' : 'Open concept art'}
        data-testid="lyrefly-concept-gallery-tile"
      >
        <span className="lyrefly-concept-filmstrip__frame">
          {url ? (
            <img className="lyrefly-concept-filmstrip__img" src={url} alt="" />
          ) : (
            <span className="lyrefly-concept-filmstrip__placeholder" aria-hidden />
          )}
          {hasNotes ? (
            <span className="lyrefly-concept-filmstrip__note-badge" aria-hidden>
              <NotesOutlinedIcon sx={{ fontSize: 12 }} />
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
