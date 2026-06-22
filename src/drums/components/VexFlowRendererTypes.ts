/** Selection state shared between RhythmDisplay and VexFlowRenderer (lazy boundary). */
export type NoteSelectionState = {
  startCharPosition: number | null;
  endCharPosition: number | null;
  isSelecting: boolean;
};
