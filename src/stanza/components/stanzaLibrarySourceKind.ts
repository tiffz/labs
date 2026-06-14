import type { StanzaSong } from '../db/stanzaDb';

export type StanzaLibrarySourceKind = 'youtube' | 'drive' | 'local';

export function stanzaLibrarySourceKind(
  song: Pick<StanzaSong, 'ytId' | 'driveSourceFileId'>,
): StanzaLibrarySourceKind {
  if (song.ytId?.trim()) return 'youtube';
  if (song.driveSourceFileId?.trim()) return 'drive';
  return 'local';
}
