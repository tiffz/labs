import { useEffect } from 'react';

import { throttledReplaceState } from '../../shared/utils/urlHistory';
import { parsePalettegenUrl, serializePalettegenUrl } from '../utils/palettegenUrlParams';
import type { usePalettegenGallery } from './usePalettegenGallery';

type Gallery = ReturnType<typeof usePalettegenGallery>;

export function usePalettegenUrlState(gallery: Gallery): void {
  const {
    activeEntry,
    mode,
    seedHex,
    loadFromUrl,
    generateRandom,
    generateFromSeed,
  } = gallery;

  useEffect(() => {
    const parsed = parsePalettegenUrl();
    if (parsed) {
      loadFromUrl(parsed);
      if (parsed.mode === 'seed' && parsed.seed && parsed.colors.length < 2) {
        generateFromSeed();
      }
      return;
    }

    generateRandom();
    // Boot only — do not re-run when gallery callbacks change or URL-loaded palettes reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only hydration
  }, []);

  useEffect(() => {
    if (!activeEntry) return;
    const url = serializePalettegenUrl({
      colors: activeEntry.palette.swatches.map((swatch) => swatch.hex),
      mode,
      seed: seedHex,
    });
    throttledReplaceState(url);
  }, [activeEntry, mode, seedHex]);
}
