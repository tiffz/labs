import { useEffect } from 'react';
import { usePracticeResourceChipDragging } from './song/practiceResourceDragContext';

/** Closes hover cards and blocks open while a practice resource chip drag is active. */
export function useSuppressEncoreHoverCardWhileDragging(
  open: boolean,
  setOpen: (open: boolean) => void,
): { open: boolean; disableHoverListener: boolean } {
  const chipDragging = usePracticeResourceChipDragging();

  useEffect(() => {
    if (chipDragging && open) setOpen(false);
  }, [chipDragging, open, setOpen]);

  return {
    open: open && !chipDragging,
    disableHoverListener: chipDragging,
  };
}
