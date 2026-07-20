import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';

const LAZY_FIND_TIMEOUT_MS = 8_000;

vi.mock('../shared/midi/midiInput', () => ({
  getMidiInput: () => ({
    onNote: vi.fn(),
    onConnection: vi.fn(),
    init: vi.fn().mockResolvedValue(true),
    isConnected: vi.fn().mockReturnValue(false),
  }),
}));

describe('Midi App', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      requestMIDIAccess: undefined,
    });
  });

  it('renders scratchpad shell', async () => {
    render(
      <ThemeProvider theme={getAppTheme('midi')}>
        <App />
      </ThemeProvider>,
    );
    expect(screen.getByRole('heading', { name: /Midi Scratchpad/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scratchpad/i })).toBeInTheDocument();
    // ScratchpadView is lazy-loaded off the first-paint graph. Under CI's
    // coverage-instrumented cold-cache run, dynamic import resolution is slow
    // enough to exceed the default findBy timeout (root cause of an
    // intermittent CI-only failure) — same pattern as story/App.test.tsx.
    expect(
      await screen.findByRole('button', { name: /Capture last/i }, { timeout: LAZY_FIND_TIMEOUT_MS }),
    ).toBeInTheDocument();
  });
});
