import type { WordRhythmAdvancedSettings } from '../../drums/wordRhythm/prosodyEngine';
import type { ChordStyleId } from '../../piano/data/chordExercises';

export type SongSectionType = 'verse' | 'chorus' | 'bridge';

export interface SongSection {
  id: string;
  type: SongSectionType;
  lyrics: string;
  chordProgressionInput: string;
  chordStyleId: ChordStyleId;
  templateNotation: string;
  templateBias: number;
  rhythmVariationSeed: number;
  soundVariationSeed: number;
  linkedToPreviousChorusLyrics: boolean;
  linkedToPreviousChorusTemplate: boolean;
}

export function createSectionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return `section-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function createDefaultSection(
  type: SongSectionType,
  defaults: WordRhythmAdvancedSettings,
  previousChorus?: SongSection
): SongSection {
  const isChorus = type === 'chorus';
  return {
    id: createSectionId(),
    type,
    lyrics: isChorus && previousChorus ? previousChorus.lyrics : '',
    chordProgressionInput: '',
    chordStyleId: 'simple',
    templateNotation:
      isChorus && previousChorus
        ? previousChorus.templateNotation
        : (defaults.templateNotation ?? ''),
    templateBias:
      isChorus && previousChorus
        ? previousChorus.templateBias
        : defaults.templateBias,
    rhythmVariationSeed: 0,
    soundVariationSeed: 0,
    linkedToPreviousChorusLyrics: Boolean(isChorus && previousChorus),
    linkedToPreviousChorusTemplate: Boolean(isChorus && previousChorus),
  };
}

export function findPreviousChorus(
  sections: SongSection[],
  beforeIndex: number
): SongSection | null {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    if (sections[index]?.type === 'chorus') return sections[index] ?? null;
  }
  return null;
}
