import type { SongKey } from '../../shared/music/songKeyFormat';
import type { SongSection } from '../../shared/music/songSections';
import { cloneSectionsSnapshot } from './sectionSnapshot';

export type WordsDocumentSnapshot = {
  sections: SongSection[];
  songKey: SongKey;
  bpm?: number;
};

export function cloneWordsDocumentSnapshot(
  snapshot: WordsDocumentSnapshot
): WordsDocumentSnapshot {
  return {
    sections: cloneSectionsSnapshot(snapshot.sections),
    songKey: snapshot.songKey,
    ...(snapshot.bpm === undefined ? {} : { bpm: snapshot.bpm }),
  };
}
