import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, type ReactElement } from 'react';

import type { VisualDevAsset } from '../types';
import { partitionConceptShelfAssets } from '../utils/conceptShelfUtils';
import type { ConceptShelfFileIntakeHandlers } from '../utils/conceptShelfFileIntake';
import { ConceptArtFilmstripThumb } from './ConceptArtFilmstripThumb';

const CONCEPT_FILE_ACCEPT =
  'image/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/*,.mp3,.m4a,.wav,.webm,.aac,.flac,.ogg';

export type LyreflyConceptShelfProps = {
  assets: VisualDevAsset[];
  intake: ConceptShelfFileIntakeHandlers;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail: () => void;
  embedded?: boolean;
};

export function LyreflyConceptShelf({
  assets,
  intake,
  selectedId,
  onSelect,
  onOpenDetail,
  embedded = false,
}: LyreflyConceptShelfProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { busy, fileDragActive, fileDragHover, uploadFiles, onPaste } = intake;
  const { gallery } = useMemo(() => partitionConceptShelfAssets(assets), [assets]);
  const dropActive = fileDragActive || fileDragHover;
  const galleryEmpty = gallery.length === 0;

  return (
    <Stack
      spacing={0}
      className={['lyrefly-concept-studio', embedded ? 'lyrefly-concept-studio--embedded' : ''].filter(Boolean).join(' ')}
      data-testid="lyrefly-concept-shelf"
    >
      {embedded ? null : (
        <Box className="lyrefly-concept-studio__header">
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" className="lyrefly-concept-studio__title">
              Concept art
            </Typography>
            <Typography component="p" className="lyrefly-concept-studio__meta">
              {galleryEmpty
                ? 'Drop sketches and mood images here.'
                : `${gallery.length} piece${gallery.length === 1 ? '' : 's'} · click for notes · ← →`}
            </Typography>
          </Box>
        </Box>
      )}

      {embedded && !galleryEmpty ? (
        <Typography component="p" className="lyrefly-concept-studio__meta lyrefly-concept-studio__meta--embedded">
          {`${gallery.length} piece${gallery.length === 1 ? '' : 's'} · click for notes · ← →`}
        </Typography>
      ) : null}

      <Box
        className={[
          'lyrefly-concept-studio__body',
          dropActive ? 'lyrefly-concept-studio__body--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onPaste={(e) => onPaste(e.nativeEvent)}
      >
        {galleryEmpty ? (
          <button
            type="button"
            className={[
              'lyrefly-concept-gallery-empty__zone',
              embedded ? 'lyrefly-concept-gallery-empty__zone--embedded' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="Add concept art: drop, paste, or click to upload"
            onPaste={(e) => onPaste(e.nativeEvent)}
          >
            <CloudUploadOutlinedIcon className="lyrefly-concept-gallery-empty__icon" aria-hidden />
            <span className="lyrefly-concept-gallery-empty__title">Add concept art</span>
            <span className="lyrefly-concept-gallery-empty__hint">Drop, paste, or click anywhere here</span>
          </button>
        ) : (
          <ul className="lyrefly-concept-grid" aria-label="Concept art gallery">
            {gallery.map((asset) => (
              <ConceptArtFilmstripThumb
                key={asset.id}
                asset={asset}
                selected={asset.id === selectedId}
                onSelect={() => onSelect(asset.id)}
                onOpenDetail={onOpenDetail}
              />
            ))}
            <li className="lyrefly-concept-filmstrip__item">
              <button
                type="button"
                className="lyrefly-concept-filmstrip__add lyrefly-concept-filmstrip__add--grid"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                aria-label="Add concept art: drop, paste, or click to upload"
                onPaste={(e) => onPaste(e.nativeEvent)}
              >
                <CloudUploadOutlinedIcon className="lyrefly-concept-filmstrip__add-icon" aria-hidden />
                <span className="lyrefly-concept-filmstrip__add-label">Add art</span>
              </button>
            </li>
          </ul>
        )}

        {dropActive ? (
          <Box className="lyrefly-concept-gallery__drop-hint" aria-hidden>
            <Typography variant="body2" className="lyrefly-concept-gallery__drop-hint-text">
              Drop to add concept art
            </Typography>
          </Box>
        ) : null}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept={CONCEPT_FILE_ACCEPT}
        onChange={(ev) => {
          const files = ev.target.files ? Array.from(ev.target.files) : [];
          ev.target.value = '';
          if (files.length > 0) void uploadFiles(files);
        }}
      />
    </Stack>
  );
}
