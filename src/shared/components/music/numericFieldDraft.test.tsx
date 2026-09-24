// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BpmInput from './BpmInput';
import TimeSignatureInput from './TimeSignatureInput';
import { parseNumericFieldDraft } from './numericFieldDraftUtils';

describe('parseNumericFieldDraft', () => {
  // The whole point: `Number('')` is 0, so the obvious isFinite guard accepts an empty box.
  it.each([
    ['', null],
    ['   ', null],
    ['abc', null],
    ['-', null],
    ['0', 0],
    ['120', 120],
    [' 88 ', 88],
    ['1e3', 1000],
  ])('parseNumericFieldDraft(%j) === %s', (raw, expected) => {
    expect(parseNumericFieldDraft(raw as string)).toBe(expected);
  });

  it('is not fooled the way a bare Number() guard is', () => {
    expect(Number('')).toBe(0);
    expect(Number.isFinite(Number(''))).toBe(true);
    expect(parseNumericFieldDraft('')).toBeNull();
  });
});

describe('numeric fields treat a cleared box as an absence', () => {
  it('BpmInput restores the tempo instead of committing the minimum', () => {
    const onChange = vi.fn();
    render(<BpmInput value={100} onChange={onChange} min={20} max={300} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    // Before the fix this called onChange(20) — clearing the box set the song to 20 BPM.
    expect(onChange).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe('100');
  });

  it('BpmInput still commits a real edit', () => {
    const onChange = vi.fn();
    render(<BpmInput value={100} onChange={onChange} min={20} max={300} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(200);
  });

  it('TimeSignatureInput keeps the numerator when the box is cleared', () => {
    const onChange = vi.fn();
    render(<TimeSignatureInput value={{ numerator: 7, denominator: 8 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /change time signature/i }));
    const numerator = screen.getByRole('textbox', { name: /beats per measure/i });

    fireEvent.focus(numerator);
    fireEvent.change(numerator, { target: { value: '' } });
    fireEvent.blur(numerator);

    expect(onChange).not.toHaveBeenCalled();
  });
});
