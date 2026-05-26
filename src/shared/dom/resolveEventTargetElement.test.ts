import { describe, expect, it } from 'vitest';
import { isPointerInsideSelector, resolveEventTargetElement } from './resolveEventTargetElement';

describe('resolveEventTargetElement', () => {
  it('returns Element targets unchanged', () => {
    const button = document.createElement('button');
    expect(resolveEventTargetElement(button)).toBe(button);
  });

  it('returns parentElement for Text node targets', () => {
    const button = document.createElement('button');
    const text = document.createTextNode('around');
    button.appendChild(text);
    expect(resolveEventTargetElement(text)).toBe(button);
  });

  it('detects inside selector when pointer target is a Text node', () => {
    const button = document.createElement('button');
    button.className = 'encore-originals-lyric-token';
    const text = document.createTextNode('around');
    button.appendChild(text);
    document.body.appendChild(button);
    expect(
      isPointerInsideSelector({ target: text }, '.encore-originals-lyric-token'),
    ).toBe(true);
    button.remove();
  });
});
