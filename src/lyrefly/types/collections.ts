/** Collections (ADR 0031) and comic sources (ADR 0032), split from `types/index.ts` for size. */

/**
 * A named set of finished pieces: daily strips, zine photos, old webcomic pages. Raw material, not
 * a project: pieces can be picked from it to start a comic. Archived collections are history,
 * kept searchable but out of the way.
 */
export interface LyreflyCollection {
  id: string;
  title: string;
  notes?: string;
  status: 'ongoing' | 'archived';
  /** Where the pieces came from (a Drive folder, a site). */
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
  /** Set when deleted; the row stays as a marker so the delete syncs like an edit. */
  deletedAt?: string;
}

/**
 * A work in a collection (ADR 0031): a note (`seed`) or a comic (`work`). A work can be in many
 * collections. The id derives from the collection and the work, so two devices adding the same
 * work make one row; removing leaves a `deletedAt` marker, like every other envelope delete.
 */
export interface LyreflyCollectionMember {
  id: string;
  collectionId: string;
  kind: 'seed' | 'work';
  refId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** One finished piece in a collection. The image is the owner's own Drive file, referenced. */
export interface LyreflyCollectionPiece {
  id: string;
  collectionId: string;
  title?: string;
  /** YYYY-MM-DD when known. Absent when unknown, never a guessed date. */
  occurredOn?: string;
  notes?: string;
  /** The owner's Drive file. Lyrefly reads it, never edits, moves or trashes it (ADR 0029). */
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sourceUrl?: string;
  /** Sort position inside the collection. */
  order: number;
  /** Comics started from this piece. */
  usedInProjectIds?: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** An Encore original a comic was started from. Lyrefly reads Encore; it never writes it. */
export interface LyreflyComicSource {
  kind: 'encore-original';
  songId: string;
  snapshot: {
    title: string;
    lyricsAndChords: string;
    songUpdatedAt: string;
    takenAt: string;
  };
}
