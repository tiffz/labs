import { describe, expect, it } from 'vitest';
import { isKeyboardShortcutsHelpEvent } from './labsKeyboardShortcutLabels';

function keyEvent(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
}

describe('isKeyboardShortcutsHelpEvent', () => {
  it('matches mod+? on macOS', () => {
    expect(
      isKeyboardShortcutsHelpEvent(
        keyEvent({ key: '?', code: 'Slash', metaKey: true, shiftKey: true }),
      ),
    ).toBe(true);
  });

  it('matches mod+/ without shift (US layouts)', () => {
    expect(isKeyboardShortcutsHelpEvent(keyEvent({ key: '/', code: 'Slash', metaKey: true }))).toBe(
      true,
    );
  });

  it('matches ctrl+? on non-mac', () => {
    expect(
      isKeyboardShortcutsHelpEvent(
        keyEvent({ key: '?', code: 'Slash', ctrlKey: true, shiftKey: true }),
      ),
    ).toBe(true);
  });

  it('matches ? alone for GitHub-style help', () => {
    expect(isKeyboardShortcutsHelpEvent(keyEvent({ key: '?', shiftKey: true }))).toBe(true);
  });

  it('ignores repeat and alt-modified chords', () => {
    expect(
      isKeyboardShortcutsHelpEvent(
        keyEvent({ key: '?', metaKey: true, shiftKey: true, repeat: true }),
      ),
    ).toBe(false);
    expect(
      isKeyboardShortcutsHelpEvent(
        keyEvent({ key: '?', metaKey: true, shiftKey: true, altKey: true }),
      ),
    ).toBe(false);
  });

  it('ignores unrelated keys', () => {
    expect(isKeyboardShortcutsHelpEvent(keyEvent({ key: 'a', metaKey: true }))).toBe(false);
    expect(isKeyboardShortcutsHelpEvent(keyEvent({ key: '/', shiftKey: true }))).toBe(false);
  });
});
