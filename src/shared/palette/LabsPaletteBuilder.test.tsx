import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LabsPaletteBuilder } from './LabsPaletteBuilder';
import { createPaletteFromHexes } from './types';

describe('LabsPaletteBuilder', () => {
  it('renders an initial gallery of palette proposals', () => {
    render(<LabsPaletteBuilder onApply={vi.fn()} />);
    expect(screen.getByTestId('labs-palette-builder')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Palette suggestions' })).toBeInTheDocument();
    expect(screen.getAllByTestId(/^labs-palette-builder-proposal-/).length).toBeGreaterThan(0);
  });

  it('applies a proposal when clicked', () => {
    const onApply = vi.fn();
    render(<LabsPaletteBuilder onApply={onApply} />);
    const proposalButtons = screen.getAllByTestId(/^labs-palette-builder-proposal-/);
    expect(proposalButtons.length).toBeGreaterThan(0);
    fireEvent.click(proposalButtons[0]!);
    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = onApply.mock.calls[0]![0];
    expect(applied.swatches.length).toBeGreaterThan(0);
    expect(applied.swatches[0].hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('regenerates proposals with a new set on click', () => {
    render(<LabsPaletteBuilder onApply={vi.fn()} />);
    const before = screen.getAllByTestId(/^labs-palette-builder-proposal-/).map((el) => el.getAttribute('data-testid'));
    fireEvent.click(screen.getByTestId('labs-palette-builder-regenerate'));
    const after = screen.getAllByTestId(/^labs-palette-builder-proposal-/).map((el) => el.getAttribute('data-testid'));
    expect(after).not.toEqual(before);
  });

  it('generates proposals from a seed hex', () => {
    render(<LabsPaletteBuilder onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Seed color hex'), { target: { value: '#123456' } });
    fireEvent.click(screen.getByTestId('labs-palette-builder-from-seed'));
    expect(screen.getAllByTestId(/^labs-palette-builder-proposal-/).length).toBeGreaterThan(0);
  });

  it('shows an error for an invalid seed hex', () => {
    render(<LabsPaletteBuilder onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Seed color hex'), { target: { value: 'not-a-color' } });
    fireEvent.click(screen.getByTestId('labs-palette-builder-from-seed'));
    expect(screen.getByText(/Enter a valid hex color/)).toBeInTheDocument();
  });

  it('renders the active palette swatches when a value is provided', () => {
    const palette = createPaletteFromHexes(['#ff2d95', '#7c3aed']);
    render(<LabsPaletteBuilder onApply={vi.fn()} value={palette} />);
    expect(screen.getByLabelText('Active palette')).toBeInTheDocument();
  });

  it('applies the sketchy variant as a data attribute', () => {
    render(<LabsPaletteBuilder onApply={vi.fn()} variant="sketchy" />);
    expect(screen.getByTestId('labs-palette-builder')).toHaveAttribute('data-variant', 'sketchy');
  });
});
