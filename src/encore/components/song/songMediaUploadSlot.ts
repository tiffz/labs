export const SONG_MEDIA_UPLOAD_SLOTS = ['listen', 'play', 'charts', 'takes', 'misc'] as const;

export type SongMediaUploadSlot = (typeof SONG_MEDIA_UPLOAD_SLOTS)[number];

export const SONG_MEDIA_UPLOAD_SLOT_LABEL: Record<SongMediaUploadSlot, string> = {
  listen: 'Listen: reference recording',
  play: 'Play: backing track',
  charts: 'Charts: sheet or export',
  takes: 'Takes: practice recording',
  misc: 'Misc: other resources',
};

/**
 * Browsers (especially Safari) may not match Logic `.m4a` / some `.wav` exports to `audio/*` alone.
 * Explicit extensions keep the system file picker and Drive uploads aligned with `inferMediaMimeType`.
 */
const AUDIO_VIDEO_ACCEPT =
  'audio/*,video/*,.m4a,.mp4,.mov,.m4v,.aac,.mp3,.wav,.wave,.aif,.aiff,.caf,.flac,.ogg,.oga,.opus,.webm,.mkv,.mpeg,.mpg,.avi';

/** What each slot takes: one table for the pickers and for the staging check (ADR 0030). */
export const SONG_MEDIA_SLOT_ACCEPT: Record<SongMediaUploadSlot, string> = {
  listen: AUDIO_VIDEO_ACCEPT,
  play: AUDIO_VIDEO_ACCEPT,
  charts: '.pdf,.xml,.musicxml,.mxl,image/*',
  takes: AUDIO_VIDEO_ACCEPT,
  misc: 'audio/*,video/*,image/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/*,.mp3,.m4a,.wav,.webm,.aac,.flac,.ogg',
};

/** Short name for a staged row ("Chart · Uploads to your Drive"). */
export const SONG_MEDIA_SLOT_NOUN: Record<SongMediaUploadSlot, string> = {
  listen: 'Reference track',
  play: 'Backing track',
  charts: 'Chart',
  takes: 'Take',
  misc: 'File',
};
