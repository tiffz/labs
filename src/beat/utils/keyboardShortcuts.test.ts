import { describe, expect, it } from 'vitest';
import { shouldHandleGlobalPlaybackSpacebar } from './keyboardShortcuts';

function buildEvent(target: HTMLElement | null, code = 'Space', repeat = false): Pick<KeyboardEvent, 'code' | 'repeat' | 'target'> {
  return { code, repeat, target };
}

describe('shouldHandleGlobalPlaybackSpacebar', () => {
  it('handles a non-repeating spacebar event on document body', () => {
    expect(shouldHandleGlobalPlaybackSpacebar(buildEvent(document.body))).toBe(true);
  });

  it('ignores spacebar presses while typing in form fields', () => {
    expect(shouldHandleGlobalPlaybackSpacebar(buildEvent(document.createElement('input')))).toBe(false);
    expect(shouldHandleGlobalPlaybackSpacebar(buildEvent(document.createElement('textarea')))).toBe(false);
    expect(shouldHandleGlobalPlaybackSpacebar(buildEvent(document.createElement('select')))).toBe(false);
    expect(shouldHandleGlobalPlaybackSpacebar(buildEvent(document.createElement('button')))).toBe(false);
  });

  it('ignores non-space keys and repeated keydown', () => {
    expect(shouldHandleGlobalPlaybackSpacebar(buildEvent(document.body, 'KeyK'))).toBe(false);
    expect(shouldHandleGlobalPlaybackSpacebar(buildEvent(document.body, 'Space', true))).toBe(false);
  });
});
