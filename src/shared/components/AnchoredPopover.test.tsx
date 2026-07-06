import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import AnchoredPopover from './AnchoredPopover';

const popoverSpy = vi.fn();

vi.mock('@mui/material/Popover', () => ({
  default: ({
    slotProps,
    children,
  }: {
    slotProps?: {
      paper?: {
        className?: string;
        elevation?: number;
        sx?: unknown;
      };
    };
    children: ReactNode;
  }) => {
    popoverSpy(slotProps);
    return (
      <div data-testid="popover-paper" className={slotProps?.paper?.className}>
        {children}
      </div>
    );
  },
}));

describe('AnchoredPopover', () => {
  it('merges labs-popover-surface with paperClassName and slot paper className', () => {
    render(
      <AnchoredPopover
        open
        anchorEl={null}
        paperClassName="app-menu"
        slotProps={{ paper: { className: 'slot-extra' } }}
      >
        <span>Menu</span>
      </AnchoredPopover>,
    );

    const paper = screen.getByTestId('popover-paper');
    expect(paper).toHaveClass('labs-popover-surface');
    expect(paper).toHaveClass('app-menu');
    expect(paper).toHaveClass('slot-extra');
  });

  it('disables MUI elevation and applies labs popover chrome sx', () => {
    popoverSpy.mockClear();
    render(
      <AnchoredPopover
        open
        anchorEl={null}
        slotProps={{ paper: { sx: { minWidth: 280 } } }}
      >
        <span>Menu</span>
      </AnchoredPopover>,
    );

    const slotProps = popoverSpy.mock.calls.at(-1)?.[0] as {
      paper?: { elevation?: number; sx?: unknown[] };
    };
    expect(slotProps?.paper?.elevation).toBe(0);
    const sx = slotProps?.paper?.sx;
    expect(Array.isArray(sx)).toBe(true);
    expect(sx).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ minWidth: 280 }),
        expect.objectContaining({ boxShadow: 'var(--labs-popover-shadow)' }),
      ]),
    );
  });
});
