import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import { setupTestCleanup } from '../../shared/test/testUtils';

describe('Happy Jump', () => {
  // Set up automatic cleanup for timers, DOM, and mocks
  const cleanup = setupTestCleanup();
  
  it('dispatches a happy-jump signal after rapid clicks', async () => {
    vi.useFakeTimers();
    
    // Portal root for App - using managed DOM cleanup
    cleanup.dom.createElement('div', { id: 'heart-container' });

    // Portal root for hearts - using managed DOM cleanup  
    cleanup.dom.createElement('div', { id: 'heart-container' });

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

