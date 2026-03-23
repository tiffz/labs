import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KeyInput from './KeyInput';

describe('KeyInput', () => {
  it('fires onChange when selecting a key', () => {
    const onChange = vi.fn();
    render(<KeyInput value="C" onChange={onChange} />);
    const select = screen.getByRole('combobox');

    fireEvent.change(select, { target: { value: 'D' } });

    expect(onChange).toHaveBeenCalledWith('D');
  });

  it('steps keys up and down by semitone', () => {
    const onChange = vi.fn();
    render(<KeyInput value="C" onChange={onChange} showStepButtons />);
    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(onChange).toHaveBeenCalledWith('B');
    expect(onChange).toHaveBeenCalledWith('C#');
  });
});
