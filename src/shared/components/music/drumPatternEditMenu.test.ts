import { describe, expect, it } from 'vitest';
import {
  drumPatternEditMenuAnchorPosition,
  isDrumPatternEditMenuTarget,
} from './drumPatternEditMenu';

describe('drumPatternEditMenu', () => {
  it('returns true for Text nodes inside the portaled drum edit menu', () => {
    const menu = document.createElement('div');
    menu.className = 'drum-pattern-edit-menu';
    const chip = document.createElement('button');
    const label = document.createTextNode('Maqsum');
    chip.appendChild(label);
    menu.appendChild(chip);
    document.body.appendChild(menu);

    expect(isDrumPatternEditMenuTarget(label)).toBe(true);
    expect(isDrumPatternEditMenuTarget(chip)).toBe(true);

    menu.remove();
  });

  it('treats the full-screen popover root as inside the drum edit menu', () => {
    const root = document.createElement('div');
    root.className = 'MuiPopover-root labs-drum-pattern-edit-menu-root';
    const backdrop = document.createElement('div');
    root.appendChild(backdrop);
    document.body.appendChild(root);

    expect(isDrumPatternEditMenuTarget(backdrop)).toBe(true);

    root.remove();
  });

  it('freezes bottom-end anchor position from the Edit control rect', () => {
    const anchor = document.createElement('button');
    anchor.getBoundingClientRect = () =>
      ({
        top: 100,
        left: 200,
        bottom: 128,
        right: 248,
        width: 48,
        height: 28,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;

    expect(drumPatternEditMenuAnchorPosition(anchor)).toEqual({ top: 128, left: 248 });
  });
});
