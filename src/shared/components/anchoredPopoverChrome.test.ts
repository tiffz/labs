import { describe, expect, it } from 'vitest';
import { mergeAnchoredPopoverPaperSlot } from './anchoredPopoverChrome';

describe('mergeAnchoredPopoverPaperSlot', () => {
  it('sets elevation 0 and appends chrome sx after caller sx', () => {
    const merged = mergeAnchoredPopoverPaperSlot(
      { sx: { minWidth: 320 }, className: 'caller-class' },
      'labs-popover-surface app-menu',
    );

    expect(merged?.elevation).toBe(0);
    expect(merged?.className).toBe('labs-popover-surface app-menu');
    expect(merged?.sx).toEqual([
      { minWidth: 320 },
      expect.objectContaining({
        boxShadow: 'var(--labs-popover-shadow)',
        backgroundColor: 'var(--labs-popover-bg)',
      }),
    ]);
  });
});
