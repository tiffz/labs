import { describe, expect, it } from 'vitest';
import { collectPopoverScrollParents } from './usePopoverScrollAnchorSync';

describe('collectPopoverScrollParents', () => {
  it('always includes in-scroll-region when present', () => {
    const root = document.createElement('div');
    root.className = 'in-scroll-region';

    const anchor = document.createElement('button');
    root.appendChild(anchor);
    document.body.appendChild(root);

    const parents = collectPopoverScrollParents(anchor);
    expect(parents).toContain(root);

    root.remove();
  });
});
