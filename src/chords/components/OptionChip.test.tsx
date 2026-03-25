import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OptionChip from './OptionChip';

describe('OptionChip dropdown rendering', () => {
  it('opens with styled popover and applies selection', () => {
    const onSelect = vi.fn();
    render(
      <OptionChip
        label="Key"
        value="C"
        isLocked={false}
        options={[
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' },
        ]}
        onSelect={onSelect}
        onLockToggle={vi.fn()}
        hideLabel={true}
      />
    );

    const chip = document.querySelector('.option-chip');
    expect(chip).toBeTruthy();
    fireEvent.click(chip as Element);

    const popover = document.querySelector('.option-chip-dropdown') as HTMLElement | null;
    expect(popover).toBeTruthy();
    expect(popover?.style.minWidth).toContain('px');

    fireEvent.click(screen.getByRole('button', { name: 'D' }));
    expect(onSelect).toHaveBeenCalledWith('D');
  });
});

