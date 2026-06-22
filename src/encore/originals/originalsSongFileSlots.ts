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

export const ORIGINALS_DEMO_TAKE_AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.wav,.webm';

export const ORIGINALS_REFERENCE_FILE_ACCEPT =
  'audio/*,image/*,.pdf,.txt,.md,.doc,.docx,.pro,.chordpro,application/pdf,text/*';

export const ORIGINALS_BRAINSTORM_FILE_ACCEPT = '.pdf,.txt,.md,.doc,.docx,application/pdf,text/*';
