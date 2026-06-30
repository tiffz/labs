import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LibrarySearchField from './LibrarySearchField';

describe('LibrarySearchField', () => {
  it('does not emit onChange when debounced draft matches the current value', async () => {
    const onChange = vi.fn();
    render(<LibrarySearchField value="" onChange={onChange} />);

    await waitFor(
      () => {
        expect(onChange).not.toHaveBeenCalled();
      },
      { timeout: 500 },
    );
  });

  it('emits onChange when the debounced draft differs from the current value', async () => {
    const onChange = vi.fn();
    const { getByPlaceholderText } = render(<LibrarySearchField value="" onChange={onChange} />);

    fireEvent.change(getByPlaceholderText('Search library…'), { target: { value: 'cats' } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('cats');
    });
  });
});
