import { describe, expect, it } from 'vitest';
import { mergeAnchoredPopoverPaperSlot } from './anchoredPopoverChrome';

// The MUI Paper slot type is a broad union (object-or-callback across every
// intrinsic element); the helper always returns the Paper object form, so read
// it through the concrete shape the helper actually produces.
type PaperObjectSlot = { elevation?: number; className?: string; sx?: unknown };

describe('mergeAnchoredPopoverPaperSlot', () => {
  it('sets elevation 0 and appends chrome sx after caller sx', () => {
    const merged = mergeAnchoredPopoverPaperSlot(
      { sx: { minWidth: 320 }, className: 'caller-class' },
      'labs-popover-surface app-menu',
    ) as unknown as PaperObjectSlot;

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
