import { SCRAPBOARD_CAST_POOL_TAGGED } from '../copy/scrapboardStoryThemes';

export type ScrapboardRandomizeScope =
  | 'copy'
  | 'cast'
  | 'palette'
  | 'staging'
  | 'layout'
  | 'trim'
  | 'photos';

export type ScrapboardRandomizeLocks = Record<ScrapboardRandomizeScope, boolean>;

export const DEFAULT_SCRAPBOARD_RANDOMIZE_LOCKS: ScrapboardRandomizeLocks = {
  copy: false,
  cast: false,
  palette: false,
  staging: false,
  layout: false,
  trim: false,
  photos: false,
};

/** Emoji + name pool for cast randomization (tags used by story-aware picks). */
export const SCRAPBOARD_CAST_POOL: ReadonlyArray<{ emoji: string; label: string }> =
  SCRAPBOARD_CAST_POOL_TAGGED.map(({ emoji, label }) => ({ emoji, label }));
