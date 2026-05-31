import { useEffect } from 'react';
import {
  isEditableKeyboardTarget,
  shouldHandleGlobalPlaybackSpacebar,
} from '../utils/keyboardShortcuts';

export function useBeatPracticeKeyboardShortcuts(params: {
  undoPracticeEdit: () => void;
  redoPracticeEdit: () => void;
  handleDeleteSelectedPracticeSections: () => void;
  handlePlayPause: () => void;
  selectedSectionCount: number;
}): void {
  const {
    undoPracticeEdit,
    redoPracticeEdit,
    handleDeleteSelectedPracticeSections,
    handlePlayPause,
    selectedSectionCount,
  } = params;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (!isEditableKeyboardTarget(target) && (event.metaKey || event.ctrlKey)) {
        const isRedo =
          event.key.toLowerCase() === 'y' ||
          (event.shiftKey && event.key.toLowerCase() === 'z');
        const isUndo = !event.shiftKey && event.key.toLowerCase() === 'z';
        if (isUndo) {
          event.preventDefault();
          undoPracticeEdit();
          return;
        }
        if (isRedo) {
          event.preventDefault();
          redoPracticeEdit();
          return;
        }
      }

      if (
        !isEditableKeyboardTarget(target) &&
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedSectionCount > 0
      ) {
        event.preventDefault();
        handleDeleteSelectedPracticeSections();
        return;
      }

      if (!shouldHandleGlobalPlaybackSpacebar(event)) return;
      event.preventDefault();
      handlePlayPause();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleDeleteSelectedPracticeSections,
    handlePlayPause,
    redoPracticeEdit,
    selectedSectionCount,
    undoPracticeEdit,
  ]);
}
