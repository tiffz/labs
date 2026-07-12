import { useCallback, useEffect, useState } from 'react';

import type { VisualDevAsset } from '../types';

export function useConceptArtSelection(gallery: VisualDevAsset[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (gallery.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => {
      if (current && gallery.some((item) => item.id === current)) return current;
      return gallery[0]?.id ?? null;
    });
  }, [gallery]);

  const selectedIndex = gallery.findIndex((asset) => asset.id === selectedId);
  const selected = selectedIndex >= 0 ? gallery[selectedIndex] : null;

  const selectByDelta = useCallback(
    (delta: number) => {
      if (gallery.length === 0) return;
      const index = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIndex = (index + delta + gallery.length) % gallery.length;
      setSelectedId(gallery[nextIndex]?.id ?? null);
    },
    [gallery, selectedIndex],
  );

  const selectPrevious = useCallback(() => selectByDelta(-1), [selectByDelta]);
  const selectNext = useCallback(() => selectByDelta(1), [selectByDelta]);

  return {
    selectedId,
    selected,
    selectedIndex,
    setSelectedId,
    selectPrevious,
    selectNext,
  };
}
