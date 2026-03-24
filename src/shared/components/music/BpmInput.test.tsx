import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BpmInput from './BpmInput';
import { runA11yAudit } from '../../test/a11y';

describe('BpmInput', () => {
  it('does not clobber local draft while editing', () => {
    const onChange = vi.fn();
    const { rerender } = render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '131' } });
    rerender(<BpmInput value={98} onChange={onChange} />);

    expect((input as HTMLInputElement).value).toBe('131');
  });

  it('commits a clamped value on blur', () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} min={40} max={220} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(220);
  });

  it('has no basic accessibility violations', async () => {
    const onChange = vi.fn();
    const { container } = render(<BpmInput value={120} onChange={onChange} />);
    await expect(runA11yAudit(container)).resolves.toHaveNoViolations();
  });
});
