import type { AlbersFlashcardChallenge, SightChallenge } from '../types';

export interface SightLeftRightKeyboardHandlers {
  onPickSide: (side: 'left' | 'right') => void;
  onPickAlbersBinary: (choice: 'same' | 'different') => void;
}

export function challengeUsesLeftRightArrows(challenge: SightChallenge): boolean {
  return (
    challenge.kind === 'compare' ||
    challenge.kind === 'flashcard-isolated' ||
    challenge.kind === 'flashcard-albers'
  );
}

export function isSightKeyboardTargetEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable === true;
}

/**
 * Maps ← / → to left/right (or Same/Different on Albers identity drills).
 * Returns true when the event was handled.
 */
export function applySightLeftRightArrowKey(
  event: Pick<KeyboardEvent, 'key' | 'target' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault'>,
  challenge: SightChallenge,
  handlers: SightLeftRightKeyboardHandlers,
): boolean {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  if (isSightKeyboardTargetEditable(event.target)) return false;
  if (!challengeUsesLeftRightArrows(challenge)) return false;

  event.preventDefault();

  if (challenge.kind === 'flashcard-albers' && challenge.question === 'identity') {
    handlers.onPickAlbersBinary(event.key === 'ArrowLeft' ? 'same' : 'different');
    return true;
  }

  handlers.onPickSide(event.key === 'ArrowLeft' ? 'left' : 'right');
  return true;
}

export function albersUsesLeftRightButtons(challenge: AlbersFlashcardChallenge): boolean {
  return challenge.question !== 'identity';
}
