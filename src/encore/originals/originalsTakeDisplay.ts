import type { OriginalAudioTake } from './types';

const AUDIO_EXT = /\.(m4a|mp3|wav|webm|ogg|aac|flac)$/i;

/** User-facing take name without shouting the file extension. */
export function originalTakeDisplayName(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'Demo take';
  return trimmed.replace(AUDIO_EXT, '').trim() || trimmed;
}

/** Short hint under the listen control on the view page. */
export function originalTakeListenHint(take: OriginalAudioTake, isPreferred: boolean): string {
  const name = originalTakeDisplayName(take.label);
  return isPreferred ? `Preferred demo · ${name}` : name;
}
