import type { StanzaSong } from '../db/stanzaDb';

export type StanzaPracticeSource = 'youtube' | 'local';

type PracticeSourceSong = Pick<StanzaSong, 'ytId' | 'localAudioBlob' | 'practiceSource'>;

/** Resolved playback source when the row has YouTube and/or a local file. */
export function resolveStanzaPracticeSource(song: PracticeSourceSong | null): StanzaPracticeSource | null {
  if (!song) return null;
  const hasYt = Boolean(song.ytId?.trim());
  const hasLocal = Boolean(song.localAudioBlob);

  if (song.practiceSource === 'youtube' && hasYt) return 'youtube';
  if (song.practiceSource === 'local' && hasLocal) return 'local';

  if (hasYt) return 'youtube';
  if (hasLocal) return 'local';
  return null;
}

export function songHasDualPracticeSources(song: PracticeSourceSong | null): boolean {
  if (!song) return false;
  return Boolean(song.ytId?.trim() && song.localAudioBlob);
}

export function usesYoutubePracticeTransport(song: PracticeSourceSong | null): boolean {
  return resolveStanzaPracticeSource(song) === 'youtube';
}
