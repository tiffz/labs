import { describe, expect, it, vi } from 'vitest';
import { focusFirstFocusable, getFocusableElements, handleMenuListKeyDown } from './focusable';

describe('focusable', () => {
  it('focuses the first tabbable element in a container', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<button type="button" id="first">One</button><button type="button" id="second">Two</button>';
    document.body.appendChild(root);
    const first = root.querySelector<HTMLElement>('#first');
    const focusSpy = vi.spyOn(first!, 'focus');

    expect(focusFirstFocusable(root)).toBe(true);
    expect(focusSpy).toHaveBeenCalled();

    root.remove();
  });

  it('moves focus with arrow keys in a menu list', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<button type="button" id="a">A</button><button type="button" id="b">B</button>';
    document.body.appendChild(root);
    const items = getFocusableElements(root);
    items[0]?.focus();

    handleMenuListKeyDown(
      { key: 'ArrowDown', preventDefault: vi.fn() } as unknown as React.KeyboardEvent,
      items,
    );

    expect(document.activeElement?.id).toBe('b');
    root.remove();
  });
});
