import { NOTE_TO_PITCH_CLASS } from '../../shared/music/theory/pitchClass';

export function areSameKey(
  key1: string,
  scale1: string,
  key2: string,
  scale2: string
): boolean {
  if (scale1 !== scale2) return false;
  if (key1 === key2) return true;
  return NOTE_TO_PITCH_CLASS[key1] === NOTE_TO_PITCH_CLASS[key2];
}

export function normalizeKeySpelling(
  key: string,
  _scale: string,
  contextKey: string
): string {
  const sharpToFlat: Record<string, string> = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
  };

  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];
  const contextUsesFlats =
    flatKeys.includes(contextKey) ||
    ['Dm', 'Gm', 'Cm', 'Fm', 'Bbm'].some((candidate) =>
      contextKey.includes(candidate.charAt(0))
    );

  if (contextUsesFlats && sharpToFlat[key]) {
    return sharpToFlat[key];
  }
  return key;
}

export function getRelativeKey(
  key: string,
  scale: string
): { key: string; scale: string } {
  const semitoneToNote = [
    'C',
    'Db',
    'D',
    'Eb',
    'E',
    'F',
    'Gb',
    'G',
    'Ab',
    'A',
    'Bb',
    'B',
  ];
  const semi = NOTE_TO_PITCH_CLASS[key] ?? 0;

  if (scale === 'minor') {
    return { key: semitoneToNote[(semi + 3) % 12], scale: 'major' };
  }
  return { key: semitoneToNote[(semi + 9) % 12], scale: 'minor' };
}
