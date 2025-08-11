import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Pounce Event Log', () => {
  it('shows atmospheric pounce-complete text in EventsPanel', async () => {
    // Create portal root expected by App
    const portalContainer = document.createElement('div');
    portalContainer.id = 'heart-container';
    document.body.appendChild(portalContainer);

    render(<App />);
    // Dispatch the global event that animation controller would fire
    act(() => {
      document.dispatchEvent(new Event('cat-pounce-complete'));
    });
    // One of the messages should appear; we assert the canonical phrase we added
    const msg = await screen.findByText(/soft thump|toy caught|quiet landing|swift and sure/i);
    expect(msg).toBeTruthy();
  });
});

