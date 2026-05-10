import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLinearVolumeSlider from './AppLinearVolumeSlider';

describe('AppLinearVolumeSlider', () => {
  it('renders an accessible 0–1 slider', () => {
    const onChange = vi.fn();
    render(<AppLinearVolumeSlider value={0.4} onChange={onChange} aria-label="Test level" />);
    const el = screen.getByRole('slider', { name: 'Test level' });
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-valuemin', '0');
    expect(el).toHaveAttribute('aria-valuemax', '1');
    expect(el).toHaveAttribute('aria-valuenow', '0.4');
  });
});
