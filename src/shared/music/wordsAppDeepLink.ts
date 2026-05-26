import { createDefaultSection, createSectionId, type SongSection } from './songSections';
import { parseChordProToChartLayout, type SectionType } from './chordPro/chordChartLayout';
import { encodeBase64UrlUtf8 } from '../utils/base64Url';

function mapSectionType(type: SectionType): SongSection['type'] {
  if (type === 'Chorus') return 'chorus';
  if (type === 'Bridge') return 'bridge';
  return 'verse';
}

/** Convert Encore Originals chart layout into Words in Rhythm section payloads. */
export function chartLayoutToWordsSections(
  chordProDocument: string,
  songKey: string,
): { sections: SongSection[]; songKey: string } {
  const layout = parseChordProToChartLayout(chordProDocument);
  const sections: SongSection[] = layout.sections.map((sec) => {
    const lyrics = sec.lines
      .map((l) => l.text)
      .join('\n')
      .trimEnd();
    const base = createDefaultSection(mapSectionType(sec.type), {});
    return {
      ...base,
      id: createSectionId(),
      lyrics,
    };
  });
  if (sections.length === 0) {
    sections.push(createDefaultSection('verse', {}));
  }
  return { sections, songKey };
}

export type WordsAppDeepLinkOptions = {
  bpm?: number;
  timeSignature?: string;
};

/** Build a Words in Rhythm URL preloaded with chart sections. */
export function buildWordsAppDeepLink(
  chordProDocument: string,
  songKey: string,
  opts: WordsAppDeepLinkOptions = {},
): string {
  const payload = chartLayoutToWordsSections(chordProDocument, songKey);
  const params = new URLSearchParams();
  params.set('song', encodeBase64UrlUtf8(JSON.stringify(payload)));
  if (opts.bpm !== undefined) params.set('bpm', String(Math.round(opts.bpm)));
  if (opts.timeSignature) params.set('time', opts.timeSignature);
  params.set('ckey', songKey);
  const base = typeof window !== 'undefined' ? `${window.location.origin}/words/` : '/words/';
  return `${base}?${params.toString()}`;
}
