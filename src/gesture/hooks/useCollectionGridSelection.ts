import { useCallback, useMemo, useState } from 'react';

export type CollectionGridSelection = {
  selectedIds: string[];
  selectedSet: Set<string>;
  selectionActive: boolean;
  toggle: (packId: string) => void;
  clear: () => void;
  selectAllShown: () => void;
  deselectAllShown: () => void;
};

export function useCollectionGridSelection(visiblePackIds: string[]): CollectionGridSelection {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectionActive = selectedIds.length > 0;

  const toggle = useCallback((packId: string) => {
    setSelectedIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId],
    );
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const selectAllShown = useCallback(() => {
    setSelectedIds((prev) => [...new Set([...prev, ...visiblePackIds])]);
  }, [visiblePackIds]);

  const deselectAllShown = useCallback(() => {
    setSelectedIds((prev) => prev.filter((id) => !visiblePackIds.includes(id)));
  }, [visiblePackIds]);

  return {
    selectedIds,
    selectedSet,
    selectionActive,
    toggle,
    clear,
    selectAllShown,
    deselectAllShown,
  };
}
