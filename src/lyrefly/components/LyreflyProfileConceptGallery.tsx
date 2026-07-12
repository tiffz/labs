import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { loadVisualDevBlobUrl } from '../db/lyreflyProjectMutations';
import type { VisualDevAsset } from '../types';
import { partitionConceptShelfAssets } from '../utils/conceptShelfUtils';
import { ConceptArtFilmstripThumb } from './ConceptArtFilmstripThumb';

export type LyreflyProfileConceptGalleryProps = {
  assets: VisualDevAsset[];
};

function ConceptArtLightbox({
  asset,
  imageUrl,
  open,
  onClose,
}: {
  asset: VisualDevAsset;
  imageUrl: string | null;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="lyrefly-concept-lightbox-title">
      <DialogTitle id="lyrefly-concept-lightbox-title" sx={{ pr: 6 }}>
        {asset.title || 'Concept art'}
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="lyrefly-profile-concept-lightbox__image" />
        ) : null}
        {asset.markdown?.trim() ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {asset.markdown}
          </Typography>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function LyreflyProfileConceptGallery({ assets }: LyreflyProfileConceptGalleryProps): ReactElement {
  const { gallery } = useMemo(() => partitionConceptShelfAssets(assets), [assets]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const selected = gallery.find((asset) => asset.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setLightboxUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void loadVisualDevBlobUrl(selected.id).then((loaded) => {
      if (cancelled) return;
      objectUrl = loaded;
      setLightboxUrl(loaded);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected]);

  if (gallery.length === 0) {
    return (
      <Box className="lyrefly-profile-concept-gallery lyrefly-profile-concept-gallery--empty">
        <Typography variant="body2" color="text.secondary">
          No concept art yet. Add sketches in Brainstorm.
        </Typography>
      </Box>
    );
  }

  return (
    <section className="lyrefly-profile-concept-gallery" data-testid="lyrefly-profile-concept-gallery">
      <ul className="lyrefly-profile-concept-gallery__grid" aria-label="Concept art">
        {gallery.map((asset) => (
          <ConceptArtFilmstripThumb
            key={asset.id}
            asset={asset}
            selected={asset.id === selectedId}
            onSelect={() => setSelectedId(asset.id)}
            onOpenDetail={() => setSelectedId(asset.id)}
          />
        ))}
      </ul>
      {selected ? (
        <ConceptArtLightbox
          asset={selected}
          imageUrl={lightboxUrl}
          open={Boolean(selected)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </section>
  );
}
