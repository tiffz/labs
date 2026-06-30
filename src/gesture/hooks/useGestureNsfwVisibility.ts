import { useCallback, useState } from 'react';
import {
  readGestureLocalUiPreferences,
  writeGestureLocalUiPreferences,
} from '../practice/gestureLocalUiPreferences';

export function useGestureNsfwVisibility(): {
  showNsfwCollections: boolean;
  setShowNsfwCollections: (show: boolean) => void;
} {
  const [showNsfwCollections, setShowNsfwCollectionsState] = useState(
    () => readGestureLocalUiPreferences()?.showNsfwCollections ?? false,
  );

  const setShowNsfwCollections = useCallback((show: boolean) => {
    setShowNsfwCollectionsState(show);
    writeGestureLocalUiPreferences({ showNsfwCollections: show });
  }, []);

  return { showNsfwCollections, setShowNsfwCollections };
}
