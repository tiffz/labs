/**
 * Strict mute flags for Web Audio + UI — avoids treating string/number junk from storage as "muted"
 * (`Boolean("false") === true` would silence stems incorrectly).
 */
export function primaryPlaybackMuted(song: { primaryMuted?: boolean } | null | undefined): boolean {
  return song?.primaryMuted === true;
}

export function stemPlaybackMuted(stem: { muted?: boolean }): boolean {
  return stem.muted === true;
}

/**
 * IndexedDB / UI must never drive `NaN` into `HTMLMediaElement.volume` or Web Audio gains (browsers
 * treat invalid values as silent).
 */
export function stanzaSanitizeLinearBusGain(raw: number | undefined, fallback = 1): number {
  const v = raw ?? fallback;
  if (!Number.isFinite(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}
