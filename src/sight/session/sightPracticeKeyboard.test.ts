import { describe, expect, it, vi } from 'vitest';
import {
  applySightAdvanceKey,
  applySightSubmitKey,
  challengeSupportsSubmitShortcut,
  isSightSliderTarget,
} from './sightPracticeKeyboard';
import type { SightChallenge } from '../types';

describe('sightPracticeKeyboard', () => {
  it('detects submit shortcut challenge kinds', () => {
    expect(challengeSupportsSubmitShortcut({ kind: 'contextual' } as SightChallenge)).toBe(true);
    expect(challengeSupportsSubmitShortcut({ kind: 'compare' } as SightChallenge)).toBe(false);
  });

  it('ignores slider targets for submit', () => {
    const root = document.createElement('div');
    root.className = 'MuiSlider-root';
    const thumb = document.createElement('span');
    thumb.setAttribute('role', 'slider');
    root.appendChild(thumb);
    document.body.appendChild(root);
    expect(isSightSliderTarget(thumb)).toBe(true);
    root.remove();
  });

  it('submits on Enter when allowed', () => {
    const onSubmit = vi.fn();
    const event = {
      key: 'Enter',
      target: document.body,
      preventDefault: vi.fn(),
    };
    expect(applySightSubmitKey(event, true, onSubmit)).toBe(true);
    expect(onSubmit).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not submit when a slider is focused', () => {
    const root = document.createElement('div');
    root.className = 'MuiSlider-root';
    const thumb = document.createElement('span');
    thumb.setAttribute('role', 'slider');
    root.appendChild(thumb);
    document.body.appendChild(root);

    const onSubmit = vi.fn();
    expect(
      applySightSubmitKey(
        { key: ' ', target: thumb, preventDefault: vi.fn() },
        true,
        onSubmit,
      ),
    ).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    root.remove();
  });

  it('advances after feedback on Space', () => {
    const onAdvance = vi.fn();
    const event = {
      key: ' ',
      target: document.body,
      preventDefault: vi.fn(),
    };
    expect(applySightAdvanceKey(event, true, onAdvance)).toBe(true);
    expect(onAdvance).toHaveBeenCalled();
  });
});
