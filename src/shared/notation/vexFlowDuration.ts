/**
 * Shared VexFlow duration helpers used by drums, chords, and words notation paths.
 * Canonical home for sixteenth-grid ↔ VexFlow token conversion and beat math.
 */

/**
 * Maps duration in sixteenths to a VexFlow duration string.
 */
export function sixteenthTicksToVexFlowDuration(durationInSixteenths: number): string {
  if (durationInSixteenths === 1) return '16';
  if (durationInSixteenths === 2) return '8';
  if (durationInSixteenths === 3) return '8d';
  if (durationInSixteenths >= 4 && durationInSixteenths < 8) return 'q';
  if (durationInSixteenths === 6) return 'qd';
  if (durationInSixteenths >= 8 && durationInSixteenths < 16) return 'h';
  if (durationInSixteenths === 12) return 'hd';
  if (durationInSixteenths >= 16) return 'w';
  return 'q';
}

/**
 * Whether a sixteenth-grid duration should render with a dot in VexFlow.
 */
export function isDottedSixteenthDuration(durationInSixteenths: number): boolean {
  return durationInSixteenths === 3 || durationInSixteenths === 6 || durationInSixteenths === 12;
}

/**
 * Converts a VexFlow duration string to beats in the given time-signature denominator.
 * Tokens: `w`, `h`, `q`, `8`, `16`; `d` = dotted; `r` = rest (same duration).
 */
export function vexFlowDurationToBeats(duration: string, beatValue: number): number {
  const cleanDuration = duration.replace('r', '');
  const isDotted = cleanDuration.includes('d');
  const baseDuration = cleanDuration.replace('d', '');

  let beats = 0;
  switch (baseDuration) {
    case 'w':
      beats = 4;
      break;
    case 'h':
      beats = 2;
      break;
    case 'q':
      beats = 1;
      break;
    case '8':
      beats = 0.5;
      break;
    case '16':
      beats = 0.25;
      break;
    default:
      console.warn(`Unknown VexFlow duration: ${baseDuration}`);
      beats = 1;
  }

  if (isDotted) {
    beats *= 1.5;
  }

  const conversionFactor = beatValue / 4;
  return beats * conversionFactor;
}
