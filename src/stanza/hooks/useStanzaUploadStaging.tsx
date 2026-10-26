import type { ReactElement } from 'react';
import { useLabsStagedFileUploads } from '../../shared/upload/useLabsStagedFileUploads';
import { isLocalMediaFileForStanza } from '../db/stanzaLocalAudioImport';

const NOT_A_RECORDING = "That file isn't a recording Stanza can play.";

/**
 * Stanza's review step (ADR 0030). Picking or dropping a recording stages it; nothing is added to
 * the library or the open song until the user confirms.
 *
 * Dropping several files used to add only the first as a song and ignore the rest without a word.
 * Staging lists every file, and confirming adds each one.
 */
export function useStanzaUploadStaging({
  addLocalSong,
  addStemFromFile,
  openSongTitle,
}: {
  addLocalSong: (file: File) => Promise<void>;
  addStemFromFile: (file: File) => Promise<void>;
  /** The open song, for stems; null on the landing page. */
  openSongTitle: string | null;
}): {
  stageSongFiles: (files: readonly File[]) => void;
  stageStemFiles: (files: readonly File[]) => void;
  panels: ReactElement;
} {
  const songs = useLabsStagedFileUploads({
    accepts: isLocalMediaFileForStanza,
    rejectMessage: NOT_A_RECORDING,
    outcome: 'Adds a new song to your library',
    onCommit: addLocalSong,
    confirmLabel: (n) => (n === 1 ? 'Add song' : `Add ${n} songs`),
    title: 'Songs ready to add',
  });
  const stems = useLabsStagedFileUploads({
    accepts: isLocalMediaFileForStanza,
    rejectMessage: NOT_A_RECORDING,
    unavailable: openSongTitle ? null : 'Open a song to add a layer to it.',
    outcome: openSongTitle ? `Adds a layer to ${openSongTitle}` : '',
    onCommit: addStemFromFile,
    confirmLabel: (n) => (n === 1 ? 'Add layer' : `Add ${n} layers`),
    title: 'Layers ready to add',
  });
  return {
    stageSongFiles: songs.stageFiles,
    stageStemFiles: stems.stageFiles,
    panels: (
      <>
        {songs.panel}
        {stems.panel}
      </>
    ),
  };
}
