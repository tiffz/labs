import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ChordProgressionInput from './ChordProgressionInput';

describe('ChordProgressionInput', () => {
  it('applies appearance class to root input container', () => {
    const { container } = render(
      <ChordProgressionInput value="I–V–vi–IV" onChange={vi.fn()} appearance="words" />
    );
    const root = container.querySelector('.shared-chord-progression-input');
    expect(root?.classList.contains('shared-chord-progression-input--words')).toBe(true);
  });

  it('applies dropdownClassName to popover paper', () => {
    render(
      <ChordProgressionInput
        value="I–V–vi–IV"
        onChange={vi.fn()}
        dropdownClassName="test-prog-dropdown"
      />
    );

    const input = screen.getByPlaceholderText('I–V–vi–IV or C–G–Am–F');
    fireEvent.focus(input);

    expect(document.querySelector('.test-prog-dropdown')).toBeTruthy();
  });
});
