import { describe, expect, it, vi } from 'vitest';
import {
  applySightLeftRightArrowKey,
  challengeUsesLeftRightArrows,
  isSightKeyboardTargetEditable,
} from './sightLeftRightKeyboard';
import type { SightChallenge } from '../types';

function arrowEvent(key: 'ArrowLeft' | 'ArrowRight', target: EventTarget | null = document.body) {
  return {
    key,
    target,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
  };
}

const compareChallenge = {
  kind: 'compare',
  axis: 'lighter',
  left: { l: 0.5, c: 0.1, h: 20 },
  right: { l: 0.7, c: 0.1, h: 20 },
  correctSide: 'right',
} as Extract<SightChallenge, { kind: 'compare' }>;

describe('sightLeftRightKeyboard', () => {
  it('detects left/right arrow challenge kinds', () => {
    expect(challengeUsesLeftRightArrows(compareChallenge)).toBe(true);
    expect(challengeUsesLeftRightArrows({ kind: 'contextual' } as SightChallenge)).toBe(false);
  });

  it('ignores editable targets', () => {
    const input = document.createElement('input');
    expect(isSightKeyboardTargetEditable(input)).toBe(true);
    expect(isSightKeyboardTargetEditable(document.body)).toBe(false);
  });

  it('maps ArrowLeft and ArrowRight to side picks', () => {
    const onPickSide = vi.fn();
    const onPickAlbersBinary = vi.fn();

    const left = arrowEvent('ArrowLeft');
    expect(
      applySightLeftRightArrowKey(left, compareChallenge, { onPickSide, onPickAlbersBinary }),
    ).toBe(true);
    expect(left.preventDefault).toHaveBeenCalled();
    expect(onPickSide).toHaveBeenCalledWith('left');

    onPickSide.mockClear();
    const right = arrowEvent('ArrowRight');
    applySightLeftRightArrowKey(right, compareChallenge, { onPickSide, onPickAlbersBinary });
    expect(onPickSide).toHaveBeenCalledWith('right');
  });

  it('maps arrows to Same/Different on Albers identity drills', () => {
    const onPickSide = vi.fn();
    const onPickAlbersBinary = vi.fn();
    const identity = {
      kind: 'flashcard-albers',
      question: 'identity',
    } as Extract<SightChallenge, { kind: 'flashcard-albers' }>;

    applySightLeftRightArrowKey(arrowEvent('ArrowLeft'), identity, { onPickSide, onPickAlbersBinary });
    expect(onPickAlbersBinary).toHaveBeenCalledWith('same');
    expect(onPickSide).not.toHaveBeenCalled();

    onPickAlbersBinary.mockClear();
    applySightLeftRightArrowKey(arrowEvent('ArrowRight'), identity, { onPickSide, onPickAlbersBinary });
    expect(onPickAlbersBinary).toHaveBeenCalledWith('different');
  });
});
