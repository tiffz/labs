import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

describe('Happy Jump', () => {
  it('dispatches a happy-jump signal after rapid clicks', async () => {
    vi.useFakeTimers();
    // Portal root for App
    const portalContainer = document.createElement('div');
    portalContainer.id = 'heart-container';
    document.body.appendChild(portalContainer);

    // Portal root for hearts
    const portal = document.createElement('div');
    portal.id = 'heart-container';
    document.body.appendChild(portal);

    render(<App />);
    const cat = screen.getByTestId('cat-body');

    // Listen for our happy jump signal
    const jumped = { count: 0 };
    const onJump = () => { jumped.count += 1; };
    document.addEventListener('cat-happy-jump', onJump as EventListener);

    // Rapid clicks within window (ensure wand mode is off by default)
    for (let i = 0; i < 5; i++) {
      fireEvent.click(cat);
      act(() => {
        vi.advanceTimersByTime(80);
      });
    }

    // Allow state to settle
    act(() => { vi.advanceTimersByTime(800); });
    expect(jumped.count).toBeGreaterThanOrEqual(1);
  });
});

