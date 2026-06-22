import type { SightChallenge } from '../types';
import { isSightKeyboardTargetEditable } from './sightLeftRightKeyboard';

export function challengeSupportsSubmitShortcut(challenge: SightChallenge): boolean {
  return (
    challenge.kind === 'contextual' ||
    challenge.kind === 'bridge' ||
    challenge.kind === 'gamut' ||
    challenge.kind === 'albers-equalizer' ||
    challenge.kind === 'anchor-pivot'
  );
}

export function isSightSliderTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[role="slider"], .MuiSlider-root'));
}

/** Enter / Space → Submit when a drill uses the footer Submit button. */
export function applySightSubmitKey(
  event: Pick<KeyboardEvent, 'key' | 'target' | 'preventDefault'>,
  canSubmit: boolean,
  onSubmit: () => void,
): boolean {
  if (event.key !== 'Enter' && event.key !== ' ') return false;
  if (isSightKeyboardTargetEditable(event.target)) return false;
  if (isSightSliderTarget(event.target)) return false;
  if (!canSubmit) return false;
  event.preventDefault();
  onSubmit();
  return true;
}

/** Enter / Space → continue after feedback. */
export function applySightAdvanceKey(
  event: Pick<KeyboardEvent, 'key' | 'target' | 'preventDefault'>,
  canAdvance: boolean,
  onAdvance: () => void,
): boolean {
  if (event.key !== 'Enter' && event.key !== ' ') return false;
  if (isSightKeyboardTargetEditable(event.target)) return false;
  if (!canAdvance) return false;
  event.preventDefault();
  onAdvance();
  return true;
}
