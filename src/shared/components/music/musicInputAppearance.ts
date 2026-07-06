/** Shared closed-shell + portaled menu appearance for KeyInput / BpmInput. */
export type MusicInputAppearance =
  | 'default'
  | 'words'
  | 'drums'
  | 'chords'
  | 'piano'
  | 'stanza';

export function musicInputRootClass(
  kind: 'key' | 'bpm',
  appearance: MusicInputAppearance = 'default',
  extra?: string,
): string {
  const base = kind === 'key' ? 'shared-key-input' : 'shared-bpm-input';
  return [base, `${base}--${appearance}`, extra].filter(Boolean).join(' ');
}
