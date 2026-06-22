import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LabsListLoadingState } from './LabsListLoadingState';

describe('LabsListLoadingState', () => {
  it('exposes loading status to assistive tech', () => {
    render(<LabsListLoadingState label="Loading library" />);
    expect(screen.getByRole('status', { name: 'Loading library' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading library…')).toBeInTheDocument();
  });

  it('renders skeleton rows without empty-state copy', () => {
    render(<LabsListLoadingState variant="skeleton" label="Loading originals" skeletonRows={3} />);
    expect(screen.getByRole('status', { name: 'Loading originals' })).toBeInTheDocument();
    expect(screen.queryByText(/Nothing here yet/i)).not.toBeInTheDocument();
  });
});
