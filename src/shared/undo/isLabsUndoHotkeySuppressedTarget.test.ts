// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isLabsUndoHotkeySuppressedTarget } from './isLabsUndoHotkeySuppressedTarget';

describe('isLabsUndoHotkeySuppressedTarget', () => {
  it('returns false for null and non-element targets', () => {
    expect(isLabsUndoHotkeySuppressedTarget(null)).toBe(false);
    expect(isLabsUndoHotkeySuppressedTarget(window)).toBe(false);
    expect(isLabsUndoHotkeySuppressedTarget(document.createTextNode('x'))).toBe(false);
  });

  it('suppresses native text controls so browser typing undo wins', () => {
    for (const tag of ['input', 'textarea', 'select'] as const) {
      expect(isLabsUndoHotkeySuppressedTarget(document.createElement(tag))).toBe(true);
    }
  });

  it('does not suppress buttons, links, or plain containers', () => {
    for (const tag of ['button', 'a', 'div', 'span'] as const) {
      expect(isLabsUndoHotkeySuppressedTarget(document.createElement(tag))).toBe(false);
    }
  });

  it('suppresses contenteditable hosts', () => {
    const div = document.createElement('div');
    Object.defineProperty(div, 'isContentEditable', { value: true });
    expect(isLabsUndoHotkeySuppressedTarget(div)).toBe(true);
  });

  it('suppresses role="textbox" elements and their descendants', () => {
    const box = document.createElement('div');
    box.setAttribute('role', 'textbox');
    expect(isLabsUndoHotkeySuppressedTarget(box)).toBe(true);

    const child = document.createElement('span');
    box.appendChild(child);
    expect(isLabsUndoHotkeySuppressedTarget(child)).toBe(true);
  });

  it('suppresses descendants of data-labs-undo-breakout containers', () => {
    const host = document.createElement('div');
    host.setAttribute('data-labs-undo-breakout', 'true');
    const child = document.createElement('button');
    host.appendChild(child);
    expect(isLabsUndoHotkeySuppressedTarget(child)).toBe(true);
  });
});
