import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createPaletteFromHexes } from './types';
import { LabsPaletteField } from './LabsPaletteField';

describe('LabsPaletteField', () => {
  it('keeps the builder collapsed until the swatch trigger is clicked', () => {
    render(<LabsPaletteField onApply={vi.fn()} />);
    expect(screen.queryByTestId('labs-palette-field-menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('labs-palette-field-trigger'));
    expect(screen.getByTestId('labs-palette-field-menu')).toBeInTheDocument();
    expect(screen.getByTestId('labs-palette-builder')).toBeInTheDocument();
  });

  it('applies a proposal and closes the menu', async () => {
    const onApply = vi.fn();
    render(<LabsPaletteField onApply={onApply} />);
    fireEvent.click(screen.getByTestId('labs-palette-field-trigger'));
    const menu = screen.getByTestId('labs-palette-field-menu');
    const proposal = within(menu).getAllByTestId(/^labs-palette-builder-proposal-/)[0];
    fireEvent.click(proposal);
    expect(onApply).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId('labs-palette-field-menu')).not.toBeInTheDocument();
    });
  });

  it('renders the active palette on the closed trigger', () => {
    const palette = createPaletteFromHexes(['#ff2d95', '#7c3aed', '#38bdf8']);
    render(<LabsPaletteField value={palette} onApply={vi.fn()} />);
    const trigger = screen.getByTestId('labs-palette-field-trigger');
    expect(trigger.querySelectorAll('.labs-palette-field__swatch:not(.labs-palette-field__swatch--empty)')).toHaveLength(
      3,
    );
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Edit palette'));
  });

  it('exposes paste controls when showPaste is set', () => {
    render(<LabsPaletteField onApply={vi.fn()} showPaste />);
    fireEvent.click(screen.getByTestId('labs-palette-field-trigger'));
    fireEvent.click(screen.getByTestId('labs-palette-field-paste-toggle'));
    expect(screen.getByTestId('labs-palette-field-paste-input')).toBeInTheDocument();
  });
});
