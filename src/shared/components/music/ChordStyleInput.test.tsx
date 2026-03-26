import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ChordStyleInput from './ChordStyleInput';

const OPTIONS = [
  { id: 'simple', label: 'Simple', description: 'Whole note chords' },
  { id: 'per-beat', label: 'Per Beat', description: 'One chord strike per beat' },
] as const;

describe('ChordStyleInput', () => {
  it('applies appearance class to root input container', () => {
    const { container } = render(
      <ChordStyleInput
        value="simple"
        options={OPTIONS}
        onChange={vi.fn()}
        appearance="piano"
      />
    );
    const root = container.querySelector('.shared-chord-style-input');
    expect(root?.classList.contains('shared-chord-style-input--piano')).toBe(true);
  });

  it('applies dropdownClassName to popover paper', () => {
    render(
      <ChordStyleInput
        value="simple"
        options={OPTIONS}
        onChange={vi.fn()}
        dropdownClassName="test-style-dropdown"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose chord style' }));
    expect(document.querySelector('.test-style-dropdown')).toBeTruthy();
  });
});
