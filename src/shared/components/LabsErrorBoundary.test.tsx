import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LabsErrorBoundary from './LabsErrorBoundary';

// Isolate from the crash-log / IndexedDB path — this test is about the boundary's breaker.
vi.mock('../utils/labsCrashLog', () => ({ appendLabsCrashLogEntry: vi.fn(async () => {}) }));

function Boom(): React.ReactElement {
  throw new Error('boom');
}

describe('LabsErrorBoundary circuit breaker', () => {
  beforeEach(() => {
    // React logs caught render errors; silence to keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('offers Try again at first, then drops it after a repeated-throw loop (only Reload)', () => {
    render(
      <LabsErrorBoundary appId="test">
        <Boom />
      </LabsErrorBoundary>,
    );
    // First catch: recoverable — Try again is offered.
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    // Each retry re-enters the throw. After enough catches in the window, the breaker trips.
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); // catch #2
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); // catch #3 -> fatal

    // Fatal: Try again is gone (it would just re-loop), Reload remains.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <LabsErrorBoundary appId="test">
        <div>all good</div>
      </LabsErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload page' })).not.toBeInTheDocument();
  });
});
