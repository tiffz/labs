import { describe, expect, it, vi } from 'vitest';
import { labsRedoShortcutLabel, labsUndoShortcutLabel } from './labsUndoShortcutLabel';

describe('labsUndoShortcutLabel', () => {
  it('uses Mac glyphs when platform looks like macOS', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' });
    expect(labsUndoShortcutLabel()).toBe('⌘Z');
    expect(labsRedoShortcutLabel()).toBe('⌘⇧Z');
    vi.unstubAllGlobals();
  });

  it('uses Ctrl labels on other platforms', () => {
    vi.stubGlobal('navigator', { platform: 'Win32' });
    expect(labsUndoShortcutLabel()).toBe('Ctrl+Z');
    expect(labsRedoShortcutLabel()).toBe('Ctrl+Shift+Z');
    vi.unstubAllGlobals();
  });
});
