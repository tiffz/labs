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

  it('includes major/minor quality in onChange', () => {
    const onChange = vi.fn();
    render(<KeyInput value="D" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change key' }));
    fireEvent.click(screen.getByRole('button', { name: 'minor' }));

    expect(onChange).toHaveBeenCalledWith('Dm');
  });

  it('shows maj/min in the value button', () => {
    render(<KeyInput value="Dm" onChange={() => undefined} />);
    expect(screen.getByText('D min')).toBeInTheDocument();
  });

  it('steps keys up and down by semitone while preserving mode', () => {
    const onChange = vi.fn();
    render(<KeyInput value="Cm" onChange={onChange} showStepButtons />);
    fireEvent.click(screen.getByRole('button', { name: 'Raise key by semitone' }));

    expect(onChange).toHaveBeenCalledWith('Dbm');
  });

  it('shows placeholder when value is unset', () => {
    const onChange = vi.fn();
    render(<KeyInput placeholder="Unknown" onChange={onChange} showMode={false} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set key (Unknown)' }));
    fireEvent.click(screen.getByRole('button', { name: 'F' }));
    expect(onChange).toHaveBeenCalledWith('F');
  });

  it('shows long-form labels when modeFormat is long', () => {
    render(<KeyInput value="E major" onChange={() => undefined} modeFormat="long" />);
    expect(screen.getByText('E major')).toBeInTheDocument();
  });

  it('clears the value when clearable is enabled', () => {
    const onChange = vi.fn();
    render(<KeyInput value="C major" onChange={onChange} modeFormat="long" clearable />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear key' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
