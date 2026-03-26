import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KeyInput from './KeyInput';

describe('KeyInput', () => {
  it('fires onChange when selecting a key from grid', () => {
    const onChange = vi.fn();
    render(<KeyInput value="C" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change key' }));
    fireEvent.click(screen.getByRole('button', { name: 'D' }));

    expect(onChange).toHaveBeenCalledWith('D');
  });

  it('steps keys up and down by semitone', () => {
    const onChange = vi.fn();
    render(<KeyInput value="C" onChange={onChange} showStepButtons />);
    fireEvent.click(screen.getByRole('button', { name: 'Lower key by semitone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Raise key by semitone' }));

    expect(onChange).toHaveBeenCalledWith('B');
    expect(onChange).toHaveBeenCalledWith('Db');
  });
});
