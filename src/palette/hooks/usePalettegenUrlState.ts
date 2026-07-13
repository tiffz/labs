import { useEffect, useRef } from 'react';

import { throttledReplaceState } from '../../shared/utils/urlHistory';
import { parsePalettegenUrl, serializePalettegenUrl } from '../utils/palettegenUrlParams';
import type { usePalettegenGallery } from './usePalettegenGallery';

type Gallery = ReturnType<typeof usePalettegenGallery>;

export function usePalettegenUrlState(gallery: Gallery): void {
  const bootedRef = useRef(false);
  const {
    activeEntry,
    mode,
    seedHex,
    loadFromUrl,
    generateRandom,
    generateFromSeed,
  } = gallery;

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const parsed = parsePalettegenUrl();
    if (parsed) {
      loadFromUrl(parsed);
      if (parsed.mode === 'seed' && parsed.seed && parsed.colors.length < 2) {
        generateFromSeed();
      }
      return;
    }

    generateRandom();
  }, [generateFromSeed, generateRandom, loadFromUrl]);

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
