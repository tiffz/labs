export const SONG_MEDIA_UPLOAD_SLOTS = ['listen', 'play', 'charts', 'takes'] as const;

export type SongMediaUploadSlot = (typeof SONG_MEDIA_UPLOAD_SLOTS)[number];

export const SONG_MEDIA_UPLOAD_SLOT_LABEL: Record<SongMediaUploadSlot, string> = {
  listen: 'Listen: reference recording',
  play: 'Play: backing track',
  charts: 'Charts: sheet or export',
  takes: 'Takes: practice recording',
};
