import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
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

  it('does not emit when blur value is unchanged', () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('has no basic accessibility violations', async () => {
    const onChange = vi.fn();
    const { container } = render(<BpmInput value={120} onChange={onChange} />);
    const results = await runA11yAudit(container);
    expect(results.violations).toHaveLength(0);
  });

  it('does not emit changes while disabled', () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} disabled />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('allows arrow buttons without input focus', () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const increase = screen.getByRole('button', { name: 'Increase BPM' });
    fireEvent.click(increase);
    expect(onChange).toHaveBeenCalledWith(121);
  });

  it('continuously bumps BPM while holding an arrow button', () => {
    vi.useFakeTimers();
    try {
      function Wrapper() {
        const [value, setValue] = useState(120);
        return <BpmInput value={value} onChange={setValue} />;
      }
      render(<Wrapper />);
      const increase = screen.getByRole('button', { name: 'Increase BPM' });
      const input = screen.getByRole('textbox') as HTMLInputElement;

      fireEvent.mouseDown(increase);
      act(() => {
        vi.advanceTimersByTime(620);
      });
      fireEvent.mouseUp(increase);

      expect(Number(input.value)).toBeGreaterThan(121);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows Common BPMs header when preset dropdown opens', async () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);

    expect(await screen.findByText('Common BPMs')).toBeInTheDocument();
  });

  it('closes the preset dropdown on Escape from the input', async () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    expect(await screen.findByText('Common BPMs')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    });

    await waitFor(() => {
      expect(screen.queryByText('Common BPMs')).not.toBeInTheDocument();
    });
  });

  it('closes the preset dropdown on Escape while focus is inside the menu', async () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    const menu = await screen.findByLabelText('Common BPM options');
    fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Common BPMs')).not.toBeInTheDocument();
    });
  });

  it('closes the preset dropdown when clicking outside', async () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    expect(await screen.findByText('Common BPMs')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Common BPMs')).not.toBeInTheDocument();
    });
  });

  it('does not reopen the preset dropdown after dismiss blur', async () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    expect(await screen.findByText('Common BPMs')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Common BPMs')).not.toBeInTheDocument();
    });

    const menu = document.querySelector('.shared-bpm-dropdown');
    fireEvent.blur(input, { relatedTarget: menu ?? undefined });

    expect(screen.queryByText('Common BPMs')).not.toBeInTheDocument();
  });

  it('selects a preset BPM and closes the dropdown', async () => {
    const onChange = vi.fn();
    render(<BpmInput value={120} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    const presetList = await screen.findByRole('list', { name: 'Common BPM presets' });
    const preset = within(presetList).getByRole('button', { name: '140' });
    fireEvent.click(preset);

    expect(onChange).toHaveBeenCalledWith(140);
    await waitFor(() => {
      expect(screen.queryByText('Common BPMs')).not.toBeInTheDocument();
    });
  });

  describe('presetPanel="inline" (embed in a chip/menu, no nested popover)', () => {
    it('renders the slider and presets immediately, without focusing the input', () => {
      render(<BpmInput value={120} onChange={vi.fn()} presetPanel="inline" />);
      // Default mode hides these behind a focus-triggered popover; inline shows them up front.
      expect(screen.getByRole('slider', { name: 'Tempo slider' })).toBeInTheDocument();
      expect(screen.getByText('Common BPMs')).toBeInTheDocument();
    });

    it('does not open a second popover when the field is focused', () => {
      render(<BpmInput value={120} onChange={vi.fn()} presetPanel="inline" />);
      const before = screen.getAllByRole('slider', { name: 'Tempo slider' }).length;
      fireEvent.focus(screen.getByRole('textbox'));
      // Focus must not mount another panel — exactly one slider before and after.
      expect(screen.getAllByRole('slider', { name: 'Tempo slider' })).toHaveLength(before);
      expect(before).toBe(1);
    });

    it('still edits tempo from an inline preset', () => {
      const onChange = vi.fn();
      render(<BpmInput value={120} onChange={onChange} presetPanel="inline" />);
      const presetList = screen.getByRole('list', { name: 'Common BPM presets' });
      fireEvent.click(within(presetList).getByRole('button', { name: '140' }));
      expect(onChange).toHaveBeenCalledWith(140);
    });
  });
});
