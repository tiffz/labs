/** Host appearance tokens for {@link MetronomeSplitControl} — mirrors PlaybackFieldSelect pattern. */
export type MetronomeAppearance =
  | 'default'
  | 'drums'
  | 'words'
  | 'piano'
  | 'chords'
  | 'stanza'
  | 'midi';

const METRONOME_APPEARANCES: ReadonlySet<MetronomeAppearance> = new Set([
  'default',
  'drums',
  'words',
  'piano',
  'chords',
  'stanza',
  'midi',
]);

export function resolveMetronomeAppearance(value?: string): MetronomeAppearance {
  if (value && METRONOME_APPEARANCES.has(value as MetronomeAppearance)) {
    return value as MetronomeAppearance;
  }
  return 'default';
}

export function metronomeSplitControlClass(
  appearance: MetronomeAppearance = 'default',
  extra?: string,
): string {
  return ['labs-metronome-split-control', `labs-metronome-split-control--${appearance}`, extra]
    .filter(Boolean)
    .join(' ');
}

export function metronomeSettingsPopoverClass(
  appearance: MetronomeAppearance = 'default',
  extra?: string,
): string {
  return [
    'labs-metronome-settings-popover',
    `labs-metronome-settings-popover--${appearance}`,
    appearance === 'drums' ? 'drums-floating-menu' : undefined,
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export function metronomeSettingsPanelClass(
  appearance: MetronomeAppearance = 'default',
  extra?: string,
): string {
  return ['labs-metronome-settings-panel', `labs-metronome-settings-panel--${appearance}`, extra]
    .filter(Boolean)
    .join(' ');
}
