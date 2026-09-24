// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { OriginalsSongTitleField } from './OriginalsSongTitleField';

function type(input: HTMLElement, text: string) {
  let value = (input as HTMLInputElement).value;
  for (const ch of text) {
    value += ch;
    fireEvent.change(input, { target: { value } });
  }
}

describe('OriginalsSongTitleField', () => {
  /**
   * The isolation claim. If this breaks, every keystroke re-renders the header and the page again,
   * which is the "feels slow / cursor jumps" report this component exists to fix.
   */
  it('typing does not re-render the parent', () => {
    const parentRenders = vi.fn();

    function Parent() {
      parentRenders();
      const [title, setTitle] = useState('Start');
      const onCommit = useCallback((next: string) => setTitle(next), []);
      return <OriginalsSongTitleField title={title} onCommit={onCommit} />;
    }

    render(<Parent />);
    expect(parentRenders).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText('Song title');
    type(input, ' Middle End');

    expect((input as HTMLInputElement).value).toBe('Start Middle End');
    expect(parentRenders, 'a keystroke must not reach the parent').toHaveBeenCalledTimes(1);
  });

  /**
   * The caret fix. Rewriting a focused input's value resets the caret to the end — and on macOS it
   * also hands the substitution engine an unexpected value, which is how a stray "." lands after a
   * double space.
   */
  it('ignores a title pushed from outside while the field has focus', () => {
    const { rerender } = render(<OriginalsSongTitleField title="Mine" onCommit={() => {}} />);
    const input = screen.getByLabelText('Song title') as HTMLInputElement;

    fireEvent.focus(input);
    type(input, ' edit');
    expect(input.value).toBe('Mine edit');

    // A save echo, a Drive merge, an undo — anything arriving mid-typing.
    rerender(<OriginalsSongTitleField title="Something Else" onCommit={() => {}} />);

    expect(input.value, 'the user owns the value while focused').toBe('Mine edit');
  });

  it('accepts an outside title once the field is no longer focused', () => {
    const onCommit = vi.fn();
    const { rerender } = render(<OriginalsSongTitleField title="Mine" onCommit={onCommit} />);
    const input = screen.getByLabelText('Song title') as HTMLInputElement;

    fireEvent.focus(input);
    type(input, ' edit');
    fireEvent.blur(input);

    expect(onCommit, 'blur must publish what was typed').toHaveBeenCalledWith('Mine edit');

    rerender(<OriginalsSongTitleField title="Restored By Undo" onCommit={onCommit} />);
    expect(input.value).toBe('Restored By Undo');
  });

  it('publishes once the typing settles, not per keystroke', () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      render(<OriginalsSongTitleField title="" onCommit={onCommit} />);
      const input = screen.getByLabelText('Song title');

      type(input, 'Quick Brown Fox');
      expect(onCommit).not.toHaveBeenCalled();

      act(() => void vi.advanceTimersByTime(700));
      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith('Quick Brown Fox');
    } finally {
      vi.useRealTimers();
    }
  });

  it('turns off the browser correction engines that mutate value behind React', () => {
    render(<OriginalsSongTitleField title="" onCommit={() => {}} />);
    const input = screen.getByLabelText('Song title');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });
});
