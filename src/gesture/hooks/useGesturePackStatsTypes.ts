export type GesturePackStats = {
  counts: Map<string, number>;
  /** Up to four cover file ids per pack — for cards when pack.coverFileIds is unset. */
  coverIds: Map<string, string[]>;
  drawnSets: Map<string, Set<string>>;
  /** True after packFiles and drawHistory live queries have each resolved once. */
  statsHydrated: boolean;
};
