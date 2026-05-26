/** Word-level paint target (section + line + token start). */
export type WordInteractionTarget = {
  sectionId: string;
  lineId: string;
  charIndex: number;
};

/** Chord-level paint target — use `chordId` for select, move, swap, and delete. */
export type ChordInteractionTarget = WordInteractionTarget & {
  chordId: string;
};
