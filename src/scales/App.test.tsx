import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// The scales app touches navigator.mediaDevices (via microphone gating) on
// boot. jsdom does not implement it; stub the acoustic input module so the
// smoke render stays deterministic.
vi.mock('./utils/acousticInput', () => ({
  createAcousticInput: vi.fn(() => ({
    start: vi.fn(async () => undefined),
    stop: vi.fn(() => undefined),
  })),
}));

describe('Learn Your Scales App', () => {
  it('renders the main shell without throwing', () => {
    render(<App />);
    expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();
  });
});
