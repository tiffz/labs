import type { SongSection } from '../../shared/music/songSections';
import { buildLabsDownloadFileName } from '../../shared/utils/labsDownloadFileName';
import { formatSongKeyDisplay, type SongKey } from '../../shared/music/songKeyFormat';

/** First non-empty lyric line — useful as a human song title for exports. */
export function wordsExportTitleFromSections(sections: readonly SongSection[]): string | null {
  for (const section of sections) {
    const line = section.lyrics
      .split('\n')
      .map((value) => value.trim())
      .find(Boolean);
    if (line) return line;
  }
  return null;
}

export function buildWordsAudioExportFileName(sections: readonly SongSection[], songKey: SongKey): string {
  const lyricTitle = wordsExportTitleFromSections(sections);
  if (lyricTitle) {
    return buildLabsDownloadFileName([lyricTitle, 'Words Song']);
  }
  return buildLabsDownloadFileName([formatSongKeyDisplay(songKey), 'Words Song']);
}

export function buildWordsChartExportOptions(sections: readonly SongSection[]): {
  displayTitle: string;
  suggestedFileName: string;
} {
  const lyricTitle = wordsExportTitleFromSections(sections);
  const title = lyricTitle ?? 'Words Song';
  return {
    displayTitle: title,
    suggestedFileName: buildLabsDownloadFileName([title, 'Chord Chart']),
  };
}
