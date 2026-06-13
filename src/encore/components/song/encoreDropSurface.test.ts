import { describe, expect, it } from 'vitest';
import {
  getEncoreDropSurface,
  setEncoreDropSurface,
  shouldEncoreMediaHubHighlightDrag,
} from './encoreDropSurface';

describe('encoreDropSurface', () => {
  it('suppresses media-hub highlight while performance surfaces own the drag', () => {
    setEncoreDropSurface(null);
    expect(shouldEncoreMediaHubHighlightDrag()).toBe(true);

    setEncoreDropSurface('performance');
    expect(shouldEncoreMediaHubHighlightDrag()).toBe(false);
    expect(getEncoreDropSurface()).toBe('performance');

    setEncoreDropSurface('performance-modal');
    expect(shouldEncoreMediaHubHighlightDrag()).toBe(false);

    setEncoreDropSurface(null);
    expect(shouldEncoreMediaHubHighlightDrag()).toBe(true);
  });
});
