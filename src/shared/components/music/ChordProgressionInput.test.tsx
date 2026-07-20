import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChordProgressionInput from './ChordProgressionInput';
import { CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS } from './chordProgressionPopover';

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

    const input = screen.getByPlaceholderText('I–V–vi–IV or Dm → Bbmaj7/D → Gm/D');
    fireEvent.focus(input);

    expect(document.querySelector('.test-prog-dropdown')).toBeTruthy();
    expect(document.querySelector(`.${CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS}`)).toBeTruthy();
  });

  it('closes on Escape when showInputInPopover moves focus into the menu', async () => {
    render(
      <ChordProgressionInput
        value="I–V–vi–IV"
        onChange={vi.fn()}
        showInputInPopover
        appearance="words"
        dropdownClassName="words-section-chord-dropdown"
      />
    );

    const outer = screen.getByPlaceholderText('I–V–vi–IV or Dm → Bbmaj7/D → Gm/D');
    fireEvent.focus(outer);

    await waitFor(() => {
      expect(document.querySelector('.words-section-chord-dropdown')).toBeTruthy();
    });

    const dropdownInputs = screen.getAllByPlaceholderText('I–V–vi–IV or Dm → Bbmaj7/D → Gm/D');
    const menuInput = dropdownInputs[dropdownInputs.length - 1];
    fireEvent.keyDown(menuInput, { key: 'Escape' });

    await waitFor(() => {
      expect(document.querySelector('.words-section-chord-dropdown')).toBeNull();
    });

    // closeMenu suppresses focus→open briefly so restore/refocus cannot stick the menu open.
    fireEvent.focus(outer);
    expect(document.querySelector('.words-section-chord-dropdown')).toBeNull();
  });

  it('reopens from click after Escape left focus on the outer field', async () => {
    render(
      <ChordProgressionInput
        value="I–V–vi–IV"
        onChange={vi.fn()}
        showInputInPopover
        appearance="words"
        dropdownClassName="words-section-chord-dropdown"
      />
    );

    const outer = screen.getByPlaceholderText('I–V–vi–IV or Dm → Bbmaj7/D → Gm/D');
    fireEvent.focus(outer);
    await waitFor(() => {
      expect(document.querySelector('.words-section-chord-dropdown')).toBeTruthy();
    });

    const menuInput = screen.getAllByPlaceholderText(
      'I–V–vi–IV or Dm → Bbmaj7/D → Gm/D',
    ).at(-1)!;
    fireEvent.keyDown(menuInput, { key: 'Escape' });
    await waitFor(() => {
      expect(document.querySelector('.words-section-chord-dropdown')).toBeNull();
    });

    // Focus is already on the outer field — click must force-open (focus alone will not).
    fireEvent.click(outer);
    await waitFor(() => {
      expect(document.querySelector('.words-section-chord-dropdown')).toBeTruthy();
    });
  });
});


