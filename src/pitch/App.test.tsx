import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// `MicrophonePitchInput.listDevices` calls `navigator.mediaDevices.enumerateDevices`
// which jsdom does not implement. Stub it with an empty-device fallback so the
// smoke render doesn't throw.
vi.mock('../shared/music/pitch/microphonePitchInput', async () => {
  const actual = await vi.importActual<
    typeof import('../shared/music/pitch/microphonePitchInput')
  >('../shared/music/pitch/microphonePitchInput');

  class MockMicrophonePitchInput {
    static async listDevices() {
      return [{ id: 'default', name: 'System default' }];
    }
    start = vi.fn(async () => undefined);
    stop = vi.fn(() => undefined);
  }

  return {
    ...actual,
    MicrophonePitchInput: MockMicrophonePitchInput as unknown as typeof actual.MicrophonePitchInput,
  };
});

describe('Vocal Pitch Detector App', () => {
  it('renders the main shell without throwing', async () => {
    render(<App />);
    // The app lives behind a SkipToMain landmark; assert on the skip link as
    // a cheap landmark smoke test. `findByText` lets the async device-list
    // effect settle before we assert, avoiding noisy act() warnings.
    expect(await screen.findByText(/skip to main content/i)).toBeInTheDocument();
  });

  it('exposes a listen / stop affordance', async () => {
    render(<App />);
    await screen.findByText(/skip to main content/i);
    const startStop = screen.getAllByRole('button').find((btn) => {
      const text = btn.textContent?.toLowerCase() ?? '';
      return /listen|start|stop|mic/.test(text);
    });
    expect(startStop).toBeDefined();
  });
});
