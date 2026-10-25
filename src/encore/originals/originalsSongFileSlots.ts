export const ORIGINALS_SONG_FILE_SLOTS = ['demoTakes', 'references', 'brainstormRefs'] as const;

export type OriginalsSongFileSlot = (typeof ORIGINALS_SONG_FILE_SLOTS)[number];

export const ORIGINALS_SONG_FILE_SLOT_META: Record<
  OriginalsSongFileSlot,
  { title: string; subheader: string; anchorId: string }
> = {
  demoTakes: {
    title: 'Demo takes',
    subheader: 'Audio demos and recordings',
    anchorId: 'encore-originals-song-files-demo-takes',
  },
  references: {
    title: 'References',
    subheader: 'Charts, PDFs, and other files',
    anchorId: 'encore-originals-song-files-references',
  },
  brainstormRefs: {
    title: 'Brainstorm',
    subheader: 'Links and files while writing',
    anchorId: 'encore-originals-song-files-brainstorm',
  },
};

/**
 * Takes are audio OR video: a phone recording of a demo is a `.mov`, and playback already routes
 * `video/*` takes to the floating video player. `isOriginalsTakeMediaFile` is the drop-side twin;
 * keep the two in step.
 */
export const ORIGINALS_DEMO_TAKE_ACCEPT =
  'audio/*,video/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.webm,.mp4,.mov,.m4v';

export const ORIGINALS_REFERENCE_FILE_ACCEPT =
  'audio/*,image/*,.pdf,.txt,.md,.doc,.docx,.pro,.chordpro,application/pdf,text/*';

export const ORIGINALS_BRAINSTORM_FILE_ACCEPT = '.pdf,.txt,.md,.doc,.docx,application/pdf,text/*';
