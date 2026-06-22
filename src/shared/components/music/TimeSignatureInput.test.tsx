import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TimeSignatureInput from './TimeSignatureInput';

describe('TimeSignatureInput', () => {
  it('applies a common preset from the inline picker', () => {
    const onChange = vi.fn();
    render(
      <TimeSignatureInput
        value={{ numerator: 4, denominator: 4 }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Change time signature' }));
    fireEvent.click(screen.getByRole('button', { name: '3/4' }));

    expect(onChange).toHaveBeenCalledWith({ numerator: 3, denominator: 4 });
  });

  it('renders the block layout without a trigger', () => {
    render(
      <TimeSignatureInput
        layout="block"
        value={{ numerator: 4, denominator: 4 }}
        onChange={() => {}}
      />,
    );

    expect(screen.getByLabelText('Time signature')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change time signature' })).not.toBeInTheDocument();
  });
});
