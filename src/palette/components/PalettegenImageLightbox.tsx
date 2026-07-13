import { useEffect, type ReactElement } from 'react';

import type { PalettegenSourceImage } from '../hooks/usePalettegenGallery';

export type PalettegenImageLightboxProps = {
  image: PalettegenSourceImage | null;
  onClose: () => void;
};

export function PalettegenImageLightbox({ image, onClose }: PalettegenImageLightboxProps): ReactElement | null {
  useEffect(() => {
    if (!image) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="palettegen-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.name}
      data-testid="palettegen-image-lightbox"
    >
      <button type="button" className="palettegen-lightbox__scrim" onClick={onClose} aria-label="Close image preview" />
      <div className="palettegen-lightbox__content">
        <img src={image.url} alt={image.name} className="palettegen-lightbox__img" />
        <p className="palettegen-lightbox__caption">{image.name}</p>
      </div>
      <button type="button" className="palettegen-lightbox__close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}
